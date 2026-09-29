import { format } from "date-fns";
import { DayTimeline } from "@/components/charts/DayTimeline";
import { EnergyCurve } from "@/components/charts/EnergyCurve";
import { HabitChecklist } from "@/components/dashboard/HabitChecklist";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { QuickAddInput } from "@/components/tasks/QuickAddInput";
import { TaskList } from "@/components/tasks/TaskList";
import { DailyNoteStarter } from "@/components/today/DailyNoteStarter";
import { ShutdownPanel } from "@/components/today/ShutdownPanel";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { addDaysISO, formatMinutes, fromISODate, minutesToHHMM, toISODate } from "@/lib/domain/dates";
import { energyLabel } from "@/lib/domain/energy";
import { MAX_MITS } from "@/lib/domain/priority";
import { aiConfigured, latestSummary, type EveningSummaryT } from "@/lib/services/ai";
import { getDayContext } from "@/lib/services/day";
import { getDailyNote } from "@/lib/services/notes";
import { listTasks } from "@/lib/services/tasks";
import { timelineFor } from "@/lib/timeline";

export default async function TodayPage() {
  const ctx = await getDayContext();
  const [note, evening, done] = await Promise.all([getDailyNote(ctx.date), latestSummary(ctx.date, "evening"), listTasks({ view: "done", limit: 80 })]);
  const doneToday = done.filter((t) => t.completedAt && toISODate(t.completedAt) === ctx.date);
  const timeline = timelineFor(ctx);
  const habits = ctx.habits.filter((h) => h.scheduledToday && (h.schedule.kind !== "per_week" || !h.streak.doneNow || h.doneToday));
  const w = ctx.energy.bestWindow;
  const openMits = ctx.mits.filter((t) => t.status !== "done" && t.status !== "dropped").length;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Today"
        subtitle={[
          format(fromISODate(ctx.date), "EEEE, MMMM d"),
          ctx.energy.now !== null ? `energy now: ${energyLabel(ctx.energy.now).toLowerCase()}` : null,
          w ? `best deep-work window ${minutesToHHMM(w.start)}–${minutesToHHMM(w.end)}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7 flex flex-col gap-4">
          <Card title={`Top ${MAX_MITS} · what would make today a win?`} className="border-l-4 border-accent">
            <TaskList tasks={ctx.mits} emptyText="Pick up to three. Star tasks in the list below, or add one here." />
            {ctx.mits.length < MAX_MITS && (
              <QuickAddInput defaults={{ mitOn: ctx.date }} className="mt-3 shadow-none ring-1 ring-outline" placeholder="Add a top task for today…" />
            )}
          </Card>
          <Card title="Also on today">
            <TaskList tasks={ctx.otherTasks} emptyText="Nothing else due today." />
          </Card>
          <Card title="Timeline">
            <DayTimeline items={timeline.items} moods={timeline.moods} fromMinute={ctx.energy.wakeMinute} toMinute={Math.min(ctx.energy.bedMinute, 1440)} day={fromISODate(ctx.date)} />
          </Card>
          <Card title="Energy · estimated from your wake time, sleep and chronotype">
            <EnergyCurve curve={ctx.energy.curve} bestWindow={ctx.energy.bestWindow} height={170} />
            <p className="mt-2 text-[12.5px] text-fg-muted">
              Schedule demanding work at the peak and routine work in the dip. It&apos;s a model of the typical circadian
              pattern, not a measurement — your own focus-quality ratings will tell you more over time.
            </p>
          </Card>
        </div>
        <div className="col-span-5 flex flex-col gap-4">
          <Card title={`Habits · ${ctx.habitProgress.done}/${ctx.habitProgress.total} done`}>
            <HabitChecklist habits={habits} showCue />
          </Card>
          {note ? (
            <div className="h-[380px]">
              <NoteEditor
                compact
                note={{ id: note.id, title: note.title, contentMd: note.contentMd, pinned: note.pinned, tags: note.tags, dailyDate: note.dailyDate, updatedAt: note.updatedAt }}
              />
            </div>
          ) : (
            <DailyNoteStarter date={ctx.date} />
          )}
          <ShutdownPanel
            date={ctx.date}
            tomorrow={addDaysISO(ctx.date, 1)}
            stats={{
              tasksDone: doneToday.length,
              focus: formatMinutes(ctx.focusMin),
              tracked: formatMinutes(ctx.trackedMin),
              moods: ctx.mood.length,
              openMits,
            }}
            summary={(evening?.output as EveningSummaryT | undefined) ?? null}
            configured={aiConfigured()}
          />
        </div>
      </div>
    </div>
  );
}
