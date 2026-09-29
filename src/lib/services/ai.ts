import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { aiSummaries, type AiSummary } from "@/lib/db/schema";
import { addDaysISO, formatMinutes, minutesToHHMM, todayISO, toISODate, type ISODate } from "@/lib/domain/dates";
import { energyLabel } from "@/lib/domain/energy";
import { listInbox, saveSuggestions } from "./braindump";
import { getDayContext, type DayContext } from "./day";
import { getDailyNote } from "./notes";
import { getInsights } from "./insights";
import { listTasks } from "./tasks";

/**
 * Claude-powered summaries. Each call sends a compact JSON snapshot of the
 * relevant data and gets back structured JSON (validated with Zod).
 * Model and effort are configurable with AI_MODEL / AI_EFFORT.
 */

export const AI_MODEL = process.env.AI_MODEL?.trim() || "claude-opus-5-5";
const EFFORT = (process.env.AI_EFFORT?.trim() || "medium") as "low" | "medium" | "high" | "xhigh" | "max";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_AUTH_TOKEN?.trim());
}

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

// ─── Schemas ────────────────────────────────────────────────────────────────

export const MorningBrief = z.object({
  headline: z.string().describe("One short sentence that frames the day."),
  important: z
    .array(
      z.object({
        title: z.string(),
        why: z.string().describe("Why this matters today, grounded in the data (goal, deadline, priority)."),
        taskId: z.string().nullable().describe("The task id from the data, or null for something not yet a task."),
      }),
    )
    .describe("At most three things that would make today a win, most important first."),
  notImportant: z
    .array(
      z.object({
        title: z.string(),
        suggestion: z.enum(["defer", "drop", "delegate", "batch"]),
        why: z.string(),
      }),
    )
    .describe("Things competing for attention that can safely wait or go. Be explicit."),
  schedule: z.string().describe("How to shape the day: best deep-work window, meetings, breaks. Use clock times."),
  energy: z.string().describe("Readiness from sleep, sleep debt and recent mood, and the intensity that fits today."),
  habits: z.string().describe("Which habits to protect today, especially any at risk of a second miss."),
  watchOut: z.string().nullable().describe("One risk for today, or null."),
  encouragement: z.string().describe("One short, specific, honest line."),
});

export const EveningSummary = z.object({
  headline: z.string(),
  wins: z.array(z.string()).describe("Concrete things that got done, including small ones."),
  unfinished: z
    .array(z.object({ title: z.string(), suggestion: z.enum(["carry_over", "reschedule", "drop"]), why: z.string() }))
    .describe("Open top tasks and what to do with each."),
  time: z.string().describe("Planned vs actual: focus, tracked time, meetings."),
  moodArc: z.string().describe("How the day felt, from the mood check-ins. Say so if there were none."),
  habits: z.string(),
  tomorrow: z.array(z.string()).describe("Up to three candidates for tomorrow's top tasks."),
  reflectionQuestion: z.string().describe("One question to reflect on tonight."),
});

export const WeeklyReview = z.object({
  headline: z.string(),
  highlights: z.array(z.string()),
  patterns: z.array(z.string()).describe("Trends and links visible in the data (sleep, mood, focus, habits). Correlation, not causation."),
  goalsAtRisk: z.array(z.object({ title: z.string(), advice: z.string() })),
  adjustments: z.array(z.string()).describe("Two to four concrete changes for next week."),
  sleepAndEnergy: z.string(),
});

const TriageResult = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["task", "note", "goal", "habit", "deleted"]),
      title: z.string().describe("Cleaned-up wording. For tasks keep any date words like 'tomorrow' or 'fri'."),
      priority: z.number().int().nullable().describe("1 (highest) to 4, tasks only; null otherwise."),
      tags: z.array(z.string()).describe("Zero to two short lowercase tags, reusing existing tags when they fit."),
      reason: z.string().describe("A few words on why."),
    }),
  ),
});

export type MorningBriefT = z.infer<typeof MorningBrief>;
export type EveningSummaryT = z.infer<typeof EveningSummary>;
export type WeeklyReviewT = z.infer<typeof WeeklyReview>;

// ─── Calls ──────────────────────────────────────────────────────────────────

const SHARED_RULES = `You are the planning assistant inside a personal productivity app used by one person.
Ground every statement in the JSON data you are given; never invent tasks, events or numbers.
Use findings from neuroscience and behavioral science where they genuinely help (circadian energy peaks and the post-lunch dip, ultradian ~90-minute focus cycles, limited working memory, the cost of task switching, sleep's effect on attention and mood, "never miss twice" for habits). Don't lecture and never make medical claims.
Write plainly and briefly, like a sharp, kind coach. Use the person's name if one is given. Times are local, 24-hour.`;

async function generate<T>(schema: z.ZodType<T>, system: string, data: unknown): Promise<T> {
  if (!aiConfigured()) throw new Error("Add ANTHROPIC_API_KEY to .env.local to use AI summaries.");
  try {
    const response = await anthropic().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: EFFORT, format: betaZodOutputFormat(schema) },
      system: `${SHARED_RULES}\n\n${system}`,
      messages: [{ role: "user", content: `Here is the data as JSON:\n\n${JSON.stringify(data)}` }],
    });
    if (response.stop_reason === "refusal") throw new Error("The AI declined this request.");
    if (response.stop_reason === "max_tokens") throw new Error("The AI response was cut off — try again.");
    if (!response.parsed_output) throw new Error("The AI returned something unexpected — try again.");
    return response.parsed_output as T;
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new Error("ANTHROPIC_API_KEY was rejected — check the key in .env.local.");
    if (error instanceof Anthropic.RateLimitError) throw new Error("The AI is rate-limited right now — try again in a minute.");
    if (error instanceof Anthropic.APIConnectionError) throw new Error("Couldn't reach the AI service — check your internet connection.");
    if (error instanceof Anthropic.APIError) throw new Error(`AI request failed (${error.status}).`);
    throw error;
  }
}

async function store(date: ISODate, kind: AiSummary["kind"], output: Record<string, unknown>): Promise<AiSummary> {
  const db = await getDb();
  const [row] = await db.insert(aiSummaries).values({ date, kind, model: AI_MODEL, output }).returning();
  return row;
}

export async function latestSummary(date: ISODate, kind: AiSummary["kind"]): Promise<AiSummary | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(aiSummaries)
    .where(and(eq(aiSummaries.date, date), eq(aiSummaries.kind, kind)))
    .orderBy(desc(aiSummaries.createdAt))
    .limit(1);
  return row ?? null;
}

export async function generateMorningBrief(date = todayISO()): Promise<AiSummary> {
  const ctx = await getDayContext(date);
  const [open, yesterdayNote] = await Promise.all([listTasks({ view: "open", limit: 60 }), getDailyNote(addDaysISO(date, -1))]);
  const data = {
    ...snapshot(ctx),
    openTasks: open.slice(0, 40).map(taskJson),
    yesterdayNote: yesterdayNote?.contentMd || null,
  };
  const output = await generate(
    MorningBrief,
    `Write the morning brief. Decide what matters today (at most three items — prefer existing top tasks and use their ids) and, just as importantly, what does not. Place deep work in the highest-energy free window from the energy curve and around calendar events. If sleep was short or sleep debt is high, lower the day's intensity.`,
    data,
  );
  return store(date, "morning", output);
}

export async function generateEveningSummary(date = todayISO()): Promise<AiSummary> {
  const ctx = await getDayContext(date);
  const done = (await listTasks({ view: "done", limit: 80 })).filter((t) => t.completedAt && toISODate(t.completedAt) === date);
  const output = await generate(
    EveningSummary,
    `Write the evening shutdown summary for this day. Celebrate real progress, be honest about what slipped without judgment, and suggest what to do with each unfinished top task.`,
    { ...snapshot(ctx), completedToday: done.map(taskJson) },
  );
  return store(date, "evening", output);
}

export async function generateWeeklyReview(date = todayISO()): Promise<AiSummary> {
  const insights = await getInsights(7, date);
  const ctx = await getDayContext(date);
  const output = await generate(
    WeeklyReview,
    `Write a weekly review from the last seven days of data, compared with the previous weeks. Look for patterns across sleep, mood, focus and habits, flag goals that are behind pace, and suggest a few concrete adjustments.`,
    {
      name: ctx.profile.name || null,
      week: insights,
      goals: ctx.goals.map(goalJson),
      habits: ctx.habits.map(habitJson),
    },
  );
  return store(date, "weekly", output);
}

/** AI suggestions for each brain-dump inbox item (stored on the items). */
export async function suggestTriageForInbox(): Promise<number> {
  const inbox = await listInbox();
  if (inbox.length === 0) return 0;
  const [open, ctx] = await Promise.all([listTasks({ view: "open", limit: 40 }), getDayContext()]);
  const existingTags = [...new Set(open.flatMap((t) => t.tags))];
  const result = await generate(
    TriageResult,
    `Sort each brain-dump line into a task (something to do), note (information or an idea to keep), goal (a larger outcome), habit (something to repeat) or deleted (a worry or thought that needs no action — only when clearly so). Return every item exactly once with its id.`,
    {
      today: todayISO(),
      items: inbox.map((i) => ({ id: i.id, text: i.text })),
      existingTags,
      goals: ctx.goals.map((g) => g.title),
    },
  );
  const ids = new Set(inbox.map((i) => i.id));
  const suggestions = result.items
    .filter((s) => ids.has(s.id))
    .map((s) => ({ id: s.id, suggestion: { type: s.type, title: s.title, priority: s.priority ?? undefined, tags: s.tags, reason: s.reason } }));
  await saveSuggestions(suggestions);
  return suggestions.length;
}

// ─── Snapshot helpers ───────────────────────────────────────────────────────

function snapshot(ctx: DayContext) {
  const hhmm = (d: Date) => minutesToHHMM(d.getHours() * 60 + d.getMinutes());
  const peak = ctx.energy.bestWindow;
  return {
    name: ctx.profile.name || null,
    date: ctx.date,
    weekday: new Date(`${ctx.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" }),
    now: ctx.isToday ? hhmm(new Date()) : null,
    targets: {
      wake: ctx.profile.wakeTarget,
      sleepHours: ctx.profile.sleepTargetMin / 60,
      focusHours: ctx.profile.focusTargetMin / 60,
    },
    topTasks: ctx.mits.map(taskJson),
    otherTasksToday: ctx.otherTasks.map(taskJson),
    calendar: ctx.events.map((e) => ({
      title: e.title,
      start: e.allDay ? "all day" : hhmm(e.startAt),
      end: e.allDay ? null : hhmm(e.endAt),
      timeBlockForTask: e.taskTitle,
    })),
    focus: {
      minutes: ctx.focusMin,
      sessions: ctx.sessions.map((s) => ({ task: s.taskTitle, minutes: s.actualMin, quality: s.quality, distractions: s.distractions })),
      trackedMinutes: ctx.trackedMin,
      deepWorkMinutes: ctx.deepMin,
    },
    habits: ctx.habits.map(habitJson),
    mood: ctx.mood.map((m) => ({ time: hhmm(m.at), emotion: m.emotion, energy: m.energy, pleasantness: m.pleasantness, note: m.note, context: m.context })),
    sleep: {
      lastNight: ctx.sleep.lastNight
        ? {
            asleep: formatMinutes(ctx.sleep.lastNight.asleepMin),
            bed: hhmm(ctx.sleep.lastNight.bedAt),
            wake: hhmm(ctx.sleep.lastNight.wakeAt),
            quality: ctx.sleep.lastNight.quality,
            factors: ctx.sleep.lastNight.factors,
          }
        : null,
      avg7Hours: ctx.sleep.avg7 ? Math.round((ctx.sleep.avg7 / 60) * 10) / 10 : null,
      debt14: formatMinutes(ctx.sleep.debt14),
      regularityIndex: ctx.sleep.regularity,
      chronotype: ctx.energy.chronotype,
    },
    energy: {
      model: "estimate from wake time, sleep and chronotype",
      now: ctx.energy.now === null ? null : { value: Math.round(ctx.energy.now * 100) / 100, label: energyLabel(ctx.energy.now) },
      curve: ctx.energy.curve.filter((_, i) => i % 4 === 0).map((p) => `${minutesToHHMM(p.minute)} ${Math.round(p.value * 100)}`),
      bestFreeDeepWorkWindow: peak ? `${minutesToHHMM(peak.start)}–${minutesToHHMM(peak.end)}` : null,
    },
    goals: ctx.goals.map(goalJson),
  };
}

function taskJson(t: DayContext["mits"][number]) {
  return {
    id: t.id,
    title: t.title,
    priority: t.priority,
    due: t.dueDate,
    status: t.status,
    goal: t.goalTitle,
    effortMin: t.effortMin,
    energy: t.energy,
    tags: t.tags,
    trackedMin: t.trackedMin,
    notes: t.notes,
  };
}

function habitJson(h: DayContext["habits"][number]) {
  return {
    title: h.title,
    cue: h.cue,
    scheduledToday: h.scheduledToday,
    doneToday: h.doneToday,
    streak: `${h.streak.current} ${h.streak.unit}s`,
    missedLastTime: h.streak.missedLast,
    adherence30: h.adherence30 === null ? null : Math.round(h.adherence30 * 100),
  };
}

function goalJson(g: DayContext["goals"][number]) {
  return {
    title: g.title,
    why: g.why,
    progressPct: Math.round(g.progress * 100),
    expectedPct: g.expected === null ? null : Math.round(g.expected * 100),
    health: g.health,
    due: g.dueDate,
    priority: g.priority,
  };
}
