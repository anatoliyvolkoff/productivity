/**
 * Browser database for the static (GitHub Pages) build: Postgres compiled to
 * WebAssembly (PGlite), persisted in this browser's IndexedDB. Same schema as
 * the server; migrations are bundled in migrations.generated.ts.
 */
import type { Connection, AppDb } from "./connect";
import { MIGRATIONS } from "./migrations.generated";
import * as schema from "./schema";

const DB_NAME = "idb://productivity-os";

let connection: Promise<Connection> | undefined;

async function open(): Promise<Connection> {
  // PGlite ships as static files next to the site (see scripts/build-web.mjs);
  // bundling it breaks how it locates its WASM and data files.
  const url = `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/pglite/index.js`;
  const [{ PGlite }, { drizzle }] = await Promise.all([
    import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url) as Promise<typeof import("@electric-sql/pglite")>,
    import("drizzle-orm/pglite"),
  ]);
  const client = await PGlite.create(DB_NAME);
  await client.exec("create table if not exists __pos_migrations (tag text primary key, applied_at timestamptz default now())");
  const done = new Set((await client.query<{ tag: string }>("select tag from __pos_migrations")).rows.map((r) => r.tag));
  for (const m of MIGRATIONS) {
    if (done.has(m.tag)) continue;
    await client.transaction(async (tx) => {
      for (const statement of m.sql.split("--> statement-breakpoint")) if (statement.trim()) await tx.exec(statement);
      await tx.query("insert into __pos_migrations (tag) values ($1)", [m.tag]);
    });
  }
  return {
    kind: "browser",
    location: "This browser (IndexedDB)",
    db: drizzle(client, { schema }) as unknown as AppDb,
    close: () => client.close(),
  };
}

export function getConnection(): Promise<Connection> {
  connection ??= open().catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

export async function getDb(): Promise<AppDb> {
  return (await getConnection()).db;
}

export type { AppDb };
export * as schema from "./schema";
