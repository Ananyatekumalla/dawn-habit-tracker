# Dawn: 80-day habit tracker

Track your mornings, health, job search and study every day until Dec 16.

- **Home:** Sunny the sun mascot (reacts to your day), a journey road of all 80 days, progress tiles, and line and bar charts of your whole run.
- **Today:** the daily card, a checklist in four sections with a live score (including 2 hours of night project work), a weight log, and reminders.
- **Study:** three views. **Projects** lets you pick tonight's build from project ideas and tracks the hours spent on each. **Targets** is the full list each track (Data Analytics, Full Stack MERN, AI Engineer) must finish by the end; paste many at once. **Daily plan** is what you'll cover today: type a topic or pick a target, tick it off, and unfinished ones carry over.
- **Week:** charts and a written review from the Python backend.
- **Mood and treats:** an emoji face shows how the day is going (😴 → 🙂 → 😄 → 🤩 → 🥳). Get 5 good days (70+) in a week and you earn a treat you pick yourself: café, dinner, ice cream… The treat list is editable in Settings.
- **Your own goals:** "+ Add a goal" under any Today section, as a tick or a count, with an optional reminder time. Each one is worth 2.5 points taken from its section, so the day still totals 100.
- **Awards:** badges unlock automatically. Each week there are 11 badges (one per goal area you complete every day, plus 📚 Topic Master) and a 👑 Perfect Week crown. There are 10 milestones for the whole challenge, and a celebration pops up for each new unlock.
- **Journal:** mood, notes, do's and don'ts.
- **Settings:** every target and reminder time.

**Stack:** React 18 + Vite (frontend) · Python 3.11+ + Flask (backend) · SQLite · Chart.js

## Project structure

The project is split into three folders so each part is easy to find:

```
dawn-habit-tracker/
├── frontend/     Everything you see: JavaScript + React          → see frontend/README.md
├── backend/      The API and database: Python + Flask            → see backend/README.md
├── shared/       Settings both sides read (goals.json) and the test cases both must pass
├── README.md     This file
├── CODING_RULES.md  The coding standards this project follows
└── DEPLOY.md     How to put it online
```

- **Languages:** JavaScript (`.js`, `.jsx`) for the frontend and Python (`.py`) for the backend. There is no TypeScript.
- **Rule of thumb:** a file in `frontend/` never contains Python, and a file in `backend/` never contains JavaScript. The only thing they share is data in `shared/`.

### Where the logic lives

| Logic | JavaScript / React | Python |
|---|---|---|
| Live daily score, section %, day grid | `lib/scoring.js` | `services/scoring.py` (same rules) |
| Home dashboard summary (streaks, trends, per-week study) | `lib/summary.js` | none |
| Achievements: weekly badges, milestones, unlock detection | `lib/achievements.js`, `hooks/useAchievements.js` | none |
| Study topics: carry-over, per-track progress | `lib/topics.js` | `services/reports.py` (weekly topic counts), `validation.py` |
| Reminders and alerts | `lib/reminders.js`, `hooks/useReminders.js` | none |
| Saving, offline cache, retry | `hooks/useTracker.jsx` | `repositories/tracker_repository.py` |
| Weekly charts data, streaks, written review | displays it (`pages/WeekPage.jsx`) | `services/reports.py` |
| Input validation | basic form checks | `services/validation.py` (authoritative) |

Scoring exists in both languages on purpose. React needs it instantly while you tick boxes, and Python needs it for reports. `shared/scoring-cases.json` keeps them identical: both test suites run the same cases.

## Run it locally (Mac)

You need Python 3.11+ and Node 18+.

**1. Backend** (terminal 1)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
python run.py                # http://localhost:5000/api/health
```

**2. Frontend** (terminal 2)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                  # http://localhost:5173
```

Set `VITE_API_URL=` (empty) to run the frontend on its own, saving everything in the browser.

If the backend is down, the app keeps working from a local cache and sends your changes when the server is back. The Week tab needs the backend.

## Checks

```bash
# backend
cd backend && pytest && ruff check . && ruff format --check .

# frontend
cd frontend && npm test && npm run lint && npx prettier --check src
```

## API

| Method | Path | What it does |
|---|---|---|
| GET | `/api/health` | Health check (no token needed) |
| GET | `/api/goals` | The shared goals config |
| GET / PUT | `/api/settings` | Read / update targets and reminder times |
| GET | `/api/days?from=&to=` | All logged days in a range |
| PATCH | `/api/days/<YYYY-MM-DD>` | Merge a partial update into one day |
| DELETE | `/api/days` | Erase all logged days |
| GET | `/api/topics` | All study topics |
| PUT | `/api/topics/<id>` | Create or update a topic (id is made by the app so it works offline) |
| DELETE | `/api/topics/<id>` | Delete a topic |
| GET | `/api/reports/week/<index>` | Week report: per-day rows, summary, consistency, topics per track, verdict |
| GET | `/api/reports/overall?today=` | Average score, streaks, totals |

Errors always look like `{"error": "validation_error", "message": "..."}`.

## Deploy

See **[DEPLOY.md](DEPLOY.md)** for step-by-step guides covering three options: the claude.ai link (already live), the frontend alone on Vercel, or the full stack on Vercel + PythonAnywhere.

## Changing your goals

- **Targets and times** (wake time, steps, applications, reminder times): the Settings tab.
- **Badges:** add or change rules in `frontend/src/lib/achievements.js` (`WEEKLY_BADGES` and the milestone list), then run `npm test`.
- **Study tracks:** edit `studyTracks` in `shared/goals.json` (id, name, short name, colour, emoji).
- **Course links:** each target in `shared/goals.json` can be `{ "title": ..., "url": ... }`, and each track has a `courses` list. You can add or edit a link on any topic in the app.
- **Project ideas:** edit `projects` in `shared/goals.json`.
- **Track targets:** paste them in the app (Study → Targets → Add targets in bulk), or list them under each track's `targets` in `shared/goals.json`. Targets in the file are added once on startup; ids come from the title, so restarting never duplicates them and a target you delete stays deleted.
- **Adding a habit:** add it to `shared/goals.json` with a `type` (`check`, `count`, `number`, `slots`) and a `weight`, keep all weights summing to 100, add a hint in `frontend/src/config/goals.js`, and run both test suites.
