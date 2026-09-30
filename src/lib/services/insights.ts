import "server-only";
import { and, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { addDaysISO, rangeISO, toISODate, todayISO, type ISODate } from "@/lib/domain/dates";
import { isDone, isScheduledOn } from "@/lib/domain/habits";
import { asleepMinutes } from "@/lib/domain/sleep";
import { correlationStrength, mean, MIN_CORRELATION_SAMPLES, spearman, type CorrelationStrength } from "@/lib/domain/stats";
import { entriesBetween, sessionsBetween } from "./focus";
import { listHabits } from "./habits";
import { moodBetween, moodPerDay } from "./mood";
import { sleepBetween } from "./sleep";
import { listTasks, tasksDonePerDay } from "./tasks";

/** One day of metrics; null means "no data" (e.g. before you started tracking). */
export type DayMetrics = {
  date: ISODate;
  focusMin: number | null;
  focusQuality: number | null;
  trackedMin: number | null;
  deepMin: number | null;
  tasksDone: number | null;
  mitsSet: number;
  mitsDone: number | null;
  habitPct: number | null;
  sleepMin: number | null;
  sleepQuality: number | null;
  moodValence: number | null;
  moodEnergy: number | null;
};

export type MetricKey = Exclude<keyof DayMetrics, "date" | "mitsSet">;

export const METRICS: Record<MetricKey, { label: string; unit: string; higherIsBetter: boolean }> = {
  focusMin: { label: "Focus", unit: "min", higherIsBetter: true },
  focusQuality: { label: "Focus quality", unit: "/5", higherIsBetter: true },
  trackedMin: { label: "Tracked time", unit: "min", higherIsBetter: true },
  deepMin: { label: "Deep work", unit: "min", higherIsBetter: true },
  tasksDone: { label: "Tasks done", unit: "", higherIsBetter: true },
  mitsDone: { label: "Top tasks done", unit: "", higherIsBetter: true },
  habitPct: { label: "Habit adherence", unit: "%", higherIsBetter: true },
  sleepMin: { label: "Sleep", unit: "min", higherIsBetter: true },
  sleepQuality: { label: "Sleep quality", unit: "/5", higherIsBetter: true },
  moodValence: { label: "Mood (pleasantness)", unit: "", higherIsBetter: true },
  moodEnergy: { label: "Mood (energy)", unit: "", higherIsBetter: true },
};

export type Kpi = {
  key: MetricKey;
  label: string;
  unit: string;
  current: number | null;
  baseline: number | null;
  higherIsBetter: boolean;
  spark: Array<number | null>;
};

export type Correlation = { x: MetricKey; y: MetricKey; rho: number; n: number; strength: CorrelationStrength };

const CORRELATION_PAIRS: Array<[MetricKey, MetricKey]> = [
  ["sleepMin", "moodValence"],
  ["sleepMin", "moodEnergy"],
  ["sleepMin", "focusMin"],
  ["sleepMin", "focusQuality"],
  ["sleepQuality", "moodValence"],
  ["habitPct", "moodValence"],
  ["focusMin", "moodValence"],
  ["tasksDone", "moodValence"],
  ["habitPct", "focusMin"],
  ["deepMin", "moodEnergy"],
];

/** Per-day metrics for the last `days` days, compared with the 28 days before. */
export async function getInsights(days: number, today: ISODate = todayISO()) {
  const from = addDaysISO(today, -(days - 1));
  const baselineFrom = addDaysISO(from, -28);
  const series = await dailyMetrics(baselineFrom, today);
  const current = series.filter((d) => d.date >= from);
  const baseline = series.filter((d) => d.date < from);

  const avg = (list: DayMetrics[], key: MetricKey, minDays = 1) => {
    const values = list.map((d) => d[key]).filter((v): v is number => v !== null);
    return values.length >= minDays ? mean(values) : null;
  };

  const kpiKeys: MetricKey[] = ["focusMin", "deepMin", "tasksDone", "habitPct", "sleepMin", "moodValence"];
  const kpis: Kpi[] = kpiKeys.map((key) => ({
    key,
    ...METRICS[key],
    current: avg(current, key),
    // A comparison needs at least five days of earlier data.
    baseline: avg(baseline, key, 5),
    spark: current.map((d) => d[key]),
  }));

  const correlations: Correlation[] = [];
  for (const [x, y] of CORRELATION_PAIRS) {
    const pairs = series.filter((d) => d[x] !== null && d[y] !== null);
    if (pairs.length < MIN_CORRELATION_SAMPLES) continue;
    const rho = spearman(pairs.map((d) => d[x] as number), pairs.map((d) => d[y] as number));
    if (rho === null) continue;
    correlations.push({ x, y, rho: Math.round(rho * 100) / 100, n: pairs.length, strength: correlationStrength(rho) });
  }
  correlations.sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));

  const [byTag, emotions] = await Promise.all([timeByTag(from, today), moodSummary(from, today)]);
  const mitsSet = current.reduce((s, d) => s + d.mitsSet, 0);

  return {
    range: { from, to: today, days },
    series,
    current,
    kpis,
    correlations,
    timeByTag: byTag,
    mood: emotions,
    mitHitRate: mitsSet ? current.reduce((s, d) => s + (d.mitsDone ?? 0), 0) / mitsSet : null,
    records: {
      bestFocusDay: maxBy(series, "focusMin"),
      mostTasksDay: maxBy(series, "tasksDone"),
    },
  };
}

export type Insights = Awaited<ReturnType<typeof getInsights>>;

function maxBy(series: DayMetrics[], key: "focusMin" | "tasksDone") {
  let best: { date: ISODate; value: number } | null = null;
  for (const d of series) {
    const v = d[key];
    if (v !== null && v > (best?.value ?? 0)) best = { date: d.date, value: v };
  }
  return best;
}

export async function dailyMetrics(from: ISODate, to: ISODate): Promise<DayMetrics[]> {
  const db = await getDb();
  const span = rangeISO(from, to);
  const [sessions, entries, done, habits, sleep, moods, mitRows] = await Promise.all([
    sessionsBetween(from, to),
    entriesBetween(from, to),
    tasksDonePerDay(from, to),
    listHabits({ today: to, days: span.length + 1 }),
    sleepBetween(from, to),
    moodBetween(from, to),
    db
      .select({ mitOn: tasks.mitOn, status: tasks.status })
      .from(tasks)
      .where(and(gte(tasks.mitOn, from), lte(tasks.mitOn, to))),
  ]);

  const mood = moodPerDay(moods);
  const sleepByDate = new Map(sleep.map((s) => [s.date, s]));

  // Days before anything was recorded are "no data", not zeros.
  const activeDates = [
    ...sessions.map((s) => toISODate(s.startedAt)),
    ...entries.map((e) => toISODate(e.startedAt)),
    ...done.keys(),
    ...sleep.map((s) => s.date),
    ...moods.map((m) => toISODate(m.at)),
    ...habits.flatMap((h) => Object.keys(h.values)),
  ].sort();
  const firstDay = activeDates[0] ?? to;

  return span.map((date) => {
    if (date < firstDay) {
      return { date, focusMin: null, focusQuality: null, trackedMin: null, deepMin: null, tasksDone: null, mitsSet: 0, mitsDone: null, habitPct: null, sleepMin: null, sleepQuality: null, moodValence: null, moodEnergy: null };
    }
    const daySessions = sessions.filter((s) => toISODate(s.startedAt) === date);
    const qualities = daySessions.map((s) => s.quality).filter((q): q is number => q !== null);
    const dayEntries = entries.filter((e) => toISODate(e.startedAt) === date);
    const dayMits = mitRows.filter((m) => m.mitOn === date);

    let scheduled = 0;
    let completed = 0;
    for (const h of habits) {
      if (h.schedule.kind === "per_week" || date < h.startDate || !isScheduledOn(h.schedule, date)) continue;
      scheduled++;
      if (isDone(h, h.values[date])) completed++;
    }

    const s = sleepByDate.get(date);
    const m = mood.get(date);
    return {
      date,
      focusMin: daySessions.reduce((sum, x) => sum + (x.actualMin ?? 0), 0),
      focusQuality: qualities.length ? mean(qualities) : null,
      trackedMin: dayEntries.reduce((sum, e) => sum + e.minutes, 0),
      deepMin: dayEntries.filter((e) => e.isDeepWork).reduce((sum, e) => sum + e.minutes, 0),
      tasksDone: done.get(date) ?? 0,
      mitsSet: dayMits.length,
      mitsDone: dayMits.filter((x) => x.status === "done").length,
      habitPct: scheduled ? Math.round((completed / scheduled) * 100) : null,
      sleepMin: s ? Math.round(asleepMinutes(s)) : null,
      sleepQuality: s?.quality ?? null,
      moodValence: m ? Math.round(m.valence * 10) / 10 : null,
      moodEnergy: m ? Math.round(m.energy * 10) / 10 : null,
    };
  });
}

/** Tracked minutes per tag (entries without a tagged task count as "untagged"). */
async function timeByTag(from: ISODate, to: ISODate): Promise<Array<{ tag: string; minutes: number }>> {
  const entries = await entriesBetween(from, to);
  const taskIds = [...new Set(entries.map((e) => e.taskId).filter((id): id is string => id !== null))];
  const taskTags = new Map((await listTasks({ ids: taskIds })).map((t) => [t.id, t.tags]));
  const totals = new Map<string, number>();
  for (const e of entries) {
    const tags = (e.taskId && taskTags.get(e.taskId)) || [];
    for (const tag of tags.length ? tags : ["untagged"]) totals.set(tag, (totals.get(tag) ?? 0) + e.minutes);
  }
  return [...totals].map(([tag, minutes]) => ({ tag, minutes })).sort((a, b) => b.minutes - a.minutes);
}

async function moodSummary(from: ISODate, to: ISODate) {
  const entries = await moodBetween(from, to);
  const quadrants = { red: 0, yellow: 0, blue: 0, green: 0 };
  const words = new Map<string, number>();
  for (const e of entries) {
    quadrants[e.quadrant]++;
    words.set(e.emotion, (words.get(e.emotion) ?? 0) + 1);
  }
  return {
    count: entries.length,
    quadrants,
    topEmotions: [...words].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([word, count]) => ({ word, count })),
    points: entries.map((e) => ({ energy: e.energy, pleasantness: e.pleasantness, quadrant: e.quadrant, at: e.at })),
  };
}
