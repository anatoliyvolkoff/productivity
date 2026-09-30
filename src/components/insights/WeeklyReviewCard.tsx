"use client";

import { Sparkles } from "lucide-react";
import { generateBrief } from "@/app/actions/ai";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useRunner } from "@/lib/hooks/useRunner";
import type { WeeklyReviewT } from "@/lib/services/ai";

export function WeeklyReviewCard({ review, createdAt, configured }: { review: WeeklyReviewT | null; createdAt: Date | null; configured: boolean }) {
  const { pending, run } = useRunner();
  return (
    <Card
      title="AI weekly review"
      action={
        configured ? (
          <Button size="sm" variant="tonal" disabled={pending} onClick={() => run(() => generateBrief("weekly"), { success: "Review ready" })}>
            <Sparkles className="size-3.5" /> {pending ? "Thinking…" : review ? "Refresh" : "Write my review"}
          </Button>
        ) : null
      }
    >
      {!review ? (
        <p className="text-[13.5px] text-fg-muted">
          {configured
            ? "A look back at the last seven days: highlights, patterns across sleep, mood, focus and habits, goals at risk, and a few concrete adjustments."
            : "Add ANTHROPIC_API_KEY to .env.local to get an AI-written weekly review of your data."}
        </p>
      ) : (
        <div className={`flex flex-col gap-3 text-[13.5px] ${pending ? "opacity-60" : ""}`}>
          <p className="text-[15px] font-semibold">{review.headline}</p>
          <Section title="Highlights" items={review.highlights} />
          <Section title="Patterns" items={review.patterns} />
          {review.goalsAtRisk.length > 0 && <Section title="Goals needing attention" items={review.goalsAtRisk.map((g) => `${g.title} — ${g.advice}`)} />}
          <Section title="Try next week" items={review.adjustments} />
          <p className="text-fg-muted">
            <b className="font-semibold text-fg">Sleep & energy:</b> {review.sleepAndEnergy}
          </p>
          {createdAt && (
            <p className="text-[11.5px] text-fg-subtle">
              Written <RelativeTime date={createdAt} />
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1 text-[12px] font-semibold tracking-wide text-fg-muted uppercase">{title}</h4>
      <ul className="list-disc pl-5 text-fg-muted">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
