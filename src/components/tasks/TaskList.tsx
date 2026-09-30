"use client";

import { AlarmClock, CalendarDays, Play, Star, Target, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic } from "react";
import { startFocus, startTracking } from "@/app/actions/focus";
import { toggleTaskDone, toggleTaskMit } from "@/app/actions/tasks";
import { CircleCheck } from "@/components/ui/Checkbox";
import { PRIORITY_COLORS, PriorityFlag, TagChip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { formatMinutes, relativeDayLabel, todayISO } from "@/lib/domain/dates";
import { useRunner } from "@/lib/hooks/useRunner";
import type { EditableTask } from "./TaskEditor";
import { useTaskEditor } from "./TaskEditor";

export type ListTask = EditableTask & { trackedMin: number; goalTitle: string | null };

export function TaskList({
  tasks,
  tagColors = {},
  compact = false,
  showMitToggle = true,
  emptyText,
}: {
  tasks: ListTask[];
  tagColors?: Record<string, string | null>;
  compact?: boolean;
  showMitToggle?: boolean;
  emptyText?: string;
}) {
  if (tasks.length === 0 && emptyText) return <p className="px-2 py-6 text-center text-[13px] text-fg-subtle">{emptyText}</p>;
  return (
    <ul className="flex flex-col">
      {tasks.map((t) => (
        <TaskItem key={t.id} task={t} tagColors={tagColors} compact={compact} showMitToggle={showMitToggle} />
      ))}
    </ul>
  );
}

function TaskItem({
  task,
  tagColors,
  compact,
  showMitToggle,
}: {
  task: ListTask;
  tagColors: Record<string, string | null>;
  compact: boolean;
  showMitToggle: boolean;
}) {
  const router = useRouter();
  const { openTask } = useTaskEditor();
  const { run } = useRunner();
  const today = todayISO();
  const [done, setDone] = useOptimistic(task.status === "done");
  const isMit = task.mitOn === today;
  const whenever = task.dueDate !== null && task.dueDate < today && !done;

  return (
    <li
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-md px-2 transition hover:bg-surface-3/60",
        compact ? "py-2" : "py-2.5",
      )}
      onClick={() => openTask(task)}
    >
      <div className="pt-px">
        <CircleCheck
          checked={done}
          label={`Complete ${task.title}`}
          color={PRIORITY_COLORS[task.priority]}
          onChange={(next) =>
            run(async () => {
              setDone(next);
              return toggleTaskDone(task.id, next);
            }, { success: next ? "Nice — done" : undefined })
          }
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("truncate text-[14.5px]", done && "text-fg-subtle line-through")}>{task.title}</span>
          {isMit && <Star className="size-3.5 shrink-0 text-accent" fill="currentColor" aria-label="Top 3 today" />}
        </div>
        {!compact && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-fg-muted">
            {task.priority <= 2 && <PriorityFlag priority={task.priority} showLabel />}
            {task.dueDate && (
              <span className="inline-flex items-center gap-1" title={whenever ? `Was planned for ${task.dueDate}` : undefined}>
                <CalendarDays className="size-3.5" />
                {whenever ? "Whenever" : relativeDayLabel(task.dueDate, today)}
              </span>
            )}
            {task.goalTitle && (
              <span className="inline-flex items-center gap-1">
                <Target className="size-3.5" />
                {task.goalTitle}
              </span>
            )}
            {task.effortMin ? (
              <span className="inline-flex items-center gap-1">
                <AlarmClock className="size-3.5" />~{formatMinutes(task.effortMin)}
              </span>
            ) : null}
            {task.trackedMin > 0 && (
              <span className="inline-flex items-center gap-1">
                <Timer className="size-3.5" />
                {formatMinutes(task.trackedMin)}
              </span>
            )}
            {task.energy === "high" && <span className="text-accent">⚡ high energy</span>}
            {task.tags.map((t) => (
              <TagChip key={t} name={t} color={tagColors[t]} />
            ))}
          </div>
        )}
      </div>
      {!done && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          {showMitToggle && (
            <IconAction
              label={isMit ? "Remove from top 3" : "Make top 3 today"}
              onClick={() => run(() => toggleTaskMit(task.id, today))}
              active={isMit}
            >
              <Star className="size-4" fill={isMit ? "currentColor" : "none"} />
            </IconAction>
          )}
          <IconAction label="Track time" onClick={() => run(() => startTracking({ taskId: task.id }), { success: "Timer started" })}>
            <Timer className="size-4" />
          </IconAction>
          <IconAction
            label="Start focus session"
            onClick={() => run(() => startFocus({ taskId: task.id, preset: "pomodoro" }), { onSuccess: () => router.push("/focus") })}
          >
            <Play className="size-4" />
          </IconAction>
        </div>
      )}
    </li>
  );
}

function IconAction({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-full transition hover:bg-surface",
        active ? "text-accent" : "text-fg-subtle hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
