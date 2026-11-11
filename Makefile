# HESTIA — one-command entry points. Everything runs locally; nothing needs the internet at runtime.
SHELL := /bin/sh
SERVER_PORT ?= 8000

.PHONY: help install build demo server station station-web crew-dev test reset check-offline android clean

help:
	@echo "make install       install JS and Python dependencies (needs internet, once)"
	@echo "make demo          build the crew app, start the server and the station window"
	@echo "make server        start only the API + crew app on :$(SERVER_PORT)"
	@echo "make station       start only the station (Tauri desktop window)"
	@echo "make station-web   station in a browser tab instead of the Tauri window"
	@echo "make test          run the backend test suite (52 tests)"
	@echo "make reset         reseed the database (Mars-base baseline, ~412 days)"
	@echo "make check-offline list every non-local URL found in the source"
	@echo "make android       sync the crew app into the Android project (needs the Android SDK)"

install:
	pnpm install
	cd server && uv sync

build:
	pnpm build:crew

# Server (API + crew app at /crew/) in the background, station window in the foreground.
# Closing the station window or Ctrl+C stops both. If the Tauri window cannot
# start, use `make server` and `make station-web` in two terminals instead.
demo: build
	@echo "Starting HESTIA. Crew app for phones: see Mission settings in the station (QR code)."
	@trap 'kill 0' INT TERM EXIT; \
	(cd server && uv run hestia-server) & \
	sleep 2; \
	pnpm --filter station tauri dev

server: build
	cd server && uv run hestia-server

station:
	pnpm --filter station tauri dev

station-web:
	pnpm dev:station

crew-dev:
	pnpm dev:crew

test:
	cd server && uv run pytest -q

reset:
	cd server && uv run hestia-reset-db

# Hard rule 1: no call to any non-local host. Prints every http(s) URL in our own
# source that is not localhost / a LAN placeholder / an XML namespace.
check-offline:
	@grep -rnoE "https?://[A-Za-z0-9._-]+" \
	  --include='*.py' --include='*.ts' --include='*.tsx' --include='*.css' --include='*.html' --include='*.json' \
	  server/app server/vision server/data apps/station/src apps/station/index.html apps/crew/src apps/crew/index.html packages \
	  | grep -vE "://(localhost|127\.0\.0\.1|192\.168\.[0-9.x]+|www\.w3\.org)" \
	  || echo "OK: no non-local URL in the application source."

android: build
	cd apps/crew && npx cap sync android
	@echo "Open apps/crew/android in Android Studio, or: cd apps/crew/android && ./gradlew assembleDebug"

clean:
	rm -rf apps/crew/dist apps/station/dist server/captures
