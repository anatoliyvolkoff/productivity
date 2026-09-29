import { Card } from "@/components/ui/Card";
import { formatMinutes } from "@/lib/domain/dates";
import { Ring } from "./Ring";

/** Three concentric rings for today — each labeled, so identity never relies on color. */
export function TodayRings({
  focusMin,
  focusTarget,
  habitsDone,
  habitsTotal,
  mitsDone,
  mitsTotal,
}: {
  focusMin: number;
  focusTarget: number;
  habitsDone: number;
  habitsTotal: number;
  mitsDone: number;
  mitsTotal: number;
}) {
  const rings = [
    { label: "Focus", detail: `${formatMinutes(focusMin)} / ${formatMinutes(focusTarget)}`, value: focusTarget ? focusMin / focusTarget : 0, color: "var(--series-1)" },
    { label: "Habits", detail: `${habitsDone} / ${habitsTotal}`, value: habitsTotal ? habitsDone / habitsTotal : 0, color: "var(--series-2)" },
    { label: "Top 3", detail: `${mitsDone} / ${Math.max(mitsTotal, 3)}`, value: mitsDone / Math.max(mitsTotal, 3), color: "var(--series-3)" },
  ];
  return (
    <Card title="Today">
      <div className="flex items-center gap-6">
        <div className="relative size-[132px] shrink-0" role="img" aria-label={rings.map((r) => `${r.label} ${r.detail}`).join(", ")}>
          {rings.map((ring, i) => (
            <Ring key={ring.label} value={ring.value} size={132 - i * 36} stroke={14} color={ring.color} />
          ))}
        </div>
        <ul className="flex flex-col gap-3">
          {rings.map((ring) => (
            <li key={ring.label}>
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-fg-muted">
                <span className="size-2 rounded-full" style={{ background: ring.color }} />
                {ring.label}
              </div>
              <div className="text-[15px] font-semibold whitespace-nowrap">{ring.detail}</div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
