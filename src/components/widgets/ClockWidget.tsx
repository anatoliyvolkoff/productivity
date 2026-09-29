"use client";

import { Maximize2 } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useNow } from "@/lib/hooks/useNow";
import { dayProgress, pad2, splitDuration } from "@/lib/time";

const WAKE_HOUR = 7;
const SLEEP_HOUR = 23;

export function ClockWidget() {
  const now = useNow();
  const progress = now ? dayProgress(now, WAKE_HOUR, SLEEP_HOUR) : 0;

  let remaining = "";
  if (now) {
    const end = new Date(now);
    end.setHours(SLEEP_HOUR, 0, 0, 0);
    const { hours, minutes } = splitDuration(end.getTime() - now.getTime());
    remaining = `${hours}h ${pad2(minutes)}m of waking time left`;
  }

  return (
    <Card
      title="Clock"
      action={
        <Link href="/clock" className="text-fg-subtle transition hover:text-primary" aria-label="Open full-screen clock">
          <Maximize2 className="size-4" />
        </Link>
      }
    >
      <div className="tabular font-mono text-[56px] leading-none font-semibold tracking-tight">
        {now ? (
          <>
            {pad2(now.getHours())}:{pad2(now.getMinutes())}
            <span className="text-[28px] text-fg-subtle">:{pad2(now.getSeconds())}</span>
          </>
        ) : (
          "--:--"
        )}
      </div>

      <div className="mt-auto pt-6">
        <div className="mb-2 flex justify-between text-[12px] text-fg-muted">
          <span>Day {Math.round(progress * 100)}%</span>
          <span>{remaining}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-1000"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
