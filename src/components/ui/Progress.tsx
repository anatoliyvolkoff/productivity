import { cn } from "@/lib/cn";

/** Progress bar with an optional marker for where progress is expected to be. */
export function ProgressBar({
  value,
  expected,
  color = "var(--primary)",
  className,
  height = 8,
}: {
  value: number;
  expected?: number | null;
  color?: string;
  className?: string;
  height?: number;
}) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cn("relative w-full rounded-full bg-surface-3", className)} style={{ height }}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${v * 100}%`, background: color }} />
      {expected != null && (
        <div
          className="absolute -top-1 w-0.5 rounded-full bg-fg"
          style={{ left: `calc(${Math.max(0, Math.min(1, expected)) * 100}% - 1px)`, height: height + 8 }}
          title={`Expected by today: ${Math.round(expected * 100)}%`}
        />
      )}
    </div>
  );
}
