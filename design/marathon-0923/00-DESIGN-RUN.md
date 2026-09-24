# FOOTWORK · THE ROAD — marathon training mode (RUN) design pass

**Date:** 2026-09-23 evening · **Session:** D Astro · **Status:** DESIGN PASS for Wyatt's word → jumpr card 1212 CARD-RUN implements the recommendations, queued behind 1210 CARD-LT in the matladder lane.
**Wyatt's brief (9/23, on the Scoreboard page):** "Just also have a marathon training one, and it tracks your location when you turn that on. That way, you can do the good old 'it records each mile split,' and then it tells you like the fitness app. That way, they don't have to be in the fitness app and this app. They can do all their training just in this app."

## 1 · THE READ
- Today FOOTWORK is a rep timer: START/STOP, hundredths, a 21-slot session grid, a group leaderboard per drill (Firebase `ladder/groups/{g}/{drill}`), weekly streaks. No location, no audio beyond UI sounds, no run log.
- The iOS shell (Capacitor 8.4) has **no location permission strings and no background modes** in `Info.plist`. `@capacitor-community/keep-awake` is installed (card 1210, for the stage).
- Plugins available at these versions (checked 9/23): `@capacitor/geolocation 8.2.2` (foreground), `@capacitor-community/background-geolocation 1.2.26` (keeps recording with the screen locked), `@capacitor-community/text-to-speech 8.0.2` (native AVSpeechSynthesizer).
- App Store: **App Privacy** on ASC lists no data collection. Adding location requires the nutrition label (Location · Precise · not linked to identity · App Functionality) — that is ASC UI, no public API. TestFlight does not need it; the next App Store submission does (🔴 Wyatt, 2 minutes in ASC).

## 2 · THE DESIGN — "THE ROAD" (stills/)

RUN is a **mode chip at the front of the drill picker**. Pick it and the timer zone becomes the run screen; everything else (header, group, leaderboard card, streaks) stays where it is, so a runner and a ladder athlete are in the same app with the same group.

| Still | State |
|---|---|
| `stills/run-ask.png` | First tap of START in RUN: the plain-words sheet. Location only while recording; the route stays on the phone; only time / distance / splits go to the group. TURN ON LOCATION → the iOS prompt. "Not now" = the timer without splits. |
| `stills/run-run.png` | Recording, mile 4 in progress: ELAPSED big (Bebas 96), three tiles DISTANCE · PACE NOW · AVG PACE, MILE SPLITS as the Dotted Journey (best mile gold, delta vs best on each row, cumulative time), the live mile with a progress bar and ON PACE; GPS pill top-right (● GPS · 8 m); MI/KM + VOICE toggles; PAUSE + FINISH. |
| `stills/run-mile.png` | The mile moment: a dark card slides down for 4 s with the split in gold while the voice says it: "Mile three. Eight forty-two. Average pace eight thirty-nine. Eleven seconds off your best mile." |
| `stills/run-done.png` | FINISH: RUN COMPLETE — distance, time, avg pace, best mile (gold), the group rank for fastest mile today, the split list, SHARE YOUR RUN (the streak-share image path). |

### The voice (the fitness-app line, at every mile by default)
`Mile {n}. {split}. Average pace {avg}. {delta line}` where the delta line is one of: "Your best mile." / "{s} seconds off your best mile." / "{s} seconds faster than last mile." Half-mile option: "Half mile. {elapsed}." Km mode says kilometers. A short chime (the existing UI sound) precedes the voice. Voice ducks music (native TTS with `.duckOthers`).

## 3 · RECOMMENDATIONS (the card goes with these unless Wyatt says otherwise)

- **R1 — RUN is a mode chip**, first in the picker, not a separate app or tab. Same header, same group, same leaderboard card.
- **R2 — Opt-in, plainly.** No location prompt until the first START in RUN; the sheet in `run-ask.png` comes first, then the iOS prompt. Decline = the timer still works (elapsed only, no splits). Never ask for "Always" — When In Use + the location background mode is enough to keep recording with the screen locked when the run was started in the foreground.
- **R3 — Background recording via `@capacitor-community/background-geolocation`** (`distanceFilter 5`, `stale: false`, `backgroundMessage` "FOOTWORK is recording your run" — iOS shows nothing, Android shows a notification later). Web/PWA fallback: `navigator.geolocation.watchPosition` + KeepAwake (foreground only; the sheet says so on the web).
- **R4 — Distance that does not lie.** Haversine between accepted fixes; drop a fix with `accuracy > 30 m`; drop a jump implying > 7 m/s; ignore the first 2 fixes after START (cold GPS); pace now = the last 200 m; the mile split time is **interpolated** between the two fixes that straddle N × 1609.344 m so the split is exact, not "the fix after the mile".
- **R5 — The voice is native TTS** (`@capacitor-community/text-to-speech`, `UIBackgroundModes: audio + location`) so it speaks with the phone locked in a pocket. Web fallback `speechSynthesis`. VOICE toggle in the splits header; default on.
- **R6 — Auto-pause** after 10 s under 0.5 m/s (a light, a water stop), auto-resume on movement; a tap on PAUSE is the manual one. Paused time is excluded from the elapsed clock and shown small ("paused 0:42").
- **R7 — Units** MI/KM toggle in the splits header, remembered; splits, tiles and the voice follow.
- **R8 — The run log.** Every finished run saved on the phone (`localStorage` `runs`) and to Firebase `ladder/groups/{g}/runs/{name}/{ts}` as `{dist, time, avg, bestMile, splits[]}` — no coordinates ever leave the phone.
- **R9 — Leaderboards.** RUN in the daily leaderboard = **fastest mile today**; the streak drawer gains **miles this week** per member. The finish card shows the rank.
- **R10 — Share.** SHARE YOUR RUN renders the finish card to an image via the streak-share path (distance big, splits as a strip, FOOTWORK wordmark).
- **R11 — Battery.** 1 Hz fixes with `distanceFilter 5`; stop the watcher on FINISH; no map tiles in v1 (a route map is its own card — ⚑ Q4).
- **R12 — Store paperwork** in the card: `NSLocationWhenInUseUsageDescription` ("FOOTWORK measures your distance and mile splits while a run is recording."), `UIBackgroundModes` `location` + `audio`, `npx cap sync`. The App Privacy label is Wyatt's click in ASC before the next App Store submission (TestFlight fine without).

## 4 · ⚑ QUESTIONS for Wyatt (the card assumes the bold answer)
- **Q1** Announce every mile (**yes**) — or every half mile?
- **Q2** Auto-pause at stops (**yes**)?
- **Q3** "Marathon training" = the run tracker now (**yes**); a 16-week training plan (long run / tempo / easy schedule with the day's target read on the RUN screen) as the **next** card?
- **Q4** Route map on the finish card (**not in v1**; needs a map library + tiles, own card)?
- **Q5** Daily leaderboard for RUN = fastest mile today (**yes**) — or longest run?
- **Q6** Goal pace: let the runner set a target pace and have the voice say "on pace / behind" (**yes, simple field in the ask sheet**)?
- **Q7** Miles default with a KM toggle (**yes**)?

## 5 · BUILD NOTES for CARD-RUN
- `www/index.html` single file: the RUN chip in `DRILLS` (id `run`, kind `run`), a `#runZone` replacing `.timer-zone` + `.session-content` while active, the GPS engine as one object (`Run`: start/pause/resume/finish, `onFix`, `splits[]`), the voice as one function, the ask sheet, the finish card. Sync law: `www/` → `app/` → root `index.html` → `npx cap sync ios`.
- `npm i @capacitor-community/background-geolocation @capacitor-community/text-to-speech` (SPM, no pods) → `Package.swift` is regenerated by `cap sync`.
- Verify: puppeteer stills at 390×844@3 for ask / run / mile / done (feed synthetic fixes via `Run.onFix` — a 5-mile loop at 8:40 with jitter) into `design/marathon-0923/stills-built/`; the split math unit-checked in node (`node --test`) against the synthetic loop (5 splits, each within 1 s of 8:40); the Scoreboard portrait stills byte-unchanged; the ladder timer untouched.
- Ship: build 8 (after 1210's 7) → archive → upload → compliance PATCH → Friends group → betaAppReviewSubmission (the same recipe as 00-DESIGN-LT.md §5).
- Then a real run on Wyatt's phone: the only test that counts for GPS. 🔴 phone: RUN, a mile, hear it.

## STATUS
- 9/23 18:55 PT: stills (4) rendered; doc written; card 1212 queued behind 1210 (a phone card took 1211); The Road section added to the review artifact https://claude.ai/artifact/WYTNHMLKAqBfACuHHqF8HP#road (Profile 5).
- 9/23 22:08 PT: **CARD-RUN BUILD STARTED** (B drbango305, jumpr 1212, session 36 % · weekly 80 %). Plan = jumpr plans/20260923-220158; recs R1–R12 taken with the bold answers Q1–Q7. Plugins installed: background-geolocation 1.2.26 + text-to-speech 8.0.2 (both SPM). Progress lines follow.
- 9/23 22:45 PT: **RUN MODE BUILT + PUSHED** — matladder 6ab22e3 (matladder.com + /app/ live, version.json 2026-09-23-run) · DrBango 7dff6b5f (drbango.com/ladder mirror). node --test 9/9; stills-built/run-*.png; portrait byte-identical with the one new chip hidden; stage byte-identical outside the Firebase-timed strip. Archive of build 8: the first try failed on SPM (background-geolocation 1.2.26 pins capacitor-swift-pm 7.x) → its Package.swift pin widened to ..<9 in node_modules (tracked) → archiving again.

## BUILT — CARD-RUN, 9/23 night (B drbango305, jumpr 1212)

**What landed (www/index.html — `body.run` + its own `#runZone` / `.rn-*` nodes; the ladder timer's code paths are untouched):**
- **R1 RUN chip** — first in the picker, a *mode* rather than a drill: `DRILLS` is untouched, so auto-advance, "all drills done", the stage's drill sheet and the leaderboard title never see it. A drill chip leaves RUN mode (nothing leaves while a run records — toast); the stage never covers the run screen (one guard in `setStage`).
- **R2 opt-in, plainly** — the sheet from `run-ask.png` on the first START, then the iOS prompt. The plugin asks for **Always** whenever a *background* watcher requests permissions, so the first watcher is a foreground one (When In Use prompt only) and a background watcher with `requestPermissions:false` replaces it after the first fix. "Not now" = the timer without splits; the idle hint offers "turn it on" / "open Settings" (the plugin's `openSettings`) when location is off or denied.
- **R3 background recording** — `@capacitor-community/background-geolocation` 1.2.26 (`distanceFilter 5`, `stale:false`, `backgroundMessage`); its SPM manifest pins Capacitor 7, widened to `..<"9.0.0"` in `node_modules` (tracked in this repo). Web/PWA: `watchPosition` + a screen wake lock; the sheet says "while FOOTWORK stays open on your screen" there.
- **R4 distance that does not lie** — the engine (`makeRunEngine`, between `RUN-ENGINE-BEGIN/END`, no DOM): haversine over trusted fixes (accuracy ≤ 30 m; ≤ 7 m/s from the last trusted fix; duplicates dropped); the first two fixes after START are held aside and re-admitted only when each agrees with the first real fix (a junk cold fix never does); distance advances in 15 m anchor steps so standing-still jitter never adds up; every mile crossing is interpolated between the two anchors that straddle N × 1609.344 m; pace now = the last 200 m; FINISH counts the last partial step.
- **R5 the voice** — native TTS (`@capacitor-community/text-to-speech` 8.0.2; `category:'playback'` is passed but 8.0.2 ignores it and speaks on the synthesizer's private audio session, so ducking + speech with the phone locked are that session's defaults — the phone run confirms them); `speechSynthesis` on the web. The mile card (`run-mile.png`) for 4 s, a two-note WebAudio chime, then the line: `Mile {n}. {split}. Average pace {avg}. Your best mile. | {s} seconds off your best mile. | {s} seconds faster than last mile (a surge of 10 s+).` Mile 1 says only `Mile one. {split}.` VOICE toggle remembered; "Run started…", "Paused.", "Resumed.", "Voice on." and "Run complete…" are spoken too.
- **R6 auto-pause** — 10 s without movement (Doppler ≥ 0.5 m/s or 5 m of displacement), back-dated to the last movement, auto-resume 8 m from the pause point; PAUSE/RESUME by hand; "AUTO-PAUSED 0:42" under the clock; walking during a manual pause adds no distance.
- **R7 units** — MI/KM remembered (`footwork_run_units`); tiles, splits, the goal and the voice follow ("Kilometer three…"); a mid-run toggle re-derives the splits from the track without re-announcing.
- **R8 the run log** — `localStorage footwork_runs` (500 newest) and Firebase `ladder/groups/{g}/runs/{name}/{ts}` = `{dist m, time ms, avg, bestMile, splits[], splitsKm[], gps, date, name}` — no coordinates ever leave the phone.
- **R9 leaderboards** — in RUN mode the daily leaderboard drawer becomes **fastest mile** per member (period chips honored; rows read "1 run · 5.03 mi"); the streak rows gain "· 5.03 mi this week"; the finish card shows the rank ("#2 OF 6"); a finished run counts for the weekly streak.
- **R10 share** — SHARE YOUR RUN renders a 1080×1350 card (distance big, TIME / AVG PACE / BEST MILE tiles, the splits as a dotted strip with the best in gold, the wordmark, date + name) and shares it as a file via `navigator.share`, else the text + link, else a download / the clipboard.
- **R11 battery** — 1 Hz with `distanceFilter 5`; the watcher is removed on FINISH; no map.
- **R12 store paperwork** — `NSLocationWhenInUseUsageDescription` ("FOOTWORK measures your distance and mile splits while a run is recording."), `UIBackgroundModes` location + audio, CFBundleVersion 8, `npx cap sync ios` (3 plugins in Package.swift).
- **Q1–Q7** — every mile · auto-pause · the tracker now · no map · fastest mile today · **a goal pace field** in the ask sheet and on the idle screen (per unit, remembered; the live row reads ON PACE / AHEAD / BEHIND {goal}; the voice adds "On pace." / "{s} seconds behind pace.") · miles + KM.
- Guard rails: FINISH is two taps (SURE?) so a mis-tap never ends a run; a run under 10 s and 50 m is discarded; the logo and the chips are locked while recording; Space starts / pauses the run on a keyboard. Test hook `window.Run.onFix` for the harness.

**Verified:**
- (a) `node --test design/marathon-0923/test-run-engine.mjs` — **9/9**: the clean 5-mile loop at 8:40 → 5 splits within 60 ms; the GPS-like loop (a 2.5 m drift τ 120 s + 0.25 m white, two junk cold fixes 500 m off, a 100 m jump, fuzzy fixes) → 5 splits within the drift (2.5 s; the doc's 1 s holds only for a drift under ~1 m — a boundary cannot be placed better than the GPS's own drift, the math adds nothing), total distance within 0.3 %, the jump and the fuzzy fixes rejected, the cold fixes ignored; auto-pause back-dated + auto-resume + paused time excluded; a manual pause counts no walking; the voice line = the doc's sentence exactly; 8 km splits from the same 5-mile track; pace now / avg pace.
- (b) `node design/marathon-0923/capture-built.mjs run` → `stills-built/run-{idle,ask,mile,run,done,board,streaks}.png` at 390×844@3 from synthetic fixes (miles 8:31 · 8:45 · 8:42 · 8:40 · 8:44 with jitter; the mile-3 moment; the finish at 5.03 mi, "#2 OF 6" among five seeded runners; the fastest-mile board; the streak row with miles this week).
- (c) `… capture-built.mjs compare` — git HEAD vs the build, same harness, GIFs + pulses frozen: **portrait setup/empty/idle/running byte-identical** with the one new chip hidden (running identical even with it — zen hides the picker); **stage phone/tv setup, empty, running, board, sheet byte-identical**; idle/idle2/pb/board(tv) differ only in the Firebase-fed strip / the row-flash frame — the same file captured twice differs there too (timing, not this build).
- (d) archive: see STATUS.

**Dropped / deviations:** nothing from R1–R12. Deviations from the build notes: the RUN chip lives outside `DRILLS` (same look, none of the ladder's side effects); the log key is `footwork_runs` (the streak uses `footwork_streak`); the cold-start rule keeps the two fixes aside instead of discarding them, so a clean GPS start loses nothing; the jitter test tolerance is the drift, not 1 s (above). Known limits: `text-to-speech` 8.0.2 ignores `category`, so the audio-session behaviour with the phone locked and music playing is the plugin's default — the phone run is the test; the web fallback records only while the page is on screen (iOS Safari suspends `watchPosition` in the background).
