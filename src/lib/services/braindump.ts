import "server-only";
import { and, desc, eq, gte, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { braindumpItems, type BraindumpItem } from "@/lib/db/schema";

export async function capture(text: string, focusSessionId?: string | null): Promise<BraindumpItem[]> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const db = await getDb();
  return db
    .insert(braindumpItems)
    .values(lines.map((line) => ({ text: line, source: focusSessionId ? "focus" : "capture", focusSessionId: focusSessionId ?? null })))
    .returning();
}

export async function listInbox(): Promise<BraindumpItem[]> {
  const db = await getDb();
  return db.select().from(braindumpItems).where(isNull(braindumpItems.triagedAt)).orderBy(desc(braindumpItems.createdAt));
}

export async function listProcessedSince(since: Date): Promise<BraindumpItem[]> {
  const db = await getDb();
  return db
    .select()
    .from(braindumpItems)
    .where(and(isNotNull(braindumpItems.triagedAt), gte(braindumpItems.triagedAt, since)))
    .orderBy(desc(braindumpItems.triagedAt));
}

export async function getItem(id: string): Promise<BraindumpItem | null> {
  const db = await getDb();
  const [row] = await db.select().from(braindumpItems).where(eq(braindumpItems.id, id));
  return row ?? null;
}

export async function markTriaged(id: string, resultType: string, resultId: string | null): Promise<void> {
  const db = await getDb();
  await db.update(braindumpItems).set({ triagedAt: new Date(), resultType, resultId }).where(eq(braindumpItems.id, id));
}

export async function updateItemText(id: string, text: string): Promise<void> {
  const db = await getDb();
  await db.update(braindumpItems).set({ text: text.trim() }).where(eq(braindumpItems.id, id));
}

export async function saveSuggestions(suggestions: Array<{ id: string; suggestion: Record<string, unknown> }>) {
  const db = await getDb();
  for (const s of suggestions) {
    await db.update(braindumpItems).set({ aiSuggestion: s.suggestion }).where(eq(braindumpItems.id, s.id));
  }
}
