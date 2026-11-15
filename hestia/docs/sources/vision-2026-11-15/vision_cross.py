import json, sys, time
sys.path.insert(0, "/Users/david.meguira/Documents/Perso/repos/ESGIxNASA/hestia-vision-worktree/hestia/server")
from vision import pipeline
from vision.catalogue_loader import load_ground_truth
FIX = "/Users/david.meguira/Documents/Perso/repos/ESGIxNASA/hestia-vision-worktree/hestia/server/vision/fixtures/"
truth = load_ground_truth(); removed = dict(truth, A1=0)
out = {}
for tag, path, tr in (("full", FIX + "shelf_full.png", truth), ("removed", FIX + "shelf_after_removal.png", removed)):
    t = time.time(); r = pipeline.run_scan("image", image_path=path, strategy="cross"); s = round(time.time() - t, 1)
    counts = {k: v.count for k, v in r.readings.items()}
    wrong = {k: (counts[k], tr[k]) for k in tr if counts[k] != tr[k]}
    flagged = sorted(r.needs_confirmation)
    silent = sorted(k for k in wrong if k not in r.needs_confirmation)
    print(f"{tag:8s} {s:5.1f} s  exact {12-len(wrong)}/12  wrong(read,truth)={wrong}\n         flagged for a person: {flagged}\n         wrong AND not flagged (silent): {silent}", flush=True)
    print("         disagreements:", r.raw_json["disagreements"], flush=True)
    out[tag] = {"s": s, "counts": counts, "wrong": wrong, "flagged": flagged, "silent": silent, "full": r.raw_json["full"], "rows": r.raw_json["rows"]}
json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else "/dev/null", "w"), indent=1)
