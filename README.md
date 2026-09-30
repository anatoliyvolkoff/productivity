# Productivity OS

A personal desktop dashboard that joins tasks, focus, time, calendar, habits, goals, mood, sleep and weather — with a daily brief that tells you what matters today and what doesn't.

Built with Next.js 16, React 19, Tailwind CSS v4, Drizzle ORM and Postgres (Supabase or an embedded local database). Design: Google Material 3 structure with Apple-style surfaces; monochrome with blue and orange accents; light and dark.

- **Plan & design notes:** [`docs/PLAN.md`](docs/PLAN.md)

## Run it on your computer

You need [Node.js](https://nodejs.org) 20.9 or newer.

```bash
git clone https://github.com/anatoliyvolkoff/productivity.git
cd productivity
npm run setup          # install + production build (once, and after each update)
npm start              # → http://localhost:3000
```

That's it — with no configuration (and no password, since it only listens on your own computer) the app stores everything in an embedded Postgres database in `.data/pglite` inside the project folder. Stop it with `Ctrl+C`.

To try it with five weeks of sample data first (kept separate from your real data):

```bash
LOCAL_DB_DIR=.data/demo npm run db:seed-demo
LOCAL_DB_DIR=.data/demo npm start
```

### Keep it running in the background (optional)

```bash
npm install -g pm2
pm2 start npm --name productivity -- start
pm2 save && pm2 startup   # start automatically when the computer boots (follow the printed command)
```

The server listens on `127.0.0.1` only, because the app has no login — your data is only reachable from this computer. `npm run start:lan` listens on your network instead (anyone on it can then open the app).

## Online version (GitHub Pages)

**https://anatoliyvolkoff.github.io/productivity/**

A browser-only build of the same app. There's no server: the database (Postgres compiled to WebAssembly) lives in your browser's IndexedDB, so your data stays on that device and in that browser. Other devices and private windows start empty.

- **Back up** regularly with **Settings → Your data → Export JSON**. Clearing site data in the browser erases it. Move data between devices with **Import backup**.
- **AI brief:** paste your Anthropic API key in **Settings**. It's stored only in this browser and sent only to Anthropic.
- **Google Calendar** needs a server, so it's unavailable here. Use the local or Vercel version for calendar sync.

Every push to `main` (or the current development branch) rebuilds and publishes it with `.github/workflows/pages.yml`, which runs `npm run build:web` and pushes the result to the `gh-pages` branch. To build it yourself, run `npm run build:web`. The output lands in `out-web/`, and `BASE_PATH` sets the URL prefix (default `/productivity`).

If the address shows a 404 after the first deploy, go to **Settings → Pages** and set **Source: Deploy from a branch → `gh-pages` / root**.

## Put it online (Vercel + Supabase)

Open the app from any device — phone included — at your own private address. Both services have free tiers.

1. **Database:** create a [Supabase](https://supabase.com) project. In **Project Settings → Database → Connection string**, copy the **Transaction pooler** string (port 6543) and the **Session pooler** string (port 5432). Tables are created automatically on first start.
2. **Deploy:** sign in to [vercel.com](https://vercel.com) with GitHub → **Add New → Project** → import `anatoliyvolkoff/productivity` → leave the build settings as detected.
3. **Environment variables** (same screen, or later in **Settings → Environment Variables**):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Supabase transaction pooler string (6543) |
   | `DATABASE_URL_DIRECT` | Supabase session pooler string (5432) |
   | `APP_PASSWORD` | the password you'll type to open the app — **required online**, the app has no other login |
   | `APP_TIMEZONE` | your time zone, e.g. `Europe/Berlin` (servers run on UTC) |
   | `ANTHROPIC_API_KEY` | optional, for the AI brief |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional, for Google Calendar |

4. Click **Deploy**. You get an address like `https://productivity-xxxx.vercel.app`; open it and enter your password.
5. **Google Calendar online:** in your Google OAuth client add a second redirect URI: `https://<your-address>/api/google/callback`.
6. **Moving your local data:** on your computer, **Settings → Your data → Export JSON**; online, **Import backup**.

Every push to the branch redeploys automatically. If "today" looks wrong, the yellow banner at the top tells you which `APP_TIMEZONE` to set.

## Connect your services

Copy `.env.example` to `.env.local`, fill in what you use, and restart (`npm start`; after pulling code changes run `npm run setup` again).

### Supabase (your database in the cloud)

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string**:
   - **Transaction pooler** (port 6543) → `DATABASE_URL`
   - **Session pooler** (port 5432) → `DATABASE_URL_DIRECT`
3. Restart. Tables are created automatically on first start.

Moving from the local database to Supabase: **Settings → Your data → Export JSON**, set `DATABASE_URL`, restart, then **Import backup**.

### Google Calendar (two-way sync)

1. [console.cloud.google.com](https://console.cloud.google.com) → create a project → enable the **Google Calendar API**.
2. **OAuth consent screen**: External; add your Google account as a test user.
3. **Credentials → Create OAuth client ID → Web application**, redirect URI `http://localhost:3000/api/google/callback`.
4. Put the client ID and secret in `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, restart, then **Settings → Connect Google Calendar**.

Your calendars sync every two minutes while the app is open (and when you switch back to it). Time blocks you create are written to Google unless you mark them "Keep off Google Calendar".

### AI brief (Claude)

Put an Anthropic API key in `ANTHROPIC_API_KEY`. This turns on the AI-written morning brief, evening summary, weekly review and brain-dump sorting. The AI only runs when you press an AI button. Without a key, the dashboard shows a rule-based daily brief. Default model: `claude-opus-5-5` (change with `AI_MODEL`).

### Weather

Pick your city in **Settings → Location**. Weather comes from [Open-Meteo](https://open-meteo.com) (free, no key).

## Features

Built to be calm and shame-free for neurodivergent brains: it tells you what to do next. The core loop is **Dump → (Sort) → What now? → Focus → Done / Not now → What now?** There are no streaks that reset, no red overdue counts and no scores.

| Area | What it does |
|---|---|
| What now? (home) | Asks your energy (low / okay / high) and your time, then shows **one** task. **Start** opens full-screen focus, **Not now** lets it drift back and rest for 3 hours, **Already done** drops it into the done jar |
| Dump bar | Always at the top. Type or say a thought (mic, where the browser supports it), press Enter, and it floats into the inbox. `/` focuses it |
| Break it down | Claude turns a task into tiny first steps. **I'm stuck** keeps splitting the current step into smaller ones. There's a gentle generic version without an API key |
| Focus mode | Full screen: one task, its next step, a slowly breathing background, and a horizon light that crosses the screen instead of a countdown. Time is shown in words ("about halfway"). `Esc` minimizes and keeps the session running |
| Done jar | Fills up through the day with what you finished. Celebration style is quiet, soft glow or confetti |
| Daily reminders | "Did I take it?" for meds: one tap logs the time, so you never double up. Shows "6 of the last 7 days". It nudges you while the app is open, and can create a daily Google Calendar event that alerts your phone |
| Whenever drawer | Past-date tasks rest here quietly and ask "still relevant?" (today / next week / no date / let it go) |
| Sensory & comfort | Calm / gentle / playful motion (calm is the default; the system's reduced-motion setting always wins), low-stimulation colors, easy-read font (Lexend), letter spacing, text size, read aloud |
| Overview | The full dashboard: daily brief, clock, rings, weather, top 3, habits, sleep, timeline, energy curve, goals, mood, weekly trends |
| Today | Top 3, timeline, energy curve, habits with cues, daily note, evening shutdown |
| Tasks | Natural quick add (`Call Anna fri 10am #work !2 ~30m`), priorities, tags, top-3 limit, Eisenhower matrix |
| Brain dump | Capture everything, triage to task/note/goal/habit (or AI suggestions) |
| Focus | Pomodoro, 52/17, 90-minute sessions; distraction parking; focus rating; breaks; time tracking |
| Calendar | Day/week/month, Google sync, time-block suggestions in free slots (high-energy tasks at your peak) |
| Habits | Yes/no, count, minutes; cues and stacks; "5 of the last 7" instead of streaks; strength; 66-day formation; heatmaps |
| Goals | Vision → year → quarter → month; progress from milestones, numbers, tasks or habits vs expected pace |
| Mood | Energy × pleasantness check-in with emotion words, context and regulation ideas |
| Sleep | Manual log; debt, regularity (SRI), social jet lag, chronotype; what affects your sleep |
| Insights | KPIs vs prior weeks, charts, correlation explorer, time by tag, AI weekly review |
| Settings | Targets, location, Google, AI status, tags, JSON export/import |

Keyboard: `/` dump a thought · `⌘K`/`Ctrl+K` command palette · `N` new task · `B` brain dump inbox · `F` focus · `M` mood · `L` sleep · `G` then `W` (What now?), `D` (Overview), `T/K/C/H/O/N/I/S` to jump · `?` all shortcuts.

## Development

```bash
npm run dev            # dev server on :3000
npm test               # unit + integration tests (in-memory Postgres)
npm run lint
npm run typecheck
npm run db:generate    # new migration after editing src/lib/db/schema.ts
```

```
src/app/            pages, server actions (app/actions), route handlers (app/api)
src/components/     UI kit, charts, feature components
src/lib/domain/     pure logic (quick add, streaks, energy curve, sleep metrics…) + tests
src/lib/services/   database-backed services + tests
src/lib/db/         schema and database connector (Supabase or embedded)
drizzle/            SQL migrations
scripts/            sample-data seed
```
