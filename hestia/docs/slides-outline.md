# Slides outline — 7 slides

One idea per slide. Screenshots come from the running app. Keep
"SIMULATED DATA · NOT A MEDICAL DEVICE" in the footer of every slide.

1. **HESTIA — health monitoring for a base with no doctor and no internet.**
   Mars base, 4 astronauts, Earth 20 minutes away one way. The challenge in
   one line. Team names.

2. **The problem: nobody can answer in time.**
   The five HRP hazards mapped to what the crew can actually measure alone:
   cuff, pulse, fingerstick, thermometer, scale, sleep, mood, exercise.
   A question that takes 40 minutes to get an answer must be handled on board.

3. **Each astronaut sees their own body.**
   Screenshot: the clickable silhouette with one orange zone and its panel
   (function, indicators, hazard, thresholds, why, advised action).
   Phone check-in with the how / why / risk sheet. Colour plus icon plus word.

4. **A camera reads the pantry.**
   Screenshot: Live pantry before and after, 412 → 398 days.
   Local vision model counts 12 fixed slots; uncertain slots ask a human.
   Measured: 11/12 exact on the test photo, about 19 s. Stacked cans are the
   known weak spot.

5. **Decide before it hurts.**
   Screenshot: Forecasts with a 60-day resupply delay and the ration that
   lasts. Four curves: stock, weight, bone mass, radiation dose.
   "Simulator on NASA reference values, not a trained model. Assumptions are
   listed in the app."

6. **Alert the crew now, Earth when physics allows.**
   Screenshot: red alert, Earth link countdown, simulated reply.
   Green: nothing. Orange: guardrailed self-care advice. Red: crew alert plus
   a report under 600 characters. Works for Mars, transit, Moon and ISS.

7. **What is real, what is not, what is next.**
   Real: the software, automated regression tests, local AI, no Internet required; a separate phone uses local Wi-Fi.
   Simulated: crew, measurements, ground replies, demo scale.
   NASA data used (radiation rates, career limit, bone loss, delays).
   AI disclosed: local vision model, optional local text model with
   guardrails, AI-generated test images, AI-assisted code.
   Next: test with real sensors and a real shelf, validate thresholds with
   flight-medicine sources.
