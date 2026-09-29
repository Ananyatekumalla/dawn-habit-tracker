"""All database access lives here, so routes and services never touch SQL.

Uses SQLite from the standard library. To move to PostgreSQL later, write a
second class with the same public methods and swap it in create_app().
"""

import json
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS days (
    date TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    track TEXT NOT NULL,
    date TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_topics_date ON topics (date);
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


class TrackerRepository:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(SCHEMA)

    @contextmanager
    def _connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    # small key/value store for bookkeeping ------------------------------------
    def get_meta(self, key: str):
        with self._connect() as conn:
            row = conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        return json.loads(row["value"]) if row else None

    def set_meta(self, key: str, value) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO meta (key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, json.dumps(value)),
            )

    # settings ---------------------------------------------------------------
    def get_settings(self) -> dict | None:
        with self._connect() as conn:
            row = conn.execute("SELECT data FROM settings WHERE id = 1").fetchone()
        return json.loads(row["data"]) if row else None

    def save_settings(self, data: dict) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO settings (id, data, updated_at) VALUES (1, ?, ?) "
                "ON CONFLICT(id) DO UPDATE SET "
                "data = excluded.data, updated_at = excluded.updated_at",
                (json.dumps(data), int(time.time())),
            )

    # days -------------------------------------------------------------------
    def get_days(self, start: str, end: str) -> dict[str, dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT date, data FROM days WHERE date BETWEEN ? AND ? ORDER BY date",
                (start, end),
            ).fetchall()
        return {row["date"]: json.loads(row["data"]) for row in rows}

    def merge_day(self, date_key: str, patch: dict) -> dict:
        """Merge a partial update into a day and return the full saved day."""
        with self._connect() as conn:
            row = conn.execute("SELECT data FROM days WHERE date = ?", (date_key,)).fetchone()
            merged = {**(json.loads(row["data"]) if row else {}), **patch}
            conn.execute(
                "INSERT INTO days (date, data, updated_at) VALUES (?, ?, ?) "
                "ON CONFLICT(date) DO UPDATE SET "
                "data = excluded.data, updated_at = excluded.updated_at",
                (date_key, json.dumps(merged), int(time.time())),
            )
        return merged

    def delete_all(self) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM days")
            conn.execute("DELETE FROM topics")

    # study topics -----------------------------------------------------------
    def list_topics(self) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute("SELECT data FROM topics ORDER BY date, updated_at").fetchall()
        return [json.loads(row["data"]) for row in rows]

    def upsert_topic(self, topic: dict) -> dict:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO topics (id, track, date, data, updated_at) VALUES (?, ?, ?, ?, ?) "
                "ON CONFLICT(id) DO UPDATE SET track = excluded.track, date = excluded.date, "
                "data = excluded.data, updated_at = excluded.updated_at",
                (
                    topic["id"],
                    topic["track"],
                    topic["date"] or "",  # unscheduled targets sort first
                    json.dumps(topic),
                    int(time.time()),
                ),
            )
        return topic

    def topic_ids(self) -> set[str]:
        with self._connect() as conn:
            return {row["id"] for row in conn.execute("SELECT id FROM topics").fetchall()}

    def delete_topic(self, topic_id: str) -> bool:
        with self._connect() as conn:
            cursor = conn.execute("DELETE FROM topics WHERE id = ?", (topic_id,))
        return cursor.rowcount > 0
