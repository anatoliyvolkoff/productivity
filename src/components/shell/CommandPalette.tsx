"use client";

import { CornerDownLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/lib/nav";

const OPEN_EVENT = "pos:open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_ITEMS;
    // Label matches rank above description-only matches.
    const byLabel = NAV_ITEMS.filter((i) => i.label.toLowerCase().includes(q));
    const byDescription = NAV_ITEMS.filter(
      (i) => !byLabel.includes(i) && i.description.toLowerCase().includes(q),
    );
    return [...byLabel, ...byDescription];
  }, [query]);

  const show = () => {
    setQuery("");
    setIndex(0);
    setOpen(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) setOpen(false);
        else show();
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
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 pt-[14vh] backdrop-blur-sm"
      onMouseDown={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        className="w-[560px] overflow-hidden rounded-xl border border-outline bg-glass shadow-2xl backdrop-blur-2xl"
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
              go(results[index].href);
            }
          }}
          placeholder="Jump to…"
          className="h-14 w-full border-b border-outline bg-transparent px-5 text-[16px] outline-none placeholder:text-fg-subtle"
        />
        <ul className="max-h-[360px] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-fg-subtle">No matches</li>}
          {results.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <button
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left",
                    i === index ? "bg-primary text-on-primary" : "text-fg",
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={1.75} />
                  <span className="text-[14px] font-medium">{item.label}</span>
                  <span className={cn("truncate text-[13px]", i === index ? "text-on-primary/75" : "text-fg-subtle")}>
                    {item.description}
                  </span>
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
