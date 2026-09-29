/**
 * The "database connector": the app talks to this interface, never to a
 * specific database. `PostgresStore` (Supabase) is the default; a local
 * SQLite store can implement the same interface later.
 * Repositories are added here phase by phase (docs/PLAN.md §9).
 */
import type { tasks } from "@/lib/db/schema";

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export interface TaskRepository {
  list(filter?: { status?: Task["status"][]; mitOn?: string }): Promise<Task[]>;
  get(id: string): Promise<Task | undefined>;
  create(input: NewTask): Promise<Task>;
  update(id: string, patch: Partial<NewTask>): Promise<Task | undefined>;
  remove(id: string): Promise<void>;
}

export interface DataStore {
  tasks: TaskRepository;
  /** Cheap round-trip used by Settings to verify the connection. */
  ping(): Promise<boolean>;
}
