"use server";

import { refresh } from "next/cache";
import { attempt } from "@/lib/actions";
import { atTime, todayISO, type ISODate } from "@/lib/domain/dates";
import { parseQuickAdd } from "@/lib/domain/quickAdd";
import { createEvent } from "@/lib/services/calendar";
import {
  carryOverMits,
  createTask,
  deleteTask,
  setTaskDone,
  toggleMit,
  updateTask,
  type TaskInput,
} from "@/lib/services/tasks";

/** Create a task from quick-add text; a clock time also creates a time block. */
export async function quickAddTask(text: string, defaults: Partial<TaskInput> = {}) {
  const result = await attempt(async () => {
    const today = todayISO();
    const parsed = parseQuickAdd(text, today);
    if (!parsed.title) throw new Error("Type what needs doing.");
    const task = await createTask({
      ...defaults,
      title: parsed.title,
      tags: [...(defaults.tags ?? []), ...parsed.tags],
      priority: parsed.priority ?? defaults.priority,
      dueDate: parsed.dueDate ?? defaults.dueDate,
      effortMin: parsed.effortMin ?? defaults.effortMin,
      energy: parsed.energy ?? defaults.energy,
    });
    if (parsed.time && parsed.dueDate) {
      const startAt = atTime(parsed.dueDate, parsed.time);
      await createEvent({
        title: parsed.title,
        startAt,
        endAt: new Date(startAt.getTime() + (parsed.effortMin ?? 60) * 60_000),
        taskId: task.id,
        isTimeBlock: true,
      });
    }
    return { id: task.id, title: task.title, scheduled: Boolean(parsed.time) };
  });
  refresh();
  return result;
}

export async function saveTask(id: string, patch: Partial<TaskInput>) {
  const result = await attempt(() => updateTask(id, patch));
  refresh();
  return result;
}

export async function addTask(input: TaskInput) {
  const result = await attempt(() => createTask(input));
  refresh();
  return result;
}

export async function toggleTaskDone(id: string, done: boolean) {
  const result = await attempt(() => setTaskDone(id, done));
  refresh();
  return result;
}

export async function removeTask(id: string) {
  const result = await attempt(() => deleteTask(id));
  refresh();
  return result;
}

export async function toggleTaskMit(id: string, date: ISODate = todayISO()) {
  const result = await attempt(async () => {
    if (!(await toggleMit(id, date))) throw new Error("Three is the limit — finish or swap one first.");
  });
  refresh();
  return result;
}

export async function carryOver(from: ISODate, to: ISODate) {
  const result = await attempt(() => carryOverMits(from, to));
  refresh();
  return result;
}
