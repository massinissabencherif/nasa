# Reaction results and zone explanations — 15 Nov

Scope approved by David: result hierarchy, French/English copy, body explanations
and responsive checks. Later steering: use vertical trial bars and aim to keep
the main result and actions on one screen. Branch: `fix/reaction-zone-clarity`.

## Direction and decisions

Light visual pass, substantial copy hierarchy change. Keep HESTIA's dark station
palette, Space Grotesk/Plex Mono, shared icons and existing motion. The measured
number is the focal point; no decorative mascot, new animation or health score.

Observed friction: David could not quickly identify the result or its comparison;
English fragments, equal-weight paragraphs and long caveats obscured the actions.
The local UX hypothesis is that grouping number/counts, a short reference note,
then labelled bars will be easier to scan. Detailed interpretation remains a
keyboard-accessible disclosure. No usability study or speed improvement is claimed.
This applies anti-vibecode and human-brain-ux as review methods, not empirical proof.

For the body, measures/action stay visible. Expanded explanations use titled
sections and Guide-style notes. The compact reference table remains separate from
full ordered rules. More than eight attempts use horizontal bars so older tests
and repeated invalid attempts keep readable labels; no attempt is dropped.

## Screens

- [Before: seeded historical test](reaction-result-before.png): real local
  simulated 15-trial history; raw English comparison and dense prose.
- [After: five-trial completion](reaction-result-columns.png): real app, **intercepted
  UI fixture** (299ms median, five values, no previous comparable test). This image
  is not a measured human test or a vision/scientific benchmark.
- [Body explanation on mobile](zone-result-mobile.png): seeded heart data,
  no writes. Units stay beside the reference values.

The before/after images show different stored/result states; they are layout
evidence, not a controlled quantitative comparison. Controls remain reachable
with larger text or shorter viewports through normal scrolling.

## Verification

| Check | Result / limit |
|---|---|
| Crew and station TypeScript/build | Pass; existing large-bundle warning remains (~830/859kB) |
| Oxlint, touched components | Pass, no findings |
| Prettier, touched files; `git diff --check` | Pass |
| Chrome 390×844, complete five-trial result | Median, bars and actions visible without scrolling; 4px residual main scroll |
| Chrome 320×740, same result | No horizontal page overflow; vertical scrolling allowed |
| Reference building, faster comparison, incomplete, no valid response, unidentified device | Intercepted API fixtures; expected labels, FR/EN and empty bars checked |
| Result disclosure | Keyboard focus + Enter opens/closes it |
| Interrupted test while saving fails | Intercepted failed POST, local-copy/exclusion wording visible, no false “saved” status; reduced-motion browser |
| Body heart/brain, 390×844 | Open/close sheet, explanation and complete rules; no horizontal overflow |
| Body at 820×1180, 1180×820, 1440×900 | Loaded seeded profile, heart rules, no horizontal overflow |
| Historical result on station | Seeded 15-trial session still uses horizontal bars |

Chrome ran on David's Mac. Reaction POSTs were intercepted; the actual timing
protocol, comparison calculations and database writes are not revalidated by
these checks. The final UI harness accelerated only its intercepted waiting
parameters. No backend engine changed, no reset, no broad backend suite rerun.
Initial harness failures were wrong translated button selectors and toggling an
already-open disclosure; corrected checks passed without application changes.

Physical tablet/phone, enlarged-text accessibility sweep, all eight body zones,
hardware camera/Ollama and Massi's machine were not exercised in this lot. The
check-in form was inspected but not redesigned. The long full-rule view is still
intentionally optional, and raw server errors may still contain English.
