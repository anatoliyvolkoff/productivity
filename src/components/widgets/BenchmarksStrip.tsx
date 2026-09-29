import { Card } from "@/components/ui/Card";
import { PhaseBadge } from "./Placeholder";

const KPIS = ["Focus hours", "Tasks done", "Habit adherence", "Sleep", "Mood balance"];

export function BenchmarksStrip() {
  return (
    <Card title="This week vs. last 4 weeks" action={<PhaseBadge phase={5} />}>
      <div className="grid grid-cols-5 divide-x divide-outline">
        {KPIS.map((kpi) => (
          <div key={kpi} className="px-4 first:pl-0">
            <div className="text-[12px] text-fg-muted">{kpi}</div>
            <div className="tabular mt-1 text-[24px] font-semibold text-fg-subtle">—</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
