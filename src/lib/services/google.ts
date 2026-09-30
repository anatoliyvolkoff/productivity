import "server-only";
import { and, eq, gt, isNotNull, lt, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { calendarEvents, calendars, integrations, profile, type CalendarEvent } from "@/lib/db/schema";
import { fromISODate, toISODate } from "@/lib/domain/dates";

/**
 * Google Calendar two-way sync.
 * Pull: every enabled calendar is fetched for a rolling window (30 days back,
 * 90 days ahead) with recurring events expanded, then reconciled with the local
 * table. The app runs on localhost, so Google can't push webhooks to it — the
 * UI triggers a sync every couple of minutes while it is open.
 * Push: events created or edited in the app are written to Google right away.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API = "https://www.googleapis.com/calendar/v3";
const SCOPE = "https://www.googleapis.com/auth/calendar";
const PROVIDER = "google";
const SYNC_INTERVAL_MS = 2 * 60_000;

export class GoogleError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function googleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string; scope?: string; error?: string; error_description?: string };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      ...body,
    }),
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) throw new GoogleError(json.error_description || json.error || "Token request failed", res.status);
  return json;
}

/** Finish the OAuth flow: store tokens, load calendars, push pending events and sync. */
export async function connectGoogle(code: string, redirectUri: string): Promise<void> {
  const tokens = await tokenRequest({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
  const db = await getDb();
  const values = {
    provider: PROVIDER,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (tokens.expires_in - 60) * 1000),
    scope: tokens.scope ?? SCOPE,
  };
  await db.insert(integrations).values(values).onConflictDoUpdate({
    target: integrations.provider,
    set: { ...values, refreshToken: tokens.refresh_token ?? sql`${integrations.refreshToken}` },
  });

  const primary = await syncCalendarList();
  if (primary) {
    await db.update(integrations).set({ accountEmail: primary }).where(eq(integrations.provider, PROVIDER));
    const [p] = await db.select().from(profile).limit(1);
    if (p && !p.googleCalendarId) await db.update(profile).set({ googleCalendarId: primary }).where(eq(profile.id, p.id));
  }

  // Push local, non-private upcoming events created before connecting.
  const pending = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.source, "local"),
        eq(calendarEvents.isPrivate, false),
        sql`${calendarEvents.googleId} is null`,
        gt(calendarEvents.endAt, new Date()),
      ),
    );
  for (const e of pending) await pushGoogleEvent(e).catch((err) => console.error("Google push failed:", err));

  await syncGoogle({ force: true });
}

export async function getGoogleIntegration() {
  const db = await getDb();
  const [row] = await db.select().from(integrations).where(eq(integrations.provider, PROVIDER));
  return row ?? null;
}

export async function isGoogleConnected(): Promise<boolean> {
  if (!googleConfigured()) return false;
  const row = await getGoogleIntegration();
  return Boolean(row?.refreshToken || row?.accessToken);
}

async function accessToken(): Promise<string> {
  const row = await getGoogleIntegration();
  if (!row) throw new GoogleError("Google Calendar is not connected.");
  if (row.accessToken && row.expiresAt && row.expiresAt.getTime() > Date.now() + 30_000) return row.accessToken;
  if (!row.refreshToken) throw new GoogleError("Google access expired — reconnect in Settings.", 401);
  const tokens = await tokenRequest({ refresh_token: row.refreshToken, grant_type: "refresh_token" });
  const db = await getDb();
  await db
    .update(integrations)
    .set({ accessToken: tokens.access_token, expiresAt: new Date(Date.now() + (tokens.expires_in - 60) * 1000) })
    .where(eq(integrations.provider, PROVIDER));
  return tokens.access_token;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) throw new GoogleError(`Google Calendar API ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status);
  return (await res.json()) as T;
}

type GoogleCalendar = {
  id: string;
  summary: string;
  summaryOverride?: string;
  backgroundColor?: string;
  primary?: boolean;
  selected?: boolean;
  accessRole: "owner" | "writer" | "reader" | "freeBusyReader";
};

type GoogleTime = { date?: string; dateTime?: string };

export type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  etag?: string;
  start: GoogleTime;
  end: GoogleTime;
  attendees?: Array<{ self?: boolean; responseStatus?: string }>;
};

/** Refresh the calendar list. Returns the primary calendar id. */
export async function syncCalendarList(): Promise<string | null> {
  const db = await getDb();
  const data = await api<{ items: GoogleCalendar[] }>("/users/me/calendarList?maxResults=250");
  const items = data.items ?? [];
  for (const c of items) {
    const values = {
      id: c.id,
      summary: c.summaryOverride ?? c.summary,
      color: c.backgroundColor ?? null,
      isPrimary: Boolean(c.primary),
      canWrite: c.accessRole === "owner" || c.accessRole === "writer",
    };
    await db
      .insert(calendars)
      .values({ ...values, enabled: Boolean(c.primary || c.selected) })
      .onConflictDoUpdate({ target: calendars.id, set: values });
  }
  const ids = items.map((c) => c.id);
  if (ids.length) {
    await db.delete(calendarEvents).where(and(eq(calendarEvents.source, "google"), notInArray(calendarEvents.calendarId, ids)));
    await db.delete(calendars).where(notInArray(calendars.id, ids));
  }
  return items.find((c) => c.primary)?.id ?? null;
}

/** Convert a Google event to local column values; null for cancelled or declined events. */
export function fromGoogleEvent(e: GoogleEvent) {
  if (e.status === "cancelled") return null;
  if (e.attendees?.some((a) => a.self && a.responseStatus === "declined")) return null;
  const allDay = Boolean(e.start.date && !e.start.dateTime);
  const startAt = allDay ? fromISODate(e.start.date!) : new Date(e.start.dateTime!);
  const endAt = allDay ? fromISODate(e.end.date ?? e.start.date!) : new Date(e.end.dateTime ?? e.start.dateTime!);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return null;
  return {
    googleId: e.id,
    title: e.summary?.trim() || "(No title)",
    description: e.description ?? null,
    location: e.location ?? null,
    htmlLink: e.htmlLink ?? null,
    etag: e.etag ?? null,
    allDay,
    startAt,
    endAt: endAt > startAt ? endAt : new Date(startAt.getTime() + (allDay ? 86_400_000 : 30 * 60_000)),
  };
}

export function toGoogleEvent(e: Pick<CalendarEvent, "title" | "description" | "location" | "allDay" | "startAt" | "endAt">) {
  const time = (d: Date): GoogleTime => (e.allDay ? { date: toISODate(d) } : { dateTime: d.toISOString() });
  return {
    summary: e.title,
    description: e.description ?? undefined,
    location: e.location ?? undefined,
    start: time(e.startAt),
    end: time(e.endAt),
  };
}

let running: Promise<SyncResult> | null = null;

export type SyncResult = { ok: boolean; synced: number; error?: string; skipped?: boolean };

/** Pull all enabled calendars. Throttled to every 2 minutes unless forced. */
export function syncGoogle(options: { force?: boolean } = {}): Promise<SyncResult> {
  running ??= doSync(options).finally(() => {
    running = null;
  });
  return running;
}

async function doSync({ force }: { force?: boolean }): Promise<SyncResult> {
  if (!(await isGoogleConnected())) return { ok: false, synced: 0, error: "Google Calendar is not connected." };
  const db = await getDb();
  let list = await db.select().from(calendars);
  if (list.length === 0) {
    await syncCalendarList();
    list = await db.select().from(calendars);
  }
  const enabled = list.filter((c) => c.enabled);
  const stale = enabled.filter((c) => force || !c.lastSyncedAt || Date.now() - c.lastSyncedAt.getTime() > SYNC_INTERVAL_MS);
  if (stale.length === 0) return { ok: true, synced: 0, skipped: true };

  const timeMin = new Date(Date.now() - 30 * 86_400_000);
  const timeMax = new Date(Date.now() + 90 * 86_400_000);
  let synced = 0;

  try {
    for (const cal of stale) {
      const items: GoogleEvent[] = [];
      let pageToken: string | undefined;
      do {
        const params = new URLSearchParams({
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: "true",
          maxResults: "2500",
          ...(pageToken ? { pageToken } : {}),
        });
        const page = await api<{ items?: GoogleEvent[]; nextPageToken?: string }>(
          `/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
        );
        items.push(...(page.items ?? []));
        pageToken = page.nextPageToken;
      } while (pageToken);

      const rows = items.map(fromGoogleEvent).filter((r): r is NonNullable<typeof r> => r !== null);
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200).map((r) => ({ ...r, calendarId: cal.id, source: "google" as const }));
        await db
          .insert(calendarEvents)
          .values(chunk)
          .onConflictDoUpdate({
            target: [calendarEvents.calendarId, calendarEvents.googleId],
            set: {
              title: sql`excluded.title`,
              description: sql`excluded.description`,
              location: sql`excluded.location`,
              htmlLink: sql`excluded.html_link`,
              etag: sql`excluded.etag`,
              allDay: sql`excluded.all_day`,
              startAt: sql`excluded.start_at`,
              endAt: sql`excluded.end_at`,
              updatedAt: new Date(),
            },
          });
      }

      const keep = rows.map((r) => r.googleId);
      await db
        .delete(calendarEvents)
        .where(
          and(
            eq(calendarEvents.calendarId, cal.id),
            isNotNull(calendarEvents.googleId),
            keep.length ? notInArray(calendarEvents.googleId, keep) : undefined,
            lt(calendarEvents.startAt, timeMax),
            gt(calendarEvents.endAt, timeMin),
          ),
        );
      await db.update(calendars).set({ lastSyncedAt: new Date() }).where(eq(calendars.id, cal.id));
      synced += rows.length;
    }
    return { ok: true, synced };
  } catch (error) {
    console.error("Google sync failed:", error);
    return { ok: false, synced, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Create or update the Google copy of an event. Returns the updated local row. */
export async function pushGoogleEvent(row: CalendarEvent): Promise<CalendarEvent> {
  const db = await getDb();
  const calendarId = row.calendarId ?? (await targetCalendarId());
  if (!calendarId) throw new GoogleError("No Google calendar to write to.");
  const [cal] = await db.select().from(calendars).where(eq(calendars.id, calendarId));
  if (cal && !cal.canWrite) throw new GoogleError(`"${cal.summary}" is read-only.`);

  const body = JSON.stringify(toGoogleEvent(row));
  const path = `/calendars/${encodeURIComponent(calendarId)}/events`;
  const result = row.googleId
    ? await api<GoogleEvent>(`${path}/${encodeURIComponent(row.googleId)}`, { method: "PATCH", body })
    : await api<GoogleEvent>(path, { method: "POST", body });

  const [updated] = await db
    .update(calendarEvents)
    .set({ googleId: result.id, calendarId, etag: result.etag ?? null, htmlLink: result.htmlLink ?? null })
    .where(eq(calendarEvents.id, row.id))
    .returning();
  return updated;
}

export async function deleteGoogleEvent(row: CalendarEvent): Promise<void> {
  if (!row.googleId || !row.calendarId || !(await isGoogleConnected())) return;
  try {
    await api(`/calendars/${encodeURIComponent(row.calendarId)}/events/${encodeURIComponent(row.googleId)}`, { method: "DELETE" });
  } catch (error) {
    if (error instanceof GoogleError && (error.status === 404 || error.status === 410)) return;
    throw error;
  }
}

async function targetCalendarId(): Promise<string | null> {
  const db = await getDb();
  const [p] = await db.select().from(profile).limit(1);
  if (p?.googleCalendarId) return p.googleCalendarId;
  const [primary] = await db.select().from(calendars).where(eq(calendars.isPrimary, true));
  return primary?.id ?? null;
}

export async function isCalendarWritable(calendarId: string | null): Promise<boolean> {
  if (!calendarId) return true;
  const db = await getDb();
  const [cal] = await db.select().from(calendars).where(eq(calendars.id, calendarId));
  return cal ? cal.canWrite : true;
}

/** Revoke access and remove everything that came from Google. App-created events stay. */
export async function disconnectGoogle(): Promise<void> {
  const db = await getDb();
  const row = await getGoogleIntegration();
  const token = row?.refreshToken ?? row?.accessToken;
  if (token) {
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
  }
  await db.delete(calendarEvents).where(eq(calendarEvents.source, "google"));
  await db
    .update(calendarEvents)
    .set({ googleId: null, calendarId: null, etag: null, htmlLink: null })
    .where(isNotNull(calendarEvents.googleId));
  await db.delete(calendars);
  await db.delete(integrations).where(eq(integrations.provider, PROVIDER));
  const [p] = await db.select().from(profile).limit(1);
  if (p) await db.update(profile).set({ googleCalendarId: null }).where(eq(profile.id, p.id));
}

export async function googleStatus() {
  const row = await getGoogleIntegration();
  const db = await getDb();
  const list = row ? await db.select().from(calendars) : [];
  const lastSyncedAt = list
    .map((c) => c.lastSyncedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  return {
    configured: googleConfigured(),
    connected: Boolean(row && googleConfigured()),
    accountEmail: row?.accountEmail ?? null,
    calendars: list,
    lastSyncedAt: lastSyncedAt ?? null,
  };
}


/**
 * A daily recurring event with a pop-up alert at its start — Google Calendar
 * then reminds you on every device, even when the app is closed.
 * Returns the event id (the existing one when updating).
 */
export async function upsertDailyReminderEvent(input: { eventId: string | null; title: string; time: string; startDate: string }): Promise<string> {
  const calendarId = await targetCalendarId();
  if (!calendarId) throw new GoogleError("No Google calendar to write to.");
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [h, m] = input.time.split(":").map(Number);
  const endMin = h * 60 + m + 5;
  const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const body = JSON.stringify({
    summary: input.title,
    start: { dateTime: `${input.startDate}T${hhmm(h * 60 + m)}:00`, timeZone },
    end: { dateTime: `${input.startDate}T${hhmm(endMin)}:00`, timeZone },
    recurrence: ["RRULE:FREQ=DAILY"],
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }] },
    transparency: "transparent",
  });
  const path = `/calendars/${encodeURIComponent(calendarId)}/events`;
  if (input.eventId) {
    try {
      return (await api<GoogleEvent>(`${path}/${encodeURIComponent(input.eventId)}`, { method: "PATCH", body })).id;
    } catch (error) {
      if (!(error instanceof GoogleError && (error.status === 404 || error.status === 410))) throw error;
    }
  }
  return (await api<GoogleEvent>(path, { method: "POST", body })).id;
}

export async function deleteReminderEvent(eventId: string): Promise<void> {
  const calendarId = await targetCalendarId();
  if (!calendarId) return;
  try {
    await api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
  } catch (error) {
    if (error instanceof GoogleError && (error.status === 404 || error.status === 410)) return;
    throw error;
  }
}
