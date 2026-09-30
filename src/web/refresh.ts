/** Browser build: what `refresh()` from next/cache does on the server — re-load the current page's data. */
export const REFRESH_EVENT = "pos:refresh";

export function refresh() {
  if (typeof window !== "undefined") setTimeout(() => window.dispatchEvent(new Event(REFRESH_EVENT)), 0);
}
