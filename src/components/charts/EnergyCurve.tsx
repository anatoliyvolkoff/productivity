"use client";

import { useState } from "react";
import { minutesToHHMM } from "@/lib/domain/dates";
import { energyAt, energyLabel, type EnergyPoint, type Window } from "@/lib/domain/energy";
import { useElementWidth } from "@/lib/hooks/useElementWidth";
import { useNow } from "@/lib/hooks/useNow";
import { ChartTooltip, svgPoint } from "./Tooltip";

/** Estimated alertness across the waking day (single series area chart). */
export function EnergyCurve({ curve, bestWindow, height = 150, showAxis = true }: { curve: EnergyPoint[]; bestWindow: Window | null; height?: number; showAxis?: boolean }) {
  const now = useNow(60_000);
  const [hover, setHover] = useState<{ minute: number; px: number; py: number; width: number } | null>(null);
  const [ref, W] = useElementWidth<HTMLDivElement>();
  if (curve.length < 2) return null;

  const H = height;
  const pad = { top: 16, bottom: showAxis ? 22 : 6, left: 4, right: 4 };
  const t0 = curve[0].minute;
  const t1 = curve[curve.length - 1].minute;
  const x = (m: number) => pad.left + ((m - t0) / (t1 - t0)) * (W - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - v) * (H - pad.top - pad.bottom);
  const base = H - pad.bottom;

  const line = curve.map((p, i) => `${i ? "L" : "M"}${x(p.minute).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = `${line}L${x(t1).toFixed(1)},${base}L${x(t0).toFixed(1)},${base}Z`;
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : null;
  const nowVal = nowMin !== null ? energyAt(curve, nowMin) : null;
  const ticks: number[] = [];
  for (let m = Math.ceil(t0 / 180) * 180; m <= t1; m += 180) ticks.push(m);
  const hv = hover ? energyAt(curve, hover.minute) : null;

  return (
    <div ref={ref} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label="Estimated energy across the day"
        onPointerMove={(e) => {
          const p = svgPoint(e, W, H);
          const minute = Math.round(t0 + ((p.x - pad.left) / (W - pad.left - pad.right)) * (t1 - t0));
          setHover(minute >= t0 && minute <= t1 ? { minute, px: p.px, py: p.py, width: p.rectWidth } : null);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {[0.25, 0.5, 0.75].map((v) => (
          <line key={v} x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeWidth={1} />
        ))}
        {bestWindow && (
          <g>
            <rect x={x(bestWindow.start)} y={pad.top} width={x(bestWindow.end) - x(bestWindow.start)} height={base - pad.top} fill="var(--series-2)" opacity={0.1} rx={4} />
            <text x={x(bestWindow.start) + 6} y={pad.top + 12} fontSize={11} fill="var(--fg-muted)">
              Best focus window
            </text>
          </g>
        )}
        <path d={area} fill="var(--series-1)" opacity={0.1} />
        <path d={line} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <line x1={pad.left} x2={W - pad.right} y1={base} y2={base} stroke="var(--axis)" strokeWidth={1} />
        {showAxis &&
          ticks.map((m) => (
            <text key={m} x={x(m)} y={H - 6} fontSize={11} textAnchor="middle" fill="var(--fg-subtle)" className="tabular">
              {minutesToHHMM(m)}
            </text>
          ))}
        {nowVal !== null && nowMin !== null && (
          <g>
            <line x1={x(nowMin)} x2={x(nowMin)} y1={pad.top - 6} y2={base} stroke="var(--fg)" strokeWidth={1} />
            <circle cx={x(nowMin)} cy={y(nowVal)} r={5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
        {hover && hv !== null && (
          <g>
            <line x1={x(hover.minute)} x2={x(hover.minute)} y1={pad.top} y2={base} stroke="var(--fg-subtle)" strokeWidth={1} />
            <circle cx={x(hover.minute)} cy={y(hv)} r={4} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover && hv !== null && (
        <ChartTooltip
          x={hover.px}
          y={hover.py}
          containerWidth={hover.width}
          title={minutesToHHMM(hover.minute)}
          rows={[{ value: `${Math.round(hv * 100)}%`, label: energyLabel(hv), color: "var(--series-1)" }]}
        />
      )}
    </div>
  );
}
