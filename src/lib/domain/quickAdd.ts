import { addDaysISO, dayOfWeek, type ISODate } from "./dates";

export type QuickAddResult = {
  title: string;
  tags: string[];
  priority?: number;
  dueDate?: ISODate;
  /** "HH:MM" when a clock time was given — used to create a time block. */
  time?: string;
  effortMin?: number;
  energy?: "low" | "high";
};

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};
const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Parse natural quick-add text, e.g.
 * "Gym tomorrow 7am #health !2 ~45m @high" →
 * { title: "Gym", dueDate: <tomorrow>, time: "07:00", tags: ["health"], priority: 2, effortMin: 45, energy: "high" }
 */
export function parseQuickAdd(input: string, today: ISODate): QuickAddResult {
  let text = ` ${input.trim()} `;
  const result: QuickAddResult = { title: "", tags: [] };

  // Runs `fn` on the first match and removes the match from the text.
  // Returns null when there is no match or `fn` rejects it (returns false).
  const take = (re: RegExp, fn: (m: RegExpExecArray) => boolean | void) => {
    const m = re.exec(text);
    if (!m || fn(m) === false) return null;
    text = text.slice(0, m.index) + " " + text.slice(m.index + m[0].length);
    return m;
  };

  // #tags (repeatable)
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = /\s#([\p{L}\p{N}_\-/]+)(?=\s)/u.exec(text))) {
    const tag = tagMatch[1].toLowerCase();
    if (!result.tags.includes(tag)) result.tags.push(tag);
    text = text.slice(0, tagMatch.index) + " " + text.slice(tagMatch.index + tagMatch[0].length);
  }

  // priority: !1..!4 or p1..p4
  take(/\s(?:!|p)([1-4])(?=\s)/i, (m) => {
    result.priority = Number(m[1]);
  });

  // effort: ~30m, ~1h, ~1h30m, ~1.5h
  take(/\s~(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m(?:in)?)?(?=\s)/i, (m) => {
    if (!m[1] && !m[2]) return false;
    result.effortMin = Math.round((m[1] ? Number(m[1]) * 60 : 0) + (m[2] ? Number(m[2]) : 0));
  });

  // energy: @high / @low
  take(/\s@(high|low)(?=\s)/i, (m) => {
    result.energy = m[1].toLowerCase() as "high" | "low";
  });

  // time: 7am, 7:30pm, 19:30 (optionally preceded by "at")
  const twelveHour = take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)/i, (m) => {
    let h = Number(m[1]);
    const min = m[2] ? Number(m[2]) : 0;
    if (h < 1 || h > 12 || min > 59) return false;
    const pm = m[3].toLowerCase() === "pm";
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
    result.time = `${pad(h)}:${pad(min)}`;
  });
  if (!twelveHour) {
    take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/, (m) => {
      result.time = `${pad(Number(m[1]))}:${m[2]}`;
    });
  }

  // dates
  const setDate = (d: ISODate) => {
    result.dueDate = d;
  };
  const datePrefix = String.raw`(?:(?:on|by|due)\s+)?`;
  const dateRules: Array<[RegExp, (m: RegExpExecArray) => void]> = [
    [new RegExp(String.raw`\s${datePrefix}(\d{4})-(\d{2})-(\d{2})(?=\s)`), (m) => setDate(`${m[1]}-${m[2]}-${m[3]}`)],
    [new RegExp(String.raw`\s${datePrefix}(today|tod|tonight)(?=\s)`, "i"), () => setDate(today)],
    [new RegExp(String.raw`\s${datePrefix}(tomorrow|tmr|tmrw)(?=\s)`, "i"), () => setDate(addDaysISO(today, 1))],
    [/\snext\s+week(?=\s)/i, () => setDate(addDaysISO(today, (8 - dayOfWeek(today)) % 7 || 7))],
    [
      /\sin\s+(\d{1,3})\s+(day|days|week|weeks)(?=\s)/i,
      (m) => setDate(addDaysISO(today, Number(m[1]) * (m[2].toLowerCase().startsWith("week") ? 7 : 1))),
    ],
    [
      new RegExp(String.raw`\s${datePrefix}(next\s+)?(${Object.keys(WEEKDAYS).join("|")})(?=\s)`, "i"),
      (m) => {
        let diff = (WEEKDAYS[m[2].toLowerCase()] - dayOfWeek(today) + 7) % 7;
        // "friday" includes today; "next friday" is always after today.
        if (m[1] && diff === 0) diff = 7;
        setDate(addDaysISO(today, diff));
      },
    ],
    [
      new RegExp(String.raw`\s${datePrefix}(\d{1,2})\s+(${Object.keys(MONTHS).join("|")})(?=\s)`, "i"),
      (m) => setDate(nextDateFor(Number(m[1]), MONTHS[m[2].toLowerCase()], today)),
    ],
    [
      new RegExp(String.raw`\s${datePrefix}(${Object.keys(MONTHS).join("|")})\s+(\d{1,2})(?=\s)`, "i"),
      (m) => setDate(nextDateFor(Number(m[2]), MONTHS[m[1].toLowerCase()], today)),
    ],
  ];
  for (const [re, fn] of dateRules) if (take(re, fn)) break;

  // A time without a date means today.
  if (result.time && !result.dueDate) result.dueDate = today;

  result.title = text.replace(/\s+/g, " ").trim();
  return result;
}

/** The next occurrence (today or later) of a day/month. */
function nextDateFor(day: number, month: number, today: ISODate): ISODate {
  const year = Number(today.slice(0, 4));
  const candidate = `${year}-${pad(month)}-${pad(day)}`;
  return candidate >= today ? candidate : `${year + 1}-${pad(month)}-${pad(day)}`;
}
