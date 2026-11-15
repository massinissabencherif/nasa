import json, sys, time
sys.path.insert(0, "/Users/david.meguira/Documents/Perso/repos/ESGIxNASA/hestia-vision-worktree/hestia/server")
import cv2
from vision import capture, grid, ollama_client
from vision.catalogue_loader import load_ground_truth, load_slot_items
FIX = "/Users/david.meguira/Documents/Perso/repos/ESGIxNASA/hestia-vision-worktree/hestia/server/vision/fixtures/"
truth = load_ground_truth(); removed = dict(truth, A1=0); items = load_slot_items(); boxes = grid.load_boxes()
SCHEMA = {"type": "object", "properties": {"rows": {"type": "integer"}, "per_row": {"type": "integer"}, "count": {"type": "integer"}}, "required": ["rows", "per_row", "count"]}
COUNT = {"type": "object", "properties": {"count": {"type": "integer"}}, "required": ["count"]}
def prompt_rows(name):
    return (f"This image shows one compartment of a shelf holding {name}. Items can stand side by side and can be stacked on top of each other. "
            "Count the horizontal rows of items from top to bottom (1 if nothing is stacked), then the items in one row, then the total. "
            "If the compartment is empty, answer 0 for all three. Reply as JSON.")
LAYERS = ("This image shows one shelf compartment. Items may be stacked in layers, one on top of another: count every item in every layer, "
          "not only the top row. Answer 0 if the compartment is empty. Reply as JSON: {\"count\": integer}.")
def ask(c, prompt, schema, width=768):
    h, w = c.shape[:2]
    b = grid.encode_jpeg_base64(cv2.resize(c, (width, round(h * width / w)), interpolation=cv2.INTER_CUBIC))
    t = time.time(); r = ollama_client.generate(prompt, [b], timeout=180, schema=schema)
    try: d = json.loads(r["response"])
    except Exception: d = {}
    return d, round(time.time() - t, 1)
mode = sys.argv[1]; out = {}
if mode == "isolate":
    img = capture.load_image(FIX + "shelf_full.png"); crop = grid.crop_box(img, boxes["A3"])
    h = crop.shape[0]; tight = crop[int(h * 0.45):int(h * 0.92), :]
    d, s = ask(crop, prompt_rows("tuna cans"), SCHEMA); print("regular crop + rows question :", d, s, "s", flush=True); out["regular_rows"] = d
    d, s = ask(tight, LAYERS, COUNT); print("tight crop   + old question  :", d, s, "s", flush=True); out["tight_old"] = d
    d, s = ask(tight, prompt_rows("tuna cans"), SCHEMA); print("tight crop   + rows question :", d, s, "s (truth 4)", flush=True); out["tight_rows"] = d
else:
    for tag, path, tr in (("full", FIX + "shelf_full.png", truth), ("removed", FIX + "shelf_after_removal.png", removed)):
        img = capture.load_image(path); wrong = {}; t0 = time.time(); res = {}
        for label, n in tr.items():
            name = (items[label]["name"].lower() + "s") if items[label] else "items"
            d, s = ask(grid.crop_box(img, boxes[label]), prompt_rows(name), SCHEMA)
            res[label] = d
            if d.get("count") != n: wrong[label] = (d, n)
        out[tag] = {"readings": res, "wrong": {k: [v[0], v[1]] for k, v in wrong.items()}, "s": round(time.time() - t0, 1)}
        print(f"{tag:8s} rows question on each regular crop: exact {12-len(wrong)}/12 in {out[tag]['s']} s  wrong={wrong}", flush=True)
json.dump(out, open(sys.argv[2] + f"/vision_rows_{mode}.json", "w"), indent=1)
