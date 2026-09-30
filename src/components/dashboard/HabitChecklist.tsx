"use client";

import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useOptimistic } from "react";
import { setHabitValue, stepHabit } from "@/app/actions/habits";
import { CircleCheck } from "@/components/ui/Checkbox";
import { cn } from "@/lib/cn";
import { todayISO } from "@/lib/domain/dates";
import { useRunner } from "@/lib/hooks/useRunner";

export type HabitItem = {
  id: string;
  title: string;
  type: "boolean" | "count" | "duration";
  target: number;
  unit: string | null;
  cue: string | null;
  color: string | null;
  todayValue: number;
  doneToday: boolean;
  autoSource: "none" | "focus_minutes" | "tasks_done";
  recent: { done: number; of: number };
};

/** Today's habits: tap to check, +/− for counts. Shows "x of 7" — never a streak that resets. */
export function HabitChecklist({ habits, showCue = false }: { habits: HabitItem[]; showCue?: boolean }) {
  if (habits.length === 0)
    return (
      <p className="py-4 text-center text-[13px] text-fg-subtle">
        No habits scheduled today. <Link href="/habits" className="text-primary">Add one</Link>
      </p>
    );
  return (
    <ul className="flex flex-col">
      {habits.map((h) => (
        <HabitRow key={h.id} habit={h} showCue={showCue} />
      ))}
    </ul>
  );
}

function HabitRow({ habit, showCue }: { habit: HabitItem; showCue: boolean }) {
  const { run } = useRunner();
  const today = todayISO();
  const [value, setValue] = useOptimistic(habit.todayValue);
  const done = value >= habit.target;
  const color = habit.color ?? "var(--series-2)";
  const auto = habit.autoSource !== "none";

  return (
    <li className="flex items-center gap-3 py-2">
      {habit.type === "boolean" ? (
        <CircleCheck
          checked={done}
          color={color}
          label={`Mark ${habit.title}`}
          onChange={(next) =>
            run(async () => {
              setValue(next ? 1 : 0);
              return setHabitValue(habit.id, today, next ? 1 : 0);
            })
          }
        />
      ) : (
        <div className="relative size-[22px] shrink-0">
          <svg viewBox="0 0 22 22" className="size-[22px] -rotate-90" aria-hidden>
            <circle cx={11} cy={11} r={9} fill="none" stroke={color} strokeOpacity={0.2} strokeWidth={3} />
            <circle
              cx={11}
              cy={11}
              r={9}
              fill="none"
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 9}
              strokeDashoffset={2 * Math.PI * 9 * (1 - Math.min(1, value / habit.target))}
            />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[14px]", done && "text-fg-muted")}>{habit.title}</div>
        {showCue && habit.cue ? (
          <div className="truncate text-[11.5px] text-fg-subtle">{habit.cue}</div>
        ) : null}
      </div>
      {habit.type !== "boolean" && (
        <div className="flex items-center gap-1">
          <span className="tabular text-[12.5px] text-fg-muted">
            {Math.round(value)}/{habit.target}
            {habit.type === "duration" ? "m" : ""}
          </span>
          {!auto && (
            <>
              <StepButton
                label="Less"
                onClick={() =>
                  run(async () => {
                    setValue(Math.max(0, value - (habit.type === "duration" ? 5 : 1)));
                    return stepHabit(habit.id, today, habit.type === "duration" ? -5 : -1);
                  })
                }
              >
                <Minus className="size-3" />
              </StepButton>
              <StepButton
                label="More"
                onClick={() =>
                  run(async () => {
                    setValue(value + (habit.type === "duration" ? 5 : 1));
                    return stepHabit(habit.id, today, habit.type === "duration" ? 5 : 1);
                  })
                }
              >
                <Plus className="size-3" />
              </StepButton>
            </>
          )}
        </div>
      )}
      {habit.recent.of > 0 && (
        <span className="tabular text-[12px] text-fg-subtle" title={`Done ${habit.recent.done} of the last ${habit.recent.of} times it was planned`}>
          {habit.recent.done} of {habit.recent.of}
        </span>
      )}
    </li>
  );
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="grid size-6 place-items-center rounded-full bg-surface-3 text-fg-muted transition hover:text-fg">
      {children}
    </button>
  );
}
