/**
 * Database schema (Postgres — Supabase or the embedded local database).
 * See docs/PLAN.md §7. Single-user app: no user_id columns; `profile` holds
 * personal settings. Tags are plain text arrays on each entity; `tags` only
 * stores tag metadata such as color.
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const ts = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () =>
  ts("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const tagList = () => text("tags").array().notNull().default([]);

// ─── Enums ──────────────────────────────────────────────────────────────────

export const taskStatus = pgEnum("task_status", ["inbox", "next", "active", "waiting", "done", "dropped"]);
export const energyLevel = pgEnum("energy_level", ["low", "high"]);
export const goalHorizon = pgEnum("goal_horizon", ["vision", "year", "quarter", "month"]);
export const goalType = pgEnum("goal_type", ["milestone", "numeric", "habit"]);
export const goalStatus = pgEnum("goal_status", ["active", "paused", "done"]);
export const habitType = pgEnum("habit_type", ["boolean", "count", "duration"]);
export const habitAutoSource = pgEnum("habit_auto_source", ["none", "focus_minutes", "tasks_done"]);
export const focusPreset = pgEnum("focus_preset", ["pomodoro", "d52", "ultradian", "custom"]);
export const timeEntrySource = pgEnum("time_entry_source", ["timer", "focus", "manual"]);
export const moodQuadrant = pgEnum("mood_quadrant", ["red", "yellow", "blue", "green"]);
export const calendarSource = pgEnum("calendar_source", ["local", "google"]);
export const aiSummaryKind = pgEnum("ai_summary_kind", ["morning", "evening", "weekly"]);

// ─── Profile, tags, integrations ────────────────────────────────────────────

export const profile = pgTable("profile", {
  id: id(),
  name: text("name").notNull().default(""),
  /** "HH:MM" local time. */
  wakeTarget: text("wake_target").notNull().default("07:00"),
  sleepTargetMin: integer("sleep_target_min").notNull().default(480),
  focusTargetMin: integer("focus_target_min").notNull().default(240),
  /** "auto" derives it from sleep midpoints; otherwise "lark" | "intermediate" | "owl". */
  chronotype: text("chronotype").notNull().default("auto"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  locationName: text("location_name"),
  /** Google calendar that new time blocks are pushed to. */
  googleCalendarId: text("google_calendar_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const tags = pgTable("tags", {
  name: text("name").primaryKey(),
  color: text("color"),
  createdAt: createdAt(),
});

export const integrations = pgTable("integrations", {
  provider: text("provider").primaryKey(),
  accountEmail: text("account_email"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: ts("expires_at"),
  scope: text("scope"),
  updatedAt: updatedAt(),
});

// ─── Goals ──────────────────────────────────────────────────────────────────

export const goals = pgTable("goals", {
  id: id(),
  title: text("title").notNull(),
  why: text("why"),
  horizon: goalHorizon("horizon").notNull().default("quarter"),
  type: goalType("type").notNull().default("milestone"),
  targetValue: real("target_value"),
  currentValue: real("current_value").notNull().default(0),
  unit: text("unit"),
  priority: smallint("priority").notNull().default(2), // 1 (highest) – 4
  status: goalStatus("status").notNull().default("active"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  parentId: uuid("parent_id").references((): AnyPgColumn => goals.id, { onDelete: "set null" }),
  color: text("color"),
  tags: tagList(),
  sortOrder: integer("sort_order").notNull().default(0),
  completedAt: ts("completed_at"),
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
  doneAt: ts("done_at"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

// ─── Tasks ──────────────────────────────────────────────────────────────────

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    title: text("title").notNull(),
    notes: text("notes"),
    status: taskStatus("status").notNull().default("next"),
    priority: smallint("priority").notNull().default(3), // 1 (highest) – 4
    effortMin: integer("effort_min"),
    energy: energyLevel("energy"),
    dueDate: date("due_date"),
    /** Date on which this task is one of the day's top-3 most important tasks. */
    mitOn: date("mit_on"),
    goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
    parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => tasks.id, { onDelete: "cascade" }),
    tags: tagList(),
    sortOrder: integer("sort_order").notNull().default(0),
    completedAt: ts("completed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.status), index().on(t.mitOn), index().on(t.dueDate), index().on(t.goalId)],
);

// ─── Habits ─────────────────────────────────────────────────────────────────

export type HabitSchedule =
  | { kind: "daily" }
  | { kind: "weekdays"; days: number[] } // 0 = Sunday … 6 = Saturday
  | { kind: "per_week"; times: number };

export const habits = pgTable("habits", {
  id: id(),
  title: text("title").notNull(),
  type: habitType("type").notNull().default("boolean"),
  /** Daily target: 1 for yes/no, a count, or minutes for duration habits. */
  target: real("target").notNull().default(1),
  unit: text("unit"),
  schedule: jsonb("schedule").$type<HabitSchedule>().notNull().default({ kind: "daily" }),
  /** Implementation intention: "After X at Y, I will …". */
  cue: text("cue"),
  stackAfterHabitId: uuid("stack_after_habit_id").references((): AnyPgColumn => habits.id, {
    onDelete: "set null",
  }),
  goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  /** Fill the habit automatically from other data (focus minutes, tasks done). */
  autoSource: habitAutoSource("auto_source").notNull().default("none"),
  priority: smallint("priority").notNull().default(3),
  isNegative: boolean("is_negative").notNull().default(false),
  color: text("color"),
  tags: tagList(),
  sortOrder: integer("sort_order").notNull().default(0),
  archivedAt: ts("archived_at"),
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
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.habitId, t.date)],
);

// ─── Calendar ───────────────────────────────────────────────────────────────

export const calendars = pgTable("calendars", {
  /** Google calendar id. */
  id: text("id").primaryKey(),
  summary: text("summary").notNull(),
  color: text("color"),
  isPrimary: boolean("is_primary").notNull().default(false),
  canWrite: boolean("can_write").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  lastSyncedAt: ts("last_synced_at"),
});

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
    startAt: ts("start_at").notNull(),
    endAt: ts("end_at").notNull(),
    allDay: boolean("all_day").notNull().default(false),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    isTimeBlock: boolean("is_time_block").notNull().default(false),
    /** Keep this event local instead of pushing it to Google. */
    isPrivate: boolean("is_private").notNull().default(false),
    htmlLink: text("html_link"),
    etag: text("etag"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.startAt), uniqueIndex().on(t.calendarId, t.googleId)],
);

// ─── Time & focus ───────────────────────────────────────────────────────────

export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: id(),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    preset: focusPreset("preset").notNull().default("pomodoro"),
    plannedMin: integer("planned_min").notNull(),
    breakMin: integer("break_min").notNull().default(5),
    startedAt: ts("started_at").notNull().defaultNow(),
    endedAt: ts("ended_at"),
    pausedAt: ts("paused_at"),
    pausedSec: integer("paused_sec").notNull().default(0),
    actualMin: integer("actual_min"),
    quality: smallint("quality"), // 1–5
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.startedAt)],
);

export const timeEntries = pgTable(
  "time_entries",
  {
    id: id(),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    focusSessionId: uuid("focus_session_id").references(() => focusSessions.id, { onDelete: "cascade" }),
    startedAt: ts("started_at").notNull(),
    endedAt: ts("ended_at"),
    source: timeEntrySource("source").notNull().default("timer"),
    isDeepWork: boolean("is_deep_work").notNull().default(false),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.startedAt), index().on(t.taskId)],
);

// ─── Capture & notes ────────────────────────────────────────────────────────

export const braindumpItems = pgTable("braindump_items", {
  id: id(),
  text: text("text").notNull(),
  /** "capture" (brain dump) or "focus" (distraction logged during a session). */
  source: text("source").notNull().default("capture"),
  focusSessionId: uuid("focus_session_id").references(() => focusSessions.id, { onDelete: "set null" }),
  triagedAt: ts("triaged_at"),
  /** "task" | "note" | "goal" | "habit" | "deleted" */
  resultType: text("result_type"),
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
    pinned: boolean("pinned").notNull().default(false),
    tags: tagList(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex().on(t.dailyDate)],
);

// ─── Wellbeing ──────────────────────────────────────────────────────────────

export type MoodContext = { doing?: string[]; with?: string[]; where?: string[] };
export type WeatherSnapshot = { temperature: number; code: number; label: string; isDay: boolean };

export const moodEntries = pgTable(
  "mood_entries",
  {
    id: id(),
    at: ts("at").notNull().defaultNow(),
    energy: smallint("energy").notNull(), // -5 … 5
    pleasantness: smallint("pleasantness").notNull(), // -5 … 5
    quadrant: moodQuadrant("quadrant").notNull(),
    emotion: text("emotion").notNull(),
    note: text("note"),
    context: jsonb("context").$type<MoodContext>(),
    weather: jsonb("weather").$type<WeatherSnapshot>(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.at)],
);

export type SleepFactors = { caffeineLate?: boolean; alcohol?: boolean; screensLate?: boolean; exercise?: boolean; stress?: boolean };

export const sleepEntries = pgTable("sleep_entries", {
  id: id(),
  /** The date you woke up on. */
  date: date("date").notNull().unique(),
  bedAt: ts("bed_at").notNull(),
  wakeAt: ts("wake_at").notNull(),
  latencyMin: integer("latency_min"),
  awakenings: integer("awakenings"),
  quality: smallint("quality"), // 1–5
  factors: jsonb("factors").$type<SleepFactors>(),
  note: text("note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ─── AI ─────────────────────────────────────────────────────────────────────

export const aiSummaries = pgTable(
  "ai_summaries",
  {
    id: id(),
    date: date("date").notNull(),
    kind: aiSummaryKind("kind").notNull(),
    model: text("model").notNull(),
    output: jsonb("output").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.date, t.kind)],
);

// ─── Row types ──────────────────────────────────────────────────────────────

export type Profile = typeof profile.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Habit = typeof habits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
export type Calendar = typeof calendars.$inferSelect;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type FocusSession = typeof focusSessions.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type BraindumpItem = typeof braindumpItems.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type MoodEntry = typeof moodEntries.$inferSelect;
export type SleepEntry = typeof sleepEntries.$inferSelect;
export type AiSummary = typeof aiSummaries.$inferSelect;
