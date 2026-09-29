"use client";

import { useEffect, useState } from "react";

/**
 * Current time, ticking every `intervalMs`. Returns null until mounted so
 * server and client render the same markup (no hydration mismatch).
 */
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
