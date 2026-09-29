"use client";

import { CalendarClock, CornerDownLeft, Flag, Hash, Timer, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { quickAddTask } from "@/app/actions/tasks";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { relativeDayLabel, todayISO } from "@/lib/domain/dates";
import { parseQuickAdd } from "@/lib/domain/quickAdd";
import { useRunner } from "@/lib/hooks/useRunner";
import type { TaskInput } from "@/lib/services/tasks";

/** Natural-language task input with a live preview of what was understood. */
export function QuickAddInput({
  defaults,
  placeholder = "Add a task…  e.g. Call Anna tomorrow 10am #work !2 ~30m",
  autoFocus,
  onAdded,
  className,
}: {
  defaults?: Partial<TaskInput>;
  placeholder?: string;
  autoFocus?: boolean;
  onAdded?: () => void;
  className?: string;
}) {
  const [text, setText] = useState("");
  const { pending, run } = useRunner();
  const today = todayISO();
  const parsed = useMemo(() => (text.trim() ? parseQuickAdd(text, today) : null), [text, today]);

  const submit = () => {
    if (!text.trim()) return;
    run(() => quickAddTask(text, defaults), {
      onSuccess: (data) => {
        setText("");
        onAdded?.();
        toast(data.scheduled ? "Task added and time-blocked" : "Task added");
      },
    });
  };

  return (
    <div className={cn("rounded-lg bg-surface shadow-card", className)}>
      <div className="flex items-center gap-3 px-4">
        <span className="grid size-[22px] shrink-0 place-items-center rounded-full border-2 border-dashed border-fg-subtle/60" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
            if (e.key === "Escape") setText("");
          }}
          autoFocus={autoFocus}
          disabled={pending}
          placeholder={placeholder}
          className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-subtle"
          aria-label="New task"
        />
        {text && (
          <kbd className="flex items-center gap-1 text-[11px] text-fg-subtle">
            <CornerDownLeft className="size-3.5" /> add
          </kbd>
        )}
      </div>
      {parsed && (parsed.dueDate || parsed.tags.length > 0 || parsed.priority || parsed.effortMin || parsed.energy) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-outline px-4 py-2 text-[12px] text-fg-muted">
          <span className="mr-1 font-medium text-fg">{parsed.title || "…"}</span>
          {parsed.dueDate && (
            <Pill icon={CalendarClock}>
              {relativeDayLabel(parsed.dueDate, today)}
              {parsed.time && ` · ${parsed.time} block`}
            </Pill>
          )}
          {parsed.priority && <Pill icon={Flag}>P{parsed.priority}</Pill>}
          {parsed.effortMin && <Pill icon={Timer}>{parsed.effortMin} min</Pill>}
          {parsed.energy && <Pill icon={Zap}>{parsed.energy} energy</Pill>}
          {parsed.tags.map((t) => (
            <Pill key={t} icon={Hash}>
              {t}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({ icon: Icon, children }: { icon: typeof Flag; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 font-medium text-primary">
      <Icon className="size-3" />
      {children}
    </span>
  );
}
