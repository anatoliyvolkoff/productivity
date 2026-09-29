import "server-only";
import { and, asc, eq, gt, inArray, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { calendarEvents, calendars, tasks, type CalendarEvent } from "@/lib/db/schema";
import { addDaysISO, fromISODate, minuteOfDay, type ISODate } from "@/lib/domain/dates";
import { deleteGoogleEvent, isCalendarWritable, isGoogleConnected, pushGoogleEvent } from "./google";

export type EventRow = CalendarEvent & {
  taskTitle: string | null;
  calendarColor: string | null;
  calendarName: string | null;
  /** False for events on read-only Google calendars (holidays, shared calendars). */
  writable: boolean;
};

/** Events overlapping [from, to). Google events only from enabled calendars. */
export async function listEvents(from: Date, to: Date): Promise<EventRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      event: calendarEvents,
      taskTitle: tasks.title,
      calendarColor: calendars.color,
      calendarName: calendars.summary,
      enabled: calendars.enabled,
      canWrite: calendars.canWrite,
    })
    .from(calendarEvents)
    .leftJoin(tasks, eq(calendarEvents.taskId, tasks.id))
    .leftJoin(calendars, eq(calendarEvents.calendarId, calendars.id))
    .where(and(lt(calendarEvents.startAt, to), gt(calendarEvents.endAt, from)))
    .orderBy(asc(calendarEvents.startAt));
  return rows
    .filter((r) => r.enabled !== false)
    .map((r) => ({
      ...r.event,
      taskTitle: r.taskTitle,
      calendarColor: r.calendarColor,
      calendarName: r.calendarName,
      writable: r.event.source === "local" || r.canWrite !== false,
    }));
}

export async function eventsForDay(date: ISODate): Promise<EventRow[]> {
  return listEvents(fromISODate(date), fromISODate(addDaysISO(date, 1)));
}

/** Busy minutes-of-day intervals for a date (timed events only), for scheduling suggestions. */
export function busyIntervals(events: EventRow[], date: ISODate): Array<[number, number]> {
  const dayStart = fromISODate(date).getTime();
  const dayEnd = fromISODate(addDaysISO(date, 1)).getTime();
  return events
    .filter((e) => !e.allDay)
    .map((e) => {
      const start = Math.max(e.startAt.getTime(), dayStart);
      const end = Math.min(e.endAt.getTime(), dayEnd);
      return [minuteOfDay(new Date(start)), end >= dayEnd ? 1440 : minuteOfDay(new Date(end))] as [number, number];
    });
}

export async function nextEvent(now = new Date()): Promise<EventRow | null> {
  const upcoming = await listEvents(now, new Date(now.getTime() + 7 * 86_400_000));
  return upcoming.find((e) => !e.allDay && e.startAt > now) ?? null;
}

export type EventInput = {
  title: string;
  startAt: Date;
  endAt: Date;
  allDay?: boolean;
  description?: string | null;
  location?: string | null;
  taskId?: string | null;
  isTimeBlock?: boolean;
  isPrivate?: boolean;
};

export async function createEvent(input: EventInput): Promise<CalendarEvent> {
  validate(input);
  const db = await getDb();
  const [row] = await db
    .insert(calendarEvents)
    .values({
      source: "local",
      title: input.title.trim(),
      startAt: input.startAt,
      endAt: input.endAt,
      allDay: Boolean(input.allDay),
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
      taskId: input.taskId || null,
      isTimeBlock: Boolean(input.isTimeBlock),
      isPrivate: Boolean(input.isPrivate),
    })
    .returning();
  return (await syncToGoogle(row)) ?? row;
}

export async function updateEvent(id: string, patch: Partial<EventInput>): Promise<CalendarEvent> {
  const db = await getDb();
  const [current] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
  if (!current) throw new Error("Event not found.");
  await assertWritable(current);
  const next = {
    title: patch.title?.trim() ?? current.title,
    startAt: patch.startAt ?? current.startAt,
    endAt: patch.endAt ?? current.endAt,
    allDay: patch.allDay ?? current.allDay,
    description: patch.description !== undefined ? patch.description?.trim() || null : current.description,
    location: patch.location !== undefined ? patch.location?.trim() || null : current.location,
    taskId: patch.taskId !== undefined ? patch.taskId || null : current.taskId,
    isTimeBlock: patch.isTimeBlock ?? current.isTimeBlock,
    isPrivate: patch.isPrivate ?? current.isPrivate,
  };
  validate(next);
  const [row] = await db.update(calendarEvents).set(next).where(eq(calendarEvents.id, id)).returning();
  // Made private → remove the Google copy of an app-created event.
  if (row.isPrivate && row.googleId && row.source === "local") {
    await deleteGoogleEvent(row).catch(() => {});
    const [cleared] = await db
      .update(calendarEvents)
      .set({ googleId: null, calendarId: null, etag: null, htmlLink: null })
      .where(eq(calendarEvents.id, id))
      .returning();
    return cleared;
  }
  return (await syncToGoogle(row)) ?? row;
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDb();
  const [row] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
  if (!row) return;
  await assertWritable(row);
  if (row.googleId) await deleteGoogleEvent(row);
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
}

/** Push to Google when connected (not for private events). Returns the updated row. */
async function syncToGoogle(row: CalendarEvent): Promise<CalendarEvent | null> {
  if (row.isPrivate || !(await isGoogleConnected())) return null;
  try {
    return await pushGoogleEvent(row);
  } catch (error) {
    console.error("Google push failed:", error);
    return null;
  }
}

async function assertWritable(row: CalendarEvent) {
  if (row.source === "google" && !(await isCalendarWritable(row.calendarId))) {
    throw new Error("This event is on a read-only Google calendar.");
  }
}

function validate(e: { title: string; startAt: Date; endAt: Date }) {
  if (!e.title.trim()) throw new Error("An event needs a title.");
  if (!(e.endAt > e.startAt)) throw new Error("The end must be after the start.");
}

/** Time blocks already scheduled for these tasks (upcoming). */
export async function blocksForTasks(taskIds: string[]): Promise<Map<string, CalendarEvent>> {
  const out = new Map<string, CalendarEvent>();
  if (taskIds.length === 0) return out;
  const db = await getDb();
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(and(inArray(calendarEvents.taskId, taskIds), gt(calendarEvents.endAt, new Date())))
    .orderBy(asc(calendarEvents.startAt));
  for (const r of rows) if (r.taskId && !out.has(r.taskId)) out.set(r.taskId, r);
  return out;
}

export async function listCalendars() {
  const db = await getDb();
  return db.select().from(calendars).orderBy(asc(calendars.summary));
}

export async function setCalendarEnabled(id: string, enabled: boolean) {
  const db = await getDb();
  await db.update(calendars).set({ enabled }).where(eq(calendars.id, id));
}
