/**
 * The app runs in two modes:
 *  - server (default): Next.js server + Supabase or the embedded database
 *  - web (NEXT_PUBLIC_WEB=1): a static build for GitHub Pages where everything,
 *    including the database, runs in the browser.
 */
export const IS_WEB = process.env.NEXT_PUBLIC_WEB === "1";

const WEB_SECRET_PREFIX = "pos-secret:";

/** A secret from the server environment, or (web mode) from this browser's storage. */
export function secret(name: string): string | undefined {
  if (IS_WEB) {
    try {
      return localStorage.getItem(WEB_SECRET_PREFIX + name)?.trim() || undefined;
    } catch {
      return undefined;
    }
  }
  return process.env[name]?.trim() || undefined;
}

export function setWebSecret(name: string, value: string) {
  try {
    if (value.trim()) localStorage.setItem(WEB_SECRET_PREFIX + name, value.trim());
    else localStorage.removeItem(WEB_SECRET_PREFIX + name);
  } catch {}
}
