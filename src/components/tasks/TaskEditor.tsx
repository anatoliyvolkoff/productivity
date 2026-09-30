"use client";

import { Play, Star, Timer, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { startFocus, startTracking } from "@/app/actions/focus";
import { removeTask, saveTask, toggleTaskMit } from "@/app/actions/tasks";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import type { Task } from "@/lib/db/schema";
import { formatMinutes, todayISO } from "@/lib/domain/dates";
import { useRunner } from "@/lib/hooks/useRunner";
import { StepsPanel } from "@/components/steps/StepsPanel";
import { QuickAddInput } from "./QuickAddInput";

export type EditableTask = Task & { trackedMin?: number; goalTitle?: string | null };
type Option = { id: string; title: string };

type Ctx = {
  openTask: (task: EditableTask) => void;
  openQuickAdd: () => void;
  goals: Option[];
  tags: string[];
};

const TaskEditorContext = createContext<Ctx | null>(null);

export function useTaskEditor(): Ctx {
  const ctx = useContext(TaskEditorContext);
  if (!ctx) throw new Error("useTaskEditor must be used inside <TaskEditorProvider>");
  return ctx;
}

export const QUICK_ADD_EVENT = "pos:quick-add";

/** Provides a shared task dialog and the global quick-add dialog. */
export function TaskEditorProvider({ goals, tags, children }: { goals: Option[]; tags: string[]; children: React.ReactNode }) {
  const [task, setTask] = useState<EditableTask | null>(null);
  const [quickAdd, setQuickAdd] = useState(false);

  const openTask = useCallback((t: EditableTask) => setTask(t), []);
  const openQuickAdd = useCallback(() => setQuickAdd(true), []);
  const value = useMemo(() => ({ openTask, openQuickAdd, goals, tags }), [openTask, openQuickAdd, goals, tags]);

  return (
    <TaskEditorContext.Provider value={value}>
      {children}
      {task && <TaskDialog key={task.id} task={task} goals={goals} onClose={() => setTask(null)} />}
      <QuickAddListener onOpen={openQuickAdd} />
      <Dialog open={quickAdd} onClose={() => setQuickAdd(false)} title="New task">
        <QuickAddInput autoFocus onAdded={() => setQuickAdd(false)} className="shadow-none ring-1 ring-outline" />
        <p className="mt-3 text-[12px] leading-relaxed text-fg-subtle">
          Understands dates (<b>today</b>, <b>fri</b>, <b>oct 12</b>, <b>in 3 days</b>), times (<b>9am</b> creates a time block),{" "}
          <b>#tags</b>, priority <b>!1–!4</b>, effort <b>~45m</b> and energy <b>@high</b>.
        </p>
      </Dialog>
    </TaskEditorContext.Provider>
  );
}

function QuickAddListener({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    window.addEventListener(QUICK_ADD_EVENT, onOpen);
    return () => window.removeEventListener(QUICK_ADD_EVENT, onOpen);
  }, [onOpen]);
  return null;
}

const STATUSES: Array<{ value: Task["status"]; label: string }> = [
  { value: "inbox", label: "Inbox" },
  { value: "next", label: "To do" },
  { value: "active", label: "Doing" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done" },
  { value: "dropped", label: "Dropped" },
];

function TaskDialog({ task, goals, onClose }: { task: EditableTask; goals: Option[]; onClose: () => void }) {
  const router = useRouter();
  const { pending, run } = useRunner();
  const today = todayISO();
  const [form, setForm] = useState({
    title: task.title,
    notes: task.notes ?? "",
    status: task.status,
    priority: String(task.priority),
    dueDate: task.dueDate ?? "",
    effortMin: task.effortMin ? String(task.effortMin) : "",
    energy: task.energy ?? "",
    goalId: task.goalId ?? "",
    tags: task.tags.join(" "),
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const isMit = task.mitOn === today;

  const save = () =>
    run(
      () =>
        saveTask(task.id, {
          title: form.title,
          notes: form.notes,
          status: form.status,
          priority: Number(form.priority),
          dueDate: form.dueDate || null,
          effortMin: form.effortMin ? Number(form.effortMin) : null,
          energy: (form.energy || null) as Task["energy"],
          goalId: form.goalId || null,
          tags: form.tags.split(/[\s,]+/).filter(Boolean),
        }),
      { success: "Saved", onSuccess: onClose },
    );

  return (
    <Dialog
      open
      onClose={onClose}
      title="Task"
      className="max-w-[600px]"
      footer={
        <>
          <Button
            variant="danger"
            className="mr-auto"
            onClick={() => {
              if (confirm("Delete this task?")) run(() => removeTask(task.id), { success: "Task deleted", onSuccess: onClose });
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={pending}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="h-11 text-[16px] font-medium"
          aria-label="Title"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={isMit ? "accent" : "secondary"}
            onClick={() => run(() => toggleTaskMit(task.id, today), { success: isMit ? "Removed from top 3" : "Added to today's top 3", onSuccess: onClose })}
          >
            <Star className="size-3.5" fill={isMit ? "currentColor" : "none"} /> {isMit ? "Top 3 today" : "Make top 3 today"}
          </Button>
          <Button
            size="sm"
            variant="tonal"
            onClick={() =>
              run(() => startFocus({ taskId: task.id, preset: "pomodoro" }), {
                onSuccess: () => {
                  onClose();
                  router.push("/focus");
                },
              })
            }
          >
            <Play className="size-3.5" fill="currentColor" /> Focus on this
          </Button>
          <Button size="sm" variant="secondary" onClick={() => run(() => startTracking({ taskId: task.id }), { success: "Timer started", onSuccess: onClose })}>
            <Timer className="size-3.5" /> Track time
          </Button>
          {task.trackedMin ? <span className="self-center text-[12px] text-fg-muted">{formatMinutes(task.trackedMin)} tracked</span> : null}
        </div>
        <section className="rounded-md bg-surface-2 p-3 ring-1 ring-outline">
          <div className="mb-2 text-[12px] font-medium text-fg-muted">Tiny steps</div>
          <StepsPanel taskId={task.id} taskTitle={task.title} />
        </section>
        <Field label="Priority">
          <Segmented
            value={form.priority}
            onChange={(v) => set({ priority: v })}
            options={[1, 2, 3, 4].map((p) => ({ value: String(p), label: `P${p}` }))}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set({ status: e.target.value as Task["status"] })}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due">
            <Input type="date" value={form.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
          </Field>
          <Field label="Effort (min)">
            <Input type="number" min={5} step={5} value={form.effortMin} onChange={(e) => set({ effortMin: e.target.value })} placeholder="—" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Goal">
            <Select value={form.goalId} onChange={(e) => set({ goalId: e.target.value })}>
              <option value="">No goal</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Energy needed">
            <Select value={form.energy} onChange={(e) => set({ energy: e.target.value as "" })}>
              <option value="">Any</option>
              <option value="high">High — do at your peak</option>
              <option value="low">Low — fine in a dip</option>
            </Select>
          </Field>
        </div>
        <Field label="Tags" hint="Separate with spaces, e.g. work client-a">
          <Input value={form.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="work health" />
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Details, links, next steps…" />
        </Field>
      </div>
    </Dialog>
  );
}

export function openGlobalQuickAdd() {
  window.dispatchEvent(new Event(QUICK_ADD_EVENT));
}

