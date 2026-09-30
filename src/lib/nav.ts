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
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  { slug: "", href: "/", label: "Dashboard", icon: LayoutDashboard, shortcut: "G D", description: "Your day at a glance." },
  { slug: "today", href: "/today", label: "Today", icon: Sun, shortcut: "G T", description: "Top 3 MITs, timeline and daily note." },
  { slug: "tasks", href: "/tasks", label: "Tasks", icon: CheckSquare, description: "Active tasks, tags and priorities." },
  { slug: "braindump", href: "/braindump", label: "Brain dump", icon: Brain, shortcut: "B", description: "Capture everything, triage later." },
  { slug: "focus", href: "/focus", label: "Focus", icon: Timer, shortcut: "F", description: "Pomodoro, 52/17 and 90-minute ultradian sessions." },
  { slug: "clock", href: "/clock", label: "Clock", icon: Clock, description: "Big electronic clock and countdowns." },
  { slug: "calendar", href: "/calendar", label: "Calendar", icon: CalendarDays, shortcut: "G C", description: "Google Calendar sync and time-blocking." },
  { slug: "habits", href: "/habits", label: "Habits", icon: Repeat, shortcut: "G H", description: "Cues, streaks and never-miss-twice." },
  { slug: "goals", href: "/goals", label: "Goals", icon: Flag, description: "Vision → goals → milestones → tasks & habits." },
  { slug: "mood", href: "/mood", label: "Mood", icon: Smile, shortcut: "M", description: "Energy × pleasantness check-ins." },
  { slug: "sleep", href: "/sleep", label: "Sleep", icon: Moon, description: "Sleep log, debt and consistency." },
  { slug: "notes", href: "/notes", label: "Notes", icon: NotebookPen, description: "Markdown notes and daily notes." },
  { slug: "insights", href: "/insights", label: "Insights", icon: BarChart3, description: "Benchmarks, correlations and AI reviews." },
  { slug: "settings", href: "/settings", label: "Settings", icon: Settings, description: "Theme, connections and data." },
];
