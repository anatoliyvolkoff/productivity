import { format } from "date-fns";
import { Smile } from "lucide-react";
import { MoodMap } from "@/components/charts/MoodMap";
import { MoodCheckIn } from "@/components/mood/MoodCheckIn";
import { MoodEntryRow } from "@/components/mood/MoodEntryRow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { addDaysISO, todayISO } from "@/lib/domain/dates";
import { QUADRANT_INFO, type Quadrant } from "@/lib/domain/mood";
import { METRICS, getInsights } from "@/lib/services/insights";
import { moodBetween } from "@/lib/services/mood";

const ORDER: Quadrant[] = ["yellow", "green", "red", "blue"];

export default async function MoodPage(props: PageProps<"/mood">) {
  const sp = await props.searchParams;
  const initial = typeof sp.q === "string" && sp.q in QUADRANT_INFO ? (sp.q as Quadrant) : null;
  const today = todayISO();
  const [entries, insights] = await Promise.all([moodBetween(addDaysISO(today, -29), today), getInsights(30, today)]);
  const counts = ORDER.map((q) => ({ q, n: entries.filter((e) => e.quadrant === q).length }));
  const total = entries.length;
  const words = new Map<string, number>();
  for (const e of entries) words.set(e.emotion, (words.get(e.emotion) ?? 0) + 1);
  const top = [...words].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const moodLinks = insights.correlations.filter((c) => c.y === "moodValence" || c.y === "moodEnergy").slice(0, 3);

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader title="Mood" subtitle="Check in a few times a day. Naming what you feel, precisely, helps you handle it." />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6">
          <MoodCheckIn key={initial ?? "none"} initial={initial} />
        </div>
        <div className="col-span-6 flex flex-col gap-4">
          <Card title="Last 30 days">
            {total === 0 ? (
              <EmptyState icon={Smile} title="No check-ins yet">
                Your first check-in starts the map.
              </EmptyState>
            ) : (
              <div className="grid grid-cols-[1fr_200px] items-start gap-5">
                <MoodMap points={entries.map((e) => ({ energy: e.energy, pleasantness: e.pleasantness, quadrant: e.quadrant, at: e.at, emotion: e.emotion }))} />
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="mb-2 text-[12px] font-medium text-fg-muted">Where you spent time</div>
                    <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Share of check-ins per quadrant">
                      {counts.filter((c) => c.n > 0).map((c) => (
                        <div key={c.q} style={{ width: `${(c.n / total) * 100}%`, background: QUADRANT_INFO[c.q].color }} />
                      ))}
                    </div>
                    <ul className="mt-2 flex flex-col gap-1 text-[12.5px]">
                      {counts.map((c) => (
                        <li key={c.q} className="flex items-center gap-2">
                          <span className="size-2.5 rounded-[3px]" style={{ background: QUADRANT_INFO[c.q].color }} />
                          <span className="flex-1 text-fg-muted">{QUADRANT_INFO[c.q].label}</span>
                          <span className="font-semibold">{total ? Math.round((c.n / total) * 100) : 0}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[12px] font-medium text-fg-muted">Most named</div>
                    <div className="flex flex-wrap gap-1">
                      {top.map(([w, n]) => (
                        <span key={w} className="rounded-full bg-surface-3 px-2 py-0.5 text-[12px]">
                          {w} <span className="text-fg-subtle">{n}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
          <Card title="Patterns">
            {moodLinks.length === 0 ? (
              <p className="text-[13px] text-fg-muted">After about ten days of check-ins and sleep logs, links between your sleep, focus, habits and mood show up here.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-[13.5px]">
                {moodLinks.map((c) => (
                  <li key={`${c.x}-${c.y}`}>
                    <b className="font-semibold">{METRICS[c.x].label}</b> and <b className="font-semibold">{METRICS[c.y].label.toLowerCase()}</b> move{" "}
                    {c.rho > 0 ? "together" : "in opposite directions"} — {c.strength} link (ρ = {c.rho}, {c.n} days).
                  </li>
                ))}
                <li className="text-[12px] text-fg-subtle">Correlation, not causation — but worth noticing.</li>
              </ul>
            )}
          </Card>
          <Card title="Recent check-ins">
            <ul className="flex flex-col divide-y divide-outline/70">
              {entries.slice(0, 12).map((e) => (
                <MoodEntryRow
                  key={e.id}
                  entry={{
                    id: e.id,
                    time: format(e.at, "EEE HH:mm"),
                    emotion: e.emotion,
                    color: QUADRANT_INFO[e.quadrant].color,
                    note: e.note,
                    context: [...(e.context?.doing ?? []), ...(e.context?.with ?? []), ...(e.context?.where ?? [])].join(" · "),
                    weather: e.weather ? `${Math.round(e.weather.temperature)}° ${e.weather.label}` : null,
                  }}
                />
              ))}
              {entries.length === 0 && <li className="py-3 text-[13px] text-fg-subtle">Nothing yet.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
