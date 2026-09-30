"use client";

import { motion, useAnimate } from "framer-motion";
import { useEffect, useState } from "react";
import { useMotion } from "@/lib/sensory";

export const JAR_EVENT = "pos:jar-add";

/** Tell the jar something was just finished (it fills before the server confirms). */
export function addToJar(title: string) {
  window.dispatchEvent(new CustomEvent(JAR_EVENT, { detail: title }));
}

const PEBBLE_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--seq-2)", "var(--accent)"];
const JAR_SLOTS = 12;

/**
 * The done jar fills through the day — celebrating what's finished, never
 * counting what isn't. Each finished thing becomes a folded paper pebble.
 */
export function DoneJar({ done }: { done: Array<{ id: string; title: string }> }) {
  const [extra, setExtra] = useState<string[]>([]);
  const [jarRef, animate] = useAnimate<HTMLDivElement>();
  const m = useMotion();

  useEffect(() => {
    const onAdd = (e: Event) => {
      const title = (e as CustomEvent<string>).detail;
      setExtra((x) => (done.some((d) => d.title === title) ? x : [...x, title]));
      if (jarRef.current && !m.reduced) {
        const a = m.level === "calm" ? 0.03 : m.level === "playful" ? 0.1 : 0.06;
        void animate(jarRef.current, { scale: [1, 1 + a, 1 - a / 2, 1] }, { duration: 0.5 });
      }
    };
    window.addEventListener(JAR_EVENT, onAdd);
    return () => window.removeEventListener(JAR_EVENT, onAdd);
  }, [animate, done, jarRef, m.level, m.reduced]);

  const titles = [...done.map((d) => d.title), ...extra.filter((t) => !done.some((d) => d.title === t))];
  const count = titles.length;

  return (
    <section className="flex flex-col rounded-lg bg-surface p-5 shadow-card" aria-label="Done today">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold tracking-tight">Done jar</h2>
        <span className="text-[12.5px] text-fg-muted">{count === 0 ? "Fills up as you go" : `${count} ${count === 1 ? "thing" : "things"} today`}</span>
      </header>
      <div className="flex items-end gap-5">
        <div ref={jarRef} data-done-jar className="relative h-[120px] w-[92px] shrink-0">
          <svg viewBox="0 0 92 120" className="absolute inset-0 size-full" aria-hidden>
            <rect x="24" y="2" width="44" height="10" rx="4" fill="var(--surface-3)" stroke="var(--outline)" />
            <path d="M18 14 h56 a8 8 0 0 1 8 8 v82 a14 14 0 0 1 -14 14 h-44 a14 14 0 0 1 -14 -14 v-82 a8 8 0 0 1 8 -8z" fill="var(--surface-2)" stroke="var(--outline)" strokeWidth="1.5" />
          </svg>
          <div className="absolute inset-x-[16px] bottom-[6px] flex flex-wrap-reverse content-start justify-center gap-[3px]">
            {titles.slice(0, JAR_SLOTS * 2).map((t, i) => (
              <motion.span
                key={`${t}-${i}`}
                initial={i >= done.length && !m.reduced ? { y: -60, opacity: 0 } : false}
                animate={{ y: 0, opacity: 1 }}
                transition={m.spring}
                className="block h-[11px] w-[17px] rounded-[4px]"
                style={{ background: PEBBLE_COLORS[i % PEBBLE_COLORS.length], transform: `rotate(${((i * 37) % 24) - 12}deg)` }}
                title={t}
              />
            ))}
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1 text-[13px]">
          {count === 0 ? (
            <li className="text-fg-muted">Whatever you finish today lands here — small things count.</li>
          ) : (
            titles.slice(-5).reverse().map((t, i) => (
              <li key={`${t}-${i}`} className="truncate text-fg-muted">
                <span className="mr-1.5 text-success">✓</span>
                {t}
              </li>
            ))
          )}
          {count > 5 && <li className="text-[12px] text-fg-subtle">…and {count - 5} more</li>}
        </ul>
      </div>
    </section>
  );
}
