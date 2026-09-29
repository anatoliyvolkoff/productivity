import "server-only";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { moodEntries, type MoodContext, type MoodEntry } from "@/lib/db/schema";
import { addDaysISO, fromISODate, toISODate, type ISODate } from "@/lib/domain/dates";
import { quadrantOf } from "@/lib/domain/mood";
import { getProfile } from "./profile";
import { getWeather, snapshot } from "./weather";

export async function createMoodEntry(input: {
  energy: number;
  pleasantness: number;
  emotion: string;
  note?: string | null;
  context?: MoodContext | null;
  at?: Date;
}): Promise<MoodEntry> {
  const energy = clamp(input.energy);
  const pleasantness = clamp(input.pleasantness);
  if (!input.emotion.trim()) throw new Error("Pick the word that fits best.");
  const profile = await getProfile();
  const weather = snapshot(await getWeather(profile.latitude, profile.longitude));
  const db = await getDb();
  const [row] = await db
    .insert(moodEntries)
    .values({
      energy,
      pleasantness,
      quadrant: quadrantOf(energy, pleasantness),
      emotion: input.emotion.trim(),
      note: input.note?.trim() || null,
      context: input.context ?? null,
      weather,
      at: input.at ?? new Date(),
    })
    .returning();
  return row;
}

export async function moodBetween(from: ISODate, to: ISODate): Promise<MoodEntry[]> {
  const db = await getDb();
  return db
    .select()
    .from(moodEntries)
    .where(and(gte(moodEntries.at, fromISODate(from)), lt(moodEntries.at, fromISODate(addDaysISO(to, 1)))))
    .orderBy(desc(moodEntries.at));
}

export async function deleteMoodEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(moodEntries).where(eq(moodEntries.id, id));
}

export async function lastMood(): Promise<MoodEntry | null> {
  const db = await getDb();
  const [row] = await db.select().from(moodEntries).orderBy(desc(moodEntries.at)).limit(1);
  return row ?? null;
}

/** Average pleasantness and energy per local day. */
export function moodPerDay(entries: MoodEntry[]): Map<ISODate, { valence: number; energy: number; n: number }> {
  const acc = new Map<ISODate, { v: number; e: number; n: number }>();
  for (const m of entries) {
    const d = toISODate(m.at);
    const cur = acc.get(d) ?? { v: 0, e: 0, n: 0 };
    acc.set(d, { v: cur.v + m.pleasantness, e: cur.e + m.energy, n: cur.n + 1 });
  }
  return new Map([...acc].map(([d, a]) => [d, { valence: a.v / a.n, energy: a.e / a.n, n: a.n }]));
}

const clamp = (v: number) => {
  const n = Math.round(v);
  if (!Number.isFinite(n) || n === 0) throw new Error("Pick a point on the grid.");
  return Math.max(-5, Math.min(5, n));
};
