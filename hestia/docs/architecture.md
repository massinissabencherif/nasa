# HESTIA — architecture and technical choices

How the code is organised and why. Rules for agents are in
[`AGENTS.md`](../../AGENTS.md); run instructions are in the
[README](../README.md).

## Overview

```
[Webcam] → STATION (MacBook)
   ├─ FastAPI + SQLite (SQLModel)                     server/
   ├─ Ollama: VLM (shelf counting) + text LLM (advice)
   ├─ Python engines: nutrition, alerts, forecasts
   └─ Desktop app: Tauri 2 + React                     apps/station/
          ▲  local Wi-Fi (no internet)
          ▼
   CREW mobile app: React + Capacitor                  apps/crew/
```

Monorepo (pnpm workspaces). Shared code is in `packages/ui` (silhouette,
charts, cards, tokens) and `packages/api-client` (typed fetch client and
shared types).

## Boundaries

- `server/app/engines/` holds the rules: status, thresholds, alerts, advice,
  nutrition, forecast, gamification, check-in. `forecast.py` is pure (no
  database). The others read through a SQLModel session.
- `server/app/routes/` exposes them over HTTP.
- `server/vision/` captures a frame, calls the local model and scores the
  answer. It knows nothing about the database.
- `server/data/` holds every number that can change without a code change,
  in three files that must not be mixed: `nasa_reference.json` (sourced
  reference values and flagged assumptions), `thresholds.json` (indicative
  colour bands) and `demo_rules.json` (rules the team chose for the demo:
  escalation to Earth, data freshness, how exercise and meals are counted).
  Also `food_catalogue.json`, `shelf_grid.json` and `reaction_protocols.json`
  (versioned, team-chosen performance-test parameters).
- Every check-in — phone form, demo scenario, test — goes through
  `engines/checkin.py::record_checkin`.

## Technical choices that still hold

- **Demo scale of the shelf.** The 29 packages in the generated shelf fixture stand for about 412
  days of food for 4 crew, through `food_item.units_per_lot`: one box is one
  storage lot of N rations. The UI says so.
- **One Ollama model in memory** (16 GB machine): `qwen2.5vl:7b` for vision
  and, when opted in, for advice text. `gemma3:4b` was rejected for vision
  and is not used at runtime. No cold model load during a scan.
- **Advice text** comes from fixed templates by default. The LLM path is
  opt-in and its output is checked in code.
- **Vision** (measured 11 Nov, see [vision-benchmark.md](vision-benchmark.md)):
  one call on the whole shelf at 768 px with a JSON schema of one integer per
  slot, about 19 s. "Accurate mode" is three row crops, about 50 s. Timings on
  a cached image look three times faster: never quote those. The model's own
  confidence was always 1.0, so `confidence` is a plausibility score computed
  in code. Stacked slots always ask for confirmation.
- **Demo state.** The seed ends yesterday and is all green. Anomalies are
  triggered live by a check-in or by
  `POST /api/demo/scenario/{low-exercise,red-alert,shelf-removal,demo-mars}`.
  Do not put anomalies back into the seed.
- **Forecast.** "Next cargo in N days" per context is a demo assumption
  stored in `nasa_reference.json`.
- **Crew app delivery.** The server builds and serves the crew app at
  `/crew/`, same origin as the API. Phones poll every 5 s; the station uses
  server-sent events.
- **Network.** The server listens on plain HTTP (`:8000`) and on HTTPS
  (`:8443`, self-signed certificate for the LAN address). HTTPS exists
  because Safari only allows the in-page camera on a secure page. Capacitor:
  Android uses cleartext HTTP; iOS needs the local-network keys.
- **Base network.** Do not assume macOS can host a hotspot without internet.
  The tested setups are listed in [risks.md](risks.md).
- **macOS prompts.** Camera access and the incoming-connection firewall
  prompt need one manual click before the demo.

## Versioned reaction sessions

The existing test runner implements current `reaction-5-v1` (1 practice + 5
measured), retaining `reaction-15-v1` for old results and pending submissions. New sessions and
raw attempts live in additive `ReactionSession` / `ReactionTrial` tables;
`engines/reaction.py` validates the sequence, recomputes statistics and
selects a comparable reference. The routes only expose those operations.
The browser keeps unsynced envelopes for the original station and crew
member, retrying the same session ID. Shared result/history components
serve the crew and station apps. No new dependency was added.
See [reaction-protocol.md](reaction-protocol.md) for limits and legacy data.

## 15 Nov interaction and tooling update

Full desktop profiles use `/crew/:crewId`; reaction results use a separate profile section. Shared controls/help and authored EN/FR strings are in `packages/ui`. Crew app remains capped at 480 px. See the [request register](sources/2026-11-15-interactions-and-evidence.md) for unfinished migration and verification. `VITE_API_BASE` can point the station preview at a disposable server. Local network and independent offline phone use are different.

## Known structural debts

Recorded on 14 Nov, not yet addressed:

- `apps/station/src/screens/PantryScreen.tsx` (665 lines) and
  `apps/crew/src/screens/Pantry.tsx` (441 lines) mix data loading, state and
  layout, with most styles written inline instead of using the shared tokens.
- `server/app/routes/pantry.py` (518 lines) mixes HTTP handling, stock
  calculations and database writes.

## Current camera and inventory flow (D34–D40)

Camera or imported photo → per-photo frame → scene check → count proposal →
human review → inventory snapshot. Shared camera/frame/review components are in
`packages/ui`; the thin HTTP review routes call `engines/pantry_review.py`.
The local model receives configured product names. Grid dimensions do not infer
identity or reassign labels; every frame starts at A1. No free mixed-bin detection.

Proposals are bounded (20), expire after 30 minutes and live in the station
process. Restart loses unsaved proposals. Saving locks the SQLite write transaction
and rejects any inventory/catalogue/meal change since analysis began. Partial
frames preserve unseen counts and carry their pending meals; changing a slot's
product makes its count unknown and excludes it from nutrition until recounted.
All live scans require review; old automatic replay is mock-only. Legacy advanced
reference-photo/calibration routes still exist, outside the new capture flow.

The real-photo scene gate and human review supersede the old direct-scan-to-stock
behavior. They do not establish accuracy. Single process and retained capture files
are prototype limitations. See the [evidence and limitations](sources/2026-11-15-camera-review-and-pantry.md).

`engines/pantry_setup.py` owns explicit stock-only emptying. It creates a zero
snapshot rather than deleting history, catalogue or people. Pending proposals
become stale. Review accepts an explicit `replace_stock` flag to zero unseen slots;
the default keeps partial-scan behaviour. `has_photo` prevents an empty stock from
showing a stale fixture. Product usage is derived from assignments during render,
not stored as a second state; repeated assignments remain valid.

## Editable catalogue and presentation scale (D42)

`pantry_setup.update_product` changes package values; `set_scale` persists the
same multiplier on every FoodItem. New catalogue entries inherit it. HTTP validates
fields; engines perform writes. No schema change or reset. Review revisions include
catalogue names/nutrients/scales to reject stale proposals. Editing values deliberately
recalculates historical meal nutrition; the approved UI states this limitation.

`counted_foods` groups all shelf locations for a product. Both current energy and
available meal portions subtract pending meals once per product. `counted_package_kcal`
is energy at the latest recorded count, without scaling or later meal subtraction;
`stock_kcal` remains the projected amount after meal deductions for compatibility.
The client displays these with different labels. Missing counts stay excluded.

Shared DetailSheet has a centred modal variant, preserving native dialog, close,
focus return and reduced motion. Nested dialog keyboard/cancel events are stopped
at the active dialog. Companion motion uses the existing visibility hook and CSS;
no frame-by-frame React update or animation dependency was added.
