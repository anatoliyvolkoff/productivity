export type PresetKey = "pomodoro" | "d52" | "ultradian" | "custom";

export type FocusPreset = {
  key: PresetKey;
  label: string;
  focusMin: number;
  breakMin: number;
  longBreakMin?: number;
  roundsBeforeLongBreak?: number;
  description: string;
};

export const FOCUS_PRESETS: FocusPreset[] = [
  {
    key: "pomodoro",
    label: "Pomodoro",
    focusMin: 25,
    breakMin: 5,
    longBreakMin: 15,
    roundsBeforeLongBreak: 4,
    description: "25 min focus, 5 min break, long break after 4 rounds.",
  },
  { key: "d52", label: "52 / 17", focusMin: 52, breakMin: 17, description: "Longer focus with generous recovery." },
  {
    key: "ultradian",
    label: "Ultradian 90",
    focusMin: 90,
    breakMin: 20,
    description: "One ~90-minute cycle of the body's ultradian rhythm, then 20 min off.",
  },
  { key: "custom", label: "Custom", focusMin: 45, breakMin: 10, description: "Your own lengths." },
];

export const presetByKey = (key: string): FocusPreset =>
  FOCUS_PRESETS.find((p) => p.key === key) ?? FOCUS_PRESETS[0];

export type SessionClock = {
  startedAt: Date;
  plannedMin: number;
  pausedAt: Date | null;
  pausedSec: number;
};

/** Seconds of actual focus so far (excluding pauses). */
export function elapsedSec(s: SessionClock, now: Date): number {
  const end = s.pausedAt ?? now;
  return Math.max(0, Math.floor((end.getTime() - s.startedAt.getTime()) / 1000) - s.pausedSec);
}

export function remainingSec(s: SessionClock, now: Date): number {
  return s.plannedMin * 60 - elapsedSec(s, now);
}

/** Break suggestions that actually rest attention — no screens. */
export const BREAK_IDEAS = [
  "Look at something 20+ feet away for a minute",
  "Walk around, ideally outside in daylight",
  "Drink a glass of water",
  "Stretch your neck, shoulders and back",
  "Physiological sigh: two inhales through the nose, one long exhale",
  "Close your eyes and do nothing for two minutes",
];
