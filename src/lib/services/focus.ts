import "server-only";
import { and, desc, eq, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { braindumpItems, focusSessions, tasks, timeEntries, type FocusSession, type TimeEntry } from "@/lib/db/schema";
import { addDaysISO, fromISODate, toISODate, type ISODate } from "@/lib/domain/dates";
import { elapsedSec, presetByKey, type PresetKey } from "@/lib/domain/focus";

export type SessionWithTask = FocusSession & { taskTitle: string | null; distractions: number };

// ─── Focus sessions ─────────────────────────────────────────────────────────

export async function getRunningSession(): Promise<SessionWithTask | null> {
  const db = await getDb();
  const [row] = await db
    .select({ session: focusSessions, taskTitle: tasks.title })
    .from(focusSessions)
    .leftJoin(tasks, eq(focusSessions.taskId, tasks.id))
    .where(isNull(focusSessions.endedAt))
    .orderBy(desc(focusSessions.startedAt))
    .limit(1);
  if (!row) return null;
  return { ...row.session, taskTitle: row.taskTitle, distractions: await countDistractions(row.session.id) };
}

async function countDistractions(sessionId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(braindumpItems)
    .where(eq(braindumpItems.focusSessionId, sessionId));
  return Number(row?.n ?? 0);
}

export async function startSession(input: {
  taskId?: string | null;
  preset: PresetKey;
  focusMin?: number;
  breakMin?: number;
}): Promise<FocusSession> {
  const db = await getDb();
  const running = await getRunningSession();
  if (running) return running;
  await stopTimer(); // one clock at a time: the session logs its own time

  const preset = presetByKey(input.preset);
  const plannedMin = clampMinutes(input.focusMin ?? preset.focusMin, 5, 180);
  const breakMin = clampMinutes(input.breakMin ?? preset.breakMin, 1, 60);
  const [row] = await db
    .insert(focusSessions)
    .values({ taskId: input.taskId || null, preset: preset.key, plannedMin, breakMin, startedAt: new Date() })
    .returning();
  if (input.taskId) {
    await db.update(tasks).set({ status: "active" }).where(and(eq(tasks.id, input.taskId), eq(tasks.status, "next")));
  }
  return row;
}

export async function pauseSession(id: string): Promise<void> {
  const db = await getDb();
  await db
    .update(focusSessions)
    .set({ pausedAt: new Date() })
    .where(and(eq(focusSessions.id, id), isNull(focusSessions.pausedAt), isNull(focusSessions.endedAt)));
}

export async function resumeSession(id: string): Promise<void> {
  const db = await getDb();
  const [s] = await db.select().from(focusSessions).where(eq(focusSessions.id, id));
  if (!s?.pausedAt || s.endedAt) return;
  const pausedFor = Math.round((Date.now() - s.pausedAt.getTime()) / 1000);
  await db
    .update(focusSessions)
    .set({ pausedAt: null, pausedSec: s.pausedSec + pausedFor })
    .where(eq(focusSessions.id, id));
}

/**
 * Finish a session: records its actual length (capped at the planned length
 * unless `keepOvertime`), the focus quality, and a deep-work time entry.
 */
export async function completeSession(
  id: string,
  input: { quality?: number | null; notes?: string | null; keepOvertime?: boolean },
): Promise<FocusSession> {
  const db = await getDb();
  const [s] = await db.select().from(focusSessions).where(eq(focusSessions.id, id));
  if (!s) throw new Error("Session not found.");
  if (s.endedAt) return s;

  const now = new Date();
  let seconds = elapsedSec(s, now);
  if (!input.keepOvertime) seconds = Math.min(seconds, s.plannedMin * 60);
  const endedAt = s.pausedAt ?? now;
  const actualMin = Math.round(seconds / 60);

  const [row] = await db
    .update(focusSessions)
    .set({
      endedAt,
      pausedAt: null,
      actualMin,
      quality: input.quality ? Math.min(5, Math.max(1, Math.round(input.quality))) : null,
      notes: input.notes?.trim() || null,
    })
    .where(eq(focusSessions.id, id))
    .returning();

  if (actualMin >= 1) {
    await db.insert(timeEntries).values({
      taskId: s.taskId,
      focusSessionId: s.id,
      startedAt: new Date(endedAt.getTime() - seconds * 1000),
      endedAt,
      source: "focus",
      isDeepWork: true,
    });
  }
  return row;
}

/** Throw a session away without logging it. */
export async function abandonSession(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(focusSessions).where(and(eq(focusSessions.id, id), isNull(focusSessions.endedAt)));
}

export async function sessionsBetween(from: ISODate, to: ISODate): Promise<SessionWithTask[]> {
  const db = await getDb();
  const rows = await db
    .select({ session: focusSessions, taskTitle: tasks.title })
    .from(focusSessions)
    .leftJoin(tasks, eq(focusSessions.taskId, tasks.id))
    .where(
      and(
        isNotNull(focusSessions.endedAt),
        gte(focusSessions.startedAt, fromISODate(from)),
        lt(focusSessions.startedAt, fromISODate(addDaysISO(to, 1))),
      ),
    )
    .orderBy(desc(focusSessions.startedAt));
  const counts = await db
    .select({ id: braindumpItems.focusSessionId, n: sql<number>`count(*)::int` })
    .from(braindumpItems)
    .where(isNotNull(braindumpItems.focusSessionId))
    .groupBy(braindumpItems.focusSessionId);
  const byId = new Map(counts.map((c) => [c.id, Number(c.n)]));
  return rows.map((r) => ({ ...r.session, taskTitle: r.taskTitle, distractions: byId.get(r.session.id) ?? 0 }));
}

/** Focus minutes per local day. */
export async function focusMinutesPerDay(from: ISODate, to: ISODate): Promise<Map<ISODate, number>> {
  const out = new Map<ISODate, number>();
  for (const s of await sessionsBetween(from, to)) {
    const day = toISODate(s.startedAt);
    out.set(day, (out.get(day) ?? 0) + (s.actualMin ?? 0));
  }
  return out;
}

// ─── Time tracking ──────────────────────────────────────────────────────────

export type EntryWithTask = TimeEntry & { taskTitle: string | null; minutes: number };

export async function getRunningTimer(): Promise<EntryWithTask | null> {
  const db = await getDb();
  const [row] = await db
    .select({ entry: timeEntries, taskTitle: tasks.title })
    .from(timeEntries)
    .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
    .where(isNull(timeEntries.endedAt))
    .orderBy(desc(timeEntries.startedAt))
    .limit(1);
  return row ? withMinutes(row.entry, row.taskTitle) : null;
}

export async function startTimer(input: { taskId?: string | null; note?: string | null; deep?: boolean }): Promise<TimeEntry> {
  const db = await getDb();
  await stopTimer();
  const [row] = await db
    .insert(timeEntries)
    .values({
      taskId: input.taskId || null,
      note: input.note?.trim() || null,
      isDeepWork: Boolean(input.deep),
      startedAt: new Date(),
      source: "timer",
    })
    .returning();
  if (input.taskId) {
    await db.update(tasks).set({ status: "active" }).where(and(eq(tasks.id, input.taskId), eq(tasks.status, "next")));
  }
  return row;
}

/** Stop the running timer; entries shorter than a minute are discarded. */
export async function stopTimer(): Promise<void> {
  const db = await getDb();
  const running = await db.select().from(timeEntries).where(isNull(timeEntries.endedAt));
  const now = new Date();
  for (const e of running) {
    if (now.getTime() - e.startedAt.getTime() < 60_000) await db.delete(timeEntries).where(eq(timeEntries.id, e.id));
    else await db.update(timeEntries).set({ endedAt: now }).where(eq(timeEntries.id, e.id));
  }
}

export async function addManualEntry(input: {
  taskId?: string | null;
  startedAt: Date;
  endedAt: Date;
  note?: string | null;
  deep?: boolean;
}): Promise<TimeEntry> {
  if (!(input.endedAt > input.startedAt)) throw new Error("The end must be after the start.");
  const db = await getDb();
  const [row] = await db
    .insert(timeEntries)
    .values({
      taskId: input.taskId || null,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      note: input.note?.trim() || null,
      isDeepWork: Boolean(input.deep),
      source: "manual",
    })
    .returning();
  return row;
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(timeEntries).where(eq(timeEntries.id, id));
}

export async function entriesBetween(from: ISODate, to: ISODate): Promise<EntryWithTask[]> {
  const db = await getDb();
  const rows = await db
    .select({ entry: timeEntries, taskTitle: tasks.title })
    .from(timeEntries)
    .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
    .where(and(gte(timeEntries.startedAt, fromISODate(from)), lt(timeEntries.startedAt, fromISODate(addDaysISO(to, 1)))))
    .orderBy(desc(timeEntries.startedAt));
  return rows.map((r) => withMinutes(r.entry, r.taskTitle));
}

function withMinutes(entry: TimeEntry, taskTitle: string | null): EntryWithTask {
  const end = entry.endedAt ?? new Date();
  return { ...entry, taskTitle, minutes: Math.round((end.getTime() - entry.startedAt.getTime()) / 60_000) };
}

const clampMinutes = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v) || min));
