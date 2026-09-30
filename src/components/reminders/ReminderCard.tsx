"use client";

import { Check, Undo2 } from "lucide-react";
import { useOptimistic } from "react";
import { markReminder } from "@/app/actions/reminders";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { parseHHMM } from "@/lib/domain/dates";
import { useNow } from "@/lib/hooks/useNow";
import { useRunner } from "@/lib/hooks/useRunner";

export type ReminderItem = {
  id: string;
  title: string;
  emoji: string | null;
  time: string;
  doneAt: Date | null;
  last7: Array<{ date: string; doneAt: Date | null }>;
  doneOfLast7: number;
};

const clock = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/**
 * "Did I take it?" — one tap logs it with the time, so you never have to
 * rely on memory (and never double up). Kind wording, no streaks, no red.
 */
export function ReminderCard({ reminder }: { reminder: ReminderItem }) {
  const { pending, run } = useRunner();
  const now = useNow(30_000);
  const [doneAt, setDoneAt] = useOptimistic(reminder.doneAt);
  const due = parseHHMM(reminder.time);
  const minute = now ? now.getHours() * 60 + now.getMinutes() : 0;

  const hint = doneAt
    ? null
    : !now || minute < due
      ? `Later today · ${reminder.time}`
      : minute >= 20 * 60
        ? "Still not yet? That's okay. If you've already taken it, tap so future-you knows."
        : "Not yet — tap when you have. No rush.";

  const toggle = (done: boolean) =>
    run(async () => {
      setDoneAt(done ? new Date() : null);
      return markReminder(reminder.id, done);
    });

  return (
    <section className="flex flex-col rounded-lg bg-surface p-5 shadow-card" aria-label={`${reminder.title} reminder`}>
      <header className="mb-3 flex items-center gap-2">
        <span className="text-[18px]" aria-hidden>
          {reminder.emoji ?? "⏰"}
        </span>
        <h2 className="text-[14px] font-semibold tracking-tight">{reminder.title}</h2>
        <span className="text-[12.5px] text-fg-subtle">· {reminder.time}</span>
      </header>

      {doneAt ? (
        <div className="flex items-center gap-3 rounded-md bg-primary-soft px-4 py-3">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-on-primary motion-safe:animate-[pop_var(--motion-slow)_var(--ease-spring)]">
            <Check className="size-4" strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold">Taken today at {clock(new Date(doneAt))}</div>
            <div className="text-[12px] text-fg-muted">{pending ? "Saving…" : "Logged — no need to remember it."}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => toggle(false)} disabled={pending} aria-label="Undo — I haven't taken it">
            <Undo2 className="size-3.5" /> Undo
          </Button>
        </div>
      ) : (
        <>
          <Button variant="primary" size="lg" className="w-full justify-center" onClick={() => toggle(true)} disabled={pending}>
            <Check className="size-4" /> I took it
          </Button>
          <p className="mt-2 text-[12.5px] text-fg-muted">{hint}</p>
        </>
      )}

      <div className="mt-4 flex items-center gap-3">
        <ol className="flex gap-1.5" aria-label="Last 7 days">
          {reminder.last7.map((d, i) => {
            const isToday = i === reminder.last7.length - 1;
            const done = isToday ? Boolean(doneAt) : Boolean(d.doneAt);
            return (
              <li
                key={d.date}
                title={`${d.date}: ${done ? "taken" : isToday ? "not yet" : "not logged"}`}
                className={cn("size-2.5 rounded-full", done ? "bg-primary" : "bg-surface-3 ring-1 ring-outline", isToday && "ring-2 ring-primary/40")}
              />
            );
          })}
        </ol>
        <span className="text-[12px] text-fg-muted">
          {reminder.doneOfLast7 - (reminder.doneAt ? 1 : 0) + (doneAt ? 1 : 0)} of the last 7 days
        </span>
      </div>
    </section>
  );
}
