"use client";

import { Plus, Search } from "lucide-react";
import { openGlobalQuickAdd } from "@/components/tasks/TaskEditor";
import { useNow } from "@/lib/hooks/useNow";
import { pad2 } from "@/lib/time";
import { openCommandPalette } from "./CommandPalette";
import { RunningIndicator, type RunningSessionInfo, type RunningTimerInfo } from "./RunningIndicator";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar({ session, timer }: { session: RunningSessionInfo | null; timer: RunningTimerInfo | null }) {
  const now = useNow();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-outline bg-glass px-8 backdrop-blur-xl">
      <div className="flex items-baseline gap-3">
        <span className="text-[17px] font-semibold tracking-tight">
          {now ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : " "}
        </span>
        <span className="tabular text-[15px] text-fg-muted">{now ? `${pad2(now.getHours())}:${pad2(now.getMinutes())}` : ""}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <RunningIndicator session={session} timer={timer} />
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex h-9 w-64 items-center gap-2 rounded-full bg-surface-3 px-3.5 text-[13px] text-fg-subtle transition hover:text-fg-muted"
        >
          <Search className="size-4" strokeWidth={1.75} />
          <span className="flex-1 text-left">Search or jump to…</span>
          <kbd className="rounded-[5px] border border-outline px-1.5 font-sans text-[11px]">⌘K</kbd>
        </button>
        <button
          type="button"
          onClick={openGlobalQuickAdd}
          className="grid size-9 place-items-center rounded-full bg-primary text-on-primary shadow-sm transition hover:brightness-110"
          aria-label="New task (N)"
          title="New task (N)"
        >
          <Plus className="size-[18px]" strokeWidth={2.25} />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
