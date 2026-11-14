"""Versioned performance sessions. They never feed clinical colours or alerts."""

import hashlib
import json
from datetime import timezone
from pathlib import Path
from statistics import median
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models import ReactionSession, ReactionTrial

PROTOCOL_FILE = Path(__file__).resolve().parents[2] / "data" / "reaction_protocols.json"


def protocols() -> dict:
    return json.loads(PROTOCOL_FILE.read_text())


def current_protocol() -> dict:
    data = protocols()
    return data["protocols"][data["current"]]


class TrialInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    trial_number: int = Field(ge=1, le=100, strict=True)
    outcome: Literal["valid", "false_start", "no_response", "interrupted"]
    reaction_ms: float | None = Field(default=None, ge=0, lt=10000, strict=True)


class SessionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    protocol_version: str = Field(min_length=1, max_length=64)
    device_id: UUID | None = None
    started_at: AwareDatetime
    ended_at: AwareDatetime
    status: Literal["complete", "interrupted", "abandoned"]
    source: Literal["manual", "simulated"] = "manual"
    practice_completed: int = Field(ge=0, le=100, strict=True)
    trials: list[TrialInput] = Field(max_length=128)

    @model_validator(mode="after")
    def validate_protocol(self):
        self.started_at = self.started_at.astimezone(timezone.utc)
        self.ended_at = self.ended_at.astimezone(timezone.utc)
        protocol = protocols()["protocols"].get(self.protocol_version)
        if protocol is None:
            raise ValueError("unsupported reaction protocol")
        if self.ended_at < self.started_at:
            raise ValueError("session end precedes its start")
        if self.practice_completed > protocol["practice_trials"]:
            raise ValueError("too many practice trials")
        if len(self.trials) > protocol["max_attempts"]:
            raise ValueError("too many attempts")
        if self.trials and self.practice_completed != protocol["practice_trials"]:
            raise ValueError("finish practice before measured trials")
        trial_number = 1
        for index, trial in enumerate(self.trials):
            if trial.trial_number != trial_number or trial_number > protocol["measured_trials"]:
                raise ValueError("trials must follow the protocol order, without gaps")
            if trial.outcome == "valid":
                if trial.reaction_ms is None or trial.reaction_ms >= protocol["response_timeout_ms"]:
                    raise ValueError("valid response needs a time below the response timeout")
                trial_number += 1
            else:
                if trial.reaction_ms is not None:
                    raise ValueError("invalid attempts must not carry a reaction time")
                if trial.outcome == "no_response":
                    trial_number += 1
                if trial.outcome == "interrupted":
                    if self.status == "complete" or index != len(self.trials) - 1:
                        raise ValueError("an interrupted trial must end an incomplete session")
        finished = trial_number - 1
        if self.status == "complete":
            if finished != protocol["measured_trials"] or self.practice_completed != protocol["practice_trials"]:
                raise ValueError("a complete session needs all measured trials and practice")
        elif finished == protocol["measured_trials"]:
            raise ValueError("all measured trials finished: session must be complete")
        return self


def statistics(trials) -> dict:
    values = [trial.reaction_ms for trial in trials if trial.outcome == "valid"]
    return {
        "median_ms": median(values) if values else None,
        "valid_responses": len(values),
        "false_starts": sum(trial.outcome == "false_start" for trial in trials),
        "no_responses": sum(trial.outcome == "no_response" for trial in trials),
    }


class SessionConflict(Exception):
    pass


def save_session(session: Session, crew_id: int, body: SessionInput) -> tuple[ReactionSession, bool]:
    canonical = json.dumps({"crew_id": crew_id, **body.model_dump(mode="json")}, sort_keys=True)
    digest = hashlib.sha256(canonical.encode()).hexdigest()

    def existing_result(existing):
        if existing.crew_member_id != crew_id or existing.request_hash != digest:
            raise SessionConflict("this session ID has already been used for a different result")
        return existing, False

    existing = session.get(ReactionSession, str(body.id))
    if existing:
        return existing_result(existing)
    row = ReactionSession(
        id=str(body.id), crew_member_id=crew_id, protocol_version=body.protocol_version,
        device_id=str(body.device_id) if body.device_id else None,
        started_at=body.started_at, ended_at=body.ended_at, status=body.status,
        source=body.source, practice_completed=body.practice_completed,
        request_hash=digest, **statistics(body.trials),
    )
    session.add(row)
    session.add_all([
        ReactionTrial(session_id=row.id, attempt=index + 1, **trial.model_dump())
        for index, trial in enumerate(body.trials)
    ])
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        existing = session.get(ReactionSession, row.id)
        if existing:
            return existing_result(existing)
        raise
    session.refresh(row)
    return row, True


def reference_for(session: Session, row: ReactionSession) -> dict:
    needed = protocols()["protocols"][row.protocol_version]["reference_sessions"]
    result = {"count": 0, "required": needed, "median_ms": None,
              "difference_ms": None, "difference_pct": None}
    if row.device_id is None:
        return result
    previous = session.exec(select(ReactionSession).where(
        ReactionSession.crew_member_id == row.crew_member_id,
        ReactionSession.protocol_version == row.protocol_version,
        ReactionSession.device_id == row.device_id,
        ReactionSession.source == row.source,
        ReactionSession.status == "complete",
        ReactionSession.median_ms.is_not(None),
        ReactionSession.ended_at <= row.started_at,
        ReactionSession.id != row.id,
    ).order_by(ReactionSession.ended_at.desc(), ReactionSession.id).limit(needed)).all()
    result["count"] = len(previous)
    if len(previous) == needed and row.status == "complete" and row.median_ms is not None:
        baseline = median(item.median_ms for item in previous)
        result.update(median_ms=baseline, difference_ms=row.median_ms - baseline,
                      difference_pct=((row.median_ms - baseline) / baseline * 100) if baseline else None)
    return result


def session_summary(session: Session, row: ReactionSession) -> dict:
    result = row.model_dump(exclude={"request_hash"})
    # SQLite returns naive dates. The API always emits explicit UTC instants.
    for key in ("started_at", "ended_at", "created_at"):
        value = result[key]
        result[key] = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    result["reference"] = reference_for(session, row)
    return result


def session_detail(session: Session, row: ReactionSession) -> dict:
    result = session_summary(session, row)
    result["trials"] = [trial.model_dump(exclude={"id", "session_id"}) for trial in session.exec(
        select(ReactionTrial).where(ReactionTrial.session_id == row.id).order_by(ReactionTrial.attempt)
    ).all()]
    return result
