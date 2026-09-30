/**
 * The database connector. Picks the backend from the environment:
 *
 *  - `DATABASE_URL` set  → Supabase / any Postgres (postgres-js driver)
 *  - otherwise           → embedded Postgres (PGlite) stored in `.data/pglite`
 *
 * Both are real Postgres, so the same schema, migrations and queries work on
 * either. Migrations in `drizzle/` are applied automatically on first use.
 * This module has no `server-only` import so scripts can use it too.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type AppDb = PgDatabase<PgQueryResultHKT, typeof schema>;

export type Connection = {
  kind: "supabase" | "local";
  /** Human-readable location: database host or local folder. */
  location: string;
  db: AppDb;
  close: () => Promise<void>;
};

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export async function openConnection(): Promise<Connection> {
  const url = process.env.DATABASE_URL?.trim();
  return url ? openPostgres(url) : openLocal(process.env.LOCAL_DB_DIR?.trim() || path.join(process.cwd(), ".data", "pglite"));
}

async function openPostgres(url: string): Promise<Connection> {
  const [{ drizzle }, { migrate }, { default: postgres }] = await Promise.all([
    import("drizzle-orm/postgres-js"),
    import("drizzle-orm/postgres-js/migrator"),
    import("postgres"),
  ]);

  // Migrations prefer the direct/session connection; the app uses the pooler.
  const migrationClient = postgres(process.env.DATABASE_URL_DIRECT?.trim() || url, {
    max: 1,
    prepare: false,
    onnotice: () => {},
  });
  try {
    await migrate(drizzle(migrationClient), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await migrationClient.end();
  }

  // `prepare: false` is required by Supabase's transaction pooler (port 6543).
  const client = postgres(url, { prepare: false, max: Number(process.env.DATABASE_POOL_MAX) || 5, onnotice: () => {} });
  let location = "Postgres";
  try {
    location = new URL(url).hostname;
  } catch {}

  return {
    kind: "supabase",
    location,
    db: drizzle(client, { schema }) as unknown as AppDb,
    close: () => client.end(),
  };
}

async function openLocal(dataDir: string): Promise<Connection> {
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);

  const inMemory = dataDir.startsWith("memory://");
  if (!inMemory) mkdirSync(dataDir, { recursive: true });
  const client = inMemory ? new PGlite() : new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

  return {
    kind: "local",
    location: inMemory ? "in-memory" : dataDir,
    db: db as unknown as AppDb,
    close: () => client.close(),
  };
}
