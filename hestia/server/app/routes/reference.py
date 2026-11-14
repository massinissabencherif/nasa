from fastapi import APIRouter

from app.engines.thresholds import load_thresholds

router = APIRouter(prefix="/api/thresholds", tags=["reference"])


@router.get("")
def get_thresholds() -> dict:
    return load_thresholds()
