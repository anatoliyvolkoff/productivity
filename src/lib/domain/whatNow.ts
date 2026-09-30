import { type ISODate } from "./dates";
import { priorityScore, type PrioritizableTask } from "./priority";

/**
 * "What now?" — pick exactly one task that fits how you feel and the time you
 * have. Importance and dates still count, but fit matters most: a small,
 * doable task beats an important one you can't start right now.
 */
export type EnergyNow = "low" | "okay" | "high";
export type Candidate = PrioritizableTask & {
  id: string;
  title: string;
  status: "inbox" | "next" | "active" | "waiting" | "done" | "dropped";
  effortMin: number | null;
  mitOn: ISODate | null;
  notNowAt: Date | string | null;
  /** When the task has tiny steps, you only need time for the next one. */
  hasSteps?: boolean;
};

/** "Not now" lets a task rest this long before it's suggested again. */
export const NOT_NOW_REST_MS = 3 * 60 * 60 * 1000;
const ASSUMED_EFFORT = 25;

export function fitScore(t: Candidate, energy: EnergyNow, minutes: number, today: ISODate, now: Date = new Date()): number {
  let score = priorityScore(t, today);
  if (t.mitOn === today) score += 0.35;
  if (t.status === "active") score += 0.15;

  // Time fit: with steps, only the next small step has to fit.
  const need = t.hasSteps ? Math.min(t.effortMin ?? ASSUMED_EFFORT, 10) : (t.effortMin ?? ASSUMED_EFFORT);
  if (need > minutes) score -= Math.min(0.6, ((need - minutes) / Math.max(minutes, 5)) * 0.25);
  else if (minutes <= 15 && need <= minutes) score += 0.1;

  // Energy fit.
  if (energy === "low") {
    if (t.energy === "high") score -= 0.45;
    if (t.energy === "low") score += 0.2;
    if ((t.effortMin ?? ASSUMED_EFFORT) <= 15) score += 0.1;
  } else if (energy === "high") {
    if (t.energy === "high") score += 0.25;
    if (t.energy === "low") score -= 0.05;
  }

  // Resting after "Not now".
  if (t.notNowAt && now.getTime() - new Date(t.notNowAt).getTime() < NOT_NOW_REST_MS) score -= 1;
  // Past-date ("Whenever") tasks stay available, just quieter.
  if (t.dueDate && t.dueDate < today && t.mitOn !== today) score -= 0.25;
  return score;
}

/** Candidates in the order to offer them (first = the one to show). */
export function rankWhatNow(tasks: Candidate[], energy: EnergyNow, minutes: number, today: ISODate, now: Date = new Date()): Candidate[] {
  return tasks
    .filter((t) => t.status === "next" || t.status === "active" || t.status === "inbox")
    .map((t) => ({ t, s: fitScore(t, energy, minutes, today, now) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.t);
}
