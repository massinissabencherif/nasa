import json
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

Level = str  # "green" | "orange" | "red"

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


def level_for(indicator: str, value: float) -> Level:
    config = load_thresholds().get(indicator)
    if config is None or "rules" not in config:
        raise KeyError(f"no simple-value thresholds configured for indicator '{indicator}'")
    for rule in config["rules"]:
        conditions = rule["when"]
        if all(_COMPARATORS[op](value, bound) for op, bound in conditions.items()):
            return rule["level"]
    return config.get("default", "orange")


def exercise_streak_level(minutes_by_day_desc: list[float]) -> Level:
    """minutes_by_day_desc: today's exercise minutes first, then going backwards."""
    config = load_thresholds()["exercise_streak"]
    minimum = config["daily_minimum_min"]
    streak = 0
    for minutes in minutes_by_day_desc:
        if minutes < minimum:
            streak += 1
        else:
            break
    if streak >= config["red_days"]:
        return "red"
    if streak >= config["orange_days"]:
        return "orange"
    return "green"


LEVEL_ORDER = {"green": 0, "orange": 1, "red": 2}


def worst_level(levels: list[Level]) -> Level:
    if not levels:
        return "green"
    return max(levels, key=lambda lvl: LEVEL_ORDER[lvl])
