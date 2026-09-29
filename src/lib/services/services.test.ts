import { describe, expect, it } from "vitest";
import { addDaysISO, todayISO } from "@/lib/domain/dates";
import { capture, listInbox, markTriaged } from "./braindump";
import { createEvent, eventsForDay, listEvents, updateEvent } from "./calendar";
import { getDayContext } from "./day";
import { completeSession, entriesBetween, getRunningSession, getRunningTimer, pauseSession, resumeSession, startSession, startTimer, stopTimer } from "./focus";
import { addMilestone, adjustGoalValue, createGoal, listGoals, toggleMilestone } from "./goals";
import { createHabit, listHabits, logHabit } from "./habits";
import { createMoodEntry, moodBetween } from "./mood";
import { getOrCreateDailyNote, listNotes, updateNote } from "./notes";
import { getProfile, updateProfile } from "./profile";
import { saveSleep, sleepSummary } from "./sleep";
import { deleteTag, listTags, renameTag } from "./tags";
import { createTask, listTasks, setTaskDone, toggleMit, updateTask } from "./tasks";

const today = todayISO();

describe("services on an in-memory Postgres", () => {
  it("bootstraps a profile", async () => {
    const p = await getProfile();
    expect(p.wakeTarget).toBe("07:00");
    expect((await updateProfile({ name: "Me", focusTargetMin: 180 })).focusTargetMin).toBe(180);
  });

  it("creates, lists and completes tasks with tags, MITs and goals", async () => {
    const goal = await createGoal({ title: "Ship v1", priority: 1, dueDate: addDaysISO(today, 30) });
    const a = await createTask({ title: "Write spec", tags: ["#Work", "focus"], priority: 3, goalId: goal.id });
    const b = await createTask({ title: "Buy milk", dueDate: today });
    await createTask({ title: "Later thing", dueDate: addDaysISO(today, 5) });

    expect(await toggleMit(a.id, today)).toBe(true);
    const todayList = await listTasks({ view: "today" });
    expect(todayList.map((t) => t.title)).toEqual(["Write spec", "Buy milk"]);
    expect(todayList[0]).toMatchObject({ goalTitle: "Ship v1", goalPriority: 1, tags: ["work", "focus"] });

    expect((await listTasks({ view: "upcoming" })).map((t) => t.title)).toEqual(["Later thing"]);
    expect((await listTasks({ tag: "work" })).length).toBe(1);

    for (const title of ["x", "y"]) {
      const t = await createTask({ title });
      await toggleMit(t.id, today);
    }
    const extra = await createTask({ title: "fourth" });
    expect(await toggleMit(extra.id, today)).toBe(false); // max 3

    await setTaskDone(b.id, true);
    expect((await listTasks({ view: "done" })).map((t) => t.title)).toContain("Buy milk");
    await expect(updateTask(a.id, { title: "  " })).rejects.toThrow();
  });

  it("manages tags across entities", async () => {
    await renameTag("work", "job");
    const tags = await listTags();
    expect(tags.find((t) => t.name === "job")?.count).toBe(1);
    await deleteTag("focus");
    expect((await listTasks({ tag: "focus" })).length).toBe(0);
  });

  it("runs a focus session with pause, distraction and completion", async () => {
    const task = await createTask({ title: "Deep work task" });
    await startTimer({ taskId: task.id });
    expect(await getRunningTimer()).not.toBeNull();
    const s = await startSession({ taskId: task.id, preset: "pomodoro" });
    expect(await getRunningTimer()).toBeNull(); // timer stopped by the session
    await pauseSession(s.id);
    await resumeSession(s.id);
    await capture("Reply to Anna", s.id);
    const running = await getRunningSession();
    expect(running).toMatchObject({ id: s.id, taskTitle: "Deep work task", distractions: 1, plannedMin: 25 });
    const done = await completeSession(s.id, { quality: 4, keepOvertime: true });
    expect(done.endedAt).not.toBeNull();
    expect(await getRunningSession()).toBeNull();
    await stopTimer();
  });

  it("captures and triages a brain dump", async () => {
    const items = await capture("- call dentist\n\n* plan trip\n");
    expect(items.map((i) => i.text)).toEqual(["call dentist", "plan trip"]);
    await markTriaged(items[0].id, "deleted", null);
    const inbox = await listInbox();
    expect(inbox.map((i) => i.text)).toContain("plan trip");
    expect(inbox.map((i) => i.text)).not.toContain("call dentist");
  });

  it("keeps one daily note per date", async () => {
    const n1 = await getOrCreateDailyNote(today);
    const n2 = await getOrCreateDailyNote(today);
    expect(n1.id).toBe(n2.id);
    await updateNote(n1.id, { contentMd: "Grateful for coffee", tags: ["journal"] });
    expect((await listNotes("coffee")).length).toBe(1);
  });

  it("tracks habits with auto-fill from focus minutes", async () => {
    const h = await createHabit({ title: "Meditate" });
    await logHabit(h.id, today, 1);
    await logHabit(h.id, addDaysISO(today, -1), 1);
    await logHabit(h.id, addDaysISO(today, -1), 1); // upsert
    const deep = await createHabit({ title: "Deep work", type: "duration", target: 1, autoSource: "focus_minutes" });
    const list = await listHabits();
    const meditate = list.find((x) => x.id === h.id)!;
    expect(meditate.doneToday).toBe(true);
    expect(meditate.values[today]).toBe(1);
    expect(list.find((x) => x.id === deep.id)).toBeDefined();
    await logHabit(h.id, today, 0);
    expect((await listHabits()).find((x) => x.id === h.id)!.doneToday).toBe(false);
  });

  it("computes goal progress from milestones and numeric values", async () => {
    const g = await createGoal({ title: "Read 24 books", type: "numeric", targetValue: 24 });
    await adjustGoalValue(g.id, 6);
    const m = await createGoal({ title: "Launch", type: "milestone" });
    const ms = await addMilestone(m.id, "Beta");
    await addMilestone(m.id, "Public");
    await toggleMilestone(ms.id, true);
    const goals = await listGoals();
    expect(goals.find((x) => x.id === g.id)!.progress).toBe(0.25);
    expect(goals.find((x) => x.id === m.id)!.progress).toBe(0.5);
  });

  it("stores calendar events and time blocks", async () => {
    const start = new Date();
    start.setHours(10, 0, 0, 0);
    const e = await createEvent({ title: "Planning", startAt: start, endAt: new Date(start.getTime() + 3_600_000), isTimeBlock: true });
    expect((await eventsForDay(today)).map((x) => x.title)).toContain("Planning");
    await updateEvent(e.id, { title: "Planning v2" });
    expect((await listEvents(start, new Date(start.getTime() + 60_000)))[0].title).toBe("Planning v2");
    await expect(createEvent({ title: "Bad", startAt: start, endAt: start })).rejects.toThrow();
  });

  it("logs mood and sleep and summarizes them", async () => {
    await createMoodEntry({ energy: 3, pleasantness: 4, emotion: "Focused" });
    const moods = await moodBetween(today, today);
    expect(moods[0]).toMatchObject({ quadrant: "yellow", emotion: "Focused" });
    await expect(createMoodEntry({ energy: 0, pleasantness: 2, emotion: "x" })).rejects.toThrow();

    await saveSleep({ date: today, bedTime: "23:30", wakeTime: "07:00", latencyMin: 15, quality: 4 });
    await saveSleep({ date: addDaysISO(today, -1), bedTime: "00:30", wakeTime: "06:30" });
    await saveSleep({ date: today, bedTime: "23:00", wakeTime: "07:00", latencyMin: 10 }); // upsert
    const summary = await sleepSummary(480);
    expect(summary.lastNight?.asleepMin).toBe(470);
    expect(summary.loggedToday).toBe(true);
    expect(summary.debt14).toBe(130);
    expect(summary.regularity).not.toBeNull();
  });

  it("assembles the day context", async () => {
    const ctx = await getDayContext(today);
    expect(ctx.mits.length).toBe(3);
    expect(ctx.energy.curve.length).toBeGreaterThan(10);
    expect(ctx.focusMin).toBeGreaterThanOrEqual(0);
    expect(ctx.habits.length).toBeGreaterThan(0);
    expect(ctx.sleep.lastNight).not.toBeNull();
    expect((await entriesBetween(today, today)).length).toBeGreaterThanOrEqual(0);
  });
});
