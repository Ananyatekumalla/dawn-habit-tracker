"""End-to-end tests of the HTTP API against a temporary database."""

import json
import tempfile
import unittest
from pathlib import Path

from app import create_app
from app.config import PROJECT_DIR, Config


def make_client(token: str = ""):
    """Test app with the real goals but no seeded targets, so counts start at zero."""
    tmp = Path(tempfile.mkdtemp())
    goals = json.loads((PROJECT_DIR / "shared" / "goals.json").read_text())
    for track in goals["studyTracks"]:
        track["targets"] = []
    (tmp / "goals.json").write_text(json.dumps(goals))
    config = Config(
        database_path=tmp / "test.sqlite3",
        goals_path=tmp / "goals.json",
        cors_origins=("http://localhost:5173",),
        api_token=token,
        testing=True,
    )
    return create_app(config).test_client()


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = make_client()

    def test_settings_default_then_update(self):
        self.assertEqual(self.client.get("/api/settings").json["wake"], "04:30")
        res = self.client.put("/api/settings", json={"apps": 7, "wake": "05:00"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.client.get("/api/settings").json["apps"], 7)

    def test_rejects_bad_settings(self):
        res = self.client.put("/api/settings", json={"start": "2026-12-20", "end": "2026-12-01"})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json["error"], "validation_error")

    def test_patch_day_merges_and_drops_unknown_fields(self):
        self.client.patch("/api/days/2026-09-28", json={"gym": True, "hacker": "x"})
        res = self.client.patch("/api/days/2026-09-28", json={"steps": 8000})
        self.assertEqual(res.json, {"gym": True, "steps": 8000})

    def test_patch_day_rejects_bad_date(self):
        self.assertEqual(self.client.patch("/api/days/not-a-date", json={}).status_code, 400)

    def test_week_report(self):
        self.client.patch("/api/days/2026-09-28", json={"wake": True, "gym": True, "apps": 5})
        report = self.client.get("/api/reports/week/0").json
        self.assertEqual(report["days"][0]["score"], 35)
        self.assertEqual(report["summary"]["apps"], 5)
        self.assertEqual(len(report["verdict"]), 8)

    def test_week_out_of_range(self):
        self.assertEqual(self.client.get("/api/reports/week/99").status_code, 400)

    def test_overall_streak(self):
        perfect = {"wake": True, "gym": True, "breakfast": True, "lunch": True, "meds": 1,
                   "walkLunch": True, "walkDinner": True, "steps": 10000, "apps": 5,
                   "naukri": [True, True, True], "study": 4, "fast": True,
                   "project": 2}
        for d in ("2026-09-28", "2026-09-29"):
            self.client.patch(f"/api/days/{d}", json=perfect)
        report = self.client.get("/api/reports/overall?today=2026-09-29").json
        self.assertEqual(report["currentStreak"], 2)
        self.assertEqual(report["avgScore"], 100)

    def test_cors_header_for_allowed_origin_only(self):
        ok = self.client.get("/api/health", headers={"Origin": "http://localhost:5173"})
        bad = self.client.get("/api/health", headers={"Origin": "https://evil.example"})
        self.assertIn("Access-Control-Allow-Origin", ok.headers)
        self.assertNotIn("Access-Control-Allow-Origin", bad.headers)


class TopicTests(unittest.TestCase):
    def setUp(self):
        self.client = make_client()

    def topic(self, **overrides):
        return {"title": "SQL window functions", "track": "data", "date": "2026-09-28", **overrides}

    def test_create_list_update_delete(self):
        self.assertEqual(self.client.put("/api/topics/t1", json=self.topic()).status_code, 200)
        self.client.put("/api/topics/t1", json=self.topic(done=True, doneDate="2026-09-29"))
        topics = self.client.get("/api/topics").json
        self.assertEqual(len(topics), 1)
        self.assertTrue(topics[0]["done"])
        self.assertEqual(self.client.delete("/api/topics/t1").status_code, 204)
        self.assertEqual(self.client.get("/api/topics").json, [])

    def test_rejects_unknown_track_and_empty_title(self):
        bad = [
            ("t1", self.topic(track="x")),
            ("t1", self.topic(title=" ")),
            ("bad id!", self.topic()),
        ]
        for topic_id, body in bad:
            with self.subTest(topic_id=topic_id, body=body):
                res = self.client.put(f"/api/topics/{topic_id}", json=body)
                self.assertEqual(res.status_code, 400)

    def test_week_report_counts_topics_by_track(self):
        self.client.put("/api/topics/a", json=self.topic(done=True, doneDate="2026-09-28"))
        self.client.put("/api/topics/b", json=self.topic(track="ai"))
        self.client.patch("/api/days/2026-09-28", json={"study": 2})
        report = self.client.get("/api/reports/week/0").json
        self.assertEqual(report["study"]["data"], {"planned": 1, "covered": 1})
        self.assertEqual(report["study"]["ai"], {"planned": 1, "covered": 0})
        self.assertTrue(any(line.startswith("Topics covered") for line in report["verdict"]))

    def test_erase_all_removes_topics(self):
        self.client.put("/api/topics/a", json=self.topic())
        self.client.delete("/api/days")
        self.assertEqual(self.client.get("/api/topics").json, [])


class NewFieldTests(unittest.TestCase):
    def setUp(self):
        self.client = make_client()

    def test_weight_and_project_are_saved(self):
        res = self.client.patch("/api/days/2026-09-28", json={"weight": 62.4, "project": 2,
                                                               "projectId": "rfm-dashboard"})
        self.assertEqual(res.json["weight"], 62.4)
        report = self.client.get("/api/reports/week/0").json
        self.assertEqual(report["summary"]["weightEnd"], 62.4)
        self.assertEqual(report["summary"]["projectHours"], 2)

    def test_topic_links_must_be_http(self):
        body = {"title": "SQL", "track": "data", "url": "javascript:alert(1)"}
        self.assertEqual(self.client.put("/api/topics/x", json=body).status_code, 400)
        body["url"] = "https://www.kaggle.com/learn/intro-to-sql"
        self.assertEqual(self.client.put("/api/topics/x", json=body).json["url"], body["url"])


class RewardAndCustomTests(unittest.TestCase):
    def setUp(self):
        self.client = make_client()

    def test_custom_goal_round_trip(self):
        habit = {"id": "water", "section": "health", "name": "Drink 3L water", "type": "check",
                 "time": "10:00"}
        res = self.client.put("/api/settings", json={"customHabits": [habit]})
        self.assertEqual(res.json["customHabits"][0]["time"], "10:00")
        day = self.client.patch("/api/days/2026-09-28", json={"custom": {"water": True}}).json
        self.assertEqual(day["custom"], {"water": True})
        bad = {**habit, "section": "nope"}
        self.assertEqual(self.client.put("/api/settings", json={"customHabits": [bad]}).status_code,
                         400)

    def test_treat_after_five_good_days(self):
        good = {"wake": True, "gym": True, "breakfast": True, "lunch": True, "apps": 5,
                "naukri": [True, True, True], "study": 4, "project": 2}  # 75 points
        for d in range(28, 31):
            self.client.patch(f"/api/days/2026-09-{d}", json=good)
        self.assertFalse(self.client.get("/api/reports/week/0").json["treat"]["earned"])
        for d in ("2026-10-01", "2026-10-02"):
            self.client.patch(f"/api/days/{d}", json=good)
        self.client.put("/api/settings", json={"treats": {"0": {"rewardId": "icecream"}}})
        treat = self.client.get("/api/reports/week/0").json["treat"]
        self.assertEqual((treat["goodDays"], treat["earned"], treat["rewardId"]),
                         (5, True, "icecream"))


class AuthTests(unittest.TestCase):
    def test_token_required_when_configured(self):
        client = make_client(token="secret")
        self.assertEqual(client.get("/api/settings").status_code, 401)
        ok = client.get("/api/settings", headers={"Authorization": "Bearer secret"})
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(client.get("/api/health").status_code, 200)


if __name__ == "__main__":
    unittest.main()
