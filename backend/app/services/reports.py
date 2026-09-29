"""Weekly and overall performance reports."""

from app.goals import all_items
from app.services import scoring
from app.services.dates import date_range, total_days, week_dates


def _12h(hm: str) -> str:
    """'04:30' -> '4:30 AM' (matches how the React app shows times)."""
    hour, minute = map(int, hm.split(":"))
    suffix = "AM" if hour < 12 else "PM"
    return f"{hour % 12 or 12}:{minute:02d} {suffix}"


def _pct(part: float, whole: float) -> int:
    return scoring.round_half_up(part / whole * 100) if whole else 0


def _day_row(goals: dict, settings: dict, date_key: str, day: dict) -> dict:
    logged = scoring.is_logged(goals, day)
    sections = scoring.effective_sections(goals, settings)
    return {
        "date": date_key,
        "logged": logged,
        "score": scoring.day_score(goals, day, settings, date_key) if logged else None,
        "sections": {
            sec["id"]: round(scoring.section_points(sec, day, settings, date_key), 2)
            for sec in sections
        },
        "steps": day.get("steps", 0),
        "study": day.get("study", 0),
        "studyTarget": scoring.study_target(settings, date_key),
        "apps": day.get("apps", 0),
        "naukri": sum(1 for s in day.get("naukri", []) if s),
        "wake": bool(day.get("wake")),
        "project": day.get("project", 0),
        "weight": day.get("weight"),
        "gym": bool(day.get("gym")),
    }


def _verdict(goals: dict, settings: dict, rows: list[dict], consistency: dict) -> list[str]:
    logged = [r for r in rows if r["logged"]]
    if not logged:
        return ["Nothing logged this week yet. Start with today's card."]

    section_pct = sorted(
        (
            (sec["name"], _pct(sum(r["sections"][sec["id"]] for r in logged),
                               scoring.section_max(sec) * len(logged)))
            for sec in goals["sections"]
        ),
        key=lambda pair: pair[1],
        reverse=True,
    )
    weakest_habit = min(consistency.items(), key=lambda pair: pair[1])
    names = {item["id"]: item["name"] for item in all_items(goals)}

    apps = sum(r["apps"] for r in rows)
    naukri = sum(r["naukri"] for r in rows)
    project = sum(r["project"] for r in rows)
    avg_steps = sum(r["steps"] for r in logged) // len(logged)
    avg_score = sum(r["score"] for r in logged) / len(logged)
    early = sum(1 for r in logged if r["wake"])

    lines = [
        f"Strongest area: {section_pct[0][0]} ({section_pct[0][1]}%). "
        f"Weakest: {section_pct[-1][0]} ({section_pct[-1][1]}%).",
        f"Habit that slipped most: {names[weakest_habit[0]]} ({weakest_habit[1]}% of logged days).",
        f"You were up by {_12h(settings['wake'])} on {early} of {len(logged)} logged days.",
        "Application target met for the week."
        if apps >= settings["apps"] * len(rows)
        else f"Applications: {apps} of {settings['apps'] * len(rows)} planned.",
        "Naukri profile kept fresh every day."
        if naukri >= 3 * len(rows)
        else f"Naukri updates: {naukri} of {3 * len(rows)}.",
        "Night project target met every night."
        if project >= settings["projectHours"] * len(rows)
        else f"Night project: {project}h of {settings['projectHours'] * len(rows)}h.",
        "Steps goal averaged. Nice."
        if avg_steps >= settings["steps"]
        else f"Average steps were {settings['steps'] - avg_steps:,} short of your goal.",
    ]
    if avg_score >= 80:
        lines.append("Excellent week. Keep this rhythm.")
    elif avg_score >= 60:
        lines.append("Solid week. Tighten up the weakest area next week.")
    else:
        lines.append("Tough week. Pick two habits to protect next week and build back up.")
    return lines


def _weight_change(rows: list[dict]) -> dict:
    """First and last weight logged in the period (None when not logged)."""
    weights = [r["weight"] for r in rows if r.get("weight")]
    if not weights:
        return {"weightStart": None, "weightEnd": None}
    return {"weightStart": weights[0], "weightEnd": weights[-1]}


def _treat(settings: dict, rows: list[dict], week_index: int) -> dict:
    """A treat is earned with enough good days (score at or above rewardScore) in the week."""
    good = sum(1 for r in rows if r["logged"] and r["score"] >= settings["rewardScore"])
    chosen = (settings.get("treats") or {}).get(str(week_index), {})
    return {
        "goodDays": good,
        "needed": settings["rewardDays"],
        "earned": good >= settings["rewardDays"],
        "rewardId": chosen.get("rewardId", ""),
        "enjoyed": chosen.get("enjoyed", False),
    }


def study_summary(goals: dict, topics: list[dict], dates: list[str] | None = None) -> dict:
    """Per-track counts of planned and covered topics, optionally limited to some dates."""
    in_range = set(dates) if dates else None
    summary = {}
    for track in goals["studyTracks"]:
        mine = [t for t in topics if t["track"] == track["id"]]
        planned = [t for t in mine if in_range is None or t["date"] in in_range]
        covered = [
            t for t in mine
            if t["done"] and (in_range is None or (t.get("doneDate") or t["date"]) in in_range)
        ]
        summary[track["id"]] = {"planned": len(planned), "covered": len(covered)}
    return summary


def _study_line(goals: dict, study: dict) -> str | None:
    covered = {tid: v["covered"] for tid, v in study.items()}
    if not any(v["planned"] for v in study.values()) and not any(covered.values()):
        return None
    names = {t["id"]: t["name"] for t in goals["studyTracks"]}
    parts = ", ".join(f"{names[tid]} {n}" for tid, n in covered.items())
    quiet = [names[tid] for tid, n in covered.items() if n == 0]
    line = f"Topics covered: {parts}."
    return line + (f" Nothing covered in {' and '.join(quiet)} yet." if quiet else "")


def week_report(
    goals: dict, settings: dict, days: dict, week_index: int, topics: list[dict] | None = None
) -> dict:
    dates = week_dates(settings, week_index)
    rows = [_day_row(goals, settings, d, days.get(d, {})) for d in dates]
    logged = [r for r in rows if r["logged"]]

    consistency = {}
    for item in all_items(goals):
        done = sum(
            1 for r in logged
            if scoring.is_item_done(item, days.get(r["date"], {}), settings, r["date"])
        )
        consistency[item["id"]] = _pct(done, len(logged))

    study = study_summary(goals, topics or [], dates)
    verdict = _verdict(goals, settings, rows, consistency)
    study_line = _study_line(goals, study)
    if study_line and len(verdict) > 1:
        verdict.insert(-1, study_line)

    def average(key: str) -> float:
        return sum(r[key] for r in logged) / len(logged) if logged else 0

    return {
        "weekIndex": week_index,
        "weekCount": (total_days(settings) + 6) // 7,
        "days": rows,
        "summary": {
            "avgScore": scoring.round_half_up(average("score")),
            "avgSteps": scoring.round_half_up(average("steps")),
            "apps": sum(r["apps"] for r in rows),
            "appsTarget": settings["apps"] * len(rows),
            "naukri": sum(r["naukri"] for r in rows),
            "naukriTarget": 3 * len(rows),
            "gymDays": sum(1 for r in rows if r["gym"]),
            "studyHours": sum(r["study"] for r in rows),
            "studyTarget": sum(r["studyTarget"] for r in rows),
            "projectHours": sum(r["project"] for r in rows),
            "projectTarget": settings["projectHours"] * len(rows),
            **_weight_change(rows),
        },
        "sectionPoints": {
            sec["id"]: round(sum(r["sections"][sec["id"]] for r in rows), 1)
            for sec in goals["sections"]
        },
        "consistency": consistency,
        "study": study,
        "treat": _treat(settings, rows, week_index),
        "verdict": verdict,
    }


def overall_report(
    goals: dict, settings: dict, days: dict, today: str, topics: list[dict] | None = None
) -> dict:
    run = best = 0
    scores, apps, steps, hours = [], 0, 0, 0
    for date_key in date_range(settings["start"], total_days(settings)):
        if date_key > today:
            break
        day = days.get(date_key, {})
        if scoring.is_logged(goals, day):
            score = scoring.day_score(goals, day, settings, date_key)
            scores.append(score)
            apps += day.get("apps", 0)
            steps += day.get("steps", 0)
            hours += day.get("study", 0)
            run += 1
        elif date_key != today:
            run = 0
        best = max(best, run)

    return {
        "avgScore": scoring.round_half_up(sum(scores) / len(scores)) if scores else 0,
        "currentStreak": run,
        "bestStreak": best,
        "daysLogged": len(scores),
        "totalApps": apps,
        "totalSteps": steps,
        "totalStudyHours": hours,
        "study": study_summary(goals, topics or []),
    }
