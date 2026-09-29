"use client";

import { Play, Plus, Square, Trash2 } from "lucide-react";
import { useState } from "react";
import { addTimeEntry, removeTimeEntry, startTracking, stopTracking } from "@/app/actions/focus";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Chip";
import { atTime, formatMinutes, minutesToHHMM, todayISO } from "@/lib/domain/dates";
import { useNow } from "@/lib/hooks/useNow";
import { useRunner } from "@/lib/hooks/useRunner";

type Entry = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  minutes: number;
  taskTitle: string | null;
  note: string | null;
  source: "timer" | "focus" | "manual";
  isDeepWork: boolean;
};

const hhmm = (d: Date) => minutesToHHMM(d.getHours() * 60 + d.getMinutes());

export function TimeTracker({
  timer,
  entries,
  tasks,
  trackedMin,
}: {
  timer: { startedAt: Date; taskTitle: string | null; note: string | null } | null;
  entries: Entry[];
  tasks: Array<{ id: string; title: string; mit: boolean }>;
  trackedMin: number;
}) {
  const now = useNow();
  const { pending, run } = useRunner();
  const [taskId, setTaskId] = useState("");
  const [note, setNote] = useState("");
  const [manual, setManual] = useState<null | { from: string; to: string; taskId: string; deep: boolean }>(null);

  const elapsed = timer && now ? Math.max(0, Math.floor((now.getTime() - timer.startedAt.getTime()) / 1000)) : 0;
  const clock = `${Math.floor(elapsed / 3600)}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <Card title={`Time tracking · ${formatMinutes(trackedMin)} today`}>
      {timer ? (
        <div className="flex items-center gap-3 rounded-md bg-accent-soft p-3">
          <div className="min-w-0 flex-1">
            <div className="tabular font-mono text-[24px] leading-none font-semibold text-accent">{clock}</div>
            <div className="mt-1 truncate text-[13px] text-fg-muted">{timer.taskTitle ?? timer.note ?? "Untitled"}</div>
          </div>
          <Button variant="accent" disabled={pending} onClick={() => run(() => stopTracking(), { success: "Timer stopped" })}>
            <Square className="size-3.5" fill="currentColor" /> Stop
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Select value={taskId} onChange={(e) => setTaskId(e.target.value)} aria-label="Task">
            <option value="">No task</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What are you working on?" />
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => run(() => startTracking({ taskId: taskId || null, note }), { success: "Timer started", onSuccess: () => setNote("") })}
            >
              <Play className="size-3.5" fill="currentColor" /> Start
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[12px] font-medium text-fg-muted">Today&apos;s entries</span>
        <Button size="sm" variant="ghost" onClick={() => setManual(manual ? null : { from: "09:00", to: "10:00", taskId: "", deep: false })}>
          <Plus className="size-3.5" /> Add manually
        </Button>
      </div>

      {manual && (
        <div className="mt-2 flex flex-col gap-2 rounded-md bg-surface-3 p-3">
          <div className="flex items-center gap-2">
            <Input type="time" value={manual.from} onChange={(e) => setManual({ ...manual, from: e.target.value })} className="bg-surface" />
            <span className="text-fg-subtle">–</span>
            <Input type="time" value={manual.to} onChange={(e) => setManual({ ...manual, to: e.target.value })} className="bg-surface" />
          </div>
          <Select value={manual.taskId} onChange={(e) => setManual({ ...manual, taskId: e.target.value })} className="bg-surface">
            <option value="">No task</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-[13px] text-fg-muted">
            <input type="checkbox" checked={manual.deep} onChange={(e) => setManual({ ...manual, deep: e.target.checked })} /> Deep work
          </label>
          <Button
            variant="primary"
            size="sm"
            disabled={pending}
            onClick={() => {
              const today = todayISO();
              run(
                () =>
                  addTimeEntry({
                    taskId: manual.taskId || null,
                    startedAt: atTime(today, manual.from),
                    endedAt: atTime(today, manual.to),
                    deep: manual.deep,
                  }),
                { success: "Entry added", onSuccess: () => setManual(null) },
              );
            }}
          >
            Save entry
          </Button>
        </div>
      )}

      <ul className="mt-2 flex flex-col">
        {entries.length === 0 && <li className="py-3 text-center text-[13px] text-fg-subtle">No time tracked yet today.</li>}
        {entries.map((e) => (
          <li key={e.id} className="group flex items-center gap-2 border-b border-outline/60 py-2 text-[13px] last:border-0">
            <span className="tabular w-[92px] shrink-0 text-fg-subtle">
              {hhmm(e.startedAt)}–{e.endedAt ? hhmm(e.endedAt) : "now"}
            </span>
            <span className="min-w-0 flex-1 truncate">{e.taskTitle ?? e.note ?? "Untitled"}</span>
            {e.source === "focus" && <Badge tone="primary">focus</Badge>}
            {e.isDeepWork && e.source !== "focus" && <Badge tone="accent">deep</Badge>}
            <span className="tabular w-12 shrink-0 text-right text-fg-muted">{formatMinutes(e.minutes)}</span>
            {e.endedAt && (
              <button
                type="button"
                className="text-fg-subtle opacity-0 transition group-hover:opacity-100 hover:text-danger"
                onClick={() => run(() => removeTimeEntry(e.id), { success: "Entry deleted" })}
                aria-label="Delete entry"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
