CREATE TYPE "public"."ai_summary_kind" AS ENUM('morning', 'evening', 'weekly', 'triage');--> statement-breakpoint
CREATE TYPE "public"."calendar_source" AS ENUM('local', 'google');--> statement-breakpoint
CREATE TYPE "public"."energy_level" AS ENUM('low', 'high');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('task', 'habit', 'goal', 'note', 'time_entry', 'focus_session', 'mood_entry', 'calendar_event', 'braindump_item');--> statement-breakpoint
CREATE TYPE "public"."focus_preset" AS ENUM('pomodoro_25_5', 'd52_17', 'ultradian_90_20', 'custom');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('on_track', 'at_risk', 'off_track', 'done', 'paused');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('numeric', 'milestone', 'habit');--> statement-breakpoint
CREATE TYPE "public"."habit_type" AS ENUM('boolean', 'count', 'duration');--> statement-breakpoint
CREATE TYPE "public"."log_source" AS ENUM('manual', 'focus', 'timer', 'import', 'ai');--> statement-breakpoint
CREATE TYPE "public"."mood_quadrant" AS ENUM('red', 'yellow', 'blue', 'green');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('inbox', 'next', 'active', 'waiting', 'done', 'dropped');--> statement-breakpoint
CREATE TABLE "ai_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"kind" "ai_summary_kind" NOT NULL,
	"input_hash" text NOT NULL,
	"model" text NOT NULL,
	"output" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "braindump_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"triaged_at" timestamp with time zone,
	"result_type" "entity_type",
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
	"etag" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_sync_state" (
	"calendar_id" text PRIMARY KEY NOT NULL,
	"summary" text,
	"color" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"sync_token" text,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "daily_metrics" (
	"date" date PRIMARY KEY NOT NULL,
	"focus_min" integer DEFAULT 0 NOT NULL,
	"deep_ratio" real,
	"tasks_done" integer DEFAULT 0 NOT NULL,
	"mits_done" integer DEFAULT 0 NOT NULL,
	"habit_pct" real,
	"sleep_min" integer,
	"sleep_debt_min" integer,
	"sleep_regularity" real,
	"mood_valence_avg" real,
	"mood_energy_avg" real,
	"energy_curve" jsonb,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"layout" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"focus_session_id" uuid,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_tags" (
	"tag_id" uuid NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	CONSTRAINT "entity_tags_tag_id_entity_type_entity_id_pk" PRIMARY KEY("tag_id","entity_type","entity_id")
);
--> statement-breakpoint
CREATE TABLE "focus_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"preset" "focus_preset" DEFAULT 'pomodoro_25_5' NOT NULL,
	"planned_min" integer NOT NULL,
	"actual_min" integer,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"quality" smallint,
	"interruptions" integer DEFAULT 0 NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"why" text,
	"type" "goal_type" DEFAULT 'milestone' NOT NULL,
	"target_value" real,
	"current_value" real DEFAULT 0,
	"unit" text,
	"priority" smallint DEFAULT 2 NOT NULL,
	"status" "goal_status" DEFAULT 'on_track' NOT NULL,
	"start_date" date,
	"due_date" date,
	"parent_id" uuid,
	"review_cadence" text DEFAULT 'weekly',
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"date" date NOT NULL,
	"value" real DEFAULT 1 NOT NULL,
	"source" "log_source" DEFAULT 'manual' NOT NULL,
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
	"priority" smallint DEFAULT 3 NOT NULL,
	"is_negative" boolean DEFAULT false NOT NULL,
	"color" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_type" "entity_type" NOT NULL,
	"from_id" uuid NOT NULL,
	"to_type" "entity_type" NOT NULL,
	"to_id" uuid NOT NULL,
	"kind" text DEFAULT 'related' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"due_date" date,
	"done_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL
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
	"weather_snapshot" jsonb,
	"strategy_used" text
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"content_md" text DEFAULT '' NOT NULL,
	"daily_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT 'Me' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"chronotype" text DEFAULT 'intermediate',
	"wake_target" text DEFAULT '07:00',
	"sleep_target_min" integer DEFAULT 480,
	"focus_target_min" integer DEFAULT 240,
	"latitude" real,
	"longitude" real,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleep_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"bed_at" timestamp with time zone NOT NULL,
	"sleep_at" timestamp with time zone,
	"wake_at" timestamp with time zone NOT NULL,
	"out_of_bed_at" timestamp with time zone,
	"latency_min" integer,
	"awakenings" integer,
	"quality" smallint,
	"factors" jsonb,
	"note" text,
	"source" "log_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sleep_entries_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"status" "task_status" DEFAULT 'inbox' NOT NULL,
	"priority" smallint DEFAULT 3 NOT NULL,
	"urgent" boolean DEFAULT false NOT NULL,
	"important" boolean DEFAULT false NOT NULL,
	"effort_min" integer,
	"energy" "energy_level",
	"due_at" timestamp with time zone,
	"mit_on" date,
	"goal_id" uuid,
	"parent_task_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"goal_id" uuid,
	"focus_session_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"source" "log_source" DEFAULT 'timer' NOT NULL,
	"is_deep_work" boolean DEFAULT false NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "weather_cache" (
	"date" date NOT NULL,
	"hour" smallint NOT NULL,
	"data" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weather_cache_date_hour_pk" PRIMARY KEY("date","hour")
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distractions" ADD CONSTRAINT "distractions_focus_session_id_focus_sessions_id_fk" FOREIGN KEY ("focus_session_id") REFERENCES "public"."focus_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_parent_id_goals_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_stack_after_habit_id_habits_id_fk" FOREIGN KEY ("stack_after_habit_id") REFERENCES "public"."habits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_parent_id_tags_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_focus_session_id_focus_sessions_id_fk" FOREIGN KEY ("focus_session_id") REFERENCES "public"."focus_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_summaries_date_kind_index" ON "ai_summaries" USING btree ("date","kind");--> statement-breakpoint
CREATE INDEX "calendar_events_start_at_index" ON "calendar_events" USING btree ("start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_events_calendar_id_google_id_index" ON "calendar_events" USING btree ("calendar_id","google_id");--> statement-breakpoint
CREATE INDEX "entity_tags_entity_type_entity_id_index" ON "entity_tags" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "focus_sessions_started_at_index" ON "focus_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "habit_logs_habit_id_date_source_index" ON "habit_logs" USING btree ("habit_id","date","source");--> statement-breakpoint
CREATE INDEX "links_from_type_from_id_index" ON "links" USING btree ("from_type","from_id");--> statement-breakpoint
CREATE INDEX "links_to_type_to_id_index" ON "links" USING btree ("to_type","to_id");--> statement-breakpoint
CREATE INDEX "mood_entries_at_index" ON "mood_entries" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "notes_daily_date_index" ON "notes" USING btree ("daily_date");--> statement-breakpoint
CREATE INDEX "tasks_status_index" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_mit_on_index" ON "tasks" USING btree ("mit_on");--> statement-breakpoint
CREATE INDEX "tasks_goal_id_index" ON "tasks" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "time_entries_started_at_index" ON "time_entries" USING btree ("started_at");