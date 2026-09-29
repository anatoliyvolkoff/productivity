import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, lt, lte, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { goals, tasks, timeEntries, type NewTask, type Task } from "@/lib/db/schema";
import { addDaysISO, fromISODate, toISODate, todayISO, type ISODate } from "@/lib/domain/dates";
import { MAX_MITS, priorityScore } from "@/lib/domain/priority";
import { ensureTags, normalizeTags } from "./tags";

export type TaskRow = Task & {
  goalTitle: string | null;
  goalPriority: number | null;
  trackedMin: number;
  score: number;
};

export type TaskView = "today" | "upcoming" | "open" | "inbox" | "waiting" | "done";

const OPEN: Task["status"][] = ["inbox", "next", "active", "waiting"];

export async function listTasks(options: {
  view?: TaskView;
  tag?: string;
  goalId?: string;
  ids?: string[];
  /** Top tasks of this date, any status. */
  mitOn?: ISODate;
  today?: ISODate;
  limit?: number;
} = {}): Promise<TaskRow[]> {
  const db = await getDb();
  const today = options.today ?? todayISO();
  const where: SQL[] = [];

  switch (options.view) {
    case "today":
      where.push(
        inArray(tasks.status, OPEN),
        or(eq(tasks.mitOn, today), lte(tasks.dueDate, today), eq(tasks.status, "active"))!,
      );
      break;
    case "upcoming":
      where.push(inArray(tasks.status, OPEN), isNotNull(tasks.dueDate), gte(tasks.dueDate, addDaysISO(today, 1)));
      break;
    case "inbox":
      where.push(eq(tasks.status, "inbox"));
      break;
    case "waiting":
      where.push(eq(tasks.status, "waiting"));
      break;
    case "done":
      where.push(inArray(tasks.status, ["done", "dropped"]));
      break;
    case "open":
    default:
      if (!options.ids && !options.mitOn) where.push(inArray(tasks.status, OPEN));
  }
  if (options.tag) where.push(sql`${options.tag} = any(${tasks.tags})`);
  if (options.goalId) where.push(eq(tasks.goalId, options.goalId));
  if (options.mitOn) where.push(eq(tasks.mitOn, options.mitOn));
  if (options.ids) where.push(options.ids.length ? inArray(tasks.id, options.ids) : sql`false`);

  const rows = await db
    .select({ task: tasks, goalTitle: goals.title, goalPriority: goals.priority })
    .from(tasks)
    .leftJoin(goals, eq(tasks.goalId, goals.id))
    .where(and(...where))
    .orderBy(options.view === "done" ? desc(tasks.completedAt) : asc(tasks.createdAt))
    .limit(options.limit ?? 500);

  const tracked = await trackedMinutes(rows.map((r) => r.task.id));
  const list = rows.map(({ task, goalTitle, goalPriority }) => ({
    ...task,
    goalTitle,
    goalPriority,
    trackedMin: tracked.get(task.id) ?? 0,
    score: priorityScore({ ...task, goalPriority }, today),
  }));

  if (options.view === "done") return list;
  if (options.view === "upcoming") return list.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || b.score - a.score);
  // MITs first, then by priority score.
  const done = (t: TaskRow) => Number(t.status === "done" || t.status === "dropped");
  return list.sort(
    (a, b) => done(a) - done(b) || Number(b.mitOn === today) - Number(a.mitOn === today) || b.score - a.score || a.sortOrder - b.sortOrder,
  );
}

export async function getTask(id: string): Promise<TaskRow | null> {
  const [row] = await listTasks({ ids: [id] });
  return row ?? null;
}

/** Minutes tracked per task (running timers count up to now). */
export async function trackedMinutes(taskIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (taskIds.length === 0) return out;
  const db = await getDb();
  const rows = await db
    .select({
      taskId: timeEntries.taskId,
      minutes: sql<number>`coalesce(sum(extract(epoch from (coalesce(${timeEntries.endedAt}, now()) - ${timeEntries.startedAt}))) / 60, 0)`,
    })
    .from(timeEntries)
    .where(inArray(timeEntries.taskId, taskIds))
    .groupBy(timeEntries.taskId);
  for (const r of rows) if (r.taskId) out.set(r.taskId, Math.round(Number(r.minutes)));
  return out;
}

export type TaskInput = {
  title: string;
  notes?: string | null;
  status?: Task["status"];
  priority?: number;
  effortMin?: number | null;
  energy?: Task["energy"];
  dueDate?: ISODate | null;
  goalId?: string | null;
  parentTaskId?: string | null;
  tags?: string[];
  mitOn?: ISODate | null;
};

export async function createTask(input: TaskInput): Promise<Task> {
  const db = await getDb();
  const title = input.title.trim();
  if (!title) throw new Error("A task needs a title.");
  const tags = normalizeTags(input.tags);
  await ensureTags(tags);
  const values: NewTask = {
    title,
    notes: input.notes ?? null,
    status: input.status ?? "next",
    priority: clampPriority(input.priority ?? 3),
    effortMin: input.effortMin ?? null,
    energy: input.energy ?? null,
    dueDate: input.dueDate ?? null,
    goalId: input.goalId ?? null,
    parentTaskId: input.parentTaskId ?? null,
    tags,
    mitOn: input.mitOn ?? null,
  };
  if (values.mitOn) await assertMitCapacity(values.mitOn);
  const [row] = await db.insert(tasks).values(values).returning();
  return row;
}

export async function updateTask(id: string, patch: Partial<TaskInput>): Promise<Task> {
  const db = await getDb();
  const set: Partial<NewTask> = {};
  if (patch.title !== undefined) {
    if (!patch.title.trim()) throw new Error("A task needs a title.");
    set.title = patch.title.trim();
  }
  if (patch.notes !== undefined) set.notes = patch.notes || null;
  if (patch.priority !== undefined) set.priority = clampPriority(patch.priority);
  if (patch.effortMin !== undefined) set.effortMin = patch.effortMin;
  if (patch.energy !== undefined) set.energy = patch.energy;
  if (patch.dueDate !== undefined) set.dueDate = patch.dueDate || null;
  if (patch.goalId !== undefined) set.goalId = patch.goalId || null;
  if (patch.tags !== undefined) {
    set.tags = normalizeTags(patch.tags);
    await ensureTags(set.tags);
  }
  if (patch.status !== undefined) {
    set.status = patch.status;
    set.completedAt = patch.status === "done" || patch.status === "dropped" ? new Date() : null;
  }
  if (patch.mitOn !== undefined) {
    if (patch.mitOn) await assertMitCapacity(patch.mitOn, id);
    set.mitOn = patch.mitOn;
  }
  const [row] = await db.update(tasks).set(set).where(eq(tasks.id, id)).returning();
  if (!row) throw new Error("Task not found.");
  if (set.status === "done" || set.status === "dropped") await stopTimersFor(id);
  return row;
}

export async function setTaskDone(id: string, done: boolean): Promise<Task> {
  return updateTask(id, { status: done ? "done" : "next" });
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(tasks).where(eq(tasks.id, id));
}

/** Toggle a task as one of today's top 3. Returns false when the day is already full. */
export async function toggleMit(id: string, date: ISODate): Promise<boolean> {
  const db = await getDb();
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!task) throw new Error("Task not found.");
  if (task.mitOn === date) {
    await db.update(tasks).set({ mitOn: null }).where(eq(tasks.id, id));
    return true;
  }
  if ((await countMits(date, id)) >= MAX_MITS) return false;
  await db
    .update(tasks)
    .set({ mitOn: date, status: task.status === "inbox" ? "next" : task.status })
    .where(eq(tasks.id, id));
  return true;
}

async function countMits(date: ISODate, excludeId?: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(eq(tasks.mitOn, date), excludeId ? ne(tasks.id, excludeId) : undefined));
  return Number(row?.n ?? 0);
}

async function assertMitCapacity(date: ISODate, excludeId?: string) {
  if ((await countMits(date, excludeId)) >= MAX_MITS) {
    throw new Error(`You already have ${MAX_MITS} top tasks for that day.`);
  }
}

/** Move unfinished top tasks from `from` to `to` (evening shutdown). */
export async function carryOverMits(from: ISODate, to: ISODate): Promise<number> {
  const db = await getDb();
  const open = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.mitOn, from), notInArray(tasks.status, ["done", "dropped"])));
  let moved = 0;
  for (const t of open) {
    if ((await countMits(to)) >= MAX_MITS) break;
    await db.update(tasks).set({ mitOn: to }).where(eq(tasks.id, t.id));
    moved++;
  }
  return moved;
}

async function stopTimersFor(taskId: string) {
  const db = await getDb();
  await db
    .update(timeEntries)
    .set({ endedAt: new Date() })
    .where(and(eq(timeEntries.taskId, taskId), sql`${timeEntries.endedAt} is null`));
}

/** Tasks completed per local day in a date range (inclusive). */
export async function tasksDonePerDay(from: ISODate, to: ISODate): Promise<Map<ISODate, number>> {
  const db = await getDb();
  const rows = await db
    .select({ completedAt: tasks.completedAt })
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "done"),
        gte(tasks.completedAt, fromISODate(from)),
        lt(tasks.completedAt, fromISODate(addDaysISO(to, 1))),
      ),
    );
  const out = new Map<ISODate, number>();
  for (const r of rows) {
    if (!r.completedAt) continue;
    const day = toISODate(r.completedAt);
    out.set(day, (out.get(day) ?? 0) + 1);
  }
  return out;
}

const clampPriority = (p: number) => Math.min(4, Math.max(1, Math.round(p) || 3));
