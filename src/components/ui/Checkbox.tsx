"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/** Round, Apple-Reminders-style checkbox. */
export function CircleCheck({
  checked,
  onChange,
  color = "var(--primary)",
  size = 22,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  color?: string;
  size?: number;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border-2 transition-all duration-200 active:scale-90",
        checked ? "border-transparent" : "border-fg-subtle/60 hover:border-fg-muted",
      )}
      style={{ width: size, height: size, background: checked ? color : "transparent" }}
    >
      <Check
        className={cn("text-white transition-all duration-200", checked ? "scale-100 opacity-100" : "scale-50 opacity-0")}
        style={{ width: size * 0.62, height: size * 0.62 }}
        strokeWidth={3}
      />
    </button>
  );
}
