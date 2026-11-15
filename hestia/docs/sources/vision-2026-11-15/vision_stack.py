import json, sys, time
sys.path.insert(0, "/Users/david.meguira/Documents/Perso/repos/ESGIxNASA/hestia-vision-worktree/hestia/server")
import cv2
from vision import capture, grid, ollama_client
from vision.catalogue_loader import load_ground_truth, load_slot_items
FIX = "/Users/david.meguira/Documents/Perso/repos/ESGIxNASA/hestia-vision-worktree/hestia/server/vision/fixtures/"
truth = load_ground_truth(); items = load_slot_items(); boxes = grid.load_boxes()
def ask(crop, prompt, schema, width=512):
    h, w = crop.shape[:2]
    img = cv2.resize(crop, (width, round(h * width / w)), interpolation=cv2.INTER_CUBIC)
    t = time.time(); r = ollama_client.generate(prompt, [grid.encode_jpeg_base64(img)], timeout=180, schema=schema)
    try: d = json.loads(r["response"])
    except Exception: d = {}
    return d, round(time.time() - t, 1)
COUNT = {"type": "object", "properties": {"count": {"type": "integer"}}, "required": ["count"]}
GRID = {"type": "object", "properties": {"columns": {"type": "integer"}, "layers": {"type": "integer"}, "count": {"type": "integer"}}, "required": ["columns", "layers", "count"]}
SHAPE = ("This image shows one shelf compartment holding {name}s. One {name} is a short, flat cylinder, wider than it is tall, with a metal rim at its top and at its bottom. "
         "Cans are stacked: a column that looks like one tall can with a rim line across its middle is two cans. Count every single can. Reply as JSON: {{\"count\": integer}}.")
DECOMP = ("This image shows one shelf compartment. Items may stand side by side in columns and be stacked in layers. "
          "First count the columns of items from left to right. Then count the layers: how many items are stacked on top of each other in one column (1 if nothing is stacked). "
          "Then give the total number of items. Answer 0 for all three if the compartment is empty. Reply as JSON: {\"columns\": integer, \"layers\": integer, \"count\": integer}.")
img = capture.load_image(FIX + "shelf_full.png")
mode = sys.argv[1]; out = {}
if mode == "a3":
    crop = grid.crop_box(img, boxes["A3"])
    d, s = ask(crop, SHAPE.format(name="tuna can"), COUNT); print("A3 shape hint  ->", d, s, "s (truth 4)", flush=True); out["shape"] = d
    d, s = ask(crop, DECOMP, GRID); print("A3 decomposed  ->", d, s, "s (truth 2 columns x 2 layers = 4)", flush=True); out["decomp"] = d
else:
    t0 = time.time(); wrong = {}
    for label, n in truth.items():
        d, s = ask(grid.crop_box(img, boxes[label]), DECOMP, GRID)
        ok = d.get("count") == n
        if not ok: wrong[label] = (d, n)
        print(f"{label}: {d}  truth {n}  {'ok' if ok else 'WRONG'}  {s} s", flush=True); out[label] = d
    print(f"decomposed per slot, full image: exact {12-len(wrong)}/12 in {round(time.time()-t0,1)} s", flush=True)
json.dump(out, open(sys.argv[2] + f"/vision_stack_{mode}.json", "w"), indent=1)
