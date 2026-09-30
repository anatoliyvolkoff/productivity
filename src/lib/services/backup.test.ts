import { describe, expect, it } from "vitest";
import { exportAll, importAll, tableCounts } from "./backup";
import { createHabit, logHabit } from "./habits";
import { saveSleep } from "./sleep";
import { createTask } from "./tasks";

describe("backup", () => {
  it("round-trips all data through JSON", async () => {
    const task = await createTask({ title: "Backup me", tags: ["x"] });
    const habit = await createHabit({ title: "Walk" });
    await logHabit(habit.id, "2026-09-01", 1);
    await saveSleep({ date: "2026-09-01", bedTime: "23:00", wakeTime: "07:00" });
    const before = await tableCounts();
    const json = JSON.parse(JSON.stringify(await exportAll()));
    await createTask({ title: "Will be replaced" });
    await importAll(json);
    expect(await tableCounts()).toEqual(before);
    const again = await exportAll();
    expect((again.data.tasks as Array<{ id: string; createdAt: Date }>).find((t) => t.id === task.id)?.createdAt).toBeInstanceOf(Date);
    await expect(importAll({ app: "other" } as never)).rejects.toThrow();
  });
});
