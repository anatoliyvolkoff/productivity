import {
  addDays as dfAddDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";

/** Local calendar date, "YYYY-MM-DD". */
export type ISODate = string;

export const toISODate = (d: Date): ISODate => format(d, "yyyy-MM-dd");

/** Local midnight of the given date. */
export const fromISODate = (s: ISODate): Date => parseISO(s);

export const todayISO = (now = new Date()): ISODate => toISODate(now);

export const addDaysISO = (s: ISODate, days: number): ISODate => toISODate(dfAddDays(fromISODate(s), days));

/** Whole calendar days from `a` to `b` (positive when b is later). */
export const daysBetween = (a: ISODate, b: ISODate): number =>
  differenceInCalendarDays(fromISODate(b), fromISODate(a));

/** Monday of the week containing `s`. */
export const weekStartISO = (s: ISODate): ISODate => toISODate(startOfWeek(fromISODate(s), { weekStartsOn: 1 }));

/** 0 = Sunday … 6 = Saturday. */
export const dayOfWeek = (s: ISODate): number => fromISODate(s).getDay();

/** Inclusive list of dates from `start` to `end`. */
export function rangeISO(start: ISODate, end: ISODate): ISODate[] {
  const n = daysBetween(start, end);
  const out: ISODate[] = [];
  for (let i = 0; i <= n; i++) out.push(addDaysISO(start, i));
  return out;
}

/** "07:30" → 450 minutes after midnight. */
export function parseHHMM(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToHHMM(total: number): string {
  const m = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Local Date for a date plus "HH:MM". */
export function atTime(date: ISODate, hhmm: string): Date {
  const d = fromISODate(date);
  const minutes = parseHHMM(hhmm);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

/** Minutes since local midnight. */
export const minuteOfDay = (d: Date): number => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Human duration: 95 → "1h 35m", 40 → "40m". */
export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

/** "Today", "Tomorrow", "Yesterday", weekday within a week, else "Oct 5". */
export function relativeDayLabel(date: ISODate, today: ISODate): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return format(fromISODate(date), "EEEE");
  return format(fromISODate(date), "MMM d");
}
