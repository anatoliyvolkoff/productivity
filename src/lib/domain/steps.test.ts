import { describe, expect, it } from "vitest";
import { buildStepTree, currentStep, parentsToComplete, stepProgress } from "./steps";

const s = (id: string, parentStepId: string | null, sortOrder: number, done = false) => ({ id, parentStepId, title: id, sortOrder, doneAt: done ? new Date() : null });

describe("task steps", () => {
  const steps = [s("a", null, 0, true), s("b", null, 1), s("b1", "b", 0, true), s("b2", "b", 1), s("c", null, 2)];

  it("picks the first unfinished leaf as the current step", () => {
    expect(currentStep(buildStepTree(steps))?.id).toBe("b2");
    expect(currentStep(buildStepTree([s("x", null, 0, true)]))).toBeNull();
  });

  it("counts progress over leaves", () => {
    expect(stepProgress(buildStepTree(steps))).toEqual({ done: 2, total: 4 });
  });

  it("completes parents once all their children are done", () => {
    expect(parentsToComplete(steps, "b2")).toEqual(["b"]);
    expect(parentsToComplete(steps, "c")).toEqual([]);
    const deep = [s("p", null, 0), s("q", "p", 0), s("r", "q", 0)];
    expect(parentsToComplete(deep, "r")).toEqual(["q", "p"]);
  });
});
