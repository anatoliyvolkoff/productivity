import { DoneJar } from "@/components/now/DoneJar";
import { Greeting } from "@/components/now/Greeting";
import { WhatNow, type WhatNowTask } from "@/components/now/WhatNow";
import { ReminderCard } from "@/components/reminders/ReminderCard";
import { WheneverDrawer } from "@/components/tasks/WheneverDrawer";
import { toISODate } from "@/lib/domain/dates";
import { getDayContext } from "@/lib/services/day";
import { listReminders } from "@/lib/services/reminders";
import { currentSteps } from "@/lib/services/steps";
import { listTasks } from "@/lib/services/tasks";

/**
 * Home: "What now?" — the core loop. Kept deliberately sparse: one question,
 * one task, what's done, today's reminders, and a quiet Whenever drawer.
 */
export default async function NowPage() {
  const ctx = await getDayContext();
  const [open, done, reminders] = await Promise.all([listTasks({ view: "open" }), listTasks({ view: "done", limit: 80 }), listReminders(ctx.date)]);
  const steps = await currentSteps(open.map((t) => t.id));
  const doneToday = done.filter((t) => t.status === "done" && t.completedAt && toISODate(t.completedAt) === ctx.date);

  const tasks: WhatNowTask[] = open.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    energy: t.energy,
    goalId: t.goalId,
    goalPriority: t.goalPriority,
    effortMin: t.effortMin,
    mitOn: t.mitOn,
    notNowAt: t.notNowAt,
    hasSteps: steps.has(t.id),
  }));

  const s = ctx.runningSession;
  const running =
    s && s.taskId
      ? { task: { id: s.taskId, title: s.taskTitle ?? "Your task" }, session: { id: s.id, startedAt: s.startedAt, plannedMin: s.plannedMin, pausedSec: s.pausedSec } }
      : null;

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-5">
      <Greeting name={ctx.profile.name} nextEvent={ctx.nextEvent && { title: ctx.nextEvent.title, startAt: ctx.nextEvent.startAt }} />
      <WhatNow tasks={tasks} running={running} />
      <div className="grid grid-cols-2 gap-5">
        <DoneJar done={doneToday.map((t) => ({ id: t.id, title: t.title }))} />
        <div className="flex flex-col gap-5">
          {reminders.map((r) => (
            <ReminderCard key={r.id} reminder={r} />
          ))}
        </div>
      </div>
      <WheneverDrawer tasks={ctx.whenever.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate }))} />
    </div>
  );
}
