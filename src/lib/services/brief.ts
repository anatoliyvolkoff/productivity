import "server-only";
import { format } from "date-fns";
import { daysBetween, formatMinutes, fromISODate, minutesToHHMM } from "@/lib/domain/dates";
import { energyLabel } from "@/lib/domain/energy";
import { eisenhower } from "@/lib/domain/priority";
import type { MorningBriefT } from "./ai";
import type { DayContext } from "./day";
import type { TaskRow } from "./tasks";

const CLOSERS = [
  "Start with the first ten minutes of task one — momentum does the rest.",
  "Three things done well beat ten things started.",
  "Protect the peak hours; everything else fits around them.",
  "Progress, not perfection. Small wins compound.",
  "One task at a time — switching costs more than it feels like.",
];

/**
 * A rule-based daily brief built from the same data the AI sees — useful on
 * its own and as a fallback when no API key is configured.
 */
export function buildLocalBrief(ctx: DayContext): MorningBriefT {
  const today = ctx.date;
  const openMits = ctx.mits.filter((t) => t.status !== "done" && t.status !== "dropped");
  const byScore = [...ctx.otherTasks].sort((a, b) => b.score - a.score);
  const important = (openMits.length ? openMits : byScore.slice(0, 3)).slice(0, 3);
  const chosen = new Set(important.map((t) => t.id));

  const notImportant = byScore
    .filter((t) => !chosen.has(t.id))
    .map((t) => ({ t, q: eisenhower(t, today) }))
    .filter(({ q }) => q !== "do")
    .slice(0, 3)
    .map(({ t, q }) => ({
      title: t.title,
      suggestion: q === "delegate" ? ("batch" as const) : ("defer" as const),
      why: q === "delegate" ? "Urgent but not important — batch it with other small tasks." : q === "schedule" ? "Important but not urgent — give it a slot later this week." : "Neither urgent nor important right now.",
    }));

  const timed = ctx.events.filter((e) => !e.allDay);
  const meetingMin = timed.reduce((s, e) => s + (e.endAt.getTime() - e.startAt.getTime()) / 60_000, 0);
  const w = ctx.energy.bestWindow;
  const schedule = [
    w ? `Best deep-work window ${minutesToHHMM(w.start)}–${minutesToHHMM(w.end)} (highest estimated energy, free on your calendar).` : "No long free window left today — use short focus sessions.",
    timed.length
      ? `${timed.length} ${timed.length === 1 ? "event" : "events"} (${formatMinutes(meetingMin)}): ${timed
          .slice(0, 4)
          .map((e) => `${format(e.startAt, "HH:mm")} ${e.title}`)
          .join(", ")}${timed.length > 4 ? "…" : ""}.`
      : "Calendar is clear.",
    "Plan lighter work for the post-lunch dip and take a real break every 60–90 minutes.",
  ].join(" ");

  const sleep = ctx.sleep;
  const target = ctx.profile.sleepTargetMin;
  let energy: string;
  if (sleep.lastNight) {
    const short = target - sleep.lastNight.asleepMin;
    energy =
      short > 60
        ? `Slept ${formatMinutes(sleep.lastNight.asleepMin)}, ${formatMinutes(short)} under your target — keep today's intensity moderate and front-load the hard task.`
        : `Slept ${formatMinutes(sleep.lastNight.asleepMin)} — you're well rested enough for demanding work.`;
  } else {
    energy = "No sleep logged for last night — log it for a better energy estimate.";
  }
  if (sleep.debt14 > target) energy += ` Sleep debt is ${formatMinutes(sleep.debt14)} over two weeks; an earlier night would pay it down.`;
  if (ctx.energy.now !== null) energy += ` Energy now: ${energyLabel(ctx.energy.now).toLowerCase()}.`;

  const remaining = ctx.habits.filter((h) => h.scheduledToday && !h.doneToday && !(h.schedule.kind === "per_week" && h.streak.doneNow));
  const atRisk = remaining.filter((h) => h.streak.missedLast);
  const habits = atRisk.length
    ? `Don't miss twice: ${atRisk.map((h) => h.title).join(", ")}. ${remaining.length > atRisk.length ? `Also left: ${remaining.filter((h) => !h.streak.missedLast).slice(0, 3).map((h) => h.title).join(", ")}.` : ""}`.trim()
    : remaining.length
      ? `Still to do: ${remaining.slice(0, 4).map((h) => h.title).join(", ")}.`
      : ctx.habits.length
        ? "All of today's habits are done."
        : "No habits yet — pick one small daily habit to start.";

  const overdue = ctx.otherTasks.filter((t) => t.dueDate && t.dueDate < today);
  const watchOut = overdue.length
    ? `${overdue.length} overdue ${overdue.length === 1 ? "task" : "tasks"} — reschedule or drop ${overdue.length === 1 ? "it" : "them"} so ${overdue.length === 1 ? "it stops" : "they stop"} nagging.`
    : meetingMin > 240
      ? `Meetings take ${formatMinutes(meetingMin)} today — guard at least one focus block.`
      : null;

  const day = format(fromISODate(today), "EEEE");
  const headline = important.length
    ? `${day}: ${important.length === 1 ? "one thing" : `${important.length} things`} to win the day${timed.length ? `, ${timed.length} on the calendar` : ""}.`
    : `${day}: no top tasks yet — pick up to three.`;

  return {
    headline,
    important: important.map((t) => ({ title: t.title, why: reason(t, today, openMits.length > 0), taskId: t.id })),
    notImportant,
    schedule,
    energy,
    habits,
    watchOut,
    encouragement: CLOSERS[daysBetween("2026-01-01", today) % CLOSERS.length] ?? CLOSERS[0],
  };
}

function reason(t: TaskRow, today: string, picked: boolean): string {
  const parts: string[] = [];
  if (t.dueDate) {
    const d = daysBetween(today, t.dueDate);
    parts.push(d < 0 ? "overdue" : d === 0 ? "due today" : d === 1 ? "due tomorrow" : `due in ${d} days`);
  }
  if (t.goalTitle) parts.push(`moves “${t.goalTitle}” forward`);
  if (t.priority <= 2) parts.push(`priority P${t.priority}`);
  if (t.energy === "high") parts.push("needs your peak energy");
  if (parts.length === 0) parts.push(picked ? "you picked it as a top task" : "highest priority score today");
  return parts.join(" · ");
}
