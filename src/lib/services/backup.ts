import "server-only";
import { getTableColumns, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";

/** Tables in dependency order (parents before children). Integrations (OAuth tokens) are never exported. */
const TABLES: Array<[string, PgTable]> = [
  ["profile", s.profile],
  ["tags", s.tags],
  ["goals", s.goals],
  ["milestones", s.milestones],
  ["tasks", s.tasks],
  ["habits", s.habits],
  ["habitLogs", s.habitLogs],
  ["calendars", s.calendars],
  ["calendarEvents", s.calendarEvents],
  ["focusSessions", s.focusSessions],
  ["timeEntries", s.timeEntries],
  ["braindumpItems", s.braindumpItems],
  ["notes", s.notes],
  ["moodEntries", s.moodEntries],
  ["sleepEntries", s.sleepEntries],
  ["aiSummaries", s.aiSummaries],
];

export type Backup = { app: "productivity-os"; version: 1; exportedAt: string; data: Record<string, unknown[]> };

export async function exportAll(): Promise<Backup> {
  const db = await getDb();
  const data: Record<string, unknown[]> = {};
  for (const [name, table] of TABLES) data[name] = await db.select().from(table);
  return { app: "productivity-os", version: 1, exportedAt: new Date().toISOString(), data };
}

/** Replace everything with a backup's contents, in one transaction. */
export async function importAll(backup: Backup): Promise<number> {
  if (backup?.app !== "productivity-os" || backup.version !== 1 || typeof backup.data !== "object") {
    throw new Error("That file isn't a Productivity OS backup.");
  }
  const db = await getDb();
  let rows = 0;
  await db.transaction(async (tx) => {
    for (const [, table] of [...TABLES].reverse()) await tx.delete(table);
    for (const [name, table] of TABLES) {
      const list = backup.data[name];
      if (!Array.isArray(list) || list.length === 0) continue;
      const columns = Object.entries(getTableColumns(table));
      const revived = list.map((row) => {
        const out: Record<string, unknown> = {};
        for (const [key, col] of columns) {
          const v = (row as Record<string, unknown>)[key];
          if (v === undefined) continue;
          out[key] = v !== null && col.columnType === "PgTimestamp" ? new Date(v as string) : v;
        }
        return out;
      });
      for (let i = 0; i < revived.length; i += 500) await tx.insert(table).values(revived.slice(i, i + 500) as never);
      rows += revived.length;
    }
  });
  return rows;
}

export async function tableCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const out: Record<string, number> = {};
  for (const [name, table] of TABLES) {
    const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(table);
    out[name] = Number(r?.n ?? 0);
  }
  return out;
}
