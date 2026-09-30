import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Lexend } from "next/font/google";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { headers } from "next/headers";
import { connection } from "next/server";
import { GoogleAutoSync } from "@/components/calendar/GoogleAutoSync";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { DatabaseError } from "@/components/shell/DatabaseError";
import { MotionRoot } from "@/components/sensory/MotionRoot";
import { KeyboardShortcuts } from "@/components/shell/KeyboardShortcuts";
import { Sidebar } from "@/components/shell/Sidebar";
import { themeInitScript } from "@/lib/theme-init";
import { sensoryInitScript } from "@/lib/sensory-init";
import { TimezoneCheck } from "@/components/shell/TimezoneCheck";
import { TopBar } from "@/components/shell/TopBar";
import { TaskEditorProvider } from "@/components/tasks/TaskEditor";
import { Toaster } from "@/components/ui/toast";
import { getConnection } from "@/lib/db";
import { getRunningSession, getRunningTimer } from "@/lib/services/focus";
import { goalOptions } from "@/lib/services/goals";
import { isGoogleConnected } from "@/lib/services/google";
import { listReminders } from "@/lib/services/reminders";
import { listTags } from "@/lib/services/tags";
import { ReminderNotifier } from "@/components/reminders/ReminderNotifier";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });
const lexend = Lexend({ variable: "--font-readable", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Productivity OS",
  description: "Personal dashboard for focus, time, habits, goals, mood and sleep.",
};

/** Data the app shell needs; a database failure is returned, not thrown, so it can be shown. */
async function loadShell() {
  // Next renders the layout once at build time for its built-in error pages; never open the database then
  // (parallel build workers must not share the embedded database).
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return { ok: true as const, goals: [], tags: [], session: null, timer: null, google: false, reminders: [] };
  try {
    await getConnection();
    const [goals, tags, session, timer, google, reminders] = await Promise.all([
      goalOptions(),
      listTags(),
      getRunningSession(),
      getRunningTimer(),
      isGoogleConnected(),
      listReminders(),
    ]);
    return { ok: true as const, goals, tags: tags.map((t) => t.name), session, timer, google, reminders };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Everything here is live personal data — render per request, never at build time.
  await connection();

  const path = (await headers()).get("x-pos-path");
  if (path === "/login") {
    return (
      <html lang="en" className={`${inter.variable} ${jetbrains.variable} ${lexend.variable}`} suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript + sensoryInitScript }} />
        </head>
        <body>{children}</body>
      </html>
    );
  }
  const shell = await loadShell();
  const body =
    !shell.ok ? (
      <DatabaseError message={shell.error} usingSupabase={Boolean(process.env.DATABASE_URL?.trim())} />
    ) : (
      <TaskEditorProvider goals={shell.goals} tags={shell.tags}>
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar session={shell.session} timer={shell.timer} />
          <TimezoneCheck serverTz={Intl.DateTimeFormat().resolvedOptions().timeZone} />
          <main className="flex-1 px-8 py-6">{children}</main>
        </div>
        <CommandPalette />
        <KeyboardShortcuts />
        <Toaster />
        {shell.google && <GoogleAutoSync />}
        <ReminderNotifier reminders={shell.reminders} />
      </TaskEditorProvider>
    );

  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} ${lexend.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint (Next.js "preventing flash before hydration" pattern). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript + sensoryInitScript }} />
      </head>
      <body className="flex min-w-[1280px]">
        <MotionRoot>{body}</MotionRoot>
      </body>
    </html>
  );
}
