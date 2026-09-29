"use client";

import { formatDistanceToNowStrict } from "date-fns";

/** "5 minutes ago" — server and client clocks differ slightly, so the text is allowed to differ on hydration. */
export function RelativeTime({ date, className }: { date: Date; className?: string }) {
  return (
    <time dateTime={date.toISOString()} className={className} suppressHydrationWarning>
      {formatDistanceToNowStrict(date, { addSuffix: true })}
    </time>
  );
}
