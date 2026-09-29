"use server";

import { refresh } from "next/cache";
import { attempt } from "@/lib/actions";
import { atTime, todayISO } from "@/lib/domain/dates";
import { parseQuickAdd } from "@/lib/domain/quickAdd";
import { capture, getItem, markTriaged, updateItemText } from "@/lib/services/braindump";
import { createEvent } from "@/lib/services/calendar";
import { createGoal } from "@/lib/services/goals";
import { createHabit } from "@/lib/services/habits";
import { createNote } from "@/lib/services/notes";
import { createTask } from "@/lib/services/tasks";

export type TriageTarget = "task" | "note" | "goal" | "habit" | "deleted";

export async function captureThoughts(text: string) {
  const result = await attempt(async () => {
    const items = await capture(text);
    if (items.length === 0) throw new Error("Nothing to capture yet.");
    return items.length;
  });
  refresh();
  return result;
}

/** Turn a brain-dump line into a task, note, goal or habit (or let it go). */
export async function triageItem(id: string, as: TriageTarget, overrides: { text?: string; priority?: number; tags?: string[] } = {}) {
  const result = await attempt(async () => {
    const item = await getItem(id);
    if (!item) throw new Error("That item is gone.");
    const text = (overrides.text ?? item.text).trim();
    if (overrides.text && overrides.text !== item.text) await updateItemText(id, text);
    let resultId: string | null = null;

    if (as === "task") {
      const parsed = parseQuickAdd(text, todayISO());
      const task = await createTask({
        title: parsed.title || text,
        tags: [...parsed.tags, ...(overrides.tags ?? [])],
        priority: overrides.priority ?? parsed.priority,
        dueDate: parsed.dueDate,
        effortMin: parsed.effortMin,
        energy: parsed.energy,
      });
      if (parsed.time && parsed.dueDate) {
        const startAt = atTime(parsed.dueDate, parsed.time);
        await createEvent({ title: task.title, startAt, endAt: new Date(startAt.getTime() + (parsed.effortMin ?? 60) * 60_000), taskId: task.id, isTimeBlock: true });
      }
      resultId = task.id;
    } else if (as === "note") {
      const firstLine = text.split("\n")[0];
      resultId = (await createNote({ title: firstLine.slice(0, 80), contentMd: text, tags: overrides.tags })).id;
    } else if (as === "goal") {
      resultId = (await createGoal({ title: text, tags: overrides.tags })).id;
    } else if (as === "habit") {
      resultId = (await createHabit({ title: text, tags: overrides.tags })).id;
    }
    await markTriaged(id, as, resultId);
    return { as, resultId };
  });
  refresh();
  return result;
}
