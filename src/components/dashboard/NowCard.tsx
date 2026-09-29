"use client";

import { Play, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startFocus } from "@/app/actions/focus";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatMinutes, minutesToHHMM } from "@/lib/domain/dates";
import { remainingSec } from "@/lib/domain/focus";
import { useNow } from "@/lib/hooks/useNow";
import { useRunner } from "@/lib/hooks/useRunner";

export function NowCard({
  session,
  timer,
  topTask,
  bestWindow,
  energyLabel,
}: {
  session: { startedAt: Date; plannedMin: number; pausedAt: Date | null; pausedSec: number; taskTitle: string | null } | null;
  timer: { startedAt: Date; taskTitle: string | null; note: string | null } | null;
  topTask: { id: string; title: string } | null;
  bestWindow: { start: number; end: number } | null;
  energyLabel: string | null;
}) {
  const now = useNow();
  const router = useRouter();
  const { pending, run } = useRunner();

  let body: React.ReactNode;
  if (session && now) {
    const left = remainingSec(session, now);
    const s = Math.max(0, left);
    body = (
      <Link href="/focus" className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-primary">{session.pausedAt ? "Paused" : left > 0 ? "Focusing" : "Session complete"}</span>
        <span className="tabular font-mono text-[40px] leading-none font-semibold">
          {String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}
        </span>
        <span className="truncate text-[14px] text-fg-muted">{session.taskTitle ?? "Focus"}</span>
      </Link>
    );
  } else if (timer && now) {
    const el = Math.floor((now.getTime() - timer.startedAt.getTime()) / 60_000);
    body = (
      <Link href="/focus" className="flex flex-col gap-1">
        <span className="flex items-center gap-1 text-[12px] font-medium text-accent">
          <Timer className="size-3.5" /> Tracking
        </span>
        <span className="text-[30px] leading-none font-semibold">{formatMinutes(el)}</span>
        <span className="truncate text-[14px] text-fg-muted">{timer.taskTitle ?? timer.note ?? "Untitled"}</span>
      </Link>
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-[14px] text-fg-muted">
          {topTask ? (
            <>
              Next up: <b className="font-semibold text-fg">{topTask.title}</b>
            </>
          ) : (
            "Nothing running. Pick one thing and start."
          )}
        </p>
        <Button
          variant="primary"
          className="self-start"
          disabled={pending}
          onClick={() => run(() => startFocus({ taskId: topTask?.id ?? null, preset: "pomodoro" }), { onSuccess: () => router.push("/focus") })}
        >
          <Play className="size-3.5" fill="currentColor" /> Start focus
        </Button>
      </div>
    );
  }

  return (
    <Card title="Now" className="h-full">
      {body}
      <div className="mt-auto flex flex-col gap-1 pt-4 text-[12.5px] text-fg-muted">
        {energyLabel && <span>Energy now: <b className="font-semibold text-fg">{energyLabel}</b></span>}
        {bestWindow && (
          <span>
            Best deep-work window: <b className="font-semibold text-fg">{minutesToHHMM(bestWindow.start)}–{minutesToHHMM(bestWindow.end)}</b>
          </span>
        )}
      </div>
    </Card>
  );
}
