"""Self-care advice for orange/red indicator alerts.

Deterministic templates are the default (PROMPT_ADDENDUM.md #2: text advice
uses the template unless the LLM is explicitly opted in, and the LLM path
always uses qwen2.5vl:7b in text mode — never gemma3:4b, and never loaded
alongside the vision model). The LLM path is guardrailed: no diagnosis, no
drug names or doses, no certainty, <=4 short steps, must reference a
Procedure, and the disclaimer is always appended by code, not trusted from
model output.
"""

from vision import ollama_client

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
}

_STEPS: dict[str, list[str]] = {
    "systolic_bp": ["Sit or lie down and rest.", "Hydrate.", "Recheck in a few hours."],
    "diastolic_bp": ["Sit or lie down and rest.", "Hydrate.", "Recheck in a few hours."],
    "heart_rate": ["Stop any activity and rest.", "Hydrate.", "Recheck in a few hours."],
    "temperature": ["Rest.", "Hydrate.", "Monitor temperature every few hours."],
    "glucose": ["Check your next meal against the Meal screen.", "Recheck after eating."],
    "weight_change_pct": ["Check the Meal screen — you may be under your daily kcal need."],
    "sleep_h": ["Keep tonight's sleep window protected.", "Avoid caffeine late in the day."],
    "mood": ["Talk to a crewmate.", "Keep tonight's sleep schedule."],
    "symptom": ["Log details at the next check-in.", "Mention it to a crewmate."],
    "exercise_streak": ["Log a resistive exercise session today."],
    "radiation_pct_of_career_limit": ["No same-day action — this accumulates over the mission."],
}


def deterministic_advice(indicator: str) -> str:
    steps = _STEPS.get(indicator, ["Mention it at your next check-in."])
    procedure = PROCEDURES.get(indicator)
    lines = [f"{i + 1}. {s}" for i, s in enumerate(steps[:3])]
    if procedure:
        lines.append(f"{len(lines) + 1}. See Procedure: {procedure}.")
    return "\n".join(lines[:4]) + f"\n{DISCLAIMER}"


_SYSTEM_PROMPT = (
    "You write short self-care advice for an astronaut's health app. Hard rules: "
    "never diagnose a condition; never name a drug or a dose; never state certainty "
    "('this means...', 'you have...') — use cautious language ('consider', 'may help'). "
    "Give at most 4 short numbered steps. Reference exactly one onboard procedure by "
    "name, prefixed 'See Procedure:'. Do not add any other text before or after the steps."
)


def generate_advice(indicator: str, use_llm: bool = False, timeout_s: float = 8.0) -> tuple[str, str]:
    """Returns (advice_text, source) where source is 'llm' or 'template'."""
    if not use_llm:
        return deterministic_advice(indicator), "template"

    procedure = PROCEDURES.get(indicator, "Crew wellness check-in procedure")
    prompt = (
        f"{_SYSTEM_PROMPT}\n\nIndicator out of range: {indicator}. "
        f"The relevant onboard procedure is: {procedure}."
    )
    try:
        result = ollama_client.generate(prompt, timeout=timeout_s, json_mode=False)
        text = result.get("response", "").strip()
        if not text or "Procedure:" not in text:
            return deterministic_advice(indicator), "template"
        if DISCLAIMER not in text:
            text = f"{text}\n{DISCLAIMER}"
        return text, "llm"
    except Exception:
        return deterministic_advice(indicator), "template"
