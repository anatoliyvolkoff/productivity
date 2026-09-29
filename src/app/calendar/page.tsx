import { CalendarView, type CalEvent } from "@/components/calendar/CalendarView";
import { addDaysISO, fromISODate, parseHHMM, todayISO, weekStartISO, type ISODate } from "@/lib/domain/dates";
import { suggestSlot } from "@/lib/domain/schedule";
import { blocksForTasks, listEvents } from "@/lib/services/calendar";
import { getDayContext } from "@/lib/services/day";
import { googleStatus } from "@/lib/services/google";
import { listTasks } from "@/lib/services/tasks";

type View = "day" | "week" | "month";

export default async function CalendarPage(props: PageProps<"/calendar">) {
  const sp = await props.searchParams;
  const view: View = sp.view === "day" || sp.view === "month" ? sp.view : "week";
  const today = todayISO();
  const anchor = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;

  let start: ISODate;
  let days: number;
  if (view === "day") {
    start = anchor;
    days = 1;
  } else if (view === "week") {
    start = weekStartISO(anchor);
    days = 7;
  } else {
    start = weekStartISO(`${anchor.slice(0, 7)}-01`);
    days = 42;
  }
  const end = addDaysISO(start, days - 1);

  const now = new Date();
  const [events, google, open, ctx, upcoming] = await Promise.all([
    listEvents(fromISODate(start), fromISODate(addDaysISO(end, 1))),
    googleStatus(),
    listTasks({ view: "open" }),
    getDayContext(today),
    listEvents(now, new Date(now.getTime() + 7 * 86_400_000)),
  ]);

  // Time-blocking suggestions for tasks without an upcoming block.
  const blocks = await blocksForTasks(open.map((t) => t.id));
  const busy = upcoming.filter((e) => !e.allDay).map((e) => ({ start: e.startAt.getTime(), end: e.endAt.getTime() }));
  const wake = parseHHMM(ctx.profile.wakeTarget);
  const peak = ctx.energy.bestWindow;
  const midnight = fromISODate(today).getTime();
  const preferred = peak ? { start: midnight + peak.start * 60_000, end: midnight + peak.end * 60_000 } : null;
  // Highest-priority tasks claim slots first; each claimed slot becomes busy for the next.
  const suggestions = open
    .filter((t) => !blocks.has(t.id) && t.status !== "waiting")
    .slice(0, 6)
    .map((t) => {
      const slot = suggestSlot(busy, t.effortMin ?? 60, now, {
        dayStartMin: Math.max(8 * 60, (Number.isNaN(wake) ? 420 : wake) + 60),
        dayEndMin: 20 * 60,
        preferred: t.energy === "high" ? preferred : null,
      });
      if (slot) busy.push({ start: slot.start, end: slot.end + 10 * 60_000 }); // 10-minute buffer between blocks
      return { id: t.id, title: t.title, priority: t.priority, effortMin: t.effortMin ?? 60, energy: t.energy, slot: slot && { start: new Date(slot.start), end: new Date(slot.end) } };
    });

  const calEvents: CalEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    startAt: e.startAt,
    endAt: e.endAt,
    allDay: e.allDay,
    source: e.source,
    isTimeBlock: e.isTimeBlock,
    isPrivate: e.isPrivate,
    taskId: e.taskId,
    taskTitle: e.taskTitle,
    color: e.calendarColor,
    calendarName: e.calendarName,
    htmlLink: e.htmlLink,
    description: e.description,
    location: e.location,
    writable: e.writable,
    onGoogle: Boolean(e.googleId),
  }));

  return (
    <CalendarView
      view={view}
      anchor={anchor}
      start={start}
      days={days}
      today={today}
      events={calEvents}
      suggestions={suggestions}
      tasks={open.map((t) => ({ id: t.id, title: t.title }))}
      google={{
        configured: google.configured,
        connected: google.connected,
        email: google.accountEmail,
        lastSyncedAt: google.lastSyncedAt,
      }}
      notice={typeof sp.google === "string" ? sp.google : null}
    />
  );
}
