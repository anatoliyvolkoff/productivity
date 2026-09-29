"use client";

import { CalendarClock, Maximize2 } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatMinutes } from "@/lib/domain/dates";
import { useNow } from "@/lib/hooks/useNow";
import { pad2 } from "@/lib/time";

/** Live clock, waking-day progress and a countdown to the next event. */
export function ClockWidget({
  wakeMinute,
  bedMinute,
  nextEvent,
}: {
  wakeMinute: number;
  bedMinute: number;
  nextEvent: { title: string; startAt: Date } | null;
}) {
  const now = useNow();
  const minute = now ? now.getHours() * 60 + now.getMinutes() : 0;
  const progress = now ? Math.min(1, Math.max(0, (minute - wakeMinute) / (bedMinute - wakeMinute))) : 0;
  const left = Math.max(0, bedMinute - minute);
  const until = now && nextEvent ? Math.max(0, Math.round((nextEvent.startAt.getTime() - now.getTime()) / 60_000)) : null;

  return (
    <Card
      title="Clock"
      className="h-full"
      action={
        <Link href="/clock" className="text-fg-subtle transition hover:text-primary" aria-label="Open full-screen clock">
          <Maximize2 className="size-4" />
        </Link>
      }
    >
      <div className="tabular font-mono text-[54px] leading-none font-semibold tracking-tight">
        {now ? (
          <>
            {pad2(now.getHours())}:{pad2(now.getMinutes())}
            <span className="text-[26px] text-fg-subtle">:{pad2(now.getSeconds())}</span>
          </>
        ) : (
          "--:--"
        )}
      </div>
      {nextEvent && until !== null && until < 24 * 60 && (
        <div className="mt-3 flex items-center gap-1.5 text-[13px] text-fg-muted">
          <CalendarClock className="size-4 text-primary" />
          <span className="truncate">
            <b className="font-semibold text-fg">{nextEvent.title}</b> in {formatMinutes(until)}
          </span>
        </div>
      )}
      <div className="mt-auto pt-5">
        <div className="mb-2 flex justify-between text-[12px] text-fg-muted">
          <span>Waking day {Math.round(progress * 100)}%</span>
          <span>{progress < 1 ? `${formatMinutes(left)} left` : "Time to wind down"}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-primary-soft">
          <div className="h-full rounded-full bg-primary transition-[width] duration-1000" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </Card>
  );
}
