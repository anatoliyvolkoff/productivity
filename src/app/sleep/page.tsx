import { format } from "date-fns";
import { DataTable } from "@/components/charts/DataTable";
import { SleepChart } from "@/components/charts/SleepChart";
import { StatTile } from "@/components/charts/StatTile";
import { SleepLogForm } from "@/components/sleep/SleepLogForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { addDaysISO, formatMinutes, minutesToHHMM, parseHHMM, todayISO } from "@/lib/domain/dates";
import { asleepMinutes, factorEffects, midSleepMinutes } from "@/lib/domain/sleep";
import { mean } from "@/lib/domain/stats";
import { getProfile } from "@/lib/services/profile";
import { sleepBetween, sleepSummary } from "@/lib/services/sleep";

const CHRONO: Record<string, string> = { lark: "Morning type (lark)", intermediate: "In between", owl: "Evening type (owl)" };

export default async function SleepPage() {
  const today = todayISO();
  const profile = await getProfile();
  const [summary, entries, longer] = await Promise.all([
    sleepSummary(profile.sleepTargetMin, today),
    sleepBetween(addDaysISO(today, -29), today),
    sleepBetween(addDaysISO(today, -89), today),
  ]);
  const logged = entries.find((e) => e.date === today);
  const target = profile.sleepTargetMin;
  const wake = parseHHMM(profile.wakeTarget);
  const bedTarget = (wake - target + 1440) % 1440;
  const effects = factorEffects(longer);
  const prev7 = entries.filter((e) => e.date <= addDaysISO(today, -7) && e.date > addDaysISO(today, -14));
  const prevAvg = prev7.length ? mean(prev7.map(asleepMinutes)) : null;
  const midsleep = entries.length ? mean(entries.map(midSleepMinutes)) : null;

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader title="Sleep" subtitle={`Target ${formatMinutes(target)} · wake ${profile.wakeTarget} → aim for bed around ${minutesToHHMM(bedTarget)}`} />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5">
          <SleepLogForm
            existing={Boolean(logged)}
            initial={{
              date: today,
              bedTime: logged ? format(logged.bedAt, "HH:mm") : minutesToHHMM(bedTarget),
              wakeTime: logged ? format(logged.wakeAt, "HH:mm") : profile.wakeTarget,
              latencyMin: logged?.latencyMin != null ? String(logged.latencyMin) : "",
              awakenings: logged?.awakenings != null ? String(logged.awakenings) : "",
              quality: logged?.quality ?? null,
              factors: logged?.factors ?? {},
              note: logged?.note ?? "",
            }}
          />
        </div>
        <div className="col-span-7 flex flex-col gap-4">
          <Card>
            <div className="grid grid-cols-3 gap-x-6 gap-y-5">
              <StatTile
                label="Last night"
                value={summary.lastNight ? formatMinutes(summary.lastNight.asleepMin) : "—"}
                caption={summary.lastNight?.quality ? `quality ${summary.lastNight.quality}/5` : "not logged yet"}
              />
              <StatTile
                label="7-day average"
                value={summary.avg7 ? formatMinutes(summary.avg7) : "—"}
                delta={summary.avg7 && prevAvg ? ((summary.avg7 - prevAvg) / prevAvg) * 100 : null}
                deltaLabel="vs the week before"
              />
              <StatTile label="Sleep debt · 14 days" value={formatMinutes(summary.debt14)} caption={`shortfall vs your ${formatMinutes(target)} target`} />
              <StatTile label="Regularity (SRI)" value={summary.regularity === null ? "—" : String(summary.regularity)} caption="higher = more consistent timing" />
              <StatTile label="Social jet lag" value={summary.socialJetLag === null ? "—" : formatMinutes(summary.socialJetLag)} caption="weekend vs weekday mid-sleep" />
              <StatTile label="Chronotype" value={summary.chronotype ? CHRONO[summary.chronotype].split(" (")[0] : "—"} caption={summary.chronotype ? CHRONO[summary.chronotype] : "needs a few nights"} />
            </div>
            <p className="mt-4 text-[12px] text-fg-subtle">
              Regularity (−100…100): how similar your sleep timing is from day to day — consistency matters for energy and mood, not just duration. Social jet lag: weekend vs weekday mid-sleep.
              {midsleep !== null && ` Your average mid-sleep is ${minutesToHHMM(midsleep)}.`}
            </p>
          </Card>
          <Card title="Last 30 nights">
            <SleepChart
              nights={entries.map((e) => ({ date: e.date, bedAt: e.bedAt, wakeAt: e.wakeAt, asleepMin: Math.round(asleepMinutes(e)), quality: e.quality }))}
              from={addDaysISO(today, -29)}
              to={today}
              targetBed={bedTarget}
              targetWake={Number.isNaN(wake) ? 420 : wake}
            />
            <DataTable
              caption="Sleep log, last 30 nights"
              columns={["Night ending", "Bed", "Wake", "Asleep", "Quality"]}
              rows={entries.map((e) => [e.date, format(e.bedAt, "HH:mm"), format(e.wakeAt, "HH:mm"), formatMinutes(asleepMinutes(e)), e.quality ?? "—"])}
            />
          </Card>
          <Card title="What seems to affect your sleep">
            {effects.length === 0 ? (
              <p className="text-[13px] text-fg-muted">Tag factors when you log sleep. Once you have at least three nights with and without a factor, the difference shows up here.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {effects.map((f) => (
                  <li key={f.key} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                    <span>
                      <b className="font-semibold">{f.label}</b> <span className="text-fg-subtle">({f.withN} vs {f.withoutN} nights)</span>
                    </span>
                    <span className="font-semibold" style={{ color: f.minutesDiff < -10 ? "var(--delta-bad)" : f.minutesDiff > 10 ? "var(--delta-good)" : "var(--fg-muted)" }}>
                      {f.minutesDiff > 0 ? "+" : f.minutesDiff < 0 ? "−" : "±"}
                      {formatMinutes(Math.abs(f.minutesDiff))} asleep
                      {f.qualityDiff !== null && `, quality ${f.qualityDiff > 0 ? "+" : ""}${f.qualityDiff}`}
                    </span>
                  </li>
                ))}
                <li className="text-[12px] text-fg-subtle">Averages from your own nights — associations, not proof.</li>
              </ul>
            )}
          </Card>
          <Card title="What the research says">
            <ul className="grid grid-cols-2 gap-3 text-[12.5px] text-fg-muted">
              <li><b className="block text-fg">Keep it regular</b>Same wake time every day — weekends too — anchors your body clock.</li>
              <li><b className="block text-fg">Morning light</b>10+ minutes of daylight soon after waking helps you fall asleep earlier.</li>
              <li><b className="block text-fg">Caffeine cutoff</b>Caffeine lingers for hours; stop about 8–10 hours before bed.</li>
              <li><b className="block text-fg">Wind down</b>Dim lights and screens in the last hour; alcohol fragments sleep.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
