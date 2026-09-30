/**
 * Runs once per server start. Hosting platforms run on UTC, but "today",
 * streaks and the energy curve should follow your own clock: set APP_TIMEZONE
 * (e.g. "Europe/Berlin") and the server uses it for all date math.
 */
export function register() {
  const tz = process.env.APP_TIMEZONE?.trim();
  if (tz) process.env.TZ = tz;
}
