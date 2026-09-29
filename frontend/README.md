# Frontend (JavaScript + React)

Everything the user sees. Written in plain **JavaScript (`.js`) and React (`.jsx`)**, with no TypeScript.

## Folder map

```
frontend/
├── index.html              The single HTML page React mounts into
├── package.json            Dependencies and scripts (dev, build, test, lint)
├── vite.config.js          Build tool config (@shared alias → ../shared)
├── eslint.config.js        Lint rules
├── .prettierrc             Formatting rules
├── .env.example            VITE_API_URL / VITE_API_TOKEN template
├── vercel.json             Hosting config for Vercel
│
├── src/
│   ├── main.jsx            Entry point: renders <App /> and loads the CSS
│   ├── App.jsx             App shell: tabs, providers, celebrations
│   │
│   ├── api/
│   │   └── client.js       The ONLY file that talks to the Flask backend (fetch)
│   │
│   ├── config/
│   │   └── goals.js        Reads shared/goals.json; adds UI text (hints, moods)
│   │
│   ├── lib/                Pure JavaScript logic: no React, no network, easy to test
│   │   ├── scoring.js      Daily score rules (mirrors backend/app/services/scoring.py)
│   │   ├── summary.js      Numbers for the Home dashboard
│   │   ├── achievements.js Weekly badges and milestones
│   │   ├── treats.js       Weekly treat rule (5 good days)
│   │   ├── topics.js       Study topics and targets
│   │   ├── reminders.js    Today's reminder list
│   │   ├── dates.js        Date helpers
│   │   ├── storage.js      Safe localStorage
│   │   ├── charts.js       Chart.js setup
│   │   └── burst.js        Confetti animation
│   │
│   ├── hooks/              React hooks that hold state and side effects
│   │   ├── useTracker.jsx  All app data + saving (Flask, account, or browser)
│   │   ├── useAchievements.js, useTreats.js, useReminders.js
│   │   └── useNow.js, useTheme.js, useCountUp.js
│   │
│   ├── components/         Reusable UI pieces, grouped by where they appear
│   │   ├── layout/         Header, TabBar
│   │   ├── common/         Toast, ChartCanvas (used everywhere)
│   │   ├── home/           Mascot, JourneyPath, TreatCard
│   │   ├── today/          DayCard, ScoreRing, SectionBlock, HabitRow, AddGoalForm,
│   │   │                   WeightCard, ReminderTimeline, ReminderAlert, RunGrid
│   │   ├── study/          TargetsPanel, ProjectsPanel, CourseLink
│   │   └── awards/         Badge, UnlockCelebration
│   │
│   ├── pages/              One file per tab: puts components together
│   │   └── HomePage, TodayPage, StudyPage, WeekPage, AchievementsPage,
│   │       JournalPage, SettingsPage
│   │
│   └── styles/             CSS: tokens.css (colours/fonts) + one file per area
│
└── tests/                  Unit tests for src/lib (run with: npm test)
```

## How data flows

```
page  →  hook (useTracker)  →  api/client.js  →  Flask backend
  ↑            │
  └── lib/ (pure rules: score, badges, treats…)
```

1. **Pages** read data from `useTracker()` and render **components**.
2. Components call `updateDay(...)` or `saveTopic(...)` when you tick something.
3. `useTracker` updates the screen immediately, then saves in the background.
4. Anything that is a *rule* (how scores, badges or treats work) lives in `lib/` so it can be tested without a browser.

## Commands

```bash
npm install      # once
npm run dev      # http://localhost:5173
npm test         # tests in tests/
npm run lint     # code-quality checks
npm run build    # production build in dist/
```
