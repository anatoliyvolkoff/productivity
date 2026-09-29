"use client";

import { CheckCircle2, Minus, Plus, Target, Timer, X } from "lucide-react";
import { useState } from "react";
import { addGoalMilestone, bumpGoal, removeGoalMilestone, saveGoal, toggleGoalMilestone } from "@/app/actions/goals";
import { HEALTH_TONE } from "@/components/dashboard/GoalsCard";
import { Button } from "@/components/ui/Button";
import { CircleCheck } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Chip";
import { ProgressBar } from "@/components/ui/Progress";
import { formatMinutes } from "@/lib/domain/dates";
import { HEALTH_LABELS } from "@/lib/domain/goals";
import { useRunner } from "@/lib/hooks/useRunner";
import type { GoalView } from "@/lib/services/goals";
import { useGoalDialog } from "./GoalDialog";

export function GoalCard({
  goal: g,
  tasks,
  habits,
  subGoals = [],
}: {
  goal: GoalView;
  tasks: Array<{ id: string; title: string }>;
  habits: string[];
  /** Goals that serve this one (shown for visions). */
  subGoals?: Array<{ id: string; title: string; progress: number }>;
}) {
  const { open } = useGoalDialog();
  const { pending, run } = useRunner();
  const [milestone, setMilestone] = useState("");
  const color = g.color ?? "var(--series-1)";
  const pct = Math.round(g.progress * 100);
  const left = 100 - pct;

  return (
    <article className={`flex flex-col gap-3 rounded-lg bg-surface p-5 shadow-card ${pending ? "opacity-70" : ""}`} style={{ borderTop: `3px solid ${color}` }}>
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold tracking-tight">{g.title}</h3>
          {g.why && <p className="mt-0.5 text-[12.5px] text-fg-muted italic">{g.why}</p>}
        </div>
        <Badge tone={HEALTH_TONE[g.health]}>{HEALTH_LABELS[g.health]}</Badge>
        <button type="button" onClick={() => open(g)} className="text-[12px] text-fg-muted hover:text-primary">
          Edit
        </button>
      </header>

      {g.horizon === "vision" ? (
        <div className="flex flex-col gap-2">
          {subGoals.length === 0 ? (
            <p className="text-[13px] text-fg-subtle">Link goals to this vision with “Part of”.</p>
          ) : (
            subGoals.map((c) => (
              <div key={c.id}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="truncate">{c.title}</span>
                  <span className="text-fg-muted">{Math.round(c.progress * 100)}%</span>
                </div>
                <ProgressBar value={c.progress} color={color} height={6} />
              </div>
            ))
          )}
          {habits.length > 0 && (
            <p className="text-[12.5px] text-fg-muted">
              <b className="font-medium text-fg">Daily practice:</b> {habits.join(" · ")}
              {g.habitAdherence !== null && ` — ${Math.round(g.habitAdherence * 100)}% kept`}
            </p>
          )}
        </div>
      ) : (
      <div>
        <ProgressBar value={g.progress} expected={g.expected} color={color} height={10} />
        <div className="mt-1.5 flex justify-between text-[12px] text-fg-muted">
          <span>
            <b className="text-fg">{pct}%</b>
            {g.expected !== null && g.health !== "done" && ` · expected ${Math.round(g.expected * 100)}% by today`}
          </span>
          <span>{g.daysLeft === null ? "No deadline" : g.daysLeft >= 0 ? `${g.daysLeft} days left` : `${-g.daysLeft} days overdue`}</span>
        </div>
        {g.progress >= 0.7 && g.progress < 1 && <p className="mt-1 text-[12.5px] font-medium" style={{ color }}>Only {left}% to go — the finish line is in sight.</p>}
      </div>
      )}

      {g.type === "numeric" && (
        <div className="flex items-center gap-2">
          <Button size="icon-sm" variant="secondary" aria-label="Decrease" onClick={() => run(() => bumpGoal(g.id, -1))}>
            <Minus className="size-3.5" />
          </Button>
          <span className="text-[15px] font-semibold">
            {g.currentValue} / {g.targetValue ?? "?"} {g.unit}
          </span>
          <Button size="icon-sm" variant="secondary" aria-label="Increase" onClick={() => run(() => bumpGoal(g.id, 1))}>
            <Plus className="size-3.5" />
          </Button>
        </div>
      )}

      {g.horizon !== "vision" && (g.type === "milestone" || g.milestoneList.length > 0) && (
        <div>
          <div className="mb-1 text-[12px] font-medium text-fg-muted">
            Milestones {g.milestoneList.length > 0 && `· ${g.milestoneList.filter((m) => m.doneAt).length}/${g.milestoneList.length}`}
          </div>
          <ul className="flex flex-col">
            {g.milestoneList.map((m) => (
              <li key={m.id} className="group flex items-center gap-2 py-1">
                <CircleCheck checked={Boolean(m.doneAt)} size={18} color={color} label={`Complete ${m.title}`} onChange={(done) => run(() => toggleGoalMilestone(m.id, done))} />
                <span className={`flex-1 text-[13.5px] ${m.doneAt ? "text-fg-subtle line-through" : ""}`}>{m.title}</span>
                <button type="button" aria-label="Remove milestone" className="text-fg-subtle opacity-0 group-hover:opacity-100 hover:text-danger" onClick={() => run(() => removeGoalMilestone(m.id))}>
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (milestone.trim()) run(() => addGoalMilestone(g.id, milestone), { onSuccess: () => setMilestone("") });
            }}
          >
            <input value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="+ Add milestone" className="w-full bg-transparent py-1 text-[13px] outline-none placeholder:text-fg-subtle" />
          </form>
        </div>
      )}

      {g.horizon !== "vision" && (
      <dl className="grid grid-cols-3 gap-2 border-t border-outline pt-3 text-[12px]">
        <div>
          <dt className="flex items-center gap-1 text-fg-muted">
            <CheckCircle2 className="size-3.5" /> Tasks
          </dt>
          <dd className="font-semibold">
            {g.taskCounts.done}/{g.taskCounts.total}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-fg-muted">
            <Target className="size-3.5" /> Habits
          </dt>
          <dd className="font-semibold">{g.habitAdherence === null ? "—" : `${Math.round(g.habitAdherence * 100)}% kept`}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-fg-muted">
            <Timer className="size-3.5" /> Time
          </dt>
          <dd className="font-semibold">{formatMinutes(g.trackedMin)}</dd>
        </div>
      </dl>
      )}
      {g.horizon !== "vision" && (tasks.length > 0 || habits.length > 0) && (
        <div className="text-[12.5px] text-fg-muted">
          {tasks.length > 0 && (
            <p className="truncate">
              <b className="font-medium text-fg">Next:</b> {tasks.slice(0, 3).map((t) => t.title).join(" · ")}
            </p>
          )}
          {habits.length > 0 && (
            <p className="truncate">
              <b className="font-medium text-fg">Habits:</b> {habits.join(" · ")}
            </p>
          )}
        </div>
      )}
      {g.status !== "done" && g.progress >= 1 && (
        <Button size="sm" variant="tonal" className="self-start" onClick={() => run(() => saveGoal(g.id, { status: "done" }), { success: "Goal completed 🎉" })}>
          Mark as achieved
        </Button>
      )}
    </article>
  );
}
