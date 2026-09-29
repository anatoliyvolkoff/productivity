"use client";

import { Brain, CornerDownLeft, Moon, Play, Plus, Smile, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { openGlobalQuickAdd } from "@/components/tasks/TaskEditor";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/lib/nav";

const OPEN_EVENT = "pos:open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Command = { id: string; label: string; description: string; icon: LucideIcon; run: () => void; section: "Actions" | "Go to" };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      { id: "new-task", label: "New task", description: "Quick add with dates, #tags and !priority", icon: Plus, section: "Actions", run: openGlobalQuickAdd },
      { id: "focus", label: "Start focus session", description: "Pomodoro, 52/17 or 90-minute", icon: Play, section: "Actions", run: () => router.push("/focus") },
      { id: "dump", label: "Brain dump", description: "Empty your head", icon: Brain, section: "Actions", run: () => router.push("/braindump") },
      { id: "mood", label: "Log mood", description: "How do you feel right now?", icon: Smile, section: "Actions", run: () => router.push("/mood") },
      { id: "sleep", label: "Log sleep", description: "Last night's bedtime and wake time", icon: Moon, section: "Actions", run: () => router.push("/sleep") },
      ...NAV_ITEMS.map((i) => ({
        id: i.href,
        label: i.label,
        description: i.description,
        icon: i.icon,
        section: "Go to" as const,
        run: () => router.push(i.href),
      })),
    ],
    [router],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    // Label matches rank above description-only matches.
    const byLabel = commands.filter((c) => c.label.toLowerCase().includes(q));
    const byDescription = commands.filter((c) => !byLabel.includes(c) && c.description.toLowerCase().includes(q));
    return [...byLabel, ...byDescription];
  }, [query, commands]);

  useEffect(() => {
    const show = () => {
      setQuery("");
      setIndex(0);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) {
            setQuery("");
            setIndex(0);
          }
          return !o;
        });
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const choose = (c: Command) => {
    setOpen(false);
    c.run();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 pt-[14vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-label="Command palette"
        className="w-[580px] overflow-hidden rounded-xl border border-outline bg-glass shadow-2xl backdrop-blur-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[index]) {
              choose(results[index]);
            }
          }}
          placeholder="Type a command or page…"
          className="h-14 w-full border-b border-outline bg-transparent px-5 text-[16px] outline-none placeholder:text-fg-subtle"
        />
        <ul className="max-h-[400px] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-fg-subtle">No matches</li>}
          {results.map((c, i) => {
            const Icon = c.icon;
            const header = i === 0 || results[i - 1].section !== c.section;
            return (
              <li key={c.id}>
                {header && <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">{c.section}</div>}
                <button
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => choose(c)}
                  className={cn("flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left", i === index ? "bg-primary text-on-primary" : "text-fg")}
                >
                  <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                  <span className="text-[14px] font-medium whitespace-nowrap">{c.label}</span>
                  <span className={cn("truncate text-[13px]", i === index ? "text-on-primary/75" : "text-fg-subtle")}>{c.description}</span>
                  {i === index && <CornerDownLeft className="ml-auto size-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
