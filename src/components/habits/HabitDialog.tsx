"use client";

import { Archive, Trash2 } from "lucide-react";
import { createContext, useContext, useState } from "react";
import { addHabit, archiveHabitAction, removeHabit, saveHabit } from "@/app/actions/habits";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import type { Habit, HabitSchedule } from "@/lib/db/schema";
import { useRunner } from "@/lib/hooks/useRunner";

export const HABIT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#8e6bd9", "#e87ba4", "#eda100", "#5ac8fa", "#d03b3b"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Option = { id: string; title: string };
type Ctx = { open: (habit?: Habit) => void };
const HabitDialogContext = createContext<Ctx>({ open: () => {} });
export const useHabitDialog = () => useContext(HabitDialogContext);

export function HabitDialogProvider({ habits, goals, children }: { habits: Option[]; goals: Option[]; children: React.ReactNode }) {
  const [state, setState] = useState<{ habit?: Habit } | null>(null);
  return (
    <HabitDialogContext.Provider value={{ open: (habit) => setState({ habit }) }}>
      {children}
      {state && <HabitDialog key={state.habit?.id ?? "new"} habit={state.habit} habits={habits} goals={goals} onClose={() => setState(null)} />}
    </HabitDialogContext.Provider>
  );
}

function HabitDialog({ habit, habits, goals, onClose }: { habit?: Habit; habits: Option[]; goals: Option[]; onClose: () => void }) {
  const { pending, run } = useRunner();
  const [form, setForm] = useState({
    title: habit?.title ?? "",
    type: habit?.type ?? ("boolean" as Habit["type"]),
    target: String(habit?.target ?? 1),
    unit: habit?.unit ?? "",
    scheduleKind: habit?.schedule.kind ?? ("daily" as HabitSchedule["kind"]),
    days: habit?.schedule.kind === "weekdays" ? habit.schedule.days : [1, 2, 3, 4, 5],
    times: habit?.schedule.kind === "per_week" ? String(habit.schedule.times) : "3",
    cue: habit?.cue ?? "",
    stackAfterHabitId: habit?.stackAfterHabitId ?? "",
    goalId: habit?.goalId ?? "",
    autoSource: habit?.autoSource ?? ("none" as Habit["autoSource"]),
    isNegative: habit?.isNegative ?? false,
    color: habit?.color ?? HABIT_COLORS[0],
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const anchor = habits.find((h) => h.id === form.stackAfterHabitId);

  const input = () => ({
    title: form.title,
    type: form.type,
    target: form.type === "boolean" ? 1 : Number(form.target) || 1,
    unit: form.type === "count" ? form.unit : null,
    schedule:
      form.scheduleKind === "weekdays"
        ? ({ kind: "weekdays", days: form.days } as const)
        : form.scheduleKind === "per_week"
          ? ({ kind: "per_week", times: Number(form.times) || 1 } as const)
          : ({ kind: "daily" } as const),
    cue: form.cue,
    stackAfterHabitId: form.stackAfterHabitId || null,
    goalId: form.goalId || null,
    autoSource: form.type === "boolean" ? ("none" as const) : form.autoSource,
    isNegative: form.isNegative,
    color: form.color,
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={habit ? "Edit habit" : "New habit"}
      className="max-w-[600px]"
      footer={
        <>
          {habit && (
            <>
              <Button variant="ghost" className="mr-auto" disabled={pending} onClick={() => run(() => archiveHabitAction(habit.id), { success: "Archived", onSuccess: onClose })}>
                <Archive className="size-4" /> Archive
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() => {
                  if (confirm("Delete this habit and its history?")) run(() => removeHabit(habit.id), { success: "Habit deleted", onSuccess: onClose });
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={pending} onClick={() => run(() => (habit ? saveHabit(habit.id, input()) : addHabit(input())), { success: habit ? "Saved" : "Habit added", onSuccess: onClose })}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input autoFocus value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Meditate, Read, Walk 8,000 steps" className="h-11 text-[16px] font-medium" />

        <Field label="Type">
          <Segmented
            value={form.type}
            onChange={(type) => set({ type })}
            options={[
              { value: "boolean", label: "Yes / no" },
              { value: "count", label: "Count" },
              { value: "duration", label: "Minutes" },
            ]}
          />
        </Field>
        {form.type !== "boolean" && (
          <div className="grid grid-cols-3 gap-3">
            <Field label={form.type === "duration" ? "Minutes per day" : "Target per day"}>
              <Input type="number" min={1} value={form.target} onChange={(e) => set({ target: e.target.value })} />
            </Field>
            {form.type === "count" && (
              <Field label="Unit">
                <Input value={form.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="glasses" />
              </Field>
            )}
            <Field label="Fill automatically" className={form.type === "count" ? "" : "col-span-2"}>
              <Select value={form.autoSource} onChange={(e) => set({ autoSource: e.target.value as Habit["autoSource"] })}>
                <option value="none">No — I log it</option>
                {form.type === "duration" && <option value="focus_minutes">From focus sessions</option>}
                {form.type === "count" && <option value="tasks_done">From tasks completed</option>}
              </Select>
            </Field>
          </div>
        )}

        <Field label="When">
          <Segmented
            value={form.scheduleKind}
            onChange={(scheduleKind) => set({ scheduleKind })}
            options={[
              { value: "daily", label: "Every day" },
              { value: "weekdays", label: "Specific days" },
              { value: "per_week", label: "Times per week" },
            ]}
          />
        </Field>
        {form.scheduleKind === "weekdays" && (
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => set({ days: form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d] })}
                className={cn("h-9 w-12 rounded-full text-[13px] font-medium transition", form.days.includes(d) ? "bg-primary text-on-primary" : "bg-surface-3 text-fg-muted")}
              >
                {DAYS[d]}
              </button>
            ))}
          </div>
        )}
        {form.scheduleKind === "per_week" && (
          <div className="flex items-center gap-2 text-[14px]">
            <Input type="number" min={1} max={7} value={form.times} onChange={(e) => set({ times: e.target.value })} className="w-20" /> times a week, any days
          </div>
        )}

        <Field label="Stack it after an existing habit (optional)">
          <Select value={form.stackAfterHabitId} onChange={(e) => set({ stackAfterHabitId: e.target.value })}>
            <option value="">—</option>
            {habits
              .filter((h) => h.id !== habit?.id)
              .map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Cue — an if-then plan roughly doubles follow-through" hint={`e.g. "After ${anchor ? anchor.title.toLowerCase() : "my morning coffee"}, at the kitchen table, I will ${form.title ? form.title.toLowerCase() : "…"}"`}>
          <Input value={form.cue} onChange={(e) => set({ cue: e.target.value })} placeholder={`After ${anchor ? anchor.title.toLowerCase() : "[existing routine]"}, I will ${form.title ? form.title.toLowerCase() : "[habit]"}`} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Supports goal">
            <Select value={form.goalId} onChange={(e) => set({ goalId: e.target.value })}>
              <option value="">—</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Color">
            <div className="flex h-10 items-center gap-1.5">
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
        <label className="flex items-center gap-2 text-[13.5px]">
          <input type="checkbox" checked={form.isNegative} onChange={(e) => set({ isNegative: e.target.checked })} /> A habit to avoid (check it off when you kept to it)
        </label>
      </div>
    </Dialog>
  );
}

export function NewHabitButton() {
  const { open } = useHabitDialog();
  return (
    <Button variant="primary" onClick={() => open()}>
      New habit
    </Button>
  );
}

export function EditHabitButton({ habit }: { habit: Habit }) {
  const { open } = useHabitDialog();
  return (
    <button type="button" onClick={() => open(habit)} className="text-[12px] text-fg-muted hover:text-primary">
      Edit
    </button>
  );
}
