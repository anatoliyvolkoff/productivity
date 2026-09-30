"use client";

import { BellRing, CalendarDays, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { removeReminder, updateReminder } from "@/app/actions/reminders";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useRunner } from "@/lib/hooks/useRunner";

type Row = { id: string; title: string; publicTitle: string | null; emoji: string | null; time: string; notify: boolean; googleEventId: string | null };

/** Daily reminders (meds): name, time, what the lock screen shows, and where you get nudged. */
export function ReminderSettings({ reminders, googleConnected, googleAvailable }: { reminders: Row[]; googleConnected: boolean; googleAvailable: boolean }) {
  const [adding, setAdding] = useState(false);
  return (
    <Card title="Daily reminders" action={<BellRing className="size-4 text-fg-subtle" />}>
      <p className="mb-3 text-[12.5px] text-fg-muted">
        One tap logs it with the time, so you never have to wonder “did I already?”. History shows “x of the last 7 days” — never a streak that resets.
      </p>
      <div className="flex flex-col gap-3">
        {reminders.map((r) => (
          <ReminderEditor key={r.id} row={r} googleConnected={googleConnected} googleAvailable={googleAvailable} />
        ))}
        {adding ? (
          <ReminderEditor googleConnected={googleConnected} googleAvailable={googleAvailable} onDone={() => setAdding(false)} />
        ) : (
          <Button variant="tonal" size="sm" className="self-start" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" /> Add a reminder
          </Button>
        )}
      </div>
      <NotificationPermission />
    </Card>
  );
}

function ReminderEditor({ row, googleConnected, googleAvailable, onDone }: { row?: Row; googleConnected: boolean; googleAvailable: boolean; onDone?: () => void }) {
  const { pending, run } = useRunner();
  const [form, setForm] = useState({
    title: row?.title ?? "",
    publicTitle: row?.publicTitle ?? "",
    emoji: row?.emoji ?? "",
    time: row?.time ?? "09:00",
    notify: row?.notify ?? true,
    inGoogle: Boolean(row?.googleEventId),
  });
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  return (
    <div className="rounded-md bg-surface-2 p-3 ring-1 ring-outline">
      <div className="grid grid-cols-[64px_1fr_110px] gap-2">
        <Field label="Emoji">
          <Input value={form.emoji} onChange={(e) => set({ emoji: e.target.value })} maxLength={4} aria-label="Emoji" />
        </Field>
        <Field label="Name in the app">
          <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Antidepressant" />
        </Field>
        <Field label="Time">
          <Input type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} />
        </Field>
      </div>
      <Field label="Lock-screen name (optional, more private)" className="mt-2">
        <Input value={form.publicTitle} onChange={(e) => set({ publicTitle: e.target.value })} placeholder="Take care of you" />
      </Field>
      <div className="mt-3 flex flex-col gap-2 text-[13px]">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.notify} onChange={(e) => set({ notify: e.target.checked })} className="size-4 accent-[var(--primary)]" />
          Nudge me in the app at that time (while it&apos;s open)
        </label>
        {googleAvailable && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.inGoogle}
              disabled={!googleConnected && !form.inGoogle}
              onChange={(e) => set({ inGoogle: e.target.checked })}
              className="size-4 accent-[var(--primary)]"
            />
            <CalendarDays className="size-3.5 text-fg-muted" />
            Daily Google Calendar event with a pop-up — reminds your phone even when the app is closed
            {!googleConnected && <span className="text-fg-subtle">(connect Google first)</span>}
          </label>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => updateReminder({ id: row?.id, ...form }), {
              success: row ? "Saved" : "Reminder added",
              onSuccess: () => onDone?.(),
            })
          }
        >
          {row ? "Save" : "Add"}
        </Button>
        {onDone && (
          <Button variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
        )}
        {row && (
          <Button variant="ghost" size="sm" className="ml-auto" disabled={pending} onClick={() => run(() => removeReminder(row.id), { success: "Removed" })}>
            <Trash2 className="size-3.5" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}

function NotificationPermission() {
  const [state, setState] = useState<NotificationPermission | "unsupported" | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read a browser-only API after hydration
    setState("Notification" in window ? Notification.permission : "unsupported");
  }, []);
  if (state === null || state === "unsupported") return null;
  return (
    <div className="mt-4 border-t border-outline pt-3 text-[12.5px] text-fg-muted">
      {state === "granted" ? (
        "System notifications are on in this browser."
      ) : state === "denied" ? (
        "Notifications are blocked for this site in your browser settings — the app will show a gentle in-app message instead."
      ) : (
        <div className="flex items-center gap-3">
          <span>Get a system notification (not just an in-app message) while the app is open?</span>
          <Button variant="secondary" size="sm" onClick={() => Notification.requestPermission().then(setState)}>
            Allow notifications
          </Button>
        </div>
      )}
    </div>
  );
}
