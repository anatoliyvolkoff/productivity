"use server";

import { refresh } from "next/cache";
import { attempt } from "@/lib/actions";
import { generateEveningSummary, generateMorningBrief, generateWeeklyReview, suggestTriageForInbox } from "@/lib/services/ai";

export async function generateBrief(kind: "morning" | "evening" | "weekly") {
  const result = await attempt(async () => {
    const summary =
      kind === "morning" ? await generateMorningBrief() : kind === "evening" ? await generateEveningSummary() : await generateWeeklyReview();
    return summary.id;
  });
  refresh();
  return result;
}

export async function suggestTriage() {
  const result = await attempt(() => suggestTriageForInbox());
  refresh();
  return result;
}
