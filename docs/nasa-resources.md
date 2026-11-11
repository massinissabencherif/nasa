# NASA challenge resources — TO UPDATE ON 13 NOV 2026

> **Stub.** NASA publishes the official resources for this challenge on
> Friday 13 November 2026. Nothing below has been checked against them yet.

## Checklist when the resources are out

1. Read the challenge resources and list every value they give for: Earth
   delay, radiation dose rates, career dose limit, bone loss, energy needs,
   medical thresholds.
2. Compare with `server/data/nasa_reference.json` (contexts and reference
   values) and `server/data/thresholds.json` (indicative bands). Both files
   are plain JSON, read at startup; no code change is needed to update a
   number. `uv run pytest` will tell you if a pinned demo number moved.
3. For every value that changes, update the "NASA Data" table in
   `docs/nasa-project-page.md` and the source note in the JSON file.
4. Anything we still cannot source goes under "assumptions" in
   `nasa_reference.json` so it shows as an ASSUMPTION in the Forecasts drawer.
5. Add the links below.

## Values currently used and where they come from

These came from the pre-event brief, not from the official resource list:

| Value | Used as | To verify |
|---|---|---|
| Mars surface dose 0.67 mSv/day | Curiosity RAD measurement | exact figure and citation |
| Transit dose 1.8 mSv/day | Curiosity RAD cruise measurement | exact figure and citation |
| Moon 1.369 mSv/day, ISS 0.523 mSv/day | brief | source |
| Career limit 600 mSv | NASA standard | citation (NASA-STD-3001) |
| Bone loss 1–1.5 %/month | NASA HRP | citation |
| Energy 12,000 kJ/day ≈ 2,870 kcal | brief | source |
| O₂ 0.82 g/min, CO₂ 1.04 g/min per person; ISS water recycling 98 % | stored, not used in a calculation | source |
| Mars delay 4–24 min | light-time range | citation |

## Links

_(add the official resource links here)_
