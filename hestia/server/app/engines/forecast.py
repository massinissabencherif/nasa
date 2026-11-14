"""Forecast simulator (M5). A deterministic day-by-day simulation built on
NASA reference values and explicitly flagged assumptions — NOT a trained
model. Pure functions: everything it needs comes in through ForecastInputs,
so it is unit-testable without a database.
"""

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from .nutrition import KCAL_PER_KG_BODYWEIGHT_CHANGE, RATION_SAFETY_FLOOR_PCT, bmr

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
MAX_POINTS = 120


@lru_cache
def reference() -> dict:
    with open(DATA_DIR / "nasa_reference.json") as f:
        return json.load(f)


@dataclass
class CrewProfile:
    id: int
    name: str
    sex: str
    age: int
    height_cm: float
    weight_kg: float
    activity_factor: float


@dataclass
class ForecastInputs:
    crew: list[CrewProfile]
    stock_kcal: float
    radiation_msv_day: float
    current_dose_msv: float
    next_resupply_in_days: int | None  # None = no resupply in this context
    mission_days: int = 400
    ration_pct: float = 100.0
    exercise_h_per_day: float = 1.0
    resupply_delay_days: int = 0
    solar_storm: bool = False
    storm_dose_msv: float = 50.0
    storm_day: int = 30


@dataclass
class ForecastResult:
    series: list[dict] = field(default_factory=list)
    summary: dict = field(default_factory=dict)
    assumptions: list[dict] = field(default_factory=list)


def bone_loss_pct_per_month(exercise_h_per_day: float) -> float:
    ref = reference()["reference_values"]
    low, high = ref["bone_loss_pct_per_month_in_flight"]
    base = (low + high) / 2
    full_at = ref["bone_loss_full_attenuation_exercise_h_per_day"]
    max_attenuation = ref["bone_loss_exercise_attenuation_max_pct"] / 100
    attenuation = max_attenuation * min(max(exercise_h_per_day, 0) / full_at, 1.0)
    return base * (1 - attenuation)


def required_ration_pct(stock_kcal: float, crew_need_kcal_day: float, days: int) -> float:
    if days <= 0 or crew_need_kcal_day <= 0:
        return 100.0
    return min(100.0, stock_kcal / (crew_need_kcal_day * days) * 100)


def _need(member: CrewProfile, weight_kg: float) -> float:
    return bmr(member.sex, weight_kg, member.height_cm, member.age) * member.activity_factor


def simulate(inputs: ForecastInputs) -> ForecastResult:
    ref = reference()["reference_values"]
    career_limit = ref["radiation_career_limit_msv"]
    days = max(1, int(inputs.mission_days))
    ration = max(0.0, inputs.ration_pct) / 100

    baseline_need = {m.id: _need(m, m.weight_kg) for m in inputs.crew}
    crew_need = sum(baseline_need.values())
    initial_stock = max(0.0, inputs.stock_kcal)

    resupply_day = (
        inputs.next_resupply_in_days + max(0, inputs.resupply_delay_days)
        if inputs.next_resupply_in_days is not None
        else None
    )

    weights = {m.id: m.weight_kg for m in inputs.crew}
    stock = initial_stock
    bone = 100.0
    dose = inputs.current_dose_msv
    monthly_bone_loss = bone_loss_pct_per_month(inputs.exercise_h_per_day)
    daily_bone_factor = (1 - monthly_bone_loss / 100) ** (1 / 30)

    stockout_day: int | None = None
    limit_day: int | None = None
    step = max(1, days // MAX_POINTS)
    series: list[dict] = []

    def snapshot(day: int) -> dict:
        mean_change_pct = sum(
            (weights[m.id] - m.weight_kg) / m.weight_kg * 100 for m in inputs.crew
        ) / max(1, len(inputs.crew))
        return {
            "day": day,
            "stock_days": round(stock / crew_need, 1) if crew_need else 0.0,
            "weight_change_pct": round(mean_change_pct, 2),
            "bone_pct": round(bone, 2),
            "radiation_msv": round(dose, 1),
        }

    series.append(snapshot(0))
    for day in range(1, days + 1):
        if resupply_day is not None and day == resupply_day:
            stock = max(stock, initial_stock)  # assumption: cargo restores the initial stock

        planned = crew_need * ration
        served = min(planned, stock)
        stock -= served
        if stock <= 0 and stockout_day is None and served < planned:
            stockout_day = day
        served_share = served / planned if planned > 0 else 0.0

        for member in inputs.crew:
            intake = baseline_need[member.id] * ration * served_share
            # expenditure follows the current body mass (Mifflin-St Jeor), so a
            # deficit slows down as weight drops instead of running linearly forever
            expenditure = _need(member, weights[member.id])
            weights[member.id] += (intake - expenditure) / KCAL_PER_KG_BODYWEIGHT_CHANGE
            weights[member.id] = max(weights[member.id], member.weight_kg * 0.6)

        bone *= daily_bone_factor
        dose += inputs.radiation_msv_day
        if inputs.solar_storm and day == min(max(1, inputs.storm_day), days):
            dose += inputs.storm_dose_msv
        if limit_day is None and dose > career_limit:
            limit_day = day

        if day % step == 0 or day == days or day in (resupply_day, stockout_day):
            series.append(snapshot(day))

    horizon = min(resupply_day, days) if resupply_day is not None else days
    need_pct = required_ration_pct(initial_stock, crew_need, horizon)
    final = series[-1]
    per_crew = [
        {
            "crew_member_id": m.id,
            "name": m.name,
            "weight_kg": round(weights[m.id], 1),
            "change_kg": round(weights[m.id] - m.weight_kg, 1),
            "change_pct": round((weights[m.id] - m.weight_kg) / m.weight_kg * 100, 1),
        }
        for m in inputs.crew
    ]

    summary = {
        "crew_need_kcal_day": round(crew_need),
        "autonomy_days_at_ration": round(initial_stock / (crew_need * ration), 1) if crew_need * ration else None,
        "resupply_day": resupply_day,
        "stockout_day": stockout_day,
        "days_without_food": (
            max(0, (horizon if resupply_day is not None and resupply_day <= days else days) - stockout_day)
            if stockout_day is not None else 0
        ),
        "required_ration_pct": round(need_pct, 1),
        "required_ration_below_floor": need_pct < RATION_SAFETY_FLOOR_PCT,
        "ration_below_floor": inputs.ration_pct < RATION_SAFETY_FLOOR_PCT,
        "safety_floor_pct": RATION_SAFETY_FLOOR_PCT,
        "weight_change_pct_final": final["weight_change_pct"],
        "weight_per_crew": per_crew,
        "bone_pct_final": final["bone_pct"],
        "bone_loss_pct_per_month": round(monthly_bone_loss, 2),
        "radiation_msv_final": final["radiation_msv"],
        "radiation_pct_of_limit": round(final["radiation_msv"] / career_limit * 100, 1),
        "radiation_limit_msv": career_limit,
        "radiation_limit_day": limit_day,
    }
    return ForecastResult(series=series, summary=summary, assumptions=assumptions(inputs))


def assumptions(inputs: ForecastInputs | None = None) -> list[dict]:
    ref = reference()
    values = ref["reference_values"]
    notes = ref["assumptions"]
    low, high = values["bone_loss_pct_per_month_in_flight"]
    return [
        {"kind": "method", "label": "Simulator, not a trained model",
         "text": "Deterministic day-by-day arithmetic on the reference values below. It shows the "
                 "direction and order of magnitude of a decision, not a prediction for a real person."},
        {"kind": "assumption", "label": "Energy need",
         "text": "Mifflin-St Jeor BMR x activity factor per crew member, recomputed as weight changes. "
                 "A ground formula, not validated for spaceflight."},
        {"kind": "assumption", "label": "Weight", "text": notes["kcal_per_kg"]},
        {"kind": "nasa", "label": "Bone mass",
         "text": f"In-flight loss of about {low}-{high} %/month on average (midpoint used; the hip loses "
                 "more), applied to every context including partial gravity, which is conservative."},
        {"kind": "assumption", "label": "Exercise effect", "text": notes["bone_loss_attenuation"]},
        {"kind": "nasa", "label": "Radiation",
         "text": f"Daily dose of the active context against the {values['radiation_career_limit_msv']} mSv "
                 "career limit of NASA-STD-3001. Mars surface 0.67 and transit 1.8 mSv/day: Curiosity RAD. "
                 "Moon 1.369 mSv/day: Chang'e-4 lander (not a NASA measurement)."},
        {"kind": "assumption", "label": "ISS dose rate", "text": notes["iss_radiation_msv_day"]},
        {"kind": "assumption", "label": "Solar storm", "text": notes["solar_storm_dose_msv"]},
        {"kind": "assumption", "label": "Resupply", "text": notes["next_resupply_in_days"]
         + " A cargo restores the stock to its initial level."},
        {"kind": "assumption", "label": "Demo scale",
         "text": "One box on the demo shelf stands for one storage lot of rations "
                 "(food_item.units_per_lot), so a 29-unit shelf represents about 412 days for 4 crew."},
    ]
