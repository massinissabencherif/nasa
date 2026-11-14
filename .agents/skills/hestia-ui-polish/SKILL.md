---
name: hestia-ui-polish
description: Review and polish a HESTIA screen in ordered passes so that it stops looking machine-generated, without changing what it does. Use when a screen looks cheap or amateur, or before the demo. Not for business logic or scope changes.
---

# HESTIA UI polish

Method inspired by **unslop** by Damir Sokolovsky (CC BY 4.0,
<https://github.com/heydamir/unslop>), through David Meguira's
`anti-vibecode` skill. Adaptations for HESTIA: written in English, tied to
this repository's tokens and screens, the product direction below is fixed,
and the taste rules of David's other projects were removed. Keep this
credit if the text is reused.

Principle: keep the functions, the content and the order of sections;
change the craft. The background stays calm; richness goes into one or two
things worth remembering.

## Direction (fixed for HESTIA)

- Product: a health station for a crew far from Earth.
- Character: calm, exact, instrument-like. A panel you trust at 3 a.m.
- World: mission control at night — dark neutrals, one cyan accent,
  monospaced figures.
- Strong moments: the silhouette changing level; the countdown to Earth;
  the autonomy figure dropping after a scan.
- Signature detail: every status is a colour **and** an icon **and** a
  word, and a value always says whether it is measured, declared, estimated
  or simulated.

## Method

1. **Look at the real screen** in a browser, phone and desktop sizes, with
   the seeded data (see `hestia-verification`). Never a stand-alone mock-up.
2. **Audit.** List what you find with its exact place: gradients and
   glows, spaced capitals, emoji, loud copy, uneven spacing, stacks of
   identical cards, the same word said twice, dead space, everything the
   same size, an important action without a visible button.
3. **Choose the level**: heavy, light, or none. Say it.
4. **Nine passes, in order**, each finished on the whole screen before the
   next:
   - spacing: 4 px grid (`--space-*`), grouping by distance, aligned columns;
   - colour: the neutral ramp and the three text roles of `tokens.css`, one
     accent; green/orange/red only for status; no gradient, glow or
     coloured shadow;
   - icons: the family in `packages/ui/src/icons.tsx`, one stroke, no emoji;
   - copy: exact and plain, no exclamation mark, no superlative, one role
     per text;
   - type: Space Grotesk for text (David's choice, decision D16), Plex Mono
     for figures, weights 400–600, tabular figures;
   - layout: order kept, hierarchy by size (what matters most is the
     largest), no dead space;
   - details: nested radii, quiet secondary text, an important action
     always has a visible button;
   - visuals: the real product, no filler illustration;
   - motion: nothing looping or bouncing, one curve, and
     `prefers-reduced-motion` respected.
5. **Render again and compare** before and after (three renders at most).

## Forbidden

Renaming the product, changing a function or a promise, inventing data,
replacing removed decoration with a new trend (glass, grain, neon, bento),
adding a colour or a spacing value outside the tokens.

## Result

The level chosen, the changes per pass, what is still average, what was
not verified, with before/after screenshots.
