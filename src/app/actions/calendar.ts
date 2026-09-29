"use server";

import { refresh } from "next/cache";
import { attempt } from "@/lib/actions";
import { createEvent, deleteEvent, setCalendarEnabled, updateEvent, type EventInput } from "@/lib/services/calendar";
import { disconnectGoogle, syncGoogle } from "@/lib/services/google";

export async function addEvent(input: EventInput) {
  const result = await attempt(() => createEvent(input));
  refresh();
  return result;
}

export async function saveEvent(id: string, patch: Partial<EventInput>) {
  const result = await attempt(() => updateEvent(id, patch));
  refresh();
  return result;
}

export async function removeEvent(id: string) {
  const result = await attempt(() => deleteEvent(id));
  refresh();
  return result;
}

/** Pull from Google (throttled unless forced). Only refreshes the page when something was fetched. */
export async function syncCalendar(force = false) {
  const result = await attempt(async () => {
    const r = await syncGoogle({ force });
    if (!r.ok && r.error) throw new Error(r.error);
    return r;
  });
  if (result.ok && !result.data.skipped) refresh();
  return result;
}

export async function toggleCalendar(id: string, enabled: boolean) {
  const result = await attempt(async () => {
    await setCalendarEnabled(id, enabled);
    if (enabled) await syncGoogle({ force: true });
  });
  refresh();
  return result;
}

export async function disconnectCalendar() {
  const result = await attempt(() => disconnectGoogle());
  refresh();
  return result;
}
