# FOOTWORK · THE ROAD 2 — the run feels like the fitness app (CARD-RF) + PLANK 2:00 / 3:00 + BREATHE ∞

**Date:** 2026-10-01 · **Session:** D Astro (Fable), from Wyatt's phone (jumpr remote, 17:20 UTC) · **Status:** see §STATUS at the bottom.

**Wyatt's note (voice, 10/1):** "Run a design pass on our footwork app and how the running and tracking works. We need it to visually look just like the fitness app experience when you're running, so you can see where you are on the map, right? Able to start and stop it so easily, see how far you've gone, the calories. We really want to mimic that aspect. Also, please add a 2-minute and 3-minute plank timer for the planks, and then allow the square breathing and endless mode, where you can just hit the little infinity button. It will just use the infinity symbol. Just click it, and then that just keeps playing the square breathing. For the running portion of the app, too, it needs to tell you when you reach a mile and what your pace is. It needs to really feel just like that fitness app if you go for a run."

## 1 · THE READ (what is there today, v 2026-09-23-run, build 8)

- RUN is a chip in the picker. Its screen is the white FOOTWORK page: ELAPSED in Bebas, three tiles (DISTANCE · PACE NOW · AVG PACE), the mile splits as a dotted list, PAUSE + FINISH pills. **No map. No calories.** It reads like the ladder timer with distance, not like a run tracker.
- The engine under it is sound and stays: haversine over trusted fixes, 15 m anchor steps, interpolated mile crossings, auto-pause, MI/KM, the run log, the fastest-mile board (`RUN-ENGINE-BEGIN/END`, 9/9 node tests).
- The mile voice exists ("Mile three. Eight forty-two. Average pace eight thirty-nine. …") but never says the word *pace*, and the card that shows it is small.
- START is a wide pill, FINISH needs two taps, there is no countdown, and GPS only wakes up after START (the first seconds of every run are the cold fixes).
- Planks: only a 0:30 step inside the 7-step Warm Up. No plank timer of its own.
- Box breathing: 10 rounds, then it stops. The label under it says "Round 0 / 4" (a leftover). The phone can auto-lock mid-session (nothing keeps the screen awake).

## 2 · THE DESIGN

### A · RUN — the fitness look
RUN turns the app black, the way the fitness app is: rounded system numerals (SF Rounded on the phone), time in yellow, distance in blue, active calories in pink, pace in teal, pace written the fitness way — `8'42"`.

| Screen | What you see |
|---|---|
| **Ready** | The map with your blue dot and a `GPS READY` pill (location warms up before START, so the first steps count). OUTDOOR RUN, this week's miles, your last run. One big green **START**. A row of small chips: MI/KM · VOICE · GOAL · WEIGHT. |
| **3 · 2 · 1** | A full-screen ring counts down (tap to skip). |
| **Running** | Map on top: blue dot, the route drawn behind you, auto-follow, tap the map to make it big. Under it: the time (yellow, huge), then DISTANCE · ACTIVE CAL · PACE · AVG PACE, then the mile in progress as a bar and the splits. One big **PAUSE**. |
| **Paused** | The time greys, `PAUSED 0:42`. Two buttons: **END** (red) and **RESUME** (green). END asks once more (a second tap). |
| **The mile moment** | A banner drops in: `MILE 3 · 8'42" /MI` with the average pace and the time, a chime, and the voice: "Mile three. Pace, eight forty-two. Average pace, eight thirty-nine. Time, twenty-five fifty-seven." |
| **Summary** | The fitness app's workout page: the route on the map colored by pace (green fast → red slow), Workout Time · Distance · Active Calories · Total Calories · Avg Pace · Best Mile, the splits table, your group rank, SHARE, DONE, Delete run. |
| **All runs** | The list of your runs (date · distance · time · pace). Tap one for its summary and its map. |

### B · PLANK
A **Plank** chip beside Wall Sits. Two big pills, **2:00** and **3:00** (it remembers your pick). GO starts the hold; a beep at halfway, three beeps into the finish, a chime when you are done; the screen stays awake. The Warm Up's plank step gets the same pills next to its 0:30.

### C · BREATHE ∞
A small round **∞** button on the box-breathing screen. Tap it and the square breathing starts and never stops ("Round 7 / ∞"); tap it again to go back to 10 rounds. The screen stays awake while it plays.

## 3 · RECOMMENDATIONS (built with these unless Wyatt says otherwise)

- **RF1 — RUN goes dark.** `body.run` re-skins the page (true black, SF Rounded numerals, the fitness colors). The ladder timer and the Scoreboard do not change by a pixel.
- **RF2 — The map.** MapLibre GL (vendored in `vendor/`, loaded only when RUN opens) + OpenFreeMap's dark OpenStreetMap tiles: no key, no account, no cost. No signal = the route and the dot still draw on black. If the map library cannot start (old WebGL), a plain canvas draws the route instead.
- **RF3 — GPS warms up on the RUN screen** (only when location was already allowed): the dot + the `GPS READY` pill before START. Foreground only; it stops after 5 idle minutes or when you leave RUN.
- **RF4 — One big button.** START → 3·2·1 → PAUSE → RESUME / END (END = two taps). Space bar on a keyboard still starts/pauses.
- **RF5 — The numbers.** Elapsed · DISTANCE · ACTIVE CAL · PACE (the last 200 m) · AVG PACE; the mile in progress as a bar; goal pace reads AHEAD / ON PACE / BEHIND.
- **RF6 — Calories.** Active calories = distance × body weight (ACSM: running 1.0, walking 0.5 kcal per kg per km, blended between 1.8 and 2.2 m/s; flat ground). Total adds the resting burn for the run's time. Weight is asked once, optional (160 lb until set), and stays on the phone. Timer-only runs show no calories.
- **RF7 — The mile moment.** The banner (6 s) + the chime + the voice with the word *pace* and the total time. Mile 1 says "Mile one. Pace, eight thirty-one." "Your fastest mile." when it is; the goal line when a goal is set.
- **RF8 — The summary** as the fitness app's workout page, with the route colored by pace. The share image follows the same look and draws the route.
- **RF9 — All runs.** The history list; routes are kept on the phone for the newest 30 runs and are never uploaded (the group still gets time, distance, splits — and now calories are *not* sent either).
- **RF10 — One settings sheet**: MI/KM · Voice · Auto-pause · Goal pace · Weight.
- **RF11 — PLANK** chip with 2:00 / 3:00, beeps, keep-awake, wall-clock timing (a throttled timer cannot drift). Warm Up's plank step: 0:30 (default) · 2:00 · 3:00.
- **RF12 — BREATHE ∞**: the ∞ button starts endless breathing in one tap; "Round n / ∞"; keep-awake; the "/ 4" label fixed.
- **RF13 — Native**: light status-bar text on the black RUN screen (`@capacitor/status-bar`), the location string now says the map ("FOOTWORK shows where you are on the map and measures your distance and mile splits when you run."), build 9 → TestFlight Friends.
- **RF14 — The privacy line holds**: coordinates never leave the phone. The map asks its tile host for the squares of map around you (as any map does); nothing about you or the route is sent.

## 4 · ⚑ QUESTIONS for Wyatt (the build assumes the bold answer)

- **RF-Q1** Apple's own map instead of OpenStreetMap? (**OpenStreetMap now.** Apple's needs a MapKit key made in the developer portal — your five minutes — then it is a swap.)
- **RF-Q2** Save each run to Apple Health so it fills your rings? (**next card** — HealthKit entitlement + a review note.)
- **RF-Q3** The run on the lock screen (Live Activity: time · distance · pace)? (**next card**.)
- **RF-Q4** The voice line as written in RF7? (**yes**)
- **RF-Q5** END = two taps (**yes**) — or press-and-hold?
- **RF-Q6** The Warm Up's plank stays 0:30 by default (**yes**).
- **RF-Q7** Calories use 160 lb until you type your weight (**yes**).
- **RF-Q8** The whole RUN tab is black (**yes**) — or black only while a run records?
- **RF-Q9** The map follows you and does not pan under your thumb; a tap makes it big (**yes**).
- **RF-Q10** One tap on ∞ starts the breathing right away (**yes**).

## 5 · BUILD NOTES

- **Files:** `www/index.html` (single file; all RUN changes under `body.run` / `.rn-*`, PLANK under `#plOverlay`, ∞ inside the box-breathing IIFE) · `vendor/maplibre-gl.js` + `.css` (+ `www/vendor/` copy, `app/vendor` symlink) · `sw.js` cache bump · `version.json` · `ios/App/App/Info.plist` (string + CFBundleVersion 9) · `package.json` (`@capacitor/status-bar`).
- **Sync law:** `www/` → `app/` → root `index.html` → `npx cap sync ios`. After any `npm i`: re-check `node_modules/@capacitor-community/background-geolocation/Package.swift` still pins `..<"9.0.0"` (npm re-pins it to 7).
- **Engine additions (inside `RUN-ENGINE-BEGIN/END`, pure, node-tested):** `runCalories(track, kg)` · the route capture (`E.route` = the anchors' lat/lon) · `runEncodePolyline/runDecodePolyline` · `runPublicRec(rec)` (what may go to Firebase: no `route`, no `rt`) · the new `runVoiceLine`.
- **Verify:** `node --test design/run-fitness-1001/test-rf.mjs` (old 9 re-pointed + new) · puppeteer stills at 390×844@3 (`capture-rf.mjs`: ready / countdown / running / big map / paused / mile / summary / history / settings / plank / breathe ∞) · the ladder portrait + the Scoreboard byte-compared before vs after · the real app in the iOS Simulator with a simulated City Run (map, dot, route, a mile).
- **Ship:** push matladder (matladder.com + /app/) → mirror to DrBango/ladder → build 9 → TestFlight Friends + Team → beta review. Not submitted to the App Store (the App Privacy label is still Wyatt's click).

## STATUS
- 10/1 13:45 EDT: checkpoint written before any build (budget: session 15 %, Fable weekly 66 %). Nothing built yet. Order: PLANK + ∞ → engine + tests → RUN UI → map → simulator → ship → review page.
- 10/1 14:20 EDT: **PART 1 PUSHED** — PLANK 2:00 / 3:00 + BREATHE ∞ live on the web: matladder a667a87 (matladder.com + /app/, sw footwork-v5, version 2026-10-01-plank) · DrBango eba364aa (drbango.com/ladder). 39/39 `test-extras.mjs`, engine 9/9, portrait ladder stills byte-identical before/after. Two finds fixed on the way: **F1** box breathing had been showing on WHITE with a white (unseen) countdown since the colors were softened in June (its dark background lost the CSS cascade) — the dark is back and the count shows; **F2** the Scoreboard's drill sheet picked the chip one left of the row tapped since the RUN chip went in (row "2-In 2-Out" turned RUN on). The iOS app gets all of it with build 9. Next: the run engine (calories, route, voice) → RUN UI → map.
