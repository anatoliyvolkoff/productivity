"use client";

import { useEffect } from "react";
import { syncCalendar } from "@/app/actions/calendar";

/**
 * While the app is open, pull Google Calendar changes every two minutes and
 * whenever the window regains focus (the server throttles, so this is cheap).
 */
export function GoogleAutoSync() {
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === "visible") void syncCalendar(false);
    };
    sync();
    const id = setInterval(sync, 120_000);
    window.addEventListener("focus", sync);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", sync);
    };
  }, []);
  return null;
}
