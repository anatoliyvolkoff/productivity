import { describe, expect, it } from "vitest";
import { rankWhatNow, type Candidate } from "./whatNow";

const today = "2026-09-30";
const now = new Date("2026-09-30T10:00:00");
const task = (id: string, patch: Partial<Candidate> = {}): Candidate => ({
  id,
  title: id,
  status: "next",
  priority: 3,
  dueDate: null,
  energy: null,
  goalId: null,
  effortMin: null,
  mitOn: null,
  notNowAt: null,
  ...patch,
});

describe("What now? picker", () => {
  it("prefers a low-energy task when energy is low", () => {
    const list = [task("deep", { energy: "high", priority: 2 }), task("admin", { energy: "low", effortMin: 10 })];
    expect(rankWhatNow(list, "low", 30, today, now)[0].id).toBe("admin");
    expect(rankWhatNow(list, "high", 60, today, now)[0].id).toBe("deep");
  });

  it("prefers what fits in the time available", () => {
    const list = [task("long", { effortMin: 120, priority: 2 }), task("short", { effortMin: 10 })];
    expect(rankWhatNow(list, "okay", 15, today, now)[0].id).toBe("short");
  });

  it("puts today's top tasks first, and lets 'Not now' tasks rest", () => {
    const list = [task("a"), task("mit", { mitOn: today }), task("rest", { mitOn: today, notNowAt: new Date("2026-09-30T09:30:00") })];
    const ranked = rankWhatNow(list, "okay", 30, today, now).map((t) => t.id);
    expect(ranked[0]).toBe("mit");
    expect(ranked.at(-1)).toBe("rest");
  });

  it("ignores done, dropped and waiting tasks", () => {
    expect(rankWhatNow([task("d", { status: "done" }), task("w", { status: "waiting" })], "okay", 30, today, now)).toEqual([]);
  });
});
