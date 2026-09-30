"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Sofa } from "lucide-react";
import { useState } from "react";
import { saveTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/Button";
import { addDaysISO, todayISO } from "@/lib/domain/dates";
import { useRunner } from "@/lib/hooks/useRunner";
import { useMotion } from "@/lib/sensory";

type Item = { id: string; title: string; dueDate: string | null };

/**
 * Tasks whose date has passed rest here quietly — no red, no count badge.
 * Opening it asks one kind question per task: still relevant?
 */
export function WheneverDrawer({ tasks }: { tasks: Item[] }) {
  const [open, setOpen] = useState(false);
  const m = useMotion();
  if (tasks.length === 0) return null;
  return (
    <section className="rounded-lg bg-surface-2 ring-1 ring-outline">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-3.5 text-left">
        <Sofa className="size-4 text-fg-muted" />
        <span className="text-[14px] font-medium">Whenever</span>
        <span className="text-[12.5px] text-fg-muted">A few things from earlier days are resting here. No rush.</span>
        <motion.span className="ml-auto text-fg-muted" animate={{ rotate: open ? 180 : 0 }} transition={m.soft}>
          <ChevronDown className="size-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={m.soft} className="overflow-hidden">
            <ul className="flex flex-col gap-1 px-3 pb-3">
              <AnimatePresence initial={false}>
                {tasks.map((t) => (
                  <WheneverRow key={t.id} task={t} />
                ))}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function WheneverRow({ task }: { task: Item }) {
  const { pending, run } = useRunner();
  const m = useMotion();
  const today = todayISO();
  return (
    <motion.li
      layout={!m.reduced}
      initial={false}
      exit={{ opacity: 0, x: m.d(24) }}
      transition={m.soft}
      className="flex items-center gap-3 rounded-md bg-surface px-3 py-2.5"
    >
      <span className="min-w-0 flex-1 truncate text-[14px]">{task.title}</span>
      <span className="text-[12px] text-fg-subtle">Still relevant?</span>
      <div className="flex gap-1">
        <Button size="sm" variant="tonal" disabled={pending} onClick={() => run(() => saveTask(task.id, { dueDate: today }), { success: "On today" })}>
          Today
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => saveTask(task.id, { dueDate: addDaysISO(today, 7) }), { success: "Next week it is" })}>
          Next week
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => saveTask(task.id, { dueDate: null }), { success: "No date — it's in your open tasks" })}>
          No date
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => saveTask(task.id, { status: "dropped" }), { success: "Let go. That's allowed." })}>
          Let it go
        </Button>
      </div>
    </motion.li>
  );
}
