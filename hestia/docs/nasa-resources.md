# Challenge resources and where our values come from

Updated on 14 Nov 2026. It replaces the stub written before the official
resources were published.

## Official resources of the challenge

Listed on the challenge page, read on 14 Nov 2026
(<https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/>).

| Resource | From | Used for |
|---|---|---|
| 5 Hazards of Human Spaceflight | NASA Human Research Program | The hazard named in each body zone |
| Risks of Human Spaceflight | NASA Human Research Program | Not yet linked zone by zone: to do before quoting a risk by its official name |
| Ongoing HRP Research in Space | NASA Human Research Program | Not used |
| Monitoring Radiation for Astronaut Health | Canadian Space Agency | A lead for the ISS dose rate, which has no source today |
| Why Do We Conduct Science Experiments in Space? | Canadian Space Agency | Not used |

## Where each value comes from

The machine-readable version is the `sources` block of
`server/data/nasa_reference.json`; the reading notes are in
[sources/2026-11-14-counter-review-claude.md](sources/2026-11-14-counter-review-claude.md),
section 4.

| Value | Source | Verified how |
|---|---|---|
| Five hazards | NASA HRP, <https://www.nasa.gov/hrp/hazards> | Challenge page and search summary |
| Career limit 600 mSv | NASA-STD-3001; NASA OCHMO radiation protection technical brief | Search summary of the NASA brief |
| Mars surface 0.67 mSv/day | Curiosity RAD, Hassler et al., Science 2014; SwRI press release | Press release; other reports give 0.64 |
| Transit 1.8 mSv/day | Curiosity RAD cruise data, Zeitlin et al., Science 2013 | Press reports (1.8 and 1.84) |
| Moon 1.369 mSv/day | Chang'e-4 lander, Zhang et al., Science Advances 2020. **Not a NASA measurement** | Press coverage of the paper |
| Bone loss about 1–1.5 %/month | Canadian Space Agency (TBone); review in PMC | Agency page and review abstract |
| Mars delay about 3–22 min one way | NASA, NTRS 20220013418 | Search summary |
| Reaction Self-Test on the ISS | NASA NTRS 20090029851 and 20140000075; University of Pennsylvania | Search summary |
| ISS 0.523 mSv/day | **None found** | Flagged as an assumption in the app |

Links:

- NASA OCHMO radiation protection technical brief — <https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf>
- SwRI, first radiation measurements from the surface of Mars — <https://www.swri.org/press-release/swri-scientists-publish-first-radiation-measurements-surface-mars>
- Hassler et al. 2014 — doi:10.1126/science.1244797
- Zhang et al. 2020 — doi:10.1126/sciadv.aaz1334
- Canadian Space Agency, TBone — <https://www.asc-csa.gc.ca/eng/sciences/tbone.asp>
- Bone loss review — <https://pmc.ncbi.nlm.nih.gov/articles/PMC7200725>
- NASA, communication delays for crewed Mars missions — <https://ntrs.nasa.gov/citations/20220013418>
- NASA, Reaction Self-Test — <https://ntrs.nasa.gov/citations/20090029851>

None of these was checked against the full text of a paper. Read the
primary source before quoting a figure to the jury (open question O6 in
[decisions.md](decisions.md)).

## Not from NASA, and said so in the app

The indicative colour bands (common clinical ranges), the rules for a report
to Earth, the 72-hour freshness rule, the reaction-test bands, the energy
need formula (Mifflin-St Jeor), 7,700 kcal per kg, the effect of exercise on
bone loss, the solar-storm dose, the resupply dates, all food values and the
demo scale of the shelf.

## Primary-source verification, 14–15 Nov

These checks supersede the corresponding search-summary status above.

- [NASA-STD-3001, 4.8.2 / V1 4030](https://www.nasa.gov/reference/4-0-human-performance/):
  career effective spaceflight dose below 600 mSv; not a general vital-sign
  alert threshold or a certification of HESTIA's radiation calculation.
- [NASA Curiosity results](https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/):
  environmental average 0.67 mSv/day at Gale Crater, Aug 2012–Jun 2013,
  without major solar storms in that period. This supports our historical
  scenario reference, not a current personal dose.
- [NASA RAD figure](https://science.nasa.gov/resource/radiation-measurements-on-mars/):
  actual historical measurements plotted in **micrograys/day** (absorbed dose).
  The downloaded figure is preserved under `sources/assets/`; no numerical
  series was extracted/ingested. Do not silently convert micrograys into mSv
  or compare this plot directly to an effective career dose.

Crew measurements, Earth replies, thresholds and simplified extrapolations
remain simulated/team choices. No clinical NASA dataset or live feed is loaded.
The [community discussion 2133](https://github.com/nasa/spaceapps/discussions/2133)
points toward OSDR/HRP resources; it is a research lead, not scientific validation
or a new challenge requirement. Other previously unverified figures remain so.
