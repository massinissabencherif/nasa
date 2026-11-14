"""Self-care advice for orange/red indicator alerts.

The advice depends on what was measured: the value, whether it is above or
below the indicative range, the vigilance level, and whether a report went
to Earth. Deterministic templates are the default; the LLM path is opt-in,
always uses qwen2.5vl:7b in text mode, and is guardrailed: no diagnosis, no
drug names or doses, no certainty, <= 4 short steps, must reference a
Procedure. The disclaimer is always appended by code, never trusted from
model output.
"""

from dataclasses import dataclass

from vision import ollama_client

from .thresholds import green_range

DISCLAIMER = "This is indicative only — not a diagnosis."

PROCEDURES: dict[str, str] = {
    "systolic_bp": "Cardiovascular rest procedure",
    "diastolic_bp": "Cardiovascular rest procedure",
    "heart_rate": "Cardiovascular rest procedure",
    "temperature": "Fever procedure",
    "glucose": "Nutrition check procedure",
    "weight_change_pct": "Nutrition check procedure",
    "sleep_h": "Sleep hygiene procedure",
    "mood": "Crew wellness check-in procedure",
    "symptom": "Crew wellness check-in procedure",
    "exercise_streak": "Resistive exercise routine",
    "radiation_pct_of_career_limit": "Radiation shelter procedure",
    "reaction_change_pct": "Fatigue management procedure",
}

# (label, unit) used to state the finding in plain words.
_FINDING: dict[str, tuple[str, str]] = {
    "systolic_bp": ("Systolic blood pressure", "mmHg"),
    "diastolic_bp": ("Diastolic blood pressure", "mmHg"),
    "heart_rate": ("Resting heart rate", "bpm"),
    "temperature": ("Temperature", "°C"),
    "glucose": ("Glucose", "mg/dL"),
    "weight_change_pct": ("Weight change", "% vs baseline"),
    "sleep_h": ("Sleep", "h"),
    "mood": ("Mood", "/ 5"),
    "radiation_pct_of_career_limit": ("Cumulative dose", "% of the career limit"),
}

_REST_AND_REPEAT = ["Sit down and rest for 10 minutes, then measure again.", "Avoid exertion until the second reading."]

# Steps by indicator and by direction of the deviation ("high", "low", "any").
_STEPS: dict[str, dict[str, list[str]]] = {
    "systolic_bp": {
        "high": _REST_AND_REPEAT,
        "low": ["Lie down with your legs raised, then measure again.", "Drink water."],
    },
    "diastolic_bp": {
        "high": _REST_AND_REPEAT,
        "low": ["Lie down with your legs raised, then measure again.", "Drink water."],
    },
    "heart_rate": {
        "high": ["Stop any activity and rest for 10 minutes, then measure again.", "Drink water."],
        "low": ["Rest and measure again in 10 minutes.", "Log any dizziness as a symptom."],
    },
    "temperature": {
        "high": ["Rest and drink water.", "Measure again in 1 hour and log it."],
        "low": ["Warm up: extra layer, warm drink.", "Measure again in 30 minutes and log it."],
    },
    "glucose": {
        "high": ["Measure again before your next meal: the range is for a fasting reading.",
                 "Check today's meals on the Meal screen."],
        "low": ["Eat a carbohydrate snack now.", "Measure again in 15 minutes."],
    },
    "weight_change_pct": {"any": ["Check the Meal screen: you may be under your daily energy need.",
                                  "Weigh yourself again tomorrow at the same time."]},
    "sleep_h": {"any": ["Keep tonight's sleep window protected.", "Avoid caffeine late in the day."]},
    "mood": {"any": ["Talk to a crewmate today.", "Keep tonight's sleep schedule."]},
    "symptom": {"any": ["Log details at the next check-in.", "Mention it to a crewmate."]},
    "exercise_streak": {"any": [
        "Do 30 min of resistive exercise today: squats, deadlifts, heel raises.",
        "Split it into two 15 min sessions if you are short on time or energy.",
    ]},
    "reaction_change_pct": {"any": ["Take a 20-minute rest before any critical task.",
                                    "Repeat the reaction test after resting."]},
    "radiation_pct_of_career_limit": {"any": ["No same-day action: the dose accumulates over the mission.",
                                              "Plan shelter time during solar events."]},
}

RED_FIRST_STEP = "Tell the crew medical officer now."


@dataclass
class AdviceContext:
    """What the advice needs to know about the situation."""
    level: str = "orange"            # orange | red
    value: float | None = None       # the number the threshold judged
    direction: str | None = None     # high | low | None
    sent_to_earth: bool = False
    round_trip_s: int | None = None  # time before a reply from Earth can arrive


def _fmt(number: float) -> str:
    return f"{number:.1f}".rstrip("0").rstrip(".")


def _duration(seconds: int) -> str:
    if seconds < 90:
        return f"{seconds} s"
    return f"{round(seconds / 60)} min"


def finding_line(indicator: str, ctx: AdviceContext) -> str | None:
    """One sentence saying what was measured and how it compares to the range."""
    if ctx.value is None:
        return None
    if indicator == "exercise_streak":
        days = int(ctx.value)
        return f"{days} day{'s' if days != 1 else ''} in a row under 30 min of exercise."
    if indicator == "reaction_change_pct":
        return f"Reaction time {round(ctx.value)} % slower than your own baseline (screening test, not validated)."
    if indicator not in _FINDING:
        return None
    label, unit = _FINDING[indicator]
    low, high = green_range(indicator)
    if ctx.direction == "high" and high is not None:
        comparison = f"above the indicative range (up to {_fmt(high)})"
    elif ctx.direction == "low" and low is not None:
        comparison = f"below the indicative range (from {_fmt(low)})"
    else:
        comparison = "outside the indicative range"
    return f"{label} {_fmt(ctx.value)} {unit}: {comparison}."


def _steps(indicator: str, ctx: AdviceContext) -> list[str]:
    by_direction = _STEPS.get(indicator, {"any": ["Mention it at your next check-in."]})
    steps = list(by_direction.get(ctx.direction or "any") or by_direction.get("any")
                 or next(iter(by_direction.values())))
    if ctx.level == "red":
        steps = [RED_FIRST_STEP, *steps]
    return steps[:3]


def escalation_line(ctx: AdviceContext) -> str | None:
    if ctx.level != "red":
        return None
    if ctx.sent_to_earth:
        wait = f" A reply cannot arrive before about {_duration(ctx.round_trip_s)}." if ctx.round_trip_s else ""
        return f"A report is queued for Earth.{wait} Follow the procedure meanwhile."
    return ("Not sent to Earth: one red reading outside the critical band. "
            "It is sent if it worsens or if a second indicator turns red.")


def deterministic_advice(indicator: str, ctx: AdviceContext | None = None) -> str:
    ctx = ctx or AdviceContext()
    lines = []
    finding = finding_line(indicator, ctx)
    if finding:
        lines.append(finding)
    numbered = [f"{i + 1}. {s}" for i, s in enumerate(_steps(indicator, ctx))]
    procedure = PROCEDURES.get(indicator)
    if procedure:
        numbered.append(f"{len(numbered) + 1}. See Procedure: {procedure}.")
    lines.extend(numbered[:4])
    escalation = escalation_line(ctx)
    if escalation:
        lines.append(escalation)
    lines.append(DISCLAIMER)
    return "\n".join(lines)


_SYSTEM_PROMPT = (
    "You write short self-care advice for an astronaut's health app. Hard rules: "
    "never diagnose a condition; never name a drug or a dose; never state certainty "
    "('this means...', 'you have...') — use cautious language ('consider', 'may help'). "
    "Give at most 4 short numbered steps. Reference exactly one onboard procedure by "
    "name, prefixed 'See Procedure:'. Do not add any other text before or after the steps."
)


# Output-side guardrail: the prompt asks for this, the code enforces it. Any hit
# discards the LLM text and returns the deterministic template instead.
_BANNED_FRAGMENTS = (
    " mg", "mg ", "milligram", " dose", "dosage", "tablet", "pill", "ibuprofen", "paracetamol",
    "acetaminophen", "aspirin", "antibiotic", "medication", "prescri", "diagnos",
    "you have ", "you are suffering", "definitely", "certainly",
)


def passes_guardrails(text: str) -> bool:
    lowered = text.lower()
    if any(fragment in lowered for fragment in _BANNED_FRAGMENTS):
        return False
    steps = [line for line in text.splitlines() if line.strip()[:1].isdigit()]
    return 1 <= len(steps) <= 4 and "Procedure:" in text and len(text) <= 700


def generate_advice(
    indicator: str, ctx: AdviceContext | None = None, use_llm: bool = False, timeout_s: float = 8.0
) -> tuple[str, str]:
    """Returns (advice_text, source) where source is 'llm' or 'template'."""
    ctx = ctx or AdviceContext()
    if not use_llm:
        return deterministic_advice(indicator, ctx), "template"

    procedure = PROCEDURES.get(indicator, "Crew wellness check-in procedure")
    situation = finding_line(indicator, ctx) or f"Indicator out of range: {indicator}."
    urgency = (
        f"Vigilance level: red. The first step must be: {RED_FIRST_STEP}"
        if ctx.level == "red" else "Vigilance level: orange (self-care)."
    )
    prompt = (
        f"{_SYSTEM_PROMPT}\n\n{situation} {urgency} "
        f"The relevant onboard procedure is: {procedure}."
    )
    try:
        result = ollama_client.generate(prompt, timeout=timeout_s, json_mode=False)
        text = result.get("response", "").strip()
        if not text or not passes_guardrails(text):
            return deterministic_advice(indicator, ctx), "template"
        if ctx.level == "red" and RED_FIRST_STEP.lower() not in text.lower():
            return deterministic_advice(indicator, ctx), "template"
        tail = [line for line in (finding_line(indicator, ctx), ) if line]
        closing = [line for line in (escalation_line(ctx), DISCLAIMER) if line]
        return "\n".join([*tail, text, *closing]), "llm"
    except Exception:
        return deterministic_advice(indicator, ctx), "template"
