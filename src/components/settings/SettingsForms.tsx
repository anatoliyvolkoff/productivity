"use client";

import { MapPin, Search, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { disconnectCalendar, syncCalendar, toggleCalendar } from "@/app/actions/calendar";
import { exportBackup, findPlaces, importBackup, recolorTag, removeTag, renameTagAction, saveProfile } from "@/app/actions/settings";
import { HABIT_COLORS } from "@/components/habits/HabitDialog";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { RelativeTime } from "@/components/ui/RelativeTime";
import type { Profile } from "@/lib/db/schema";
import { IS_WEB, setWebSecret } from "@/lib/platform";
import { useRunner } from "@/lib/hooks/useRunner";

export function ProfileForm({ profile }: { profile: Profile }) {
  const { pending, run } = useRunner();
  const [form, setForm] = useState({
    name: profile.name,
    wakeTarget: profile.wakeTarget,
    sleepHours: String(profile.sleepTargetMin / 60),
    focusHours: String(profile.focusTargetMin / 60),
    chronotype: profile.chronotype,
  });
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));
  return (
    <Card title="You">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name (used by the AI brief)">
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Usual wake time">
          <Input type="time" value={form.wakeTarget} onChange={(e) => set({ wakeTarget: e.target.value })} />
        </Field>
        <Field label="Sleep target (hours)">
          <Input type="number" step={0.25} min={5} max={11} value={form.sleepHours} onChange={(e) => set({ sleepHours: e.target.value })} />
        </Field>
        <Field label="Daily focus target (hours)">
          <Input type="number" step={0.5} min={0.5} max={10} value={form.focusHours} onChange={(e) => set({ focusHours: e.target.value })} />
        </Field>
        <Field label="Chronotype" hint="Shifts the energy curve. Auto estimates it from your sleep.">
          <Select value={form.chronotype} onChange={(e) => set({ chronotype: e.target.value })}>
            <option value="auto">Auto (from sleep log)</option>
            <option value="lark">Morning type</option>
            <option value="intermediate">In between</option>
            <option value="owl">Evening type</option>
          </Select>
        </Field>
      </div>
      <Button
        variant="primary"
        className="mt-4 self-start"
        disabled={pending}
        onClick={() =>
          run(
            () =>
              saveProfile({
                name: form.name.trim(),
                wakeTarget: form.wakeTarget,
                sleepTargetMin: Math.round((Number(form.sleepHours) || 8) * 60),
                focusTargetMin: Math.round((Number(form.focusHours) || 4) * 60),
                chronotype: form.chronotype,
              }),
            { success: "Saved" },
          )
        }
      >
        Save
      </Button>
    </Card>
  );
}

export function LocationForm({ current }: { current: string | null }) {
  const { pending, run } = useRunner();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ name: string; country: string; admin1?: string; latitude: number; longitude: number }>>([]);
  return (
    <Card title="Location (weather)">
      <p className="-mt-1 mb-3 text-[13px] text-fg-muted">
        {current ? (
          <>
            <MapPin className="mr-1 inline size-3.5" /> {current}
          </>
        ) : (
          "Not set — the weather widget and daylight nudges need it."
        )}
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => findPlaces(q), { onSuccess: (r) => setResults(r) });
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a city" />
        <Button type="submit" variant="secondary" disabled={pending || q.trim().length < 2}>
          <Search className="size-4" /> Find
        </Button>
      </form>
      {results.length > 0 && (
        <ul className="mt-2 flex flex-col">
          {results.map((p) => (
            <li key={`${p.latitude},${p.longitude}`}>
              <button
                type="button"
                className="w-full rounded-sm px-2 py-1.5 text-left text-[13.5px] hover:bg-surface-3"
                onClick={() =>
                  run(() => saveProfile({ latitude: p.latitude, longitude: p.longitude, locationName: p.name }), {
                    success: `Location set to ${p.name}`,
                    onSuccess: () => setResults([]),
                  })
                }
              >
                {p.name} <span className="text-fg-muted">{[p.admin1, p.country].filter(Boolean).join(", ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function GoogleSettings({
  status,
  targetCalendar,
}: {
  status: { configured: boolean; connected: boolean; accountEmail: string | null; lastSyncedAt: Date | null; calendars: Array<{ id: string; summary: string; enabled: boolean; canWrite: boolean; color: string | null }> };
  targetCalendar: string | null;
}) {
  const { pending, run } = useRunner();
  return (
    <Card title="Google Calendar" id="google">
      {IS_WEB ? (
        <p className="text-[13px] text-fg-muted">
          Google sync needs a server to keep its keys secret, so it isn&apos;t available in the browser version. Your calendar here works on its own; run the app on your computer or Vercel to sync with Google.
        </p>
      ) : !status.configured ? (
        <div className="text-[13px] text-fg-muted">
          <p>To connect, create an OAuth client in Google Cloud and put its keys in <code className="font-mono text-[12px]">.env.local</code>:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>console.cloud.google.com → create a project → enable the <b>Google Calendar API</b>.</li>
            <li>OAuth consent screen: External, add yourself as a test user.</li>
            <li>Credentials → OAuth client ID → Web application. Redirect URI: <code className="font-mono text-[12px]">http://localhost:3000/api/google/callback</code></li>
            <li>Set <code className="font-mono text-[12px]">GOOGLE_CLIENT_ID</code> and <code className="font-mono text-[12px]">GOOGLE_CLIENT_SECRET</code>, then restart the app.</li>
          </ol>
        </div>
      ) : !status.connected ? (
         
        <a href="/api/google/connect" className={buttonClass("primary")}>
          Connect Google Calendar
        </a>
      ) : (
        <div className="flex flex-col gap-3 text-[13.5px]">
          <p>
            Connected as <b>{status.accountEmail}</b>
            {status.lastSyncedAt && (
              <span className="text-fg-muted">
                {" "}
                · synced <RelativeTime date={status.lastSyncedAt} />
              </span>
            )}
          </p>
          <div>
            <div className="mb-1 text-[12px] font-medium text-fg-muted">Show these calendars</div>
            <ul className="flex flex-col gap-1">
              {status.calendars.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={c.enabled} disabled={pending} onChange={(e) => run(() => toggleCalendar(c.id, e.target.checked))} />
                  <span className="size-2.5 rounded-full" style={{ background: c.color ?? "var(--series-1)" }} />
                  <span className="flex-1 truncate">{c.summary}</span>
                  {!c.canWrite && <span className="text-[11.5px] text-fg-subtle">read-only</span>}
                </li>
              ))}
            </ul>
          </div>
          <Field label="New time blocks go to">
            <Select value={targetCalendar ?? ""} onChange={(e) => run(() => saveProfile({ googleCalendarId: e.target.value || null }), { success: "Saved" })}>
              {status.calendars
                .filter((c) => c.canWrite)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.summary}
                  </option>
                ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => syncCalendar(true), { success: "Synced" })}>
              Sync now
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (confirm("Disconnect Google Calendar? Events from Google are removed here; events you created stay.")) run(() => disconnectCalendar(), { success: "Disconnected" });
              }}
            >
              Disconnect
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function TagManager({ tags }: { tags: Array<{ name: string; color: string | null; count: number }> }) {
  const { pending, run } = useRunner();
  const [editing, setEditing] = useState<{ name: string; value: string } | null>(null);
  return (
    <Card title="Tags">
      {tags.length === 0 ? (
        <p className="text-[13px] text-fg-subtle">No tags yet — add #tags when you create tasks.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-outline/70">
          {tags.map((t) => (
            <li key={t.name} className="flex items-center gap-2 py-2 text-[13.5px]">
              <div className="flex gap-1">
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    disabled={pending}
                    onClick={() => run(() => recolorTag(t.name, c))}
                    className={`size-3.5 rounded-full ${t.color === c ? "ring-2 ring-fg ring-offset-1 ring-offset-surface" : ""}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              {editing?.name === t.name ? (
                <form
                  className="flex flex-1 gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(() => renameTagAction(t.name, editing.value), { success: "Renamed", onSuccess: () => setEditing(null) });
                  }}
                >
                  <Input autoFocus value={editing.value} onChange={(e) => setEditing({ name: t.name, value: e.target.value })} className="h-8" />
                  <Button type="submit" size="sm" variant="primary">
                    Save
                  </Button>
                </form>
              ) : (
                <button type="button" className="flex-1 text-left hover:text-primary" onClick={() => setEditing({ name: t.name, value: t.name })}>
                  #{t.name} <span className="text-fg-subtle">{t.count}</span>
                </button>
              )}
              <button
                type="button"
                aria-label={`Delete tag ${t.name}`}
                className="text-fg-subtle hover:text-danger"
                onClick={() => {
                  if (confirm(`Remove #${t.name} from everything?`)) run(() => removeTag(t.name), { success: "Tag removed" });
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function BackupCard({ counts }: { counts: Record<string, number> }) {
  const { pending, run } = useRunner();
  const fileRef = useRef<HTMLInputElement>(null);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return (
    <Card title="Your data">
      <p className="-mt-1 mb-3 text-[13px] text-fg-muted">
        {total.toLocaleString()} records · {counts.tasks ?? 0} tasks, {counts.habitLogs ?? 0} habit logs, {counts.focusSessions ?? 0} focus sessions, {counts.moodEntries ?? 0} check-ins, {counts.sleepEntries ?? 0} nights.
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(() => exportBackup(), {
              onSuccess: (backup) => {
                const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = `productivity-os-${backup.exportedAt.slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              },
            })
          }
        >
          Export JSON
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => fileRef.current?.click()}>
          <Upload className="size-3.5" /> Import backup…
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (!confirm("Importing REPLACES all current data with the backup. Continue?")) return;
            const text = await file.text();
            run(() => importBackup(text), { success: "Backup restored" });
          }}
        />
      </div>
      <p className="mt-2 text-[12px] text-fg-subtle">Exports exclude Google sign-in tokens. Tip: export before switching databases, then import on the new one.</p>
    </Card>
  );
}

/** Browser version: the Anthropic key is kept in this browser's storage only. */
export function AiKeyForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <p className="text-fg-muted">
        {configured ? "An API key is saved in this browser." : "Paste an Anthropic API key (console.anthropic.com) to turn on the AI brief, summaries, weekly review and brain-dump sorting."} It stays in this browser and is sent only to Anthropic.
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setWebSecret("ANTHROPIC_API_KEY", key);
          setKey("");
          router.refresh();
          window.dispatchEvent(new Event("pos:refresh"));
          toast(key.trim() ? "API key saved" : "API key removed");
        }}
      >
        <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={configured ? "Replace key…" : "sk-ant-…"} autoComplete="off" />
        <Button type="submit" variant="primary" size="sm">
          {key.trim() || !configured ? "Save" : "Remove"}
        </Button>
      </form>
    </div>
  );
}
