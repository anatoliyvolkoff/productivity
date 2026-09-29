import { format } from "date-fns";
import { Moon } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BarChart } from "@/components/charts/BarChart";
import { formatMinutes, fromISODate } from "@/lib/domain/dates";
import type { SleepSummary } from "@/lib/services/sleep";

export function SleepCard({ sleep, targetMin }: { sleep: SleepSummary; targetMin: number }) {
  const last = sleep.lastNight;
  return (
    <Card title="Sleep" className="h-full" action={<Link href="/sleep" className="text-[12px] text-primary">Details</Link>}>
      {last ? (
        <>
          <div className="text-[30px] leading-none font-semibold tracking-tight">{formatMinutes(last.asleepMin)}</div>
          <div className="mt-1 text-[13px] text-fg-muted">
            {format(last.bedAt, "HH:mm")}–{format(last.wakeAt, "HH:mm")}
            {last.quality ? ` · quality ${last.quality}/5` : ""}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <p className="text-[13.5px] text-fg-muted">How did you sleep? It shapes today&apos;s energy estimate.</p>
          <Link href="/sleep" className={buttonClass("tonal", "sm")}>
            <Moon className="size-3.5" /> Log last night
          </Link>
        </div>
      )}
      <div className="mt-3">
        <BarChart
          data={sleep.recent.map((n) => ({ label: format(fromISODate(n.date), "EEE, MMM d"), short: format(fromISODate(n.date), "EEEEE"), value: n.asleepMin }))}
          unit="minutes"
          target={targetMin}
          targetLabel=""
          height={120}
          color="var(--series-1)"
        />
      </div>
      <dl className="mt-auto grid grid-cols-2 gap-2 pt-2 text-[12px]">
        <div>
          <dt className="text-fg-muted">7-day avg</dt>
          <dd className="font-semibold">{sleep.avg7 ? formatMinutes(sleep.avg7) : "—"}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">Sleep debt (14d)</dt>
          <dd className="font-semibold" style={{ color: sleep.debt14 > targetMin ? "var(--delta-bad)" : undefined }}>
            {formatMinutes(sleep.debt14)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
