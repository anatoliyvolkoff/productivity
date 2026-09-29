"use client";

import { Square, Timer } from "lucide-react";
import Link from "next/link";
import { stopTracking } from "@/app/actions/focus";
import { useNow } from "@/lib/hooks/useNow";
import { useRunner } from "@/lib/hooks/useRunner";
import { remainingSec } from "@/lib/domain/focus";

export type RunningSessionInfo = {
  startedAt: Date;
  plannedMin: number;
  pausedAt: Date | null;
  pausedSec: number;
  taskTitle: string | null;
};

export type RunningTimerInfo = { startedAt: Date; taskTitle: string | null; note: string | null };

const clock = (sec: number) => {
  const s = Math.abs(Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  return `${sec < 0 ? "+" : ""}${h ? `${h}:${mm}` : mm}:${ss}`;
};

/** Top-bar pill for a running focus session or time-tracking timer. */
export function RunningIndicator({ session, timer }: { session: RunningSessionInfo | null; timer: RunningTimerInfo | null }) {
  const now = useNow();
  const { run, pending } = useRunner();
  if (!now || (!session && !timer)) return null;

  if (session) {
    const left = remainingSec(session, now);
    return (
      <Link
        href="/focus"
        className="flex h-9 items-center gap-2 rounded-full bg-primary px-3.5 text-[13px] font-medium text-on-primary shadow-sm transition hover:brightness-110"
      >
        <span className={`size-2 rounded-full bg-white ${session.pausedAt ? "" : "animate-pulse"}`} />
        <span className="tabular">{session.pausedAt ? "Paused" : left <= 0 ? "Done" : "Focus"} {clock(left)}</span>
        {session.taskTitle && <span className="max-w-40 truncate opacity-80">· {session.taskTitle}</span>}
      </Link>
    );
  }

  const elapsed = (now.getTime() - timer!.startedAt.getTime()) / 1000;
  return (
    <div className="flex h-9 items-center gap-2 rounded-full bg-accent-soft pr-1 pl-3.5 text-[13px] font-medium text-accent">
      <Timer className="size-4" />
      <span className="tabular">{clock(elapsed)}</span>
      <span className="max-w-40 truncate opacity-80">{timer!.taskTitle ?? timer!.note ?? "Tracking"}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => stopTracking(), { success: "Timer stopped" })}
        className="grid size-7 place-items-center rounded-full bg-accent text-white transition hover:brightness-110"
        aria-label="Stop timer"
      >
        <Square className="size-3" fill="currentColor" />
      </button>
    </div>
  );
}
