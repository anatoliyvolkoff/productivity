export type CalEvent = {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  source: "local" | "google";
  isTimeBlock: boolean;
  isPrivate: boolean;
  taskId: string | null;
  taskTitle: string | null;
  color: string | null;
  calendarName: string | null;
  htmlLink: string | null;
  description: string | null;
  location: string | null;
  writable: boolean;
  onGoogle: boolean;
};

export type DialogState =
  | { mode: "create"; start: Date; end: Date; allDay?: boolean; taskId?: string; title?: string; timeBlock?: boolean }
  | { mode: "edit"; event: CalEvent };

export const eventColor = (e: Pick<CalEvent, "color" | "isTimeBlock">) => e.color ?? (e.isTimeBlock ? "var(--series-2)" : "var(--series-1)");
