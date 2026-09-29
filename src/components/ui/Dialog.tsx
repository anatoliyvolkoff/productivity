"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    const first = panelRef.current?.querySelector<HTMLElement>("[autofocus], input, textarea, select");
    first?.focus();
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 pt-[10vh] pb-10 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn("w-full max-w-[520px] rounded-xl border border-outline bg-surface shadow-2xl", className)}
      >
        {title && (
          <header className="flex items-center justify-between px-6 pt-5">
            <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
            <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full text-fg-muted hover:bg-surface-3" aria-label="Close">
              <X className="size-4" />
            </button>
          </header>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-outline px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
