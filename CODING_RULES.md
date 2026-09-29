# Coding rules

These are the rules this project follows. Each one says what the rule is, why it matters, and where you can see it in the code.

## 0. Project layout

**Frontend and backend live in separate folders.** `frontend/` is only JavaScript/React, `backend/` is only Python, and `shared/` holds data both read. Each has its own README with a folder map.

**Group frontend components by the page they belong to** (`components/today/`, `components/study/`…). Put pieces used everywhere in `components/common/`, and put the header and tab bar in `components/layout/`.

**Tests live in their own `tests/` folder** on both sides, named after the file they test (`tests/scoring.test.js` tests `src/lib/scoring.js`, `tests/test_scoring.py` tests `app/services/scoring.py`).

**Plain JavaScript, no TypeScript.** Document function inputs and outputs with a short comment instead.

## 1. General

**One job per file, one job per function.** If you need "and" to describe a function, split it.
*Example:* `routes/api.py` only handles HTTP. Scoring lives in `services/scoring.py` and SQL lives in `repositories/`.

**One source of truth.** Never define the same fact in two places.
*Example:* habits, weights and default targets live only in `shared/goals.json`, and both React and Python read it.

**Names say what things are.** Use `studyTarget`, `isItemDone`, `week_report`. Avoid `data2`, `temp`, `handle`, `doStuff`. Booleans start with `is`, `has` or `can`.

**No magic numbers.** Give numbers a name.
*Example:* `SAVE_DELAY_MS = 600`, `STREAK_SCORE = 70`, `MAX_LATE_MINUTES = 90`.

**Keep functions short.** Aim for under about 30 lines. Return early instead of nesting `if` blocks.

**Comments explain why, not what.** The code shows what it does. A comment should explain a decision.
*Example:* `round_half_up` has a comment explaining that Python's `round()` differs from JavaScript's `Math.round`.

**Test the logic that matters.** Scoring, validation, reports and date maths all have tests. UI details don't need them.

**Format automatically.** Prettier (JS) and Ruff (Python) decide the style, so reviews can focus on logic.

## 2. React / JavaScript

**Pure logic outside components.** Anything that can be a plain function goes in `src/lib/` with no React inside, which makes it easy to test.
*Example:* `buildReminders(settings, day)` is pure. `useReminders` only adds the clock and the alert queue.

**Components render, hooks manage state, the API client talks to the network.** Components never call `fetch` directly.

**Keep state in one place.** `useTracker` owns settings and days, and pages read from it through context. Don't copy that state into local `useState` unless it's a draft, like the settings form or journal text while typing.

**Update state immutably.** Write `{ ...prev, [key]: value }` and `items.filter(...)`. Never use `push`, `splice` or direct assignment on state.

**Stable callbacks and memoised work where it helps.**
- `useCallback` for `onChange` handlers passed to memoised rows (`HabitRow` is wrapped in `memo`).
- `useMemo` for chart configs and the 80-day grid.
- Don't memoise everything. Only use it where a list re-renders often.

**Clean up effects.** Every `setTimeout`, `setInterval` or `requestAnimationFrame` started in an effect is cleared in its cleanup.
*Example:* `useNow`, `useCountUp`, `useReports`.

**Handle loading, empty and error states.** Every screen that fetches data shows something useful in all three.
*Example:* the Week tab explains how to start the backend if it can't reach it.

**Load heavy code only when needed.** Chart.js loads with `React.lazy` only when you open the Week tab, and only the chart parts actually used are registered (`lib/charts.js`).

**Accessibility is part of "done".**
- Real `<button>`s for actions.
- `aria-label` on icon-only buttons.
- `aria-pressed` on toggles.
- Visible focus rings.
- `prefers-reduced-motion` respected.

**Never trust storage.** `localStorage` can throw in private mode or when full, so every access goes through `lib/storage.js`, which catches errors.

## 3. Python / Flask

**Layers:** `routes` → `services` → `repositories`. Routes validate input and return JSON. Services hold the rules and don't know about Flask. Repositories hold the SQL. This lets you test services without a server, and swap SQLite for PostgreSQL by writing one new repository class.

**Use the application factory.** `create_app(config)` builds the app, so tests create a fresh app with a temporary database (`tests/test_api.py`).

**Configuration comes from the environment.** Secrets (`API_TOKEN`) and paths live in `.env`, which is git-ignored and never hard-coded. `.env.example` documents every variable.

**Validate by whitelist.** `clean_day` keeps only known fields, checks their types and clamps numbers. Anything unexpected is dropped, never saved.

**Always use parameterised SQL.** Write `"... WHERE date = ?", (date_key,)`. Never build SQL with f-strings.

**Use type hints and docstrings on public functions.** Ruff checks style, import order and common bugs (`pyproject.toml`).

**Errors are consistent JSON.** Raise `ValidationError` for bad input, and `errors.py` turns it into a 400 response. Unexpected errors are logged and return a generic 500, never a stack trace.

**Compare secrets in constant time.** Use `hmac.compare_digest` for the API token.

## 4. Git habits

- Make small commits with clear messages, for example `feat(jobs): add Naukri update slots` or `fix(reports): 12-hour wake time`.
- Use one branch per feature and merge when the tests pass.
- Never commit `.env`, `node_modules`, `.venv` or the SQLite file (see `.gitignore`).

## 5. Before you push

```bash
cd backend  && pytest && ruff check . && ruff format --check .
cd frontend && npm test && npm run lint && npx prettier --check src
```

If you change a scoring rule, update **both** `lib/scoring.js` and `services/scoring.py`, and add a case to `shared/scoring-cases.json`.
