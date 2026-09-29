"use server";

import { refresh } from "next/cache";
import { attempt } from "@/lib/actions";
import type { ISODate } from "@/lib/domain/dates";
import { createNote, deleteNote, getOrCreateDailyNote, updateNote } from "@/lib/services/notes";

export async function newNote() {
  const result = await attempt(async () => (await createNote({ title: "" })).id);
  refresh();
  return result;
}

export async function openDailyNote(date: ISODate) {
  const result = await attempt(async () => (await getOrCreateDailyNote(date)).id);
  refresh();
  return result;
}

/** Autosave: no refresh, so typing isn't interrupted. */
export async function saveNote(id: string, patch: { title?: string; contentMd?: string; pinned?: boolean; tags?: string[] }) {
  return attempt(async () => {
    const note = await updateNote(id, patch);
    return { updatedAt: note.updatedAt };
  });
}

export async function saveNoteAndRefresh(id: string, patch: { title?: string; contentMd?: string; pinned?: boolean; tags?: string[] }) {
  const result = await saveNote(id, patch);
  refresh();
  return result;
}

export async function removeNote(id: string) {
  const result = await attempt(() => deleteNote(id));
  refresh();
  return result;
}
