/** Scheduling helpers: free-slot search and side-by-side layout of overlapping events. */

export type Interval = { start: number; end: number }; // epoch ms

/**
 * Earliest free slot of `durationMin`, searching from `from` in 15-minute
 * steps within each day's working window (minutes after midnight), for up to
 * `days` days.
 */
export function suggestSlot(
  busy: Interval[],
  durationMin: number,
  from: Date,
  options: { dayStartMin?: number; dayEndMin?: number; days?: number; preferred?: Interval | null } = {},
): Interval | null {
  const dayStart = options.dayStartMin ?? 9 * 60;
  const dayEnd = options.dayEndMin ?? 21 * 60;
  const duration = durationMin * 60_000;
  const step = 15 * 60_000;
  const free = (s: number) => !busy.some((b) => b.start < s + duration && b.end > s);

  const p = options.preferred;
  if (p && p.start >= from.getTime() && p.end - p.start >= duration && free(p.start)) return { start: p.start, end: p.start + duration };

  for (let d = 0; d < (options.days ?? 7); d++) {
    const day = new Date(from);
    day.setDate(day.getDate() + d);
    day.setHours(0, 0, 0, 0);
    const open = day.getTime() + dayStart * 60_000;
    const close = day.getTime() + dayEnd * 60_000;
    let s = Math.max(open, Math.ceil(from.getTime() / step) * step);
    for (; s + duration <= close; s += step) if (free(s)) return { start: s, end: s + duration };
  }
  return null;
}

/**
 * Assign overlapping events to columns (like calendar apps do). Returns, per
 * input index, the column and the number of columns in its overlap cluster.
 */
export function layoutColumns(events: Interval[]): Array<{ column: number; columns: number }> {
  const order = events.map((e, i) => ({ ...e, i })).sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Array<{ column: number; columns: number }> = new Array(events.length);
  let cluster: typeof order = [];
  let clusterEnd = -Infinity;
  const columnsEnd: number[] = [];

  const flush = () => {
    const n = Math.max(1, ...cluster.map((e) => out[e.i].column + 1));
    for (const e of cluster) out[e.i].columns = n;
    cluster = [];
    columnsEnd.length = 0;
  };

  for (const e of order) {
    if (e.start >= clusterEnd && cluster.length) flush();
    let col = columnsEnd.findIndex((end) => end <= e.start);
    if (col === -1) col = columnsEnd.length;
    columnsEnd[col] = e.end;
    out[e.i] = { column: col, columns: 1 };
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd, e.end);
  }
  if (cluster.length) flush();
  return out;
}
