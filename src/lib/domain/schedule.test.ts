import { describe, expect, it } from "vitest";
import { layoutColumns, suggestSlot } from "./schedule";

const t = (h: number, m = 0) => new Date(2026, 8, 29, h, m).getTime();

describe("suggestSlot", () => {
  it("finds the first free slot after now", () => {
    const busy = [{ start: t(9), end: t(10) }, { start: t(10, 30), end: t(11) }];
    const slot = suggestSlot(busy, 60, new Date(t(8, 50)))!;
    expect(new Date(slot.start).getHours()).toBe(11);
  });

  it("uses the preferred window when it's free", () => {
    const slot = suggestSlot([], 90, new Date(t(8)), { preferred: { start: t(10), end: t(11, 30) } })!;
    expect(slot).toEqual({ start: t(10), end: t(11, 30) });
  });

  it("moves to the next day when today is full", () => {
    const slot = suggestSlot([{ start: t(9), end: t(21) }], 60, new Date(t(8)))!;
    expect(new Date(slot.start).getDate()).toBe(30);
    expect(new Date(slot.start).getHours()).toBe(9);
  });
});

describe("layoutColumns", () => {
  it("puts overlapping events side by side", () => {
    const layout = layoutColumns([
      { start: t(9), end: t(10) },
      { start: t(9, 30), end: t(10, 30) },
      { start: t(11), end: t(12) },
    ]);
    expect(layout[0]).toEqual({ column: 0, columns: 2 });
    expect(layout[1]).toEqual({ column: 1, columns: 2 });
    expect(layout[2]).toEqual({ column: 0, columns: 1 });
  });

  it("reuses freed columns within a cluster", () => {
    const layout = layoutColumns([
      { start: t(9), end: t(12) },
      { start: t(9), end: t(10) },
      { start: t(10), end: t(11) },
    ]);
    expect(layout.map((l) => l.columns)).toEqual([2, 2, 2]);
    expect(layout[2].column).toBe(1);
  });
});
