"""Real Ollama checks on generated fixtures; no database writes.
From hestia/: server/.venv/bin/python scripts/verify_vision_fixtures.py
This is an observation tool, not an assertion of real-world accuracy.
"""
import json
import sys
from pathlib import Path

SERVER = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER))
from vision.catalogue_loader import load_ground_truth, load_removal_slot  # noqa: E402
from vision.pipeline import run_scan  # noqa: E402

results = []
for strategy in ("full", "row"):
    for fixture in ("full", "after_removal"):
        expected = load_ground_truth()
        if fixture == "after_removal":
            expected[load_removal_slot()] = 0  # A1 is visibly empty in this fixture.
        result = run_scan("image", str(SERVER / "vision" / "fixtures" / f"shelf_{fixture}.png"), strategy=strategy)
        actual = {key: value.count for key, value in result.readings.items()}
        results.append({"fixture": fixture, "strategy": strategy, "elapsed_s": result.elapsed_s,
                        "expected": expected, "actual": actual,
                        "exact_slots": sum(actual[key] == value for key, value in expected.items()),
                        "needs_confirmation": sorted(result.needs_confirmation),
                        "raw": result.raw_json})
        print(f"Finished {fixture}/{strategy}", file=sys.stderr, flush=True)
print(json.dumps(results, indent=2))
