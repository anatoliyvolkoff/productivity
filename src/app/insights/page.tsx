import { format } from "date-fns";
import Link from "next/link";
import { BarChart } from "@/components/charts/BarChart";
import { DataTable } from "@/components/charts/DataTable";
import { ScatterPlot } from "@/components/charts/ScatterPlot";
import { KpiTile } from "@/components/dashboard/Benchmarks";
import { WeeklyReviewCard } from "@/components/insights/WeeklyReviewCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedLinks } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { formatMinutes, fromISODate, todayISO } from "@/lib/domain/dates";
import { QUADRANT_INFO, type Quadrant } from "@/lib/domain/mood";
import type { ValueUnit } from "@/lib/format";
import { aiConfigured, latestSummary, type WeeklyReviewT } from "@/lib/services/ai";
import { getInsights, METRICS, type MetricKey } from "@/lib/services/insights";
import { getProfile } from "@/lib/services/profile";

const UNITS: Record<MetricKey, ValueUnit> = {
  focusMin: "minutes",
  focusQuality: "rating",
  trackedMin: "minutes",
  deepMin: "minutes",
  tasksDone: "count",
  mitsDone: "count",
  habitPct: "percent",
  sleepMin: "minutes",
  sleepQuality: "rating",
  moodValence: "signed",
  moodEnergy: "signed",
};

const RANGES = [7, 30, 90] as const;

export default async function InsightsPage(props: PageProps<"/insights">) {
  const sp = await props.searchParams;
  const days = RANGES.find((r) => String(r) === sp.range) ?? 30;
  const today = todayISO();
  const [insights, profile, weekly] = await Promise.all([getInsights(days, today), getProfile(), latestSummary(today, "weekly")]);
  const x = (typeof sp.x === "string" && sp.x in METRICS ? sp.x : "sleepMin") as MetricKey;
  const y = (typeof sp.y === "string" && sp.y in METRICS ? sp.y : "moodValence") as MetricKey;
  const pairs = insights.series.filter((d) => d[x] !== null && d[y] !== null);
  const selected = insights.correlations.find((c) => c.x === x && c.y === y);
  const short = (d: string) => format(fromISODate(d), days > 30 ? "d/M" : "d");
  const label = (d: string) => format(fromISODate(d), "EEE, MMM d");
  const maxTag = Math.max(1, ...insights.timeByTag.map((t) => t.minutes));
  const moodTotal = insights.mood.count;
  const href = (patch: Record<string, string>) => `/insights?${new URLSearchParams({ range: String(days), x, y, ...patch })}`;

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader title="Insights" subtitle="How your focus, habits, sleep and mood connect — from your own data." />
      <div className="mb-5 flex items-center gap-3">
        <SegmentedLinks value={String(days)} options={RANGES.map((r) => ({ value: String(r), label: `Last ${r} days`, href: href({ range: String(r) }) }))} />
        <span className="text-[12.5px] text-fg-subtle">Compared with the 4 weeks before the range.</span>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12">
          <div className="grid grid-cols-6 gap-6">
            {insights.kpis.map((k) => (
              <KpiTile key={k.key} kpi={k} />
            ))}
          </div>
        </Card>

        <Card title="Focus per day" className="col-span-7">
          <BarChart data={insights.current.map((d) => ({ label: label(d.date), short: short(d.date), value: d.focusMin }))} unit="minutes" target={profile.focusTargetMin} />
          <DataTable caption="Focus minutes per day" columns={["Date", "Focus", "Deep work", "Quality"]} rows={insights.current.map((d) => [d.date, d.focusMin === null ? "—" : formatMinutes(d.focusMin), d.deepMin === null ? "—" : formatMinutes(d.deepMin), d.focusQuality ? d.focusQuality.toFixed(1) : "—"])} />
        </Card>
        <Card title="Records" className="col-span-5">
          <dl className="grid grid-cols-2 gap-5">
            <Record label="Best focus day" value={insights.records.bestFocusDay ? formatMinutes(insights.records.bestFocusDay.value) : "—"} sub={insights.records.bestFocusDay ? label(insights.records.bestFocusDay.date) : ""} />
            <Record label="Most tasks in a day" value={insights.records.mostTasksDay ? String(insights.records.mostTasksDay.value) : "—"} sub={insights.records.mostTasksDay ? label(insights.records.mostTasksDay.date) : ""} />
            <Record label="Top-3 hit rate" value={insights.mitHitRate === null ? "—" : `${Math.round(insights.mitHitRate * 100)}%`} sub="of starred tasks done that day" />
            <Record label="Check-ins" value={String(moodTotal)} sub={`mood logs in ${days} days`} />
          </dl>
        </Card>

        <Card title="Habit adherence per day" className="col-span-7">
          <BarChart data={insights.current.map((d) => ({ label: label(d.date), short: short(d.date), value: d.habitPct }))} unit="percent" color="var(--series-2)" />
        </Card>
        <Card title="Time by tag" className="col-span-5">
          {insights.timeByTag.length === 0 ? (
            <p className="text-[13px] text-fg-subtle">Track time on tagged tasks to see where it goes.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {insights.timeByTag.slice(0, 8).map((t) => (
                <li key={t.tag} className="grid grid-cols-[90px_1fr_64px] items-center gap-2 text-[13px]">
                  <span className="truncate text-fg-muted">#{t.tag}</span>
                  <span className="h-3.5 rounded-r-[4px] bg-series-1" style={{ width: `${Math.max(2, (t.minutes / maxTag) * 100)}%` }} />
                  <span className="text-right font-medium">{formatMinutes(t.minutes)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Correlation explorer" className="col-span-7">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-fg-muted">Compare</span>
            <MetricPicker current={x} other={y} name="x" href={href} />
            <span className="text-fg-muted">with</span>
            <MetricPicker current={y} other={x} name="y" href={href} />
          </div>
          {pairs.length < 3 ? (
            <p className="py-10 text-center text-[13px] text-fg-subtle">Not enough days with both values yet.</p>
          ) : (
            <ScatterPlot
              points={pairs.map((d) => ({ x: d[x] as number, y: d[y] as number, label: label(d.date) }))}
              xLabel={METRICS[x].label}
              yLabel={METRICS[y].label}
              xUnit={UNITS[x]}
              yUnit={UNITS[y]}
            />
          )}
          <p className="mt-2 text-[12.5px] text-fg-muted">
            {selected
              ? `Spearman ρ = ${selected.rho} over ${selected.n} days — a ${selected.strength} ${selected.rho > 0 ? "positive" : "negative"} link.`
              : pairs.length >= 10
                ? "No meaningful link between these two so far."
                : `${pairs.length} days with both values; links are computed from 10 days.`}{" "}
            Correlation isn&apos;t causation.
          </p>
        </Card>
        <Card title="Strongest links in your data" className="col-span-5">
          {insights.correlations.length === 0 ? (
            <p className="text-[13px] text-fg-subtle">Keep logging — links appear after about ten days with both values.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {insights.correlations.slice(0, 6).map((c) => (
                <li key={`${c.x}-${c.y}`}>
                  <Link href={href({ x: c.x, y: c.y })} className="block rounded-md px-2 py-1.5 transition hover:bg-surface-3">
                    <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
                      <span>
                        <b className="font-semibold">{METRICS[c.x].label}</b> ↔ {METRICS[c.y].label.toLowerCase()}
                      </span>
                      <span className="tabular font-semibold">{c.rho > 0 ? "+" : ""}{c.rho}</span>
                    </div>
                    <div className="text-[12px] text-fg-subtle">
                      {c.strength} · {c.n} days · {c.rho > 0 ? "more of one comes with more of the other" : "more of one comes with less of the other"}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Mood" className="col-span-5">
          {moodTotal === 0 ? (
            <p className="text-[13px] text-fg-subtle">No check-ins in this range.</p>
          ) : (
            <>
              <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
                {(Object.keys(insights.mood.quadrants) as Quadrant[])
                  .filter((q) => insights.mood.quadrants[q] > 0)
                  .map((q) => (
                    <div key={q} style={{ width: `${(insights.mood.quadrants[q] / moodTotal) * 100}%`, background: QUADRANT_INFO[q].color }} />
                  ))}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[12.5px]">
                {(Object.keys(insights.mood.quadrants) as Quadrant[]).map((q) => (
                  <li key={q} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[3px]" style={{ background: QUADRANT_INFO[q].color }} />
                    <span className="flex-1 text-fg-muted">{QUADRANT_INFO[q].label}</span>
                    <b>{Math.round((insights.mood.quadrants[q] / moodTotal) * 100)}%</b>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-1">
                {insights.mood.topEmotions.map((e) => (
                  <span key={e.word} className="rounded-full bg-surface-3 px-2 py-0.5 text-[12px]">
                    {e.word} <span className="text-fg-subtle">{e.count}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
        <div className="col-span-7">
          <WeeklyReviewCard review={(weekly?.output as WeeklyReviewT | undefined) ?? null} createdAt={weekly?.createdAt ?? null} configured={aiConfigured()} />
        </div>
      </div>
    </div>
  );
}

function Record({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <dt className="text-[12.5px] text-fg-muted">{label}</dt>
      <dd className="text-[24px] leading-tight font-semibold tracking-tight">{value}</dd>
      <dd className="text-[12px] text-fg-subtle">{sub}</dd>
    </div>
  );
}

function MetricPicker({ current, other, name, href }: { current: MetricKey; other: MetricKey; name: "x" | "y"; href: (p: Record<string, string>) => string }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {(Object.keys(METRICS) as MetricKey[])
        .filter((k) => k !== other && k !== "trackedMin" && k !== "mitsDone")
        .map((k) => (
          <Link
            key={k}
            href={href({ [name]: k })}
            className={cn("rounded-full px-2 py-0.5 text-[12px] transition", k === current ? "bg-fg text-bg" : "bg-surface-3 text-fg-muted hover:text-fg")}
          >
            {METRICS[k].label}
          </Link>
        ))}
    </span>
  );
}

