import type { HabitSchedule } from "@/lib/db/schema";
import { addDaysISO, dayOfWeek, daysBetween, rangeISO, weekStartISO, type ISODate } from "./dates";

export type HabitLike = {
  type: "boolean" | "count" | "duration";
  target: number;
  schedule: HabitSchedule;
  /** First day the habit counts (usually its creation date). */
  startDate: ISODate;
};

/** Value logged per date. */
export type HabitValues = Map<ISODate, number>;

export function isScheduledOn(schedule: HabitSchedule, date: ISODate): boolean {
  if (schedule.kind === "weekdays") return schedule.days.includes(dayOfWeek(date));
  return true; // daily, and per-week habits can be done on any day
}

export function isDone(habit: Pick<HabitLike, "target">, value: number | undefined): boolean {
  return (value ?? 0) >= habit.target;
}

export type StreakInfo = {
  /** Current streak (days, or weeks for per-week habits). */
  current: number;
  best: number;
  unit: "day" | "week";
  /** The last completed period was missed — "never miss twice" warning. */
  missedLast: boolean;
  /** Whether today (or this week) is already done. */
  doneNow: boolean;
};

type Period = { key: ISODate; done: boolean; pending: boolean };

/** Periods (days or weeks) from start to today, oldest first. */
function periods(habit: HabitLike, values: HabitValues, today: ISODate): Period[] {
  if (daysBetween(habit.startDate, today) < 0) return [];
  const schedule = habit.schedule;

  if (schedule.kind === "per_week") {
    const out: Period[] = [];
    let week = weekStartISO(habit.startDate);
    const currentWeek = weekStartISO(today);
    while (daysBetween(week, currentWeek) >= 0) {
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const d = addDaysISO(week, i);
        if (daysBetween(habit.startDate, d) >= 0 && daysBetween(d, today) >= 0 && isDone(habit, values.get(d))) count++;
      }
      const done = count >= schedule.times;
      out.push({ key: week, done, pending: week === currentWeek && !done });
      week = addDaysISO(week, 7);
    }
    return out;
  }

  return rangeISO(habit.startDate, today)
    .filter((d) => isScheduledOn(schedule, d))
    .map((d) => {
      const done = isDone(habit, values.get(d));
      return { key: d, done, pending: d === today && !done };
    });
}

/**
 * Streaks with the "never miss twice" rule: a single missed period keeps the
 * streak alive (research on habit formation shows one miss barely matters —
 * Lally et al., 2010); two misses in a row break it.
 */
export function streaks(habit: HabitLike, values: HabitValues, today: ISODate): StreakInfo {
  const list = periods(habit, values, today);
  const unit = habit.schedule.kind === "per_week" ? "week" : "day";

  let best = 0;
  let run = 0;
  let misses = 0;
  for (const p of list) {
    if (p.pending) continue;
    if (p.done) {
      run++;
      misses = 0;
    } else if (++misses >= 2) {
      run = 0;
    }
    best = Math.max(best, run);
  }

  let current = 0;
  misses = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    if (p.pending) continue;
    if (p.done) {
      current++;
      misses = 0;
    } else if (++misses >= 2) break;
  }

  const completed = list.filter((p) => !p.pending);
  const last = completed[completed.length - 1];
  const now = list[list.length - 1];
  return {
    current,
    best: Math.max(best, current),
    unit,
    missedLast: Boolean(last && !last.done && !(now && now.done)),
    doneNow: Boolean(now?.done),
  };
}

/**
 * Habit strength 0–1: an exponential moving average over scheduled days, so
 * recent consistency matters most and one miss only dents it (like Loop Habit Tracker).
 */
export function strength(habit: HabitLike, values: HabitValues, today: ISODate): number {
  const alpha = 0.06;
  let s = 0;
  for (const p of periods(habit, values, today)) {
    if (p.pending) continue;
    s = s * (1 - alpha) + (p.done ? alpha : 0);
  }
  return Math.round(s * 1000) / 1000;
}

/** Share of scheduled days done in the last `days` days (today counts only once done). */
export function adherence(habit: HabitLike, values: HabitValues, today: ISODate, days = 30): number | null {
  const from = addDaysISO(today, -(days - 1));
  const start = daysBetween(habit.startDate, from) >= 0 ? from : habit.startDate;
  if (daysBetween(start, today) < 0) return null;

  if (habit.schedule.kind === "per_week") {
    let done = 0;
    let expected = 0;
    for (const d of rangeISO(start, today)) {
      if (isDone(habit, values.get(d))) done++;
    }
    expected = (habit.schedule.times * (daysBetween(start, today) + 1)) / 7;
    return expected > 0 ? Math.min(1, done / expected) : null;
  }

  let scheduled = 0;
  let done = 0;
  for (const d of rangeISO(start, today)) {
    if (!isScheduledOn(habit.schedule, d)) continue;
    const ok = isDone(habit, values.get(d));
    if (d === today && !ok) continue;
    scheduled++;
    if (ok) done++;
  }
  return scheduled > 0 ? done / scheduled : null;
}

/** Median time to automaticity in Lally et al. (2010). */
export const HABIT_FORMATION_DAYS = 66;

/** Progress toward automaticity: completed repetitions / 66. */
export function formationProgress(habit: HabitLike, values: HabitValues, today: ISODate): number {
  let reps = 0;
  for (const [d, v] of values) {
    if (daysBetween(habit.startDate, d) >= 0 && daysBetween(d, today) >= 0 && isDone(habit, v)) reps++;
  }
  return Math.min(1, reps / HABIT_FORMATION_DAYS);
}

export function scheduleLabel(schedule: HabitSchedule): string {
  if (schedule.kind === "daily") return "Every day";
  if (schedule.kind === "per_week") return `${schedule.times}× per week`;
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = [...schedule.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return "Weekdays";
  if (days.length === 2 && days.includes(0) && days.includes(6)) return "Weekends";
  return days.map((d) => names[d]).join(", ");
}
