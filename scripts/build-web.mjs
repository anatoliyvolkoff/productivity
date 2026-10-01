/**
 * Static browser build for GitHub Pages → ./out-web
 *
 * Copies the app to .web-build/, swaps the server-only parts for browser
 * versions (database, layout, server actions, API routes, login), and runs
 * `next build` with `output: "export"`. Pages are the same code: each one's
 * data loading runs in the browser against an in-browser Postgres (PGlite).
 *
 *   BASE_PATH=/productivity npm run build:web
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const work = path.join(root, ".web-build");
const out = path.join(root, "out-web");
const basePath = process.env.BASE_PATH ?? "/productivity";
const SKIP = new Set(["node_modules", ".next", ".git", ".data", ".web-build", "out-web", "out"]);

rmSync(work, { recursive: true, force: true });
mkdirSync(work);
for (const entry of readdirSync(root)) if (!SKIP.has(entry)) cpSync(path.join(root, entry), path.join(work, entry), { recursive: true });
symlinkSync(path.join(root, "node_modules"), path.join(work, "node_modules"), "dir");

const w = (p) => path.join(work, p);
const write = (p, s) => writeFileSync(w(p), s);
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(path.join(dir, f)).isDirectory() ? walk(path.join(dir, f)) : [path.join(dir, f)]));

// 1. Server-only code → browser equivalents.
execSync("node scripts/gen-web-migrations.mjs", { cwd: work, stdio: "inherit" });
write("src/lib/db/index.ts", 'export * from "./browser";\n');
for (const p of ["src/app/api", "src/app/login", "src/proxy.ts", "src/instrumentation.ts"]) rmSync(w(p), { recursive: true, force: true });
write("src/app/actions/auth.ts", "export async function login(): Promise<string | null> {\n  return null;\n}\n\nexport async function logout() {}\n");

for (const file of walk(w("src"))) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  let s = readFileSync(file, "utf8");
  const before = s;
  s = s.replace(/^import "server-only";\n/m, "");
  if (file.includes(`${path.sep}app${path.sep}actions${path.sep}`)) {
    s = s.replace(/^"use server";\n/m, "").replace('import { refresh } from "next/cache";', 'import { refresh } from "@/web/refresh";');
  }
  if (s !== before) writeFileSync(file, s);
}

// 2. Every page runs its loader in the browser.
for (const file of walk(w("src/app"))) {
  if (path.basename(file) !== "page.tsx") continue;
  const dir = path.dirname(file);
  writeFileSync(path.join(dir, "page.server.tsx"), readFileSync(file, "utf8"));
  writeFileSync(
    file,
    `"use client";\n\nimport { Suspense } from "react";\nimport { ServerPage } from "@/web/ServerPage";\nimport Page from "./page.server";\n\nexport default function WebPage() {\n  return (\n    <Suspense>\n      <ServerPage page={Page as never} />\n    </Suspense>\n  );\n}\n`,
  );
}

// 3. Layout with the browser shell.
write(
  "src/app/layout.tsx",
  `import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Lexend } from "next/font/google";
import { themeInitScript } from "@/lib/theme-init";
import { sensoryInitScript } from "@/lib/sensory-init";
import { WebShell } from "@/web/WebShell";
import { MotionRoot } from "@/components/sensory/MotionRoot";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });
const lexend = Lexend({ variable: "--font-readable", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Productivity OS",
  description: "Personal dashboard for focus, time, habits, goals, mood and sleep — your data stays in your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={\`\${inter.variable} \${jetbrains.variable} \${lexend.variable}\`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript + sensoryInitScript }} />
      </head>
      <body className="flex min-w-[1280px]">
        <MotionRoot>
          <WebShell>{children}</WebShell>
        </MotionRoot>
      </body>
    </html>
  );
}
`,
);

// 4. Static export config.
write(
  "next.config.ts",
  `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: ${JSON.stringify(basePath)},
  trailingSlash: true,
  images: { unoptimized: true },
  // Types are checked in the regular build; this copy only swaps implementations.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
`,
);

// 5. Build.
execSync("npx next build", {
  cwd: work,
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_WEB: "1", NEXT_PUBLIC_BASE_PATH: basePath, NEXT_TELEMETRY_DISABLED: "1" },
});

rmSync(out, { recursive: true, force: true });
cpSync(path.join(work, "out"), out, { recursive: true });
writeFileSync(path.join(out, ".nojekyll"), ""); // serve the _next/ folder
// This output is pushed to the gh-pages branch; a Vercel project linked to the repo shouldn't try to build it.
writeFileSync(path.join(out, "vercel.json"), JSON.stringify({ git: { deploymentEnabled: false } }, null, 2) + "\n");

// PGlite is loaded at runtime from these files (bundling it breaks its WASM loader).
const pgliteDist = path.join(root, "node_modules/@electric-sql/pglite/dist");
mkdirSync(path.join(out, "pglite"), { recursive: true });
for (const file of readdirSync(pgliteDist)) {
  if (/\.(js|wasm|data)$/.test(file)) cpSync(path.join(pgliteDist, file), path.join(out, "pglite", file));
}
if (!existsSync(path.join(out, "404.html"))) mkdirSync(out, { recursive: true });
console.log(`\nStatic site ready in out-web/ (base path ${basePath || "/"}).`);
