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
