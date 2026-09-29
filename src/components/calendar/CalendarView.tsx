"use client";

import { addMonths, format } from "date-fns";
import { CalendarCheck2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { addEvent, syncCalendar } from "@/app/actions/calendar";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PriorityFlag } from "@/components/ui/Chip";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { SegmentedLinks } from "@/components/ui/Segmented";
import { addDaysISO, formatMinutes, fromISODate, toISODate, type ISODate } from "@/lib/domain/dates";
import { useRunner } from "@/lib/hooks/useRunner";
import { EventDialog } from "./EventDialog";
import { MonthGrid } from "./MonthGrid";
import { TimeGrid } from "./TimeGrid";
import type { CalEvent, DialogState } from "./types";

export type { CalEvent };

type View = "day" | "week" | "month";
type Suggestion = { id: string; title: string; priority: number; effortMin: number; energy: "low" | "high" | null; slot: { start: Date; end: Date } | null };

export function CalendarView({
  view,
  anchor,
  start,
  days,
  today,
  events,
  suggestions,
  tasks,
  google,
  notice,
}: {
  view: View;
  anchor: ISODate;
  start: ISODate;
  days: number;
  today: ISODate;
  events: CalEvent[];
  suggestions: Suggestion[];
  tasks: Array<{ id: string; title: string }>;
  google: { configured: boolean; connected: boolean; email: string | null; lastSyncedAt: Date | null };
  notice: string | null;
}) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const { pending, run } = useRunner();

  const shift = (dir: number) =>
    view === "day" ? addDaysISO(anchor, dir) : view === "week" ? addDaysISO(anchor, 7 * dir) : toISODate(addMonths(fromISODate(anchor), dir));
  const href = (date: ISODate, v: View = view) => `/calendar?view=${v}&date=${date}`;
  const end = addDaysISO(start, days - 1);
  const title =
    view === "day"
      ? format(fromISODate(anchor), "EEEE, MMMM d")
      : view === "week"
        ? `${format(fromISODate(start), "MMM d")} – ${format(fromISODate(end), start.slice(0, 7) === end.slice(0, 7) ? "d, yyyy" : "MMM d, yyyy")}`
        : format(fromISODate(anchor), "MMMM yyyy");

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
        <div className="ml-2 flex items-center gap-1">
          <Link href={href(shift(-1))} className={buttonClass("ghost", "icon")} aria-label="Previous">
            <ChevronLeft className="size-5" />
          </Link>
          <Link href={href(today)} className={buttonClass("secondary", "sm")}>
            Today
          </Link>
          <Link href={href(shift(1))} className={buttonClass("ghost", "icon")} aria-label="Next">
            <ChevronRight className="size-5" />
          </Link>
        </div>
        <SegmentedLinks
          className="ml-auto"
          value={view}
          options={(["day", "week", "month"] as const).map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1), href: href(anchor, v) }))}
        />
        <Button
          variant="primary"
          onClick={() => {
            const s = new Date();
            s.setMinutes(0, 0, 0);
            s.setHours(s.getHours() + 1);
            setDialog({ mode: "create", start: s, end: new Date(s.getTime() + 3_600_000) });
          }}
        >
          New event
        </Button>
      </div>

      {notice === "connected" && (
        <div className="mb-4 rounded-md bg-success/12 px-4 py-2.5 text-[13.5px] text-[color:var(--delta-good)]">Google Calendar connected — your events are synced.</div>
      )}

      <div className="grid grid-cols-[1fr_300px] items-start gap-4">
        <div className="overflow-hidden rounded-xl bg-surface shadow-card">
          {view === "month" ? (
            <MonthGrid start={start} anchor={anchor} today={today} events={events} onOpen={setDialog} />
          ) : (
            <TimeGrid days={Array.from({ length: days }, (_, i) => addDaysISO(start, i))} today={today} events={events} onOpen={setDialog} />
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Card title="Time-block your tasks">
            <p className="-mt-1 mb-2 text-[12.5px] text-fg-muted">Tasks with a time and place get done far more often. High-energy tasks go to your peak window.</p>
            {suggestions.length === 0 ? (
              <p className="text-[13px] text-fg-subtle">Every open task already has a block.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-outline/70">
                {suggestions.map((s) => (
                  <li key={s.id} className="py-2.5">
                    <div className="flex items-center gap-1.5 text-[13.5px] font-medium">
                      {s.priority <= 2 && <PriorityFlag priority={s.priority} />}
                      <span className="truncate">{s.title}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      {s.slot ? (
                        <Button
                          size="sm"
                          variant="tonal"
                          disabled={pending}
                          onClick={() =>
                            run(() => addEvent({ title: s.title, startAt: s.slot!.start, endAt: s.slot!.end, taskId: s.id, isTimeBlock: true }), { success: "Blocked" })
                          }
                        >
                          <CalendarCheck2 className="size-3.5" />
                          {format(s.slot.start, toISODate(s.slot.start) === today ? "'Today' HH:mm" : "EEE HH:mm")}–{format(s.slot.end, "HH:mm")}
                        </Button>
                      ) : (
                        <span className="text-[12px] text-fg-subtle">No free slot this week</span>
                      )}
                      <button
                        type="button"
                        className="text-[12px] whitespace-nowrap text-fg-muted hover:text-primary"
                        onClick={() => {
                          const startAt = s.slot?.start ?? new Date();
                          setDialog({ mode: "create", start: startAt, end: new Date(startAt.getTime() + s.effortMin * 60_000), taskId: s.id, title: s.title, timeBlock: true });
                        }}
                      >
                        Pick time…
                      </button>
                      <span className="ml-auto text-[11.5px] text-fg-subtle">{formatMinutes(s.effortMin)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Google Calendar">
            {!google.configured ? (
              <p className="text-[13px] text-fg-muted">
                To sync, add <code className="font-mono text-[12px]">GOOGLE_CLIENT_ID</code> and <code className="font-mono text-[12px]">GOOGLE_CLIENT_SECRET</code> to <code className="font-mono text-[12px]">.env.local</code> (see the README), then restart.
              </p>
            ) : !google.connected ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-[13px] text-fg-muted">Two-way sync: your events show up here, and time blocks you create go to Google.</p>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- OAuth needs a full-page navigation to the route handler */}
                <a href="/api/google/connect" className={buttonClass("primary", "sm")}>
                  Connect Google Calendar
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-[13px]">
                <p className="truncate text-fg-muted">{google.email}</p>
                <p className="text-fg-subtle">{google.lastSyncedAt ? <>Synced <RelativeTime date={google.lastSyncedAt} /></> : "Not synced yet"}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => syncCalendar(true), { success: "Synced" })}>
                    <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} /> Sync now
                  </Button>
                  <Link href="/settings#google" className={buttonClass("ghost", "sm")}>
                    Calendars…
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </aside>
      </div>

      {dialog && <EventDialog state={dialog} tasks={tasks} googleConnected={google.connected} onClose={() => setDialog(null)} />}
    </div>
  );
}
