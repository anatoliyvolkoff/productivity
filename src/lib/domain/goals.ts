import { daysBetween, type ISODate } from "./dates";

export type GoalProgressInput = {
  type: "milestone" | "numeric" | "habit";
  status: "active" | "paused" | "done";
  targetValue: number | null;
  currentValue: number;
  milestones: { total: number; done: number };
  tasks: { total: number; done: number };
  /** Average adherence (0–1) of linked habits, if any. */
  habitAdherence: number | null;
};

/** Goal progress 0–1, computed from what is linked to it. */
export function goalProgress(g: GoalProgressInput): number {
  if (g.status === "done") return 1;
  let p = 0;
  if (g.type === "numeric") {
    p = g.targetValue && g.targetValue > 0 ? g.currentValue / g.targetValue : 0;
  } else if (g.type === "habit") {
    p = g.habitAdherence ?? 0;
  } else if (g.milestones.total > 0) {
    p = g.milestones.done / g.milestones.total;
  } else if (g.tasks.total > 0) {
    p = g.tasks.done / g.tasks.total;
  }
  return Math.max(0, Math.min(1, p));
}

/** Where progress "should" be if it were linear from start to due date; null without a deadline. */
export function expectedProgress(startDate: ISODate, dueDate: ISODate | null, today: ISODate): number | null {
  if (!dueDate) return null;
  const total = daysBetween(startDate, dueDate);
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, daysBetween(startDate, today) / total));
}

export type GoalHealth = "on_track" | "at_risk" | "off_track" | "done" | "no_deadline";

export function goalHealth(progress: number, expected: number | null, status: GoalProgressInput["status"]): GoalHealth {
  if (status === "done" || progress >= 1) return "done";
  if (expected === null) return "no_deadline";
  const gap = progress - expected;
  if (gap >= -0.05) return "on_track";
  if (gap >= -0.2) return "at_risk";
  return "off_track";
}

export const HEALTH_LABELS: Record<GoalHealth, string> = {
  on_track: "On track",
  at_risk: "At risk",
  off_track: "Off track",
  done: "Done",
  no_deadline: "No deadline",
};
