import { Flag } from "lucide-react";
import { cn } from "@/lib/cn";

export function TagChip({ name, color, className }: { name: string; color?: string | null; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium", className)}
      style={{ background: `color-mix(in srgb, ${color ?? "var(--fg-subtle)"} 14%, transparent)`, color: color ?? "var(--fg-muted)" }}
    >
      #{name}
    </span>
  );
}

export const PRIORITY_COLORS: Record<number, string> = {
  1: "var(--danger)",
  2: "var(--accent)",
  3: "var(--primary)",
  4: "var(--fg-subtle)",
};

export function PriorityFlag({ priority, showLabel = false }: { priority: number; showLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: PRIORITY_COLORS[priority] }}>
      <Flag className="size-3.5" fill="currentColor" strokeWidth={2} />
      {showLabel && `P${priority}`}
    </span>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "primary" | "accent" | "success" | "danger" | "warning"; className?: string }) {
  const tones = {
    neutral: "bg-surface-3 text-fg-muted",
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    success: "bg-success/15 text-success",
    danger: "bg-danger/12 text-danger",
    warning: "bg-warning/20 text-[color-mix(in_srgb,var(--warning)_60%,var(--fg))]",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap", tones[tone], className)}>{children}</span>;
}
