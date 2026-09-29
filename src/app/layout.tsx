import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { Sidebar } from "@/components/shell/Sidebar";
import { themeInitScript } from "@/components/shell/ThemeToggle";
import { TopBar } from "@/components/shell/TopBar";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Productivity OS",
  description: "Personal dashboard for focus, time, habits, goals, mood and sleep.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-w-[1280px]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-8 py-6">{children}</main>
        </div>
        <CommandPalette />
      </body>
    </html>
  );
}
