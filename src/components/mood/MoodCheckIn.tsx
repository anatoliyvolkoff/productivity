"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { logMood } from "@/app/actions/wellbeing";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import type { MoodContext } from "@/lib/db/schema";
import { CONTEXT_OPTIONS, emotionsNear, QUADRANT_INFO, quadrantOf, STRATEGIES, type Quadrant } from "@/lib/domain/mood";
import { useRunner } from "@/lib/hooks/useRunner";

const ENERGY = [5, 4, 3, 2, 1, -1, -2, -3, -4, -5];
const PLEASANT = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
const START: Record<Quadrant, [number, number]> = { red: [3, -3], yellow: [3, 3], blue: [-3, -3], green: [-3, 3] };

/** Two-step check-in: place yourself on the energy × pleasantness grid, then name the feeling. */
export function MoodCheckIn({ initial }: { initial: Quadrant | null }) {
  const { pending, run } = useRunner();
  const [point, setPoint] = useState<[number, number] | null>(initial ? START[initial] : null);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [context, setContext] = useState<Required<MoodContext>>({ doing: [], with: [], where: [] });
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<Quadrant | null>(null);

  const words = useMemo(() => (point ? emotionsNear(point[0], point[1]) : []), [point]);
  const quadrant = point ? quadrantOf(point[0], point[1]) : null;

  const toggle = (key: keyof MoodContext, value: string) =>
    setContext((c) => ({ ...c, [key]: c[key].includes(value) ? c[key].filter((v) => v !== value) : [...c[key], value] }));

  const reset = () => {
    setPoint(null);
    setEmotion(null);
    setContext({ doing: [], with: [], where: [] });
    setNote("");
    setSaved(null);
  };

  if (saved) {
    const info = QUADRANT_INFO[saved];
    return (
      <Card title="Checked in">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full text-white" style={{ background: info.color }}>
            <Check className="size-5" />
          </span>
          <p className="text-[15px]">
            You named it: <b>{emotion}</b>. Naming a feeling is itself a way to regulate it.
          </p>
        </div>
        <h3 className="mt-5 mb-2 text-[13px] font-semibold">Something that may help</h3>
        <ul className="flex flex-col gap-2">
          {STRATEGIES[saved].map((s) => (
            <li key={s} className="rounded-md bg-surface-3 px-3 py-2 text-[13.5px]">
              {s}
            </li>
          ))}
        </ul>
        <Button variant="secondary" className="mt-4 self-start" onClick={reset}>
          Done
        </Button>
      </Card>
    );
  }

  return (
    <Card title="How do you feel right now?">
      <p className="-mt-1 mb-3 text-[13px] text-fg-muted">1. Tap where you are: higher = more energy, right = more pleasant.</p>
      <div className="relative mx-auto w-full max-w-[420px]">
        <div className="mb-1 text-center text-[11px] font-medium text-fg-subtle uppercase">High energy</div>
        <div className="grid grid-cols-10 gap-[3px]" role="grid" aria-label="Mood grid">
          {ENERGY.map((e) =>
            PLEASANT.map((p) => {
              const q = quadrantOf(e, p);
              const strength = (Math.abs(e) + Math.abs(p)) / 10;
              const selected = point?.[0] === e && point?.[1] === p;
              return (
                <button
                  key={`${e}:${p}`}
                  type="button"
                  aria-label={`Energy ${e}, pleasantness ${p}`}
                  onClick={() => {
                    setPoint([e, p]);
                    setEmotion(null);
                  }}
                  className={cn("aspect-square rounded-[6px] transition hover:scale-110", selected && "scale-110 ring-2 ring-fg ring-offset-2 ring-offset-surface")}
                  style={{ background: QUADRANT_INFO[q].color, opacity: 0.25 + 0.75 * strength }}
                />
              );
            }),
          )}
        </div>
        <div className="mt-1 flex justify-between text-[11px] font-medium text-fg-subtle uppercase">
          <span>Unpleasant</span>
          <span>Low energy</span>
          <span>Pleasant</span>
        </div>
      </div>

      {quadrant && (
        <>
          <p className="mt-5 mb-2 text-[13px] text-fg-muted">
            2. Which word fits best? <span className="text-fg-subtle">({QUADRANT_INFO[quadrant].label})</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {words.slice(0, 18).map((w) => (
              <button
                key={w.word}
                type="button"
                onClick={() => setEmotion(w.word)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[13px] font-medium transition",
                  emotion === w.word ? "text-white" : "bg-surface-3 text-fg hover:bg-outline",
                )}
                style={emotion === w.word ? { background: QUADRANT_INFO[quadrant].color } : undefined}
              >
                {w.word}
              </button>
            ))}
          </div>
        </>
      )}

      {emotion && quadrant && (
        <>
          <p className="mt-5 mb-2 text-[13px] text-fg-muted">3. Context (optional) — this is what makes patterns visible later.</p>
          {(Object.keys(CONTEXT_OPTIONS) as Array<keyof typeof CONTEXT_OPTIONS>).map((key) => (
            <div key={key} className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="w-14 text-[12px] text-fg-subtle capitalize">{key}</span>
              {CONTEXT_OPTIONS[key].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggle(key, v)}
                  className={cn("rounded-full px-2.5 py-1 text-[12px] transition", context[key].includes(v) ? "bg-fg text-bg" : "bg-surface-3 text-fg-muted hover:text-fg")}
                >
                  {v}
                </button>
              ))}
            </div>
          ))}
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything behind it? (optional)" className="mt-2 min-h-16" />
          <Button
            variant="primary"
            className="mt-3 self-start"
            disabled={pending}
            onClick={() =>
              run(() => logMood({ energy: point![0], pleasantness: point![1], emotion, note, context }), {
                onSuccess: (r) => setSaved(r.quadrant),
              })
            }
          >
            Save check-in
          </Button>
        </>
      )}
    </Card>
  );
}
