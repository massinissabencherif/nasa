# HESTIA crew app

React + Vite web app for the astronauts' phones: profile, daily check-in,
meal, history, body silhouette, alerts.

## Run

- **Normal path**: `pnpm build:crew` (or `make build`), then the station
  server serves it at `http://<station-ip>:8000/crew/`. Scan the QR code shown
  on the station under Mission settings.
- **Development**: `pnpm dev:crew` (Vite on port 5173, bound to the LAN).

The station address defaults to port 8000 of the host the page was loaded
from. It can be changed under Settings, or passed once in the URL:
`?station=http://192.168.1.20:8000`.

The app polls the station every 5 seconds rather than keeping an SSE stream
open: polling survives a sleeping phone and a flaky hotspot.

## Android (Capacitor)

`android/` is a generated Capacitor project. `capacitor.config.json` sets
`androidScheme: "http"` and `cleartext: true`, and the manifest has
`android:usesCleartextTraffic="true"`, because the station is reached over
plain HTTP on the base LAN.

```bash
make android                                  # build the web app + cap sync
cd apps/crew/android && ./gradlew assembleDebug   # needs the Android SDK
```

Not built yet: the Android SDK is not installed on the development machine.
In the native shell the station address must be entered under Settings.

## iPhone

- **Safari over HTTPS**: `https://<station-ip>:8443/crew/` (QR code on the
  station). Accept the one-time certificate warning; this secure address is
  what allows the in-page camera viewfinder. "Add to Home Screen" makes it
  full screen.
- **Native app**: `ios/` is a generated Capacitor project (Swift Package
  Manager). `Info.plist` already has `NSAllowsLocalNetworking`,
  `NSLocalNetworkUsageDescription` and `NSCameraUsageDescription`.
  `make ios`, then open `ios/App/App.xcodeproj` in the full Xcode, choose a
  signing team and your iPhone, Run. Not built yet: only the command-line
  tools are installed on the development machine.
