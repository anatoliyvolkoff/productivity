/**
 * Optional password protection for hosting the app online.
 * Set APP_PASSWORD to turn it on; the session cookie holds a hash of the
 * password (plus AUTH_SECRET, if set), so changing either signs everyone out.
 */
export const SESSION_COOKIE = "pos_session";

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD?.trim());
}

export async function sessionToken(): Promise<string> {
  const data = new TextEncoder().encode(`${process.env.APP_PASSWORD?.trim()}::${process.env.AUTH_SECRET ?? "productivity-os"}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
