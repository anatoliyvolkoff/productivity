import { addDaysISO, dayOfWeek, type ISODate } from "./dates";

export type SleepLike = {
  date: ISODate; // wake date
  bedAt: Date;
  wakeAt: Date;
  latencyMin: number | null;
};

const MIN = 60_000;

/** Estimated minutes asleep: time in bed minus the time it took to fall asleep. */
export function asleepMinutes(s: SleepLike): number {
  return Math.max(0, (s.wakeAt.getTime() - s.bedAt.getTime()) / MIN - (s.latencyMin ?? 0));
}

/** Mid-sleep as minutes relative to midnight of the wake date (e.g. 03:30 → 210, 23:30 → -30). */
export function midSleepMinutes(s: SleepLike): number {
  const onset = s.bedAt.getTime() + (s.latencyMin ?? 0) * MIN;
  const mid = new Date((onset + s.wakeAt.getTime()) / 2);
  const wakeMidnight = new Date(s.wakeAt);
  wakeMidnight.setHours(0, 0, 0, 0);
  return (mid.getTime() - wakeMidnight.getTime()) / MIN;
}

/** Rolling sleep debt (minutes) over the given entries: total shortfall vs target, never below 0. */
export function sleepDebt(entries: SleepLike[], targetMin: number): number {
  const balance = entries.reduce((sum, s) => sum + (targetMin - asleepMinutes(s)), 0);
  return Math.max(0, Math.round(balance));
}

/**
 * Sleep Regularity Index (approximation from bed/wake times): the probability
 * of being in the same state (asleep/awake) at the same clock time on consecutive
 * days, scaled to −100…100. Higher = more regular. Needs consecutive days.
 */
export function sleepRegularityIndex(entries: SleepLike[]): number | null {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const window = 1440;
  const probabilities: number[] = [];

  for (const e of entries) {
    const next = byDate.get(addDaysISO(e.date, 1));
    if (!next) continue;
    const a = sleepInterval(e);
    const b = sleepInterval(next);
    const overlap = Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));
    const mismatch = a[1] - a[0] + (b[1] - b[0]) - 2 * overlap;
    probabilities.push(1 - Math.min(window, mismatch) / window);
  }
  if (probabilities.length === 0) return null;
  const mean = probabilities.reduce((s, p) => s + p, 0) / probabilities.length;
  return Math.round(200 * mean - 100);
}

/** Sleep interval in minutes from noon of the day before the wake date (clamped to 0–1440). */
function sleepInterval(s: SleepLike): [number, number] {
  const noon = new Date(s.wakeAt);
  noon.setHours(12, 0, 0, 0);
  noon.setDate(noon.getDate() - 1);
  const clamp = (v: number) => Math.max(0, Math.min(1440, v));
  const onset = s.bedAt.getTime() + (s.latencyMin ?? 0) * MIN;
  return [clamp((onset - noon.getTime()) / MIN), clamp((s.wakeAt.getTime() - noon.getTime()) / MIN)];
}

const isFreeDay = (date: ISODate) => [0, 6].includes(dayOfWeek(date));

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/** Difference (minutes) between mid-sleep on free days (Sat/Sun wake-ups) and workdays. */
export function socialJetLag(entries: SleepLike[]): number | null {
  const free = mean(entries.filter((e) => isFreeDay(e.date)).map(midSleepMinutes));
  const work = mean(entries.filter((e) => !isFreeDay(e.date)).map(midSleepMinutes));
  if (free === null || work === null) return null;
  return Math.round(Math.abs(free - work));
}

export type Chronotype = "lark" | "intermediate" | "owl";

/**
 * Chronotype from mid-sleep on free days (MCTQ-style): before 03:00 → lark,
 * after 05:00 → owl. Falls back to all days when there are no free days yet.
 */
export function estimateChronotype(entries: SleepLike[]): Chronotype | null {
  if (entries.length < 3) return null;
  const free = entries.filter((e) => isFreeDay(e.date));
  const msf = mean((free.length >= 2 ? free : entries).map(midSleepMinutes));
  if (msf === null) return null;
  if (msf < 180) return "lark";
  if (msf > 300) return "owl";
  return "intermediate";
}

export const SLEEP_FACTORS = [
  { key: "caffeineLate", label: "Late caffeine" },
  { key: "alcohol", label: "Alcohol" },
  { key: "screensLate", label: "Screens before bed" },
  { key: "exercise", label: "Exercise" },
  { key: "stress", label: "Stressful day" },
] as const;

export type FactorKey = (typeof SLEEP_FACTORS)[number]["key"];

export type FactorEffect = { key: FactorKey; label: string; withN: number; withoutN: number; minutesDiff: number; qualityDiff: number | null };

/**
 * Your nights with a factor vs without it: difference in minutes asleep and in
 * quality. Needs at least 3 nights on each side. Observational — not causal.
 */
export function factorEffects(entries: Array<SleepLike & { quality: number | null; factors: Partial<Record<FactorKey, boolean>> | null }>): FactorEffect[] {
  const out: FactorEffect[] = [];
  for (const f of SLEEP_FACTORS) {
    const yes = entries.filter((e) => e.factors?.[f.key]);
    const no = entries.filter((e) => !e.factors?.[f.key]);
    if (yes.length < 3 || no.length < 3) continue;
    const avg = (list: typeof entries, fn: (e: (typeof entries)[number]) => number | null) => {
      const values = list.map(fn).filter((v): v is number => v !== null);
      return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
    };
    const qYes = avg(yes, (e) => e.quality);
    const qNo = avg(no, (e) => e.quality);
    out.push({
      key: f.key,
      label: f.label,
      withN: yes.length,
      withoutN: no.length,
      minutesDiff: Math.round(avg(yes, asleepMinutes)! - avg(no, asleepMinutes)!),
      qualityDiff: qYes !== null && qNo !== null ? Math.round((qYes - qNo) * 10) / 10 : null,
    });
  }
  return out.sort((a, b) => Math.abs(b.minutesDiff) - Math.abs(a.minutesDiff));
}
