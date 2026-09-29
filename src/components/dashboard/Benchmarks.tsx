import Link from "next/link";
import { StatTile, pctChange } from "@/components/charts/StatTile";
import { Card } from "@/components/ui/Card";
import { formatMinutes } from "@/lib/domain/dates";
import type { Kpi } from "@/lib/services/insights";

export function formatKpi(k: Pick<Kpi, "key" | "unit">, v: number | null): string {
  if (v === null) return "—";
  if (k.unit === "min") return formatMinutes(v);
  if (k.unit === "%") return `${Math.round(v)}%`;
  if (k.key === "moodValence" || k.key === "moodEnergy") return `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
  return v >= 10 ? String(Math.round(v)) : v.toFixed(1);
}

/** Stat tile for a KPI; mood uses an absolute delta (its scale is −5…5), the rest percent. */
export function KpiTile({ kpi: k }: { kpi: Kpi }) {
  const mood = k.key === "moodValence" || k.key === "moodEnergy";
  return (
    <StatTile
      label={k.label}
      value={formatKpi(k, k.current)}
      delta={mood ? (k.current !== null && k.baseline !== null ? k.current - k.baseline : null) : pctChange(k.current, k.baseline)}
      formatDelta={mood ? (d) => `${d > 0 ? "+" : ""}${d.toFixed(1)}` : undefined}
      flatBelow={mood ? 0.1 : 0.5}
      higherIsBetter={k.higherIsBetter}
      spark={k.spark}
    />
  );
}

/** KPI row: this week's daily average vs the 4 weeks before. */
export function Benchmarks({ kpis }: { kpis: Kpi[] }) {
  return (
    <Card title="This week · daily average" className="h-full" action={<Link href="/insights" className="text-[12px] text-primary">Insights</Link>}>
      <div className="grid grid-cols-3 gap-x-6 gap-y-5">
        {kpis.map((k) => (
          <KpiTile key={k.key} kpi={k} />
        ))}
      </div>
    </Card>
  );
}
