"""Loads the shared goals config (shared/goals.json).

The same file is imported by the React app, so scoring rules and defaults
live in exactly one place.
"""

import json
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=4)
def load_goals(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def all_items(goals: dict) -> list[dict]:
    """Flatten sections into one list of items, each tagged with its section id."""
    return [{**item, "section": sec["id"]} for sec in goals["sections"] for item in sec["items"]]
