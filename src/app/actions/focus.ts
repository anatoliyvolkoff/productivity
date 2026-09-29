"use server";

import { refresh } from "next/cache";
import { attempt } from "@/lib/actions";
import type { PresetKey } from "@/lib/domain/focus";
import { capture } from "@/lib/services/braindump";
import {
  abandonSession,
  addManualEntry,
  completeSession,
  deleteEntry,
  pauseSession,
  resumeSession,
  startSession,
  startTimer,
  stopTimer,
} from "@/lib/services/focus";

export async function startFocus(input: { taskId?: string | null; preset: PresetKey; focusMin?: number; breakMin?: number }) {
  const result = await attempt(() => startSession(input));
  refresh();
  return result;
}

export async function pauseFocus(id: string) {
  const result = await attempt(() => pauseSession(id));
  refresh();
  return result;
}

export async function resumeFocus(id: string) {
  const result = await attempt(() => resumeSession(id));
  refresh();
  return result;
}

export async function completeFocus(id: string, input: { quality?: number | null; notes?: string | null; keepOvertime?: boolean }) {
  const result = await attempt(() => completeSession(id, input));
  refresh();
  return result;
}

export async function abandonFocus(id: string) {
  const result = await attempt(() => abandonSession(id));
  refresh();
  return result;
}

export async function logDistraction(sessionId: string, text: string) {
  const result = await attempt(async () => {
    if (!text.trim()) throw new Error("Type the thought first.");
    await capture(text, sessionId);
  });
  refresh();
  return result;
}

export async function startTracking(input: { taskId?: string | null; note?: string | null; deep?: boolean }) {
  const result = await attempt(() => startTimer(input));
  refresh();
  return result;
}

export async function stopTracking() {
  const result = await attempt(() => stopTimer());
  refresh();
  return result;
}

export async function addTimeEntry(input: { taskId?: string | null; startedAt: Date; endedAt: Date; note?: string | null; deep?: boolean }) {
  const result = await attempt(() => addManualEntry(input));
  refresh();
  return result;
}

export async function removeTimeEntry(id: string) {
  const result = await attempt(() => deleteEntry(id));
  refresh();
  return result;
}
