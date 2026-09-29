import { describe, expect, it } from "vitest";
import { addDaysISO } from "./dates";
import { adherence, formationProgress, isScheduledOn, scheduleLabel, strength, streaks, type HabitLike } from "./habits";

const today = "2026-09-29"; // Tuesday
const daily: HabitLike = { type: "boolean", target: 1, schedule: { kind: "daily" }, startDate: "2026-09-01" };

/** Values for the given day offsets relative to today (0 = today, -1 = yesterday). */
const done = (...offsets: number[]) => new Map(offsets.map((o) => [addDaysISO(today, o), 1]));

describe("habit streaks (never miss twice)", () => {
  it("counts consecutive days and ignores a pending today", () => {
    const s = streaks(daily, done(-1, -2, -3), today);
    expect(s).toMatchObject({ current: 3, doneNow: false, missedLast: false, unit: "day" });
  });

  it("includes today once done", () => {
    expect(streaks(daily, done(0, -1, -2), today)).toMatchObject({ current: 3, doneNow: true });
  });

  it("survives a single miss and warns about it", () => {
    const s = streaks(daily, done(-2, -3, -4), today);
    expect(s.current).toBe(3);
    expect(s.missedLast).toBe(true);
  });

  it("breaks after two misses in a row", () => {
    const s = streaks(daily, done(-3, -4, -5), today);
    expect(s.current).toBe(0);
    expect(s.best).toBe(3);
  });

  it("keeps alternating done/miss alive", () => {
    expect(streaks(daily, done(-1, -3, -5), today).current).toBe(3);
  });

  it("only counts scheduled weekdays", () => {
    const weekdays: HabitLike = { ...daily, schedule: { kind: "weekdays", days: [1, 3, 5] } };
    // Mon 28, Fri 25, Wed 23 done; today (Tue) is not scheduled.
    const s = streaks(weekdays, done(-1, -4, -6), today);
    expect(s.current).toBe(3);
    expect(s.missedLast).toBe(false);
  });

  it("counts per-week habits in weeks", () => {
    const perWeek: HabitLike = { ...daily, schedule: { kind: "per_week", times: 2 } };
    // week of Sep 21: two days; week of Sep 14: two days; current week pending.
    const values = new Map([
      ["2026-09-22", 1], ["2026-09-24", 1], ["2026-09-15", 1], ["2026-09-18", 1],
    ]);
    expect(streaks(perWeek, values, today)).toMatchObject({ current: 2, unit: "week", doneNow: false });
  });

  it("uses the target for count habits", () => {
    const water: HabitLike = { ...daily, type: "count", target: 8 };
    const values = new Map([[addDaysISO(today, -1), 8], [addDaysISO(today, -2), 5]]);
    expect(streaks(water, values, today)).toMatchObject({ current: 1, missedLast: false });
  });
});

describe("habit metrics", () => {
  it("strength grows with consistency and dips after misses", () => {
    const all = done(...Array.from({ length: 28 }, (_, i) => -i));
    const high = strength(daily, all, today);
    const lower = strength(daily, done(...Array.from({ length: 20 }, (_, i) => -i - 8)), today);
    expect(high).toBeGreaterThan(lower);
    expect(high).toBeLessThanOrEqual(1);
  });

  it("adherence excludes a pending today", () => {
    const h: HabitLike = { ...daily, startDate: addDaysISO(today, -3) };
    expect(adherence(h, done(-1, -2), today)).toBeCloseTo(2 / 3);
    expect(adherence(h, done(0, -1, -2), today)).toBeCloseTo(3 / 4);
  });

  it("formation progress uses the 66-day median", () => {
    expect(formationProgress(daily, done(-1, -2, -3), today)).toBeCloseTo(3 / 66);
  });

  it("schedules and labels", () => {
    expect(isScheduledOn({ kind: "weekdays", days: [2] }, today)).toBe(true);
    expect(isScheduledOn({ kind: "weekdays", days: [1] }, today)).toBe(false);
    expect(scheduleLabel({ kind: "weekdays", days: [5, 1, 2, 3, 4] })).toBe("Weekdays");
    expect(scheduleLabel({ kind: "weekdays", days: [0, 6] })).toBe("Weekends");
    expect(scheduleLabel({ kind: "weekdays", days: [0, 1] })).toBe("Mon, Sun");
    expect(scheduleLabel({ kind: "per_week", times: 3 })).toBe("3× per week");
  });
});
