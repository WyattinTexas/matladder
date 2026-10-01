// CARD-RF2 (R2-10) — the run on the lock screen: what the page tells the phone's Live Activity, and when.
//   node design/run-fitness-1001/test-lockscreen.mjs
// The shipped www/index.html with a stand-in for the phone's plugin (window.Capacitor.Plugins.RunActivity) that writes
// down every call. Synthetic fixes on the Lady Bird Lake loop (route-run.mjs); a synthetic clock only the fixes move.
// What the card looks like on a phone is the simulator kit's job (sim/sim-run.mjs lock).
import { createRequire } from 'module';
import { makeRouteRun } from './route-run.mjs';
const require = createRequire('/opt/homebrew/lib/node_modules/puppeteer/package.json');
const puppeteer = require('puppeteer');
const ROOT = process.env.HOME + '/matladder/';
const URL_ = 'file://' + ROOT + 'www/index.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ok   ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };

const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--mute-audio', '--disable-gpu', '--disable-3d-apis'] });
const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
page.on('pageerror', e => { fail++; console.log('  [pageerror]', e.message); });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.evaluateOnNewDocument(() => {
  let t0 = +localStorage.getItem('__rf_t0'); if (!t0) { t0 = Date.now(); localStorage.setItem('__rf_t0', String(t0)); }
  let adv = +localStorage.getItem('__rf_adv') || 0;
  Object.defineProperty(window, '__adv', { get: () => adv, set: v => { adv = v; localStorage.setItem('__rf_adv', String(v)); } });
  Date.now = () => t0 + adv;
  window.speechSynthesis && (window.speechSynthesis.speak = () => {});
  navigator.geolocation.watchPosition = () => 1; navigator.geolocation.clearWatch = () => {};
  // the phone's plugin, standing in: every call is written down (in localStorage: a page restart keeps the list)
  const note = v => { const a = JSON.parse(localStorage.getItem('__la') || '[]'); a.push(v); localStorage.setItem('__la', JSON.stringify(a)); };
  const mk = verb => arg => { note({ verb, at: adv, ...arg }); return Promise.resolve({ on: true }); };
  if (!localStorage.getItem('__la_off')) window.Capacitor = { isPluginAvailable: n => n === 'RunActivity', Plugins: { RunActivity: { start: mk('start'), update: mk('update'), end: mk('end') } } };
});
await page.goto(URL_, { waitUntil: 'domcontentloaded' }).catch(() => {});
await wait(800);
await page.type('#setupName', 'Wyatt');
await page.evaluate(() => document.getElementById('setupGoBtn').click()); await wait(700);
const click = sel => page.evaluate(s => document.querySelector(s).click(), sel);
const calls = () => page.evaluate(() => JSON.parse(localStorage.getItem('__la') || '[]'));
const clear = () => page.evaluate(() => localStorage.removeItem('__la'));
const T0 = await page.evaluate(() => Date.now() - window.__adv);
const fixes = makeRouteRun({ paces: [511, 525, 522] });
let base = 0;
const feed = (from, to) => page.evaluate((fx, a, b, t0, base) => { for (let i = a; i < b; i++) { window.__adv = base + fx[i].time; window.Run.onFix({ ...fx[i], time: t0 + base + fx[i].time }); } }, fixes, from, to, T0, base);
// the runner stands still: a fix a second on the same spot
const stand = (i, secs) => page.evaluate((f, n, t0) => { const a0 = window.__adv; for (let k = 1; k <= n; k++) { window.__adv = a0 + k * 1000; window.Run.onFix({ ...f, speed: 0, time: t0 + a0 + k * 1000 }); } }, fixes[i], secs, T0);

console.log('── the app opens with no run in hand ──');
let c = await calls();
ok(c.length === 1 && c[0].verb === 'end', 'one call: end (no card is left over from a run that is gone)');
await clear();

console.log('── START ──');
await click('.run-chip'); await wait(500);
await page.evaluate(() => { localStorage.setItem('footwork_run_loc', 'on'); localStorage.setItem('footwork_run_autopause', '0'); });
await page.reload({ waitUntil: 'domcontentloaded' }); await wait(700); await clear();
await click('.run-chip'); await wait(400);
await click('#rnStart'); await wait(250); await click('#rnCount'); await wait(400);
c = await calls();
const st = c.filter(x => x.verb === 'start');
ok(c.length === 1 && st.length === 1, 'START makes the card, in one call (' + c.map(x => x.verb).join(' ') + ')');
ok(st[0] && st[0].running === true && st[0].elapsed === '0:00' && st[0].elapsedMs === 0 && st[0].distance === '0.00' && st[0].unit === 'MI', 'it opens at 0:00 · 0.00 MI, running');
ok(st[0] && st[0].splitLabel === 'MILE 1' && st[0].lastSplit === '' && st[0].status === '' && st[0].staleSeconds === 180 && !st[0].resume, 'the split in hand is MILE 1; the card goes stale after 180 s without a word');
ok(c[c.length - 1].verb === 'start', 'nothing is sent after it until the run moves');

console.log('── the first mile ──');
await clear();
base = await page.evaluate(() => window.__adv);
let i = 1; const mile1 = 500;                                    // a little before the mile (the first seconds of a run are the GPS settling)
await feed(i, mile1); i = mile1;
c = await calls();
const up = c.filter(x => x.verb === 'update');
ok(c.every(x => x.verb === 'update') && up.length > 60 && up.length <= 125, up.length + ' updates in ' + (mile1 - 1) + ' s of running (never more than one every 4 s)');
let minGap = Infinity, same = 0; for (let k = 1; k < up.length; k++) { minGap = Math.min(minGap, up[k].at - up[k - 1].at); const key = x => [x.status, x.distance, x.unit, x.pace, x.splitLabel, x.lastSplit].join('|'); if (key(up[k]) === key(up[k - 1])) same++; }
ok(minGap >= 4000, 'the closest two are ' + (minGap / 1000).toFixed(0) + ' s apart');
ok(same === 0, 'each one says something new (no update repeats the one before it)');
const lastUp = up[up.length - 1];
ok(lastUp.running && /^0\.9\d$/.test(lastUp.distance) && /^8'\d\d"$/.test(lastUp.pace) && lastUp.splitLabel === 'MILE 1', 'near the mile it reads ' + lastUp.elapsed + ' · ' + lastUp.distance + ' MI · ' + lastUp.pace + ' · ' + lastUp.splitLabel);
ok(Math.abs(lastUp.elapsedMs - (lastUp.at - base)) < 1500 && Math.abs(lastUp.splitMs - lastUp.elapsedMs) < 50, 'the clock and the split clock are the run\'s own (' + lastUp.elapsedMs + ' ms)');
await clear();
while (i < fixes.length - 1 && !(await page.evaluate(() => window.Run.engine().splits().length))) { await feed(i, i + 1); i++; }
c = await calls();
const sp = c.find(x => x.verb === 'update' && x.lastSplit);
ok(!!sp && /^MILE 1 {2}8'[34]\d"$/.test(sp.lastSplit) && sp.splitLabel === 'MILE 2' && sp.splitMs < 4000, 'the mile is told at once: "' + (sp && sp.lastSplit) + '", now ' + (sp && sp.splitLabel) + ' at ' + (sp && sp.splitElapsed));

console.log('── PAUSE, three minutes standing, RESUME ──');
await clear();
await click('#rnPause'); await wait(150);
c = await calls();
const pz = c[c.length - 1];
const clock = await page.evaluate(() => rnClock.textContent);
ok(c.length === 1 && pz.verb === 'update' && pz.running === false && pz.status === 'PAUSED' && pz.elapsed === clock, 'PAUSE is told at once: stopped at ' + pz.elapsed + ' (the screen says ' + clock + ')');
await clear();
await stand(i, 185);
c = await calls();
ok(c.length === 3 && c.every(x => x.verb === 'update' && !x.running && x.elapsed === clock), 'paused for 185 s: ' + c.length + ' words, one a minute, the clock where it stopped (the card never goes stale while the app lives)');
await clear();
await click('#rnPause'); await wait(150);
c = await calls();
ok(c.length === 1 && c[0].verb === 'update' && c[0].running === true && c[0].status === '' && c[0].elapsed === clock, 'RESUME is told at once: running again from ' + c[0].elapsed);

console.log('── the phone locks; the app is restarted behind it ──');
await clear();
base = (await page.evaluate(() => window.__adv)) - fixes[i].time;
await feed(i + 1, i + 40); i += 40;
await clear();
await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
c = await calls();
ok(c.length === 1 && c[0].verb === 'update' && c[0].running, 'going behind the lock screen sends the numbers as they stand');
const before = c[0];
await clear();
await page.evaluate(() => { window.Run.liveSave(true); localStorage.setItem('__rf_adv', String(window.__adv + 8000)); });
await page.reload({ waitUntil: 'domcontentloaded' }); await wait(900);
c = await calls();
const rs = c.filter(x => x.verb === 'start');
ok(rs.length === 1 && rs[0].resume === true && !c.some(x => x.verb === 'end'), 'the page restarts mid-run: the card is picked up (start, resume), never ended');
ok(rs[0] && rs[0].running && rs[0].distance === before.distance && Math.abs(rs[0].elapsedMs - before.elapsedMs - 8000) < 1500 && rs[0].splitLabel === before.splitLabel && rs[0].lastSplit === before.lastSplit, 'with the run as it was: ' + (rs[0] && rs[0].elapsed) + ' · ' + (rs[0] && rs[0].distance) + ' MI · ' + (rs[0] && rs[0].lastSplit));

console.log('── END ──');
await clear();
await click('#rnPause'); await wait(150); await click('#rnFinish'); await wait(150); await click('#rnFinish'); await wait(500);
c = await calls();
ok(c.length === 2 && c[0].verb === 'update' && c[0].status === 'PAUSED' && c[1].verb === 'end', 'END takes the card off the lock screen (' + c.map(x => x.verb).join(' ') + ')');
ok(await page.evaluate(() => document.getElementById('rnDone').classList.contains('open') || document.getElementById('rnDone').classList.contains('show') || !!document.querySelector('#rnDoneTime').textContent), 'and the summary opens');
await clear();
await page.evaluate(() => { const a0 = window.__adv; window.__adv = a0 + 30000; });
await wait(600);
ok((await calls()).length === 0, 'nothing more is sent once the run is over');

console.log('── a timing-only run (location off) ──');
await page.evaluate(() => { localStorage.setItem('footwork_run_loc', 'off'); });
await page.reload({ waitUntil: 'domcontentloaded' }); await wait(700); await clear();
await click('.run-chip'); await wait(400);
await click('#rnStart'); await wait(250); await click('#rnCount'); await wait(400);
c = await calls();
const t = c.find(x => x.verb === 'start');
ok(!!t && t.distance === '--' && t.pace === '--\'--"' && t.splitLabel === '' && t.staleSeconds === 0, 'its card shows the clock alone (no distance, pace or split) and never goes stale: the phone keeps its time');
await clear();
await page.evaluate(() => { window.__adv += 125000; }); await wait(700);
c = await calls();
ok(c.length >= 1 && c.length <= 3 && c.every(x => x.verb === 'update' && x.distance === '--'), 'a word a minute while the app is awake (' + c.length + ' in 125 s)');
await click('#rnPause'); await wait(150); await click('#rnFinish'); await wait(150); await click('#rnFinish'); await wait(400);
c = await calls();
ok(c[c.length - 1].verb === 'end', 'END takes it off');

console.log('── a build without the plugin (the web; 1.2 build 10) ──');
await page.evaluate(() => { localStorage.setItem('__la_off', '1'); localStorage.setItem('footwork_run_loc', 'on'); });
await page.reload({ waitUntil: 'domcontentloaded' }); await wait(700); await clear();
await click('.run-chip'); await wait(400);
await click('#rnStart'); await wait(250); await click('#rnCount'); await wait(400);
base = await page.evaluate(() => window.__adv);
await feed(1, 60);
const web = await page.evaluate(() => ({ rec: document.body.classList.contains('recording'), dist: rnDist.textContent, cap: typeof window.Capacitor }));
ok(web.cap === 'undefined' && web.rec && web.dist !== '0.00' && (await calls()).length === 0, 'the run records as before, and nothing is called (' + web.dist + ' MI)');

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
