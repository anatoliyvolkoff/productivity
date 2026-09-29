import {
  BarChart3,
  Brain,
  CalendarDays,
  CheckSquare,
  Clock,
  Flag,
  LayoutDashboard,
  type LucideIcon,
  Moon,
  NotebookPen,
  Repeat,
  Settings,
  Smile,
  Sun,
  Timer,
} from "lucide-react";

export type NavItem = {
  slug: string;
  href: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  /** Roadmap phase that delivers this section (docs/PLAN.md §9). */
  phase: number;
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  { slug: "", href: "/", label: "Dashboard", icon: LayoutDashboard, shortcut: "G D", phase: 0, description: "Your day at a glance." },
  { slug: "today", href: "/today", label: "Today", icon: Sun, shortcut: "G T", phase: 1, description: "Top 3 MITs, timeline and daily note." },
  { slug: "tasks", href: "/tasks", label: "Tasks", icon: CheckSquare, phase: 1, description: "Active tasks, tags and priorities." },
  { slug: "braindump", href: "/braindump", label: "Brain dump", icon: Brain, shortcut: "B", phase: 1, description: "Capture everything, triage later." },
  { slug: "focus", href: "/focus", label: "Focus", icon: Timer, shortcut: "F", phase: 1, description: "Pomodoro, 52/17 and 90-minute ultradian sessions." },
  { slug: "clock", href: "/clock", label: "Clock", icon: Clock, phase: 0, description: "Big electronic clock and countdowns." },
  { slug: "calendar", href: "/calendar", label: "Calendar", icon: CalendarDays, shortcut: "G C", phase: 2, description: "Google Calendar sync and time-blocking." },
  { slug: "habits", href: "/habits", label: "Habits", icon: Repeat, shortcut: "G H", phase: 3, description: "Cues, streaks and never-miss-twice." },
  { slug: "goals", href: "/goals", label: "Goals", icon: Flag, phase: 3, description: "Vision → goals → milestones → tasks & habits." },
  { slug: "mood", href: "/mood", label: "Mood", icon: Smile, shortcut: "M", phase: 4, description: "Energy × pleasantness check-ins." },
  { slug: "sleep", href: "/sleep", label: "Sleep", icon: Moon, phase: 4, description: "Sleep log, debt and consistency." },
  { slug: "notes", href: "/notes", label: "Notes", icon: NotebookPen, phase: 1, description: "Markdown notes with backlinks." },
  { slug: "insights", href: "/insights", label: "Insights", icon: BarChart3, phase: 5, description: "Benchmarks, correlations and AI reviews." },
  { slug: "settings", href: "/settings", label: "Settings", icon: Settings, phase: 0, description: "Theme, connections and data." },
];

const BUILT = new Set(["", "clock", "tasks", "braindump", "focus", "notes"]);
export const PLACEHOLDER_SECTIONS = NAV_ITEMS.filter((i) => !BUILT.has(i.slug));
