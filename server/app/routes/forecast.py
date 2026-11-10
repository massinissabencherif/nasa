from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["forecast"])


@router.get("/api/rations")
def get_rations(days: int = 30) -> dict:
    raise HTTPException(501, "rationing plans need the nutrition engine (phase 2) — not implemented yet")


@router.post("/api/forecast")
def post_forecast() -> dict:
    raise HTTPException(501, "forecast simulator is phase 7 — not implemented yet")
