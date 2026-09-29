"use client";

import { Trash2 } from "lucide-react";
import { createContext, useContext, useState } from "react";
import { addGoal, removeGoal, saveGoal } from "@/app/actions/goals";
import { HABIT_COLORS } from "@/components/habits/HabitDialog";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import type { Goal } from "@/lib/db/schema";
import { useRunner } from "@/lib/hooks/useRunner";

type Option = { id: string; title: string };
type Ctx = { open: (goal?: Goal, defaults?: Partial<Goal>) => void };
const GoalDialogContext = createContext<Ctx>({ open: () => {} });
export const useGoalDialog = () => useContext(GoalDialogContext);

export function GoalDialogProvider({ goals, children }: { goals: Option[]; children: React.ReactNode }) {
  const [state, setState] = useState<{ goal?: Goal; defaults?: Partial<Goal> } | null>(null);
  return (
    <GoalDialogContext.Provider value={{ open: (goal, defaults) => setState({ goal, defaults }) }}>
      {children}
      {state && <GoalDialog key={state.goal?.id ?? "new"} goal={state.goal} defaults={state.defaults} goals={goals} onClose={() => setState(null)} />}
    </GoalDialogContext.Provider>
  );
}

function GoalDialog({ goal, defaults, goals, onClose }: { goal?: Goal; defaults?: Partial<Goal>; goals: Option[]; onClose: () => void }) {
  const { pending, run } = useRunner();
  const g = { ...defaults, ...goal };
  const [form, setForm] = useState({
    title: g.title ?? "",
    why: g.why ?? "",
    horizon: g.horizon ?? ("quarter" as Goal["horizon"]),
    type: g.type ?? ("milestone" as Goal["type"]),
    targetValue: g.targetValue != null ? String(g.targetValue) : "",
    unit: g.unit ?? "",
    priority: String(g.priority ?? 2),
    startDate: g.startDate ?? "",
    dueDate: g.dueDate ?? "",
    parentId: g.parentId ?? "",
    color: g.color ?? HABIT_COLORS[0],
    tags: (g.tags ?? []).join(" "),
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const input = () => ({
    title: form.title,
    why: form.why,
    horizon: form.horizon,
    type: form.type,
    targetValue: form.type === "numeric" ? Number(form.targetValue) || null : null,
    unit: form.type === "numeric" ? form.unit : null,
    priority: Number(form.priority),
    startDate: form.startDate || null,
    dueDate: form.dueDate || null,
    parentId: form.parentId || null,
    color: form.color,
    tags: form.tags.split(/[\s,]+/).filter(Boolean),
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={goal ? "Edit goal" : "New goal"}
      className="max-w-[600px]"
      footer={
        <>
          {goal && (
            <Button
              variant="danger"
              className="mr-auto"
              disabled={pending}
              onClick={() => {
                if (confirm("Delete this goal? Linked tasks and habits are kept.")) run(() => removeGoal(goal.id), { success: "Goal deleted", onSuccess: onClose });
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={pending} onClick={() => run(() => (goal ? saveGoal(goal.id, input()) : addGoal(input())), { success: goal ? "Saved" : "Goal added", onSuccess: onClose })}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input autoFocus value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="What do you want to achieve?" className="h-11 text-[16px] font-medium" />
        <Field label="Why does it matter?" hint="Connecting a goal to your reasons keeps motivation up when it gets hard.">
          <Textarea value={form.why} onChange={(e) => set({ why: e.target.value })} className="min-h-16" />
        </Field>
        <Field label="Horizon">
          <Segmented
            value={form.horizon}
            onChange={(horizon) => set({ horizon })}
            options={[
              { value: "vision", label: "Vision" },
              { value: "year", label: "Year" },
              { value: "quarter", label: "Quarter" },
              { value: "month", label: "Month" },
            ]}
          />
        </Field>
        <Field label="Measure progress by">
          <Segmented
            value={form.type}
            onChange={(type) => set({ type })}
            options={[
              { value: "milestone", label: "Milestones & tasks" },
              { value: "numeric", label: "A number" },
              { value: "habit", label: "Linked habits" },
            ]}
          />
        </Field>
        {form.type === "numeric" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target">
              <Input type="number" value={form.targetValue} onChange={(e) => set({ targetValue: e.target.value })} placeholder="24" />
            </Field>
            <Field label="Unit">
              <Input value={form.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="books" />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => set({ priority: e.target.value })}>
              {[1, 2, 3, 4].map((p) => (
                <option key={p} value={p}>
                  P{p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Start">
            <Input type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </Field>
          <Field label="Due">
            <Input type="date" value={form.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Part of">
            <Select value={form.parentId} onChange={(e) => set({ parentId: e.target.value })}>
              <option value="">—</option>
              {goals
                .filter((x) => x.id !== goal?.id)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Tags">
            <Input value={form.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="work health" />
          </Field>
        </div>
        <Field label="Color">
          <div className="flex gap-1.5">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => set({ color: c })}
                className={cn("size-6 rounded-full transition", form.color === c && "ring-2 ring-fg ring-offset-2 ring-offset-surface")}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>
      </div>
    </Dialog>
  );
}

export function NewGoalButton({ defaults, label = "New goal", variant = "primary" }: { defaults?: Partial<Goal>; label?: string; variant?: "primary" | "tonal" }) {
  const { open } = useGoalDialog();
  return (
    <Button variant={variant} onClick={() => open(undefined, defaults)}>
      {label}
    </Button>
  );
}
