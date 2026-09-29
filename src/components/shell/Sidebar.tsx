"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col border-r border-outline bg-glass px-3 py-5 backdrop-blur-xl">
      <div className="mb-6 flex items-center gap-2.5 px-3">
        <div className="grid size-7 place-items-center rounded-[9px] bg-fg text-[13px] font-bold text-bg">P</div>
        <span className="text-[15px] font-semibold tracking-tight">Productivity OS</span>
      </div>

      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-sm px-3 py-2 text-[14px] transition",
                  active
                    ? "bg-primary-soft font-medium text-primary"
                    : "text-fg-muted hover:bg-surface-3 hover:text-fg",
                )}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.1 : 1.75} />
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <kbd className="hidden font-sans text-[11px] text-fg-subtle group-hover:inline">{item.shortcut}</kbd>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
