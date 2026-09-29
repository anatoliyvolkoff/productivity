/**
 * Fill a database with ~5 weeks of realistic sample data, to try the app.
 *
 *   LOCAL_DB_DIR=.data/demo npx tsx scripts/seed-demo.ts
 *   LOCAL_DB_DIR=.data/demo npm run dev
 *
 * Refuses to touch a database that already has tasks (pass --force to override).
 * Stop the app first when using the local database — only one process can open it.
 */
import { openConnection } from "../src/lib/db/connect";
import * as s from "../src/lib/db/schema";
import { format } from "date-fns";
import { addDaysISO, atTime, fromISODate, todayISO } from "../src/lib/domain/dates";
import { quadrantOf } from "../src/lib/domain/mood";

let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
const between = (a: number, b: number) => a + rand() * (b - a);
const daysAgo = (n: number) => addDaysISO(todayISO(), -n);
const at = (date: string, minutes: number) => {
  const d = atTime(date, "00:00");
  d.setMinutes(Math.round(minutes));
  return d;
};

async function main() {
  const { db, close, kind, location } = await openConnection();
  const existing = await db.select().from(s.tasks).limit(1);
  if (existing.length && !process.argv.includes("--force")) {
    console.error(`The ${kind} database at ${location} already has data. Use a fresh LOCAL_DB_DIR or pass --force.`);
    await close();
    process.exit(1);
  }
  const today = todayISO();
  const created = (n: number) => atTime(daysAgo(n), "08:00");

  await db.insert(s.profile).values({ name: "", wakeTarget: "07:00", sleepTargetMin: 480, focusTargetMin: 240, latitude: 52.52, longitude: 13.41, locationName: "Berlin" });
  await db.insert(s.tags).values([
    { name: "work", color: "#007aff" },
    { name: "health", color: "#34c759" },
    { name: "home", color: "#ff7a00" },
    { name: "learning", color: "#af52de" },
  ]);

  // Goals
  const [vision] = await db.insert(s.goals).values({ title: "Healthy, focused and calm", horizon: "vision", priority: 1, startDate: daysAgo(60) }).returning();
  const [ship] = await db
    .insert(s.goals)
    .values({ title: "Ship Productivity OS v1", why: "A system that makes good days the default.", horizon: "quarter", priority: 1, startDate: daysAgo(35), dueDate: addDaysISO(today, 40), parentId: vision.id, tags: ["work"], createdAt: created(35) })
    .returning();
  const [books] = await db
    .insert(s.goals)
    .values({ title: "Read 24 books this year", horizon: "year", type: "numeric", targetValue: 24, currentValue: 17, unit: "books", priority: 3, startDate: `${today.slice(0, 4)}-01-01`, dueDate: `${today.slice(0, 4)}-12-31`, tags: ["learning"] })
    .returning();
  const [run] = await db
    .insert(s.goals)
    .values({ title: "Run a half marathon", why: "Energy and a clear head.", horizon: "quarter", type: "habit", priority: 2, startDate: daysAgo(30), dueDate: addDaysISO(today, 60), parentId: vision.id, tags: ["health"], createdAt: created(30) })
    .returning();
  const ms = ["Data model & design system", "Core loop: tasks + focus", "Habits, goals, mood, sleep", "AI brief & insights"];
  await db.insert(s.milestones).values(ms.map((title, i) => ({ goalId: ship.id, title, sortOrder: i, doneAt: i < 2 ? created(20 - i * 8) : null })));
  void books;

  // Tasks
  const open: Array<Partial<s.NewTask> & { title: string }> = [
    { title: "Write the Q4 plan", priority: 1, tags: ["work"], goalId: ship.id, mitOn: today, energy: "high", effortMin: 90 },
    { title: "Review pull requests", priority: 2, tags: ["work"], mitOn: today, effortMin: 45, status: "done", completedAt: atTime(today, "11:20") },
    { title: "Call the dentist", priority: 3, tags: ["health"], mitOn: today, dueDate: today, effortMin: 10 },
    { title: "Design the insights page", priority: 2, tags: ["work"], goalId: ship.id, dueDate: addDaysISO(today, 2), energy: "high", effortMin: 120 },
    { title: "Book flights for December", priority: 3, tags: ["home"], dueDate: addDaysISO(today, 5) },
    { title: "Renew passport", priority: 2, tags: ["home"], dueDate: daysAgo(1) },
    { title: "Prepare 1:1 notes", priority: 3, tags: ["work"], dueDate: today, effortMin: 15, energy: "low" },
    { title: "Long run — 14 km", priority: 2, tags: ["health"], goalId: run.id, dueDate: addDaysISO(today, 3) },
    { title: "Read 'Deep Work' chapter 4", priority: 4, tags: ["learning"], effortMin: 30, energy: "low" },
    { title: "Fix bathroom tap", priority: 4, tags: ["home"], status: "waiting" },
    { title: "Draft blog post on focus", priority: 3, tags: ["learning"], dueDate: addDaysISO(today, 9) },
    { title: "Plan weekly review template", priority: 3, tags: ["work"], status: "inbox" },
  ];
  await db.insert(s.tasks).values(open.map((t) => ({ status: "next" as const, ...t })));
  const doneTitles = ["Reply to investor email", "Ship onboarding copy", "Grocery run", "Update budget sheet", "Refactor timer", "Stretch session", "Clean inbox", "Write changelog", "Call mom", "Pay rent"];
  const pastDone: s.NewTask[] = [];
  for (let d = 1; d <= 30; d++) {
    const n = [0, 6].includes(new Date(`${daysAgo(d)}T12:00:00`).getDay()) ? Math.floor(between(0, 2)) : Math.floor(between(2, 6));
    for (let i = 0; i < n; i++)
      pastDone.push({ title: pick(doneTitles), status: "done", priority: pick([1, 2, 3, 3, 4]), tags: [pick(["work", "work", "home", "health", "learning"])], completedAt: at(daysAgo(d), between(9 * 60, 19 * 60)), mitOn: i < 2 ? daysAgo(d) : null, createdAt: created(d + 2) });
  }
  await db.insert(s.tasks).values(pastDone);
  const [focusTask] = await db.select().from(s.tasks).limit(1);

  // Habits
  const habits = await db
    .insert(s.habits)
    .values([
      { title: "Meditate", cue: "After my morning coffee, I will meditate for 10 minutes", color: "#1baf7a", goalId: vision.id, createdAt: created(40), sortOrder: 0 },
      { title: "Read", type: "duration", target: 20, cue: "After dinner, I will read for 20 minutes", color: "#8e6bd9", createdAt: created(40), sortOrder: 1 },
      { title: "Run", schedule: { kind: "weekdays", days: [1, 3, 5] }, cue: "At 7:15 on Mon/Wed/Fri, I will run", goalId: run.id, color: "#eb6834", createdAt: created(30), sortOrder: 2 },
      { title: "Deep work", type: "duration", target: 120, unit: "min", autoSource: "focus_minutes", color: "#2a78d6", createdAt: created(40), sortOrder: 3 },
      { title: "Drink water", type: "count", target: 8, unit: "glasses", color: "#5ac8fa", createdAt: created(40), sortOrder: 4 },
      { title: "No phone before 9:00", isNegative: true, color: "#ff2d55", createdAt: created(25), sortOrder: 5 },
      { title: "Journal", schedule: { kind: "per_week", times: 3 }, color: "#eda100", createdAt: created(35), sortOrder: 6 },
    ])
    .returning();
  const logs: Array<typeof s.habitLogs.$inferInsert> = [];
  for (const h of habits) {
    if (h.autoSource !== "none") continue;
    const start = Math.round((Date.now() - h.createdAt.getTime()) / 86_400_000);
    for (let d = start; d >= 0; d--) {
      const date = daysAgo(d);
      const dow = new Date(`${date}T12:00:00`).getDay();
      if (h.schedule.kind === "weekdays" && !h.schedule.days.includes(dow)) continue;
      const p = h.schedule.kind === "per_week" ? 0.45 : d === 0 ? 0.5 : 0.8;
      if (rand() > p) continue;
      const value = h.type === "count" ? Math.round(between(5, 9)) : h.type === "duration" ? Math.round(between(15, 40)) : 1;
      logs.push({ habitId: h.id, date, value });
    }
  }
  await db.insert(s.habitLogs).values(logs);

  // Sleep, mood, focus, time — correlated so insights have something to find.
  const moods: Array<typeof s.moodEntries.$inferInsert> = [];
  const words: Record<string, string[]> = {
    yellow: ["Focused", "Motivated", "Happy", "Energized", "Proud", "Curious"],
    green: ["Calm", "Content", "Relaxed", "Grateful", "Rested"],
    red: ["Stressed", "Anxious", "Frustrated", "Tense", "Overwhelmed"],
    blue: ["Tired", "Drained", "Bored", "Down", "Fatigued"],
  };
  for (let d = 34; d >= 0; d--) {
    const date = daysAgo(d);
    const weekend = [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
    const bed = 23 * 60 + between(-50, 70) + (weekend ? 55 : 0);
    const wake = 7 * 60 + between(-25, 40) + (weekend ? 75 : 0);
    const asleep = 24 * 60 - bed + wake;
    const quality = Math.max(1, Math.min(5, Math.round((asleep - 360) / 40 + between(-1, 1))));
    await db.insert(s.sleepEntries).values({
      date,
      bedAt: at(addDaysISO(date, -1), bed),
      wakeAt: at(date, wake),
      latencyMin: Math.round(between(5, 25)),
      quality,
      factors: { caffeineLate: rand() < 0.2, screensLate: rand() < 0.4, exercise: rand() < 0.4 },
    });

    const rested = (asleep - 420) / 60; // hours above 7h
    const checkins = d === 0 ? 1 : Math.round(between(1, 3));
    for (let i = 0; i < checkins; i++) {
      const energy = Math.max(-5, Math.min(5, Math.round(rested * 1.6 + between(-2.5, 3)))) || 1;
      const pleasant = Math.max(-5, Math.min(5, Math.round(rested * 1.2 + between(-2, 3.5)))) || 1;
      const q = quadrantOf(energy, pleasant);
      moods.push({ at: at(date, between(9 * 60, 21 * 60)), energy, pleasantness: pleasant, quadrant: q, emotion: pick(words[q]), context: { doing: [pick(["Working", "Resting", "Exercising", "Socializing"])], where: [pick(["Home", "Work", "Outside"])] } });
    }

    if (weekend && d > 0) continue;
    const sessions = d === 0 ? 2 : Math.max(0, Math.round(between(1, 4) + rested * 0.8));
    let t = 9 * 60;
    for (let i = 0; i < sessions; i++) {
      const preset = pick(["pomodoro", "pomodoro", "d52", "ultradian"] as const);
      const planned = preset === "pomodoro" ? 25 : preset === "d52" ? 52 : 90;
      const startedAt = at(date, t + between(0, 30));
      if (d === 0 && startedAt.getTime() + planned * 60_000 > Date.now()) break;
      const [session] = await db
        .insert(s.focusSessions)
        .values({ taskId: focusTask.id, preset, plannedMin: planned, breakMin: 5, startedAt, endedAt: new Date(startedAt.getTime() + planned * 60_000), actualMin: planned, quality: Math.max(1, Math.min(5, Math.round(3.4 + rested * 0.6 + between(-1, 1)))) })
        .returning();
      await db.insert(s.timeEntries).values({ taskId: focusTask.id, focusSessionId: session.id, startedAt, endedAt: session.endedAt, source: "focus", isDeepWork: true });
      t += planned + 25 + between(20, 90);
    }
    if (d > 0) {
      const st = at(date, 15 * 60 + between(0, 90));
      await db.insert(s.timeEntries).values({ startedAt: st, endedAt: new Date(st.getTime() + between(30, 80) * 60_000), note: pick(["Email", "Meetings", "Admin", "Planning"]), source: "timer" });
    }
  }
  await db.insert(s.moodEntries).values(moods);

  // Calendar (today and this week)
  const ev = (date: string, from: string, to: string, title: string, extra: Partial<typeof s.calendarEvents.$inferInsert> = {}) => ({ title, startAt: atTime(date, from), endAt: atTime(date, to), ...extra });
  await db.insert(s.calendarEvents).values([
    ev(today, "10:00", "10:15", "Team standup"),
    ev(today, "13:00", "13:45", "Lunch with Sam"),
    ev(today, "14:30", "15:00", "1:1 with Maria"),
    ev(today, "18:30", "19:30", "Gym"),
    ev(addDaysISO(today, 1), "10:00", "10:15", "Team standup"),
    ev(addDaysISO(today, 1), "11:00", "12:00", "Design review"),
    ev(addDaysISO(today, 2), "09:30", "11:00", "Deep work: insights page", { isTimeBlock: true }),
    ev(addDaysISO(today, -1), "10:00", "10:15", "Team standup"),
    ev(addDaysISO(today, -1), "16:00", "17:00", "Planning"),
  ]);

  // Notes & brain dump
  await db.insert(s.notes).values([
    { title: "Weekly review template", contentMd: "## Weekly review\n\n- What went well?\n- What drained energy?\n- Top 3 for next week\n- [ ] Clear inbox\n- [ ] Check goals pace", pinned: true, tags: ["work"] },
    { title: "Book notes — Atomic Habits", contentMd: "**Make it obvious, attractive, easy, satisfying.**\n\n> You do not rise to the level of your goals. You fall to the level of your systems.", tags: ["learning"] },
    { title: format(fromISODate(addDaysISO(today, -1)), "EEEE, MMMM d"), dailyDate: addDaysISO(today, -1), contentMd: "Good focus in the morning. Energy dip after lunch — walked 15 min, helped." },
  ]);
  await db.insert(s.braindumpItems).values([
    { text: "Ask Maria about the offsite dates" },
    { text: "Idea: weekly review every Sunday evening" },
    { text: "Buy running shoes before the long run" },
    { text: "Worried about the Q4 deadline" },
  ]);

  console.log(`Seeded sample data into the ${kind} database at ${location}.`);
  await close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
