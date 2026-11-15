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
| Prettier (dev) | MIT | frontend formatting |

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

No NASA institutional insignia is used. Under D31, the NASA **Space Apps event**
mark and ESGI mark appear in credits, unchanged, with an independent-project label.
They are third-party marks, not relicensed as HESTIA code. The source research figure
below remains a scientific reference rather than an identity asset.

- `space-apps.svg`: unchanged from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:NASA_Space_Apps_Default_Logo_2-Color_Black.svg),
  whose source identifies the official Space Apps brand pack. Black two-colour
  version on white, no filter/recolour. [Brand guide consulted](https://assets.spaceappschallenge.org/media/documents/Space_Apps_Brand_Guide_-_23_May_2025.pdf).
- `esgi.svg`: unchanged [ESGI logo mirror](https://commons.wikimedia.org/wiki/File:ESGI_logo_2026.svg),
  credited there to ESGI/Réseau GES with esgi.fr as source. School context only.
- Mission illustrations and HESTIA web/install icons: authored SVG/project code;
  PNG install icons are deterministic renders of the HESTIA SVG. No NASA imagery.
- [Shelf demo v2 candidate](sources/assets/shelf-demo-v2-candidate.md): generated,
  visibly captioned, not selected by the scanner or used to replace the benchmark.

## Assets added in the 14–15 Nov pass

- `packages/ui/src/assets/hestia-pressure-monitor-v1.png`: generated with the
  built-in OpenAI image tool on 15 Nov, for HESTIA. Original concept monitor and
  upper-arm cuff, no NASA/third-party logo, no actual health readings. The UI
  labels it as generated and conceptual; the overlay is authored project code.
  [Provenance](sources/assets/hestia-pressure-monitor-v1.md).

- `packages/ui/src/assets/hestia-companion-v1.png`: generated using the built-in
  OpenAI image generation tool, captioned in the app. Prompt: an original compact
  habitat-maintenance companion, cream ceramic shell, navy display, cyan eyes,
  dome roof, small folded utility arms, transparent background; mature industrial
  design readable at 80 px; no text, NASA mark or medical cross. No existing
  character was supplied as a reference. This is not NASA artwork.
- `packages/ui/src/components/ZoneIllustration.tsx`: original project SVG
  illustrations; MIT with the code. Anatomical sketches are educational location
  cues, not medically validated imagery.
- `docs/sources/assets/curiosity-rad-pia17600.jpg`: unchanged historical research
  figure from [NASA Science](https://science.nasa.gov/resource/radiation-measurements-on-mars/),
  credit NASA/JPL-Caltech/SwRI. Kept out of the product; original institutional
  marks are not repurposed. Not relicensed as the project's own artwork.
