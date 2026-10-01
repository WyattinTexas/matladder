// CARD-RF: the RUN screen (the fitness look) — stills + behaviour checks on the shipped www/index.html, synthetic fixes.
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
  const t0 = Date.now(); window.__adv = 0; Date.now = () => t0 + window.__adv;     // a frozen wall clock: only the fixes (and the test) move it, so no real second leaks into the run
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
const T0 = await page.evaluate(() => Date.now());
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
const live = await page.evaluate(() => ({ clock: rnClock.textContent, dist: rnDist.textContent, cal: rnCal.textContent, pace: rnPaceNow.textContent, avg: rnAvg.textContent, prog: rnProgL.textContent, goal: rnGoalLine.textContent, splits: document.querySelectorAll('#rnSplits .rn-split').length,
  clockColor: getComputedStyle(rnClock).color, kind: window.Run.mapKind(), dot: !!document.querySelector('.rn-dot') }));
console.log('  live:', JSON.stringify(live));
ok(/^29:\d\d$|^30:\d\d$/.test(live.clock), 'the clock ~29:40 (' + live.clock + ')');
ok(Math.abs(parseFloat(live.dist) - 3.42) < 0.04, 'distance ~3.42 mi (' + live.dist + ')');
ok(+live.cal > 380 && +live.cal < 480, 'active calories for 175 lb over 3.43 mi ≈ 438 (' + live.cal + ')');
ok(/^8'\d\d"$/.test(live.pace) && /^8'\d\d"$/.test(live.avg), 'pace and average pace as 8\'mm" (' + live.pace + ' · ' + live.avg + ')');
ok(live.prog === 'MILE 4' && live.splits === 3, 'the mile in hand is 4; three splits listed');
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
console.log('  saved run:', JSON.stringify({ dist: rec.dist, time: rec.time, bestMile: rec.bestMile, splits: rec.splits, cal: rec.cal, calTotal: rec.calTotal, kg: rec.kg, route: (rec.route || '').length + ' chars', rt: (rec.rt || []).length, paused: rec.paused }));
ok(Math.abs(rec.dist / 1609.344 - 5.61) < 0.05 && rec.splits.length === 5, 'saved: ' + (rec.dist / 1609.344).toFixed(2) + ' mi of the 5.64 mi loop, five splits');
ok(rec.cal > 680 && rec.cal < 750 && rec.calTotal > rec.cal, 'saved: calories (' + rec.cal + ' active, ' + rec.calTotal + ' total) for ' + rec.kg + ' kg');
ok(typeof rec.route === 'string' && rec.route.length > 500 && rec.rt.length > 300, 'saved on the phone: the route (' + rec.route.length + ' chars) and its times');
ok(rec.paused >= 42000, 'the pause is on the record, outside the run time');
const sent = (await page.evaluate(() => window.__sent)).filter(s => /\/runs\/Wyatt\//.test(s.path));
ok(sent.length === 1, 'one write to the group');
const keys = sent.length ? Object.keys(sent[0].v).sort().join(',') : '';
ok(keys === 'avg,bestMile,date,dist,gps,name,splits,splitsKm,time,ts', 'the group gets the old fields only: ' + keys);
ok(sent.length && !JSON.stringify(sent[0].v).includes(rec.route.slice(0, 12)) && !('cal' in sent[0].v) && !('kg' in sent[0].v), 'no route, no calories, no weight leave the phone');
const sum = await page.evaluate(() => ({ time: rnDoneTime.textContent, dist: rnDoneDist.textContent, cal: rnDoneCal.textContent, calT: rnDoneCalT.textContent, avg: rnDoneAvg.textContent, best: rnDoneBest.textContent, rows: document.querySelectorAll('#rnDoneSplits .r').length, rank: rnDoneRankV.textContent, when: rnDoneK.textContent,
  mapShown: getComputedStyle(rnDoneMap).display !== 'none', glIn: !!document.querySelector('#rnDoneMap #rnMapGl') }));
console.log('  summary:', JSON.stringify(sum));
ok(/^5\.[56]\d$/.test(sum.dist) && sum.rows === 6 && /^8'\d\d"$/.test(sum.avg) && /^8'\d\d"$/.test(sum.best), 'the summary: ' + sum.dist + ' mi, 5 splits + the last stretch, avg pace ' + sum.avg + ', best mile ' + sum.best);
ok(sum.rank === '#2 OF 6', 'the group rank for the fastest mile today: ' + sum.rank);
ok(sum.mapShown && (NOMAP ? !sum.glIn : sum.glIn), 'the route map is in the summary' + (NOMAP ? ' (canvas)' : ' (the map moved in)'));
ok((await page.evaluate(() => window.__said)).some(s => /^Run complete\. 5\.[56]\d miles in forty-[-a-z ]+\.$/.test(s)), 'the voice closes: "' + (await page.evaluate(() => window.__said)).filter(s => s.startsWith('Run complete'))[0] + '"');
await page.screenshot({ path: tag('run-summary') });
await page.evaluate(() => { rnDone.scrollTop = rnDone.scrollHeight; }); await wait(300);
await page.screenshot({ path: tag('run-summary-2') });
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
// clean the throwaway group
await page.evaluate((g) => new Promise(res => { fbDb.ref('ladder/groups/' + g).remove().then(res).catch(res); setTimeout(res, 3000); }), GROUP);
await page.close(); await ctx.close(); await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
