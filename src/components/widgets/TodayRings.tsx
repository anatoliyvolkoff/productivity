import { Card } from "@/components/ui/Card";
import { Ring } from "./Ring";

// Values are wired to real data in Phases 1 & 3 (focus sessions, habit logs, MITs).
const RINGS = [
  { label: "Focus", detail: "0 / 4 h", value: 0, color: "var(--primary)" },
  { label: "Habits", detail: "0 / 0", value: 0, color: "var(--accent)" },
  { label: "Top 3", detail: "0 / 3", value: 0, color: "var(--success)" },
];

export function TodayRings() {
  return (
    <Card title="Today">
      <div className="flex items-center gap-6">
        <div className="relative size-[132px] shrink-0">
          {RINGS.map((ring, i) => (
            <Ring key={ring.label} value={ring.value} size={132 - i * 36} stroke={14} color={ring.color} />
          ))}
        </div>
        <ul className="flex flex-col gap-3">
          {RINGS.map((ring) => (
            <li key={ring.label}>
              <div className="text-[12px] font-medium" style={{ color: ring.color }}>
                {ring.label}
              </div>
              <div className="tabular text-[17px] font-semibold">{ring.detail}</div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
