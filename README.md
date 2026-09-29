# Productivity OS

A personal desktop dashboard for focus, time, tasks, habits, goals, mood, sleep and an AI daily brief.
The design mixes Google's Material 3 with Apple's look: a monochrome base with blue and orange accents.

- **Plan & roadmap:** [`docs/PLAN.md`](docs/PLAN.md)
- **Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · Drizzle ORM · Supabase Postgres

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL / DATABASE_URL_DIRECT from Supabase
npm run db:migrate           # create the tables in Supabase
npm run dev                  # http://localhost:3000
```

### Supabase setup (one time)
1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → Database → Connection string**, copy the connection strings:
   - **Transaction pooler** (port 6543) → `DATABASE_URL`
   - **Session pooler** (port 5432) → `DATABASE_URL_DIRECT`
3. Run `npm run db:migrate`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `start` | Production build and server |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm run db:generate` | Create a migration after editing `src/lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the database |
| `npm run db:studio` | Browse the database in Drizzle Studio |

## Structure

```
src/app/            pages (dashboard, clock, placeholder sections)
src/components/     shell (sidebar, top bar, ⌘K), ui, widgets
src/lib/db/         Drizzle schema + client
src/lib/data/       DataStore — the swappable database connector
drizzle/            SQL migrations
docs/PLAN.md        product & technical plan
```

## Shortcuts
- `⌘K` / `Ctrl+K`: command palette
