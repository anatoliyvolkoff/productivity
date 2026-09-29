import { FocusTimer } from "@/components/focus/FocusTimer";
import { TimeTracker } from "@/components/focus/TimeTracker";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Ring } from "@/components/widgets/Ring";
import { formatMinutes, minutesToHHMM } from "@/lib/domain/dates";
import { energyLabel } from "@/lib/domain/energy";
import { getDayContext } from "@/lib/services/day";
import { listTasks } from "@/lib/services/tasks";

export default async function FocusPage() {
  const ctx = await getDayContext();
  const open = await listTasks({ view: "open" });
  const options = [...ctx.mits, ...open.filter((t) => !ctx.mits.some((m) => m.id === t.id))].map((t) => ({
    id: t.id,
    title: t.title,
    mit: t.mitOn === ctx.date,
  }));
  const target = ctx.profile.focusTargetMin;
  const session = ctx.runningSession;
  const window = ctx.energy.bestWindow;

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Focus"
        subtitle={
          ctx.energy.now !== null
            ? `Energy now: ${energyLabel(ctx.energy.now)}${window ? ` · best deep-work window ${minutesToHHMM(window.start)}–${minutesToHHMM(window.end)}` : ""}`
            : "One task, one session, no switching."
        }
      />
      <div className="grid grid-cols-[1fr_360px] gap-6">
        <FocusTimer
          session={
            session && {
              id: session.id,
              startedAt: session.startedAt,
              plannedMin: session.plannedMin,
              breakMin: session.breakMin,
              pausedAt: session.pausedAt,
              pausedSec: session.pausedSec,
              preset: session.preset,
              taskTitle: session.taskTitle,
              distractions: session.distractions,
            }
          }
          tasks={options}
          sessionsToday={ctx.sessions.length}
          energyNow={ctx.energy.now}
        />
        <aside className="flex flex-col gap-4">
          <Card title="Today">
            <div className="flex items-center gap-5">
              <div className="relative size-24 shrink-0">
                <Ring value={ctx.focusMin / target} size={96} stroke={11} color="var(--primary)" />
              </div>
              <div>
                <div className="tabular text-[26px] leading-none font-semibold">{formatMinutes(ctx.focusMin)}</div>
                <div className="mt-1 text-[13px] text-fg-muted">of {formatMinutes(target)} focus target</div>
                <div className="mt-2 text-[12.5px] text-fg-subtle">
                  {ctx.sessions.length} {ctx.sessions.length === 1 ? "session" : "sessions"} · {formatMinutes(ctx.deepMin)} deep work
                </div>
              </div>
            </div>
            {ctx.sessions.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2 border-t border-outline pt-3">
                {ctx.sessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="truncate">
                      <span className="tabular mr-2 text-fg-subtle">{minutesToHHMM(s.startedAt.getHours() * 60 + s.startedAt.getMinutes())}</span>
                      {s.taskTitle ?? "Untitled focus"}
                    </span>
                    <span className="shrink-0 text-fg-muted">
                      {s.actualMin}m{s.quality ? ` · ${"★".repeat(s.quality)}` : ""}
                      {s.distractions ? ` · ${s.distractions} parked` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <TimeTracker
            timer={ctx.runningTimer && { startedAt: ctx.runningTimer.startedAt, taskTitle: ctx.runningTimer.taskTitle, note: ctx.runningTimer.note }}
            entries={ctx.entries.map((e) => ({
              id: e.id,
              startedAt: e.startedAt,
              endedAt: e.endedAt,
              minutes: e.minutes,
              taskTitle: e.taskTitle,
              note: e.note,
              source: e.source,
              isDeepWork: e.isDeepWork,
            }))}
            tasks={options}
            trackedMin={ctx.trackedMin}
          />
        </aside>
      </div>
    </div>
  );
}
