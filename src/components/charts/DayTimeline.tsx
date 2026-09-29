"use client";

import { useState } from "react";
import { formatMinutes, minutesToHHMM } from "@/lib/domain/dates";
import { useElementWidth } from "@/lib/hooks/useElementWidth";
import { useNow } from "@/lib/hooks/useNow";
import { ChartTooltip } from "./Tooltip";

export type TimelineItem = { lane: "calendar" | "focus" | "tracked"; title: string; start: Date; end: Date };
export type TimelineMood = { at: Date; emotion: string; color: string };

const LANES = [
  { key: "calendar", label: "Calendar", color: "var(--series-1)" },
  { key: "focus", label: "Focus", color: "var(--series-2)" },
  { key: "tracked", label: "Tracked", color: "var(--series-3)" },
] as const;

const LABEL_W = 70;
const LANE_H = 30;
const BAR_H = 18;

const minuteOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** One day on a single time axis: calendar, focus sessions, tracked time and mood check-ins. */
export function DayTimeline({
  items,
  moods = [],
  fromMinute,
  toMinute,
  day,
}: {
  items: TimelineItem[];
  moods?: TimelineMood[];
  fromMinute: number;
  toMinute: number;
  /** Local midnight of the day shown. */
  day: Date;
}) {
  const now = useNow(60_000);
  const [hover, setHover] = useState<{ px: number; py: number; width: number; title: string; value: string; color: string } | null>(null);
  const [ref, W] = useElementWidth<HTMLDivElement>();

  const dayStart = day.getTime();
  const clampMin = (d: Date) => Math.max(0, Math.min(1440, (d.getTime() - dayStart) / 60_000));
  const spans = items.map((i) => [clampMin(i.start), clampMin(i.end)] as const);
  const t0 = Math.max(0, Math.floor(Math.min(fromMinute, ...spans.map((s) => s[0])) / 60) * 60);
  const t1 = Math.min(1440, Math.ceil(Math.max(toMinute, ...spans.map((s) => s[1])) / 60) * 60);
  const lanesH = LANES.length * LANE_H + (moods.length ? LANE_H : 0);
  const H = lanesH + 22;
  const x = (m: number) => LABEL_W + ((m - t0) / (t1 - t0)) * (W - LABEL_W - 8);
  const ticks: number[] = [];
  for (let m = Math.ceil(t0 / 120) * 120; m <= t1; m += 120) ticks.push(m);
  const nowMin = now && now.getTime() >= dayStart && now.getTime() < dayStart + 86_400_000 ? minuteOf(now) : null;

  const show = (e: React.PointerEvent, title: string, value: string, color: string) => {
    const host = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
    setHover({ px: e.clientX - host.left, py: e.clientY - host.top, width: host.width, title, value, color });
  };

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Timeline of the day">
        {ticks.map((m) => (
          <g key={m}>
            <line x1={x(m)} x2={x(m)} y1={0} y2={lanesH} stroke="var(--grid)" strokeWidth={1} />
            <text x={x(m)} y={H - 6} fontSize={11} textAnchor="middle" fill="var(--fg-subtle)" className="tabular">
              {minutesToHHMM(m)}
            </text>
          </g>
        ))}
        {LANES.map((lane, li) => {
          const y = li * LANE_H + (LANE_H - BAR_H) / 2;
          return (
            <g key={lane.key}>
              <text x={0} y={li * LANE_H + LANE_H / 2 + 4} fontSize={12} fill="var(--fg-muted)">
                {lane.label}
              </text>
              {items.map((item, i) => {
                if (item.lane !== lane.key) return null;
                const [s, e] = spans[i];
                if (e <= t0 || s >= t1) return null;
                const x0 = x(Math.max(s, t0));
                const w = Math.max(3, x(Math.min(e, t1)) - x0 - 2);
                const minutes = Math.round((item.end.getTime() - item.start.getTime()) / 60_000);
                return (
                  <rect
                    key={i}
                    x={x0 + 1}
                    y={y}
                    width={w}
                    height={BAR_H}
                    rx={4}
                    fill={lane.color}
                    opacity={hover && hover.title === item.title ? 1 : 0.9}
                    tabIndex={0}
                    className="cursor-default outline-none hover:opacity-100"
                    onPointerMove={(ev) => show(ev, item.title, `${minutesToHHMM(minuteOf(item.start))}–${minutesToHHMM(minuteOf(item.end))} · ${formatMinutes(minutes)}`, lane.color)}
                  >
                    <title>{`${item.title}: ${minutesToHHMM(minuteOf(item.start))}–${minutesToHHMM(minuteOf(item.end))}`}</title>
                  </rect>
                );
              })}
            </g>
          );
        })}
        {moods.length > 0 && (
          <g>
            <text x={0} y={LANES.length * LANE_H + LANE_H / 2 + 4} fontSize={12} fill="var(--fg-muted)">
              Mood
            </text>
            {moods.map((m, i) => {
              const mm = minuteOf(m.at);
              if (mm < t0 || mm > t1) return null;
              const cy = LANES.length * LANE_H + LANE_H / 2;
              return (
                <g key={i} onPointerMove={(ev) => show(ev, m.emotion, minutesToHHMM(mm), m.color)}>
                  <circle cx={x(mm)} cy={cy} r={12} fill="transparent" />
                  <circle cx={x(mm)} cy={cy} r={6} fill={m.color} stroke="var(--surface)" strokeWidth={2}>
                    <title>{`${m.emotion} at ${minutesToHHMM(mm)}`}</title>
                  </circle>
                </g>
              );
            })}
          </g>
        )}
        {nowMin !== null && nowMin >= t0 && nowMin <= t1 && (
          <g>
            <line x1={x(nowMin)} x2={x(nowMin)} y1={0} y2={lanesH} stroke="var(--fg)" strokeWidth={1.5} />
            <circle cx={x(nowMin)} cy={2} r={3} fill="var(--fg)" />
          </g>
        )}
      </svg>
      {hover && <ChartTooltip x={hover.px} y={hover.py} containerWidth={hover.width} title={hover.title} rows={[{ value: hover.value, color: hover.color }]} />}
    </div>
  );
}
