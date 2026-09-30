"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { openGlobalQuickAdd } from "@/components/tasks/TaskEditor";
import { Dialog } from "@/components/ui/Dialog";

const GO: Record<string, { href: string; label: string }> = {
  w: { href: "/", label: "What now?" },
  d: { href: "/overview", label: "Overview" },
  t: { href: "/today", label: "Today" },
  k: { href: "/tasks", label: "Tasks" },
  c: { href: "/calendar", label: "Calendar" },
  h: { href: "/habits", label: "Habits" },
  o: { href: "/goals", label: "Goals" },
  n: { href: "/notes", label: "Notes" },
  i: { href: "/insights", label: "Insights" },
  s: { href: "/settings", label: "Settings" },
};

const SINGLE: Record<string, { href?: string; label: string }> = {
  n: { label: "New task" },
  b: { href: "/braindump", label: "Brain dump" },
  f: { href: "/focus", label: "Focus timer" },
  m: { href: "/mood", label: "Log mood" },
  l: { href: "/sleep", label: "Log sleep" },
};

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

/** Global single-key shortcuts (N, B, F, M, L), "G then X" navigation and "?" help. */
export function KeyboardShortcuts() {
  const router = useRouter();
  const [help, setHelp] = useState(false);
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || document.querySelector("[role=dialog]")) return;
      const key = e.key.toLowerCase();

      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        if (GO[key]) {
          e.preventDefault();
          router.push(GO[key].href);
        }
        return;
      }
      if (key === "g") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
        return;
      }
      if (e.key === "?") {
        setHelp(true);
        return;
      }
      if (key === "n") {
        e.preventDefault();
        openGlobalQuickAdd();
        return;
      }
      const target = SINGLE[key];
      if (target?.href) {
        e.preventDefault();
        router.push(target.href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <Dialog open={help} onClose={() => setHelp(false)} title="Keyboard shortcuts">
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13.5px]">
        <Row k="⌘ K">Command palette</Row>
        <Row k="?">This help</Row>
        {Object.entries(SINGLE).map(([k, v]) => (
          <Row key={k} k={k.toUpperCase()}>
            {v.label}
          </Row>
        ))}
        {Object.entries(GO).map(([k, v]) => (
          <Row key={`g${k}`} k={`G ${k.toUpperCase()}`}>
            Go to {v.label}
          </Row>
        ))}
      </div>
    </Dialog>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-outline/60 py-1.5">
      <span className="text-fg-muted">{children}</span>
      <kbd className="rounded-[6px] border border-outline bg-surface-3 px-1.5 py-0.5 font-sans text-[11.5px] font-medium">{k}</kbd>
    </div>
  );
}
