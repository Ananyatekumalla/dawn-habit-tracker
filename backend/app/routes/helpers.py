"""Small helpers shared by the route modules."""

from flask import current_app

from app.goals import load_goals


def goals() -> dict:
    return load_goals(str(current_app.config["DAWN"].goals_path))


def repo():
    return current_app.extensions["tracker_repo"]


def current_settings() -> dict:
    """Saved settings layered over the shared defaults (new keys get defaults).

    Values still equal to an old default are upgraded to the new default,
    e.g. the Naukri times moving from 9/1/6 to 8 AM, 4 PM and 10 PM.
    """
    config = goals()
    settings = {**config["defaults"], **(repo().get_settings() or {})}
    for key, old_values in config.get("legacyDefaults", {}).items():
        if settings.get(key) in old_values:
            settings[key] = config["defaults"][key]
    return settings
