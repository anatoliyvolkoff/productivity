"use server";

import { refresh } from "next/cache";
import { attempt } from "@/lib/actions";
import { archiveReminder, saveReminder, setReminderDone, type ReminderInput } from "@/lib/services/reminders";

export async function markReminder(id: string, done: boolean) {
  const result = await attempt(() => setReminderDone(id, done));
  refresh();
  return result;
}

export async function updateReminder(input: ReminderInput) {
  const result = await attempt(async () => (await saveReminder(input)).id);
  refresh();
  return result;
}

export async function removeReminder(id: string) {
  const result = await attempt(() => archiveReminder(id));
  refresh();
  return result;
}
