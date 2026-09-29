"use server";

import { refresh } from "next/cache";
import { attempt } from "@/lib/actions";
import type { ISODate } from "@/lib/domain/dates";
import { archiveHabit, createHabit, deleteHabit, getLoggedValue, logHabit, updateHabit, type HabitInput } from "@/lib/services/habits";

export async function addHabit(input: HabitInput) {
  const result = await attempt(async () => (await createHabit(input)).id);
  refresh();
  return result;
}

export async function saveHabit(id: string, patch: Partial<HabitInput>) {
  const result = await attempt(() => updateHabit(id, patch));
  refresh();
  return result;
}

export async function setHabitValue(id: string, date: ISODate, value: number) {
  const result = await attempt(() => logHabit(id, date, Math.max(0, value)));
  refresh();
  return result;
}

export async function stepHabit(id: string, date: ISODate, delta: number) {
  const result = await attempt(async () => logHabit(id, date, Math.max(0, (await getLoggedValue(id, date)) + delta)));
  refresh();
  return result;
}

export async function archiveHabitAction(id: string, archived = true) {
  const result = await attempt(() => archiveHabit(id, archived));
  refresh();
  return result;
}

export async function removeHabit(id: string) {
  const result = await attempt(() => deleteHabit(id));
  refresh();
  return result;
}
