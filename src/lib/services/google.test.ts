import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { calendarEvents, calendars, integrations } from "@/lib/db/schema";
import { createEvent, deleteEvent, updateEvent } from "./calendar";
import { connectGoogle, disconnectGoogle, fromGoogleEvent, syncGoogle, toGoogleEvent } from "./google";

/** A tiny fake of the Google OAuth + Calendar APIs. */
function fakeGoogle() {
  const calls: Array<{ method: string; url: string; body?: unknown }> = [];
  const soon = new Date(Date.now() + 2 * 86_400_000);
  soon.setHours(10, 0, 0, 0);
  const iso = (d: Date) => d.toISOString();
  const dateIn = (days: number) => {
    const d = new Date(Date.now() + days * 86_400_000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  let nextId = 1;
  const events: Record<string, Array<Record<string, unknown>>> = {
    "me@example.com": [
      { id: "g1", summary: "Dentist", etag: "e1", htmlLink: "https://calendar.google.com/g1", start: { dateTime: iso(soon) }, end: { dateTime: iso(new Date(soon.getTime() + 3_600_000)) } },
      { id: "g2", summary: "Offsite", start: { date: dateIn(10) }, end: { date: dateIn(12) } },
      { id: "g3", status: "cancelled", start: { dateTime: iso(soon) }, end: { dateTime: iso(soon) } },
      { id: "g4", summary: "Declined meeting", attendees: [{ self: true, responseStatus: "declined" }], start: { dateTime: iso(soon) }, end: { dateTime: iso(soon) } },
    ],
    "holidays@group": [{ id: "h1", summary: "Public holiday", start: { date: soon.toISOString().slice(0, 10) }, end: { date: new Date(soon.getTime() + 86_400_000).toISOString().slice(0, 10) } }],
  };

  const json = (data: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" && init.body.startsWith("{") ? JSON.parse(init.body) : init?.body;
    calls.push({ method, url, body });

    if (url.startsWith("https://oauth2.googleapis.com/token")) return json({ access_token: "access-1", expires_in: 3600, refresh_token: "refresh-1", scope: "calendar" });
    if (url.startsWith("https://oauth2.googleapis.com/revoke")) return json({});
    if (url.includes("/users/me/calendarList"))
      return json({
        items: [
          { id: "me@example.com", summary: "Me", primary: true, accessRole: "owner", backgroundColor: "#4285f4" },
          { id: "holidays@group", summary: "Holidays", accessRole: "reader", selected: true },
        ],
      });
    const m = /\/calendars\/([^/]+)\/events(?:\/([^?]+))?/.exec(url);
    if (m) {
      const cal = decodeURIComponent(m[1]);
      const eventId = m[2] && decodeURIComponent(m[2]);
      if (method === "GET") return json({ items: events[cal] ?? [] });
      if (method === "POST") {
        const created = { ...(body as object), id: `new-${nextId++}`, etag: "new", htmlLink: "https://calendar.google.com/new" };
        (events[cal] ??= []).push(created);
        return json(created);
      }
      if (method === "PATCH") {
        const list = events[cal] ?? [];
        const i = list.findIndex((e) => e.id === eventId);
        list[i] = { ...list[i], ...(body as object) };
        return json(list[i]);
      }
      if (method === "DELETE") {
        events[cal] = (events[cal] ?? []).filter((e) => e.id !== eventId);
        return json(null, 204);
      }
    }
    return json({ error: "unexpected" }, 500);
  });

  return { calls, events, fetchMock };
}

const google = fakeGoogle();

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = "client";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
  vi.stubGlobal("fetch", google.fetchMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("Google Calendar mapping", () => {
  it("maps timed, all-day, cancelled and declined events", () => {
    expect(fromGoogleEvent({ id: "x", status: "cancelled", start: {}, end: {} })).toBeNull();
    const allDay = fromGoogleEvent({ id: "a", summary: "Trip", start: { date: "2026-10-01" }, end: { date: "2026-10-03" } })!;
    expect(allDay.allDay).toBe(true);
    expect(allDay.endAt.getTime() - allDay.startAt.getTime()).toBe(2 * 86_400_000);
    const body = toGoogleEvent({ ...allDay, description: null, location: null });
    expect(body.start).toEqual({ date: "2026-10-01" });
    expect(body.end).toEqual({ date: "2026-10-03" });
  });
});

describe("Google Calendar sync flow", () => {
  it("connects, pushes pending local events and pulls calendars", async () => {
    const start = new Date(Date.now() + 86_400_000);
    start.setHours(9, 0, 0, 0);
    const local = await createEvent({ title: "Deep work block", startAt: start, endAt: new Date(start.getTime() + 5_400_000), isTimeBlock: true });
    await createEvent({ title: "Private", startAt: start, endAt: new Date(start.getTime() + 600_000), isPrivate: true });

    await connectGoogle("code-123", "http://localhost:3000/api/google/callback");

    const db = await getDb();
    const [integration] = await db.select().from(integrations);
    expect(integration).toMatchObject({ provider: "google", accountEmail: "me@example.com", refreshToken: "refresh-1" });
    expect((await db.select().from(calendars)).map((c) => [c.id, c.canWrite, c.enabled]).sort()).toEqual([
      ["holidays@group", false, true],
      ["me@example.com", true, true],
    ]);

    const [pushed] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, local.id));
    expect(pushed.googleId).toMatch(/^new-/);
    expect(pushed.calendarId).toBe("me@example.com");
    const privateRows = await db.select().from(calendarEvents).where(eq(calendarEvents.title, "Private"));
    expect(privateRows[0].googleId).toBeNull();

    const titles = (await db.select().from(calendarEvents)).map((e) => e.title);
    expect(titles).toEqual(expect.arrayContaining(["Dentist", "Offsite", "Public holiday", "Deep work block"]));
    expect(titles).not.toContain("Declined meeting");
  });

  it("reconciles changes and deletions from Google", async () => {
    const list = google.events["me@example.com"];
    list.find((e) => e.id === "g1")!.summary = "Dentist (moved)";
    google.events["me@example.com"] = list.filter((e) => e.id !== "g2");

    const result = await syncGoogle({ force: true });
    expect(result.ok).toBe(true);
    const db = await getDb();
    const titles = (await db.select().from(calendarEvents)).map((e) => e.title);
    expect(titles).toContain("Dentist (moved)");
    expect(titles).not.toContain("Offsite");
    expect(titles).toContain("Deep work block"); // our pushed block is still on Google

    expect((await syncGoogle()).skipped).toBe(true); // throttled
  });

  it("writes edits and deletes back to Google, and refuses read-only calendars", async () => {
    const db = await getDb();
    const [dentist] = await db.select().from(calendarEvents).where(eq(calendarEvents.googleId, "g1"));
    await updateEvent(dentist.id, { title: "Dentist — bring forms" });
    expect(google.calls.some((c) => c.method === "PATCH" && c.url.includes("/events/g1") && (c.body as { summary?: string }).summary === "Dentist — bring forms")).toBe(true);

    const [holiday] = await db.select().from(calendarEvents).where(eq(calendarEvents.googleId, "h1"));
    await expect(updateEvent(holiday.id, { title: "Nope" })).rejects.toThrow(/read-only/);

    await deleteEvent(dentist.id);
    expect(google.calls.some((c) => c.method === "DELETE" && c.url.includes("/events/g1"))).toBe(true);
  });

  it("disconnects and keeps app-created events", async () => {
    await disconnectGoogle();
    const db = await getDb();
    const rows = await db.select().from(calendarEvents);
    expect(rows.map((r) => r.title).sort()).toEqual(["Deep work block", "Private"]);
    expect(rows.every((r) => r.googleId === null)).toBe(true);
    expect(await db.select().from(integrations)).toHaveLength(0);
  });
});
