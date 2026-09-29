import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="grid size-12 place-items-center rounded-lg bg-surface-3 text-fg-subtle">
        <Icon className="size-6" strokeWidth={1.75} />
      </div>
      <p className="mt-3 text-[15px] font-medium">{title}</p>
      {children && <div className="mt-1 max-w-sm text-[13px] text-fg-muted">{children}</div>}
    </div>
  );
}
