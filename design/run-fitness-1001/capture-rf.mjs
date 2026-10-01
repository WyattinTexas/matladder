// CARD-RF + RF2: the RUN screen (the fitness look; splits + the route, shown nicely) — stills + behaviour checks on the
// shipped www/index.html, synthetic fixes.
//   node design/run-fitness-1001/capture-rf.mjs            → asserts + stills/run-*.png (390×844@3)
//   node design/run-fitness-1001/capture-rf.mjs nomap      → the same with WebGL off (the plain-canvas route)
// The route is a real one: the Lady Bird Lake trail loop in Austin (route-austin.json, 5.64 mi), run at 8:31 · 8:45 · 8:42 · 8:40 · 8:44 · 8:38.
// puppeteer from /opt/homebrew, Google Chrome, --mute-audio; the map tiles come from the network (OpenFreeMap).
import { createRequire } from 'module';
import fs from 'fs';
import { makeRouteRun } from './route-run.mjs';
const require = createRequire('/opt/homebrew/lib/node_modules/puppeteer/package.json');
const puppeteer = require('puppeteer');
const ROOT = process.env.HOME + '/matladder/';
const NOMAP = process.argv[2] === 'nomap';
const OUT = ROOT + 'design/run-fitness-1001/stills/';
fs.mkdirSync(OUT, { recursive: true });
const URL_ = 'file://' + ROOT + 'www/index.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ok   ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };
const tag = n => OUT + (NOMAP ? 'nomap-' : '') + n + '.png';

const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--mute-audio', ...(NOMAP ? ['--disable-gpu', '--disable-3d-apis'] : ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'])] });
const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
page.on('pageerror', e => { fail++; console.log('  [pageerror]', e.message); });
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) console.log('  [console.error]', m.text().slice(0, 200)); });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
// the page's own geolocation is stubbed (the fixes are fed through Run.onFix); a synthetic clock the fixes advance; a record of what is spoken and what goes to Firebase
await page.evaluateOnNewDocument(() => {
  // a frozen wall clock: only the fixes (and the test) move it, so no real second leaks into the run. It lives in
  // localStorage, so a page reload (the restart tests) wakes up at the same moment.
  let t0 = +localStorage.getItem('__rf_t0'); if (!t0) { t0 = Date.now(); localStorage.setItem('__rf_t0', String(t0)); }
  let adv = +localStorage.getItem('__rf_adv') || 0;
  Object.defineProperty(window, '__adv', { get: () => adv, set: v => { adv = v; localStorage.setItem('__rf_adv', String(v)); } });
  Date.now = () => t0 + adv;
  window.__said = []; window.__sent = [];
  window.speechSynthesis && (window.speechSynthesis.speak = u => { if (u.text && u.text.trim()) window.__said.push(u.text); });
  navigator.geolocation.watchPosition = () => 1; navigator.geolocation.clearWatch = () => {};
});
await page.goto(URL_, { waitUntil: 'networkidle2' }).catch(() => {});
await page.evaluate(() => document.fonts.ready); await wait(500);
const GROUP = 'rf-demo-1001';
await page.type('#setupName', 'Wyatt'); await page.type('#setupGroup', GROUP);
await page.evaluate(() => document.getElementById('setupGoBtn').click()); await wait(800);
// five other runners today (a throwaway group) so the summary ranks; and watch what this page writes to the group
await page.evaluate((g) => new Promise(res => {
  const now = Date.now(), mk = (name, best, dist, time, sp) => ({ ts: now - 3600000, date: now - 3600000, name, dist, time, avg: Math.round(time / (dist / 1609.344)), bestMile: best, splits: sp, splitsKm: [], gps: true });
  const ref = fbDb.ref('ladder/groups/' + g + '/runs');
  const set0 = firebase.database.Reference.prototype.set;
  firebase.database.Reference.prototype.set = function (v) { try { window.__sent.push({ path: this.toString(), v: JSON.parse(JSON.stringify(v)) }); } catch (e) {} return set0.apply(this, arguments); };
  ref.set({ Sam: { a: mk('Sam', 485000, 4830, 1480000, [485000, 495000, 500000]) }, Maya: { a: mk('Maya', 530000, 6440, 2140000, [530000, 535000, 540000, 535000]) },
            Jordan: { a: mk('Jordan', 550000, 3220, 1105000, [550000, 555000]) }, Lee: { a: mk('Lee', 570000, 8050, 2900000, [570000, 580000, 585000, 580000, 585000]) },
            Priya: { a: mk('Priya', 602000, 4830, 1830000, [602000, 610000, 618000]) } }).then(res).catch(res); setTimeout(res, 4000);
}), GROUP);
const txt = sel => page.evaluate(s => document.querySelector(s).textContent.trim(), sel);
const click = sel => page.evaluate(s => document.querySelector(s).click(), sel);
const has = (sel, c) => page.evaluate((s, c) => document.querySelector(s).classList.contains(c), sel, c);
const shown = sel => page.evaluate(s => { const e = document.querySelector(s), r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width > 0 && r.height > 0; }, sel);
const mapIdle = async () => { if (NOMAP) { await wait(250); return; } for (let i = 0; i < 40; i++) { const s = await page.evaluate(() => { const m = window.Run.map(); return m ? (m.loaded() && !m.isMoving() && m.areTilesLoaded()) : false; }); if (s) break; await wait(250); } await wait(350); };

// ── READY, location never asked ──
await click('.run-chip'); await wait(700);
ok(await has('body', 'run'), 'the Run chip turns the page to RUN (black)');
ok(await page.evaluate(() => getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)'), 'the page is true black');
ok(await has('#rnMap', 'off') && await txt('#rnMapOffBtn') === 'Turn on location', 'no location yet: the map card offers to turn it on');
ok(await txt('#rnGpsT') === 'LOCATION OFF', 'the pill says LOCATION OFF');
ok(await shown('#rnStart') && !(await shown('#rnPause')) && !(await shown('#rnFinish')), 'one button: START');
await page.screenshot({ path: tag('run-ready-off') });
// START the first time → the ask sheet
await click('#rnStart'); await wait(450);
ok(await has('#rnAsk', 'open'), 'the first START opens the plain-words sheet');
await page.type('#rnGoalAsk', '8:40'); await page.type('#rnWeightAsk', '175');
await page.screenshot({ path: tag('run-ask') });
// "Turn on location" → the 3·2·1 waits for the first fix, then counts
await click('#rnAskGo'); await wait(300);
ok(await has('#rnCount', 'show') && await has('#rnCount', 'wait'), 'then the countdown screen, holding for the first fix');
ok(await page.evaluate(() => localStorage.getItem('footwork_run_goal_mi') === '8:40' && Math.abs(parseFloat(localStorage.getItem('footwork_run_kg')) - 175 * 0.45359237) < 0.01), 'the goal pace and the weight (175 lb, kept in kg) are saved');
// the loop: miles 8:31 · 8:45 · 8:42 · 8:40 · 8:44, then 0.64 at 8:38, around Lady Bird Lake (Austin)
const T0 = await page.evaluate(() => Date.now() - window.__adv);
const fixes = makeRouteRun({ paces: [511, 525, 522, 520, 524, 518] });
const feed = (from, to) => page.evaluate((fx, a, b, t0) => { for (let i = a; i < b; i++) { window.__adv = fx[i].time; window.Run.onFix({ ...fx[i], time: t0 + fx[i].time }); } const E = window.Run.engine(); return E ? E.splits().length : -1; }, fixes, from, to, T0);
// one fix arrives (the phone found you) → 3 · 2 · 1
await page.evaluate((f, t0) => window.Run.onFix({ ...f, time: t0 }), fixes[0], T0); await wait(450);
ok(await has('#rnCount', 'go') && await txt('#rnCountN') === '3', 'the first fix lets the 3 · 2 · 1 go');
await page.screenshot({ path: tag('run-countdown') });
await wait(1150);
ok(await txt('#rnCountN') === '2', 'it counts: 2');
await click('#rnCount'); await wait(400);                      // a tap skips the rest
ok(await has('body', 'recording') && !(await has('#rnCount', 'show')), 'a tap starts the run now');
ok(await shown('#rnPause') && !(await shown('#rnStart')) && !(await shown('#rnFinish')), 'recording: one button, PAUSE');
ok(!(await shown('.header')) && !(await shown('#drillPicker')), 'the header and the chips are out of the way');
ok((await page.evaluate(() => window.__said)).includes('Run started.'), 'the voice says "Run started."');
// run to the mile-3 moment
let idx = 1, n = 0;
while (n < 3 && idx < fixes.length) { const to = Math.min(fixes.length, idx + 20); n = await feed(idx, to); idx = to; }
await mapIdle();
ok(await has('#rnAnn', 'show') && await txt('#rnAnnSub') === 'MILE 3', 'mile 3: the banner drops in');
const said3 = (await page.evaluate(() => window.__said)).filter(s => s.startsWith('Mile three'))[0] || '';
await wait(400);
const said3b = (await page.evaluate(() => window.__said)).filter(s => s.startsWith('Mile three'))[0] || said3;
ok(/^Mile three\. Pace, eight (thirty|forty)[-a-z ]*\. Average pace, eight [-a-z ]+\. Time, twenty-[-a-z ]+\./.test(said3b), 'the voice: "' + said3b + '"');
ok(/^\d'\d\d"$/.test(await txt('#rnAnnT')), 'the banner shows the mile pace the fitness way: ' + await txt('#rnAnnT'));
await page.screenshot({ path: tag('run-mile') });
await page.evaluate(() => document.getElementById('rnAnn').classList.remove('show'));
// 0.43 mi into mile 4
const at = Math.min(fixes.length, 511 + 525 + 522 + Math.round(0.43 * 520) + 2);
await feed(idx, Math.max(idx, at)); idx = Math.max(idx, at); await mapIdle();
await page.evaluate(() => document.getElementById('rnAnn').classList.remove('show'));
const live = await page.evaluate(() => ({ clock: rnClock.textContent, dist: rnDist.textContent, cal: rnCal.textContent, pace: rnPaceNow.textContent, avg: rnAvg.textContent, prog: rnProgL.textContent, goal: rnGoalLine.textContent, splits: document.querySelectorAll('#rnSplits .rn-chip').length, chips: [...document.querySelectorAll('#rnSplits .rn-chip')].map(c => c.textContent + (c.classList.contains('best') ? '*' : '')).join(' '),
  clockColor: getComputedStyle(rnClock).color, kind: window.Run.mapKind(), dot: !!document.querySelector('.rn-dot'), pins: [...document.querySelectorAll('#rnMap .rn-mile')].map(e => e.textContent).join(',') }));
console.log('  live:', JSON.stringify(live));
ok(/^29:\d\d$|^30:\d\d$/.test(live.clock), 'the clock ~29:40 (' + live.clock + ')');
ok(Math.abs(parseFloat(live.dist) - 3.42) < 0.04, 'distance ~3.42 mi (' + live.dist + ')');
ok(+live.cal > 380 && +live.cal < 480, 'active calories for 175 lb over 3.43 mi ≈ 438 (' + live.cal + ')');
ok(/^8'\d\d"$/.test(live.pace) && /^8'\d\d"$/.test(live.avg), 'pace and average pace as 8\'mm" (' + live.pace + ' · ' + live.avg + ')');
ok(live.prog === 'MILE 4' && live.splits === 3 && /^1\d'\d\d"\*? 2\d'\d\d"\*? 3\d'\d\d"\*?$/.test(live.chips) && (live.chips.match(/\*/g) || []).length === 1, 'the mile in hand is 4; three split chips, the fastest in gold: ' + live.chips);
ok(NOMAP || live.pins === '1,2,3', 'a numbered pin on the map at each mile: ' + live.pins);
// the clock, the four numbers and the splits all sit above PAUSE, without a scroll, on three phone sizes
for (const [w, h, name] of [[390, 844, 'this one'], [402, 778, 'iPhone 17 Pro inside its safe areas'], [375, 647, 'iPhone SE']]) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); await wait(350);
  const f = await page.evaluate(() => { const strip = document.getElementById('rnSplits').getBoundingClientRect(), btn = document.querySelector('#rnPause i').getBoundingClientRect(), lv = document.getElementById('rnLive'), chips = [...document.querySelectorAll('#rnSplits .rn-chip')], last = chips[chips.length - 1].getBoundingClientRect();
    return { stripBottom: Math.round(strip.bottom), btnTop: Math.round(btn.top), scrolls: lv.scrollHeight > lv.clientHeight + 1, lastIn: last.right <= innerWidth && last.left >= 0, mapH: Math.round(document.getElementById('rnMap').getBoundingClientRect().height) }; });
  ok(f.stripBottom <= f.btnTop && !f.scrolls && f.lastIn && f.mapH >= 150, `${w}×${h} (${name}): splits end at ${f.stripBottom}, PAUSE starts at ${f.btnTop}, map ${f.mapH} px, no scroll`);
}
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); await wait(350); await mapIdle();
ok(await page.evaluate(() => !!localStorage.getItem('footwork_run_live')), 'the run in progress is saved on the phone as it goes');
ok(/GOAL 8'40"/.test(live.goal), 'the goal line reads against 8\'40" (' + live.goal + ')');
ok(live.clockColor === 'rgb(255, 230, 32)', 'the clock is the stopwatch yellow');
ok(NOMAP ? live.kind === 'cv' : (live.kind === 'gl' && live.dot), NOMAP ? 'no WebGL: the plain-canvas route' : 'the map is live (MapLibre) with the blue dot');
await page.screenshot({ path: tag('run-running') });
// the map view: a tap on the map makes it big, another brings the numbers back
await click('#rnMap'); await wait(600); await mapIdle();
ok(await has('#runZone', 'big'), 'a tap on the map makes it big');
await page.screenshot({ path: tag('run-bigmap') });
await click('#rnMap'); await wait(600); await mapIdle();
ok(!(await has('#runZone', 'big')), 'another tap brings the numbers back');
// PAUSE → END + RESUME
await click('#rnPause'); await wait(300);
ok(await has('#runZone', 'paused') && await shown('#rnFinish') && await txt('#rnPauseL') === 'Resume', 'PAUSE: the clock stops, END and RESUME show');
await page.evaluate(() => { window.__adv += 42000; });
await page.evaluate((f, t0) => window.Run.onFix({ ...f, speed: 0, time: t0 + window.__adv }), fixes[idx - 1], T0); await wait(400);     // the phone keeps hearing from the sky while paused
ok(/^Paused 0:4\d$/.test(await txt('#rnPausedLbl')), 'it says how long: ' + await txt('#rnPausedLbl'));
ok(await txt('#rnGpsT') === 'GPS', 'the GPS pill stays green through the pause');
await page.screenshot({ path: tag('run-paused') });
await click('#rnFinish'); await wait(200);
ok(await has('#rnFinish', 'sure') && await has('body', 'recording'), 'one tap on END only arms it ("Tap again")');
await click('#rnPause'); await wait(300);
ok(!(await has('#runZone', 'paused')) && !(await has('#rnFinish', 'sure')), 'RESUME carries on, END is disarmed');
// shift the remaining fixes by the pause so the clock stays continuous, then finish the loop
const shift = 42000 + 1500;
for (let i = idx; i < fixes.length; i++) fixes[i].time += shift;
await feed(idx, fixes.length); idx = fixes.length; await wait(300);
await page.evaluate(() => document.getElementById('rnAnn').classList.remove('show'));
await click('#rnPause'); await wait(200); await click('#rnFinish'); await wait(150); await click('#rnFinish'); await wait(1800);
ok(await has('#rnDone', 'show') && !(await has('body', 'recording')), 'END twice → the summary');
await mapIdle();
const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('footwork_runs'))[0]);
console.log('  saved run:', JSON.stringify({ dist: rec.dist, time: rec.time, bestMile: rec.bestMile, splits: rec.splits, cal: rec.cal, calTotal: rec.calTotal, kg: rec.kg, route: (rec.route || '').length + ' chars', rp: (rec.rp || '').length + ' chars', paused: rec.paused }));
ok(Math.abs(rec.dist / 1609.344 - 5.61) < 0.05 && rec.splits.length === 5, 'saved: ' + (rec.dist / 1609.344).toFixed(2) + ' mi of the 5.64 mi loop, five splits');
ok(rec.cal > 680 && rec.cal < 750 && rec.calTotal > rec.cal, 'saved: calories (' + rec.cal + ' active, ' + rec.calTotal + ' total) for ' + rec.kg + ' kg');
ok(typeof rec.route === 'string' && rec.route.length > 500 && typeof rec.rp === 'string' && rec.rp.length > 500, 'saved on the phone: the route (' + rec.route.length + ' chars) with each point\'s time and distance (' + rec.rp.length + ' chars)');
ok(await page.evaluate(() => !localStorage.getItem('footwork_run_live')), 'the in-progress save is gone once the run is in the log');
ok(rec.paused >= 42000, 'the pause is on the record, outside the run time');
const sent = (await page.evaluate(() => window.__sent)).filter(s => /\/runs\/Wyatt\//.test(s.path));
ok(sent.length === 1, 'one write to the group');
const keys = sent.length ? Object.keys(sent[0].v).sort().join(',') : '';
ok(keys === 'avg,bestMile,date,dist,gps,name,splits,splitsKm,time,ts', 'the group gets the old fields only: ' + keys);
ok(sent.length && !JSON.stringify(sent[0].v).includes(rec.route.slice(0, 12)) && !('cal' in sent[0].v) && !('kg' in sent[0].v) && !('rp' in sent[0].v), 'no route, no calories, no weight leave the phone');
const sum = await page.evaluate(() => ({ time: rnDoneTime.textContent, dist: rnDoneDist.textContent, cal: rnDoneCal.textContent, calT: rnDoneCalT.textContent, avg: rnDoneAvg.textContent, best: rnDoneBest.textContent, rows: document.querySelectorAll('#rnDoneSplits .r').length, rank: rnDoneRankV.textContent, when: rnDoneK.textContent,
  mapShown: getComputedStyle(rnDoneMap).display !== 'none', glIn: !!document.querySelector('#rnDoneMap #rnMapGl'), pins: [...document.querySelectorAll('#rnDoneMap .rn-mile')].map(e => e.textContent).join(','),
  row3: [...document.querySelectorAll('#rnDoneSplits .r')][2].textContent.replace(/\s+/g, ' ').trim(), mapH: Math.round(rnDoneMap.getBoundingClientRect().height) }));
console.log('  summary:', JSON.stringify(sum));
ok(/^5\.[56]\d$/.test(sum.dist) && sum.rows === 6 && /^8'\d\d"$/.test(sum.avg) && /^8'\d\d"$/.test(sum.best), 'the summary: ' + sum.dist + ' mi, 5 splits + the last stretch, avg pace ' + sum.avg + ', best mile ' + sum.best);
ok(sum.rank === '#2 OF 6', 'the group rank for the fastest mile today: ' + sum.rank);
ok(sum.mapShown && (NOMAP ? !sum.glIn : sum.glIn) && sum.mapH === 300, 'the route map is in the summary, 300 px tall' + (NOMAP ? ' (canvas)' : ' (the map moved in)'));
ok(NOMAP || sum.pins === '1,2,3,4,5', 'with a pin at every mile: ' + sum.pins);
ok(/^3 ?8'\d\d" ?2\d:\d\d$/.test(sum.row3), 'each split row: its number, its pace, the time it ended (' + sum.row3 + ')');
ok((await page.evaluate(() => window.__said)).some(s => /^Run complete\. 5\.[56]\d miles in forty-[-a-z ]+\.$/.test(s)), 'the voice closes: "' + (await page.evaluate(() => window.__said)).filter(s => s.startsWith('Run complete'))[0] + '"');
await page.screenshot({ path: tag('run-summary') });
await page.evaluate(() => { rnDone.scrollTop = rnDone.scrollHeight; }); await wait(300);
await page.screenshot({ path: tag('run-summary-2') });
// ── the route view: tap split 3 → the map full screen, that mile lit; drag it; All; close ──
await page.evaluate(() => { rnDone.scrollTop = 0; });
await page.evaluate(() => [...document.querySelectorAll('#rnDoneSplits .r')][2].click()); await wait(700); await mapIdle();
const rv = await page.evaluate(() => { const S = window.Run.sum(), m = window.Run.map(); return { show: document.getElementById('rnRoute').classList.contains('show'), where: S && S.where, sel: S && S.sel, on: (document.querySelector('#rnRouteStrip .rn-chip.on') || {}).textContent,
  chips: document.querySelectorAll('#rnRouteStrip .rn-chip').length, big: rnRouteT.textContent, label: rnRouteL.textContent, head: rnRouteK.textContent, glIn: !!document.querySelector('#rnRouteMap #rnMapGl'),
  lit: [...document.querySelectorAll('#rnRouteMap .rn-mile.on')].map(e => e.textContent).join(','), zoom: m ? +m.getZoom().toFixed(2) : null, pan: m ? m.dragPan.isEnabled() : null, mapH: Math.round(rnRouteMap.getBoundingClientRect().height) }; });
console.log('  route view:', JSON.stringify(rv));
ok(rv.show && rv.where === 'route' && rv.sel === 2 && /^3\d'\d\d"$/.test(rv.on), 'a tap on split 3 opens the route view with that mile picked');
ok(rv.chips === 7 && /^8'\d\d"$/.test(rv.big) && /^MILE 3 · 1\d:\d\d – 2\d:\d\d$/.test(rv.label), 'All + 5 miles + the last stretch along the bottom; the picked mile: ' + rv.big + ' · ' + rv.label);
ok(NOMAP ? !rv.glIn : (rv.glIn && rv.lit === '2,3' && rv.pan === true && rv.mapH > 520), NOMAP ? 'no WebGL: the route view draws on the canvas' : 'the map fills the screen (' + rv.mapH + ' px), pins 2 and 3 lit, and it answers a finger');
await page.screenshot({ path: tag('run-route-split') });
if (!NOMAP) {
  const zSplit = rv.zoom, c0 = await page.evaluate(() => window.Run.map().getCenter().toArray());
  const mid = await page.evaluate(() => { const r = rnRouteMap.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await page.touchscreen.touchStart(mid[0], mid[1]); for (let i = 1; i <= 6; i++) { await page.touchscreen.touchMove(mid[0] + i * 14, mid[1] + i * 9); await wait(16); } await page.touchscreen.touchEnd(); await wait(900); await mapIdle();
  const c1 = await page.evaluate(() => window.Run.map().getCenter().toArray());
  ok(Math.abs(c1[0] - c0[0]) > 1e-5 || Math.abs(c1[1] - c0[1]) > 1e-5, 'a finger drags the map (centre moved ' + ((c1[0] - c0[0]) * 1e5).toFixed(0) + ', ' + ((c1[1] - c0[1]) * 1e5).toFixed(0) + ' ×1e-5°)');
  await click('#rnRouteStrip .rn-chip[data-k="-1"]'); await wait(900); await mapIdle();
  const all = await page.evaluate(() => ({ sel: window.Run.sum().sel, zoom: +window.Run.map().getZoom().toFixed(2), lit: document.querySelectorAll('#rnRouteMap .rn-mile.on').length, label: rnRouteL.textContent }));
  ok(all.sel === -1 && all.zoom < zSplit - 0.5 && all.lit === 0 && /WHOLE RUN/.test(all.label), 'All: the whole route again (zoom ' + zSplit + ' → ' + all.zoom + ')');
  await page.screenshot({ path: tag('run-route-all') });
  // the last stretch, picked from the strip
  await click('#rnRouteStrip .rn-chip[data-k="5"]'); await wait(900); await mapIdle();
  ok(await page.evaluate(() => window.Run.sum().sel === 5 && /^LAST 0\.5\d MI/.test(rnRouteL.textContent)), 'the stretch after mile 5 can be picked too: ' + await txt('#rnRouteL'));
  await click('#rnRouteFit'); await wait(700); await mapIdle();
  ok(await page.evaluate(() => window.Run.sum().sel === -1), 'the frame button shows the whole route');
} else { await click('#rnRouteStrip .rn-chip[data-k="-1"]'); await wait(300); await page.screenshot({ path: tag('run-route-all') }); }
await click('#rnRouteX'); await wait(600); await mapIdle();
ok(await page.evaluate(() => !document.getElementById('rnRoute').classList.contains('show') && window.Run.sum().where === 'sum' && (window.Run.mapKind() !== 'gl' || (!!document.querySelector('#rnDoneMap #rnMapGl') && !window.Run.map().dragPan.isEnabled()))), 'closing puts the map back in the summary, still again');
await click('#rnDoneMap'); await wait(600); await mapIdle();
ok(await page.evaluate(() => document.getElementById('rnRoute').classList.contains('show') && window.Run.sum().sel === -1), 'a tap on the summary\'s map opens the route view on the whole run');
await click('#rnRouteX'); await wait(500); await mapIdle();
// the share image
const img = await page.evaluate(async () => { const b = await window.Run.shareImage(); if (!b) return null; return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); });
ok(!!img, 'the share image renders');
if (img) fs.writeFileSync(tag('run-share'), Buffer.from(img.split(',')[1], 'base64'));
// DONE → ready again, with this week's miles and the last run
await click('#rnDoneBack'); await wait(500); await mapIdle();
ok(!(await has('#rnDone', 'show')) && /^5\.[56]\d$/.test(await txt('#rnWeekV')) && /1 run this week/.test(await txt('#rnWeekN')), 'back on the ready screen: ' + await txt('#rnWeekV') + ' mi, 1 run this week');
ok(NOMAP || await page.evaluate(() => !!document.querySelector('#rnMap #rnMapGl')), 'the map is back on the run screen');
ok(await txt('#rnGpsT') === 'GPS READY' || await txt('#rnGpsT') === 'GPS', 'GPS READY before the next START (' + await txt('#rnGpsT') + ')');
await page.screenshot({ path: tag('run-ready') });
// settings
await click('#rnOpts'); await wait(450);
ok(await has('#rnSet', 'open') && await page.evaluate(() => rnWeight.value === '175' && rnGoal.value === '8:40'), 'the settings sheet: goal 8:40, weight 175 lb');
await page.screenshot({ path: tag('run-settings') });
await click('#rnSegUnit button[data-v="km"]'); await wait(200);
ok(await page.evaluate(() => rnWeight.value === '79' && rnWeightUnit.textContent === 'KG'), 'kilometers: the weight reads 79 kg (the same weight)');
await click('#rnSegUnit button[data-v="mi"]'); await wait(200);
await click('#rnSetDone'); await wait(400);
ok(await page.evaluate(() => rnWeightAsk.placeholder === '160' && Math.abs(parseFloat(localStorage.getItem('footwork_run_kg')) / 0.45359237 - 175) < 0.6), 'back to miles: still 175 lb');
// all runs → the run → its map again → delete
await click('#rnHistBtn'); await wait(500);
ok(await has('#rnHist', 'open') && await page.evaluate(() => document.querySelectorAll('.rn-hist-row').length === 1), 'All runs lists the run');
const hist = await page.evaluate(() => { const row = document.querySelector('.rn-hist-row'), cv = row.querySelector('canvas'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let blue = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i + 2] > 200 && d[i] < 60) blue++; return { blue, sp: row.querySelector('.sp').textContent }; });
ok(hist.blue > 300 && /^5 splits · best 8'\d\d"$/.test(hist.sp), 'its row draws the route small (' + hist.blue + ' px of line) and says its splits: ' + hist.sp);
await page.screenshot({ path: tag('run-history') });
await click('.rn-hist-row'); await wait(700); await mapIdle();
ok(await has('#rnDone', 'show') && await page.evaluate(() => getComputedStyle(rnDoneMap).display !== 'none'), 'a tap opens its summary, with its map');
await click('#rnDoneDel'); await wait(150);
ok(await txt('#rnDoneDel') === 'Tap again to delete' && await page.evaluate(() => JSON.parse(localStorage.getItem('footwork_runs')).length === 1), 'Delete asks once more');
await click('#rnDoneX'); await wait(400);
// leaving RUN: a drill chip → the white ladder timer, untouched
await page.evaluate(() => [...document.querySelectorAll('.drill-chip')].find(c => c.textContent === 'Icky Shuffle').click()); await wait(400);
ok(!(await has('body', 'run')) && await page.evaluate(() => getComputedStyle(document.body).backgroundColor === 'rgb(255, 255, 255)'), 'a drill chip leaves RUN: the white drill timer is back');
// timer only: location refused
await page.evaluate(() => { localStorage.setItem('footwork_run_loc', 'off'); });
await click('.run-chip'); await wait(500);
await click('#rnStart'); await wait(200); await click('#rnCount'); await wait(400);
ok(await has('#runZone', 'nogps') && !(await shown('#rnMap')) && await txt('#rnDist') === '--' && await txt('#rnCal') === '--', 'location off: the clock alone (no map, no distance, no calories)');
await page.evaluate(() => { window.__adv += 65000; }); await wait(400);
ok(await txt('#rnClock') === '1:05' && !(await has('#runZone', 'paused')), 'with no location the clock keeps running (no auto-pause): ' + await txt('#rnClock'));
await page.screenshot({ path: tag('run-timer-only') });
await click('#rnPause'); await wait(150); await click('#rnFinish'); await wait(150); await click('#rnFinish'); await wait(900);
ok(await has('#rnDone', 'show') && await page.evaluate(() => getComputedStyle(rnDoneMap).display === 'none' && rnDoneDist.textContent === '--'), 'its summary has no map and no distance');
await click('#rnDoneBack'); await wait(300);
// ── a run is never lost: three restarts of the page mid-run ──
const run2 = makeRouteRun({ paces: [505, 512, 520] }), T2 = (await page.evaluate(() => window.__adv)) + 5000;
const feed2 = (from, to, shift) => page.evaluate((fx, a, b, t0, base) => { for (let i = a; i < b; i++) { window.__adv = base + fx[i].time; window.Run.onFix({ ...fx[i], time: t0 + base + fx[i].time }); } const E = window.Run.engine(); return E ? { splits: E.splits().length, dist: E.dist, track: E.track.length, state: E.state } : null; }, run2, from, to, T0, T2 + (shift || 0));
const startRun = async () => { await page.evaluate(() => { localStorage.setItem('footwork_run_loc', 'on'); }); await page.evaluate(b => { window.__adv = b; }, T2); await click('#rnStart'); await wait(250); await click('#rnCount'); await wait(400); };
// the page goes down for `ms` and comes back: its last save is on the phone, the clock has moved on while it was gone
// (the jump is written to the stored clock only, so the page that is still up never sees it, as in a real restart)
const downFor = async (ms) => { await page.evaluate(() => window.Run.liveSave(true)); await page.evaluate(d => localStorage.setItem('__rf_adv', String(window.__adv + d)), ms);
  await page.reload({ waitUntil: 'networkidle2' }).catch(() => {}); await page.evaluate(() => document.fonts.ready); await wait(900); await mapIdle(); };
const state = () => page.evaluate(() => { const E = window.Run.engine(); return { rec: document.body.classList.contains('recording'), run: document.body.classList.contains('run'), paused: document.getElementById('runZone').classList.contains('paused'), clock: rnClock.textContent, dist: rnDist.textContent, chips: document.querySelectorAll('#rnSplits .rn-chip').length,
  toast: document.getElementById('toast').textContent, pausedLbl: rnPausedLbl.textContent, eng: E ? { state: E.state, dist: E.dist, track: E.track.length, splits: E.splits().map(x => Math.round(x.time)) } : null, done: document.getElementById('rnDone').classList.contains('show'), live: !!localStorage.getItem('footwork_run_live'), runs: JSON.parse(localStorage.getItem('footwork_runs') || '[]').length }; });
// (1) back within a minute: the run carries on
await startRun();
let a2 = await feed2(0, 700);
const before = await state();
await downFor(8000);
const after = await state();
console.log('  restart (8 s):', JSON.stringify({ before: { clock: before.clock, dist: before.dist, chips: before.chips }, after: { clock: after.clock, dist: after.dist, chips: after.chips, rec: after.rec, toast: after.toast, state: after.eng && after.eng.state } }));
ok(after.rec && after.run && after.eng && after.eng.state === 'running' && after.toast === 'Run recovered', 'the page restarted mid-run: it opens straight back on the run, recording');
ok(after.dist === before.dist && after.chips === before.chips && after.eng.track === before.eng.track && JSON.stringify(after.eng.splits) === JSON.stringify(before.eng.splits), 'nothing lost: ' + after.dist + ' mi, ' + after.chips + ' split, ' + after.eng.track + ' route points');
ok(NOMAP || await page.evaluate(() => window.Run.mapKind() === 'gl' && document.querySelectorAll('#rnMap .rn-mile').length === 1 && window.Run.map().queryRenderedFeatures({ layers: ['route'] }).length > 0), 'the map comes back with the route and the mile pin');
await page.screenshot({ path: tag('run-recovered') });
a2 = await feed2(708, 1100);                                                               // fixes 700–707 fell in the gap
ok(a2 && a2.state === 'running' && a2.splits === 2 && Math.abs(a2.dist - 1099 * 1609.344 / 508.5) < 60, 'and it carries on: 2 splits, ' + (a2.dist / 1609.344).toFixed(2) + ' mi (the 8 s gap is bridged)');
// (2) back after five minutes: paused where it was saved
const b4 = await state();
await downFor(300000);
const p5 = await state();
console.log('  restart (5 min):', JSON.stringify({ clock: p5.clock, paused: p5.paused, lbl: p5.pausedLbl, toast: p5.toast }));
ok(p5.rec && p5.paused && p5.eng.state === 'paused' && p5.clock === b4.clock && /^Paused 5:0\d$/.test(p5.pausedLbl) && /RESUME or END/.test(p5.toast), 'back after 5 minutes: the run is there, paused where it was saved (' + p5.clock + ', ' + p5.pausedLbl + ')');
await click('#rnPause'); await wait(300);
a2 = await feed2(1100, 1300, 300000);
ok(a2 && a2.state === 'running' && Math.abs(a2.dist - b4.eng.dist - 199 * 1609.344 / 520) < 40, 'RESUME carries on from there (+' + ((a2.dist - b4.eng.dist) / 1609.344).toFixed(2) + ' mi)');
// (3) back after forty minutes: the run is saved as it stood
const b40 = await state();
await downFor(40 * 60000);
const f40 = await state();
const rec40 = await page.evaluate(() => JSON.parse(localStorage.getItem('footwork_runs'))[0]);
console.log('  restart (40 min):', JSON.stringify({ done: f40.done, rec: f40.rec, toast: f40.toast, runs: f40.runs, dist: rec40.dist, time: rec40.time, splits: rec40.splits.length, route: (rec40.route || '').length }));
ok(f40.done && !f40.rec && !f40.live && f40.toast === 'Recovered your run' && f40.runs === b40.runs + 1, 'back after 40 minutes: the run is in the log as it stood, its summary on screen');
ok(Math.abs(rec40.dist - b40.eng.dist) < 20 && rec40.splits.length === 2 && rec40.route.length > 200 && Math.abs(rec40.time - 1299000) < 4000, 'with its distance, its 2 splits, its route and its own time (' + (rec40.dist / 1609.344).toFixed(2) + ' mi in ' + Math.round(rec40.time / 1000) + ' s)');
await page.screenshot({ path: tag('run-recovered-summary') });
await click('#rnDoneBack'); await wait(300);
// clean the throwaway group
await page.evaluate((g) => new Promise(res => { fbDb.ref('ladder/groups/' + g).remove().then(res).catch(res); setTimeout(res, 3000); }), GROUP);
await page.close(); await ctx.close(); await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
