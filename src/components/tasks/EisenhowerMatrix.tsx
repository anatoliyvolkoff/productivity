import { Card } from "@/components/ui/Card";
import { todayISO } from "@/lib/domain/dates";
import { eisenhower, type EisenhowerQuadrant } from "@/lib/domain/priority";
import type { TaskRow } from "@/lib/services/tasks";
import { TaskList } from "./TaskList";

const QUADRANTS: Array<{ key: EisenhowerQuadrant; title: string; hint: string; color: string }> = [
  { key: "do", title: "Do first", hint: "Urgent and important", color: "var(--danger)" },
  { key: "schedule", title: "Schedule", hint: "Important, not urgent — protect time for these", color: "var(--primary)" },
  { key: "delegate", title: "Delegate or batch", hint: "Urgent, not important", color: "var(--accent)" },
  { key: "drop", title: "Later or drop", hint: "Neither — question whether to do them at all", color: "var(--fg-subtle)" },
];

/** Eisenhower matrix derived from due dates (urgent) and priority/goal links (important). */
export function EisenhowerMatrix({ tasks, tagColors }: { tasks: TaskRow[]; tagColors: Record<string, string | null> }) {
  const today = todayISO();
  return (
    <div className="grid grid-cols-2 gap-4">
      {QUADRANTS.map((q) => {
        const list = tasks.filter((t) => eisenhower(t, today) === q.key);
        return (
          <Card key={q.key} className="min-h-64" style={{ borderTop: `4px solid ${q.color}` }}>
            <div className="mb-2">
              <h3 className="text-[15px] font-semibold" style={{ color: q.color }}>
                {q.title} <span className="ml-1 text-fg-subtle">{list.length}</span>
              </h3>
              <p className="text-[12px] text-fg-muted">{q.hint}</p>
            </div>
            <TaskList tasks={list} tagColors={tagColors} compact emptyText="Empty" />
          </Card>
        );
      })}
    </div>
  );
}
