import type { Metadata } from "next";
import { BigClock } from "./BigClock";

export const metadata: Metadata = { title: "Clock · Productivity OS" };

export default function ClockPage() {
  return <BigClock />;
}
