"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type ToastItem = { id: number; message: string; tone: "info" | "error" };

const EVENT = "pos:toast";
let nextId = 1;

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent<ToastItem>(EVENT, { detail: { id: nextId++, message, tone: "info" } }));
}

toast.error = (message: string) => {
  window.dispatchEvent(new CustomEvent<ToastItem>(EVENT, { detail: { id: nextId++, message, tone: "error" } }));
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const item = (e as CustomEvent<ToastItem>).detail;
      setItems((list) => [...list.slice(-3), item]);
      setTimeout(() => setItems((list) => list.filter((t) => t.id !== item.id)), item.tone === "error" ? 5000 : 2600);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex animate-[toast-in_.2s_ease-out] items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium shadow-lg backdrop-blur-xl",
            t.tone === "error" ? "bg-danger text-white" : "bg-fg text-bg",
          )}
        >
          {t.tone === "error" ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
