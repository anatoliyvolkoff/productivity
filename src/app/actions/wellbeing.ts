"use server";

import { refresh } from "next/cache";
import { attempt } from "@/lib/actions";
import type { MoodContext } from "@/lib/db/schema";
import { createMoodEntry, deleteMoodEntry } from "@/lib/services/mood";
import { deleteSleep, saveSleep, type SleepInput } from "@/lib/services/sleep";

export async function logMood(input: { energy: number; pleasantness: number; emotion: string; note?: string | null; context?: MoodContext | null }) {
  const result = await attempt(async () => {
    const entry = await createMoodEntry(input);
    return { id: entry.id, quadrant: entry.quadrant };
  });
  refresh();
  return result;
}

export async function removeMood(id: string) {
  const result = await attempt(() => deleteMoodEntry(id));
  refresh();
  return result;
}

export async function logSleep(input: SleepInput) {
  const result = await attempt(async () => (await saveSleep(input)).id);
  refresh();
  return result;
}

export async function removeSleep(id: string) {
  const result = await attempt(() => deleteSleep(id));
  refresh();
  return result;
}
