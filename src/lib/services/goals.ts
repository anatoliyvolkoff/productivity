import "server-only";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { goals, habits, milestones, tasks, type Goal, type Milestone } from "@/lib/db/schema";
import { toISODate, todayISO, type ISODate } from "@/lib/domain/dates";
import { expectedProgress, goalHealth, goalProgress, type GoalHealth } from "@/lib/domain/goals";
import { listHabits } from "./habits";
import { ensureTags, normalizeTags } from "./tags";
import { trackedMinutes } from "./tasks";

export type GoalView = Goal & {
  milestoneList: Milestone[];
  taskCounts: { total: number; done: number };
  habitIds: string[];
  habitAdherence: number | null;
  trackedMin: number;
  progress: number;
  expected: number | null;
  health: GoalHealth;
  daysLeft: number | null;
};

export async function listGoals(options: { today?: ISODate; includeDone?: boolean } = {}): Promise<GoalView[]> {
  const db = await getDb();
  const today = options.today ?? todayISO();
  const list = await db.select().from(goals).orderBy(asc(goals.sortOrder), asc(goals.createdAt));
  const visible = options.includeDone === false ? list.filter((g) => g.status !== "done") : list;
  if (visible.length === 0) return [];
  const ids = visible.map((g) => g.id);

  const [ms, taskRows, habitViews] = await Promise.all([
    db.select().from(milestones).where(inArray(milestones.goalId, ids)).orderBy(asc(milestones.sortOrder), asc(milestones.createdAt)),
    db
      .select({ id: tasks.id, goalId: tasks.goalId, status: tasks.status })
      .from(tasks)
      .where(inArray(tasks.goalId, ids)),
    listHabits({ today, days: 30 }),
  ]);
  const tracked = await trackedMinutes(taskRows.map((t) => t.id));

  return visible.map((g) => {
    const milestoneList = ms.filter((m) => m.goalId === g.id);
    const linkedTasks = taskRows.filter((t) => t.goalId === g.id && t.status !== "dropped");
    const linkedHabits = habitViews.filter((h) => h.goalId === g.id);
    const adherences = linkedHabits.map((h) => h.adherence30).filter((a): a is number => a !== null);
    const habitAdherence = adherences.length ? adherences.reduce((s, a) => s + a, 0) / adherences.length : null;
    const taskCounts = { total: linkedTasks.length, done: linkedTasks.filter((t) => t.status === "done").length };
    const progress = goalProgress({
      type: g.type,
      status: g.status,
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      milestones: { total: milestoneList.length, done: milestoneList.filter((m) => m.doneAt).length },
      tasks: taskCounts,
      habitAdherence,
    });
    const start = g.startDate ?? toISODate(g.createdAt);
    const expected = expectedProgress(start, g.dueDate, today);
    const daysLeft = g.dueDate ? Math.round((new Date(`${g.dueDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000) : null;
    return {
      ...g,
      milestoneList,
      taskCounts,
      habitIds: linkedHabits.map((h) => h.id),
      habitAdherence,
      trackedMin: linkedTasks.reduce((s, t) => s + (tracked.get(t.id) ?? 0), 0),
      progress,
      expected,
      health: goalHealth(progress, expected, g.status),
      daysLeft,
    };
  });
}

export type GoalInput = {
  title: string;
  why?: string | null;
  horizon?: Goal["horizon"];
  type?: Goal["type"];
  targetValue?: number | null;
  unit?: string | null;
  priority?: number;
  startDate?: ISODate | null;
  dueDate?: ISODate | null;
  parentId?: string | null;
  color?: string | null;
  tags?: string[];
};

export async function createGoal(input: GoalInput): Promise<Goal> {
  if (!input.title.trim()) throw new Error("A goal needs a title.");
  const db = await getDb();
  const tags = normalizeTags(input.tags);
  await ensureTags(tags);
  const [row] = await db
    .insert(goals)
    .values({
      title: input.title.trim(),
      why: input.why?.trim() || null,
      horizon: input.horizon ?? "quarter",
      type: input.type ?? "milestone",
      targetValue: input.targetValue ?? null,
      unit: input.unit?.trim() || null,
      priority: input.priority ?? 2,
      startDate: input.startDate || todayISO(),
      dueDate: input.dueDate || null,
      parentId: input.parentId || null,
      color: input.color ?? null,
      tags,
    })
    .returning();
  return row;
}

export async function updateGoal(id: string, patch: Partial<GoalInput> & { status?: Goal["status"]; currentValue?: number }): Promise<Goal> {
  const db = await getDb();
  const set: Partial<Goal> = {};
  if (patch.title !== undefined) set.title = patch.title.trim();
  if (patch.why !== undefined) set.why = patch.why?.trim() || null;
  if (patch.horizon !== undefined) set.horizon = patch.horizon;
  if (patch.type !== undefined) set.type = patch.type;
  if (patch.targetValue !== undefined) set.targetValue = patch.targetValue;
  if (patch.currentValue !== undefined) set.currentValue = patch.currentValue;
  if (patch.unit !== undefined) set.unit = patch.unit?.trim() || null;
  if (patch.priority !== undefined) set.priority = patch.priority;
  if (patch.startDate !== undefined) set.startDate = patch.startDate || null;
  if (patch.dueDate !== undefined) set.dueDate = patch.dueDate || null;
  if (patch.parentId !== undefined) set.parentId = patch.parentId === id ? null : patch.parentId || null;
  if (patch.color !== undefined) set.color = patch.color;
  if (patch.tags !== undefined) {
    set.tags = normalizeTags(patch.tags);
    await ensureTags(set.tags);
  }
  if (patch.status !== undefined) {
    set.status = patch.status;
    set.completedAt = patch.status === "done" ? new Date() : null;
  }
  const [row] = await db.update(goals).set(set).where(eq(goals.id, id)).returning();
  if (!row) throw new Error("Goal not found.");
  return row;
}

export async function adjustGoalValue(id: string, delta: number): Promise<void> {
  const db = await getDb();
  await db
    .update(goals)
    .set({ currentValue: sql`greatest(0, ${goals.currentValue} + ${delta})` })
    .where(eq(goals.id, id));
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(goals).where(eq(goals.id, id));
}

export async function addMilestone(goalId: string, title: string, dueDate?: ISODate | null): Promise<Milestone> {
  if (!title.trim()) throw new Error("A milestone needs a title.");
  const db = await getDb();
  const [row] = await db.insert(milestones).values({ goalId, title: title.trim(), dueDate: dueDate || null }).returning();
  return row;
}

export async function toggleMilestone(id: string, done: boolean): Promise<void> {
  const db = await getDb();
  await db.update(milestones).set({ doneAt: done ? new Date() : null }).where(eq(milestones.id, id));
}

export async function deleteMilestone(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(milestones).where(eq(milestones.id, id));
}

/** Goal options for pickers (active goals, highest priority first). */
export async function goalOptions(): Promise<Array<{ id: string; title: string; priority: number }>> {
  const db = await getDb();
  return db
    .select({ id: goals.id, title: goals.title, priority: goals.priority })
    .from(goals)
    .where(sql`${goals.status} <> 'done'`)
    .orderBy(asc(goals.priority), asc(goals.title));
}

/** Habit options for pickers. */
export async function habitOptions(): Promise<Array<{ id: string; title: string }>> {
  const db = await getDb();
  return db
    .select({ id: habits.id, title: habits.title })
    .from(habits)
    .where(sql`${habits.archivedAt} is null`)
    .orderBy(asc(habits.title));
}

