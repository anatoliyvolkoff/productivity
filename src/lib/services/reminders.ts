import "server-only";
import { and, asc, eq, gte, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { reminderLogs, reminders, type Reminder } from "@/lib/db/schema";
import { addDaysISO, rangeISO, todayISO, type ISODate } from "@/lib/domain/dates";
import { deleteReminderEvent, isGoogleConnected, upsertDailyReminderEvent } from "./google";

/**
 * Daily "did I do it?" reminders (meds first). One tap logs it with the time,
 * so you never have to remember whether you already took it. History is shown
 * as "x of the last 7 days" — no streaks that reset.
 */

export type ReminderView = Reminder & {
  /** When it was logged today, if it was. */
  doneAt: Date | null;
  /** Oldest → newest, the last 7 days including today. */
  last7: Array<{ date: ISODate; doneAt: Date | null }>;
  doneOfLast7: number;
};

export async function listReminders(today: ISODate = todayISO()): Promise<ReminderView[]> {
  const db = await getDb();
  const since = addDaysISO(today, -6);
  const [rows, logs] = await Promise.all([
    db.select().from(reminders).where(isNull(reminders.archivedAt)).orderBy(asc(reminders.time), asc(reminders.createdAt)),
    db.select().from(reminderLogs).where(gte(reminderLogs.date, since)),
  ]);
  const days = rangeISO(since, today);
  return rows.map((r) => {
    const mine = new Map(logs.filter((l) => l.reminderId === r.id).map((l) => [l.date, l.doneAt]));
    const last7 = days.map((date) => ({ date, doneAt: mine.get(date) ?? null }));
    return { ...r, doneAt: mine.get(today) ?? null, last7, doneOfLast7: last7.filter((d) => d.doneAt).length };
  });
}

/** Log (or undo) today's check-in. */
export async function setReminderDone(id: string, done: boolean, date: ISODate = todayISO()): Promise<void> {
  const db = await getDb();
  if (done) await db.insert(reminderLogs).values({ reminderId: id, date }).onConflictDoNothing();
  else await db.delete(reminderLogs).where(and(eq(reminderLogs.reminderId, id), eq(reminderLogs.date, date)));
}

export type ReminderInput = { id?: string; title: string; publicTitle?: string | null; emoji?: string | null; time: string; notify: boolean; inGoogle: boolean };

/** Create or update a reminder and keep its Google Calendar event in step. */
export async function saveReminder(input: ReminderInput): Promise<Reminder> {
  if (!input.title.trim()) throw new Error("Give it a name.");
  if (!/^\d{2}:\d{2}$/.test(input.time)) throw new Error("Pick a time.");
  const db = await getDb();
  const values = {
    title: input.title.trim(),
    publicTitle: input.publicTitle?.trim() || null,
    emoji: input.emoji?.trim() || null,
    time: input.time,
    notify: input.notify,
  };
  let [row] = input.id
    ? await db.update(reminders).set(values).where(eq(reminders.id, input.id)).returning()
    : await db.insert(reminders).values(values).returning();
  if (!row) throw new Error("That reminder no longer exists.");

  if (input.inGoogle) {
    if (!(await isGoogleConnected())) throw new Error("Connect Google Calendar in Settings first.");
    const eventId = await upsertDailyReminderEvent({
      eventId: row.googleEventId,
      title: `${row.emoji ? `${row.emoji} ` : ""}${row.publicTitle ?? row.title}`,
      time: row.time,
      startDate: todayISO(),
    });
    [row] = await db.update(reminders).set({ googleEventId: eventId }).where(eq(reminders.id, row.id)).returning();
  } else if (row.googleEventId) {
    if (await isGoogleConnected()) await deleteReminderEvent(row.googleEventId);
    [row] = await db.update(reminders).set({ googleEventId: null }).where(eq(reminders.id, row.id)).returning();
  }
  return row;
}

export async function archiveReminder(id: string): Promise<void> {
  const db = await getDb();
  const [row] = await db.update(reminders).set({ archivedAt: new Date() }).where(eq(reminders.id, id)).returning();
  if (row?.googleEventId && (await isGoogleConnected())) await deleteReminderEvent(row.googleEventId).catch(() => {});
}
