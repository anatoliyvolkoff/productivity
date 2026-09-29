import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export function PhaseBadge({ phase }: { phase: number }) {
  return (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
      Phase {phase}
    </span>
  );
}

type PlaceholderWidgetProps = {
  title: string;
  phase: number;
  lines: string[];
  className?: string;
};

/** Stand-in for a dashboard widget that a later roadmap phase delivers. */
export function PlaceholderWidget({ title, phase, lines, className }: PlaceholderWidgetProps) {
  return (
    <Card title={title} action={<PhaseBadge phase={phase} />} className={cn(className)}>
      <ul className="flex flex-col gap-2">
        {lines.map((line) => (
          <li key={line} className="flex items-center gap-2.5 text-[14px] text-fg-muted">
            <span className="size-1.5 shrink-0 rounded-full bg-fg-subtle" />
            {line}
          </li>
        ))}
      </ul>
    </Card>
  );
}
