"use client";

import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { KeyboardShortcuts } from "@/components/shell/KeyboardShortcuts";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { TaskEditorProvider } from "@/components/tasks/TaskEditor";
import { Toaster } from "@/components/ui/toast";
import { getConnection } from "@/lib/db";
import { getRunningSession, getRunningTimer } from "@/lib/services/focus";
import { goalOptions } from "@/lib/services/goals";
import { listReminders } from "@/lib/services/reminders";
import { listTags } from "@/lib/services/tags";
import { ReminderNotifier } from "@/components/reminders/ReminderNotifier";
import { REFRESH_EVENT } from "./refresh";

type ShellData = {
  goals: Awaited<ReturnType<typeof goalOptions>>;
  tags: string[];
  session: Awaited<ReturnType<typeof getRunningSession>>;
  timer: Awaited<ReturnType<typeof getRunningTimer>>;
  reminders: Awaited<ReturnType<typeof listReminders>>;
};

/** Browser build: the app shell, with the in-browser database opened first. */
export function WebShell({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ShellData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await getConnection();
        const [goals, tags, session, timer, reminders] = await Promise.all([goalOptions(), listTags(), getRunningSession(), getRunningTimer(), listReminders()]);
        if (!cancelled) setData({ goals, tags: tags.map((t) => t.name), session, timer, reminders });
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    };
    void load();
    window.addEventListener(REFRESH_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(REFRESH_EVENT, load);
    };
  }, []);

  if (error) {
    return (
      <div className="grid min-h-screen w-full place-items-center p-8">
        <div className="max-w-md rounded-xl bg-surface p-8 shadow-card">
          <h1 className="text-[20px] font-semibold">Can&apos;t open your data</h1>
          <p className="mt-2 text-[14px] text-fg-muted">This browser blocked storage (private window, or site data disabled?). The app keeps everything in this browser&apos;s IndexedDB.</p>
          <pre className="mt-3 rounded-md bg-surface-3 p-3 text-[12px] whitespace-pre-wrap text-fg-muted">{error}</pre>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="grid min-h-screen w-full place-items-center">
        <div className="flex flex-col items-center gap-3 text-[14px] text-fg-muted">
          <div className="grid size-10 animate-pulse place-items-center rounded-[12px] bg-fg text-[16px] font-bold text-bg">P</div>
          Opening your data…
        </div>
      </div>
    );
  }
  return (
    <TaskEditorProvider goals={data.goals} tags={data.tags}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar session={data.session} timer={data.timer} />
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
      <CommandPalette />
      <KeyboardShortcuts />
      <Toaster />
      <ReminderNotifier reminders={data.reminders} />
    </TaskEditorProvider>
  );
}
