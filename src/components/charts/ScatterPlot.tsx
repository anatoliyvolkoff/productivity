"use client";

import { useState } from "react";
import { formatValue, type ValueUnit } from "@/lib/format";
import { useElementWidth } from "@/lib/hooks/useElementWidth";
import { ChartTooltip } from "./Tooltip";

/** One-series scatter (e.g. sleep vs mood per day) with a 24px hit area per point. */
export function ScatterPlot({
  points,
  xLabel,
  yLabel,
  xUnit,
  yUnit,
}: {
  points: Array<{ x: number; y: number; label: string }>;
  xLabel: string;
  yLabel: string;
  xUnit: ValueUnit;
  yUnit: ValueUnit;
}) {
  const formatX = (v: number) => formatValue(v, xUnit);
  const formatY = (v: number) => formatValue(v, yUnit);
  const [hover, setHover] = useState<{ i: number; px: number; py: number; width: number } | null>(null);
  const [ref, W] = useElementWidth<HTMLDivElement>(420);
  const H = 280;
  const pad = { top: 12, bottom: 36, left: 48, right: 12 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [x0, x1] = extent(xs);
  const [y0, y1] = extent(ys);
  const x = (v: number) => pad.left + ((v - x0) / (x1 - x0)) * (W - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - (v - y0) / (y1 - y0)) * (H - pad.top - pad.bottom);

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${yLabel} by ${xLabel}`}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.left} x2={W - pad.right} y1={y(y0 + f * (y1 - y0))} y2={y(y0 + f * (y1 - y0))} stroke="var(--grid)" strokeWidth={1} />
            <text x={pad.left - 6} y={y(y0 + f * (y1 - y0)) + 4} fontSize={11} textAnchor="end" fill="var(--fg-subtle)" className="tabular">
              {formatY(y0 + f * (y1 - y0))}
            </text>
            <text x={x(x0 + f * (x1 - x0))} y={H - 20} fontSize={11} textAnchor="middle" fill="var(--fg-subtle)" className="tabular">
              {formatX(x0 + f * (x1 - x0))}
            </text>
          </g>
        ))}
        <text x={(W + pad.left) / 2} y={H - 4} fontSize={11.5} textAnchor="middle" fill="var(--fg-muted)">
          {xLabel}
        </text>
        <text x={12} y={pad.top + 4} fontSize={11.5} fill="var(--fg-muted)" transform={`rotate(-90 12 ${pad.top + 4})`} textAnchor="end">
          {yLabel}
        </text>
        {points.map((p, i) => (
          <g
            key={i}
            onPointerMove={(e) => {
              const host = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
              setHover({ i, px: e.clientX - host.left, py: e.clientY - host.top, width: host.width });
            }}
          >
            <circle cx={x(p.x)} cy={y(p.y)} r={12} fill="transparent" />
            <circle cx={x(p.x)} cy={y(p.y)} r={hover?.i === i ? 6 : 4.5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        ))}
      </svg>
      {hover && points[hover.i] && (
        <ChartTooltip
          x={hover.px}
          y={hover.py}
          containerWidth={hover.width}
          title={points[hover.i].label}
          rows={[
            { value: formatX(points[hover.i].x), label: xLabel },
            { value: formatY(points[hover.i].y), label: yLabel },
          ]}
        />
      )}
    </div>
  );
}

function extent(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const padBy = (hi - lo) * 0.08;
  return [lo - padBy, hi + padBy];
}
