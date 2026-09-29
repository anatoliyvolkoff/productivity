CREATE TYPE "public"."ai_summary_kind" AS ENUM('morning', 'evening', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."calendar_source" AS ENUM('local', 'google');--> statement-breakpoint
CREATE TYPE "public"."energy_level" AS ENUM('low', 'high');--> statement-breakpoint
CREATE TYPE "public"."focus_preset" AS ENUM('pomodoro', 'd52', 'ultradian', 'custom');--> statement-breakpoint
CREATE TYPE "public"."goal_horizon" AS ENUM('vision', 'year', 'quarter', 'month');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'paused', 'done');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('milestone', 'numeric', 'habit');--> statement-breakpoint
CREATE TYPE "public"."habit_auto_source" AS ENUM('none', 'focus_minutes', 'tasks_done');--> statement-breakpoint
CREATE TYPE "public"."habit_type" AS ENUM('boolean', 'count', 'duration');--> statement-breakpoint
CREATE TYPE "public"."mood_quadrant" AS ENUM('red', 'yellow', 'blue', 'green');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('inbox', 'next', 'active', 'waiting', 'done', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."time_entry_source" AS ENUM('timer', 'focus', 'manual');--> statement-breakpoint
CREATE TABLE "ai_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"kind" "ai_summary_kind" NOT NULL,
	"model" text NOT NULL,
	"output" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "braindump_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"source" text DEFAULT 'capture' NOT NULL,
	"focus_session_id" uuid,
	"triaged_at" timestamp with time zone,
	"result_type" text,
	"result_id" uuid,
	"ai_suggestion" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "calendar_source" DEFAULT 'local' NOT NULL,
	"google_id" text,
	"calendar_id" text,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"task_id" uuid,
	"is_time_block" boolean DEFAULT false NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"html_link" text,
	"etag" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendars" (
	"id" text PRIMARY KEY NOT NULL,
	"summary" text NOT NULL,
	"color" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"can_write" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "focus_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"preset" "focus_preset" DEFAULT 'pomodoro' NOT NULL,
	"planned_min" integer NOT NULL,
	"break_min" integer DEFAULT 5 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"paused_sec" integer DEFAULT 0 NOT NULL,
	"actual_min" integer,
	"quality" smallint,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"why" text,
	"horizon" "goal_horizon" DEFAULT 'quarter' NOT NULL,
	"type" "goal_type" DEFAULT 'milestone' NOT NULL,
	"target_value" real,
	"current_value" real DEFAULT 0 NOT NULL,
	"unit" text,
	"priority" smallint DEFAULT 2 NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"start_date" date,
	"due_date" date,
	"parent_id" uuid,
	"color" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"date" date NOT NULL,
	"value" real DEFAULT 1 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" "habit_type" DEFAULT 'boolean' NOT NULL,
	"target" real DEFAULT 1 NOT NULL,
	"unit" text,
	"schedule" jsonb DEFAULT '{"kind":"daily"}'::jsonb NOT NULL,
	"cue" text,
	"stack_after_habit_id" uuid,
	"goal_id" uuid,
	"auto_source" "habit_auto_source" DEFAULT 'none' NOT NULL,
	"priority" smallint DEFAULT 3 NOT NULL,
	"is_negative" boolean DEFAULT false NOT NULL,
	"color" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"provider" text PRIMARY KEY NOT NULL,
	"account_email" text,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"scope" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"due_date" date,
	"done_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mood_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"energy" smallint NOT NULL,
	"pleasantness" smallint NOT NULL,
	"quadrant" "mood_quadrant" NOT NULL,
	"emotion" text NOT NULL,
	"note" text,
	"context" jsonb,
	"weather" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"content_md" text DEFAULT '' NOT NULL,
	"daily_date" date,
	"pinned" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"wake_target" text DEFAULT '07:00' NOT NULL,
	"sleep_target_min" integer DEFAULT 480 NOT NULL,
	"focus_target_min" integer DEFAULT 240 NOT NULL,
	"chronotype" text DEFAULT 'auto' NOT NULL,
	"latitude" real,
	"longitude" real,
	"location_name" text,
	"google_calendar_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleep_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"bed_at" timestamp with time zone NOT NULL,
	"wake_at" timestamp with time zone NOT NULL,
	"latency_min" integer,
	"awakenings" integer,
	"quality" smallint,
	"factors" jsonb,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sleep_entries_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"name" text PRIMARY KEY NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"status" "task_status" DEFAULT 'next' NOT NULL,
	"priority" smallint DEFAULT 3 NOT NULL,
	"effort_min" integer,
	"energy" "energy_level",
	"due_date" date,
	"mit_on" date,
	"goal_id" uuid,
	"parent_task_id" uuid,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"focus_session_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"source" time_entry_source DEFAULT 'timer' NOT NULL,
	"is_deep_work" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "braindump_items" ADD CONSTRAINT "braindump_items_focus_session_id_focus_sessions_id_fk" FOREIGN KEY ("focus_session_id") REFERENCES "public"."focus_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_parent_id_goals_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_stack_after_habit_id_habits_id_fk" FOREIGN KEY ("stack_after_habit_id") REFERENCES "public"."habits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_focus_session_id_focus_sessions_id_fk" FOREIGN KEY ("focus_session_id") REFERENCES "public"."focus_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_summaries_date_kind_index" ON "ai_summaries" USING btree ("date","kind");--> statement-breakpoint
CREATE INDEX "calendar_events_start_at_index" ON "calendar_events" USING btree ("start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_events_calendar_id_google_id_index" ON "calendar_events" USING btree ("calendar_id","google_id");--> statement-breakpoint
CREATE INDEX "focus_sessions_started_at_index" ON "focus_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "habit_logs_habit_id_date_index" ON "habit_logs" USING btree ("habit_id","date");--> statement-breakpoint
CREATE INDEX "mood_entries_at_index" ON "mood_entries" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "notes_daily_date_index" ON "notes" USING btree ("daily_date");--> statement-breakpoint
CREATE INDEX "tasks_status_index" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_mit_on_index" ON "tasks" USING btree ("mit_on");--> statement-breakpoint
CREATE INDEX "tasks_due_date_index" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "tasks_goal_id_index" ON "tasks" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "time_entries_started_at_index" ON "time_entries" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "time_entries_task_id_index" ON "time_entries" USING btree ("task_id");