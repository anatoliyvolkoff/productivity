import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./quickAdd";

// 2026-09-29 is a Tuesday.
const today = "2026-09-29";

describe("parseQuickAdd", () => {
  it("parses the full example", () => {
    expect(parseQuickAdd("Gym tomorrow 7am #health !2 ~45m @high", today)).toEqual({
      title: "Gym",
      tags: ["health"],
      priority: 2,
      dueDate: "2026-09-30",
      time: "07:00",
      effortMin: 45,
      energy: "high",
    });
  });

  it("keeps plain titles untouched", () => {
    expect(parseQuickAdd("Write the quarterly report", today)).toEqual({ title: "Write the quarterly report", tags: [] });
  });

  it("handles weekdays, including today and 'next'", () => {
    expect(parseQuickAdd("Call mom friday", today).dueDate).toBe("2026-10-02");
    expect(parseQuickAdd("Standup tuesday", today).dueDate).toBe("2026-09-29");
    expect(parseQuickAdd("Standup next tue", today).dueDate).toBe("2026-10-06");
    expect(parseQuickAdd("Plan on mon", today)).toMatchObject({ title: "Plan", dueDate: "2026-10-05" });
  });

  it("parses relative and absolute dates", () => {
    expect(parseQuickAdd("Renew passport in 3 days", today).dueDate).toBe("2026-10-02");
    expect(parseQuickAdd("Review in 2 weeks", today).dueDate).toBe("2026-10-13");
    expect(parseQuickAdd("Taxes by 2026-11-15", today)).toMatchObject({ title: "Taxes", dueDate: "2026-11-15" });
    expect(parseQuickAdd("Trip oct 12", today).dueDate).toBe("2026-10-12");
    expect(parseQuickAdd("Birthday 3 jan", today).dueDate).toBe("2027-01-03");
    expect(parseQuickAdd("Sprint review next week", today).dueDate).toBe("2026-10-05");
  });

  it("parses 24h and 12h times; a time alone means today", () => {
    expect(parseQuickAdd("Dentist at 14:30", today)).toMatchObject({ title: "Dentist", time: "14:30", dueDate: today });
    expect(parseQuickAdd("Lunch 12pm", today).time).toBe("12:00");
    expect(parseQuickAdd("Night shift 12am", today).time).toBe("00:00");
  });

  it("parses multiple tags, effort in hours and p-priority", () => {
    expect(parseQuickAdd("Deep work #work/clientA #Focus ~1h30m p1", today)).toMatchObject({
      title: "Deep work",
      tags: ["work/clienta", "focus"],
      effortMin: 90,
      priority: 1,
    });
    expect(parseQuickAdd("Read ~1.5h", today).effortMin).toBe(90);
  });

  it("does not treat words that contain weekday names as dates", () => {
    expect(parseQuickAdd("Plan wedding", today)).toEqual({ title: "Plan wedding", tags: [] });
  });
});
