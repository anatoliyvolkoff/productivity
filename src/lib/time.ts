export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Fraction (0–1) of the waking day elapsed, given wake/sleep hours. */
export function dayProgress(now: Date, wakeHour = 7, sleepHour = 23): number {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = wakeHour * 60;
  const end = sleepHour * 60;
  return Math.min(1, Math.max(0, (minutes - start) / (end - start)));
}

/** Split a millisecond duration into h/m/s (never negative). */
export function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
