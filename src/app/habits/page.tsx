import { Flame, Link2 } from "lucide-react";
import { Heatmap } from "@/components/charts/Heatmap";
import { HabitChecklist } from "@/components/dashboard/HabitChecklist";
import { EditHabitButton, HabitDialogProvider, NewHabitButton } from "@/components/habits/HabitDialog";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/Progress";
import { Ring } from "@/components/widgets/Ring";
import { addDaysISO, rangeISO, todayISO } from "@/lib/domain/dates";
import { HABIT_FORMATION_DAYS, isScheduledOn, scheduleLabel } from "@/lib/domain/habits";
import { goalOptions } from "@/lib/services/goals";
import { habitDayProgress, listHabits, type HabitView } from "@/lib/services/habits";

export default async function HabitsPage() {
  const today = todayISO();
  const [habits, goals] = await Promise.all([listHabits({ days: 120 }), goalOptions()]);
  const progress = habitDayProgress(habits);
  const todayList = habits.filter((h) => h.scheduledToday && (h.schedule.kind !== "per_week" || !h.streak.doneNow || h.doneToday));
  const chains = stacks(habits);

  return (
    <HabitDialogProvider habits={habits.map((h) => ({ id: h.id, title: h.title }))} goals={goals}>
      <div className="mx-auto max-w-[1300px]">
        <PageHeader
          title="Habits"
          subtitle={habits.length ? `${progress.done} of ${progress.total} done today · a habit takes ~${HABIT_FORMATION_DAYS} days to become automatic` : "Small, repeated, cued — that's how habits stick."}
          actions={<NewHabitButton />}
        />
        {habits.length === 0 ? (
          <Card>
            <EmptyState icon={Flame} title="No habits yet">
              Start with one tiny habit tied to something you already do: “After my morning coffee, I will meditate for 2 minutes.”
            </EmptyState>
          </Card>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            <Card title="Today" className="col-span-5 row-span-2">
              <HabitChecklist habits={todayList} showCue />
            </Card>
            <Card title="How it works" className="col-span-7">
              <ul className="grid grid-cols-3 gap-4 text-[13px] text-fg-muted">
                <li>
                  <b className="block text-fg">Never miss twice</b>A single miss barely affects habit formation. Your streak survives one miss — two in a row breaks it.
                </li>
                <li>
                  <b className="block text-fg">Cue it</b>“After X, I will Y” — an if-then plan ties the habit to something you already do.
                </li>
                <li>
                  <b className="block text-fg">Strength, not just streaks</b>Strength weighs recent consistency, so one bad day dents it instead of zeroing it.
                </li>
              </ul>
            </Card>
            <Card title="Habit stacks" className="col-span-7">
              {chains.length === 0 ? (
                <p className="text-[13px] text-fg-subtle">Link habits with “Stack it after…” to build routines like Coffee → Meditate → Journal.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {chains.map((chain) => (
                    <li key={chain[0].id} className="flex flex-wrap items-center gap-1.5 text-[13.5px]">
                      {chain.map((h, i) => (
                        <span key={h.id} className="flex items-center gap-1.5">
                          {i > 0 && <Link2 className="size-3.5 text-fg-subtle" />}
                          <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ background: `color-mix(in srgb, ${h.color ?? "var(--series-1)"} 16%, transparent)` }}>
                            {h.title}
                          </span>
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {habits.map((h) => (
              <HabitCard key={h.id} habit={h} today={today} />
            ))}
          </div>
        )}
      </div>
    </HabitDialogProvider>
  );
}

function HabitCard({ habit: h, today }: { habit: HabitView; today: string }) {
  const from = [addDaysISO(today, -83), h.startDate].sort()[1];
  const cells = Object.fromEntries(
    rangeISO(from, today).map((d) => {
      const v = h.values[d] ?? 0;
      const scheduled = isScheduledOn(h.schedule, d);
      const unit = h.type === "duration" ? " min" : h.unit ? ` ${h.unit}` : "";
      return [
        d,
        {
          value: scheduled ? Math.min(1, v / h.target) : null,
          text: !scheduled ? "Not scheduled" : h.type === "boolean" ? (v >= 1 ? "Done" : "Missed") : `${Math.round(v)} / ${h.target}${unit}`,
        },
      ];
    }),
  );
  const color = h.color ?? "var(--series-1)";

  return (
    <Card className="col-span-6">
      <div className="flex items-start gap-4">
        <div className="relative size-16 shrink-0" title={`Strength ${Math.round(h.strength * 100)}%`}>
          <Ring value={h.strength} size={64} stroke={8} color={color} />
          <div className="absolute inset-0 grid place-items-center text-[13px] font-semibold">{Math.round(h.strength * 100)}%</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[16px] font-semibold">
              {h.isNegative && <span className="mr-1 text-fg-muted">Avoid:</span>}
              {h.title}
            </h3>
            <span className="ml-auto">
              <EditHabitButton habit={h} />
            </span>
          </div>
          <p className="text-[12.5px] text-fg-muted">
            {scheduleLabel(h.schedule)}
            {h.type !== "boolean" && ` · ${h.target}${h.type === "duration" ? " min" : h.unit ? ` ${h.unit}` : ""}`}
            {h.autoSource === "focus_minutes" && " · filled from focus sessions"}
            {h.autoSource === "tasks_done" && " · filled from completed tasks"}
          </p>
          {h.cue && <p className="mt-1 text-[12.5px] text-fg-subtle italic">“{h.cue}”</p>}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-[12px]">
        <div>
          <dt className="text-fg-muted">Streak</dt>
          <dd className="flex items-center gap-1 text-[18px] font-semibold">
            <Flame className="size-4 text-accent" />
            {h.streak.current}
            <span className="text-[12px] font-normal text-fg-muted">
              {h.streak.unit}
              {h.streak.current === 1 ? "" : "s"} · best {h.streak.best}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-fg-muted">Last 30 days</dt>
          <dd className="text-[18px] font-semibold">{h.adherence30 === null ? "—" : `${Math.round(h.adherence30 * 100)}%`}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">Toward automatic</dt>
          <dd className="mt-1.5">
            <ProgressBar value={h.formation} color={color} height={6} />
            <span className="text-fg-subtle">{Math.round(h.formation * HABIT_FORMATION_DAYS)} of {HABIT_FORMATION_DAYS} reps</span>
          </dd>
        </div>
      </dl>
      {h.streak.missedLast && !h.doneToday && <p className="mt-3 text-[12.5px] font-medium text-accent">Missed last time — today is the one that counts. Never miss twice.</p>}

      <div className="mt-4">
        <Heatmap from={from} to={today} cells={cells} cell={11} />
      </div>
    </Card>
  );
}

/** Chains of stacked habits, e.g. Coffee → Meditate → Journal. */
function stacks(habits: HabitView[]): HabitView[][] {
  const byAnchor = new Map<string, HabitView[]>();
  for (const h of habits) if (h.stackAfterHabitId) byAnchor.set(h.stackAfterHabitId, [...(byAnchor.get(h.stackAfterHabitId) ?? []), h]);
  const roots = habits.filter((h) => !h.stackAfterHabitId && byAnchor.has(h.id));
  return roots.map((root) => {
    const chain = [root];
    let cur = root;
    const seen = new Set([root.id]);
    while (byAnchor.get(cur.id)?.length) {
      const next = byAnchor.get(cur.id)![0];
      if (seen.has(next.id)) break;
      seen.add(next.id);
      chain.push(next);
      cur = next;
    }
    return chain;
  });
}
