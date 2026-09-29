"""Whitelist-based validation. Unknown fields are dropped, values are clamped."""

import re
from datetime import date

from app.errors import ValidationError
from app.goals import all_items

TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
MAX_TEXT = 5000
MAX_LIST_ITEMS = 30


def validate_date(value: str) -> str:
    try:
        return date.fromisoformat(value).isoformat()
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"'{value}' is not a valid date (use YYYY-MM-DD).") from exc


def _time(value, name: str) -> str:
    if value in ("", None):
        return ""
    if not isinstance(value, str) or not TIME_RE.match(value):
        raise ValidationError(f"'{name}' must be a time like 06:30.")
    return value


def _number(value, name: str, low: float, high: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValidationError(f"'{name}' must be a number.")
    return max(low, min(high, value))


def _text_list(value, name: str) -> list[str]:
    if not isinstance(value, list):
        raise ValidationError(f"'{name}' must be a list.")
    return [str(v)[:200] for v in value if str(v).strip()][:MAX_LIST_ITEMS]


def clean_day(payload: dict, goals: dict) -> dict:
    """Return only the known, well-typed fields from a day update."""
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")
    clean: dict = {}
    for item in all_items(goals):
        key = item["id"]
        if key not in payload:
            continue
        value = payload[key]
        if item["type"] == "check":
            clean[key] = bool(value)
        elif item["type"] == "slots":
            if not isinstance(value, list):
                raise ValidationError(f"'{key}' must be a list of true/false values.")
            clean[key] = [bool(v) for v in value[: item["slots"]]]
        else:
            clean[key] = _number(value, key, 0, 100_000)

    for key in ("wakeTime", "fastStart", "fastEnd"):
        if key in payload:
            clean[key] = _time(payload[key], key)
    if "journal" in payload:
        clean["journal"] = str(payload["journal"])[:MAX_TEXT]
    for key in ("dos", "donts"):
        if key in payload:
            clean[key] = _text_list(payload[key], key)
    if "mood" in payload:
        clean["mood"] = int(_number(payload["mood"], "mood", 0, 5))
    if "dealt" in payload:
        clean["dealt"] = bool(payload["dealt"])
    if "custom" in payload:
        clean["custom"] = _custom_values(payload["custom"])
    if "weight" in payload:
        weight = payload["weight"]
        clean["weight"] = None if weight in (None, "", 0) else _number(weight, "weight", 20, 400)
    if "projectId" in payload:
        project_id = str(payload["projectId"] or "")
        if project_id and not ID_RE.match(project_id):
            raise ValidationError("'projectId' may only use letters, numbers, - and _.")
        clean["projectId"] = project_id
    return clean


ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
URL_RE = re.compile(r"^https?://\S{3,}$")


def _url(value) -> str:
    """Only http(s) links are kept, so a stored link can never run script."""
    value = str(value or "").strip()[:500]
    if value and not URL_RE.match(value):
        raise ValidationError("Links must start with http:// or https://.")
    return value
MAX_TOPIC = 200


def clean_topic(topic_id: str, payload: dict, track_ids: set[str]) -> dict:
    """Validate a full study topic. The client creates the id so it works offline."""
    if not ID_RE.match(topic_id):
        raise ValidationError("Topic id may only use letters, numbers, - and _.")
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")
    title = str(payload.get("title", "")).strip()
    if not title:
        raise ValidationError("A topic needs a title.")
    track = payload.get("track")
    if track not in track_ids:
        raise ValidationError(f"'track' must be one of: {', '.join(sorted(track_ids))}.")
    done = bool(payload.get("done"))
    done_date = payload.get("doneDate")
    return {
        "id": topic_id,
        "track": track,
        "title": title[:MAX_TOPIC],
        "notes": str(payload.get("notes", ""))[:MAX_TEXT],
        "url": _url(payload.get("url")),
        # No date means the topic is a target that isn't scheduled yet.
        "date": validate_date(payload["date"]) if payload.get("date") else None,
        "done": done,
        "doneDate": validate_date(done_date) if done and done_date else None,
    }


MAX_CUSTOM = 16
MAX_REWARDS = 12


def _custom_values(value) -> dict:
    """Day values for custom goals: {goalId: true/false or a number}."""
    if not isinstance(value, dict):
        raise ValidationError("'custom' must be an object.")
    clean = {}
    for key, v in list(value.items())[:MAX_CUSTOM]:
        if not ID_RE.match(str(key)):
            continue
        clean[key] = v if isinstance(v, bool) else _number(v, key, 0, 100_000)
    return clean


def _custom_habits(value, section_ids: set[str]) -> list[dict]:
    if not isinstance(value, list):
        raise ValidationError("'customHabits' must be a list.")
    habits = []
    for h in value[:MAX_CUSTOM]:
        if not isinstance(h, dict) or not ID_RE.match(str(h.get("id", ""))):
            raise ValidationError("Each custom goal needs a simple id.")
        if h.get("section") not in section_ids:
            raise ValidationError("Each custom goal needs a valid section.")
        name = str(h.get("name", "")).strip()[:60]
        if not name:
            raise ValidationError("Each custom goal needs a name.")
        kind = "count" if h.get("type") == "count" else "check"
        habits.append({
            "id": h["id"], "section": h["section"], "name": name, "type": kind,
            "target": (
                _number(h.get("target") or 1, "target", 0.1, 100_000) if kind == "count" else None
            ),
            "unit": str(h.get("unit") or "")[:16],
            "time": _time(h.get("time"), "time"),
        })
    return habits


def _rewards(value) -> list[dict]:
    if not isinstance(value, list) or not value:
        raise ValidationError("'rewards' must be a non-empty list.")
    out = []
    for r in value[:MAX_REWARDS]:
        if not isinstance(r, dict) or not ID_RE.match(str(r.get("id", ""))):
            raise ValidationError("Each reward needs a simple id.")
        name = str(r.get("name", "")).strip()[:40]
        if name:
            out.append({"id": r["id"], "emoji": str(r.get("emoji") or "🎁")[:8], "name": name})
    return out


def _treats(value) -> dict:
    """{weekIndex: {"rewardId": ..., "enjoyed": bool}}"""
    if not isinstance(value, dict):
        raise ValidationError("'treats' must be an object.")
    out = {}
    for week, t in value.items():
        if not str(week).isdigit() or not isinstance(t, dict):
            continue
        reward = str(t.get("rewardId") or "")
        out[str(week)] = {
            "rewardId": reward if ID_RE.match(reward) else "",
            "enjoyed": bool(t.get("enjoyed")),
        }
    return out


def clean_settings(payload: dict, current: dict, section_ids: set[str] | None = None) -> dict:
    """Apply a partial settings update on top of the current settings."""
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")
    merged = {**current}
    if "name" in payload:
        merged["name"] = str(payload["name"]).strip()[:40]
    if "currentProject" in payload:
        project = str(payload["currentProject"] or "").strip()[:64]
        merged["currentProject"] = project if ID_RE.match(project) else current["currentProject"]
    for key in ("start", "end"):
        if key in payload:
            merged[key] = validate_date(payload[key])
    for key in ("wake", "medTime", "lunchWalk", "dinnerWalk", "applyBy", "projectTime"):
        if key in payload:
            merged[key] = _time(payload[key], key) or current[key]
    limits = {
        "meds": (1, 6), "steps": (1000, 40000), "apps": (1, 30), "studyFrom": (1, 12),
        "studyTo": (1, 12), "studyStepHours": (0.25, 2), "studyStepEveryWeeks": (1, 4),
        "fast": (12, 24), "projectHours": (0.5, 6), "goalWeight": (0, 400),
        "rewardDays": (1, 7), "rewardScore": (10, 100),
    }
    for key, (low, high) in limits.items():
        if key in payload:
            merged[key] = _number(payload[key], key, low, high)
    if "naukri" in payload:
        times = payload["naukri"]
        if not isinstance(times, list) or len(times) != 3:
            raise ValidationError("'naukri' must be a list of 3 times.")
        merged["naukri"] = [
            _time(new, "naukri") or old for new, old in zip(times, current["naukri"], strict=True)
        ]

    if "customHabits" in payload:
        merged["customHabits"] = _custom_habits(payload["customHabits"], section_ids or set())
    if "rewards" in payload:
        merged["rewards"] = _rewards(payload["rewards"])
    if "treats" in payload:
        merged["treats"] = _treats(payload["treats"])

    if merged["end"] <= merged["start"]:
        raise ValidationError("End date must come after the start date.")
    merged["studyTo"] = max(merged["studyTo"], merged["studyFrom"])
    return merged
