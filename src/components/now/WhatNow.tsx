"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BatteryFull, BatteryLow, BatteryMedium, Check, Play, RotateCcw, Undo2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { notNow, toggleTaskDone } from "@/app/actions/tasks";
import { StepsPanel } from "@/components/steps/StepsPanel";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { todayISO } from "@/lib/domain/dates";
import { rankWhatNow, type Candidate, type EnergyNow } from "@/lib/domain/whatNow";
import { useMotion } from "@/lib/sensory";
import { Celebration, FlyToJar } from "./Celebration";
import { addToJar } from "./DoneJar";
import { FocusMode, type FocusResult, type FocusSessionInfo } from "./FocusMode";

export type WhatNowTask = Candidate & { goalPriority?: number | null };

const ENERGY: Array<{ value: EnergyNow; label: string; hint: string; icon: typeof BatteryLow }> = [
  { value: "low", label: "Low", hint: "Easy things only", icon: BatteryLow },
  { value: "okay", label: "Okay", hint: "Something normal", icon: BatteryMedium },
  { value: "high", label: "High", hint: "Bring on the hard one", icon: BatteryFull },
];
const TIME = [
  { value: 5, label: "5 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "An hour+" },
];

type Phase = "energy" | "time" | "show";

/**
 * The core loop: How's your energy? How much time? → exactly one task.
 * Start (full-screen focus), Not now (it drifts back), or Done (into the jar).
 */
export function WhatNow({ tasks, running }: { tasks: WhatNowTask[]; running: { task: { id: string; title: string }; session: FocusSessionInfo } | null }) {
  const m = useMotion();
  const [phase, setPhase] = useState<Phase>("energy");
  const [energy, setEnergy] = useState<EnergyNow>("okay");
  const [minutes, setMinutes] = useState(30);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<"notnow" | "done">("notnow");
  const [focus, setFocus] = useState<{ task: { id: string; title: string }; session: FocusSessionInfo | null } | null>(null);
  const [flight, setFlight] = useState<{ rect: DOMRect; title: string } | null>(null);
  const [cheer, setCheer] = useState<{ x: number; y: number } | null>(null);
  const [shuffleKey, setShuffleKey] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const pendingFlight = useRef<{ rect: DOMRect; title: string } | null>(null);

  const ranked = useMemo(() => rankWhatNow(tasks, energy, minutes, todayISO()), [tasks, energy, minutes]);
  const queue = ranked.filter((t) => !skipped.includes(t.id));
  const pick = queue[0] ?? null;
  const pool = queue.slice(1, 4);

  const ask = () => {
    setSkipped([]);
    setPhase("energy");
  };

  const reveal = (mins: number) => {
    setMinutes(mins);
    setSkipped([]);
    setShuffleKey((k) => k + 1);
    setPhase("show");
  };

  const leave = useCallback(
    (kind: "notnow" | "done", id: string, title: string) => {
      setLeaving(kind);
      if (kind === "done" && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        pendingFlight.current = { rect, title };
        setCheer({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }
      setSkipped((s) => [...s, id]);
    },
    [],
  );

  const onNotNow = (t: WhatNowTask) => {
    leave("notnow", t.id, t.title);
    void notNow(t.id).then((r) => !r.ok && toast.error(r.error));
  };

  const onDone = (t: WhatNowTask) => {
    leave("done", t.id, t.title);
    void toggleTaskDone(t.id, true).then((r) => !r.ok && toast.error(r.error));
  };

  const onFocusClose = (result: FocusResult) => {
    const t = focus?.task;
    setFocus(null);
    if (!t) return;
    if (result === "done") leave("done", t.id, t.title);
    else if (result === "notnow") leave("notnow", t.id, t.title);
  };

  return (
    <section className="relative flex min-h-[420px] flex-col items-center justify-center rounded-xl bg-surface px-10 py-10 shadow-card" aria-label="What now?">
      {running && !focus && (
        <div className="mb-6 flex w-full max-w-[560px] items-center gap-3 rounded-lg bg-primary-soft px-4 py-3">
          <span className="min-w-0 flex-1 truncate text-[14px]">
            You&apos;re in a focus session: <b>{running.task.title}</b>
          </span>
          <Button variant="primary" size="sm" onClick={() => setFocus({ task: running.task, session: running.session })}>
            <Play className="size-3.5" fill="currentColor" /> Back to it
          </Button>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {phase === "energy" && (
          <motion.div key="energy" className="flex w-full max-w-[560px] flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={m.soft}>
            <h1 className="text-[34px] font-semibold tracking-tight">What now?</h1>
            <p className="mt-2 text-[15px] text-fg-muted">Two taps and I&apos;ll show you one thing. How&apos;s your energy?</p>
            <div className="mt-7 grid w-full grid-cols-3 gap-3">
              {ENERGY.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => {
                    setEnergy(e.value);
                    setPhase("time");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-lg bg-surface-2 px-4 py-5 ring-1 ring-outline transition hover:bg-primary-soft hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <e.icon className="size-6 text-primary" strokeWidth={1.75} />
                  <span className="text-[16px] font-semibold">{e.label}</span>
                  <span className="text-[12.5px] text-fg-muted">{e.hint}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {phase === "time" && (
          <motion.div key="time" className="flex w-full max-w-[560px] flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={m.soft}>
            <h1 className="text-[28px] font-semibold tracking-tight">How much time do you have?</h1>
            <p className="mt-2 text-[14px] text-fg-muted">A guess is fine.</p>
            <div className="mt-7 grid w-full grid-cols-4 gap-3">
              {TIME.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => reveal(t.value)}
                  className="rounded-lg bg-surface-2 px-3 py-5 text-[16px] font-semibold ring-1 ring-outline transition hover:bg-primary-soft hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setPhase("energy")} className="mt-4 text-[13px] text-fg-muted hover:text-fg">
              ← Back
            </button>
          </motion.div>
        )}

        {phase === "show" && (
          <motion.div key={`show-${shuffleKey}`} className="relative flex w-full max-w-[600px] flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={m.soft}>
            <div className="mb-4 flex items-center gap-2 text-[12.5px] text-fg-muted">
              <span>
                {ENERGY.find((e) => e.value === energy)?.label} energy · {TIME.find((t) => t.value === minutes)?.label}
              </span>
              <button type="button" onClick={ask} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-surface-3 hover:text-fg">
                <RotateCcw className="size-3" /> Change
              </button>
            </div>

            {/* The pool: other options, blurred and faded back. */}
            <div className="relative w-full">
              {pick &&
                pool.map((t, i) => (
                  <motion.div
                    key={`ghost-${t.id}`}
                    aria-hidden
                    className="decor absolute inset-x-6 top-0 h-full rounded-xl bg-surface-2 ring-1 ring-outline"
                    style={{ filter: "blur(2px)", zIndex: 0 }}
                    initial={{ opacity: 0, y: 0, scale: 0.94 }}
                    animate={{
                      opacity: 0.45 - i * 0.12,
                      y: (i + 1) * 10,
                      scale: 0.96 - i * 0.03,
                      x: m.reduced || m.level === "calm" ? 0 : [0, (i % 2 ? 1 : -1) * m.d(18), 0],
                    }}
                    transition={{ ...m.soft, duration: m.reduced ? 0.1 : 0.5 }}
                  />
                ))}

              <AnimatePresence mode="wait" onExitComplete={() => {
                if (pendingFlight.current) {
                  setFlight(pendingFlight.current);
                  pendingFlight.current = null;
                }
              }}>
                {pick ? (
                  <motion.div
                    key={pick.id}
                    ref={cardRef}
                    className="relative z-10 rounded-xl bg-surface p-6 shadow-card ring-1 ring-outline"
                    // Rises forward and settles after the brief shuffle of the pool.
                    initial={{ opacity: 0, y: m.d(28), scale: m.reduced ? 1 : 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={
                      leaving === "done"
                        ? { opacity: 0, scaleY: m.reduced ? 1 : 0.3, transition: { duration: m.reduced ? 0.1 : 0.25 } }
                        : // Not now: drifts gently back into the pool. No shake, no red.
                          { opacity: 0, y: m.d(26), scale: m.reduced ? 1 : 0.93, filter: "blur(2px)", transition: m.slow }
                    }
                    transition={{ ...m.spring, delay: m.reduced || m.level === "calm" ? 0 : 0.35 }}
                  >
                    <div className="mb-1 text-[12px] font-medium text-primary">{pick.mitOn === todayISO() ? "One of today's top 3" : "Your one thing"}</div>
                    <h2 className="text-[24px] leading-tight font-semibold tracking-tight">{pick.title}</h2>
                    <div className="mt-4">
                      <StepsPanel taskId={pick.id} taskTitle={pick.title} compact />
                    </div>
                    <div className="mt-6 flex items-center gap-2">
                      <Button variant="primary" size="lg" onClick={() => setFocus({ task: { id: pick.id, title: pick.title }, session: null })}>
                        <Play className="size-4" fill="currentColor" /> Start
                      </Button>
                      <Button variant="secondary" size="lg" onClick={() => onNotNow(pick)}>
                        <Undo2 className="size-4" /> Not now
                      </Button>
                      <Button variant="ghost" size="lg" className="ml-auto" onClick={() => onDone(pick)}>
                        <Check className="size-4" /> Already done
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty" className="relative z-10 rounded-xl bg-surface-2 p-8 text-center ring-1 ring-outline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={m.slow}>
                    <p className="text-[18px] font-semibold">{tasks.length === 0 ? "Nothing's waiting." : "That's everything that fits right now."}</p>
                    <p className="mt-1 text-[14px] text-fg-muted">
                      {tasks.length === 0 ? "Dump a thought in the bar above — or enjoy the space. 🌿" : "Rest counts too. Or try again with a different energy or time."}
                    </p>
                    <Button variant="tonal" className="mt-4" onClick={ask}>
                      <RotateCcw className="size-4" /> Ask again
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {focus && <FocusMode key={focus.task.id} task={focus.task} minutes={minutes} session={focus.session} onClose={onFocusClose} />}
      </AnimatePresence>
      {cheer && <Celebration x={cheer.x} y={cheer.y} onDone={() => setCheer(null)} />}
      {flight && (
        <FlyToJar
          from={flight.rect}
          title={flight.title}
          onDone={() => {
            addToJar(flight.title);
            setFlight(null);
          }}
        />
      )}
      <span className={cn("sr-only")} aria-live="polite">
        {phase === "show" && pick ? `Suggested: ${pick.title}` : ""}
      </span>
    </section>
  );
}
