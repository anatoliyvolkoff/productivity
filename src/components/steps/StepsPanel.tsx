"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LifeBuoy, Plus, Sparkles, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { breakDown, getSteps, imStuck, newStep, removeStep, toggleStep } from "@/app/actions/steps";
import { Button } from "@/components/ui/Button";
import { CircleCheck } from "@/components/ui/Checkbox";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { StepNode } from "@/lib/domain/steps";
import { speak, useMotion, useSensory } from "@/lib/sensory";

type Step = StepNode<{ id: string; parentStepId: string | null; title: string; sortOrder: number; doneAt: Date | string | null }>;
type View = { tree: Step[]; current: Step | null; progress: { done: number; total: number } };

/**
 * Break a task into tiny steps; "I'm stuck" keeps splitting the current step.
 * New steps unfold like paper, one beneath another.
 */
export function StepsPanel({ taskId, taskTitle, compact = false, onChange }: { taskId: string; taskTitle: string; compact?: boolean; onChange?: (v: View) => void }) {
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState<"breakdown" | "stuck" | null>(null);
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState("");
  const { readAloud } = useSensory();

  const load = useCallback(async () => {
    const r = await getSteps(taskId);
    if (r.ok) {
      setView(r.data as View);
      onChange?.(r.data as View);
    }
  }, [taskId, onChange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the await
    void load();
  }, [load]);

  const act = (kind: "breakdown" | "stuck" | null, fn: () => Promise<{ ok: boolean; error?: string; data?: unknown }>, done?: string) => {
    if (kind) setBusy(kind);
    startTransition(async () => {
      const r = await fn();
      setBusy(null);
      if (!r.ok) return toast.error(r.error ?? "Something went wrong.");
      const data = r.data as { usedAi?: boolean } | undefined;
      if (data && data.usedAi === false && kind) toast("Here's a gentle start. Add an Anthropic key in Settings for steps written for this task.");
      else if (done) toast(done);
      await load();
    });
  };

  if (!view) return <div className="h-10 animate-pulse rounded-md bg-surface-3/60" aria-label="Loading steps" />;

  if (view.tree.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="tonal" size={compact ? "sm" : "md"} disabled={busy !== null} onClick={() => act("breakdown", () => breakDown(taskId))}>
          <Sparkles className="size-4" />
          {busy === "breakdown" ? "Finding tiny steps…" : "Break it down"}
        </Button>
        <span className="text-[12.5px] text-fg-muted">Turns “{taskTitle}” into small first steps.</span>
      </div>
    );
  }

  const current = view.current;
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col" aria-label="Steps">
        <StepList nodes={view.tree} currentId={current?.id ?? null} onToggle={(id, done) => act(null, () => toggleStep(id, done))} onDelete={(id) => act(null, () => removeStep(id))} />
      </ul>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {current ? (
          <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => act("stuck", () => imStuck({ stepId: current.id }))}>
            <LifeBuoy className="size-3.5" />
            {busy === "stuck" ? "Making it smaller…" : "I'm stuck"}
          </Button>
        ) : (
          <span className="text-[13px] text-fg-muted">Every step is done. 🌱</span>
        )}
        {readAloud && current && (
          <Button variant="ghost" size="sm" onClick={() => speak(current.title)} aria-label="Read the current step aloud">
            <Volume2 className="size-3.5" /> Read aloud
          </Button>
        )}
        <span className="ml-auto text-[12px] text-fg-subtle">
          {view.progress.done} of {view.progress.total} small steps
        </span>
      </div>

      {!compact && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const title = adding;
            setAdding("");
            act(null, () => newStep(taskId, title));
          }}
        >
          <Plus className="size-3.5 text-fg-subtle" />
          <input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            placeholder="Add your own step"
            className="h-8 flex-1 bg-transparent text-[13px] outline-none placeholder:text-fg-subtle"
            aria-label="Add your own step"
          />
        </form>
      )}
    </div>
  );
}

function StepList({ nodes, currentId, onToggle, onDelete }: { nodes: Step[]; currentId: string | null; onToggle: (id: string, done: boolean) => void; onDelete: (id: string) => void }) {
  const m = useMotion();
  return (
    <AnimatePresence initial={false}>
      {nodes.map((n, i) => {
        const isCurrent = n.id === currentId;
        const done = Boolean(n.doneAt);
        return (
          <motion.li
            key={n.id}
            // Paper unfold: each new step swings down from the one above it, in turn.
            initial={m.reduced ? { opacity: 0 } : m.level === "calm" ? { opacity: 0, y: -4 } : { opacity: 0, rotateX: -80, y: -6 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ ...m.soft, delay: m.reduced ? 0 : i * (m.level === "calm" ? 0.12 : 0.09) }}
            style={{ transformOrigin: "top center", transformPerspective: 600 }}
          >
            <div
              className={cn(
                "group flex items-center gap-2.5 rounded-md py-1.5 pr-1 transition-colors",
                isCurrent && "bg-primary-soft",
              )}
              style={{ paddingLeft: 8 + n.depth * 22 }}
            >
              <CircleCheck checked={done} size={18} label={`Done: ${n.title}`} onChange={(next) => onToggle(n.id, next)} />
              <span className={cn("min-w-0 flex-1 text-[14px] leading-snug", done && "text-fg-subtle line-through", isCurrent && "font-medium")}>{n.title}</span>
              {isCurrent && <span className="rounded-full bg-primary px-2 py-0.5 text-[10.5px] font-semibold text-on-primary">Now</span>}
              <button
                type="button"
                onClick={() => onDelete(n.id)}
                className="grid size-6 place-items-center rounded-full text-fg-subtle opacity-0 transition group-hover:opacity-100 hover:text-fg focus-visible:opacity-100"
                aria-label={`Remove step: ${n.title}`}
              >
                <X className="size-3.5" />
              </button>
            </div>
            {n.children.length > 0 && (
              <ul>
                <StepList nodes={n.children} currentId={currentId} onToggle={onToggle} onDelete={onDelete} />
              </ul>
            )}
          </motion.li>
        );
      })}
    </AnimatePresence>
  );
}
