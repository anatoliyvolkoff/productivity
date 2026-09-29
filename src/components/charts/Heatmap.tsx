"use client";

import { format } from "date-fns";
import { useState } from "react";
import { addDaysISO, dayOfWeek, fromISODate, weekStartISO, type ISODate } from "@/lib/domain/dates";
import { ChartTooltip } from "./Tooltip";

const LEVELS = ["var(--surface-3)", "var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)"];

/** GitHub-style calendar heatmap: one cell per day, one-hue sequential scale. */
export function Heatmap({
  from,
  to,
  cells,
  cell = 12,
}: {
  from: ISODate;
  to: ISODate;
  /** Per date: 0–1 completion (null = not scheduled) and a tooltip description. */
  cells: Record<ISODate, { value: number | null; text: string }>;
  cell?: number;
}) {
  const value = (date: ISODate) => cells[date]?.value ?? null;
  const describe = (date: ISODate) => cells[date]?.text ?? "Not scheduled";
  const [hover, setHover] = useState<{ date: ISODate; px: number; py: number; width: number } | null>(null);
  const gap = 2;
  const start = weekStartISO(from);
  const weeks: ISODate[][] = [];
  for (let w = start; w <= to; w = addDaysISO(w, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDaysISO(w, i)));
  const W = 24 + weeks.length * (cell + gap);
  const H = 16 + 7 * (cell + gap);

  const level = (v: number | null) => (v === null ? -1 : v <= 0 ? 0 : v < 0.34 ? 1 : v < 0.67 ? 2 : v < 1 ? 3 : 4);

  return (
    <div className="relative" onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ maxWidth: W * 1.6 }} role="img" aria-label="Daily completion heatmap">
        {["Mon", "Wed", "Fri"].map((d, i) => (
          <text key={d} x={0} y={16 + (i * 2 + 1) * (cell + gap) - 3} fontSize={9} fill="var(--fg-subtle)">
            {d}
          </text>
        ))}
        {weeks.map((week, wi) => (
          <g key={week[0]}>
            {fromISODate(week[0]).getDate() <= 7 && (
              <text x={24 + wi * (cell + gap)} y={10} fontSize={9} fill="var(--fg-subtle)">
                {format(fromISODate(week[0]), "MMM")}
              </text>
            )}
            {week.map((date) => {
              if (date < from || date > to) return null;
              const lv = level(value(date));
              const row = (dayOfWeek(date) + 6) % 7;
              return (
                <rect
                  key={date}
                  x={24 + wi * (cell + gap)}
                  y={16 + row * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={3}
                  fill={lv < 0 ? "transparent" : LEVELS[lv]}
                  stroke={lv < 0 ? "var(--grid)" : hover?.date === date ? "var(--fg)" : "none"}
                  strokeWidth={1}
                  onPointerMove={(e) => {
                    const host = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
                    setHover({ date, px: e.clientX - host.left, py: e.clientY - host.top, width: host.width });
                  }}
                >
                  <title>{`${date}: ${describe(date)}`}</title>
                </rect>
              );
            })}
          </g>
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-fg-subtle">
        Less
        {LEVELS.map((c) => (
          <span key={c} className="inline-block size-2.5 rounded-[3px]" style={{ background: c }} />
        ))}
        More
      </div>
      {hover && <ChartTooltip x={hover.px} y={hover.py} containerWidth={hover.width} title={format(fromISODate(hover.date), "EEE, MMM d")} rows={[{ value: describe(hover.date) }]} />}
    </div>
  );
}
