"""Target seeding and unscheduled topics."""

import json
import tempfile
import unittest
from pathlib import Path

from app import create_app
from app.config import PROJECT_DIR, Config
from app.services.targets import slugify, target_id


def client_with_targets(targets: dict, db_path: Path | None = None):
    goals = json.loads((PROJECT_DIR / "shared" / "goals.json").read_text())
    for track in goals["studyTracks"]:
        track["targets"] = targets.get(track["id"], [])
    tmp = Path(tempfile.mkdtemp())
    goals_path = tmp / "goals.json"
    goals_path.write_text(json.dumps(goals))
    config = Config(
        database_path=db_path or tmp / "db.sqlite3",
        goals_path=goals_path,
        cors_origins=(),
    )
    return create_app(config).test_client()


class SlugTests(unittest.TestCase):
    def test_slug_matches_javascript(self):
        # Same cases as frontend/src/lib/topics.test.js
        self.assertEqual(slugify("SQL: Window Functions!"), "sql-window-functions")
        self.assertEqual(slugify("  React / Redux  "), "react-redux")
        self.assertEqual(slugify("!!!"), "item")
        self.assertEqual(target_id("ai", "RAG basics"), "tg-ai-rag-basics")


class SeedTests(unittest.TestCase):
    def test_seeds_once_and_never_duplicates(self):
        db = Path(tempfile.mkdtemp()) / "db.sqlite3"
        client = client_with_targets({"data": ["Excel", "SQL joins"], "ai": ["RAG basics"]}, db)
        topics = client.get("/api/topics").json
        self.assertEqual(len(topics), 3)
        self.assertTrue(all(t["date"] is None for t in topics))

        # Delete one, restart the app: it must not come back.
        client.delete("/api/topics/tg-data-excel")
        client = client_with_targets({"data": ["Excel", "SQL joins"], "ai": ["RAG basics"]}, db)
        self.assertEqual(len(client.get("/api/topics").json), 2)

        # Adding a new target later seeds only the new one.
        more = {"data": ["Excel", "SQL joins", "Pandas"], "ai": ["RAG basics"]}
        client = client_with_targets(more, db)
        titles = sorted(t["title"] for t in client.get("/api/topics").json)
        self.assertEqual(titles, ["Pandas", "RAG basics", "SQL joins"])

    def test_links_are_seeded_and_filled_in(self):
        db = Path(tempfile.mkdtemp()) / "db.sqlite3"
        client_with_targets({"data": ["Excel"]}, db)  # seeded without a link
        linked = {"data": [{"title": "Excel", "url": "https://example.com/excel"}]}
        client = client_with_targets(linked, db)
        self.assertEqual(client.get("/api/topics").json[0]["url"], "https://example.com/excel")

    def test_scheduling_a_target(self):
        client = client_with_targets({"mern": ["Express middleware"]})
        topic = client.get("/api/topics").json[0]
        res = client.put(f"/api/topics/{topic['id']}", json={**topic, "date": "2026-09-28"})
        self.assertEqual(res.json["date"], "2026-09-28")

    def test_old_naukri_default_is_upgraded(self):
        client = client_with_targets({})
        client.put("/api/settings", json={"naukri": ["09:00", "13:00", "18:00"]})
        self.assertEqual(client.get("/api/settings").json["naukri"], ["08:00", "16:00", "22:00"])
        client.put("/api/settings", json={"naukri": ["07:00", "15:00", "21:00"]})
        self.assertEqual(client.get("/api/settings").json["naukri"], ["07:00", "15:00", "21:00"])


if __name__ == "__main__":
    unittest.main()
