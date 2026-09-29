import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { profile, type Profile } from "@/lib/db/schema";

export async function getProfile(): Promise<Profile> {
  const db = await getDb();
  const [row] = await db.select().from(profile).limit(1);
  if (row) return row;
  const [created] = await db.insert(profile).values({}).returning();
  return created;
}

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | "name"
    | "wakeTarget"
    | "sleepTargetMin"
    | "focusTargetMin"
    | "chronotype"
    | "latitude"
    | "longitude"
    | "locationName"
    | "googleCalendarId"
  >
>;

export async function updateProfile(patch: ProfilePatch): Promise<Profile> {
  const db = await getDb();
  const current = await getProfile();
  const [row] = await db.update(profile).set(patch).where(eq(profile.id, current.id)).returning();
  return row;
}
