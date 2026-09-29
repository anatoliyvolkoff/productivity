import "server-only";
import type { DataStore } from "./DataStore";
import { createPostgresStore } from "./postgres";

let store: DataStore | undefined;

/** The active data store. Swap the implementation here to change backends. */
export function getStore(): DataStore {
  store ??= createPostgresStore();
  return store;
}

export type { DataStore } from "./DataStore";
