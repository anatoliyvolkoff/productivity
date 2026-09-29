"use client";

import { Maximize, Minimize } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNow } from "@/lib/hooks/useNow";
import { pad2, splitDuration } from "@/lib/time";

const TARGET_KEY = "pos-countdown-target";

/** Next occurrence of "HH:MM" today or tomorrow. */
function nextOccurrence(hhmm: string, now: Date): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target;
}

export function BigClock() {
  const now = useNow(250);
  const [target, setTarget] = useState("18:00");
  const [fullscreen, setFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TARGET_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore per-browser preference after mount
      if (saved) setTarget(saved);
    } catch {}
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const saveTarget = (value: string) => {
    setTarget(value);
    try {
      localStorage.setItem(TARGET_KEY, value);
    } catch {}
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else rootRef.current?.requestFullscreen();
  };

  const left = now && target ? splitDuration(nextOccurrence(target, now).getTime() - now.getTime()) : null;

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center rounded-xl bg-surface shadow-card"
    >
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute top-5 right-5 grid size-10 place-items-center rounded-sm text-fg-muted transition hover:bg-surface-3 hover:text-fg"
        aria-label={fullscreen ? "Exit full screen" : "Full screen"}
      >
        {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
      </button>

      <div className="text-[15px] font-medium text-fg-muted">
        {now?.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) ?? " "}
      </div>

      <div className="tabular font-mono text-[min(22vw,240px)] leading-none font-semibold tracking-tighter">
        {now ? `${pad2(now.getHours())}:${pad2(now.getMinutes())}` : "--:--"}
        <span className="text-accent">{now ? `:${pad2(now.getSeconds())}` : ""}</span>
      </div>

      <div className="mt-10 flex items-center gap-4 rounded-lg bg-surface-3 px-6 py-4">
        <label className="flex items-center gap-2 text-[13px] text-fg-muted">
          Countdown to
          <input
            type="time"
            value={target}
            onChange={(e) => saveTarget(e.target.value)}
            className="tabular rounded-xs bg-surface px-2 py-1 text-[15px] text-fg outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <div className="tabular font-mono text-[40px] leading-none font-semibold text-primary">
          {left ? `${pad2(left.hours)}:${pad2(left.minutes)}:${pad2(left.seconds)}` : "--:--:--"}
        </div>
      </div>
    </div>
  );
}
