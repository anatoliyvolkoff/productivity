"use server";

import { refresh } from "next/cache";
import { attempt } from "@/lib/actions";
import { addStep, breakDownTask, deleteStep, setStepDone, stepsView, stuckOnTask, unstickStep } from "@/lib/services/steps";

export async function getSteps(taskId: string) {
  return attempt(() => stepsView(taskId));
}

export async function breakDown(taskId: string) {
  const result = await attempt(() => breakDownTask(taskId));
  refresh();
  return result;
}

export async function imStuck(input: { stepId?: string; taskId?: string }) {
  const result = await attempt(() => (input.stepId ? unstickStep(input.stepId) : stuckOnTask(input.taskId!)));
  refresh();
  return result;
}

export async function toggleStep(stepId: string, done: boolean) {
  const result = await attempt(() => setStepDone(stepId, done));
  refresh();
  return result;
}

export async function newStep(taskId: string, title: string) {
  const result = await attempt(() => addStep(taskId, title));
  refresh();
  return result;
}

export async function removeStep(stepId: string) {
  const result = await attempt(() => deleteStep(stepId));
  refresh();
  return result;
}
