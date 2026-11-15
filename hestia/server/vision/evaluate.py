"""Measure the shelf reading on a folder of photos with a hand-counted truth.

    python -m vision.evaluate <folder> [--strategy cross] [--split holdout] [--repeat 1]

The folder holds the photos and a `truth.json`:

    {"photo-01.jpg": {"split": "tune", "counts": {"A1": 3, "A2": 0, ...}}, ...}

`split` is "tune" for photos used while adjusting the reading and "holdout"
for photos kept aside: a result only means something on "holdout". Counts are
written by a person who looked at the real shelf. What matters most is the
number of *silent* errors: a wrong count that no rule sent to a person."""

import argparse
import json
import sys
import time
from pathlib import Path

from . import capture, grid, pipeline
from .catalogue_loader import load_capacities, load_slot_items


def evaluate(folder: Path, strategy: str, split: str | None, repeat: int) -> dict:
    truth = json.loads((folder / "truth.json").read_text())
    boxes, slot_items, capacities = grid.load_boxes(), load_slot_items(), load_capacities()
    runs = []
    for name, entry in sorted(truth.items()):
        if split and entry.get("split") != split:
            continue
        expected = entry["counts"]
        image = capture.load_image(str(folder / name))
        for attempt in range(1, repeat + 1):
            started = time.perf_counter()
            result = pipeline.scan_live(image, boxes, slot_items, strategy=strategy, capacities=capacities)
            wrong = {s: {"read": result.readings[s].count, "truth": n} for s, n in expected.items()
                     if result.readings[s].count != n}
            runs.append({
                "photo": name, "split": entry.get("split"), "attempt": attempt,
                "seconds": round(time.perf_counter() - started, 1),
                "slots": len(expected), "exact": len(expected) - len(wrong), "wrong": wrong,
                "flagged": sorted(result.needs_confirmation),
                "silent": sorted(s for s in wrong if s not in result.needs_confirmation),
                "phantom": sorted(s for s, w in wrong.items() if w["truth"] == 0),
                "missed": sorted(s for s, w in wrong.items() if w["read"] < w["truth"]),
                "warnings": result.warnings or [], "raw": result.raw_json,
            })
    slots = sum(r["slots"] for r in runs)
    return {
        "strategy": strategy, "split": split or "all", "photos": len({r["photo"] for r in runs}), "runs": len(runs),
        "slots": slots, "exact": sum(r["exact"] for r in runs),
        "silent_errors": sum(len(r["silent"]) for r in runs),
        "phantom_items_in_empty_slots": sum(len(r["phantom"]) for r in runs),
        "undercounts": sum(len(r["missed"]) for r in runs),
        "slots_sent_to_a_person": sum(len(r["flagged"]) for r in runs),
        "seconds_per_scan": sorted(r["seconds"] for r in runs),
        "details": runs,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("folder", type=Path)
    parser.add_argument("--strategy", default="cross", choices=["full", "row", "cross"])
    parser.add_argument("--split", default=None, choices=["tune", "holdout"])
    parser.add_argument("--repeat", type=int, default=1)
    parser.add_argument("--out", type=Path, default=None, help="write the full JSON report here")
    args = parser.parse_args()
    report = evaluate(args.folder, args.strategy, args.split, args.repeat)
    summary = {k: v for k, v in report.items() if k != "details"}
    print(json.dumps(summary, indent=1))
    for run in report["details"]:
        print(f"  {run['photo']} #{run['attempt']}: {run['exact']}/{run['slots']} in {run['seconds']} s"
              f" · wrong {run['wrong'] or 'none'} · silent {run['silent'] or 'none'} · flagged {run['flagged']}")
    if args.out:
        args.out.write_text(json.dumps(report, indent=1))
    sys.exit(0)


if __name__ == "__main__":
    main()
