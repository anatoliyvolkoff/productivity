import { Card } from "@/components/ui/Card";
import { PhaseBadge } from "./Placeholder";

const QUADRANTS = [
  { label: "High energy · unpleasant", example: "Stressed, anxious", color: "var(--mood-red)" },
  { label: "High energy · pleasant", example: "Excited, focused", color: "var(--mood-yellow)" },
  { label: "Low energy · unpleasant", example: "Tired, sad", color: "var(--mood-blue)" },
  { label: "Low energy · pleasant", example: "Calm, content", color: "var(--mood-green)" },
];

export function MoodGridPreview() {
  return (
    <Card title="How do you feel?" action={<PhaseBadge phase={4} />}>
      <div className="grid flex-1 grid-cols-2 gap-2">
        {QUADRANTS.map((q) => (
          <div
            key={q.label}
            className="flex flex-col justify-end rounded-md p-3"
            style={{ background: `color-mix(in srgb, ${q.color} 18%, transparent)` }}
          >
            <span className="size-2.5 rounded-full" style={{ background: q.color }} />
            <span className="mt-2 text-[12px] font-medium">{q.label}</span>
            <span className="text-[11px] text-fg-muted">{q.example}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
