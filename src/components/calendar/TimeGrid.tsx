"use client";

import { format } from "date-fns";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { addDaysISO, fromISODate, type ISODate } from "@/lib/domain/dates";
import { layoutColumns } from "@/lib/domain/schedule";
import { useNow } from "@/lib/hooks/useNow";
import { eventColor, type CalEvent, type DialogState } from "./types";

const HOUR = 46;

/** Day or week grid with hours, all-day row, overlap layout and click-to-create. */
export function TimeGrid({ days, today, events, onOpen }: { days: ISODate[]; today: ISODate; events: CalEvent[]; onOpen: (d: DialogState) => void }) {
  const now = useNow(60_000);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR - 12;
  }, []);

  const allDay = (d: ISODate) => {
    const start = fromISODate(d).getTime();
    const end = fromISODate(addDaysISO(d, 1)).getTime();
    return events.filter((e) => e.allDay && e.startAt.getTime() < end && e.endAt.getTime() > start);
  };
  const timed = (d: ISODate) => {
    const start = fromISODate(d).getTime();
    const end = fromISODate(addDaysISO(d, 1)).getTime();
    return events
      .filter((e) => !e.allDay && e.startAt.getTime() < end && e.endAt.getTime() > start)
      .map((e) => ({ e, s: Math.max(e.startAt.getTime(), start), f: Math.min(e.endAt.getTime(), end), day: start }));
  };
  const hasAllDay = days.some((d) => allDay(d).length > 0);
  const cols = `56px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="flex h-[calc(100vh-190px)] min-h-[520px] flex-col">
      <div className="grid border-b border-outline" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((d) => (
          <div key={d} className="border-l border-outline px-2 py-2 text-center">
            <div className="text-[11.5px] font-medium text-fg-muted uppercase">{format(fromISODate(d), "EEE")}</div>
            <div
              className={cn(
                "mx-auto mt-0.5 grid size-8 place-items-center rounded-full text-[17px] font-semibold",
                d === today && "bg-primary text-on-primary",
              )}
            >
              {format(fromISODate(d), "d")}
            </div>
          </div>
        ))}
        {hasAllDay && (
          <>
            <div className="px-1 py-1 text-right text-[10.5px] text-fg-subtle">all-day</div>
            {days.map((d) => (
              <div key={d} className="flex flex-col gap-0.5 border-l border-outline p-1">
                {allDay(d).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onOpen({ mode: "edit", event: e })}
                    className="truncate rounded-[6px] px-1.5 py-0.5 text-left text-[11.5px] font-medium"
                    style={{ background: `color-mix(in srgb, ${eventColor(e)} 22%, var(--surface))` }}
                  >
                    {e.title}
                  </button>
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: cols, height: HOUR * 24 }}>
          <div className="relative">
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
              <div key={h} className="tabular absolute right-2 -translate-y-1/2 text-[11px] text-fg-subtle" style={{ top: h * HOUR }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((d) => {
            const items = timed(d);
            const layout = layoutColumns(items.map((x) => ({ start: x.s, end: x.f })));
            const isToday = d === today;
            const nowTop = now && isToday ? ((now.getTime() - fromISODate(d).getTime()) / 3_600_000) * HOUR : null;
            return (
              <div
                key={d}
                className={cn("relative border-l border-outline", isToday && "bg-primary/[0.03]")}
                onClick={(ev) => {
                  if (ev.target !== ev.currentTarget) return;
                  const rect = ev.currentTarget.getBoundingClientRect();
                  const minutes = Math.floor(((ev.clientY - rect.top) / HOUR) * 2) * 30;
                  const start = fromISODate(d);
                  start.setMinutes(minutes);
                  onOpen({ mode: "create", start, end: new Date(start.getTime() + 60 * 60_000) });
                }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-outline/60" style={{ top: h * HOUR }} />
                ))}
                {items.map((x, i) => {
                  const top = ((x.s - x.day) / 3_600_000) * HOUR;
                  const height = Math.max(18, ((x.f - x.s) / 3_600_000) * HOUR - 2);
                  const { column, columns } = layout[i];
                  const color = eventColor(x.e);
                  return (
                    <button
                      key={x.e.id + d}
                      type="button"
                      onClick={() => onOpen({ mode: "edit", event: x.e })}
                      className="absolute overflow-hidden rounded-[8px] border-l-[3px] px-1.5 py-1 text-left transition hover:brightness-95"
                      style={{
                        top,
                        height,
                        left: `calc(${(column / columns) * 100}% + 2px)`,
                        width: `calc(${100 / columns}% - 4px)`,
                        borderColor: color,
                        background: `color-mix(in srgb, ${color} 18%, var(--surface))`,
                      }}
                    >
                      <div className="truncate text-[12px] leading-tight font-semibold">{x.e.title}</div>
                      {height > 30 && (
                        <div className="truncate text-[11px] text-fg-muted">
                          {format(x.e.startAt, "HH:mm")}–{format(x.e.endAt, "HH:mm")}
                          {x.e.isTimeBlock ? " · block" : ""}
                        </div>
                      )}
                    </button>
                  );
                })}
                {nowTop !== null && nowTop >= 0 && nowTop <= HOUR * 24 && (
                  <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }}>
                    <div className="absolute -top-[5px] -left-[5px] size-2.5 rounded-full bg-danger" />
                    <div className="h-[2px] bg-danger" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
