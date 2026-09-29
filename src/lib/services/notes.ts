import "server-only";
import { format } from "date-fns";
import { desc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notes, type Note } from "@/lib/db/schema";
import { fromISODate, type ISODate } from "@/lib/domain/dates";
import { ensureTags, normalizeTags } from "./tags";

export async function listNotes(search?: string): Promise<Note[]> {
  const db = await getDb();
  const q = search?.trim();
  return db
    .select()
    .from(notes)
    .where(q ? or(ilike(notes.title, `%${q}%`), ilike(notes.contentMd, `%${q}%`)) : undefined)
    .orderBy(desc(notes.pinned), desc(notes.updatedAt))
    .limit(300);
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb();
  const [row] = await db.select().from(notes).where(eq(notes.id, id));
  return row ?? null;
}

export async function getDailyNote(date: ISODate): Promise<Note | null> {
  const db = await getDb();
  const [row] = await db.select().from(notes).where(eq(notes.dailyDate, date));
  return row ?? null;
}

export async function getOrCreateDailyNote(date: ISODate): Promise<Note> {
  const existing = await getDailyNote(date);
  if (existing) return existing;
  const db = await getDb();
  const [row] = await db
    .insert(notes)
    .values({ dailyDate: date, title: format(fromISODate(date), "EEEE, MMMM d") })
    .onConflictDoNothing()
    .returning();
  return row ?? (await getDailyNote(date))!;
}

export async function createNote(input: { title?: string; contentMd?: string; tags?: string[] }): Promise<Note> {
  const db = await getDb();
  const tags = normalizeTags(input.tags);
  await ensureTags(tags);
  const [row] = await db
    .insert(notes)
    .values({ title: input.title?.trim() ?? "", contentMd: input.contentMd ?? "", tags })
    .returning();
  return row;
}

export async function updateNote(
  id: string,
  patch: { title?: string; contentMd?: string; pinned?: boolean; tags?: string[] },
): Promise<Note> {
  const db = await getDb();
  const set: Partial<Note> = {};
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.contentMd !== undefined) set.contentMd = patch.contentMd;
  if (patch.pinned !== undefined) set.pinned = patch.pinned;
  if (patch.tags !== undefined) {
    set.tags = normalizeTags(patch.tags);
    await ensureTags(set.tags);
  }
  const [row] = await db.update(notes).set(set).where(eq(notes.id, id)).returning();
  if (!row) throw new Error("Note not found.");
  return row;
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(notes).where(eq(notes.id, id));
}
