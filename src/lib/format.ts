import { formatMinutes } from "@/lib/domain/dates";

/** Units charts can format by name (functions can't cross the server→client boundary). */
export type ValueUnit = "minutes" | "count" | "percent" | "score" | "rating" | "signed";

export function formatValue(v: number, unit: ValueUnit): string {
  switch (unit) {
    case "minutes":
      return formatMinutes(v);
    case "percent":
      return `${Math.round(v)}%`;
    case "rating":
      return `${v.toFixed(1)}/5`;
    case "signed":
      return `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
    case "score":
      return v.toFixed(1);
    default:
      return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }
}
