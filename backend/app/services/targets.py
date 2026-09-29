"""Seeds each study track's target list from shared/goals.json.

Target ids are derived from the track and title, so seeding is idempotent:
running it again (or on another device) never creates duplicates, and a
target you've deleted in the app stays deleted until its title changes.
"""

import re

MAX_SLUG = 40


def slugify(text: str) -> str:
    """'SQL: Window Functions!' -> 'sql-window-functions'. Mirrors topics.js."""
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:MAX_SLUG].strip("-") or "item"


def target_id(track_id: str, title: str) -> str:
    return f"tg-{track_id}-{slugify(title)}"


def _as_target(entry) -> tuple[str, str]:
    """Targets are either a plain title or {"title": ..., "url": ...}."""
    if isinstance(entry, str):
        return entry.strip(), ""
    return entry["title"].strip(), entry.get("url", "")


def target_topics(goals: dict) -> list[dict]:
    topics, seen = [], set()
    for track in goals["studyTracks"]:
        for entry in track.get("targets", []):
            title, url = _as_target(entry)
            topic_id = target_id(track["id"], title)
            if topic_id in seen:
                continue
            seen.add(topic_id)
            topics.append({
                "id": topic_id, "track": track["id"], "title": title[:200], "url": url,
                "notes": "", "date": None, "done": False, "doneDate": None,
            })
    return topics


def seed_targets(repo, goals: dict) -> int:
    """Insert targets never seeded before, and fill in course links on existing
    targets that don't have one yet (your own edits are never overwritten).
    Returns how many targets were added."""
    seeded = repo.get_meta("seeded_targets") or []
    configured = target_topics(goals)
    existing = {t["id"]: t for t in repo.list_topics()}

    new = [t for t in configured if t["id"] not in seeded]
    for topic in new:
        if topic["id"] not in existing:
            repo.upsert_topic(topic)
    if new:
        repo.set_meta("seeded_targets", seeded + [t["id"] for t in new])

    for topic in configured:
        current = existing.get(topic["id"])
        if current and topic["url"] and not current.get("url"):
            repo.upsert_topic({**current, "url": topic["url"]})
    return len(new)
