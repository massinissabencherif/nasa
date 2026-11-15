"""Vision experiment, run from the vision worktree. One change at a time.
Truth is verified by eye on 15 Nov (see report). Nothing here touches the engine."""
import json, sys, time
sys.path.insert(0, "/Users/david.meguira/Documents/Perso/repos/ESGIxNASA/hestia-vision-worktree/hestia/server")
import httpx
from vision import capture, grid, pipeline, ollama_client
from vision.catalogue_loader import load_ground_truth, load_slot_items

FIX = "/Users/david.meguira/Documents/Perso/repos/ESGIxNASA/hestia-vision-worktree/hestia/server/vision/fixtures/"
OUT = "/private/tmp/claude-502/-Users-david-meguira-Documents-Perso-repos-ESGIxNASA/704cab6f-a13b-4d60-8550-e9b24f9a401e/scratchpad/"
truth_full = load_ground_truth()
truth_removed = dict(truth_full, A1=0)
images = {"full": (FIX + "shelf_full.png", truth_full), "removed": (FIX + "shelf_after_removal.png", truth_removed)}
labels = list(truth_full)
results = {}

def show(name, counts, truth):
    wrong = {k: (counts[k], truth[k]) for k in labels if counts[k] != truth[k]}
    print(f"{name:34s} exact {12 - len(wrong):2d}/12  wrong(read,truth)={wrong}", flush=True)

# 0) which model exactly
try:
    tags = httpx.get("http://localhost:11434/api/tags", timeout=5).json()
    results["model"] = [m for m in tags["models"] if m["name"] == ollama_client.VISION_MODEL]
except Exception as exc:
    results["model"] = str(exc)

slot_items = load_slot_items()
# variant: no pre-named food, no "(expected)" hint for empties -> removes the possible priming
generic = {label: {"name": "food product"} for label in labels}

for tag, (path, truth) in images.items():
    # baseline, whole image (cold for the first call of the session)
    for run in (1, 2):
        t = time.time()
        r = pipeline.run_scan("image", image_path=path, strategy="full")
        counts = {k: r.readings[k].count for k in labels}
        results[f"{tag}/baseline/run{run}"] = {"counts": counts, "s": round(time.time() - t, 1), "flagged": sorted(r.needs_confirmation)}
        show(f"{tag} baseline run{run} ({results[f'{tag}/baseline/run{run}']['s']} s)", counts, truth)
    # single change: do not tell the model what each compartment should hold
    t = time.time()
    r = pipeline.run_scan("image", image_path=path, strategy="full", slot_items=generic)
    counts = {k: r.readings[k].count for k in labels}
    results[f"{tag}/no-priming"] = {"counts": counts, "s": round(time.time() - t, 1)}
    show(f"{tag} no-priming ({results[f'{tag}/no-priming']['s']} s)", counts, truth)

# A1 crop actually seen by the model on the removal image, and a direct question on it
img = capture.load_image(images["removed"][0])
boxes = grid.load_boxes()
crop = grid.crop_box(img, boxes["A1"])
import cv2
cv2.imwrite(OUT + "a1_removed_crop.png", crop)
cv2.imwrite(OUT + "a1_removed_crop_small.jpg", capture.downscale(crop, 512))
b64 = grid.encode_jpeg_base64(capture.downscale(crop, 512))
t = time.time()
resp = ollama_client.generate(
    "This image shows one shelf compartment. Count the separate food items visible in it. Answer 0 if the compartment is empty. Reply as JSON: {\"count\": integer}.",
    [b64], timeout=120, schema={"type": "object", "properties": {"count": {"type": "integer"}}, "required": ["count"]},
)
results["removed/A1-crop-direct"] = {"answer": resp.get("response"), "s": round(time.time() - t, 1)}
print("A1 crop direct question ->", resp.get("response"), f"({results['removed/A1-crop-direct']['s']} s)", flush=True)
print("A1 box (normalised):", boxes["A1"])
json.dump(results, open(OUT + "vision_exp.json", "w"), indent=1, ensure_ascii=False)
