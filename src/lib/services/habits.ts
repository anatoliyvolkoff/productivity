import "server-only";
import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { habitLogs, habits, type Habit, type HabitSchedule } from "@/lib/db/schema";
import { addDaysISO, toISODate, todayISO, type ISODate } from "@/lib/domain/dates";
import {
  adherence,
  formationProgress,
  isDone,
  isScheduledOn,
  strength,
  streaks,
  type HabitLike,
  type HabitValues,
  type StreakInfo,
} from "@/lib/domain/habits";
import { focusMinutesPerDay } from "./focus";
import { ensureTags, normalizeTags } from "./tags";
import { tasksDonePerDay } from "./tasks";

export type HabitView = Habit & {
  startDate: ISODate;
  values: Record<ISODate, number>;
  todayValue: number;
  scheduledToday: boolean;
  doneToday: boolean;
  streak: StreakInfo;
  strength: number;
  adherence30: number | null;
  formation: number;
};

/** Active habits with their logs and stats. `days` controls how much history is loaded. */
export async function listHabits(options: { today?: ISODate; days?: number; includeArchived?: boolean } = {}): Promise<HabitView[]> {
  const db = await getDb();
  const today = options.today ?? todayISO();
  const from = addDaysISO(today, -(options.days ?? 120));
  const list = await db
    .select()
    .from(habits)
    .where(options.includeArchived ? undefined : isNull(habits.archivedAt))
    .orderBy(asc(habits.sortOrder), asc(habits.createdAt));
  if (list.length === 0) return [];

  const logs = await db
    .select()
    .from(habitLogs)
    .where(and(gte(habitLogs.date, from), lte(habitLogs.date, today)));

  const needsFocus = list.some((h) => h.autoSource === "focus_minutes");
  const needsTasks = list.some((h) => h.autoSource === "tasks_done");
  const [focus, done] = await Promise.all([
    needsFocus ? focusMinutesPerDay(from, today) : Promise.resolve(new Map<ISODate, number>()),
    needsTasks ? tasksDonePerDay(from, today) : Promise.resolve(new Map<ISODate, number>()),
  ]);

  return list.map((h) => {
    const values: HabitValues = new Map();
    if (h.autoSource === "focus_minutes") for (const [d, v] of focus) values.set(d, v);
    else if (h.autoSource === "tasks_done") for (const [d, v] of done) values.set(d, v);
    for (const log of logs) {
      if (log.habitId !== h.id) continue;
      values.set(log.date, Math.max(values.get(log.date) ?? 0, log.value));
    }
    return withStats(h, values, today);
  });
}

function withStats(h: Habit, values: HabitValues, today: ISODate): HabitView {
  const like = toLike(h);
  const todayValue = values.get(today) ?? 0;
  return {
    ...h,
    startDate: like.startDate,
    values: Object.fromEntries(values),
    todayValue,
    scheduledToday: isScheduledOn(h.schedule, today),
    doneToday: isDone(like, todayValue),
    streak: streaks(like, values, today),
    strength: strength(like, values, today),
    adherence30: adherence(like, values, today, 30),
    formation: formationProgress(like, values, today),
  };
}

export function toLike(h: Habit): HabitLike {
  return { type: h.type, target: h.target, schedule: h.schedule, startDate: toISODate(h.createdAt) };
}

export type HabitInput = {
  title: string;
  type?: Habit["type"];
  target?: number;
  unit?: string | null;
  schedule?: HabitSchedule;
  cue?: string | null;
  stackAfterHabitId?: string | null;
  goalId?: string | null;
  autoSource?: Habit["autoSource"];
  priority?: number;
  isNegative?: boolean;
  color?: string | null;
  tags?: string[];
};

export async function createHabit(input: HabitInput): Promise<Habit> {
  const db = await getDb();
  if (!input.title.trim()) throw new Error("A habit needs a name.");
  const tags = normalizeTags(input.tags);
  await ensureTags(tags);
  const [row] = await db
    .insert(habits)
    .values({
      title: input.title.trim(),
      type: input.type ?? "boolean",
      target: input.type === "boolean" || !input.type ? 1 : Math.max(1, input.target ?? 1),
      unit: input.unit?.trim() || null,
      schedule: sanitizeSchedule(input.schedule),
      cue: input.cue?.trim() || null,
      stackAfterHabitId: input.stackAfterHabitId || null,
      goalId: input.goalId || null,
      autoSource: input.autoSource ?? "none",
      priority: input.priority ?? 3,
      isNegative: Boolean(input.isNegative),
      color: input.color ?? null,
      tags,
    })
    .returning();
  return row;
}

export async function updateHabit(id: string, patch: Partial<HabitInput>): Promise<Habit> {
  const db = await getDb();
  const set: Partial<Habit> = {};
  if (patch.title !== undefined) set.title = patch.title.trim();
  if (patch.type !== undefined) set.type = patch.type;
  if (patch.target !== undefined) set.target = Math.max(1, patch.target);
  if (patch.type === "boolean") set.target = 1;
  if (patch.unit !== undefined) set.unit = patch.unit?.trim() || null;
  if (patch.schedule !== undefined) set.schedule = sanitizeSchedule(patch.schedule);
  if (patch.cue !== undefined) set.cue = patch.cue?.trim() || null;
  if (patch.stackAfterHabitId !== undefined) set.stackAfterHabitId = patch.stackAfterHabitId === id ? null : patch.stackAfterHabitId || null;
  if (patch.goalId !== undefined) set.goalId = patch.goalId || null;
  if (patch.autoSource !== undefined) set.autoSource = patch.autoSource;
  if (patch.priority !== undefined) set.priority = patch.priority;
  if (patch.isNegative !== undefined) set.isNegative = patch.isNegative;
  if (patch.color !== undefined) set.color = patch.color;
  if (patch.tags !== undefined) {
    set.tags = normalizeTags(patch.tags);
    await ensureTags(set.tags);
  }
  const [row] = await db.update(habits).set(set).where(eq(habits.id, id)).returning();
  if (!row) throw new Error("Habit not found.");
  return row;
}

export async function archiveHabit(id: string, archived = true): Promise<void> {
  const db = await getDb();
  await db.update(habits).set({ archivedAt: archived ? new Date() : null }).where(eq(habits.id, id));
}

export async function deleteHabit(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(habits).where(eq(habits.id, id));
}

/** Set the logged value for a day (0 removes the log). */
export async function logHabit(habitId: string, date: ISODate, value: number): Promise<void> {
  const db = await getDb();
  if (value <= 0) {
    await db.delete(habitLogs).where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));
    return;
  }
  await db
    .insert(habitLogs)
    .values({ habitId, date, value })
    .onConflictDoUpdate({ target: [habitLogs.habitId, habitLogs.date], set: { value } });
}

export async function getLoggedValue(habitId: string, date: ISODate): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));
  return row?.value ?? 0;
}

/** Share of today's scheduled habits that are done. */
export function habitDayProgress(list: HabitView[]): { done: number; total: number } {
  const scheduled = list.filter((h) => h.scheduledToday || h.schedule.kind === "per_week");
  const relevant = scheduled.filter((h) => h.schedule.kind !== "per_week" || !h.streak.doneNow || h.doneToday);
  return { done: relevant.filter((h) => h.doneToday).length, total: relevant.length };
}

function sanitizeSchedule(schedule?: HabitSchedule): HabitSchedule {
  if (!schedule) return { kind: "daily" };
  if (schedule.kind === "weekdays") {
    const days = [...new Set(schedule.days.filter((d) => d >= 0 && d <= 6))];
    return days.length ? { kind: "weekdays", days } : { kind: "daily" };
  }
  if (schedule.kind === "per_week") return { kind: "per_week", times: Math.min(7, Math.max(1, Math.round(schedule.times))) };
  return { kind: "daily" };
}
