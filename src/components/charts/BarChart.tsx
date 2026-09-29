"use client";

import { useState } from "react";
import { formatValue, type ValueUnit } from "@/lib/format";
import { useElementWidth } from "@/lib/hooks/useElementWidth";
import { ChartTooltip } from "./Tooltip";

/** Single-series columns over days, with an optional target line. */
export function BarChart({
  data,
  unit,
  target,
  targetLabel = "Target",
  height = 160,
  color = "var(--series-1)",
}: {
  data: Array<{ label: string; short: string; value: number | null }>;
  unit: ValueUnit;
  target?: number;
  targetLabel?: string;
  height?: number;
  color?: string;
}) {
  const [hover, setHover] = useState<{ i: number; px: number; py: number; width: number } | null>(null);
  const format = (v: number) => formatValue(v, unit);
  const [ref, W] = useElementWidth<HTMLDivElement>();
  const H = height;
  const pad = { top: 14, bottom: 22, left: 50, right: 8 };
  const max = Math.max(target ?? 0, ...data.map((d) => d.value ?? 0), 1);
  const nice = unit === "minutes" ? Math.ceil(max / 60) * 60 : niceMax(max);
  const slot = (W - pad.left - pad.right) / Math.max(1, data.length);
  const barW = Math.min(24, slot - 4);
  const y = (v: number) => pad.top + (1 - v / nice) * (H - pad.top - pad.bottom);
  const base = H - pad.bottom;
  const every = Math.ceil(data.length / 10);

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Daily values">
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.left} x2={W - pad.right} y1={y(nice * f)} y2={y(nice * f)} stroke="var(--grid)" strokeWidth={1} />
            <text x={pad.left - 6} y={y(nice * f) + 4} fontSize={11} textAnchor="end" fill="var(--fg-subtle)" className="tabular">
              {format(nice * f)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + slot * i + slot / 2;
          const v = d.value ?? 0;
          const top = y(v);
          const h = base - top;
          return (
            <g
              key={i}
              onPointerMove={(e) => {
                const host = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
                setHover({ i, px: e.clientX - host.left, py: e.clientY - host.top, width: host.width });
              }}
            >
              <rect x={cx - slot / 2} y={pad.top} width={slot} height={base - pad.top} fill="transparent" />
              {h > 0 && (
                <path
                  d={roundedTop(cx - barW / 2, top, barW, h, Math.min(4, h))}
                  fill={color}
                  opacity={hover && hover.i !== i ? 0.55 : 1}
                />
              )}
              {i % every === 0 && (
                <text x={cx} y={H - 6} fontSize={11} textAnchor="middle" fill="var(--fg-subtle)" className="tabular">
                  {d.short}
                </text>
              )}
            </g>
          );
        })}
        {target !== undefined && target > 0 && (
          <g>
            <line x1={pad.left} x2={W - pad.right} y1={y(target)} y2={y(target)} stroke="var(--fg-muted)" strokeWidth={1} />
            <text x={W - pad.right} y={y(target) - 4} fontSize={11} textAnchor="end" fill="var(--fg-muted)">
              {targetLabel}
            </text>
          </g>
        )}
        <line x1={pad.left} x2={W - pad.right} y1={base} y2={base} stroke="var(--axis)" strokeWidth={1} />
      </svg>
      {hover && data[hover.i] && (
        <ChartTooltip
          x={hover.px}
          y={hover.py}
          containerWidth={hover.width}
          title={data[hover.i].label}
          rows={[{ value: data[hover.i].value === null ? "—" : format(data[hover.i].value!), color }]}
        />
      )}
    </div>
  );
}

/** Rectangle with rounded top corners, square at the baseline. */
export function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function niceMax(v: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * exp;
}
