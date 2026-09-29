"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { generateBrief } from "@/app/actions/ai";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useRunner } from "@/lib/hooks/useRunner";
import type { MorningBriefT } from "@/lib/services/ai";

const SUGGESTION: Record<string, string> = { defer: "Defer", drop: "Drop", delegate: "Delegate", batch: "Batch" };

/**
 * Daily brief: the AI version when one was generated today, otherwise the
 * rule-based brief computed from the same data.
 */
export function AiBriefCard({
  brief,
  source,
  createdAt,
  configured,
}: {
  brief: MorningBriefT;
  source: "ai" | "local";
  createdAt: Date | null;
  configured: boolean;
}) {
  const { pending, run } = useRunner();
  const generate = () => run(() => generateBrief("morning"), { success: "AI brief ready" });

  return (
    <Card
      title="Daily brief"
      className="h-full"
      action={
        configured ? (
          <Button size="sm" variant={source === "ai" ? "ghost" : "tonal"} disabled={pending} onClick={generate}>
            {source === "ai" ? <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} /> : <Sparkles className="size-3.5" />}
            {pending ? "Thinking…" : source === "ai" ? "Refresh" : "Write with AI"}
          </Button>
        ) : (
          <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-fg-muted" title="Add ANTHROPIC_API_KEY to .env.local for an AI-written brief">
            Rule-based
          </span>
        )
      }
    >
      {(
        <div className={`flex flex-col gap-4 ${pending ? "opacity-60" : ""}`}>
          <p className="text-[16px] leading-snug font-semibold tracking-tight">{brief.headline}</p>
          <div>
            <h3 className="mb-1.5 text-[12px] font-semibold tracking-wide text-fg-muted uppercase">What matters today</h3>
            <ol className="flex flex-col gap-2">
              {brief.important.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px]">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">{i + 1}</span>
                  <span>
                    <b className="font-semibold">{item.title}</b> <span className="text-fg-muted">— {item.why}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          {brief.notImportant.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-[12px] font-semibold tracking-wide text-fg-muted uppercase">What can wait</h3>
              <ul className="flex flex-col gap-1.5">
                {brief.notImportant.map((item, i) => (
                  <li key={i} className="text-[13px] text-fg-muted">
                    <span className="mr-1.5 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-fg">{SUGGESTION[item.suggestion]}</span>
                    {item.title} — {item.why}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <dl className="grid gap-2 text-[13px]">
            <div>
              <dt className="inline font-semibold">Shape of the day: </dt>
              <dd className="inline text-fg-muted">{brief.schedule}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Energy: </dt>
              <dd className="inline text-fg-muted">{brief.energy}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Habits: </dt>
              <dd className="inline text-fg-muted">{brief.habits}</dd>
            </div>
            {brief.watchOut && (
              <div>
                <dt className="inline font-semibold">Watch out: </dt>
                <dd className="inline text-fg-muted">{brief.watchOut}</dd>
              </div>
            )}
          </dl>
          <p className="text-[13px] font-medium text-primary">{brief.encouragement}</p>
          <p className="text-[11.5px] text-fg-subtle">
            {source === "ai" && createdAt ? (
              <>
                Written by AI <RelativeTime date={createdAt} />
              </>
            ) : configured ? (
              "Rule-based summary · updates as your day changes"
            ) : (
              "Rule-based summary · add ANTHROPIC_API_KEY to .env.local for an AI-written brief"
            )}
          </p>
        </div>
      )}
    </Card>
  );
}
