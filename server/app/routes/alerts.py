from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select

from app.db import engine
from app.models import Alert

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
def list_alerts() -> list[Alert]:
    with Session(engine) as session:
        return session.exec(select(Alert).order_by(Alert.ts.desc())).all()


@router.post("/{alert_id}/ack")
def ack_alert(alert_id: int) -> Alert:
    with Session(engine) as session:
        alert = session.get(Alert, alert_id)
        if alert is None:
            raise HTTPException(404, f"no alert {alert_id}")
        alert.acked = True
        session.add(alert)
        session.commit()
        session.refresh(alert)
        return alert
