"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useMotion } from "@/lib/sensory";

/** A finished-task moment, in the style chosen in Settings (quiet / soft glow / confetti). */
export function Celebration({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const m = useMotion();
  const skip = m.reduced || m.celebration === "quiet";
  useEffect(() => {
    if (skip) onDone();
  }, [skip, onDone]);
  if (skip) return null;
  if (m.celebration === "glow") {
    return (
      <motion.div
        className="pointer-events-none fixed z-[75] size-[260px] rounded-full"
        style={{ left: x - 130, top: y - 130, background: "radial-gradient(circle, var(--primary-soft) 0%, transparent 70%)" }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 1, 0], scale: [0.6, 1.1, 1.25] }}
        transition={{ duration: m.level === "calm" ? 1.2 : 0.9, ease: "easeOut" }}
        onAnimationComplete={onDone}
        aria-hidden
      />
    );
  }
  const colors = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--accent)", "var(--seq-2)"];
  const n = m.level === "calm" ? 10 : m.level === "playful" ? 26 : 18;
  return (
    <div className="pointer-events-none fixed inset-0 z-[75]" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * Math.PI * 2;
        const dist = m.d(140) * (0.6 + ((i * 7) % 5) / 10);
        return (
          <motion.span
            key={i}
            className="absolute block h-2 w-3 rounded-[2px]"
            style={{ left: x, top: y, background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: [0, Math.sin(angle) * dist - 30, Math.sin(angle) * dist + 60], rotate: 360 + i * 20, opacity: [1, 1, 0] }}
            transition={{ duration: 1.1, ease: [0.2, 0.7, 0.4, 1] }}
            onAnimationComplete={i === 0 ? onDone : undefined}
          />
        );
      })}
    </div>
  );
}

/** The finished card folds into a slip and flies into the done jar. */
export function FlyToJar({ from, title, onDone }: { from: DOMRect; title: string; onDone: () => void }) {
  const m = useMotion();
  const [jar] = useState(() => (typeof document !== "undefined" ? (document.querySelector("[data-done-jar]")?.getBoundingClientRect() ?? null) : null));
  const skip = !jar || m.reduced;
  useEffect(() => {
    if (skip) onDone();
  }, [skip, onDone]);
  if (skip) return null;
  const startX = from.left + from.width / 2 - 70;
  const startY = from.top + from.height / 2 - 14;
  const endX = jar.left + jar.width / 2 - 70;
  const endY = jar.top + jar.height / 2 - 14;
  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-[76] w-[140px] truncate rounded-md bg-surface px-3 py-1.5 text-center text-[12px] font-medium shadow-card ring-1 ring-outline"
      initial={{ x: startX, y: startY, scaleY: 1, opacity: 1, rotate: 0 }}
      animate={{
        x: [startX, startX, endX],
        y: [startY, startY, endY],
        scaleY: [1, 0.35, 0.35],
        scale: [1, 1, 0.4],
        rotate: [0, 0, m.level === "playful" ? 20 : 6],
        opacity: [1, 1, 0],
      }}
      transition={{ duration: m.level === "calm" ? 1 : 0.8, times: [0, 0.3, 1], ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={onDone}
      aria-hidden
    >
      {title}
    </motion.div>
  );
}
