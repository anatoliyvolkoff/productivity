"use client";

import { format } from "date-fns";
import { ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import { addEvent, removeEvent, saveEvent } from "@/app/actions/calendar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { addDaysISO, atTime, toISODate } from "@/lib/domain/dates";
import { useRunner } from "@/lib/hooks/useRunner";
import type { DialogState } from "./types";

export function EventDialog({ state, tasks, googleConnected, onClose }: { state: DialogState; tasks: Array<{ id: string; title: string }>; googleConnected: boolean; onClose: () => void }) {
  const { pending, run } = useRunner();
  const e = state.mode === "edit" ? state.event : null;
  const start = e ? e.startAt : state.mode === "create" ? state.start : new Date();
  const end = e ? e.endAt : state.mode === "create" ? state.end : new Date();
  const allDayInitial = e ? e.allDay : state.mode === "create" ? Boolean(state.allDay) : false;

  const [form, setForm] = useState({
    title: e?.title ?? (state.mode === "create" ? (state.title ?? "") : ""),
    date: toISODate(start),
    endDate: toISODate(allDayInitial ? new Date(end.getTime() - 1) : end),
    from: format(start, "HH:mm"),
    to: format(end, "HH:mm"),
    allDay: allDayInitial,
    taskId: e?.taskId ?? (state.mode === "create" ? (state.taskId ?? "") : ""),
    timeBlock: e?.isTimeBlock ?? (state.mode === "create" ? Boolean(state.timeBlock) : false),
    isPrivate: e?.isPrivate ?? false,
    location: e?.location ?? "",
    description: e?.description ?? "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  if (e && !e.writable) {
    return (
      <Dialog open onClose={onClose} title={e.title}>
        <p className="text-[14px] text-fg-muted">
          {e.allDay ? "All day" : `${format(e.startAt, "EEE, MMM d · HH:mm")}–${format(e.endAt, "HH:mm")}`}
          {e.calendarName ? ` · ${e.calendarName}` : ""}
        </p>
        {e.location && <p className="mt-2 text-[14px]">{e.location}</p>}
        {e.description && <p className="mt-2 text-[13.5px] whitespace-pre-wrap text-fg-muted">{e.description}</p>}
        <p className="mt-4 text-[12.5px] text-fg-subtle">This calendar is read-only.</p>
        {e.htmlLink && (
          <a href={e.htmlLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13px] text-primary">
            Open in Google Calendar <ExternalLink className="size-3.5" />
          </a>
        )}
      </Dialog>
    );
  }

  const values = () => {
    const startAt = form.allDay ? atTime(form.date, "00:00") : atTime(form.date, form.from);
    const endAt = form.allDay ? atTime(addDaysISO(form.endDate < form.date ? form.date : form.endDate, 1), "00:00") : atTime(form.date, form.to);
    if (!form.allDay && endAt <= startAt) endAt.setDate(endAt.getDate() + 1); // crosses midnight
    return {
      title: form.title || tasks.find((t) => t.id === form.taskId)?.title || "",
      startAt,
      endAt,
      allDay: form.allDay,
      taskId: form.taskId || null,
      isTimeBlock: form.timeBlock || Boolean(form.taskId),
      isPrivate: form.isPrivate,
      location: form.location,
      description: form.description,
    };
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={e ? "Edit event" : "New event"}
      footer={
        <>
          {e && (
            <Button
              variant="danger"
              className="mr-auto"
              disabled={pending}
              onClick={() => {
                if (confirm(e.onGoogle ? "Delete this event here and on Google Calendar?" : "Delete this event?")) run(() => removeEvent(e.id), { success: "Event deleted", onSuccess: onClose });
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => run(() => (e ? saveEvent(e.id, values()) : addEvent(values())), { success: e ? "Saved" : "Event added", onSuccess: onClose })}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input autoFocus value={form.title} onChange={(ev) => set({ title: ev.target.value })} placeholder="Title" className="h-11 text-[16px] font-medium" />
        <div className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(ev) => set({ date: ev.target.value, endDate: ev.target.value > form.endDate ? ev.target.value : form.endDate })} />
          </Field>
          {form.allDay ? (
            <Field label="Until" className="col-span-2">
              <Input type="date" value={form.endDate} onChange={(ev) => set({ endDate: ev.target.value })} />
            </Field>
          ) : (
            <>
              <Field label="From">
                <Input type="time" value={form.from} onChange={(ev) => set({ from: ev.target.value })} className="w-32" />
              </Field>
              <Field label="To">
                <Input type="time" value={form.to} onChange={(ev) => set({ to: ev.target.value })} className="w-32" />
              </Field>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13.5px]">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.allDay} onChange={(ev) => set({ allDay: ev.target.checked })} /> All day
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.timeBlock} onChange={(ev) => set({ timeBlock: ev.target.checked })} /> Time block
          </label>
          {googleConnected && (
            <label className="flex items-center gap-2" title="Private events stay in this app and are not written to Google Calendar">
              <input type="checkbox" checked={form.isPrivate} onChange={(ev) => set({ isPrivate: ev.target.checked })} /> Keep off Google Calendar
            </label>
          )}
        </div>
        <Field label="Task (optional)">
          <Select value={form.taskId} onChange={(ev) => set({ taskId: ev.target.value })}>
            <option value="">No task</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location">
          <Input value={form.location} onChange={(ev) => set({ location: ev.target.value })} />
        </Field>
        <Field label="Notes">
          <Textarea value={form.description} onChange={(ev) => set({ description: ev.target.value })} className="min-h-16" />
        </Field>
        {e?.htmlLink && (
          <a href={e.htmlLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-primary">
            Open in Google Calendar <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </Dialog>
  );
}
