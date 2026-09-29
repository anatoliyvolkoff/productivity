"use client";

import { Search } from "lucide-react";
import { useNow } from "@/lib/hooks/useNow";
import { pad2 } from "@/lib/time";
import { openCommandPalette } from "./CommandPalette";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  const now = useNow();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-outline bg-glass px-8 backdrop-blur-xl">
      <div className="flex items-baseline gap-3">
        <span className="text-[17px] font-semibold tracking-tight">
          {now ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : " "}
        </span>
        <span className="tabular text-[15px] text-fg-muted">
          {now ? `${pad2(now.getHours())}:${pad2(now.getMinutes())}` : ""}
        </span>
      </div>

      <button
        type="button"
        onClick={openCommandPalette}
        className="ml-auto flex h-9 w-72 items-center gap-2 rounded-sm bg-surface-3 px-3 text-[13px] text-fg-subtle transition hover:text-fg-muted"
      >
        <Search className="size-4" strokeWidth={1.75} />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="rounded-[5px] border border-outline px-1.5 font-sans text-[11px]">⌘K</kbd>
      </button>

      <ThemeToggle />
    </header>
  );
}
