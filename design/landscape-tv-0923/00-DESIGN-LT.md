# FOOTWORK · THE SCOREBOARD — landscape / TV design pass (LT)

**Date:** 2026-09-23 evening · **Session:** D Astro · **Status:** DESIGN PASS for Wyatt's word → jumpr card 1210 CARD-LT implements the recommendations (TestFlight tonight).
**Wyatt's brief (9/23, by /goal):** "Run a design pass for the landscape version of this app. The landscape version is perfect for mirroring it onto TVs. We can have an absolutely gorgeous interface here. It makes players feel real good seeing their times be recorded right on the screen."

## 1 · THE READ — what landscape looks like today (stills-now/)

The app has **no landscape layout at all**. Same column, same order, no `@media` rule of any kind in `www/index.html`.

| Still | What it shows |
|---|---|
| `stills-now/landscape-3-main-runs.png` | iPhone in landscape: a 448 px column in a sea of white. Drill chips, the demo GIF and the clock fill the height; the session times (the whole point) are **below the fold**. No wordmark, no name, no streak. |
| `stills-now/landscape-4-running.png` | While the clock runs, **everything else vanishes** — a white screen, blue digits, a STOP dot. On a TV that is a blank wall for the length of every rep. |
| `stills-now/tv-3-main-runs.png` | The same page at 1920×1080 (what an AirPlay mirror of a landscape phone scales up to): a thin strip in the middle, 100 px digits, 12 px times. Unreadable from the mat. |
| `stills-now/landscape-1-setup.png` | Setup in landscape: the LET'S GO button is off-screen (puppeteer could not click it). |

Facts that matter for the build:
- The iOS shell **already allows landscape** (`Info.plist` UISupportedInterfaceOrientations has Portrait + LandscapeLeft/Right). Nothing to change in Xcode.
- The PWA manifest says `"orientation": "portrait"` — only affects the home-screen web app; leave it or set `any` (⚑ Q6).
- Firebase group leaderboard already exists (`ladder/groups/{groupId}/{drillId}`), so the footer strip and the side panel have real data to show.
- The JS theme engine writes CSS vars at load (`applyTheme()`), so the stage's dark palette must be scoped to a class (`body.stage`) and set **after** applyTheme, or use its own var names.

## 2 · THE DESIGN — "THE SCOREBOARD" (stills/)

Turn the phone sideways and FOOTWORK becomes a scoreboard: **dark stage, one giant clock, the session ladder beside it, the group's top four along the bottom.** The phone stays the remote; the TV shows the room what just happened.

| Still | State |
|---|---|
| `stills/phone-idle.png` · `stills/tv-idle.png` | Idle between reps. Clock shows the last time (1.43), the ladder shows five recorded reps, rep 6 outlined as NEXT UP, START in its rail. |
| `stills/phone-running.png` | Running: digits go accent blue, the sub-line flips to BEAT 0.71, STOP goes red. **The ladder stays on screen.** |
| `stills/phone-pb.png` · `stills/tv-pb.png` | The moment: NEW BEST banner in gold takes the drill name's slot for ~2.5 s, the clock and the new row go gold, the footer chip jumps to #1. |
| `stills/tv-board.png` | Leaderboard as a right-side panel (46 vw) instead of a bottom drawer; Today/Week/Month/Year chips as today. |
| `stills/phone-setup.png` | Setup in two columns, the button in view. |
| `stills/phone-idle-light.png` | The same layout on the white brand palette — for comparison only (see R2). |
| `stills/phone-idle-zones.png` | The tap zone (dashed) — R8. |

### Layout (all sizes in vh/vw so an AirPlay mirror scales 1:1)
- Grid rows **9vh header · 1fr main · 14vh footer**, side gutters 4vw.
- Main = three columns **54fr clock · 36fr ladder · 21vh button rail**.
- **Header:** FOOTWORK wordmark + DRILL TIMER (left); group · NAME · 🔥 streak (right). No drill chips in the stage — the drill name is the heading of the clock column; tapping it opens the picker as a sheet.
- **Clock column:** drill name (Oswald 5vh, accent) · name · rep N of 7 · the time in Bebas at **46vh** (whole) / 26vh (hundredths) · sub-line BEST / AVG / REP.
- **Ladder column:** THIS SESSION + REP N OF 7 title; 7 rows of 9.2vh: rep number · time (Bebas 7.4vh) · delta vs best (+0.19). Best row gold with a gold left bar; latest row on a tinted plate; next row outlined 0.00 + NEXT UP pulsing; unrecorded rows at 28 %. Past 7 reps the ladder scrolls so the latest is always visible (the last 7 shown).
- **Footer strip:** TODAY · GROUP, then the top four as chips (rank disc, name, time). Gold disc for #1; the player's own chip outlined in accent. Solo players (no group): the strip shows YOUR BEST TODAY / THIS WEEK / ALL TIME instead.
- **Button rail:** 19vh circle, vertically centred at the right edge — the thumb's spot in two-hand landscape, never over the ladder.

### Palette (stage only; portrait stays white + blue, untouched)
`--bg #0B1424 · --bg2 #101c33 · text #F4F7FB · dim #8FA2BA · accent #4A90C4 · accent2 #7CC3F5 · gold #FFC83D · danger #FF4D4D` with a soft radial accent glow behind the clock.

## 3 · RECOMMENDATIONS (the card goes with these unless Wyatt says otherwise)

- **R1 — Auto scoreboard.** `@media (orientation: landscape) and (max-height: 520px)` (phones) and `(orientation: landscape) and (min-width: 900px)` (iPad / TV) put `body.stage` on; portrait is byte-identical to today. No toggle, no setting: turn the phone, get the board.
- **R2 — Dark stage, not white.** A white 1080p mirror is a floodlight in a gym; the dark navy reads from the mat and makes the gold PB moment land. Portrait keeps the white brand. The light variant is rendered only so the choice is visible (⚑ Q1).
- **R3 — The ladder never disappears.** Running state keeps every element; only the digits colour and the button change. Today's "hide all while running" is the single biggest loss on a TV.
- **R4 — Rows carry a delta.** `+0.19` against the session best on every row (BEST on the best). On a TV the delta is the story: players see the gap close.
- **R5 — The NEW BEST moment.** Gold banner replaces the drill name for 2.5 s, clock + row go gold, a single soft flash of the row plate (no confetti, no emoji). Also fires on a **group #1 today** — banner reads `★ GROUP BEST · 0.68`.
- **R6 — Group strip in the footer.** Top four today for the current drill, live from Firebase; you outlined in accent. Solo: the personal bests strip.
- **R7 — Leaderboard = side panel.** Bottom drawers are a portrait idiom; in the stage the drawers (daily leaderboard, streaks) slide in from the right at 46 vw with a shade. Same content, same chips.
- **R8 — Big tap zone.** The whole clock column is a tap target (start/stop), in addition to the rail button. A player glancing at the TV does not hunt for a 88 px dot on the phone.
- **R9 — Setup in two columns** (GIF left, form right, button in view) — fixes the off-screen LET'S GO.
- **R10 — Screen stays awake in the stage.** `navigator.wakeLock` (falls back silently in the WKWebView; Capacitor's KeepAwake plugin is the real fix — ⚑ Q5).
- **R11 — Demo GIF off the stage.** The drill clip stays a portrait thing; in the stage, the drill name tap opens the picker sheet which shows the GIF.
- **R12 — Nothing else moves.** Chart, heat map, warm-up overlay, box breathing, finish-session flow keep their portrait behaviour; in the stage they open as the same overlays scaled by vh.

## 4 · ⚑ QUESTIONS for Wyatt (the card assumes the bold answer)
- **Q1** Dark stage (**yes**) or keep white in landscape? (`phone-idle-light.png` is the white one.)
- **Q2** Delta column vs best (**yes**) — or plain times only?
- **Q3** Footer: group top four (**yes**) — or the player's own bests even when in a group?
- **Q4** NEW BEST banner also for group #1 (**yes**)?
- **Q5** Add Capacitor KeepAwake (a new native plugin, one `npm i` + pod-free SPM) so the screen never sleeps in the stage (**yes**)?
- **Q6** PWA manifest orientation → `any` (**yes**; only affects the web app).
- **Q7** Streak badge in the stage header (**yes**) — or hide it on the TV?

## 5 · BUILD NOTES for CARD-LT
- All in `www/index.html` (single file): a `<style>` block under `/* ── STAGE (landscape) ── */`, gated by `body.stage`; one `matchMedia` listener sets the class; `renderRuns()` gets a stage branch that emits `.st-row`s; `renderLeaderboard()` also fills `#stageStrip`; the PB path in the stop handler adds the banner class for 2500 ms.
- Sync law: `www/index.html` → `app/index.html` → `index.html` (root) are copies; then `npx cap sync ios` → `ios/App/App/public`.
- Verify with `design/landscape-tv-0923/capture-now.mjs` pattern (puppeteer via `/opt/homebrew/lib/node_modules/puppeteer`, `executablePath` = Google Chrome, `--mute-audio`): stills at 844×390@3 and 1920×1080 for idle / running / pb / board / setup, plus portrait 390×844 idle + running **byte-compared** to `stills-now/portrait-*.png` (portrait must not change).
- Ship: bump `ios/App/App/Info.plist` CFBundleVersion → 7 (it is hardcoded; 6 is on TestFlight now), `xcodebuild archive` + `-exportArchive` with `~/Desktop/ExportOptions-FOOTWORK.plist` and the ASC key (`~/.appstoreconnect/private/KEY-INFO.txt`), PATCH `usesNonExemptEncryption:false` on the new build, add it to beta group **Friends** `87221167-f3f7-475b-9ca9-15306d588b2d`, POST a betaAppReviewSubmission. Push `matladder` (GitHub Pages serves matladder.com from it).

## STATUS
- 9/23 18:10 PT: stills-now/ (12) + stills/ (14) rendered; doc written; artifact + card 1210 next.
- 9/23 18:20 PT: review page published https://claude.ai/artifact/WYTNHMLKAqBfACuHHqF8HP (account D · Chrome Profile 5); jumpr card 1210-footwork-the-scoreboard.md queued (lane matladder, plan = this doc); page source design/landscape-tv-0923/page/scoreboard.html.
- App Store page LIVE 18:05 PT: https://apps.apple.com/us/app/footwork-drill-timer/id6781869270 (v1.0 build 2 today; v1.1 build 6 WAITING_FOR_REVIEW).
