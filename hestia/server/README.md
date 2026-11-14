# HESTIA server

FastAPI + SQLite (SQLModel), Python 3.12, managed with uv.

```bash
uv sync
uv run hestia-server      # API on 0.0.0.0:8000, crew app at /crew/, docs at /docs
uv run hestia-reset-db    # drop and reseed (needed after a model change)
uv run pytest -q
```

- `app/engines/` — nutrition, thresholds, status, alerts, advice, check-in,
  forecast, gamification. `forecast.py` is pure and has no database access.
- `app/routes/` — HTTP API. `demo.py` holds the stage scenarios.
- `vision/` — capture, calibrated grid, VLM pipeline, benchmark, fixtures.
- `data/` — thresholds, NASA reference values and assumptions, food
  catalogue, slot grid. Edit these JSON files to change a number.

Environment: `HESTIA_DB_PATH`, `HESTIA_PORT`, `HESTIA_RELOAD=1`,
`HESTIA_VISION_STRATEGY=full|row`. Ollama must listen on `localhost:11434`
with `qwen2.5vl:7b` for camera and image scans; replay scans need nothing.
