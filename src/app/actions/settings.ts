"use server";

import { refresh } from "next/cache";
import { attempt } from "@/lib/actions";
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
