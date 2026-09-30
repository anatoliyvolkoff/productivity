"use client";

import { useReducedMotion } from "framer-motion";
import { useSyncExternalStore } from "react";

/**
 * Sensory & comfort settings, saved per device (like the theme) and applied
 * as attributes on <html> before first paint, so nothing jumps on load.
 * The operating system's "reduce motion" setting always wins.
 */
import { SENSORY_DEFAULTS, SENSORY_STORAGE_KEY, type Sensory } from "./sensory-init";

export { SENSORY_DEFAULTS, type MotionLevel, type Sensory } from "./sensory-init";

const EVENT = "pos:sensory";

function read(): Sensory {
  try {
    return { ...SENSORY_DEFAULTS, ...JSON.parse(localStorage.getItem(SENSORY_STORAGE_KEY) || "{}") };
  } catch {
    return SENSORY_DEFAULTS;
  }
}

let cache: { raw: string | null; value: Sensory } | null = null;
function snapshot(): Sensory {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SENSORY_STORAGE_KEY);
  } catch {}
  if (!cache || cache.raw !== raw) cache = { raw, value: read() };
  return cache.value;
}

function apply(s: Sensory) {
  const r = document.documentElement;
  r.dataset.motion = s.motion;
  r.dataset.font = s.font;
  r.dataset.spacing = s.spacing;
  r.dataset.textSize = s.textSize;
  if (s.lowStim) r.dataset.lowstim = "";
  else delete r.dataset.lowstim;
}

export function setSensory(patch: Partial<Sensory>) {
  const next = { ...read(), ...patch };
  try {
    localStorage.setItem(SENSORY_STORAGE_KEY, JSON.stringify(next));
  } catch {}
  apply(next);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useSensory(): Sensory {
  return useSyncExternalStore(subscribe, snapshot, () => SENSORY_DEFAULTS);
}

/**
 * Motion settings for framer-motion. `reduced` (OS setting) means: no
 * movement, only quick fades. Distances and springiness scale with the level.
 */
export function useMotion() {
  const { motion: level, celebration } = useSensory();
  const reduced = Boolean(useReducedMotion());
  const scale = reduced ? 0 : level === "calm" ? 0.5 : level === "playful" ? 1.3 : 1;
  const ease = [0.25, 0.1, 0.25, 1] as const;
  return {
    level,
    reduced,
    celebration,
    /** A distance in px, scaled to the motion level (0 with reduced motion). */
    d: (px: number) => px * scale,
    /** Soft, 200–400ms: for things entering, leaving and settling. */
    soft: reduced ? { duration: 0.15 } : { duration: level === "calm" ? 0.4 : 0.3, ease },
    /** Slow fade for calming moments. */
    slow: reduced ? { duration: 0.2 } : { duration: level === "calm" ? 0.9 : 0.6, ease },
    /** Physical, springy — rewards only. Calm gets a soft settle instead. */
    spring: reduced
      ? { duration: 0.15 }
      : level === "calm"
        ? { type: "spring" as const, stiffness: 170, damping: 26 }
        : level === "playful"
          ? { type: "spring" as const, stiffness: 320, damping: 14 }
          : { type: "spring" as const, stiffness: 260, damping: 20 },
  };
}

/** Read text aloud with the browser's built-in voice. Returns false if unsupported. */
export function speak(text: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
  return true;
}
