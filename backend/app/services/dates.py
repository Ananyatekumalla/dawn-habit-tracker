"""Date helpers. Dates travel through the API as ISO strings: YYYY-MM-DD."""

from datetime import date, timedelta


def parse(key: str) -> date:
    return date.fromisoformat(key)


def days_between(start: str, end: str) -> int:
    return (parse(end) - parse(start)).days


def date_range(start: str, count: int) -> list[str]:
    first = parse(start)
    return [(first + timedelta(days=i)).isoformat() for i in range(count)]


def total_days(settings: dict) -> int:
    return days_between(settings["start"], settings["end"]) + 1


def week_dates(settings: dict, week_index: int) -> list[str]:
    total = total_days(settings)
    first = week_index * 7
    return date_range(settings["start"], total)[first : first + 7]
