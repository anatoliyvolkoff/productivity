"use client";

import { useEffect, useState } from "react";

/** Warn when the server's time zone differs from yours (e.g. a hosted copy without APP_TIMEZONE). */
export function TimezoneCheck({ serverTz }: { serverTz: string }) {
  const [browserTz, setBrowserTz] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser's zone is only known after mount
    setBrowserTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  if (!browserTz || browserTz === serverTz) return null;
  const offset = (tz: string) => new Date().toLocaleString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  if (offset(browserTz) === offset(serverTz)) return null;
  return (
    <div className="border-b border-warning/40 bg-warning/15 px-8 py-2 text-[13px]">
      The server runs on <b>{serverTz}</b> but you&apos;re in <b>{browserTz}</b>, so “today” may be off. Set{" "}
      <code className="font-mono text-[12px]">APP_TIMEZONE={browserTz}</code> in your hosting settings and redeploy.
    </div>
  );
}
