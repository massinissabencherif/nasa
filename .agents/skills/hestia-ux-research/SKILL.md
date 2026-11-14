---
name: hestia-ux-research
description: Turn a difficulty observed in a HESTIA screen into a small, justified change, using research on human behaviour only where it is relevant and actually read. Use for questions of hierarchy, discoverability, attention or error recovery in the crew app or the station. Not needed for routine styling.
---

# HESTIA UX research

Adapted from David Meguira's `human-brain-ux` skill for this repository.
The purpose is to make the astronaut's task understandable and
controllable, not to decorate a screen with named biases.

## Start with the task

Who is using the screen (an astronaut alone, tired, no doctor; or a jury
member seeing it for the first time), what they are trying to do, where
they hesitate, and what success looks like. Separate what was **observed**
(a person, a screenshot, a replay) from what the team **guesses**.

## Find the relevant evidence

Search for evidence about that specific friction, not a list of cognitive
effects. Read a source before citing it. Prefer original studies, reviews
and standards (W3C accessibility guidance) for claims; credible UX
specialists for applied advice. If you could not read a source, call the
proposal a local hypothesis.

Do not turn popular summaries (Hick, Miller, Gestalt) into numerical
layout rules. Do not invent effect sizes or studies.

## Translate

For each finding kept:

**observed friction → relevant finding → concrete change → trade-off →
verification.**

Label the basis: empirical result, accessibility guidance, expert
practice, product inspiration, or local hypothesis.

HESTIA specifics:

- A health tool must not hide what matters: a red level, "no data", the
  disclaimer. Progressive disclosure is for the secondary, never for a
  warning.
- Colour is never the only signal (icon and word too).
- Do not use urgency or guilt to make someone check in.
- A local hypothesis is not scientific evidence, and nothing here is
  medical validation.

## Result

The problem, one or two findings with links, the recommended change and
one alternative with their trade-offs, and the smallest useful check (a
task, a success criterion, what stays uncertain). Record it in
`hestia/docs/sources/` when it changes a screen. Never claim a user test
that did not happen.
