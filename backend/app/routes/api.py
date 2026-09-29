"""HTTP routes. Each handler validates input, calls a service, returns JSON."""

from datetime import date

from flask import Blueprint, jsonify, request

from app.errors import ValidationError
from app.routes.helpers import current_settings, goals, repo
from app.services import reports
from app.services.dates import total_days
from app.services.validation import clean_day, clean_settings, clean_topic, validate_date

api = Blueprint("api", __name__, url_prefix="/api")


def _json_body() -> dict:
    body = request.get_json(silent=True)
    if body is None:
        raise ValidationError("Send a JSON body with Content-Type: application/json.")
    return body


@api.get("/health")
def health():
    return jsonify(status="ok")


@api.get("/goals")
def get_goals():
    return jsonify(goals())


@api.get("/settings")
def get_settings():
    return jsonify(current_settings())


@api.put("/settings")
def put_settings():
    section_ids = {sec["id"] for sec in goals()["sections"]}
    settings = clean_settings(_json_body(), current_settings(), section_ids)
    repo().save_settings(settings)
    return jsonify(current_settings())


@api.get("/days")
def list_days():
    settings = current_settings()
    start = validate_date(request.args.get("from", settings["start"]))
    end = validate_date(request.args.get("to", settings["end"]))
    return jsonify(repo().get_days(start, end))


@api.patch("/days/<date_key>")
def patch_day(date_key: str):
    date_key = validate_date(date_key)
    patch = clean_day(_json_body(), goals())
    return jsonify(repo().merge_day(date_key, patch))


@api.delete("/days")
def delete_days():
    repo().delete_all()
    return "", 204


@api.get("/topics")
def list_topics():
    return jsonify(repo().list_topics())


@api.put("/topics/<topic_id>")
def put_topic(topic_id: str):
    track_ids = {t["id"] for t in goals()["studyTracks"]}
    topic = clean_topic(topic_id, _json_body(), track_ids)
    return jsonify(repo().upsert_topic(topic))


@api.delete("/topics/<topic_id>")
def delete_topic(topic_id: str):
    repo().delete_topic(topic_id)  # deleting twice is fine (idempotent)
    return "", 204


@api.get("/reports/week/<int:week_index>")
def week_report(week_index: int):
    settings = current_settings()
    week_count = (total_days(settings) + 6) // 7
    if not 0 <= week_index < week_count:
        raise ValidationError(f"Week must be between 0 and {week_count - 1}.")
    days = repo().get_days(settings["start"], settings["end"])
    topics = repo().list_topics()
    return jsonify(reports.week_report(goals(), settings, days, week_index, topics))


@api.get("/reports/overall")
def overall_report():
    settings = current_settings()
    today = validate_date(request.args.get("today", date.today().isoformat()))
    days = repo().get_days(settings["start"], settings["end"])
    topics = repo().list_topics()
    return jsonify(reports.overall_report(goals(), settings, days, today, topics))
