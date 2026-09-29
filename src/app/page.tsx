import { format } from "date-fns";
import { Suspense } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { DayTimeline } from "@/components/charts/DayTimeline";
import { EnergyCurve } from "@/components/charts/EnergyCurve";
import { AiBriefCard } from "@/components/dashboard/AiBriefCard";
import { KpiTile } from "@/components/dashboard/Benchmarks";
import { GoalsCard } from "@/components/dashboard/GoalsCard";
import { HabitChecklist } from "@/components/dashboard/HabitChecklist";
import { MoodCard } from "@/components/dashboard/MoodCard";
import { NowCard } from "@/components/dashboard/NowCard";
import { SleepCard } from "@/components/dashboard/SleepCard";
import { WeatherCard } from "@/components/dashboard/WeatherCard";
import { QuickAddInput } from "@/components/tasks/QuickAddInput";
import { TaskList } from "@/components/tasks/TaskList";
import { Card } from "@/components/ui/Card";
import { ClockWidget } from "@/components/widgets/ClockWidget";
import { TodayRings } from "@/components/widgets/TodayRings";
import { fromISODate } from "@/lib/domain/dates";
import { energyLabel } from "@/lib/domain/energy";
import { MAX_MITS } from "@/lib/domain/priority";
import { aiConfigured, latestSummary, type MorningBriefT } from "@/lib/services/ai";
import { buildLocalBrief } from "@/lib/services/brief";
import { getDayContext } from "@/lib/services/day";
import { getInsights } from "@/lib/services/insights";
import { lastMood } from "@/lib/services/mood";
import { timelineFor } from "@/lib/timeline";

export default async function DashboardPage() {
  const ctx = await getDayContext();
  const [insights, aiBrief, last] = await Promise.all([getInsights(7, ctx.date), latestSummary(ctx.date, "morning"), lastMood()]);
  const timeline = timelineFor(ctx);
  const habitsToday = ctx.habits.filter((h) => h.scheduledToday && (h.schedule.kind !== "per_week" || !h.streak.doneNow || h.doneToday));
  const mitsDone = ctx.mits.filter((t) => t.status === "done").length;
  const topTask = ctx.mits.find((t) => t.status !== "done") ?? ctx.otherTasks[0] ?? null;
  const brief = (aiBrief?.output as MorningBriefT | undefined) ?? buildLocalBrief(ctx);

  return (
    <div className="mx-auto grid max-w-[1500px] grid-cols-12 gap-4">
      <div className="col-span-6 row-span-2">
        <AiBriefCard brief={brief} source={aiBrief ? "ai" : "local"} createdAt={aiBrief?.createdAt ?? null} configured={aiConfigured()} />
      </div>
      <div className="col-span-3">
        <ClockWidget
          wakeMinute={ctx.energy.wakeMinute}
          bedMinute={Math.min(ctx.energy.bedMinute, 1439)}
          nextEvent={ctx.nextEvent && { title: ctx.nextEvent.title, startAt: ctx.nextEvent.startAt }}
        />
      </div>
      <div className="col-span-3">
        <NowCard
          session={ctx.runningSession}
          timer={ctx.runningTimer && { startedAt: ctx.runningTimer.startedAt, taskTitle: ctx.runningTimer.taskTitle, note: ctx.runningTimer.note }}
          topTask={topTask && { id: topTask.id, title: topTask.title }}
          bestWindow={ctx.energy.bestWindow}
          energyLabel={ctx.energy.now !== null ? energyLabel(ctx.energy.now) : null}
        />
      </div>
      <div className="col-span-3">
        <TodayRings
          focusMin={ctx.focusMin}
          focusTarget={ctx.profile.focusTargetMin}
          habitsDone={ctx.habitProgress.done}
          habitsTotal={ctx.habitProgress.total}
          mitsDone={mitsDone}
          mitsTotal={ctx.mits.length}
        />
      </div>
      <div className="col-span-3">
        <Suspense fallback={<Card title="Weather" className="h-full" />}>
          <WeatherCard />
        </Suspense>
      </div>

      <Card title={`Top ${MAX_MITS} today · ${mitsDone}/${Math.max(ctx.mits.length, MAX_MITS)} done`} className="col-span-6">
        <TaskList tasks={ctx.mits} compact emptyText="Star up to three tasks that would make today a win." />
        {ctx.otherTasks.length > 0 && (
          <>
            <div className="mt-3 mb-1 text-[12px] font-medium text-fg-muted">Also due or in progress</div>
            <TaskList tasks={ctx.otherTasks.slice(0, 4)} compact />
          </>
        )}
        <QuickAddInput className="mt-3 shadow-none ring-1 ring-outline" placeholder="Add a task… (N)" />
      </Card>
      <Card title="Habits today" className="col-span-3">
        <HabitChecklist habits={habitsToday} />
      </Card>
      <div className="col-span-3">
        <SleepCard sleep={ctx.sleep} targetMin={ctx.profile.sleepTargetMin} />
      </div>

      <Card title="Today's timeline" className="col-span-7">
        <DayTimeline items={timeline.items} moods={timeline.moods} fromMinute={ctx.energy.wakeMinute} toMinute={Math.min(ctx.energy.bedMinute, 1440)} day={fromISODate(ctx.date)} />
      </Card>
      <Card title="Energy · estimate" className="col-span-5">
        <EnergyCurve curve={ctx.energy.curve} bestWindow={ctx.energy.bestWindow} height={150} />
      </Card>

      <div className="col-span-4">
        <GoalsCard goals={ctx.goals} />
      </div>
      <div className="col-span-4">
        <MoodCard last={last} countToday={ctx.mood.length} />
      </div>
      <Card title="Focus · last 7 days" className="col-span-4">
        <BarChart
          data={insights.current.map((d) => ({ label: format(fromISODate(d.date), "EEE, MMM d"), short: format(fromISODate(d.date), "EEEEE"), value: d.focusMin }))}
          unit="minutes"
          target={ctx.profile.focusTargetMin}
          targetLabel="Target"
          height={170}
        />
      </Card>

      <Card title="This week vs. the 4 weeks before · daily average" className="col-span-12">
        <div className="grid grid-cols-6 gap-6">
          {insights.kpis.map((k) => (
            <KpiTile key={k.key} kpi={k} />
          ))}
        </div>
      </Card>
    </div>
  );
}
