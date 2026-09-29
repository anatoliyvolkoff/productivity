/** `db.execute` returns rows directly (postgres-js) or `{ rows }` (PGlite). */
export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}
