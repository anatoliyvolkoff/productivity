import "server-only";
import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import type { DataStore } from "./DataStore";

export function createPostgresStore(): DataStore {
  const db = getDb();

  return {
    async ping() {
      await db.execute(sql`select 1`);
      return true;
    },

    tasks: {
      async list(filter = {}) {
        const where: SQL[] = [];
        if (filter.status?.length) where.push(inArray(tasks.status, filter.status));
        if (filter.mitOn) where.push(eq(tasks.mitOn, filter.mitOn));
        return db
          .select()
          .from(tasks)
          .where(where.length ? and(...where) : undefined)
          .orderBy(asc(tasks.priority), asc(tasks.sortOrder), asc(tasks.createdAt));
      },
      async get(id) {
        const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
        return row;
      },
      async create(input) {
        const [row] = await db.insert(tasks).values(input).returning();
        return row;
      },
      async update(id, patch) {
        const [row] = await db.update(tasks).set(patch).where(eq(tasks.id, id)).returning();
        return row;
      },
      async remove(id) {
        await db.delete(tasks).where(eq(tasks.id, id));
      },
    },
  };
}
