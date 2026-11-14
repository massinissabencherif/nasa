"""Deterministic simulated sessions, used only for a new/reset demo database."""
from datetime import datetime, timedelta, timezone
from uuid import NAMESPACE_DNS, uuid5

from sqlmodel import Session

from app.engines.reaction import SessionInput, save_session
from app.models import CrewMember


def seed_reaction_sessions(session: Session, crew: list[CrewMember]) -> None:
    anchor = datetime.now(timezone.utc).replace(hour=9, minute=0, second=0, microsecond=0)
    for member in crew:
        device = uuid5(NAMESPACE_DNS, f"hestia-demo-device-{member.id}")
        for days_ago in range(7, 0, -1):
            start = anchor - timedelta(days=days_ago)
            interrupted = days_ago == 2
            trials = [{"trial_number": index + 1, "outcome": "valid",
                       "reaction_ms": 280 + member.id * 10 + (index % 5) * 7 + days_ago * 3}
                      for index in range(3 if interrupted else 15)]
            if interrupted:
                trials.append({"trial_number": 4, "outcome": "interrupted"})
            save_session(session, member.id, SessionInput(
                id=uuid5(NAMESPACE_DNS, f"hestia-demo-{member.id}-{start.date()}"),
                device_id=device, protocol_version="reaction-15-v1", source="simulated",
                started_at=start, ended_at=start + timedelta(seconds=80),
                status="interrupted" if interrupted else "complete", practice_completed=3,
                trials=trials,
            ))
