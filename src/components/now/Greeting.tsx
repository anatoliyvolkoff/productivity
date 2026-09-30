"use client";

import { useNow } from "@/lib/hooks/useNow";

/** A calm, static hello (time of day comes from this device's clock). */
export function Greeting({ name, nextEvent }: { name: string; nextEvent: { title: string; startAt: Date | string } | null }) {
  const now = useNow(60_000);
  const h = now?.getHours() ?? 12;
  const part = h < 5 ? "Hi" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const inMin = now && nextEvent ? Math.round((new Date(nextEvent.startAt).getTime() - now.getTime()) / 60_000) : null;
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h1 className="text-[22px] font-semibold tracking-tight">
        {now ? `${part}${name ? `, ${name}` : ""}.` : " "}
      </h1>
      {nextEvent && inMin !== null && inMin >= 0 && inMin <= 240 && (
        <p className="text-[13.5px] text-fg-muted">
          Next: <b className="font-medium text-fg">{nextEvent.title}</b> {inMin < 1 ? "now" : inMin < 60 ? `in ${inMin} min` : `in about ${Math.round(inMin / 60)} h`}
        </p>
      )}
    </div>
  );
}
