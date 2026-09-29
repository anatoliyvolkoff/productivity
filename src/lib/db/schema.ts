/**
 * Database schema (Postgres / Supabase) — see docs/PLAN.md §7.
 * Single-user app: no user_id foreign keys; `profile` holds personal settings.
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ─── Enums ──────────────────────────────────────────────────────────────────

export const entityType = pgEnum("entity_type", [
  "task",
  "habit",
  "goal",
  "note",
  "time_entry",
  "focus_session",
  "mood_entry",
  "calendar_event",
  "braindump_item",
]);
export const taskStatus = pgEnum("task_status", ["inbox", "next", "active", "waiting", "done", "dropped"]);
export const energyLevel = pgEnum("energy_level", ["low", "high"]);
export const goalType = pgEnum("goal_type", ["numeric", "milestone", "habit"]);
export const goalStatus = pgEnum("goal_status", ["on_track", "at_risk", "off_track", "done", "paused"]);
export const habitType = pgEnum("habit_type", ["boolean", "count", "duration"]);
export const logSource = pgEnum("log_source", ["manual", "focus", "timer", "import", "ai"]);
export const focusPreset = pgEnum("focus_preset", ["pomodoro_25_5", "d52_17", "ultradian_90_20", "custom"]);
export const moodQuadrant = pgEnum("mood_quadrant", ["red", "yellow", "blue", "green"]);
export const calendarSource = pgEnum("calendar_source", ["local", "google"]);
export const aiSummaryKind = pgEnum("ai_summary_kind", ["morning", "evening", "weekly", "triage"]);

// ─── Profile & settings ─────────────────────────────────────────────────────

export const profile = pgTable("profile", {
  id: id(),
  name: text("name").notNull().default("Me"),
  timezone: text("timezone").notNull().default("UTC"),
  /** e.g. "lark" | "intermediate" | "owl" — refined from sleep midpoints. */
  chronotype: text("chronotype").default("intermediate"),
  wakeTarget: text("wake_target").default("07:00"),
  sleepTargetMin: integer("sleep_target_min").default(480),
  focusTargetMin: integer("focus_target_min").default(240),
  latitude: real("latitude"),
  longitude: real("longitude"),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ─── Tags & links (shared by every entity) ──────────────────────────────────

export const tags = pgTable("tags", {
  id: id(),
  name: text("name").notNull(),
  color: text("color"),
  parentId: uuid("parent_id").references((): AnyPgColumn => tags.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const entityTags = pgTable(
  "entity_tags",
  {
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    entityType: entityType("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tagId, t.entityType, t.entityId] }), index().on(t.entityType, t.entityId)],
);

export const links = pgTable(
  "links",
  {
    id: id(),
    fromType: entityType("from_type").notNull(),
    fromId: uuid("from_id").notNull(),
    toType: entityType("to_type").notNull(),
    toId: uuid("to_id").notNull(),
    kind: text("kind").notNull().default("related"),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.fromType, t.fromId), index().on(t.toType, t.toId)],
);

// ─── Goals ──────────────────────────────────────────────────────────────────

export const goals = pgTable("goals", {
  id: id(),
  title: text("title").notNull(),
  why: text("why"),
  type: goalType("type").notNull().default("milestone"),
  targetValue: real("target_value"),
  currentValue: real("current_value").default(0),
  unit: text("unit"),
  priority: smallint("priority").notNull().default(2), // 1 (highest) – 4
  status: goalStatus("status").notNull().default("on_track"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  parentId: uuid("parent_id").references((): AnyPgColumn => goals.id, { onDelete: "set null" }),
  reviewCadence: text("review_cadence").default("weekly"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const milestones = pgTable("milestones", {
  id: id(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  doneAt: timestamp("done_at", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ─── Tasks ──────────────────────────────────────────────────────────────────

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    title: text("title").notNull(),
    notes: text("notes"),
    status: taskStatus("status").notNull().default("inbox"),
    priority: smallint("priority").notNull().default(3), // 1 (highest) – 4
    urgent: boolean("urgent").notNull().default(false),
    important: boolean("important").notNull().default(false),
    effortMin: integer("effort_min"),
    energy: energyLevel("energy"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    /** Date this task is one of the day's top-3 most important tasks. */
    mitOn: date("mit_on"),
    goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
    parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => tasks.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.status), index().on(t.mitOn), index().on(t.goalId)],
);

// ─── Habits ─────────────────────────────────────────────────────────────────

export type HabitSchedule =
  | { kind: "daily" }
  | { kind: "weekdays"; days: number[] } // 0 = Sunday
  | { kind: "per_week"; times: number };

export const habits = pgTable("habits", {
  id: id(),
  title: text("title").notNull(),
  type: habitType("type").notNull().default("boolean"),
  target: real("target").notNull().default(1),
  unit: text("unit"),
  schedule: jsonb("schedule").$type<HabitSchedule>().notNull().default({ kind: "daily" }),
  /** Implementation intention: "After X at Y, I will …". */
  cue: text("cue"),
  stackAfterHabitId: uuid("stack_after_habit_id").references((): AnyPgColumn => habits.id, {
    onDelete: "set null",
  }),
  goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  priority: smallint("priority").notNull().default(3),
  isNegative: boolean("is_negative").notNull().default(false),
  color: text("color"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const habitLogs = pgTable(
  "habit_logs",
  {
    id: id(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    value: real("value").notNull().default(1),
    source: logSource("source").notNull().default("manual"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.habitId, t.date, t.source)],
);

// ─── Calendar ───────────────────────────────────────────────────────────────

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: id(),
    source: calendarSource("source").notNull().default("local"),
    googleId: text("google_id"),
    calendarId: text("calendar_id"),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    allDay: boolean("all_day").notNull().default(false),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    isTimeBlock: boolean("is_time_block").notNull().default(false),
    /** Keep a time block local instead of pushing it to Google. */
    isPrivate: boolean("is_private").notNull().default(false),
    etag: text("etag"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.startAt), uniqueIndex().on(t.calendarId, t.googleId)],
);

export const calendarSyncState = pgTable("calendar_sync_state", {
  calendarId: text("calendar_id").primaryKey(),
  summary: text("summary"),
  color: text("color"),
  enabled: boolean("enabled").notNull().default(true),
  syncToken: text("sync_token"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
});

// ─── Time & focus ───────────────────────────────────────────────────────────

export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: id(),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    preset: focusPreset("preset").notNull().default("pomodoro_25_5"),
    plannedMin: integer("planned_min").notNull(),
    actualMin: integer("actual_min"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    quality: smallint("quality"), // 1–5
    interruptions: integer("interruptions").notNull().default(0),
    notes: text("notes"),
  },
  (t) => [index().on(t.startedAt)],
);

export const timeEntries = pgTable(
  "time_entries",
  {
    id: id(),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
    focusSessionId: uuid("focus_session_id").references(() => focusSessions.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    source: logSource("source").notNull().default("timer"),
    isDeepWork: boolean("is_deep_work").notNull().default(false),
    note: text("note"),
  },
  (t) => [index().on(t.startedAt)],
);

export const distractions = pgTable("distractions", {
  id: id(),
  focusSessionId: uuid("focus_session_id").references(() => focusSessions.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: createdAt(),
});

// ─── Capture & notes ────────────────────────────────────────────────────────

export const braindumpItems = pgTable("braindump_items", {
  id: id(),
  text: text("text").notNull(),
  triagedAt: timestamp("triaged_at", { withTimezone: true }),
  resultType: entityType("result_type"),
  resultId: uuid("result_id"),
  aiSuggestion: jsonb("ai_suggestion").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
});

export const notes = pgTable(
  "notes",
  {
    id: id(),
    title: text("title").notNull().default(""),
    contentMd: text("content_md").notNull().default(""),
    /** Set for the daily note of a given date. */
    dailyDate: date("daily_date"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex().on(t.dailyDate)],
);

// ─── Wellbeing ──────────────────────────────────────────────────────────────

export const moodEntries = pgTable(
  "mood_entries",
  {
    id: id(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    energy: smallint("energy").notNull(), // -5 … 5
    pleasantness: smallint("pleasantness").notNull(), // -5 … 5
    quadrant: moodQuadrant("quadrant").notNull(),
    emotion: text("emotion").notNull(),
    note: text("note"),
    context: jsonb("context").$type<{ activity?: string; people?: string; place?: string }>(),
    weatherSnapshot: jsonb("weather_snapshot").$type<Record<string, unknown>>(),
    strategyUsed: text("strategy_used"),
  },
  (t) => [index().on(t.at)],
);

export const sleepEntries = pgTable("sleep_entries", {
  id: id(),
  /** The date you woke up on. */
  date: date("date").notNull().unique(),
  bedAt: timestamp("bed_at", { withTimezone: true }).notNull(),
  sleepAt: timestamp("sleep_at", { withTimezone: true }),
  wakeAt: timestamp("wake_at", { withTimezone: true }).notNull(),
  outOfBedAt: timestamp("out_of_bed_at", { withTimezone: true }),
  latencyMin: integer("latency_min"),
  awakenings: integer("awakenings"),
  quality: smallint("quality"), // 1–5
  factors: jsonb("factors").$type<{ caffeineLate?: boolean; alcohol?: boolean; screensLate?: boolean; exercise?: boolean }>(),
  note: text("note"),
  source: logSource("source").notNull().default("manual"),
  createdAt: createdAt(),
});

export const weatherCache = pgTable(
  "weather_cache",
  {
    date: date("date").notNull(),
    hour: smallint("hour").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.date, t.hour] })],
);

// ─── Rollups, AI & layout ───────────────────────────────────────────────────

export const dailyMetrics = pgTable("daily_metrics", {
  date: date("date").primaryKey(),
  focusMin: integer("focus_min").notNull().default(0),
  deepRatio: real("deep_ratio"),
  tasksDone: integer("tasks_done").notNull().default(0),
  mitsDone: integer("mits_done").notNull().default(0),
  habitPct: real("habit_pct"),
  sleepMin: integer("sleep_min"),
  sleepDebtMin: integer("sleep_debt_min"),
  sleepRegularity: real("sleep_regularity"),
  moodValenceAvg: real("mood_valence_avg"),
  moodEnergyAvg: real("mood_energy_avg"),
  energyCurve: jsonb("energy_curve").$type<number[]>(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiSummaries = pgTable(
  "ai_summaries",
  {
    id: id(),
    date: date("date").notNull(),
    kind: aiSummaryKind("kind").notNull(),
    inputHash: text("input_hash").notNull(),
    model: text("model").notNull(),
    output: jsonb("output").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.date, t.kind)],
);

export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: id(),
  name: text("name").notNull(),
  layout: jsonb("layout").$type<unknown[]>().notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  updatedAt: updatedAt(),
});
