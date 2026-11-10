from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session

from app.db import engine
from app.engines.nutrition import rationing_plan

router = APIRouter(tags=["forecast"])


@router.get("/api/rations")
def get_rations(days: int = Query(default=30, ge=1, le=2000)) -> dict:
    with Session(engine) as session:
        plan = rationing_plan(session, target_days=days)
    return {
        "target_days": plan.target_days,
        "ration_pct": round(plan.ration_pct, 1),
        "below_safety_floor": plan.below_safety_floor,
        "daily_kcal_per_crew": {k: round(v, 1) for k, v in plan.daily_kcal_per_crew.items()},
        "projected_weight_change_kg_per_crew": {
            k: round(v, 2) for k, v in plan.projected_weight_change_kg_per_crew.items()
        },
        "assumptions": [
            "7700 kcal per kg of bodyweight change (NASA-referenced approximation)",
            "ration below 70% is flagged as unsafe and should not be proposed without a red warning",
        ],
    }


@router.post("/api/forecast")
def post_forecast() -> dict:
    raise HTTPException(501, "forecast simulator (sliders, bone/radiation curves) is phase 7 — not implemented yet")
