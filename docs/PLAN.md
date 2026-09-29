# Productivity OS — Product & Technical Plan

A personal, desktop-first "life dashboard" that joins planning, focus, time, mood, sleep,
habits and goals in one place. Everything feeds everything else, and an AI layer turns the data into a
daily brief.

> Scope: built for one person (me). That means no multi-tenancy, no billing, and no onboarding flows.
> What matters is speed, a nice look, keyboard-first use, and my data under my control.

---

## 1. Principles

1. **One system, many lenses.** Tasks, habits, goals, focus sessions, calendar events, notes, mood and
   sleep are all *entities* that can be linked, tagged and put on the same timeline. Each "feature" is
   just a different view of that shared data.
2. **Capture fast, process later.** Brain dump and quick-add (`⌘K`) are always one keystroke away.
   Sorting happens later, by me or with AI help.
3. **Protect attention.** Show the few things that matter now. Everything else stays one click away,
   not on screen.
4. **Show progress.** Streaks, rings and progress bars update live, because seeing progress keeps
   motivation going.
5. **Honest science.** Neuroscience-based features follow well-supported findings, and every
   "insight" says how strong the evidence behind it is (see §5).

---

## 2. Design System — "Google × Apple"

| Aspect | Take from Apple (HIG) | Take from Google (Material 3) |
|---|---|---|
| Surfaces | Frosted glass / vibrancy on overlays, sidebars, the clock | Tonal surface levels (surface, container-low/high) for cards |
| Shape | Large continuous-corner radii (16–24px cards, 12px controls) | Consistent shape scale tokens (xs → xl) |
| Color | Restrained neutrals, a single accent, SF system colors for semantics | **Dynamic color** — tonal palette made from one seed (HCT), full light/dark roles |
| Type | SF Pro-like, tight tracking on large numerals (clock, KPIs) | Material type scale roles (display/headline/title/body/label) |
| Motion | Spring physics, subtle depth/parallax, smooth ring fills | Clear easing tokens (emphasized/standard), container transforms |
| Icons | SF Symbols feel (thin strokes, rounded) | Material Symbols (variable weight/fill) |
| Data viz | Activity rings (Apple Fitness), Health-style charts | Clean Google Analytics/Fit-style charts, clear legends |

**Tokens** (CSS variables, driven by a seed color and light/dark mode):
- `--surface`, `--surface-container-{lowest…highest}`, `--on-surface`, `--primary`, `--on-primary`,
  `--outline-variant`, semantic `--success / --warning / --danger`.
- Mood quadrant colors (see §4.9): `--mood-red`, `--mood-yellow`, `--mood-blue`, `--mood-green`.
- Radii: `--r-xs 6`, `--r-sm 10`, `--r-md 14`, `--r-lg 20`, `--r-xl 28`.
- Font: `Inter` (with `font-feature-settings: "tnum"` for numbers) or `SF Pro` when available
  (`-apple-system` stack). Use `JetBrains Mono` / `SF Mono` only for the big electronic clock.

**Layout:** desktop only (≥1280px). There is a left navigation rail (Material) that collapses to icons,
with a translucent sidebar (Apple). The main area is a **bento grid** dashboard of resizable,
draggable widgets. A right-hand "Now" panel is always visible and shows the current focus session,
the next event, and the clock.

**Interaction:** keyboard-first. Main shortcuts: `⌘K` command palette, `N` new task, `B` brain dump,
`F` start focus, `M` log mood, `G then D/T/C/H` to jump between pages.

---

## 3. Tech Stack (recommended)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | One codebase for UI and API routes; server actions; easy to deploy |
| Styling | **Tailwind CSS v4** + CSS tokens + **shadcn/ui** (Radix primitives), restyled | Accessible primitives; full control over the Google/Apple look |
| Motion | **Framer Motion** | Spring animations, layout transitions, animated rings |
| Charts | **Recharts** for standard charts, **visx/D3** for custom ones (rings, heatmaps, hypnogram, mood grid) | |
| Dashboard grid | **react-grid-layout** | Draggable and resizable widgets |
| State | **TanStack Query** (server state) + **Zustand** (UI state, timers) | |
| Database | **PostgreSQL** via **Drizzle ORM** — hosted on Supabase/Neon, *or* local Postgres in Docker | Typed schema, migrations, a relational fit for linked entities |
| DB connector | A `DataStore` interface with a Postgres implementation first, and SQLite (local-only / offline) as a drop-in option | This is the "database connector": the storage backend can be swapped without touching the rest of the app |
| Auth | None for the app (runs on localhost). Google OAuth only for Calendar access | |
| Calendar | **Google Calendar API** (OAuth, incremental sync with `syncToken`, push webhooks) + my own events table | Hybrid, see §4.5 |
| Weather | **Open-Meteo** (free, no key) | Forecast, UV, sunrise/sunset, air quality |
| AI | **Claude API** (Anthropic SDK), structured JSON output | Daily brief, triage, weekly review |
| Jobs | Cron (Vercel Cron or `node-cron`) for nightly aggregation, the AI brief, and calendar sync | |
| Notifications | Web Notifications API and sounds for timer ends | |
| Testing | Vitest (logic), Playwright (E2E) | |

---

## 4. Features

### 4.1 Dashboard (home)
A bento grid of widgets. Each widget is a small version of a full page. Default layout:

```
┌───────────────────────────── Top bar: date · weather · ⌘K · energy ─────────────────────────────┐
│ AI Daily Brief (what matters / what doesn't) │ Big Clock + countdown  │ Now: focus session      │
├──────────────────────────────────────────────┼────────────────────────┼─────────────────────────┤
│ Today's Top 3 (MITs) + active tasks          │ Timeline (calendar +   │ Habits today (rings)    │
│                                              │ time blocks + tracked) │                         │
├──────────────────────────────────────────────┼────────────────────────┼─────────────────────────┤
│ Goals progress                               │ Mood check-in (grid)   │ Sleep last night        │
├──────────────────────────────────────────────┴────────────────────────┴─────────────────────────┤
│ Benchmarks strip: focus hrs · tasks done · habit % · sleep score · mood trend (sparklines)       │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Time, Big Electronic Clock & Countdown
- A full-screen "clock mode" with a large seven-segment / tabular-numeral clock (fullscreen API).
- Countdowns can target: the next calendar event, the end of the current focus block, the end of the
  workday, a custom deadline, or a goal's due date.
- A day progress bar (the % of waking hours used, based on sleep/wake times), plus sunrise and sunset
  from the weather API.

### 4.3 Time Tracking
- Start/stop timers attached to a **task, project, or tag** (there is at most one running timer).
- Focus sessions automatically create time entries.
- Manual entries and edits happen on the timeline (drag to create, drag the edges to resize).
- Idle detection: after N minutes with no activity, ask "keep, discard, or split?"
- Reports: time by project/tag/goal, planned vs. actual (calendar blocks vs. tracked time), and
  a deep vs. shallow work ratio.

### 4.4 Pomodoro / Focus Timer
- Presets: **Pomodoro 25/5** (long break after 4 rounds), **52/17**, **Ultradian 90/20**, and custom.
- Each session links to **one** task (single-tasking) and gets a focus-quality rating when it ends (1–5).
- Distraction log: one key to note a distracting thought. It goes to the brain dump inbox, not to the
  current task.
- "Deep work" mode: the dashboard is hidden and only the timer, task, and clock stay visible.
- Optional ambient sound (brown noise).
- Break prompts suggest real rest: look far away, walk, breathe. No screen during breaks.
- Output: a time entry, a focus score, and progress toward the task, its goal, and a "focus hours"
  habit.

### 4.5 Calendar
**Recommendation: hybrid.** Build my own calendar UI and events table, and sync it two ways with Google Calendar.
- Views: day, week, and month. The day view is shared with the timeline (events, time blocks, tracked
  time, focus sessions, and mood/sleep markers all on one axis).
- **Time-blocking:** drag a task onto the calendar to create a block, which is optionally pushed to Google.
- Sync: OAuth, incremental `syncToken` pulls (polling, since the app runs on localhost), and
  conflict resolution by `updated` timestamp.
- Local-only blocks (for example "Deep work") can stay private if I choose.

### 4.6 Notes & Brain Dump
- **Brain dump:** a full-screen, distraction-free capture. One thought per line, and nothing gets organized while writing.
- **Triage** (manual or AI): each line becomes a task, note, calendar event, habit idea, or goal idea,
  or gets deleted. AI proposes the type, tags, priority, and due date, and I accept or edit them.
- **Notes:** Markdown editor (TipTap), with backlinks to tasks, goals, and days. There is a daily note for each date
  that collects everything from that day.

### 4.7 Tasks, Tags & Priority
- Fields: title, notes, status (inbox/next/active/waiting/done), **priority** (P1–P4),
  **Eisenhower** (urgent × important), effort (S/M/L or minutes), energy required (high/low),
  due date, scheduled block, tags, parent goal, and subtasks.
- **Active tasks:** "Today" allows at most **3 MITs** (most important tasks) plus a short list of
  others. The app warns when too many tasks are active.
- **Tags** are shared across everything: tasks, habits, goals, notes, time entries, and mood entries.
  They can be nested (`work/clientA`) and have colors.
- **Unified priority model:** goals have priority, and tasks and habits inherit it from their goal
  unless they set their own. The "priority score" used for ordering and by the AI:
  `score = w1·importance + w2·urgency(due) + w3·goal_priority + w4·energy_fit(now) − w5·staleness_penalty`.

### 4.8 Habits
- Types: yes/no, count (e.g. 8 glasses), duration (e.g. 20 min reading, which focus sessions can fill
  automatically), and negative habits ("no phone before 10:00").
- Schedule: daily, specific weekdays, or X times per week.
- **Cue / implementation intention:** "After [existing habit] at [time/place], I will [habit]."
- Habit stacking chains are shown visually.
- Streaks with the **"never miss twice"** rule: one miss keeps the streak alive but marks it,
  and two misses in a row break it. There are also "strength" scores based on an exponential moving
  average, which are less punishing than raw streaks.
- Visuals: Apple-style **rings** for today, a GitHub-style **year heatmap**, and strength curves.

### 4.9 Mood Tracking (inspired by *How We Feel*)
- **Two-axis check-in:** energy (y) × pleasantness (x), giving four quadrants:
  🔴 high energy / unpleasant, 🟡 high energy / pleasant, 🔵 low energy / unpleasant, 🟢 low energy / pleasant.
- Choose a quadrant, then a **specific emotion word** (about 100 words across the quadrants).
- Context: *what are you doing / who with / where*, plus sleep, exercise, and weather, which fill in automatically.
- Optional short journal note.
- Suggested regulation strategy based on the quadrant (breathing, a walk, reframing, a break, social contact).
- Prompts 2–3 times a day, and optionally after focus sessions.
- Visuals: a mood map (a scatter on the grid over time), a quadrant distribution per week, the most
  frequent emotions, and correlations with sleep, focus, habits, and weather (§4.14).

### 4.10 Sleep Tracker
- Input: manual entry (bedtime, wake time, latency, awakenings, quality 1–5, caffeine/alcohol/screens
  before bed), or import from **Apple Health export XML**, **Google Health Connect / Fit**, or
  **Oura/Whoop** APIs (optional, later).
- Metrics: duration, **sleep debt** (rolling 14 days vs. the target), **consistency / Sleep Regularity
  Index**, midsleep time (a chronotype estimate), and social jet lag (weekday vs. weekend midsleep).
- Visuals: a sleep window bar chart (bedtime → wake bars over 30 days), a hypnogram if stages are
  imported, and a debt trend.
- Feeds the **energy curve** (§5) and the AI brief.

### 4.11 Goals Tracker
- Hierarchy: **Vision → Goals (yearly/quarterly) → Milestones → Tasks & Habits**.
- Goal types: numeric target (e.g. read 24 books), milestone-based, or habit-driven (% adherence).
- Progress comes automatically from linked tasks, habits, and tracked time. It can also be updated manually.
- Each goal has a "why" field (motivation), a review cadence, and a status (on track / at risk / off
  track), which is calculated from how progress compares to elapsed time.

### 4.12 Weather Widget
- Current weather, hourly forecast, UV, air quality, and sunrise/sunset from Open-Meteo.
- It is connected to other features, not only shown:
  - It suggests outdoor habits or walks in good weather windows.
  - Its data is recorded with each mood entry for correlation.
  - Morning light exposure prompts use the sunrise time.

### 4.13 Live Visualisation of Habits & Goals
- Rings update live when a habit is logged or a focus session ends, with a spring animation.
- Goal progress bars show an "expected pace" marker (the goal-gradient effect: progress is shown
  relative to what remains).
- A "Today" ring set gives one glance at the day: **Focus** (hours vs. target), **Habits** (% done),
  and **Tasks** (MITs done).

### 4.14 Benchmarks & Insights
- KPI tiles with sparklines and comparisons (this week vs. the last 4 weeks): focus hours, deep work
  ratio, tasks completed, habit adherence, goal velocity, sleep duration and consistency, and mood balance.
- **Personal records:** the longest streak, the best focus day, and so on.
- **Correlation explorer:** for example, "on days with ≥7h sleep, focus quality is +0.8 higher". It uses
  Spearman correlation with a minimum sample size, and every result is labeled as correlation, not
  causation.
- Reviews: weekly and monthly, generated by AI from the data (§4.15).

### 4.15 AI Layer (Claude API)
- **Morning brief** (generated at wake time or on demand):
  - *What's important today*: the top 3 MITs with a reason (goal link, deadline, priority score).
  - *What's not important*: tasks to defer, delegate, or drop. It says so explicitly, to reduce overload.
  - Calendar shape: meetings, free blocks, and a suggested deep work window based on the energy curve.
  - Readiness: last night's sleep, sleep debt, and recent mood trend, with a suggested intensity
    for the day.
- **Evening summary:** what got done, time spent vs. planned, habits, mood arc, and one
  reflection question. It also carries unfinished tasks forward.
- **Brain dump triage** and **natural-language quick-add** ("gym tomorrow 7am #health").
- **Weekly review:** trends, goal risk, and suggested adjustments.
- Implementation: a server route builds a compact JSON context of the day, then calls Claude with a
  strict output schema (tool use / JSON) and stores the result in `ai_summaries`, so it is cached and
  the history can be browsed. Nothing is sent without being assembled on my server. The API key is only
  on the server.

---

## 5. Neuroscience-informed features

| Finding (evidence level) | How the app uses it |
|---|---|
| **Ultradian rhythm, ~90-min cycles of alertness** (moderate) | 90/20 focus preset. Suggested time blocks are about 90 min. |
| **Circadian alertness peaks some hours after waking; post-lunch dip** (strong) | The **energy curve** is estimated from wake time, sleep debt, and chronotype. Deep work is suggested at the peak and shallow work in the dip. High-energy tasks are matched to peak windows. |
| **Sleep deprivation harms attention, memory, and emotion regulation** (strong) | The morning brief lowers suggested workload after poor sleep. Sleep debt is always visible. |
| **Unfinished tasks create intrusive thoughts (Zeigarnik); making a plan reduces them** (Masicampo & Baumeister 2011, moderate) | Brain dump and triage close open loops. The evening "shutdown ritual" plans tomorrow. |
| **Affect labeling (naming emotions) reduces amygdala activity** (Lieberman et al. 2007, moderate) | Mood check-in asks for a *specific emotion word*, not only a score. |
| **Working memory holds about 4 items** (Cowan, strong) | At most 3 MITs. The dashboard shows few items at once. |
| **Attention residue from task-switching** (Leroy 2009, moderate) | One task per focus session. A distraction inbox holds other thoughts. |
| **Implementation intentions ("if-then" plans) raise follow-through** (Gollwitzer, strong) | Habit cue field. Quick-add can create a time plus place. |
| **Habit automaticity takes a median of ~66 days, and a single miss does little harm** (Lally 2010, moderate) | A 66-day habit "formation" meter instead of "21 days". The **never-miss-twice** rule. |
| **Progress principle / small wins; the goal-gradient effect** (Amabile; Kivetz, moderate) | Live rings and progress bars. "X left" framing near the finish. |
| **Fresh-start effect** (Dai, Milkman & Riis, moderate) | Prompts for new goals and habits on Mondays, month starts, and birthdays. |
| **Dopamine and reward prediction: rewards for effort, not only outcomes** (moderate) | Celebrations when a focus session is completed, not only when a task is done. Only subtle animations, no gamification noise. |
| **Morning light helps set the circadian clock** (strong) | A "get outside light" habit timed around sunrise, using weather data. |
| **Breaks improve sustained attention; screen-free rest is best** (moderate) | Break prompts suggest non-screen activities. |

Rule: the app never makes medical claims. Sleep and mood features are for self-reflection, not
diagnosis.

---

## 6. How the features connect

```
                 ┌──────────── Goals ◄────────────┐
                 │   ▲ progress        ▲ progress │
                 ▼   │                 │          │
 Brain dump ──► Tasks ──► Calendar blocks ──► Focus sessions ──► Time entries
     ▲           │  ▲         ▲  (Google sync)     │   │               │
     │ distraction│  │ energy-fit                   │   │ focus quality │ duration
     └────────────┘  │                              ▼   ▼               ▼
                 Energy curve ◄── Sleep ──► Mood ◄── Weather     Habits (auto-fill)
                     ▲                        │                         │
                     └──────── all of it ─────┴──► Insights & Benchmarks ◄┘
                                                          │
                                                          ▼
                                             AI Daily Brief / Evening Summary
```

Main connections:
1. **Brain dump → tasks, notes, events, habits, and goals** (triage).
2. **Task → calendar block → focus session → time entry → task, goal, and habit progress.**
3. **Sleep → energy curve → task scheduling suggestions and AI brief intensity.**
4. **Mood ↔ sleep, weather, focus quality, and habits** (context auto-attached, correlations).
5. **Focus sessions auto-complete duration habits** ("Deep work 2h", "Read 20 min").
6. **Tags and priority** are shared across all entities, so filters work everywhere.
7. **Daily note / timeline** is a single chronological view of everything for a date.
8. **Clock countdown** follows the next event, the current focus block, or a goal deadline.
9. **The AI** reads the combined daily context and writes back suggestions: MITs, deferrals, and blocks.

---

## 7. Data Model (Drizzle / Postgres)

```
users(id, name, timezone, chronotype, wake_target, sleep_target_min, seed_color, settings jsonb)

tags(id, name, color, parent_id)
entity_tags(tag_id, entity_type, entity_id)                  -- polymorphic tagging
links(id, from_type, from_id, to_type, to_id, kind)          -- generic linking / backlinks

goals(id, title, why, type, target_value, unit, current_value, priority, start_date, due_date,
      status, parent_id, review_cadence, archived_at)
milestones(id, goal_id, title, due_date, done_at)

tasks(id, title, notes, status, priority, urgent, important, effort_min, energy, due_at,
      goal_id, parent_task_id, is_mit_on date, completed_at, created_at)

habits(id, title, type, target, unit, schedule jsonb, cue, stack_after_habit_id, goal_id,
       priority, is_negative, archived_at)
habit_logs(id, habit_id, date, value, source ['manual'|'focus'|'import'], note)

calendar_events(id, source ['local'|'google'], google_id, calendar_id, title, start_at, end_at,
                all_day, task_id, is_time_block, etag, updated_at)
calendar_sync_state(calendar_id, sync_token, channel_id, channel_expires_at)

time_entries(id, task_id, goal_id, started_at, ended_at, source ['timer'|'focus'|'manual'], note)
focus_sessions(id, task_id, preset, planned_min, actual_min, started_at, ended_at,
               quality 1-5, interruptions int, notes)
distractions(id, focus_session_id, text, created_at)       -- goes to brain dump inbox

braindump_items(id, text, created_at, triaged_at, result_type, result_id, ai_suggestion jsonb)
notes(id, title, content_md, date, created_at, updated_at)

mood_entries(id, at, energy -5..5, pleasantness -5..5, quadrant, emotion, note,
             context jsonb {activity, people, place}, weather_snapshot jsonb, strategy_used)

sleep_entries(id, date, bed_at, sleep_at, wake_at, out_of_bed_at, latency_min, awakenings,
              quality 1-5, stages jsonb, factors jsonb {caffeine, alcohol, screens}, source)

weather_cache(date, hour, data jsonb)

daily_metrics(date, focus_min, deep_ratio, tasks_done, mits_done, habit_pct, sleep_min,
              sleep_debt_min, sri, mood_valence_avg, mood_energy_avg, energy_curve jsonb)  -- nightly rollup
ai_summaries(id, date, kind ['morning'|'evening'|'weekly'], input_hash, output jsonb, created_at)
dashboard_layouts(id, name, layout jsonb, is_default)
```

**DB connector:** `lib/data/DataStore.ts` defines repositories (`tasks`, `habits`, …).
`PostgresStore` (Drizzle) is the default. `SqliteStore` (Drizzle + better-sqlite3) is for local-only
use. Settings include JSON export/import for backups, and the database URL comes from `.env`.

---

## 8. Project Structure

```
app/
  (dashboard)/page.tsx              bento dashboard
  today/  tasks/  calendar/  focus/  habits/  goals/  mood/  sleep/  notes/  braindump/
  insights/  clock/  settings/
  api/  ai/brief  ai/triage  calendar/webhook  weather  cron/nightly
components/
  ui/            shadcn-based primitives, restyled with tokens
  widgets/       ClockWidget, FocusWidget, HabitsRings, MoodGrid, SleepChart, WeatherWidget, ...
  charts/        Ring, Heatmap, Sparkline, Hypnogram, MoodScatter, Timeline
lib/
  data/          DataStore interface + postgres/ + sqlite/
  db/schema.ts   Drizzle schema
  domain/        priority score, streaks, energy curve, sleep metrics, correlations
  integrations/  google-calendar.ts, open-meteo.ts, anthropic.ts, health-import/
  hooks/  stores/
styles/tokens.css
docs/PLAN.md
```

---

## 9. Roadmap

| Phase | Deliverable |
|---|---|
| **0. Foundation** (week 1) | Next.js + Tailwind + tokens (Google/Apple theme, light and dark), app shell (rail, sidebar, ⌘K), Drizzle schema + Postgres, DataStore |
| **1. Core loop** (weeks 2–3) | Tasks (priority, tags, MITs), brain dump, focus timer + time tracking, big clock/countdown, basic dashboard grid |
| **2. Calendar** (week 4) | Local calendar (day/week/month), timeline view, time-blocking by drag, Google Calendar two-way sync |
| **3. Habits & goals** (weeks 5–6) | Habits (types, cues, never-miss-twice), goals hierarchy, auto-progress from tasks/habits/time, live rings and heatmaps |
| **4. Wellbeing** (weeks 7–8) | Mood grid (How We Feel style), sleep tracker + imports, weather widget, energy curve |
| **5. Intelligence** (weeks 9–10) | Nightly rollups, benchmarks, correlation explorer, AI morning brief / evening summary / triage / weekly review |
| **6. Polish** | Motion pass, keyboard shortcuts everywhere, notifications, backups/export, PWA install (optional desktop app via Tauri later) |

Each phase ends with a usable app, so I can use it every day from Phase 1 on.

---

## 10. Decisions (confirmed)

| # | Question | Decision | Consequences |
|---|---|---|---|
| 1 | Database hosting | **Supabase** (cloud Postgres) | Drizzle connects via the pooler (`prepare: false`). Migrations live in `drizzle/`. The SQLite connector stays an optional fallback. |
| 2 | Calendar | **Google Calendar, two-way sync** | Auth.js/Google OAuth with a `localhost` redirect. Because the app runs locally, Google push webhooks can't reach it, so sync **polls** with `syncToken` every 1–2 min while the app is open and on focus/visibility change. |
| 3 | Sleep data | **Manual entry** | Quick morning form (bed/wake times, quality, factors). Imports are postponed. |
| 4 | Deployment | **Own computer** (`localhost`) | No login screen is needed. The only OAuth is for Google Calendar. Cron jobs run in-process (nightly rollup, morning brief). An optional Tauri desktop wrapper can come later. |
| 5 | AI privacy | **Everything** may be sent to the AI | The brief and summaries use full context: tasks, notes, journal, mood notes and sleep. |
| 6 | Theme | **Monochrome (white / black / greys) with bright accents: blue primary, orange secondary** | Light: `#F5F5F7` background, white cards. Dark: pure black background, `#1C1C1E` cards. Blue `#007AFF`/`#0A84FF` for actions, orange `#FF7A00`/`#FF9F0A` for energy and highlights. Follows system mode, with a manual toggle. |

---

## 11. Progress

- [x] **Phase 0 — Foundation:** Next.js 16 + Tailwind v4 tokens (light and dark), app shell
      (sidebar, top bar, ⌘K palette, theme toggle), bento dashboard with placeholders, full-screen big
      clock with a countdown, the full Drizzle schema + initial migration, and the DataStore connector
      (Postgres/Supabase).
- [ ] Phase 1 — Core loop
- [ ] Phase 2 — Calendar
- [ ] Phase 3 — Habits & goals
- [ ] Phase 4 — Wellbeing
- [ ] Phase 5 — Intelligence
- [ ] Phase 6 — Polish
