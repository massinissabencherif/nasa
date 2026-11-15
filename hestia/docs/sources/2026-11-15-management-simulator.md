# Management simulator — step-by-step flow (15 Nov)

**Problem (observed by Massi on the station):** the simulator showed seven
sliders and four charts at once. A jury member or a tired astronaut does not
know where to start, and the default horizon (400 d) hid the effect of a late
cargo, so the "resupply delay" slider seemed to do nothing.

**Change:** five short steps, two or three fields each, every value pre-filled
from the live mission and stock and confirmed before moving on, each with a
"why we ask" line; then a report that states the four outcomes in sentences
before the charts, lists the confirmed inputs with "Change", and is kept in a
history. The default horizon is the next cargo plus 120 days.

**Basis:** local hypothesis and expert practice (one decision per screen,
progressive disclosure of secondary detail). No user test was run. Warnings
(days without food, ration under the 70 % floor, radiation limit) stay on the
step and in the report, never behind a toggle.

**Trade-off:** a guided flow is slower than live sliders. The home screen
offers "Example: the cargo is 90 days late" so the pitch can confirm five
pre-filled steps quickly; "Change" on a report replaces live tweaking.

**Smallest useful check:** someone who has never seen HESTIA goes from the
Pantry to a saved report for a 90-day late cargo without help, and can say
on which day food runs out (expected: day 413, 57 days without food on the
demo baseline).

## Report findings as three counters (15 Nov, later)

**Request (Massi):** replace the list with one badge per line by three large
counters — critical, caution, nominal — each opening a modal with its
findings. **Basis:** product choice, local hypothesis; no evidence read for
it. **Trade-off:** the report reads at a glance, but a red finding needs a
click to be read, which goes against the project rule that warnings are not
hidden. Alternative kept on record: counters on top with red findings always
listed below. **Check:** a first-time viewer says how many critical findings
the report has, and what they are, within ten seconds.
