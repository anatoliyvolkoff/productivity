import type { TimelineItem, TimelineMood } from "@/components/charts/DayTimeline";
import { QUADRANT_INFO } from "@/lib/domain/mood";
import type { DayContext } from "@/lib/services/day";

/** Build timeline lanes from a day context (server-side, serializable). */
export function timelineFor(ctx: DayContext): { items: TimelineItem[]; moods: TimelineMood[] } {
  const now = new Date();
  const items: TimelineItem[] = [
    ...ctx.events.filter((e) => !e.allDay).map((e) => ({ lane: "calendar" as const, title: e.title, start: e.startAt, end: e.endAt })),
    ...ctx.sessions.map((s) => ({
      lane: "focus" as const,
      title: s.taskTitle ?? "Focus session",
      start: s.startedAt,
      end: s.endedAt ?? new Date(s.startedAt.getTime() + (s.actualMin ?? s.plannedMin) * 60_000),
    })),
    ...(ctx.runningSession ? [{ lane: "focus" as const, title: ctx.runningSession.taskTitle ?? "Focus (running)", start: ctx.runningSession.startedAt, end: now }] : []),
    ...ctx.entries
      .filter((e) => e.source !== "focus")
      .map((e) => ({ lane: "tracked" as const, title: e.taskTitle ?? e.note ?? "Tracked time", start: e.startedAt, end: e.endedAt ?? now })),
  ];
  const moods = ctx.mood.map((m) => ({ at: m.at, emotion: m.emotion, color: QUADRANT_INFO[m.quadrant].color }));
  return { items, moods };
}
