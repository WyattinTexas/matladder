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

- **Files:** `www/index.html` (single file; all RUN changes under `body.run` / `.rn-*`, PLANK under `#plOverlay`, ∞ inside the box-breathing IIFE) · `vendor/maplibre-gl.js` + `.css` (+ `www/vendor/` copy, `app/vendor` symlink) · `sw.js` cache bump · `version.json` · `ios/App/App/Info.plist` (string + version) · `ios/App/App/AppDelegate.swift` + `Main.storyboard` (the shell's edges and status bar; no new plugin was needed).
- **Sync law:** `www/` → `app/` → root `index.html` → `npx cap sync ios`. After any `npm i`: re-check `node_modules/@capacitor-community/background-geolocation/Package.swift` still pins `..<"9.0.0"` (npm re-pins it to 7).
- **Engine additions (inside `RUN-ENGINE-BEGIN/END`, pure, node-tested):** `runCalories(track, kg)` · the route capture (`E.route` = the anchors' lat/lon) · `runEncodePolyline/runDecodePolyline` · `runPublicRec(rec)` (what may go to Firebase: no `route`, no `rt`) · the new `runVoiceLine`.
- **Verify:** `node --test design/run-fitness-1001/test-rf.mjs` (old 9 re-pointed + new) · puppeteer stills at 390×844@3 (`capture-rf.mjs`: ready / countdown / running / big map / paused / mile / summary / history / settings / plank / breathe ∞) · the ladder portrait + the Scoreboard byte-compared before vs after · the real app in the iOS Simulator on a simulated run (the Lady Bird Lake loop fed to `simctl location`: map, dot, route, a mile).
- **Ship:** push matladder (matladder.com + /app/) → mirror to DrBango/ladder → build 9 → TestFlight Friends + Team → beta review. Not submitted to the App Store (the App Privacy label is still Wyatt's click).

## STATUS
- 10/1 13:45 EDT: checkpoint written before any build (budget: session 15 %, Fable weekly 66 %). Nothing built yet. Order: PLANK + ∞ → engine + tests → RUN UI → map → simulator → ship → review page.
- 10/1 14:20 EDT: **PART 1 PUSHED** — PLANK 2:00 / 3:00 + BREATHE ∞ live on the web: matladder a667a87 (matladder.com + /app/, sw footwork-v5, version 2026-10-01-plank) · DrBango eba364aa (drbango.com/ladder). 39/39 `test-extras.mjs`, engine 9/9, portrait ladder stills byte-identical before/after. Two finds fixed on the way: **F1** box breathing had been showing on WHITE with a white (unseen) countdown since the colors were softened in June (its dark background lost the CSS cascade) — the dark is back and the count shows; **F2** the Scoreboard's drill sheet picked the chip one left of the row tapped since the RUN chip went in (row "2-In 2-Out" turned RUN on). The iOS app gets all of it with build 9. Next: the run engine (calories, route, voice) → RUN UI → map.
- 10/1 14:28 EDT: **THE RUN SCREEN BUILT (web), committed 6303654, NOT pushed yet** (the phone shell comes first). www/index.html: the black RUN screen with the live map (MapLibre 5.24 in vendor/ + OpenFreeMap tiles in our own dark style, canvas fallback), calories, 3·2·1, PAUSE → RESUME/END, the mile banner + the voice with the pace, the workout-page summary with the pace-colored route, All runs, settings, the share image. Engine: bend-following anchors (**F3**: straight 15 m steps read a winding trail 2 % short — a mile was called ~35 m late; now within 1 %), auto-pause needs fresh fixes (**F4**: with location off the shipped "timer without splits" froze at 0:00 after 10 s — auto-pause took no fixes for standing still), fixes every second. Proofs: `node --test` 21/21 · `test-extras.mjs` 39/39 · `capture-rf.mjs` 58/58 (+ 58/58 with WebGL off) · `compare-rf.mjs` 22/22 ladder + Scoreboard stills byte-identical to 051cb8d. Next: the iOS shell (black edges + white status text on the run screen, the location string, build 9), the Simulator with a simulated run, then push + TestFlight + the review page.
- 10/1 14:58 EDT: **WEB LIVE** — matladder 6bbcd7b (matladder.com + /app/, sw footwork-v6, version 2026-10-01-road2, vendor/ served) · DrBango 1f9e5baf (drbango.com/ladder + ladder/vendor). **F5, the big find, fixed:** on the phone the page asked `Capacitor.registerPlugin` for its plugins; that function only exists in the bundled @capacitor/core, so the call threw, the catch returned nothing, and since CARD-RUN the app ran on the WEB fallbacks — no recording with the screen locked, no native voice. `fwPlugin()` now takes `window.Capacitor.Plugins[name]`. Proven in the iOS Simulator (iPhone 17 Pro, iOS 26.5, `design/run-fitness-1001/sim/`): When-In-Use prompt with the new string · foreground → background watcher swap · a fix every second · the mile banner + "Mile one. Pace, five forty-one…" spoken to the end by the phone's speech engine · pause / resume / end · the summary with the route · 35 s in the background (Safari in front) with the distance still growing. iOS shell: black edges + white status text on the run screen (MainViewController follows WebKit's underPageBackgroundColor). App Store has 1.1 (build 6) READY_FOR_SALE, so this is **version 1.2 build 9**; archive running.

## BUILT — CARD-RF, 10/1 (D Astro, from Wyatt's phone note)

**What landed (web: matladder 6bbcd7b · mirror DrBango 1f9e5baf · iPhone: version 1.2 build 9):**

- **RF1 the look** — `body.run` turns the page black with SF Rounded numerals: the time yellow, distance blue, active calories pink, pace white, average pace teal, pace written `8'42"`. Recording hides the header and the chips (`body.run.recording`).
- **RF2 the map** — MapLibre GL 5.24.0 (BSD-3, `vendor/`, loaded the first time RUN opens) over OpenFreeMap's OpenStreetMap vector tiles in our own dark style (`RUN_MAP_STYLE`: trails dashed, parks, water, road names). The dot is a marker, the live route a GeoJSON line (broken where a manual pause was resumed); the map follows the last trusted fix. One map instance: it moves into the summary and back. No WebGL / the library not there after 6 s = the same route on a canvas with a 100 m grid (`runDrawRoute`, also used by the share image).
- **RF3 GPS before START** — with location already allowed, the RUN screen runs a foreground watcher (the dot, `GPS READY`); it stops after 5 idle minutes, when the app hides, or on leaving RUN. The pill: LOCATION OFF · TAP TO LOCATE · FINDING GPS · GPS READY · GPS · GPS WEAK · TIMER ONLY.
- **RF4 one button** — START (lime) → 3 · 2 · 1 (a ring; a tap or Space skips; the first time it holds for the first fix, 20 s at most) → PAUSE → RESUME + END. END shows only while paused and takes two taps.
- **RF5 the numbers** — the clock, DISTANCE · ACTIVE CALORIES · PACE (the last 200 m) · AVERAGE PACE, the mile in hand as a bar, the goal line (ON PACE / n S AHEAD / n S BEHIND), the splits newest first. A tap on the map makes it big (58 %) and the numbers small.
- **RF6 calories** — `runCalories`: ACSM flat-ground net cost from the track (run 1.0 / walk 0.5 kcal per kg per km, blended 1.8–2.2 m/s); total adds 3.5 ml/kg/min of rest for the active time. Weight is typed once (the ask sheet or settings; lb with miles, kg with kilometers), kept in kg on the phone, 160 lb until set.
- **RF7 the mile moment** — the banner (the mile, its pace, AVG PACE, TIME, a FASTEST MILE tag) for 6 s, a chime, the voice: "Mile three. Pace, eight forty-two. Average pace, eight thirty-nine. Time, twenty-five fifty-seven." + "Your fastest mile." + the goal line. "Run started." / "Paused." / "Resumed." / "Run complete. 5.58 miles in forty-eight fifty-six."
- **RF8 the summary** — the workout page: the route colored by pace (the pace over the 300 m around each point against the run's own range; a steady run stays green), start and end pins, Workout Time · Distance · Active Calories · Total Calories · Avg. Pace · Best Mile, the splits as bars + the last stretch, the group rank (today's runs only), Share your run, Done, Delete this run (two taps; also removes the group's copy). The share image is redrawn in the same look with the route.
- **RF9 all runs** — the drawer lists every saved run; a tap reopens its summary and map. The route (a polyline string + per-point times) stays on the newest 30 runs.
- **RF10 settings** — one sheet: miles/kilometers · voice · auto-pause · goal pace · weight. The speaker button on the map mutes or unmutes the voice mid-run.
- **RF11 PLANK** — the chip beside Wall Sits; 2:00 / 3:00 remembered; wall-clock timed; a beep at the start, at halfway, on 3-2-1, a three-note finish; the screen stays awake. The Warm Up's plank step: 0:30 (default) · 2:00 · 3:00.
- **RF12 BREATHE ∞** — one tap starts endless breathing ("Round n / ∞"), a second tap goes back to 10 rounds; the screen stays awake while it plays.
- **RF13 the phone shell** — `MainViewController` (AppDelegate.swift) watches WebKit's `underPageBackgroundColor` and paints the safe-area strips + picks the status bar style from it: black edge to edge with white status text on RUN, white with dark text on the drill timer. No status-bar plugin. Location string: "FOOTWORK shows where you are on the map and measures your distance and mile splits when you run."
- **RF14 privacy** — `runPublicRec` is a whitelist (ts, date, name, dist, time, avg, bestMile, splits, splitsKm, gps): the route, its times, calories and weight cannot go to Firebase. The map asks OpenFreeMap for map squares; nothing about the runner is sent.

**Finds fixed on the way (each was live):**
- **F5 (the big one)** the phone app never reached its native plugins. The page called `Capacitor.registerPlugin(name)`, which only exists in the bundled @capacitor/core; with no bundler it threw inside a try, the catch returned null, and since CARD-RUN (build 8) the app used the web fallbacks: `watchPosition` (stops when the screen locks or the app hides) and `speechSynthesis`. A run with the phone locked in a pocket recorded nothing and called no mile. Now `fwPlugin()` takes `window.Capacitor.Plugins[name]` (the Scoreboard's keep-awake uses it too).
- **F3** distance: straight 15 m steps cut every corner (a winding trail read 2.2 % short of a perfect GPS). Anchors now also land on bends (a fix more than 3 m off the chord, once 8 m out): within 0.7 % clean, 0.4 % with GPS-like noise, 0.3 % with triple noise; standing still still adds nothing.
- **F4** with location off the "timer without splits" froze at 0:00 after 10 s (auto-pause read "no fixes" as "standing still"). Auto-pause now needs fixes that keep arriving (the watchers send one every second: distanceFilter 0); silence keeps the clock running and the distance catches up when the sky is back.
- **F1** box breathing was showing on white with an invisible countdown since June. **F2** the Scoreboard's drill sheet picked the row above the one tapped.

**Verified:**
- `node --test design/marathon-0923/test-run-engine.mjs design/run-fitness-1001/test-rf.mjs` — **21/21** (the old nine with the voice test re-pointed; calories ×3, the polyline, the route, the manual-pause break, the group whitelist, the GPS gap + timer-only, the trail within 1 %, standing still).
- `node design/run-fitness-1001/test-extras.mjs` — **39/39** (plank, the Warm Up pills, ∞).
- `node design/run-fitness-1001/capture-rf.mjs` — **58/58**, and **58/58** with `nomap` (WebGL off): the whole flow on www/index.html with a 5.64 mi run on the Lady Bird Lake loop; stills in `stills/`.
- `node design/run-fitness-1001/compare-rf.mjs` — **22/22 byte-identical** to 051cb8d: the ladder portrait (setup, empty, idle, running, stopped, warm-up, wall sits, board) and the Scoreboard on phone + TV (setup, empty, idle, running, new best, idle after, the drill sheet). Two things had to be scoped for that: a closed drawer's shadow, and the new drawer's layer (the All runs drawer does not exist outside RUN).
- The iOS Simulator (`sim/sim-run.mjs run | prompt | bg`, iPhone 17 Pro, iOS 26.5, volume at zero): the When-In-Use prompt with the new string over the countdown · `addWatcher {ask, foreground}` → first fix → 3 · 2 · 1 → `addWatcher {background}` + `removeWatcher` · a fix every second · the mile banner at 1.00 mi and `speak "Mile one. Pace, five forty-one. Seventy-one seconds behind pace."` resolved by the speech engine · pause / resume / end · the summary with the route · 35 s behind Safari with the distance growing 0.06 → 0.16 mi. `sim/events-*.json` hold every line.

**Deviations from the plan:** no `@capacitor/status-bar` (the shell follows the page instead) · version 1.2, not 1.1 (1.1 went live on the App Store with build 6) · the simulator ran our own route, not Apple's City Run (so the map shows a known path) · the old `design/marathon-0923/capture-built.mjs run` stills are retired (its `compare` still works; the RUN screen it drove is gone).

**Not proven here (a phone only):** the voice with the screen locked and music playing (the plugin speaks on the system's own speech session, which should lower the music) · the silent switch · auto-pause at a real light (it needs the phone's once-a-second fixes; the simulator's fixed location sends one) · battery over an hour with fixes every second.
- 10/1 15:05 EDT: **BUILD 9 ON TESTFLIGHT** — version 1.2 (9), id 192f7537-6a05-4749-82c0-1b42c64aa666: archived 14:58, uploaded 15:00, VALID 15:02, export compliance false, in Friends (public link https://testflight.apple.com/join/vREwrPft) with beta review WAITING_FOR_REVIEW; the internal Team group (Wyatt) has every build, so 9 installs for him now. Not submitted to the App Store (RF-Q11: the App Privacy label for location is Wyatt's click in App Store Connect first; the App Store still serves 1.1 build 6, which has neither the Scoreboard nor RUN). Review page: https://claude.ai/artifact/NRU5TqAvGmnJDDDz5wz2ya (account D, Chrome Profile 5; clips + stills + the five finds + the calls, picks saved in its db at `picks/rf`, empty). **CARD-RF DONE.** 🔴 Wyatt: install build 9 from TestFlight and run a mile with the phone locked and music on; the calls RF-Q1–Q11.
