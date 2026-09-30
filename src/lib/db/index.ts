import "server-only";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { openConnection, type AppDb, type Connection } from "./connect";

// One connection per server process, shared across hot reloads in development.
const globalForDb = globalThis as unknown as { posConnection?: Promise<Connection> };

export function getConnection(): Promise<Connection> {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    // All data is per-request; opening the database while building would be a bug.
    return Promise.reject(new Error("The database is not available during `next build`."));
  }
  globalForDb.posConnection ??= openConnection().catch((error: unknown) => {
    globalForDb.posConnection = undefined; // retry on the next request
    throw error;
  });
  return globalForDb.posConnection;
}

export async function getDb(): Promise<AppDb> {
  return (await getConnection()).db;
}

export type { AppDb };
export * as schema from "./schema";
