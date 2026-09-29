"use client";

import { format } from "date-fns";
import { useState } from "react";
import { QUADRANT_INFO, type Quadrant } from "@/lib/domain/mood";
import { ChartTooltip } from "./Tooltip";

export type MoodPoint = { energy: number; pleasantness: number; quadrant: Quadrant; at: Date; emotion?: string };

const S = 300;

/** Check-ins placed on the energy × pleasantness grid; recent points are more opaque. */
export function MoodMap({ points }: { points: MoodPoint[] }) {
  const [hover, setHover] = useState<{ i: number; px: number; py: number; width: number } | null>(null);
  const pad = 22;
  const size = S - pad * 2;
  const x = (p: number) => pad + ((p + 5.5) / 11) * size;
  const y = (e: number) => pad + (1 - (e + 5.5) / 11) * size;
  const newest = Math.max(...points.map((p) => p.at.getTime()), 0);
  const oldest = Math.min(...points.map((p) => p.at.getTime()), newest);
  const quadrants: Array<{ q: Quadrant; x: number; y: number }> = [
    { q: "red", x: pad, y: pad },
    { q: "yellow", x: pad + size / 2, y: pad },
    { q: "blue", x: pad, y: pad + size / 2 },
    { q: "green", x: pad + size / 2, y: pad + size / 2 },
  ];

  return (
    <div className="relative" onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${S} ${S}`} className="h-auto w-full" role="img" aria-label="Mood check-ins by energy and pleasantness">
        {quadrants.map((q) => (
          <rect key={q.q} x={q.x + 1} y={q.y + 1} width={size / 2 - 2} height={size / 2 - 2} rx={10} fill={QUADRANT_INFO[q.q].color} opacity={0.1} />
        ))}
        <line x1={pad} x2={S - pad} y1={S / 2} y2={S / 2} stroke="var(--axis)" strokeWidth={1} />
        <line x1={S / 2} x2={S / 2} y1={pad} y2={S - pad} stroke="var(--axis)" strokeWidth={1} />
        <text x={S / 2} y={12} fontSize={10} textAnchor="middle" fill="var(--fg-subtle)">
          High energy
        </text>
        <text x={S / 2} y={S - 4} fontSize={10} textAnchor="middle" fill="var(--fg-subtle)">
          Low energy
        </text>
        <text x={4} y={S / 2 - 6} fontSize={10} fill="var(--fg-subtle)">
          Unpleasant
        </text>
        <text x={S - 4} y={S / 2 - 6} fontSize={10} textAnchor="end" fill="var(--fg-subtle)">
          Pleasant
        </text>
        {points.map((p, i) => {
          const age = newest === oldest ? 1 : (p.at.getTime() - oldest) / (newest - oldest);
          // jitter identical points slightly so they stay visible
          const jx = ((i * 37) % 7) - 3;
          const jy = ((i * 53) % 7) - 3;
          return (
            <g
              key={i}
              onPointerMove={(e) => {
                const host = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
                setHover({ i, px: e.clientX - host.left, py: e.clientY - host.top, width: host.width });
              }}
            >
              <circle cx={x(p.pleasantness) + jx} cy={y(p.energy) + jy} r={12} fill="transparent" />
              <circle
                cx={x(p.pleasantness) + jx}
                cy={y(p.energy) + jy}
                r={hover?.i === i ? 7 : 5}
                fill={QUADRANT_INFO[p.quadrant].color}
                fillOpacity={0.35 + 0.65 * age}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>
      {hover && points[hover.i] && (
        <ChartTooltip
          x={hover.px}
          y={hover.py}
          containerWidth={hover.width}
          title={format(points[hover.i].at, "EEE MMM d, HH:mm")}
          rows={[{ value: points[hover.i].emotion ?? QUADRANT_INFO[points[hover.i].quadrant].label, label: QUADRANT_INFO[points[hover.i].quadrant].short, color: QUADRANT_INFO[points[hover.i].quadrant].color }]}
        />
      )}
    </div>
  );
}
