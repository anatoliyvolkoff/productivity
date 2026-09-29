import { Flag, Sparkles } from "lucide-react";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalDialogProvider, NewGoalButton } from "@/components/goals/GoalDialog";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Goal } from "@/lib/db/schema";
import { fromISODate, todayISO } from "@/lib/domain/dates";
import { listGoals } from "@/lib/services/goals";
import { listHabits } from "@/lib/services/habits";
import { listTasks } from "@/lib/services/tasks";

const HORIZONS: Array<{ key: Goal["horizon"]; title: string; hint: string }> = [
  { key: "vision", title: "Vision", hint: "Who you want to be — the direction everything else serves." },
  { key: "year", title: "This year", hint: "" },
  { key: "quarter", title: "This quarter", hint: "" },
  { key: "month", title: "This month", hint: "" },
];

/** Temporal landmarks (a new week, month or quarter) make people more likely to start (Dai, Milkman & Riis, 2014). */
function freshStart(today: string): string | null {
  const d = fromISODate(today);
  if (d.getDate() === 1) return d.getMonth() % 3 === 0 ? "A new quarter starts today" : "A new month starts today";
  if (d.getDay() === 1) return "It's Monday — a new week";
  return null;
}

export default async function GoalsPage() {
  const today = todayISO();
  const [goals, open, habits] = await Promise.all([listGoals({ today }), listTasks({ view: "open" }), listHabits({ days: 30 })]);
  const active = goals.filter((g) => g.status !== "done");
  const done = goals.filter((g) => g.status === "done");
  const landmark = freshStart(today);

  return (
    <GoalDialogProvider goals={goals.map((g) => ({ id: g.id, title: g.title }))}>
      <div className="mx-auto max-w-[1300px]">
        <PageHeader title="Goals" subtitle="Vision → goals → milestones → tasks & habits. Progress fills in from what you link." actions={<NewGoalButton />} />

        {landmark && (
          <div className="mb-5 flex items-center gap-3 rounded-lg bg-primary-soft px-5 py-3.5">
            <Sparkles className="size-5 text-primary" />
            <p className="flex-1 text-[14px]">
              <b>{landmark}</b> — fresh starts are when new intentions stick best. Review your goals or set one.
            </p>
            <NewGoalButton variant="tonal" label="Set a goal" />
          </div>
        )}

        {goals.length === 0 ? (
          <Card>
            <EmptyState icon={Flag} title="No goals yet">
              Start with a vision, then one goal for this quarter. Link tasks and habits to it and progress fills in automatically.
            </EmptyState>
          </Card>
        ) : (
          <div className="flex flex-col gap-8">
            {HORIZONS.map((h) => {
              const list = active.filter((g) => g.horizon === h.key);
              if (list.length === 0 && h.key === "vision") return null;
              return (
                <section key={h.key}>
                  <div className="mb-3 flex items-baseline gap-3">
                    <h2 className="text-[18px] font-semibold tracking-tight">{h.title}</h2>
                    {h.hint && <span className="text-[13px] text-fg-muted">{h.hint}</span>}
                  </div>
                  {list.length === 0 ? (
                    <p className="text-[13px] text-fg-subtle">Nothing for this horizon yet.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {list.map((g) => (
                        <GoalCard
                          key={g.id}
                          goal={g}
                          tasks={open.filter((t) => t.goalId === g.id).map((t) => ({ id: t.id, title: t.title }))}
                          habits={habits.filter((x) => x.goalId === g.id).map((x) => x.title)}
                          subGoals={goals.filter((c) => c.parentId === g.id).map((c) => ({ id: c.id, title: c.title, progress: c.progress }))}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
            {done.length > 0 && (
              <section>
                <h2 className="mb-3 text-[18px] font-semibold tracking-tight">Achieved</h2>
                <div className="grid grid-cols-3 gap-4 opacity-80">
                  {done.map((g) => (
                    <GoalCard key={g.id} goal={g} tasks={[]} habits={[]} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </GoalDialogProvider>
  );
}
