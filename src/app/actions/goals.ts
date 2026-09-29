"use server";

import { refresh } from "next/cache";
import { attempt } from "@/lib/actions";
import type { ISODate } from "@/lib/domain/dates";
import {
  addMilestone,
  adjustGoalValue,
  createGoal,
  deleteGoal,
  deleteMilestone,
  toggleMilestone,
  updateGoal,
  type GoalInput,
} from "@/lib/services/goals";
import type { Goal } from "@/lib/db/schema";

export async function addGoal(input: GoalInput) {
  const result = await attempt(async () => (await createGoal(input)).id);
  refresh();
  return result;
}

export async function saveGoal(id: string, patch: Partial<GoalInput> & { status?: Goal["status"]; currentValue?: number }) {
  const result = await attempt(async () => (await updateGoal(id, patch)).id);
  refresh();
  return result;
}

export async function bumpGoal(id: string, delta: number) {
  const result = await attempt(() => adjustGoalValue(id, delta));
  refresh();
  return result;
}

export async function removeGoal(id: string) {
  const result = await attempt(() => deleteGoal(id));
  refresh();
  return result;
}

export async function addGoalMilestone(goalId: string, title: string, dueDate?: ISODate | null) {
  const result = await attempt(() => addMilestone(goalId, title, dueDate));
  refresh();
  return result;
}

export async function toggleGoalMilestone(id: string, done: boolean) {
  const result = await attempt(() => toggleMilestone(id, done));
  refresh();
  return result;
}

export async function removeGoalMilestone(id: string) {
  const result = await attempt(() => deleteMilestone(id));
  refresh();
  return result;
}
