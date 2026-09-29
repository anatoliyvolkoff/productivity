import type { Chronotype } from "./sleep";

export type EnergyPoint = { minute: number; value: number };

export type EnergyInput = {
  /** Wake time, minutes after midnight. */
  wakeMinute: number;
  /** Planned bedtime, minutes after midnight (may be past 1440). */
  bedMinute: number;
  chronotype?: Chronotype | null;
  /** Rolling sleep debt in minutes. */
  sleepDebtMin?: number;
  /** Last night's sleep in minutes, if logged. */
  lastSleepMin?: number | null;
  sleepTargetMin?: number;
};

const gauss = (x: number, mu: number, sigma: number) => Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/**
 * Estimated alertness (0–1) across the waking day. A simple model of the
 * well-established pattern: sleep inertia after waking, a late-morning peak,
 * the post-lunch dip, a second wind in the late afternoon, and decline toward
 * bedtime — shifted by chronotype and dampened by sleep debt.
 * It is an estimate, not a measurement.
 */
export function energyCurve(input: EnergyInput, stepMin = 15): EnergyPoint[] {
  const shift = input.chronotype === "owl" ? 1 : input.chronotype === "lark" ? -0.5 : 0;
  const dayLength = (input.bedMinute - input.wakeMinute) / 60;

  const target = input.sleepTargetMin ?? 480;
  const debtPenalty = Math.min(0.25, (input.sleepDebtMin ?? 0) / 1200);
  const lastNightPenalty =
    input.lastSleepMin != null ? Math.min(0.2, Math.max(0, target - input.lastSleepMin) / 600) : 0;
  const scale = 1 - debtPenalty - lastNightPenalty;

  const points: EnergyPoint[] = [];
  for (let m = input.wakeMinute; m <= input.bedMinute; m += stepMin) {
    const h = (m - input.wakeMinute) / 60; // hours awake
    let v =
      0.55 +
      0.33 * gauss(h, 3 + shift, 1.8) -
      0.17 * gauss(h, 7.3 + shift, 1.1) +
      0.2 * gauss(h, 10.5 + shift, 1.6) -
      0.35 * sigmoid((h - (dayLength - 1.5)) / 0.9) -
      0.4 * Math.exp((-h * 60) / 30); // sleep inertia
    v = Math.max(0.05, Math.min(1, v * scale));
    points.push({ minute: m, value: Math.round(v * 1000) / 1000 });
  }
  return points;
}

/** Interpolated energy at a minute of the day; null outside the waking window. */
export function energyAt(curve: EnergyPoint[], minute: number): number | null {
  if (curve.length === 0 || minute < curve[0].minute || minute > curve[curve.length - 1].minute) return null;
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (minute <= b.minute) {
      const t = (minute - a.minute) / (b.minute - a.minute || 1);
      return a.value + t * (b.value - a.value);
    }
  }
  return curve[curve.length - 1].value;
}

export type Window = { start: number; end: number; score: number };

/**
 * Best free window of `durationMin` for deep work, starting no earlier than
 * `fromMinute`, avoiding busy intervals (minutes after midnight).
 */
export function bestFocusWindow(
  curve: EnergyPoint[],
  busy: Array<[number, number]>,
  durationMin = 90,
  fromMinute = 0,
): Window | null {
  if (curve.length < 2) return null;
  const step = curve[1].minute - curve[0].minute;
  const last = curve[curve.length - 1].minute;
  let best: Window | null = null;

  for (let start = Math.max(curve[0].minute, Math.ceil(fromMinute / step) * step); start + durationMin <= last; start += step) {
    const end = start + durationMin;
    if (busy.some(([b0, b1]) => b0 < end && b1 > start)) continue;
    let sum = 0;
    let n = 0;
    for (let m = start; m <= end; m += step) {
      sum += energyAt(curve, m) ?? 0;
      n++;
    }
    const score = sum / n;
    if (!best || score > best.score + 1e-9) best = { start, end, score: Math.round(score * 1000) / 1000 };
  }
  return best;
}

export function energyLabel(value: number): string {
  if (value >= 0.75) return "Peak";
  if (value >= 0.55) return "Good";
  if (value >= 0.4) return "Dip";
  return "Low";
}
