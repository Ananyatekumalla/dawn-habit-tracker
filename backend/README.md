# Backend (Python + Flask)

The REST API that stores your data and builds the weekly reports. Written in **Python**.

## Folder map

```
backend/
├── run.py                  Start the dev server: python run.py
├── wsgi.py                 Entry point for hosting (PythonAnywhere, gunicorn)
├── requirements.txt        Runtime packages (Flask, gunicorn)
├── requirements-dev.txt    + test and lint tools (pytest, ruff)
├── pyproject.toml          Ruff and pytest settings
├── .env.example            DATABASE_PATH / CORS_ORIGINS / API_TOKEN template
│
├── app/
│   ├── __init__.py         create_app(): wires config, CORS, auth, routes, seeding
│   ├── config.py           Reads settings from environment variables
│   ├── goals.py            Loads shared/goals.json
│   ├── errors.py           Turns errors into JSON responses
│   │
│   ├── routes/             HTTP layer: validate input → call a service → return JSON
│   │   ├── api.py          All /api/... endpoints
│   │   └── helpers.py      Small shared helpers for routes
│   │
│   ├── services/           Business rules (no Flask, no SQL, easy to test)
│   │   ├── scoring.py      Daily score rules (mirrors frontend/src/lib/scoring.js)
│   │   ├── reports.py      Weekly/overall reports, treats, written review
│   │   ├── validation.py   Whitelist checks for everything the API receives
│   │   ├── targets.py      Seeds study targets from shared/goals.json
│   │   └── dates.py        Date helpers
│   │
│   └── repositories/
│       └── tracker_repository.py   The ONLY place with SQL (SQLite)
│
└── tests/                  test_scoring.py, test_api.py, test_targets.py
```

## How a request flows

```
HTTP request → routes/api.py → services/validation.py → repositories/ (SQLite)
                     └────────→ services/reports.py (for /reports/...)
```

## Commands

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
python run.py        # http://localhost:5000/api/health
pytest               # run the tests
ruff check .         # code-quality checks
```
