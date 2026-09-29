"use client";

import { format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { addDaysISO, fromISODate, type ISODate } from "@/lib/domain/dates";
import { eventColor, type CalEvent, type DialogState } from "./types";

export function MonthGrid({ start, anchor, today, events, onOpen }: { start: ISODate; anchor: ISODate; today: ISODate; events: CalEvent[]; onOpen: (d: DialogState) => void }) {
  const days = Array.from({ length: 42 }, (_, i) => addDaysISO(start, i));
  const month = anchor.slice(0, 7);

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-outline">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-2 text-center text-[11.5px] font-medium text-fg-muted uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d) => {
          const s = fromISODate(d).getTime();
          const e = fromISODate(addDaysISO(d, 1)).getTime();
          const list = events.filter((x) => x.startAt.getTime() < e && x.endAt.getTime() > s).sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startAt.getTime() - b.startAt.getTime());
          return (
            <div
              key={d}
              className={cn("min-h-28 border-b border-l border-outline p-1.5 first:border-l-0 [&:nth-child(7n+1)]:border-l-0", d.slice(0, 7) !== month && "bg-surface-2 text-fg-subtle")}
              onClick={(ev) => {
                if (ev.target !== ev.currentTarget) return;
                const startAt = fromISODate(d);
                startAt.setHours(9);
                onOpen({ mode: "create", start: startAt, end: new Date(startAt.getTime() + 3_600_000) });
              }}
            >
              <Link
                href={`/calendar?view=day&date=${d}`}
                className={cn("grid size-6 place-items-center rounded-full text-[12.5px] font-semibold", d === today && "bg-primary text-on-primary")}
              >
                {format(fromISODate(d), "d")}
              </Link>
              <div className="mt-1 flex flex-col gap-0.5">
                {list.slice(0, 3).map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => onOpen({ mode: "edit", event: x })}
                    className="flex items-center gap-1 truncate rounded-[5px] px-1 text-left text-[11.5px] hover:bg-surface-3"
                  >
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: eventColor(x) }} />
                    {!x.allDay && <span className="tabular text-fg-subtle">{format(x.startAt, "HH:mm")}</span>}
                    <span className="truncate">{x.title}</span>
                  </button>
                ))}
                {list.length > 3 && (
                  <Link href={`/calendar?view=day&date=${d}`} className="px-1 text-[11px] text-fg-muted hover:text-primary">
                    +{list.length - 3} more
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
