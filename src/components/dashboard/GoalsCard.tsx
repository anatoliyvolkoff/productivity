import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import { ProgressBar } from "@/components/ui/Progress";
import { HEALTH_LABELS, type GoalHealth } from "@/lib/domain/goals";
import type { GoalView } from "@/lib/services/goals";

export const HEALTH_TONE: Record<GoalHealth, "success" | "warning" | "danger" | "neutral" | "primary"> = {
  on_track: "success",
  at_risk: "warning",
  off_track: "danger",
  done: "primary",
  no_deadline: "neutral",
};

/** Goal progress against the expected pace (marker), highest priority first. */
export function GoalsCard({ goals }: { goals: GoalView[] }) {
  const list = [...goals].filter((g) => g.horizon !== "vision").sort((a, b) => a.priority - b.priority || a.progress - b.progress).slice(0, 4);
  return (
    <Card title="Goals" className="h-full" action={<Link href="/goals" className="text-[12px] text-primary">All goals</Link>}>
      {list.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-fg-subtle">
          No active goals. <Link href="/goals" className="text-primary">Set one</Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((g) => {
            const left = Math.round((1 - g.progress) * 100);
            return (
              <li key={g.id}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-[14px] font-medium">{g.title}</span>
                  <Badge tone={HEALTH_TONE[g.health]}>{HEALTH_LABELS[g.health]}</Badge>
                </div>
                <ProgressBar value={g.progress} expected={g.expected} color={g.color ?? "var(--series-1)"} />
                <div className="mt-1 flex justify-between text-[12px] text-fg-muted">
                  <span>{g.progress >= 0.7 && g.progress < 1 ? `Only ${left}% to go` : `${Math.round(g.progress * 100)}%`}</span>
                  {g.daysLeft !== null && <span>{g.daysLeft >= 0 ? `${g.daysLeft} days left` : "Past its date — adjust whenever"}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
