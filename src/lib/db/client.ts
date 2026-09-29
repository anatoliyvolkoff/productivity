import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

function createClient() {
  if (!url) throw new Error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in.");
  // `prepare: false` is required by Supabase's transaction pooler (port 6543).
  return postgres(url, { prepare: false, max: 5 });
}

export function getDb() {
  globalForDb.pgClient ??= createClient();
  return drizzle(globalForDb.pgClient, { schema });
}

export type Db = ReturnType<typeof getDb>;
