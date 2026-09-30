"use client";

import { motion } from "framer-motion";
import { Check, ChevronDown, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { completeFocus, startFocus } from "@/app/actions/focus";
import { notNow, toggleTaskDone } from "@/app/actions/tasks";
import { StepsPanel } from "@/components/steps/StepsPanel";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/toast";
import { playChime } from "@/lib/chime";
import { useMotion } from "@/lib/sensory";

export type FocusSessionInfo = { id: string; startedAt: Date | string; plannedMin: number; pausedSec: number };
export type FocusResult = "done" | "notnow" | "minimize";

/** Time in words, not numbers — enough to orient, without a countdown to stare at. */
export function timeInWords(progress: number): string {
  if (progress >= 1) return "Time's up — finish your sentence, then stop or keep going";
  if (progress >= 0.85) return "Nearly there";
  if (progress >= 0.6) return "Past halfway";
  if (progress >= 0.45) return "About halfway";
  if (progress >= 0.15) return "Settling in";
  return "Just started";
}

/**
 * Full-screen focus: one task, its next tiny step, a slowly breathing
 * background and a horizon light that travels across as time passes.
 */
export function FocusMode({
  task,
  minutes,
  session: existing,
  onClose,
}: {
  task: { id: string; title: string };
  minutes: number;
  session?: FocusSessionInfo | null;
  onClose: (result: FocusResult) => void;
}) {
  const m = useMotion();
  const [session, setSession] = useState<FocusSessionInfo | null>(existing ?? null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const chimed = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    if (session || started.current) return;
    started.current = true;
    void startFocus({ taskId: task.id, preset: "custom", focusMin: minutes }).then((r) => {
      if (r.ok) setSession({ id: r.data.id, startedAt: r.data.startedAt, plannedMin: r.data.plannedMin, pausedSec: r.data.pausedSec });
      else toast.error(r.error);
    });
  }, [session, task.id, minutes]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose("minimize");
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const elapsedSec = session ? (now - new Date(session.startedAt).getTime()) / 1000 - session.pausedSec : 0;
  const progress = session ? Math.max(0, elapsedSec / (session.plannedMin * 60)) : 0;
  const words = timeInWords(progress);

  useEffect(() => {
    if (progress >= 1 && !chimed.current) {
      chimed.current = true;
      playChime("end");
    }
  }, [progress]);

  const finish = async (result: "done" | "notnow") => {
    setBusy(true);
    if (session) await completeFocus(session.id, {});
    const r = result === "done" ? await toggleTaskDone(task.id, true) : await notNow(task.id);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    onClose(result);
  };

  const breathe = m.reduced ? undefined : { duration: m.level === "calm" ? 28 : m.level === "playful" ? 14 : 20, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" as const };
  const sunX = `${Math.min(progress, 1) * 100}%`;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Focus: ${task.title}`}
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-bg text-fg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={m.slow}
    >
      {/* Breathing background: two soft color fields drifting very slowly. */}
      <motion.div
        className="decor pointer-events-none absolute -top-1/3 -left-1/4 size-[80vmax] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--primary-soft), transparent 65%)" }}
        animate={breathe ? { scale: [1, 1.08, 1], x: ["0%", "4%", "0%"] } : undefined}
        transition={breathe}
      />
      <motion.div
        className="decor pointer-events-none absolute -right-1/4 -bottom-1/3 size-[70vmax] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent-soft), transparent 65%)" }}
        animate={breathe ? { scale: [1.05, 1, 1.05], y: ["0%", "-3%", "0%"] } : undefined}
        transition={breathe}
      />

      <header className="relative flex items-center justify-between px-10 pt-8">
        <span className="text-[13px] text-fg-muted" aria-live="polite">
          {session ? words : "Getting ready…"}
        </span>
        <Button variant="ghost" size="sm" onClick={() => onClose("minimize")} aria-label="Minimize (Esc) — the session keeps going">
          <ChevronDown className="size-4" /> Minimize
        </Button>
      </header>

      <main className="relative mx-auto flex w-full max-w-[640px] flex-1 flex-col justify-center gap-8 px-8">
        <h1 className="text-center text-[30px] leading-tight font-semibold tracking-tight">{task.title}</h1>
        <div className="rounded-xl bg-glass p-5 shadow-card ring-1 ring-outline backdrop-blur-xl">
          <StepsPanel taskId={task.id} taskTitle={task.title} compact />
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" size="lg" disabled={busy} onClick={() => void finish("notnow")}>
            <Undo2 className="size-4" /> Not now
          </Button>
          <Button variant="primary" size="lg" disabled={busy} onClick={() => void finish("done")}>
            <Check className="size-4" /> Done
          </Button>
        </div>
      </main>

      {/* Horizon timer: the light travels left to right as time passes; the sky warms. */}
      <div className="relative h-[22vh] w-full" aria-hidden>
        <div className="absolute inset-0 transition-opacity duration-[3000ms]" style={{ opacity: Math.min(progress, 1) * 0.6, background: "linear-gradient(to top, var(--accent-soft), transparent)" }} />
        <div className="absolute inset-x-10 bottom-[38%] h-px bg-outline" />
        <div className="absolute inset-x-10 bottom-[38%]">
          <div
            className="absolute bottom-0 size-16 -translate-x-1/2 translate-y-1/2 rounded-full transition-[left] duration-[5000ms] ease-linear"
            style={{ left: sunX, background: "radial-gradient(circle, var(--accent) 0%, color-mix(in srgb, var(--accent) 35%, transparent) 35%, transparent 70%)" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
