import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Sparkline } from "./Sparkline";

/**
 * Stat tile: label · value · delta vs a named period · sparkline.
 * The delta's color follows direction × whether up is good, and always
 * carries an arrow + sign so it never relies on color alone.
 */
export function StatTile({
  label,
  value,
  delta,
  deltaLabel = "vs prior 4 weeks",
  higherIsBetter = true,
  spark,
  formatDelta = (d: number) => `${d > 0 ? "+" : ""}${Math.round(d)}%`,
  flatBelow = 0.5,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  higherIsBetter?: boolean;
  spark?: Array<number | null>;
  formatDelta?: (d: number) => string;
  flatBelow?: number;
}) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const flat = hasDelta && Math.abs(delta) < flatBelow;
  const good = hasDelta && !flat && (delta > 0) === higherIsBetter;
  const Icon = !hasDelta || flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[12.5px] text-fg-muted">{label}</div>
      <div className="flex items-end justify-between gap-3">
        <div className="text-[26px] leading-none font-semibold tracking-tight whitespace-nowrap">{value}</div>
        {spark && <Sparkline values={spark} width={72} height={28} />}
      </div>
      <div className="flex items-center gap-1 text-[12px]">
        {hasDelta ? (
          <>
            <span className="inline-flex items-center font-semibold" style={{ color: flat ? "var(--fg-muted)" : good ? "var(--delta-good)" : "var(--delta-bad)" }}>
              <Icon className="size-3.5" />
              {flat ? "No change" : formatDelta(delta)}
            </span>
            <span className="text-fg-subtle">{deltaLabel}</span>
          </>
        ) : (
          <span className="text-fg-subtle">No earlier data yet</span>
        )}
      </div>
    </div>
  );
}

/** Percent change from baseline to current, or null when not meaningful. */
export function pctChange(current: number | null, baseline: number | null): number | null {
  if (current === null || baseline === null || baseline === 0) return null;
  return ((current - baseline) / Math.abs(baseline)) * 100;
}
