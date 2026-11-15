# Shelf demo v2 — candidate, not a validated fixture

Generated with the built-in OpenAI image tool on 15 Nov 2026 at David’s request
for a cleaner shelf image. Original PNG copied unchanged; the caption is in the
image. This is synthetic demo art, not a NASA photograph or a real food label.
It is NOT selected by the scanner, and neither existing fixture was replaced.

Direction: frontal cabinet, 3 rows × 4 slots, soft neutral lighting, matte frame,
recognisable food symbols, clear tier separation in the tuna stack. No original
fixture was supplied as an edit target. A2/B4/C4 packaging is stylised: nutrition
must still come from the configured simulated catalogue, never inferred from it.

Intended counts (also observed in Astra’s visual review; not human-certified):
A: 3, 2, 4, 0; B: 5, 2, 3, 1; C: 4, 0, 3, 2. Total 29.
Before using it as a fixture: David/Massi count it, calibrate its own grid,
then run the unchanged model and record errors/flags. Do not replace the old
benchmark with this easier image or claim evidence for a real shelf.

Prompt: new photorealistic, straight-on 4:3 12-compartment food cabinet for HESTIA;
original unbranded food packaging and the above exact intended counts; clear
stacked can rims; empty A4/C2; no people, planets, dramatic light, UI or extra
objects. Caption “AI-generated demo image”.


## Real demonstration proposal

NASA describes food organised by category in pantry-style containers, not the
open grocery cabinet illustrated here: [NASA interview](https://www.nasa.gov/podcasts/houston-we-have-a-podcast/space-food/).
For HESTIA's present fixed-grid prototype, rehearse a 3×4 marked support with a few
known packaged products, calibrate it, take a phone photo, check/correct counts,
remove one item and repeat. Keep a recorded photo as fallback. A random mixed
bin requires a different recognition/occlusion capability that is not delivered.
The phone photo-upload path exists (`capture=environment`), but its actual device,
network reachability and image format have not been checked on hardware.
The 212-rations-per-box multiplier is a demo assumption, not physical shelf yield.
