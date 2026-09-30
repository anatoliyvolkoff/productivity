import "server-only";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { taskSteps, tasks, type TaskStep } from "@/lib/db/schema";
import { buildStepTree, currentStep, fallbackBreakdown, fallbackUnstick, parentsToComplete, stepProgress, type StepNode } from "@/lib/domain/steps";
import { aiBreakDown, aiConfigured, aiUnstick } from "./ai";

export type StepsView = { tree: StepNode<TaskStep>[]; current: StepNode<TaskStep> | null; progress: { done: number; total: number } };

export async function listSteps(taskId: string): Promise<TaskStep[]> {
  const db = await getDb();
  return db.select().from(taskSteps).where(eq(taskSteps.taskId, taskId)).orderBy(asc(taskSteps.sortOrder), asc(taskSteps.createdAt));
}

export async function stepsView(taskId: string): Promise<StepsView> {
  const tree = buildStepTree(await listSteps(taskId));
  return { tree, current: currentStep(tree), progress: stepProgress(tree) };
}

/** Current step for several tasks at once (for lists and the What now? card). */
export async function currentSteps(taskIds: string[]): Promise<Map<string, { title: string; done: number; total: number }>> {
  const out = new Map<string, { title: string; done: number; total: number }>();
  if (taskIds.length === 0) return out;
  const db = await getDb();
  const rows = await db.select().from(taskSteps).where(inArray(taskSteps.taskId, taskIds));
  for (const id of taskIds) {
    const tree = buildStepTree(rows.filter((r) => r.taskId === id));
    const cur = currentStep(tree);
    if (cur) out.set(id, { title: cur.title, ...stepProgress(tree) });
  }
  return out;
}

async function insertSteps(taskId: string, parentStepId: string | null, titles: string[], startOrder = 0) {
  if (titles.length === 0) return;
  const db = await getDb();
  await db.insert(taskSteps).values(titles.map((title, i) => ({ taskId, parentStepId, title, sortOrder: startOrder + i })));
}

/**
 * "Break it down": tiny first steps from the AI (or a gentle generic set
 * without one). Replaces steps that haven't been started; finished ones stay.
 */
export async function breakDownTask(taskId: string): Promise<{ usedAi: boolean }> {
  const db = await getDb();
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) throw new Error("That task is gone.");
  const usedAi = aiConfigured();
  const titles = usedAi ? await aiBreakDown({ title: task.title, notes: task.notes, effortMin: task.effortMin }) : fallbackBreakdown(task.title);
  await db.delete(taskSteps).where(and(eq(taskSteps.taskId, taskId), isNull(taskSteps.doneAt)));
  const kept = await listSteps(taskId);
  await insertSteps(taskId, null, titles, kept.filter((s) => !s.parentStepId).length);
  return { usedAi };
}

/** "I'm stuck": split a step into even smaller children (again and again if needed). */
export async function unstickStep(stepId: string): Promise<{ usedAi: boolean }> {
  const db = await getDb();
  const [step] = await db.select().from(taskSteps).where(eq(taskSteps.id, stepId));
  if (!step) throw new Error("That step is gone.");
  const [task] = await db.select().from(tasks).where(eq(tasks.id, step.taskId));
  const all = await listSteps(step.taskId);
  const usedAi = aiConfigured();
  const titles = usedAi
    ? await aiUnstick({ task: task?.title ?? "", stuckOn: step.title, stepsSoFar: all.map((s) => s.title) })
    : fallbackUnstick(step.title);
  // A step that already has unfinished children gets fresh ones.
  await db.delete(taskSteps).where(and(eq(taskSteps.parentStepId, stepId), isNull(taskSteps.doneAt)));
  await insertSteps(step.taskId, stepId, titles);
  return { usedAi };
}

/** "I'm stuck" on a task without steps yet: break it down first. */
export async function stuckOnTask(taskId: string): Promise<{ usedAi: boolean }> {
  const view = await stepsView(taskId);
  return view.current ? unstickStep(view.current.id) : breakDownTask(taskId);
}

export async function setStepDone(stepId: string, done: boolean): Promise<void> {
  const db = await getDb();
  const [step] = await db.select().from(taskSteps).where(eq(taskSteps.id, stepId));
  if (!step) return;
  const now = new Date();
  await db.update(taskSteps).set({ doneAt: done ? now : null }).where(eq(taskSteps.id, stepId));
  if (done) {
    const parents = parentsToComplete(await listSteps(step.taskId), stepId);
    if (parents.length) await db.update(taskSteps).set({ doneAt: now }).where(inArray(taskSteps.id, parents));
  } else if (step.parentStepId) {
    await db.update(taskSteps).set({ doneAt: null }).where(eq(taskSteps.id, step.parentStepId));
  }
}

export async function addStep(taskId: string, title: string): Promise<void> {
  if (!title.trim()) return;
  const top = (await listSteps(taskId)).filter((s) => !s.parentStepId);
  await insertSteps(taskId, null, [title.trim()], top.length);
}

export async function deleteStep(stepId: string): Promise<void> {
  const db = await getDb();
  await db.delete(taskSteps).where(eq(taskSteps.id, stepId));
}
