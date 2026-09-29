import "server-only";
import { addDaysISO, minuteOfDay, parseHHMM, todayISO, type ISODate } from "@/lib/domain/dates";
import { bestFocusWindow, energyAt, energyCurve, type EnergyPoint, type Window } from "@/lib/domain/energy";
import type { Chronotype } from "@/lib/domain/sleep";
import { busyIntervals, eventsForDay, nextEvent, type EventRow } from "./calendar";
import { entriesBetween, getRunningSession, getRunningTimer, sessionsBetween, type EntryWithTask, type SessionWithTask } from "./focus";
import { listGoals, type GoalView } from "./goals";
import { habitDayProgress, listHabits, type HabitView } from "./habits";
import { moodBetween } from "./mood";
import { getProfile } from "./profile";
import { sleepSummary, type SleepSummary } from "./sleep";
import { listTasks, type TaskRow } from "./tasks";

export type EnergyInfo = {
  curve: EnergyPoint[];
  now: number | null;
  bestWindow: Window | null;
  chronotype: Chronotype | null;
  wakeMinute: number;
  bedMinute: number;
};

export type DayContext = Awaited<ReturnType<typeof getDayContext>>;

/** Everything about one day, joined across features. */
export async function getDayContext(date: ISODate = todayISO()) {
  const now = new Date();
  const profile = await getProfile();
  const isToday = date === todayISO(now);

  const [tasks, mits, events, next, runningSession, runningTimer, sessions, entries, habits, mood, sleep, goals] = await Promise.all([
    listTasks({ view: "today", today: date }),
    listTasks({ mitOn: date, today: date }),
    eventsForDay(date),
    isToday ? nextEvent(now) : Promise.resolve(null),
    getRunningSession(),
    getRunningTimer(),
    sessionsBetween(date, date),
    entriesBetween(date, date),
    listHabits({ today: date, days: 120 }),
    moodBetween(date, date),
    sleepSummary(profile.sleepTargetMin, date),
    listGoals({ today: date, includeDone: false }),
  ]);

  const otherTasks = tasks.filter((t) => t.mitOn !== date);
  const focusMin = sessions.reduce((s, x) => s + (x.actualMin ?? 0), 0);
  const trackedMin = entries.reduce((s, e) => s + e.minutes, 0);
  const deepMin = entries.filter((e) => e.isDeepWork).reduce((s, e) => s + e.minutes, 0);
  const energy = energyFor(profile, sleep, events, date, isToday ? minuteOfDay(now) : null);

  return {
    date,
    isToday,
    profile,
    mits,
    otherTasks,
    events,
    nextEvent: next,
    runningSession,
    runningTimer,
    sessions,
    entries,
    focusMin,
    trackedMin,
    deepMin,
    habits,
    habitProgress: habitDayProgress(habits),
    mood,
    sleep,
    goals,
    energy,
  };
}

function energyFor(
  profile: { wakeTarget: string; sleepTargetMin: number; chronotype: string },
  sleep: SleepSummary,
  events: EventRow[],
  date: ISODate,
  nowMinute: number | null,
): EnergyInfo {
  const chronotype = (profile.chronotype === "auto" ? sleep.chronotype : profile.chronotype) as Chronotype | null;
  let wakeMinute = parseHHMM(profile.wakeTarget);
  if (sleep.lastNight && sleep.lastNight.date === date) {
    const w = sleep.lastNight.wakeAt;
    wakeMinute = w.getHours() * 60 + w.getMinutes();
  }
  if (Number.isNaN(wakeMinute)) wakeMinute = 420;
  const bedMinute = Math.min(wakeMinute + (1440 - profile.sleepTargetMin), wakeMinute + 20 * 60);
  const curve = energyCurve({
    wakeMinute,
    bedMinute,
    chronotype,
    sleepDebtMin: sleep.debt14,
    lastSleepMin: sleep.lastNight?.date === date ? sleep.lastNight.asleepMin : null,
    sleepTargetMin: profile.sleepTargetMin,
  });
  const busy = busyIntervals(events, date);
  return {
    curve,
    now: nowMinute === null ? null : energyAt(curve, nowMinute),
    bestWindow: bestFocusWindow(curve, busy, 90, nowMinute ?? 0),
    chronotype,
    wakeMinute,
    bedMinute,
  };
}

export type { EntryWithTask, EventRow, GoalView, HabitView, SessionWithTask, TaskRow };

export const yesterdayOf = (date: ISODate) => addDaysISO(date, -1);
