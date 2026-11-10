from fastapi import APIRouter, HTTPException

from app.seed import reset_and_seed

router = APIRouter(prefix="/api/demo", tags=["demo"])

SCENARIOS = {"demo-mars"}


@router.post("/reset")
def demo_reset() -> dict:
    reset_and_seed()
    return {"status": "reseeded"}


@router.post("/scenario/{name}")
def demo_scenario(name: str) -> dict:
    if name not in SCENARIOS:
        raise HTTPException(404, f"unknown scenario '{name}'")
    reset_and_seed()
    return {"status": "reseeded", "scenario": name}
