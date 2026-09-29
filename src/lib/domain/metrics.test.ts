import { describe, expect, it } from "vitest";
import { addDaysISO, atTime, parseHHMM } from "./dates";
import { bestFocusWindow, energyAt, energyCurve } from "./energy";
import { elapsedSec, remainingSec } from "./focus";
import { expectedProgress, goalHealth, goalProgress } from "./goals";
import { emotionsNear, quadrantOf } from "./mood";
import { eisenhower, priorityScore } from "./priority";
import { asleepMinutes, estimateChronotype, midSleepMinutes, sleepDebt, sleepRegularityIndex, socialJetLag } from "./sleep";
import { correlationStrength, spearman } from "./stats";

const today = "2026-09-29";

describe("priority", () => {
  const base = { priority: 3, dueDate: null, energy: null, goalId: null } as const;
  it("ranks overdue P1 above an undated P3", () => {
    expect(priorityScore({ ...base, priority: 1, dueDate: "2026-09-27" }, today)).toBeGreaterThan(priorityScore(base, today));
  });
  it("inherits a goal's higher priority", () => {
    expect(priorityScore({ ...base, goalId: "g", goalPriority: 1 }, today)).toBeGreaterThan(priorityScore(base, today));
  });
  it("matches high-energy tasks to high energy", () => {
    const t = { ...base, energy: "high" as const };
    expect(priorityScore(t, today, 0.9)).toBeGreaterThan(priorityScore(t, today, 0.2));
  });
  it("derives Eisenhower quadrants", () => {
    expect(eisenhower({ ...base, priority: 1, dueDate: today }, today)).toBe("do");
    expect(eisenhower({ ...base, priority: 2 }, today)).toBe("schedule");
    expect(eisenhower({ ...base, dueDate: "2026-09-30" }, today)).toBe("delegate");
    expect(eisenhower(base, today)).toBe("drop");
  });
});

describe("goals", () => {
  const g = { type: "milestone" as const, status: "active" as const, targetValue: null, currentValue: 0, milestones: { total: 4, done: 1 }, tasks: { total: 0, done: 0 }, habitAdherence: null };
  it("computes progress per type", () => {
    expect(goalProgress(g)).toBe(0.25);
    expect(goalProgress({ ...g, milestones: { total: 0, done: 0 }, tasks: { total: 5, done: 2 } })).toBe(0.4);
    expect(goalProgress({ ...g, type: "numeric", targetValue: 24, currentValue: 6 })).toBe(0.25);
    expect(goalProgress({ ...g, type: "habit", habitAdherence: 0.8 })).toBe(0.8);
    expect(goalProgress({ ...g, status: "done" })).toBe(1);
  });
  it("compares progress with the expected pace", () => {
    const expected = expectedProgress("2026-09-01", "2026-10-31", today)!;
    expect(expected).toBeCloseTo(28 / 60);
    expect(goalHealth(0.5, expected, "active")).toBe("on_track");
    expect(goalHealth(0.35, expected, "active")).toBe("at_risk");
    expect(goalHealth(0.1, expected, "active")).toBe("off_track");
    expect(goalHealth(0.1, null, "active")).toBe("no_deadline");
  });
});

describe("sleep", () => {
  /** A night that ends on `date`; bedtimes after midnight stay on the wake date. */
  const night = (date: string, bed: string, wake: string) => {
    const bedISO = parseHHMM(bed) > parseHHMM(wake) ? addDaysISO(date, -1) : date;
    return { date, bedAt: atTime(bedISO, bed), wakeAt: atTime(date, wake), latencyMin: 0 };
  };

  it("computes duration and mid-sleep", () => {
    const s = night(today, "23:00", "07:00");
    expect(asleepMinutes(s)).toBe(480);
    expect(midSleepMinutes(s)).toBe(180);
    expect(asleepMinutes({ ...s, latencyMin: 20 })).toBe(460);
  });

  it("accumulates sleep debt and ignores surplus beyond zero", () => {
    expect(sleepDebt([night("2026-09-28", "00:00", "06:00"), night(today, "23:00", "07:00")], 480)).toBe(120);
    expect(sleepDebt([night(today, "22:00", "08:00")], 480)).toBe(0);
  });

  it("scores identical schedules as perfectly regular", () => {
    const week = ["2026-09-23", "2026-09-24", "2026-09-25"].map((d) => night(d, "23:00", "07:00"));
    expect(sleepRegularityIndex(week)).toBe(100);
    const shifted = [night("2026-09-23", "23:00", "07:00"), night("2026-09-24", "03:00", "11:00")];
    expect(sleepRegularityIndex(shifted)!).toBeLessThan(100);
    expect(sleepRegularityIndex([night(today, "23:00", "07:00")])).toBeNull();
  });

  it("detects social jet lag and chronotype", () => {
    const entries = [
      night("2026-09-25", "23:00", "07:00"), // Fri
      night("2026-09-26", "01:00", "10:00"), // Sat
      night("2026-09-27", "01:00", "10:00"), // Sun
      night("2026-09-28", "23:00", "07:00"), // Mon
    ];
    expect(socialJetLag(entries)).toBe(150);
    expect(estimateChronotype(entries)).toBe("owl");
  });
});

describe("energy curve", () => {
  const curve = energyCurve({ wakeMinute: 420, bedMinute: 1380 });
  it("peaks in the late morning and dips after lunch", () => {
    const morning = energyAt(curve, 420 + 180)!;
    const dip = energyAt(curve, 420 + 440)!;
    const wake = energyAt(curve, 420)!;
    expect(morning).toBeGreaterThan(dip);
    expect(morning).toBeGreaterThan(wake);
    expect(energyAt(curve, 100)).toBeNull();
  });
  it("sleep debt lowers the curve", () => {
    const tired = energyCurve({ wakeMinute: 420, bedMinute: 1380, sleepDebtMin: 600 });
    expect(energyAt(tired, 600)!).toBeLessThan(energyAt(curve, 600)!);
  });
  it("finds the best free window around meetings", () => {
    const free = bestFocusWindow(curve, [], 90)!;
    expect(free.start).toBeGreaterThanOrEqual(480);
    expect(free.start).toBeLessThanOrEqual(720);
    const busy = bestFocusWindow(curve, [[free.start, free.end]], 90)!;
    expect(busy.end <= free.start || busy.start >= free.end).toBe(true);
  });
});

describe("stats", () => {
  it("computes Spearman correlation", () => {
    expect(spearman([1, 2, 3, 4, 5], [2, 4, 6, 8, 100])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1);
    expect(spearman([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(correlationStrength(0.42)).toBe("moderate");
  });
});

describe("focus clock", () => {
  it("excludes paused time", () => {
    const startedAt = new Date("2026-09-29T09:00:00Z");
    const now = new Date("2026-09-29T09:20:00Z");
    const s = { startedAt, plannedMin: 25, pausedAt: null, pausedSec: 300 };
    expect(elapsedSec(s, now)).toBe(900);
    expect(remainingSec(s, now)).toBe(600);
    expect(elapsedSec({ ...s, pausedAt: new Date("2026-09-29T09:10:00Z") }, now)).toBe(300);
  });
});

describe("mood", () => {
  it("maps points to quadrants and nearest words", () => {
    expect(quadrantOf(4, -4)).toBe("red");
    expect(quadrantOf(-2, 3)).toBe("green");
    expect(emotionsNear(5, 5)[0].word).toMatch(/Ecstatic|Thrilled/);
    expect(emotionsNear(-1, -1)[0].word).toBe("Meh");
  });
});
