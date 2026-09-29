"""Scoring must match shared/scoring-cases.json (the JS tests use the same file)."""

import json
import unittest

from app.config import PROJECT_DIR
from app.goals import load_goals
from app.services import scoring

GOALS = load_goals(str(PROJECT_DIR / "shared" / "goals.json"))
CASES = json.loads((PROJECT_DIR / "shared" / "scoring-cases.json").read_text())


class StudyTargetTests(unittest.TestCase):
    def test_ramp_matches_shared_cases(self):
        for case in CASES["studyTargets"]:
            with self.subTest(date=case["date"]):
                got = scoring.study_target(CASES["settings"], case["date"])
                self.assertEqual(got, case["expected"])


class DayScoreTests(unittest.TestCase):
    def test_scores_match_shared_cases(self):
        for case in CASES["dayScores"]:
            with self.subTest(case["name"]):
                got = scoring.day_score(GOALS, case["day"], CASES["settings"], case["date"])
                self.assertEqual(got, case["expected"])

    def test_weights_add_up_to_100(self):
        total = sum(scoring.section_max(sec) for sec in GOALS["sections"])
        self.assertEqual(total, 100)

    def test_round_half_up_matches_javascript(self):
        self.assertEqual(scoring.round_half_up(42.5), 43)
        self.assertEqual(scoring.round_half_up(43.5), 44)

    def test_empty_day_is_not_logged(self):
        self.assertFalse(scoring.is_logged(GOALS, {}))
        self.assertFalse(scoring.is_logged(GOALS, {"naukri": [False, False, False]}))
        self.assertTrue(scoring.is_logged(GOALS, {"steps": 1200}))


class CustomGoalTests(unittest.TestCase):
    def test_custom_goals_match_shared_cases(self):
        settings = {**CASES["settings"], "customHabits": CASES["customCases"]["customHabits"]}
        for case in CASES["customCases"]["dayScores"]:
            with self.subTest(case["name"]):
                got = scoring.day_score(GOALS, case["day"], settings, case["date"])
                self.assertEqual(got, case["expected"])

    def test_sections_still_total_100(self):
        settings = {"customHabits": CASES["customCases"]["customHabits"]}
        sections = scoring.effective_sections(GOALS, settings)
        self.assertAlmostEqual(sum(scoring.section_max(s) for s in sections), 100)


class FormatTests(unittest.TestCase):
    def test_12_hour_times(self):
        from app.services.reports import _12h

        self.assertEqual(_12h("04:30"), "4:30 AM")
        self.assertEqual(_12h("00:05"), "12:05 AM")
        self.assertEqual(_12h("13:00"), "1:00 PM")


if __name__ == "__main__":
    unittest.main()
