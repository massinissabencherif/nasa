# 30-second video script

Format: screen recordings of the real app, no stock footage. English
voice-over or silent with the subtitles in `video-subtitles.srt`. A caption
"SIMULATED DATA · NOT A MEDICAL DEVICE" stays in a corner for the whole video.

| Time | Picture | Voice-over / subtitle |
|---|---|---|
| 0:00–0:04 | Title card on the dark station background: "HESTIA", then the top bar "Mars base · Earth reply in 40 min". | A Mars base. No doctor. No internet. Earth is 20 minutes away. |
| 0:04–0:10 | Phone: check-in, exercise 10 min, Save. The bones zone of the silhouette turns orange; the advice card appears. | Each astronaut checks in. Their body shows what needs attention, and what to do about it. |
| 0:10–0:17 | Station, Live pantry: a hand removes three cans; "Scan now"; the counter runs from 412 down to 398. | A camera reads the food shelf. Three boxes gone: 412 days of autonomy become 398. |
| 0:17–0:23 | Forecasts: resupply delay slider to 60 days; "Ration to last"; the weight curve bends. | Cargo is 60 days late? See what rationing costs before deciding. |
| 0:23–0:28 | Alerts: red alert. Earth link: the 20:00 countdown starts. | A red alert goes to the crew now, and to Earth with the real delay. |
| 0:28–0:30 | End card: "HESTIA. Runs offline. AI stays on board." plus "AI-generated test images · simulated crew". | HESTIA. Health monitoring that still works when nobody can answer. |

Recording notes: run `make demo`, reset, record the station at 1280×800 and
the crew app at 390×844 (`http://localhost:8000/crew/`). The live scan takes
about 20 s: cut the wait, and keep the progress bar visible for a moment so
the cut is honest.
