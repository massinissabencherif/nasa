# Licences

HESTIA's own code is released under the **MIT** licence (see `LICENSE`).

Licences below are those the projects publish; versions are pinned in
`pnpm-lock.yaml` and `server/uv.lock`. Check the lock files before any
redistribution beyond the hackathon.

## Runtime dependencies — server (Python)

| Package | Licence | Used for |
|---|---|---|
| FastAPI | MIT | HTTP API |
| Uvicorn | BSD-3-Clause | ASGI server |
| SQLModel, SQLAlchemy | MIT | models and SQLite access |
| Pydantic | MIT | validation |
| opencv-python (OpenCV) | Apache-2.0 (bindings MIT) | webcam capture, crops |
| NumPy | BSD-3-Clause | image arrays |
| HTTPX | BSD-3-Clause | calls to the local Ollama |
| python-multipart | Apache-2.0 | form parsing |
| segno | BSD-3-Clause | local QR code generation |
| pytest (dev only) | MIT | tests |

## Runtime dependencies — apps (JavaScript)

| Package | Licence | Used for |
|---|---|---|
| React, React DOM | MIT | UI |
| React Router | MIT | navigation |
| Recharts | MIT | charts |
| Vite, @vitejs/plugin-react (build) | MIT | bundling |
| TypeScript (build) | Apache-2.0 | type checking |
| Tauri (API, CLI, opener plugin) | MIT or Apache-2.0 | desktop window |
| Capacitor (core, CLI, android) | MIT | mobile shell |
| oxlint (dev) | MIT | linting |

## AI runtime and models

| Item | Licence | Note |
|---|---|---|
| Ollama | MIT | local model server, not bundled |
| Qwen2.5-VL 7B (`qwen2.5vl:7b`) | Apache-2.0 | the only model loaded at runtime; weights are not in the repo |
| Gemma 3 4B (`gemma3:4b`) | Gemma Terms of Use | tested and rejected for vision; not used at runtime |

## Assets

| Asset | Origin | Licence |
|---|---|---|
| Space Grotesk, weights 400–700, latin subset (`packages/ui/src/fonts`), the interface font | Space Grotesk Project Authors, files from the `@fontsource/space-grotesk` 5.2.8 package | SIL Open Font Licence 1.1; the licence text is `packages/ui/src/fonts/OFL-space-grotesk.txt` |
| IBM Plex Sans and Plex Mono (`packages/ui/src/fonts`): Plex Mono for measures and durations, Plex Sans as the fallback of the interface font | IBM | SIL Open Font Licence 1.1 |
| Icons (`packages/ui/src/icons.tsx`) and body silhouette | drawn for this project | MIT (project licence) |
| Shelf test photos (`server/vision/fixtures`) | AI-generated for this project | captioned as AI-generated in the app |
| Tauri default app icons (`apps/station/src-tauri/icons`) | Tauri template | MIT or Apache-2.0; to replace before any public release |

No NASA logo or mark is used anywhere.
