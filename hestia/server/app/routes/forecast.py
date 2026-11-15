import json

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.db import engine
from app.engines.forecast import CrewProfile, ForecastInputs, reference, simulate
from app.engines.nutrition import current_stock, daily_need, rationing_plan
from app.engines.status import _latest
from app.models import CrewMember, MissionContext, SimulationReport

router = APIRouter(tags=["forecast"])


@router.get("/api/rations")
def get_rations(days: int = Query(default=30, ge=1, le=2000)) -> dict:
    with Session(engine) as session:
        plan = rationing_plan(session, target_days=days)
        stock = current_stock(session)
        crew = session.exec(select(CrewMember)).all()
        needs = {c.id: daily_need(c) for c in crew}
        total_need = sum(needs.values()) or 1.0
        # fraction of the stock eaten over the period at this ration (1.0 when rationed to last)
        eaten_fraction = (
            min(1.0, plan.ration_pct / 100 * days * total_need / stock.kcal) if stock.kcal else 0.0
        )
        per_crew = []
        for c in crew:
            share = needs[c.id] / total_need
            per_day = share * eaten_fraction / days
            per_crew.append({
                "crew_member_id": c.id,
                "name": c.name,
                "need_kcal": round(needs[c.id]),
                "ration_kcal": round(plan.daily_kcal_per_crew[c.id]),
                # this astronaut's share of the stock macros, spread over the target period
                "protein_g": round(stock.protein_g * per_day),
                "carbs_g": round(stock.carbs_g * per_day),
                "fat_g": round(stock.fat_g * per_day),
                "weight_change_kg": round(plan.projected_weight_change_kg_per_crew[c.id], 1),
            })
    return {
        "target_days": plan.target_days,
        "ration_pct": round(plan.ration_pct, 1),
        "below_safety_floor": plan.below_safety_floor,
        "safety_floor_pct": 70,
        "per_crew": per_crew,
        "daily_kcal_per_crew": {k: round(v, 1) for k, v in plan.daily_kcal_per_crew.items()},
        "projected_weight_change_kg_per_crew": {
            k: round(v, 2) for k, v in plan.projected_weight_change_kg_per_crew.items()
        },
        "assumptions": [
            "Weight change uses 7700 kcal per kg of body mass (approximation, linear over the period).",
            "A ration below 70% of need is flagged unsafe: it is shown with a red warning, never proposed silently.",
        ],
    }


class ForecastBody(BaseModel):
    mission_days: int = Field(default=400, ge=7, le=1500)
    ration_pct: float = Field(default=100, ge=30, le=120)
    exercise_h_per_day: float = Field(default=1.0, ge=0, le=4)
    resupply_delay_days: int = Field(default=0, ge=0, le=365)
    solar_storm: bool = False
    storm_dose_msv: float = Field(default=50, ge=0, le=1000)
    storm_day: int = Field(default=30, ge=1, le=1500)


def run_forecast(body: ForecastBody) -> dict:
    """Run the simulator on the live mission context, crew and stock."""
    with Session(engine) as session:
        context = session.exec(
            select(MissionContext).where(MissionContext.active == True)  # noqa: E712
        ).first()
        if context is None:
            raise HTTPException(409, "no active mission context: run the demo-mars scenario")
        crew = session.exec(select(CrewMember)).all()
        stock = current_stock(session)
        doses = [d for c in crew if (d := _latest(session, c.id, "radiation_dose_msv")) is not None]
        inputs = ForecastInputs(
            crew=[
                CrewProfile(c.id, c.name, c.sex, c.age, c.height_cm, c.weight_kg, c.activity_factor)
                for c in crew
            ],
            stock_kcal=stock.kcal,
            radiation_msv_day=context.radiation_msv_day,
            current_dose_msv=max(doses) if doses else 0.0,
            next_resupply_in_days=context.next_resupply_in_days,
            **body.model_dump(),
        )
        context_out = {
            "type": context.type,
            "label": context.label,
            "radiation_msv_day": context.radiation_msv_day,
            "next_resupply_in_days": context.next_resupply_in_days,
            "crew_count": len(crew),
            "stock_kcal": round(stock.kcal),
            "current_dose_msv": round(inputs.current_dose_msv, 1),
        }
    result = simulate(inputs)
    return {
        "context": context_out,
        "inputs": body.model_dump(),
        "series": result.series,
        "summary": result.summary,
        "assumptions": result.assumptions,
    }


@router.post("/api/forecast")
def post_forecast(body: ForecastBody) -> dict:
    return run_forecast(body)


def _report_out(report: SimulationReport, full: bool) -> dict:
    result = json.loads(report.result_json)
    out = {
        "id": report.id,
        "created_ts": report.created_ts,
        "context_type": report.context_type,
        "context_label": report.context_label,
        "inputs": json.loads(report.inputs_json),
        "summary": result["summary"],
    }
    if full:
        out.update(context=result["context"], series=result["series"], assumptions=result["assumptions"])
    return out


@router.post("/api/forecast/reports", status_code=201)
def create_report(body: ForecastBody) -> dict:
    """Run the simulator once and keep the result as a report that does not change later."""
    result = run_forecast(body)
    report = SimulationReport(
        context_type=result["context"]["type"],
        context_label=result["context"]["label"],
        inputs_json=json.dumps(result["inputs"]),
        result_json=json.dumps(result),
    )
    with Session(engine) as session:
        session.add(report)
        session.commit()
        session.refresh(report)
        return _report_out(report, full=True)


@router.get("/api/forecast/reports")
def list_reports(limit: int = Query(default=50, ge=1, le=200)) -> list[dict]:
    with Session(engine) as session:
        reports = session.exec(
            select(SimulationReport).order_by(SimulationReport.id.desc()).limit(limit)  # type: ignore[union-attr]
        ).all()
        return [_report_out(r, full=False) for r in reports]


@router.get("/api/forecast/reports/{report_id}")
def get_report(report_id: int) -> dict:
    with Session(engine) as session:
        report = session.get(SimulationReport, report_id)
        if report is None:
            raise HTTPException(404, "report not found")
        return _report_out(report, full=True)


@router.get("/api/reference")
def get_reference() -> dict:
    return reference()
