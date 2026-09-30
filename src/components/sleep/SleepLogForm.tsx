"use client";

import { Moon } from "lucide-react";
import { useState } from "react";
import { logSleep } from "@/app/actions/wellbeing";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import type { SleepFactors } from "@/lib/db/schema";
import { formatMinutes, parseHHMM } from "@/lib/domain/dates";
import { SLEEP_FACTORS } from "@/lib/domain/sleep";
import { useRunner } from "@/lib/hooks/useRunner";

export type SleepFormValues = {
  date: string;
  bedTime: string;
  wakeTime: string;
  latencyMin: string;
  awakenings: string;
  quality: number | null;
  factors: SleepFactors;
  note: string;
};

export function SleepLogForm({ initial, existing }: { initial: SleepFormValues; existing: boolean }) {
  const { pending, run } = useRunner();
  const [form, setForm] = useState(initial);
  const set = (patch: Partial<SleepFormValues>) => setForm((f) => ({ ...f, ...patch }));

  const bed = parseHHMM(form.bedTime);
  const wake = parseHHMM(form.wakeTime);
  const inBed = Number.isNaN(bed) || Number.isNaN(wake) ? null : (wake - bed + 1440) % 1440;
  const asleep = inBed === null ? null : Math.max(0, inBed - (Number(form.latencyMin) || 0));

  return (
    <Card title={existing ? "Last night (logged — edit if needed)" : "How did you sleep?"}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Woke up on">
            <Input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Went to bed">
            <Input type="time" value={form.bedTime} onChange={(e) => set({ bedTime: e.target.value })} />
          </Field>
          <Field label="Woke up">
            <Input type="time" value={form.wakeTime} onChange={(e) => set({ wakeTime: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Minutes to fall asleep">
            <Input type="number" min={0} value={form.latencyMin} onChange={(e) => set({ latencyMin: e.target.value })} placeholder="15" />
          </Field>
          <Field label="Times woken up">
            <Input type="number" min={0} value={form.awakenings} onChange={(e) => set({ awakenings: e.target.value })} placeholder="0" />
          </Field>
          <div className="flex flex-col justify-end pb-2 text-[13px] text-fg-muted">
            {asleep !== null && (
              <span>
                ≈ <b className="text-[16px] text-fg">{formatMinutes(asleep)}</b> asleep
              </span>
            )}
          </div>
        </div>
        <Field label="Quality">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => set({ quality: q })}
                aria-label={`Quality ${q} of 5`}
                className={cn("flex h-10 flex-1 items-center justify-center gap-1 rounded-sm text-[13px] font-medium transition", form.quality === q ? "bg-primary text-on-primary" : "bg-surface-3 text-fg-muted hover:text-fg")}
              >
                <Moon className="size-3.5" /> {q}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Anything that might have affected it?">
          <div className="flex flex-wrap gap-1.5">
            {SLEEP_FACTORS.map((f) => {
              const on = Boolean(form.factors[f.key]);
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => set({ factors: { ...form.factors, [f.key]: !on } })}
                  className={cn("rounded-full px-3 py-1.5 text-[12.5px] transition", on ? "bg-fg text-bg" : "bg-surface-3 text-fg-muted hover:text-fg")}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </Field>
        <Textarea value={form.note} onChange={(e) => set({ note: e.target.value })} placeholder="Dreams, noise, how you felt on waking… (optional)" className="min-h-16" />
        <Button
          variant="primary"
          className="self-start"
          disabled={pending}
          onClick={() =>
            run(
              () =>
                logSleep({
                  date: form.date,
                  bedTime: form.bedTime,
                  wakeTime: form.wakeTime,
                  latencyMin: form.latencyMin ? Number(form.latencyMin) : null,
                  awakenings: form.awakenings ? Number(form.awakenings) : null,
                  quality: form.quality,
                  factors: form.factors,
                  note: form.note,
                }),
              { success: "Sleep logged" },
            )
          }
        >
          Save
        </Button>
      </div>
    </Card>
  );
}
