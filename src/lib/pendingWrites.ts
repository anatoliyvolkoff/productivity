"use client";

/**
 * Tracks saves that are still in flight. In the browser build the database
 * lives in this tab, so closing or reloading mid-save could lose it — while
 * anything is pending, the browser asks before leaving.
 */
let pending = 0;

function onBeforeUnload(e: BeforeUnloadEvent) {
  e.preventDefault();
}

export async function trackWrite<T>(work: Promise<T>): Promise<T> {
  if (pending++ === 0) window.addEventListener("beforeunload", onBeforeUnload);
  try {
    return await work;
  } finally {
    if (--pending === 0) window.removeEventListener("beforeunload", onBeforeUnload);
  }
}
