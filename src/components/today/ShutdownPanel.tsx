"use client";

import { ArrowRight, Moon, Sparkles } from "lucide-react";
import { generateBrief } from "@/app/actions/ai";
import { carryOver } from "@/app/actions/tasks";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useRunner } from "@/lib/hooks/useRunner";
import type { EveningSummaryT } from "@/lib/services/ai";

const SUGGESTION: Record<string, string> = { carry_over: "Carry over", reschedule: "Reschedule", drop: "Drop" };

/**
 * Evening shutdown ritual: review, close open loops (carry unfinished top
 * tasks to tomorrow), reflect. A clear "done for today" helps you detach.
 */
export function ShutdownPanel({
  date,
  tomorrow,
  stats,
  summary,
  configured,
}: {
  date: string;
  tomorrow: string;
  stats: { tasksDone: number; focus: string; tracked: string; moods: number; openMits: number };
  summary: EveningSummaryT | null;
  configured: boolean;
}) {
  const { pending, run } = useRunner();

  return (
    <Card title="Evening shutdown" action={<Moon className="size-4 text-fg-subtle" />}>
      <dl className="grid grid-cols-4 gap-2 text-center">
        {[
          ["Tasks done", String(stats.tasksDone)],
          ["Focus", stats.focus],
          ["Tracked", stats.tracked],
          ["Check-ins", String(stats.moods)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-surface-3 px-2 py-2">
            <dd className="text-[16px] font-semibold">{value}</dd>
            <dt className="text-[11px] text-fg-muted">{label}</dt>
          </div>
        ))}
      </dl>

      <ol className="mt-4 flex flex-col gap-3 text-[13.5px]">
        <li className="flex items-center justify-between gap-3">
          <span>
            <b className="font-semibold">1. Close loops.</b>{" "}
            <span className="text-fg-muted">{stats.openMits ? `${stats.openMits} top ${stats.openMits === 1 ? "task is" : "tasks are"} still open.` : "All top tasks are done."}</span>
          </span>
          {stats.openMits > 0 && (
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => carryOver(date, tomorrow), { success: "Moved to tomorrow's top 3" })}>
              To tomorrow <ArrowRight className="size-3.5" />
            </Button>
          )}
        </li>
        <li>
          <b className="font-semibold">2. Pick tomorrow&apos;s top 3</b> <span className="text-fg-muted">in Tasks — deciding tonight makes the morning easy.</span>
        </li>
        <li>
          <b className="font-semibold">3. Reflect</b> <span className="text-fg-muted">in today&apos;s note: one win, one lesson.</span>
        </li>
      </ol>

      <div className="mt-4 border-t border-outline pt-4">
        {summary ? (
          <div className={`flex flex-col gap-2 text-[13px] ${pending ? "opacity-60" : ""}`}>
            <p className="text-[14.5px] font-semibold">{summary.headline}</p>
            {summary.wins.length > 0 && (
              <ul className="list-disc pl-5 text-fg-muted">
                {summary.wins.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
            {summary.unfinished.map((u, i) => (
              <p key={i} className="text-fg-muted">
                <span className="mr-1.5 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-fg">{SUGGESTION[u.suggestion]}</span>
                {u.title} — {u.why}
              </p>
            ))}
            <p className="text-fg-muted">
              <b className="font-semibold text-fg">Time:</b> {summary.time}
            </p>
            <p className="text-fg-muted">
              <b className="font-semibold text-fg">Mood:</b> {summary.moodArc}
            </p>
            <p className="font-medium text-primary">{summary.reflectionQuestion}</p>
          </div>
        ) : (
          <p className="text-[13px] text-fg-muted">
            {configured ? "Get an AI summary of the day: wins, what slipped, and a question to reflect on." : "Add ANTHROPIC_API_KEY to .env.local for an AI-written evening summary."}
          </p>
        )}
        {configured && (
          <Button size="sm" variant="tonal" className="mt-3" disabled={pending} onClick={() => run(() => generateBrief("evening"), { success: "Summary ready" })}>
            <Sparkles className="size-3.5" /> {pending ? "Thinking…" : summary ? "Refresh summary" : "Summarize my day"}
          </Button>
        )}
      </div>
    </Card>
  );
}
