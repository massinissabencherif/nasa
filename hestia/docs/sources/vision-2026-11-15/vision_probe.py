import json, sys, time
sys.path.insert(0, "/Users/david.meguira/Documents/Perso/repos/ESGIxNASA/hestia-vision-worktree/hestia/server")
import cv2
from vision import capture, grid, ollama_client
FIX = "/Users/david.meguira/Documents/Perso/repos/ESGIxNASA/hestia-vision-worktree/hestia/server/vision/fixtures/"
img = capture.load_image(FIX + "shelf_full.png"); boxes = grid.load_boxes()
crop = grid.crop_box(img, boxes["A3"])
def enc(c, width):
    h, w = c.shape[:2]
    return grid.encode_jpeg_base64(cv2.resize(c, (width, round(h * width / w)), interpolation=cv2.INTER_CUBIC))
t = time.time()
r = ollama_client.generate("Describe the blue objects in this shelf compartment in two sentences: their shape, and whether any horizontal metal rim or seam crosses the middle of a column.", [enc(crop, 512)], timeout=180, json_mode=False)
print("describe 512:", r["response"].strip()[:400], round(time.time() - t, 1), "s", flush=True)
# tighter crop on the items only (lower 60 % of the compartment), then a large upscale
h, w = crop.shape[:2]; tight = crop[int(h * 0.45):int(h * 0.92), :]
cv2.imwrite(sys.argv[1] + "/a3_tight.jpg", tight)
SCHEMA = {"type": "object", "properties": {"rows_of_cans": {"type": "integer"}, "cans_per_row": {"type": "integer"}, "count": {"type": "integer"}}, "required": ["rows_of_cans", "cans_per_row", "count"]}
P = ("This close-up shows cans on a shelf. Each can is a short flat cylinder with a silver rim at its top and bottom. "
     "Count the horizontal rows of cans from top to bottom, then the cans in one row, then the total. Reply as JSON.")
for width in (768, 1024):
    t = time.time(); r = ollama_client.generate(P, [enc(tight, width)], timeout=180, schema=SCHEMA)
    print(f"tight crop {width}:", r["response"], round(time.time() - t, 1), "s (truth 2 rows x 2 = 4)", flush=True)
