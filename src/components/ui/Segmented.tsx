"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

const wrap = "inline-flex rounded-full bg-surface-3 p-1";
const item = "rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition";
const active = "bg-surface text-fg shadow-sm";
const idle = "text-fg-muted hover:text-fg";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: React.ReactNode }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn(wrap, className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(item, o.value === value ? active : idle)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Segmented control whose options are links (server-driven filters). */
export function SegmentedLinks({
  value,
  options,
  className,
}: {
  value: string;
  options: Array<{ value: string; label: React.ReactNode; href: string }>;
  className?: string;
}) {
  return (
    <nav className={cn(wrap, className)}>
      {options.map((o) => (
        <Link key={o.value} href={o.href} className={cn(item, o.value === value ? active : idle)} scroll={false}>
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
