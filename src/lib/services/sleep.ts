import "server-only";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sleepEntries, type SleepEntry, type SleepFactors } from "@/lib/db/schema";
import { addDaysISO, atTime, parseHHMM, todayISO, type ISODate } from "@/lib/domain/dates";
import {
  asleepMinutes,
  estimateChronotype,
  sleepDebt,
  sleepRegularityIndex,
  socialJetLag,
  type Chronotype,
} from "@/lib/domain/sleep";
import { mean } from "@/lib/domain/stats";

export type SleepInput = {
  date: ISODate; // wake date
  bedTime: string; // "HH:MM"
  wakeTime: string; // "HH:MM"
  latencyMin?: number | null;
  awakenings?: number | null;
  quality?: number | null;
  factors?: SleepFactors | null;
  note?: string | null;
};

export async function saveSleep(input: SleepInput): Promise<SleepEntry> {
  const bed = parseHHMM(input.bedTime);
  const wake = parseHHMM(input.wakeTime);
  if (Number.isNaN(bed) || Number.isNaN(wake)) throw new Error("Use times like 23:30 and 07:00.");
  // A bedtime later in the clock than the wake time was the evening before.
  const bedDate = bed > wake ? addDaysISO(input.date, -1) : input.date;
  const bedAt = atTime(bedDate, input.bedTime);
  const wakeAt = atTime(input.date, input.wakeTime);
  if (wakeAt.getTime() - bedAt.getTime() > 20 * 3_600_000) throw new Error("That's more than 20 hours in bed — check the times.");

  const values = {
    date: input.date,
    bedAt,
    wakeAt,
    latencyMin: input.latencyMin ?? null,
    awakenings: input.awakenings ?? null,
    quality: input.quality ? Math.min(5, Math.max(1, Math.round(input.quality))) : null,
    factors: input.factors ?? null,
    note: input.note?.trim() || null,
  };
  const db = await getDb();
  const [row] = await db
    .insert(sleepEntries)
    .values(values)
    .onConflictDoUpdate({ target: sleepEntries.date, set: values })
    .returning();
  return row;
}

export async function sleepBetween(from: ISODate, to: ISODate): Promise<SleepEntry[]> {
  const db = await getDb();
  return db
    .select()
    .from(sleepEntries)
    .where(and(gte(sleepEntries.date, from), lte(sleepEntries.date, to)))
    .orderBy(desc(sleepEntries.date));
}

export async function deleteSleep(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(sleepEntries).where(eq(sleepEntries.id, id));
}

export type SleepSummary = {
  lastNight: (SleepEntry & { asleepMin: number }) | null;
  avg7: number | null;
  avgQuality7: number | null;
  debt14: number;
  regularity: number | null;
  socialJetLag: number | null;
  chronotype: Chronotype | null;
  loggedToday: boolean;
  /** The last 7 nights (oldest first); null where nothing was logged. */
  recent: Array<{ date: ISODate; asleepMin: number | null }>;
};

export async function sleepSummary(targetMin: number, today = todayISO()): Promise<SleepSummary> {
  const entries = await sleepBetween(addDaysISO(today, -27), today);
  const within = (days: number) => entries.filter((e) => e.date > addDaysISO(today, -days));
  const last7 = within(7);
  const last = entries[0] && entries[0].date >= addDaysISO(today, -1) ? entries[0] : null;
  return {
    lastNight: last ? { ...last, asleepMin: Math.round(asleepMinutes(last)) } : null,
    avg7: last7.length ? Math.round(mean(last7.map(asleepMinutes))!) : null,
    avgQuality7: mean(last7.map((e) => e.quality).filter((q): q is number => q !== null)),
    debt14: sleepDebt(within(14), targetMin),
    regularity: sleepRegularityIndex(within(14)),
    socialJetLag: socialJetLag(entries),
    chronotype: estimateChronotype(entries),
    loggedToday: entries[0]?.date === today,
    recent: Array.from({ length: 7 }, (_, i) => {
      const date = addDaysISO(today, i - 6);
      const e = entries.find((x) => x.date === date);
      return { date, asleepMin: e ? Math.round(asleepMinutes(e)) : null };
    }),
  };
}
