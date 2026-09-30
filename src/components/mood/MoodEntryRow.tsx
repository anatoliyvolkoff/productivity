"use client";

import { Trash2 } from "lucide-react";
import { removeMood } from "@/app/actions/wellbeing";
import { useRunner } from "@/lib/hooks/useRunner";

export function MoodEntryRow({ entry }: { entry: { id: string; time: string; emotion: string; color: string; note: string | null; context: string; weather: string | null } }) {
  const { pending, run } = useRunner();
  return (
    <li className={`group flex items-start gap-3 py-2.5 ${pending ? "opacity-50" : ""}`}>
      <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-[13.5px]">
          <b className="font-semibold">{entry.emotion}</b>
          <span className="text-[12px] text-fg-subtle">{entry.time}</span>
          {entry.weather && <span className="text-[12px] text-fg-subtle">· {entry.weather}</span>}
        </div>
        {entry.context && <div className="text-[12px] text-fg-muted">{entry.context}</div>}
        {entry.note && <div className="text-[12.5px] text-fg-muted italic">{entry.note}</div>}
      </div>
      <button
        type="button"
        aria-label="Delete check-in"
        className="text-fg-subtle opacity-0 transition group-hover:opacity-100 hover:text-danger"
        onClick={() => {
          if (confirm("Delete this check-in?")) run(() => removeMood(entry.id));
        }}
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}
