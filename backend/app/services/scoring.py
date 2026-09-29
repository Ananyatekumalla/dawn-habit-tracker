"""Daily scoring rules. Mirrors frontend/src/lib/scoring.js.

Both implementations are checked against shared/scoring-cases.json,
so if you change a rule here, change it there too and run both test suites.
"""

import math

from app.goals import all_items
from app.services.dates import days_between


def round_half_up(value: float) -> int:
    """Match JavaScript's Math.round (Python's round() uses banker's rounding)."""
    return math.floor(value + 0.5)


def study_target(settings: dict, date_key: str) -> float:
    week = max(0, days_between(settings["start"], date_key) // 7)
    steps_taken = week // settings.get("studyStepEveryWeeks", 2)
    target = settings["studyFrom"] + settings.get("studyStepHours", 0.5) * steps_taken
    return min(settings["studyTo"], target)


def effective_sections(goals: dict, settings: dict) -> list[dict]:
    """Sections with the user's custom goals added.

    Each custom goal is worth a fixed number of points taken from its own
    section: the built-in goals shrink proportionally so the section (and the
    day) still adds up to the same total. Mirrors withCustomHabits() in scoring.js.
    """
    rules = goals.get("customHabitRules", {"weight": 2.5, "maxPerSection": 4})
    customs = settings.get("customHabits") or []
    sections = []
    for sec in goals["sections"]:
        mine = [h for h in customs if h.get("section") == sec["id"]][: rules["maxPerSection"]]
        if not mine:
            sections.append(sec)
            continue
        total = section_max(sec)
        factor = (total - rules["weight"] * len(mine)) / total
        items = [{**item, "weight": item["weight"] * factor} for item in sec["items"]]
        items += [
            {
                "id": h["id"], "name": h["name"], "custom": True, "weight": rules["weight"],
                "type": "count" if h.get("type") == "count" else "check",
                "target": h.get("target") or 1,
            }
            for h in mine
        ]
        sections.append({**sec, "items": items})
    return sections


def _value(item: dict, day: dict):
    if item.get("custom"):
        return (day.get("custom") or {}).get(item["id"])
    return day.get(item["id"])


def item_target(item: dict, settings: dict, date_key: str) -> float:
    if item.get("custom"):
        return float(item.get("target") or 1)
    key = item.get("targetKey")
    if key == "study":
        return study_target(settings, date_key)
    return float(settings[key]) if key else 1.0


def item_fraction(item: dict, day: dict, settings: dict, date_key: str) -> float:
    """How complete one habit is on one day, from 0.0 to 1.0."""
    kind = item["type"]
    value = _value(item, day)
    if kind == "check":
        return 1.0 if value else 0.0
    if kind == "slots":
        return sum(1 for s in (value or []) if s) / item["slots"]
    target = item_target(item, settings, date_key)
    return min(1.0, (value or 0) / target) if target > 0 else 0.0


def is_item_done(item: dict, day: dict, settings: dict, date_key: str) -> bool:
    return item_fraction(item, day, settings, date_key) >= 1.0


def section_points(section: dict, day: dict, settings: dict, date_key: str) -> float:
    return sum(
        item_fraction(item, day, settings, date_key) * item["weight"] for item in section["items"]
    )


def section_max(section: dict) -> float:
    return sum(item["weight"] for item in section["items"])


def day_score(goals: dict, day: dict, settings: dict, date_key: str) -> int:
    sections = effective_sections(goals, settings)
    total = sum(section_points(sec, day, settings, date_key) for sec in sections)
    return round_half_up(total)


def is_logged(goals: dict, day: dict | None) -> bool:
    """A day counts as logged once any habit or journal entry has been recorded."""
    if not day:
        return False
    for item in all_items(goals):
        value = day.get(item["id"])
        if isinstance(value, list) and any(value):
            return True
        if value and not isinstance(value, list):
            return True
    if any((day.get("custom") or {}).values()):
        return True
    return bool(day.get("journal"))
