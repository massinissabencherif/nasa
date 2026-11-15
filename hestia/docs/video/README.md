# HESTIA — 30-second demo video (NASA Space Apps 2026)

`hestia-30s.mp4` — 1920×1080, 30 fps, 29.8 s, English captions, AAC stereo (−16 LUFS, true peak −1.5 dBTP).
It is the online project demo (NASA rule: video of 30 seconds or less, or up to seven slides).

## What it shows (all real captures of the app, disposable database, `main` at `8daaa75`)

| Time | On screen | Source in the app |
|---|---|---|
| 0–3.6 s | "No doctor. No internet." Earth answers in 40 min | Station header: Earth reply in 40 min (round trip), 20 min one way |
| 4.2–8.4 s | Sofia checks in on her phone ("no internet": phone and station share the base network); red alert; crew board turns red live | `demo/scenario/red-alert`, crew app Home, station Crew |
| 9.0–13.0 s | Alerts page, indicative steps | Station Alerts |
| 13.6–17.8 s | Shelf photo, 12 slots: local AI counts, a person checks | Station Pantry (demo pictures are AI-generated) |
| 18.4–22.6 s | Simulator report: cargo 90 days late → ration 87 % | Management simulator, "Example: the cargo is 90 days late" |
| 23.2–26.6 s | Earth link: report received, reply on its way, onboard plan while waiting (the film clock lands on the app's 19:44) | Earth link after "+20 min" |
| 27.2–29.8 s | End card, team, features not shown | Reaction test, meals, history, QR pairing, NASA sources, EN/FR |

The Earth clock in the film is a time-lapse of story time (labelled "Time-lapse"); during holds it ticks in real time.
The shelf counts come from the seeded demo scan, not from a live model run during capture. No accuracy is claimed.

## Labels required by the rules

- Every frame: "Simulated data · not a medical device".
- AI-generated images carry a visible tag where they appear (shelf photo, mascot); the credits say "AI-assisted production".
- No NASA logo or insignia; the event is named in text only. No minors.

## Re-render after a UI change (about 3 minutes, macOS + Google Chrome)

1. Run the app on a disposable database, for example API on 8020 and station on 1423
   (`HESTIA_DB_PATH=/tmp/hestia-video.db HESTIA_PORT=8020`, `VITE_API_BASE=http://127.0.0.1:8020 pnpm --filter station exec vite --port 1423`).
2. In this folder: `npm i --no-save playwright-core@1.55.0`, then `node src/capture.mjs` (writes `captures/`).
3. `node src/render.mjs keys` for a contact sheet, `node src/render.mjs full` for the 894 frames (`build/frames/`).
4. Sound: `python src/score.py` (needs numpy) → `build/score.wav`; normalise and mux as described in `audio-sources.md`.
5. Encode: `ffmpeg -framerate 30 -i build/frames/f%04d.png -c:v libx264 -crf 14 -tune animation -pix_fmt yuv420p video.mp4`.

`brief.md` holds the direction, beats and checks. `captures/`, `build/` and `node_modules/` are not versioned.
