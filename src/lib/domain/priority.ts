import { daysBetween, type ISODate } from "./dates";

export type PrioritizableTask = {
  priority: number; // 1 (highest) – 4
  dueDate: ISODate | null;
  energy: "low" | "high" | null;
  goalId: string | null;
  /** Priority of the linked goal, if any — tasks inherit it when higher. */
  goalPriority?: number | null;
};

/** Task priority after inheriting from its goal (lower number = more important). */
export function effectivePriority(task: Pick<PrioritizableTask, "priority" | "goalPriority">): number {
  return task.goalPriority ? Math.min(task.priority, task.goalPriority) : task.priority;
}

/** 0–1 urgency from the due date. */
export function urgency(dueDate: ISODate | null, today: ISODate): number {
  if (!dueDate) return 0;
  const days = daysBetween(today, dueDate);
  if (days < 0) return 1;
  if (days === 0) return 0.9;
  if (days === 1) return 0.7;
  if (days <= 3) return 0.5;
  if (days <= 7) return 0.3;
  return 0.1;
}

/**
 * Priority score used to order tasks and by the AI brief (higher = do sooner):
 * importance (priority, goal link) + urgency (due date) + fit with current energy.
 * `energyNow` is the 0–1 estimated alertness right now, when known.
 */
export function priorityScore(task: PrioritizableTask, today: ISODate, energyNow?: number): number {
  const importance = (5 - effectivePriority(task)) / 4; // P1 → 1, P4 → 0.25
  let score = 0.5 * importance + 0.35 * urgency(task.dueDate, today);
  if (task.goalId) score += 0.1;
  if (energyNow !== undefined && task.energy) {
    if (task.energy === "high") score += energyNow >= 0.7 ? 0.08 : energyNow < 0.4 ? -0.08 : 0;
    else score += energyNow < 0.4 ? 0.05 : 0;
  }
  return Math.round(score * 1000) / 1000;
}

export type EisenhowerQuadrant = "do" | "schedule" | "delegate" | "drop";

/** Eisenhower matrix, derived: urgent = due within 2 days; important = P1–P2 or linked to a goal. */
export function eisenhower(task: PrioritizableTask, today: ISODate): EisenhowerQuadrant {
  const urgent = task.dueDate !== null && daysBetween(today, task.dueDate) <= 2;
  const important = effectivePriority(task) <= 2 || task.goalId !== null;
  if (urgent && important) return "do";
  if (important) return "schedule";
  if (urgent) return "delegate";
  return "drop";
}

export const PRIORITY_LABELS: Record<number, string> = { 1: "P1", 2: "P2", 3: "P3", 4: "P4" };

/** Working memory holds about four chunks (Cowan, 2001) — keep the daily top list to three. */
export const MAX_MITS = 3;
