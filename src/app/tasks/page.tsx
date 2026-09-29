import { Grid2x2, List } from "lucide-react";
import Link from "next/link";
import { EisenhowerMatrix } from "@/components/tasks/EisenhowerMatrix";
import { QuickAddInput } from "@/components/tasks/QuickAddInput";
import { TaskList } from "@/components/tasks/TaskList";
import { Card } from "@/components/ui/Card";
import { SegmentedLinks } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/ui/PageHeader";
import { TagChip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { relativeDayLabel, toISODate, todayISO } from "@/lib/domain/dates";
import { MAX_MITS } from "@/lib/domain/priority";
import { listTags } from "@/lib/services/tags";
import { listTasks, type TaskView } from "@/lib/services/tasks";

const VIEWS: Array<{ value: TaskView; label: string }> = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "open", label: "All open" },
  { value: "inbox", label: "Inbox" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done" },
];

export default async function TasksPage(props: PageProps<"/tasks">) {
  const sp = await props.searchParams;
  const view = (VIEWS.some((v) => v.value === sp.view) ? sp.view : "today") as TaskView;
  const tag = typeof sp.tag === "string" ? sp.tag : undefined;
  const matrix = sp.mode === "matrix";
  const today = todayISO();

  const [tasks, tags, open, done] = await Promise.all([
    listTasks({ view: matrix ? "open" : view, tag }),
    listTags(),
    listTasks({ view: "open" }),
    view === "today" && !matrix ? listTasks({ view: "done", limit: 60 }) : Promise.resolve([]),
  ]);
  const tagColors = Object.fromEntries(tags.map((t) => [t.name, t.color]));
  const doneToday = done.filter((t) => t.completedAt && toISODate(t.completedAt) === today);
  const mits = tasks.filter((t) => t.mitOn === today);
  const rest = tasks.filter((t) => t.mitOn !== today);

  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const next = { view, tag, mode: matrix ? "matrix" : undefined, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    return `/tasks${params.size ? `?${params}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Tasks"
        subtitle={`${open.length} open · ${mits.length}/${MAX_MITS} top tasks today`}
        actions={
          <div className="inline-flex rounded-full bg-surface-3 p-1">
            <Link href={href({ mode: undefined })} className={cn("grid size-8 place-items-center rounded-full", !matrix ? "bg-surface shadow-sm" : "text-fg-muted")} aria-label="List view">
              <List className="size-4" />
            </Link>
            <Link href={href({ mode: "matrix" })} className={cn("grid size-8 place-items-center rounded-full", matrix ? "bg-surface shadow-sm" : "text-fg-muted")} aria-label="Eisenhower matrix">
              <Grid2x2 className="size-4" />
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-[1fr_280px] gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <QuickAddInput defaults={tag ? { tags: [tag] } : undefined} />

          {matrix ? (
            <EisenhowerMatrix tasks={tasks} tagColors={tagColors} />
          ) : (
            <>
              <SegmentedLinks value={view} options={VIEWS.map((v) => ({ ...v, href: href({ view: v.value }) }))} className="self-start" />
              {view === "today" ? (
                <>
                  <Card title={`Top ${MAX_MITS} — most important today`} className="border-l-4 border-accent">
                    <TaskList tasks={mits} tagColors={tagColors} emptyText="Star up to three tasks that would make today a win." />
                  </Card>
                  <Card title="Also on today">
                    <TaskList tasks={rest} tagColors={tagColors} emptyText="Nothing else due. Pick from All open, or enjoy the space." />
                  </Card>
                  {doneToday.length > 0 && (
                    <Card title={`Completed today · ${doneToday.length}`}>
                      <TaskList tasks={doneToday} tagColors={tagColors} compact showMitToggle={false} />
                    </Card>
                  )}
                </>
              ) : view === "upcoming" ? (
                <UpcomingGroups tasks={tasks} tagColors={tagColors} today={today} />
              ) : (
                <Card>
                  <TaskList
                    tasks={tasks}
                    tagColors={tagColors}
                    showMitToggle={view !== "done"}
                    emptyText={view === "done" ? "Nothing completed yet." : "Nothing here."}
                  />
                </Card>
              )}
            </>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Card title="Tags">
            {tags.length === 0 ? (
              <p className="text-[13px] text-fg-subtle">Add #tags in quick add, e.g. “Draft proposal #work”.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tag && (
                  <Link href={href({ tag: undefined })} className="rounded-full bg-fg px-2 py-0.5 text-[11.5px] font-medium text-bg">
                    Clear filter
                  </Link>
                )}
                {tags.map((t) => (
                  <Link key={t.name} href={href({ tag: t.name === tag ? undefined : t.name })} className={cn(t.name === tag && "ring-2 ring-primary rounded-full")}>
                    <TagChip name={`${t.name} ${t.count}`} color={t.color} />
                  </Link>
                ))}
              </div>
            )}
          </Card>
          <Card title="Why only three?">
            <p className="text-[13px] leading-relaxed text-fg-muted">
              Working memory holds about four items at once. Naming three important tasks keeps the day clear and gives you
              a finish line. Everything else is a bonus.
            </p>
          </Card>
          <Card title="Quick add syntax">
            <ul className="space-y-1 text-[12.5px] text-fg-muted">
              <li><b className="text-fg">tomorrow · fri · oct 12</b> — due date</li>
              <li><b className="text-fg">9am · 14:30</b> — also blocks time on the calendar</li>
              <li><b className="text-fg">#work</b> — tag</li>
              <li><b className="text-fg">!1 … !4</b> — priority</li>
              <li><b className="text-fg">~45m · ~1h</b> — effort</li>
              <li><b className="text-fg">@high · @low</b> — energy needed</li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function UpcomingGroups({ tasks, tagColors, today }: { tasks: Awaited<ReturnType<typeof listTasks>>; tagColors: Record<string, string | null>; today: string }) {
  if (tasks.length === 0) return <Card><p className="py-6 text-center text-[13px] text-fg-subtle">Nothing scheduled ahead.</p></Card>;
  const groups = new Map<string, typeof tasks>();
  for (const t of tasks) groups.set(t.dueDate!, [...(groups.get(t.dueDate!) ?? []), t]);
  return (
    <>
      {[...groups].map(([date, list]) => (
        <Card key={date} title={`${relativeDayLabel(date, today)} · ${date}`}>
          <TaskList tasks={list} tagColors={tagColors} />
        </Card>
      ))}
    </>
  );
}
