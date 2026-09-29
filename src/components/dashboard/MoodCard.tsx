import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { MoodEntry } from "@/lib/db/schema";
import { QUADRANT_INFO, type Quadrant } from "@/lib/domain/mood";

const ORDER: Quadrant[] = ["red", "yellow", "blue", "green"];
const EXAMPLES: Record<Quadrant, string> = { red: "Stressed, anxious", yellow: "Excited, focused", blue: "Tired, down", green: "Calm, content" };

/** Quick mood check-in: pick a quadrant to start. */
export function MoodCard({ last, countToday }: { last: MoodEntry | null; countToday: number }) {
  return (
    <Card title="How do you feel?" className="h-full" action={<Link href="/mood" className="text-[12px] text-primary">History</Link>}>
      <div className="grid flex-1 grid-cols-2 gap-2">
        {ORDER.map((q) => (
          <Link
            key={q}
            href={`/mood?q=${q}`}
            className="flex flex-col justify-end rounded-md p-3 transition hover:scale-[1.02]"
            style={{ background: `color-mix(in srgb, ${QUADRANT_INFO[q].color} 16%, transparent)` }}
          >
            <span className="size-2.5 rounded-full" style={{ background: QUADRANT_INFO[q].color }} />
            <span className="mt-2 text-[12px] font-medium">{QUADRANT_INFO[q].label}</span>
            <span className="text-[11px] text-fg-muted">{EXAMPLES[q]}</span>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-fg-muted">
        {last ? (
          <>
            Last: <b className="font-semibold text-fg">{last.emotion}</b> {formatDistanceToNowStrict(last.at, { addSuffix: true })}
            {countToday ? ` · ${countToday} today` : ""}
          </>
        ) : (
          "No check-ins yet. Naming a feeling helps regulate it."
        )}
      </p>
    </Card>
  );
}
