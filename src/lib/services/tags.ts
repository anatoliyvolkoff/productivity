import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { rowsOf } from "@/lib/db/rows";
import { goals, habits, notes, tags, tasks } from "@/lib/db/schema";

export type TagInfo = { name: string; color: string | null; count: number };

/** Palette for automatically colored tags (bright accents that work in both themes). */
const TAG_COLORS = ["#007aff", "#ff7a00", "#34c759", "#af52de", "#ff2d55", "#5ac8fa", "#ffcc00", "#5856d6"];

export function normalizeTags(input: string[] | string | null | undefined): string[] {
  const list = Array.isArray(input) ? input : (input ?? "").split(/[,\s]+/);
  const out: string[] = [];
  for (const raw of list) {
    const tag = raw.trim().replace(/^#/, "").toLowerCase();
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

/** Make sure tag metadata rows exist (assigning a color) for the given names. */
export async function ensureTags(names: string[]): Promise<void> {
  if (names.length === 0) return;
  const db = await getDb();
  const existing = await db.select({ name: tags.name }).from(tags);
  const known = new Set(existing.map((t) => t.name));
  const missing = names.filter((n) => !known.has(n));
  if (missing.length === 0) return;
  await db
    .insert(tags)
    .values(missing.map((name, i) => ({ name, color: TAG_COLORS[(existing.length + i) % TAG_COLORS.length] })))
    .onConflictDoNothing();
}

/** All tags with usage counts across tasks, habits, goals and notes. */
export async function listTags(): Promise<TagInfo[]> {
  const db = await getDb();
  const [meta, usage] = await Promise.all([
    db.select().from(tags),
    db.execute(sql`
      select tag, count(*)::int as count from (
        select unnest(${tasks.tags}) as tag from ${tasks} where ${tasks.status} not in ('done', 'dropped')
        union all select unnest(${habits.tags}) from ${habits} where ${habits.archivedAt} is null
        union all select unnest(${goals.tags}) from ${goals}
        union all select unnest(${notes.tags}) from ${notes}
      ) t group by tag
    `),
  ]);
  const counts = new Map<string, number>();
  for (const row of rowsOf<{ tag: string; count: number }>(usage)) counts.set(row.tag, Number(row.count));
  const names = new Set([...meta.map((t) => t.name), ...counts.keys()]);
  const colors = new Map(meta.map((t) => [t.name, t.color]));
  return [...names]
    .map((name) => ({ name, color: colors.get(name) ?? null, count: counts.get(name) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function setTagColor(name: string, color: string): Promise<void> {
  const db = await getDb();
  await db.insert(tags).values({ name, color }).onConflictDoUpdate({ target: tags.name, set: { color } });
}

export async function renameTag(from: string, to: string): Promise<void> {
  const [next] = normalizeTags([to]);
  if (!next || next === from) return;
  const db = await getDb();
  for (const table of [tasks, habits, goals, notes]) {
    await db
      .update(table)
      .set({ tags: sql`array_remove(array_replace(${table.tags}, ${from}, ${next}), null)` })
      .where(sql`${from} = any(${table.tags})`);
  }
  const [meta] = await db.select().from(tags).where(eq(tags.name, from));
  await db.delete(tags).where(eq(tags.name, from));
  await db.insert(tags).values({ name: next, color: meta?.color ?? null }).onConflictDoNothing();
}

export async function deleteTag(name: string): Promise<void> {
  const db = await getDb();
  for (const table of [tasks, habits, goals, notes]) {
    await db.update(table).set({ tags: sql`array_remove(${table.tags}, ${name})` }).where(sql`${name} = any(${table.tags})`);
  }
  await db.delete(tags).where(eq(tags.name, name));
}
