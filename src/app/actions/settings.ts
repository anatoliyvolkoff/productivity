"use server";

import { refresh } from "next/cache";
import { attempt } from "@/lib/actions";
import { exportAll, importAll, type Backup } from "@/lib/services/backup";
import { updateProfile, type ProfilePatch } from "@/lib/services/profile";
import { deleteTag, renameTag, setTagColor } from "@/lib/services/tags";
import { searchPlaces } from "@/lib/services/weather";

export async function saveProfile(patch: ProfilePatch) {
  const result = await attempt(() => updateProfile(patch));
  refresh();
  return result;
}

export async function findPlaces(query: string) {
  return attempt(() => searchPlaces(query));
}

export async function recolorTag(name: string, color: string) {
  const result = await attempt(() => setTagColor(name, color));
  refresh();
  return result;
}

export async function renameTagAction(from: string, to: string) {
  const result = await attempt(() => renameTag(from, to));
  refresh();
  return result;
}

export async function removeTag(name: string) {
  const result = await attempt(() => deleteTag(name));
  refresh();
  return result;
}

/** Everything as JSON (Google tokens excluded), for download. */
export async function exportBackup() {
  return attempt(() => exportAll());
}

export async function importBackup(json: string) {
  const result = await attempt(async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error("That file isn't valid JSON.");
    }
    return importAll(parsed as Backup);
  });
  refresh();
  return result;
}
