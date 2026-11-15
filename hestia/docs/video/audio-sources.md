# Audio of the HESTIA 30 s film — sources and licence

- `src/score.py` synthesises every sound (pad, arpeggio, heartbeat, ticks, risers, clicks, chimes, pings) from oscillators
  and noise. No sample, loop or third-party recording is used, so no external licence applies.
- The code was written with an AI assistant (declared in the film credits as "AI-assisted production" and on the NASA page).
- Event times are copied from `src/film.html` (clock keyframes, clicks, transitions).
- Pipeline: `src/score.py` → `build/score.wav` → two-pass `loudnorm` (I −16 LUFS, TP −1.5) → Apple AAC 256 kb/s CBR (`aac_at`)
  → remuxed over the rendered video.
- Measured on `hestia-30s.mp4`: integrated −16.0 LUFS, true peak −1.5 dBTP, duration 29.80 s. Not listened to by the
  agent; the ear check is David's.
