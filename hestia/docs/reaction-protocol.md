# Reaction time sessions — reaction-5-v1

Decisions: D15, shortened by D37. This evolves the existing reaction test; it is not a second
independent test. Parameters in `server/data/reaction_protocols.json` are
team choices for this prototype, not a validated NASA or clinical protocol.

## What the user does

Home → **Health assessments**, or **Check-in → Start**. The check-in form
is kept while the test is open; the session saves separately from that form.
The brain-zone panel also links to the assessment. There is no extra tab.

One practice trial is discarded, then five measured trials follow.
The previous 3 + 15 protocol remains accepted for saved/pending sessions;
its results and personal references are never mixed with the new version.
Each waits randomly 2–5 seconds; the visible text changes to “Tap now”.
Touch, primary mouse press, Space and Enter work. A false start has no
reaction time and repeats the same trial. After 3 seconds without a response,
the trial has no time and the next starts. Feedback lasts 900 ms. A maximum
of 128 measured attempts prevents an unbounded payload.

The runner uses `performance.now()` and a `requestAnimationFrame` callback;
React commits the signal in that callback before the timer starts. This
reduces scheduling ambiguity but cannot measure hardware/display/input
latency. The prototype has no clinical timing validation.

Focus loss, a hidden page or navigation interrupts the session and cancels
its timers. Returning does not resume it: restart practice or leave. An
explicit abandon also saves an incomplete session. Practice timings are
never sent; only the number of practice trials completed is stored.

## Saved results and comparison

The station validates the attempt order and outcomes, then computes the
median of valid times, valid count, false starts and timeouts. Client-supplied
aggregates are rejected. Trial details and median history are visible in the
crew app and in an opened crew member’s station card.

Only the previous **five complete sessions with a valid median**, ending
before the current session starts, form a reference. They must belong to the
same crew member, protocol, installation and source (`manual` or `simulated`).
The reference is the median of those five session medians. A comparison
shows an absolute difference and a percentage, without colours or alerts.
Before five sessions, the UI says “Building your personal reference”. An
unknown installation or a session with no valid response has no comparison.

A random UUID in localStorage identifies an installation, with no
fingerprinting. It cannot guarantee the same physical conditions. Clearing
browser data, using another origin (HTTP/HTTPS, LAN IP/localhost), browser or
native installation starts a different reference. Phone clock errors can
affect session ordering, although elapsed responses use a monotonic clock.

Old `Measurement.reaction_ms` records and their existing demo colour rule
remain as **Legacy reaction**. They are never mixed with the new sessions.
New sessions do not write measurements, alerts or Earth messages. SSE emits
only the event type and crew ID, without trial details. This is a trusted-LAN
prototype; the profile picker is not authentication.

## Persistence and failure states

`ReactionSession` and `ReactionTrial` are created additively at startup;
existing database records survive. No reset is needed to install this change.
New/reset demo databases get deterministic simulated complete and interrupted
sessions. `make reset` replaces the database: it is an explicit demo action,
not a migration procedure. New sample history is not injected into an
existing database.

The browser generates the session ID before the test. When it ends, it stores
a pending envelope with the original station URL and crew ID. A local preview
shows the attempts and statistics while saving. A successful station response
alone shows “Saved on the station”. On failure, the copy survives reload and
retries every 10 seconds, on reconnection or on “Retry saving”. The same ID
and payload return the existing record; reuse with a different payload is
rejected. Switching station or profile never retargets that pending result.

If browser storage is unavailable/full, the UI says to keep the screen open:
only an in-memory copy exists. Cached protocol parameters allow a test when
the station becomes unreachable after an initial connection. Without that
cache, connect once first. This is not a service worker: reopening the web
app itself still needs the station to serve it. Force-quitting the browser
mid-trial without a lifecycle event is not a supported recovery path.

## Checks and limits

Run from `hestia/`:

```bash
pnpm --filter crew test
pnpm build:crew && pnpm build:station
(cd server && .venv/bin/python -m pytest -q)
make check-offline
```

The Node tests use deterministic clocks to cover order, false starts,
timeouts, duplicate inputs, interruption, restart and pending persistence.
API tests reject malformed attempts, check UTC date handling, idempotency,
comparison exclusions, additive initialisation and unchanged colour/alert/
Earth behaviour. The existing demo scenario remains covered by its API test.
The dated verification record, including browser checks, is in
[STATUS.md](STATUS.md).

Still required on hardware: real iPhone/Android touch and input latency,
background/lock-screen lifecycle, the installed Capacitor app, actual LAN
outages and a complete rehearsal with the shelf/camera. No claim of medical
validity or operational fitness follows from these software checks.

Browser API references: [performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now),
[requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame),
[Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
