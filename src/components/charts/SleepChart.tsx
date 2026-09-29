"use client";

import { format } from "date-fns";
import { useState } from "react";
import { formatMinutes, fromISODate, minutesToHHMM, rangeISO, type ISODate } from "@/lib/domain/dates";
import { useElementWidth } from "@/lib/hooks/useElementWidth";
import { ChartTooltip } from "./Tooltip";

export type SleepBar = { date: ISODate; bedAt: Date; wakeAt: Date; asleepMin: number; quality: number | null };

const H = 220;

/**
 * Sleep windows: one vertical bar per night from bedtime to wake time, on a
 * clock axis running from evening (top) to late morning (bottom). Hairlines
 * mark the target bedtime and wake time.
 */
export function SleepChart({ nights, from, to, targetBed, targetWake }: { nights: SleepBar[]; from: ISODate; to: ISODate; targetBed: number; targetWake: number }) {
  const [hover, setHover] = useState<{ n: SleepBar; px: number; py: number; width: number } | null>(null);
  const [ref, W] = useElementWidth<HTMLDivElement>();
  const days = rangeISO(from, to);
  const byDate = new Map(nights.map((n) => [n.date, n]));
  const pad = { top: 10, bottom: 22, left: 44, right: 8 };
  // Minutes relative to 18:00 of the previous day: 0 = 18:00, 1080 = 12:00 next day.
  const rel = (d: Date, wakeDate: ISODate) => (d.getTime() - fromISODate(wakeDate).getTime()) / 60_000 + 360;
  const relClock = (min: number) => (min >= 18 * 60 ? min - 1080 : min + 360);
  const lo = 0;
  const hi = 1080;
  const y = (m: number) => pad.top + ((Math.max(lo, Math.min(hi, m)) - lo) / (hi - lo)) * (H - pad.top - pad.bottom);
  const slot = (W - pad.left - pad.right) / days.length;
  const barW = Math.min(16, slot - 3);
  const ticks = [0, 240, 480, 720, 960];
  const every = Math.ceil(days.length / 10);

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Sleep windows per night">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={pad.left - 6} y={y(t) + 4} fontSize={11} textAnchor="end" fill="var(--fg-subtle)" className="tabular">
              {minutesToHHMM(t + 18 * 60)}
            </text>
          </g>
        ))}
        {[
          { m: relClock(targetBed), label: "Target bed" },
          { m: relClock(targetWake), label: "Target wake" },
        ].map((t) => (
          <g key={t.label}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t.m)} y2={y(t.m)} stroke="var(--fg-muted)" strokeWidth={1} />
            <text x={W - pad.right} y={y(t.m) - 4} fontSize={10.5} textAnchor="end" fill="var(--fg-muted)">
              {t.label}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const n = byDate.get(d);
          const cx = pad.left + slot * i + slot / 2;
          return (
            <g
              key={d}
              onPointerMove={(e) => {
                if (!n) return setHover(null);
                const host = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
                setHover({ n, px: e.clientX - host.left, py: e.clientY - host.top, width: host.width });
              }}
            >
              <rect x={cx - slot / 2} y={pad.top} width={slot} height={H - pad.top - pad.bottom} fill="transparent" />
              {n && (
                <rect
                  x={cx - barW / 2}
                  y={y(rel(n.bedAt, d))}
                  width={barW}
                  height={Math.max(2, y(rel(n.wakeAt, d)) - y(rel(n.bedAt, d)))}
                  rx={4}
                  fill="var(--series-1)"
                  opacity={hover && hover.n.date !== d ? 0.55 : 1}
                />
              )}
              {i % every === 0 && (
                <text x={cx} y={H - 6} fontSize={11} textAnchor="middle" fill="var(--fg-subtle)" className="tabular">
                  {format(fromISODate(d), "d")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover && (
        <ChartTooltip
          x={hover.px}
          y={hover.py}
          containerWidth={hover.width}
          title={format(fromISODate(hover.n.date), "EEE, MMM d")}
          rows={[
            { value: formatMinutes(hover.n.asleepMin), label: "asleep", color: "var(--series-1)" },
            { value: `${format(hover.n.bedAt, "HH:mm")}–${format(hover.n.wakeAt, "HH:mm")}`, label: "in bed" },
            ...(hover.n.quality ? [{ value: `${hover.n.quality}/5`, label: "quality" }] : []),
          ]}
        />
      )}
    </div>
  );
}
