import pytest

from app.engines.forecast import (
    CrewProfile,
    ForecastInputs,
    bone_loss_pct_per_month,
    required_ration_pct,
    simulate,
)
from app.engines.nutrition import bmr

ALEX = CrewProfile(1, "Alex", "M", 38, 178, 75.0, 1.6)
PRIYA = CrewProfile(2, "Priya", "F", 34, 165, 60.0, 1.5)
NEED = bmr("M", 75, 178, 38) * 1.6 + bmr("F", 60, 165, 34) * 1.5


def inputs(**overrides) -> ForecastInputs:
    base = dict(
        crew=[ALEX, PRIYA],
        stock_kcal=NEED * 400,
        radiation_msv_day=0.67,
        current_dose_msv=60.0,
        next_resupply_in_days=380,
        mission_days=400,
    )
    base.update(overrides)
    return ForecastInputs(**base)


def test_bone_loss_attenuation_bounds():
    assert bone_loss_pct_per_month(0) == pytest.approx(1.25)
    assert bone_loss_pct_per_month(1) == pytest.approx(1.25 * 0.75)
    assert bone_loss_pct_per_month(2) == pytest.approx(0.625)
    assert bone_loss_pct_per_month(4) == pytest.approx(0.625)  # capped at 50 %


def test_required_ration():
    assert required_ration_pct(1000, 10, 50) == 100.0
    assert required_ration_pct(1000, 10, 200) == pytest.approx(50.0)


def test_full_ration_keeps_weight_stable_and_stock_lasts_until_resupply():
    result = simulate(inputs())
    assert result.summary["stockout_day"] is None
    assert result.summary["weight_change_pct_final"] == pytest.approx(0, abs=0.05)
    assert result.series[0]["stock_days"] == pytest.approx(400, abs=0.1)
    # resupply on day 380 restores the stock
    day_380 = next(p for p in result.series if p["day"] == 380)
    assert day_380["stock_days"] > 390


def test_delayed_resupply_causes_stockout_and_weight_loss():
    result = simulate(inputs(resupply_delay_days=60, mission_days=460))
    assert result.summary["resupply_day"] == 440
    assert result.summary["stockout_day"] == 401
    assert result.summary["required_ration_pct"] == pytest.approx(400 / 440 * 100, abs=0.1)
    assert result.summary["weight_change_pct_final"] < 0


def test_rationing_to_the_required_level_avoids_the_stockout():
    need_pct = simulate(inputs(resupply_delay_days=60, mission_days=460)).summary["required_ration_pct"]
    result = simulate(inputs(resupply_delay_days=60, mission_days=460, ration_pct=need_pct - 0.1))
    assert result.summary["stockout_day"] is None
    assert -15 < result.summary["weight_change_pct_final"] < 0
    assert result.summary["ration_below_floor"] is False


def test_low_ration_is_flagged_below_safety_floor():
    assert simulate(inputs(ration_pct=60)).summary["ration_below_floor"] is True


def test_no_resupply_context_runs_out():
    result = simulate(inputs(next_resupply_in_days=None, mission_days=500))
    assert result.summary["resupply_day"] is None
    assert result.summary["stockout_day"] == 401


def test_exercise_slows_bone_loss():
    sedentary = simulate(inputs(exercise_h_per_day=0)).summary["bone_pct_final"]
    active = simulate(inputs(exercise_h_per_day=2)).summary["bone_pct_final"]
    assert sedentary == pytest.approx(100 * (1 - 0.0125) ** (400 / 30), abs=0.05)
    assert active > sedentary


def test_radiation_accumulates_and_storm_adds_a_one_off_dose():
    calm = simulate(inputs())
    assert calm.summary["radiation_msv_final"] == pytest.approx(60 + 0.67 * 400, abs=0.2)
    stormy = simulate(inputs(solar_storm=True, storm_dose_msv=200, storm_day=30))
    assert stormy.summary["radiation_msv_final"] == pytest.approx(
        calm.summary["radiation_msv_final"] + 200, abs=0.2
    )
    assert calm.summary["radiation_limit_day"] is None
    hot = simulate(inputs(radiation_msv_day=1.8, current_dose_msv=59.0))
    assert hot.summary["radiation_limit_day"] == 301  # 59 + 1.8 * 301 > 600


def test_series_is_bounded_and_monotonic_in_days():
    result = simulate(inputs(mission_days=1500))
    days = [p["day"] for p in result.series]
    assert days == sorted(days) and days[0] == 0 and days[-1] == 1500
    assert len(days) <= 130
    assert any(a["kind"] == "assumption" for a in result.assumptions)
