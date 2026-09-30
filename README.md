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

That's it — with no configuration the app stores everything in an embedded Postgres database in `.data/pglite` inside the project folder. Stop it with `Ctrl+C`.

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

| Area | What it does |
|---|---|
| Dashboard | Daily brief, clock, running timer, today's rings, weather, top 3, habits, sleep, timeline, energy curve, goals, mood, weekly KPIs |
| Today | Top 3, timeline, energy curve, habits with cues, daily note, evening shutdown |
| Tasks | Natural quick add (`Call Anna fri 10am #work !2 ~30m`), priorities, tags, top-3 limit, Eisenhower matrix |
| Brain dump | Capture everything, triage to task/note/goal/habit (or AI suggestions) |
| Focus | Pomodoro, 52/17, 90-minute sessions; distraction parking; focus rating; breaks; time tracking |
| Calendar | Day/week/month, Google sync, time-block suggestions in free slots (high-energy tasks at your peak) |
| Habits | Yes/no, count, minutes; cues and stacks; never-miss-twice streaks; strength; 66-day formation; heatmaps |
| Goals | Vision → year → quarter → month; progress from milestones, numbers, tasks or habits vs expected pace |
| Mood | Energy × pleasantness check-in with emotion words, context and regulation ideas |
| Sleep | Manual log; debt, regularity (SRI), social jet lag, chronotype; what affects your sleep |
| Insights | KPIs vs prior weeks, charts, correlation explorer, time by tag, AI weekly review |
| Settings | Targets, location, Google, AI status, tags, JSON export/import |

Keyboard: `⌘K`/`Ctrl+K` command palette · `N` new task · `B` brain dump · `F` focus · `M` mood · `L` sleep · `G` then `D/T/K/C/H/O/N/I/S` to jump · `?` all shortcuts.

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
