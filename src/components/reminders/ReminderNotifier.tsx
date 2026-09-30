"use client";

import { useEffect } from "react";
import { toast } from "@/components/ui/toast";
import { parseHHMM, todayISO } from "@/lib/domain/dates";

export type NotifierReminder = { id: string; title: string; publicTitle: string | null; emoji: string | null; time: string; notify: boolean; doneAt: Date | null };

const KEY = "pos-reminded:";

/**
 * While the app is open: once a day, at the reminder's time, a gentle nudge —
 * a system notification if you allowed them in Settings, otherwise a toast.
 * (For reminders when the app is closed, turn on the Google Calendar event.)
 */
export function ReminderNotifier({ reminders }: { reminders: NotifierReminder[] }) {
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const minute = now.getHours() * 60 + now.getMinutes();
      const today = todayISO(now);
      for (const r of reminders) {
        if (!r.notify || r.doneAt) continue;
        const due = parseHHMM(r.time);
        if (minute < due || minute > due + 12 * 60) continue;
        const key = `${KEY}${r.id}:${today}`;
        try {
          if (localStorage.getItem(key)) continue;
          localStorage.setItem(key, "1");
        } catch {
          continue;
        }
        const title = `${r.emoji ? `${r.emoji} ` : ""}${r.publicTitle ?? r.title}`;
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body: "Tap “I took it” in the app when you have. No rush.", tag: `pos-${r.id}` });
        } else {
          toast(`${title} — tap “I took it” when you have.`);
        }
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [reminders]);
  return null;
}
