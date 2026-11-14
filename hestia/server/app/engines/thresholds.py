import json
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

Level = str  # "green" | "orange" | "red" | "unknown"

_COMPARATORS = {
    "gte": lambda v, b: v >= b,
    "lte": lambda v, b: v <= b,
    "gt": lambda v, b: v > b,
    "lt": lambda v, b: v < b,
    "eq": lambda v, b: v == b,
}


@lru_cache
def load_thresholds() -> dict:
    with open(DATA_DIR / "thresholds.json") as f:
        return json.load(f)


@lru_cache
def load_demo_rules() -> dict:
    """Rules the team chose for the demonstration (escalation to Earth, data
    freshness, how exercise and meals are counted). Kept apart from
    thresholds.json and nasa_reference.json on purpose: they are product
    decisions, not references."""
    with open(DATA_DIR / "demo_rules.json") as f:
        return json.load(f)


def _matches(value: float, conditions: dict) -> bool:
    return all(_COMPARATORS[op](value, bound) for op, bound in conditions.items())


def level_for(indicator: str, value: float) -> Level:
    config = load_thresholds().get(indicator)
    if config is None or "rules" not in config:
        raise KeyError(f"no simple-value thresholds configured for indicator '{indicator}'")
    for rule in config["rules"]:
        if _matches(value, rule["when"]):
            return rule["level"]
    return config.get("default", "orange")


def green_range(indicator: str) -> tuple[float | None, float | None]:
    """(low, high) bounds of the green band, None where the band is open."""
    config = load_thresholds().get(indicator) or {}
    for rule in config.get("rules", []):
        if rule["level"] != "green":
            continue
        when = rule["when"]
        if "eq" in when:
            return when["eq"], when["eq"]
        return when.get("gte", when.get("gt")), when.get("lte", when.get("lt"))
    return None, None


def direction_of(indicator: str, value: float | None) -> str | None:
    """'high' or 'low' relative to the green band; None when inside it or unknown."""
    if value is None:
        return None
    low, high = green_range(indicator)
    if high is not None and value > high:
        return "high"
    if low is not None and value < low:
        return "low"
    return None


def is_critical(indicator: str, value: float | None) -> bool:
    """True when a value is in the band that, on its own, justifies a report
    to Earth (demo rule, see demo_rules.json)."""
    if value is None:
        return False
    bands = load_demo_rules()["earth_report"]["critical"].get(indicator, [])
    return any(_matches(value, band) for band in bands)


def exercise_streak_days(minutes_by_day_desc: list[float]) -> int:
    """Consecutive days under the daily minimum, most recent day first."""
    minimum = load_thresholds()["exercise_streak"]["daily_minimum_min"]
    streak = 0
    for minutes in minutes_by_day_desc:
        if minutes >= minimum:
            break
        streak += 1
    return streak


def exercise_streak_level(minutes_by_day_desc: list[float]) -> Level:
    """minutes_by_day_desc: one value per calendar day, today first."""
    config = load_thresholds()["exercise_streak"]
    streak = exercise_streak_days(minutes_by_day_desc)
    if streak >= config["red_days"]:
        return "red"
    if streak >= config["orange_days"]:
        return "orange"
    return "green"


LEVEL_ORDER = {"unknown": -1, "green": 0, "orange": 1, "red": 2}


def worst_level(levels: list[Level]) -> Level:
    """No level at all means we do not know — never 'green'."""
    if not levels:
        return "unknown"
    return max(levels, key=lambda lvl: LEVEL_ORDER[lvl])
