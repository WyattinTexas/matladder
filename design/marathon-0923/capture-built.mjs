// CARD-RUN verification stills + the byte-compare.
//   node design/marathon-0923/capture-built.mjs run      → stills-built/run-{idle,ask,mile,run,done,board}.png (390×844@3) from synthetic fixes
//   node design/marathon-0923/capture-built.mjs compare  → the ladder + Scoreboard stills BEFORE (git HEAD www/index.html) vs AFTER, byte-compared
//   (no arg = both).  puppeteer from /opt/homebrew, Google Chrome, --mute-audio.
import { createRequire } from 'module';
import fs from 'fs';
import { execSync } from 'child_process';
import { makeLoop } from './synthetic-run.mjs';
const require = createRequire('/opt/homebrew/lib/node_modules/puppeteer/package.json');
const puppeteer = require('puppeteer');
const ROOT = process.env.HOME + '/matladder/';
const OUT = ROOT + 'design/marathon-0923/stills-built/';
fs.mkdirSync(OUT, { recursive: true });
const AFTER = 'file://' + ROOT + 'www/index.html';
const BEFORE = 'file://' + ROOT + 'www/_before.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
const what = process.argv[2] || 'both';
const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
const newCtx = () => (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
const PIX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNoaGgAAAKEAYFZ7ahjAAAAAElFTkSuQmCC';
async function freeze(page) { await page.addStyleTag({ content: '.go-btn.pulse{animation:none!important} .rn-split.live::before{animation:none!important}' }); await page.evaluate((px) => document.querySelectorAll('img').forEach(i => { if (/\.gif$/i.test(i.getAttribute('src') || '')) i.src = px; }), PIX); await wait(150); }

// ── the RUN stills ──
if (what === 'run' || what === 'both') {
  const GROUP = 'run-demo-0923';
  const ctx = await newCtx(); const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  [pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('  [console.error]', m.text().slice(0, 160)); });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto(AFTER, { waitUntil: 'networkidle2' }).catch(() => {});
  await page.evaluate(() => document.fonts.ready); await wait(500);
  await page.type('#setupName', 'Isaac'); await page.type('#setupGroup', GROUP);
  await page.evaluate(() => document.getElementById('setupGoBtn').click()); await wait(800);
  // five other runners today (throwaway group) so the finish card ranks and the board has company
  await page.evaluate((g) => new Promise(res => {
    const now = Date.now(), mk = (name, best, dist, time, sp) => ({ ts: now - 3600000, date: now - 3600000, name, dist, time, avg: Math.round(time / (dist / 1609.344)), bestMile: best, splits: sp, splitsKm: [], gps: true });
    fbDb.ref('ladder/groups/' + g + '/runs').set({
      Sam: { a: mk('Sam', 485000, 4830, 1480000, [485000, 495000, 500000]) }, Maya: { a: mk('Maya', 530000, 6440, 2140000, [530000, 535000, 540000, 535000]) },
      Jordan: { a: mk('Jordan', 550000, 3220, 1105000, [550000, 555000]) }, Lee: { a: mk('Lee', 570000, 8050, 2900000, [570000, 580000, 585000, 580000, 585000]) },
      Priya: { a: mk('Priya', 602000, 4830, 1830000, [602000, 610000, 618000]) },
    }).then(res).catch(res); setTimeout(res, 4000);
  }), GROUP);
  await page.evaluate(() => document.querySelector('.run-chip').click()); await wait(400);
  await freeze(page);
  await page.screenshot({ path: OUT + 'run-idle.png' }); console.log('  still run-idle');
  // stub the real geolocation, freeze the wall clock to a synthetic one the fixes advance
  await page.evaluate(() => {
    navigator.geolocation.watchPosition = () => 1; navigator.geolocation.clearWatch = () => {};
    window.__t0 = Date.now(); window.__adv = 0; Date.now = () => window.__t0 + window.__adv;
  });
  await page.evaluate(() => document.getElementById('rnStart').click()); await wait(450);
  await page.screenshot({ path: OUT + 'run-ask.png' }); console.log('  still run-ask');
  await page.type('#rnGoalAsk', '8:40');
  await page.evaluate(() => document.getElementById('rnAskGo').click()); await wait(400);
  // the loop: miles 8:31 · 8:45 · 8:42 · 8:40 · 8:44 + 0.02, fed at 1 Hz of synthetic time
  const fixes = makeLoop({ paces: [511, 525, 522, 520, 524], extraMiles: 0.02, jitter: true, cold: true, jump: true, fuzzy: true, t0: 0 });
  const feed = async (from, to) => page.evaluate((fx, a, b) => { for (let i = a; i < b; i++) { window.__adv = fx[i].time; window.Run.onFix({ ...fx[i], time: window.__t0 + fx[i].time }); } return window.Run.engine().splits().length; }, fixes, from, to);
  // up to the mile-3 crossing: find the fix index where the 3rd split lands
  let idx = 0, n = 0; const step = 25;
  while (n < 3 && idx < fixes.length) { n = await feed(idx, Math.min(fixes.length, idx + step)); idx = Math.min(fixes.length, idx + step); }
  await wait(350);
  await page.screenshot({ path: OUT + 'run-mile.png' }); console.log('  still run-mile (splits', n, 'at fix', idx, ')');
  await page.evaluate(() => document.getElementById('rnAnn').classList.remove('show'));
  // 0.42 mi into mile 4 (the mock's moment)
  const target = Math.round((3 * 1609.344 + 0.42 * 1609.344) / (1609.344 / 520)) + 2;
  const at = Math.min(fixes.length, Math.max(idx, target));
  await feed(idx, at); idx = at; await wait(300);
  await page.screenshot({ path: OUT + 'run-run.png' }); console.log('  still run-run');
  await feed(idx, fixes.length); await wait(300);
  await page.evaluate(() => document.getElementById('rnAnn').classList.remove('show'));
  await page.evaluate(() => { document.getElementById('rnFinish').click(); document.getElementById('rnFinish').click(); }); await wait(2500);
  await page.screenshot({ path: OUT + 'run-done.png' }); console.log('  still run-done');
  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('footwork_runs'))[0]);
  console.log('  saved run:', JSON.stringify({ dist: rec.dist, time: rec.time, bestMile: rec.bestMile, splits: rec.splits, gps: rec.gps }));
  const img = await page.evaluate(async () => { const b = await window.Run.shareImage(); return b ? b.size : 0; });
  console.log('  share image bytes:', img);
  await page.evaluate(() => document.getElementById('rnDoneBack').click()); await wait(200);
  await page.evaluate(() => document.getElementById('lbOpenBtn').click()); await wait(1800);
  await page.screenshot({ path: OUT + 'run-board.png' }); console.log('  still run-board');
  await page.evaluate(() => document.getElementById('lbCloseBtn').click()); await wait(200);
  await page.evaluate(() => document.getElementById('streakBadge').click()); await wait(1800);
  await page.screenshot({ path: OUT + 'run-streaks.png' }); console.log('  still run-streaks');
  await page.close(); await ctx.close();
}

// ── the byte-compare: the ladder (portrait) + the Scoreboard (phone/tv) before vs after ──
if (what === 'compare' || what === 'both') {
  fs.writeFileSync(ROOT + 'www/_before.html', execSync('git show HEAD:www/index.html', { cwd: ROOT, maxBuffer: 1 << 26 }));
  const GROUP = 'lt-demo-0923', RUNS = [710, 900, 1080, 1260, 1430];
  async function seedFirebase(page) {
    await page.evaluate((g) => new Promise(res => { const now = Date.now(); fbDb.ref('ladder/groups/' + g + '/2in2out').set({ a1: { time: 690, name: 'Wyatt', date: now - 60000 }, a2: { time: 810, name: 'Sam', date: now - 50000 }, a3: { time: 840, name: 'Maya', date: now - 40000 }, a4: { time: 920, name: 'Jordan', date: now - 30000 } }).then(res).catch(res); setTimeout(res, 4000); }), GROUP);
  }
  async function shoot(url, tag, w, h, dpr, { group = GROUP, firebase = false, runningMs = 580, pbMs = 680, states = null, css = '' } = {}) {
    const ctx = await newCtx(); const page = await ctx.newPage();
    page.on('pageerror', e => console.log('  [pageerror]', tag, e.message));
    await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
    await page.goto(url, { waitUntil: 'networkidle2' }).catch(() => {});
    await page.evaluate(() => document.fonts.ready); await wait(600);
    const snap = async (name) => { await freeze(page); if (css) await page.addStyleTag({ content: css }); await page.screenshot({ path: OUT + tag + '-' + name + '.png' }); };
    await snap('setup');
    await page.type('#setupName', 'Isaac'); await page.type('#setupGroup', group);
    await page.evaluate(() => document.getElementById('setupGoBtn').click()); await wait(900);
    await snap('empty');
    if (firebase) await seedFirebase(page);
    await page.evaluate((g, runs) => { const now = Date.now(); const list = runs.map((t, i) => ({ time: t, name: 'Isaac', date: now - (runs.length - i) * 20000 })).reverse(); localStorage.setItem('ladder_' + g + '_2in2out', JSON.stringify(list)); }, group, RUNS);
    await page.reload({ waitUntil: 'networkidle2' }).catch(() => {});
    await page.evaluate(() => document.fonts.ready); await wait(1500);
    await snap('idle');
    await page.evaluate(() => { const p0 = performance.now.bind(performance); window.__fixed = 1000; performance.now = () => (window.__fixed !== null ? window.__fixed : p0()); });
    await page.evaluate(() => document.getElementById('goBtn').click());
    await page.evaluate((ms) => { window.__fixed = 1000 + ms; }, runningMs); await wait(400);
    await snap('running');
    if (states === 'portrait') { await page.close(); await ctx.close(); return; }
    await page.evaluate((ms) => { window.__fixed = 1000 + ms; }, pbMs);
    await page.evaluate(() => document.getElementById('goBtn').click()); await wait(700);
    await snap('pb'); await wait(2600); await snap('idle2');
    await page.evaluate(() => document.getElementById('stStrip').click()); await wait(900); await snap('board');
    await page.evaluate(() => document.getElementById('lbCloseBtn').click()); await wait(400);
    await page.evaluate(() => document.getElementById('stDrill').click()); await wait(600); await snap('sheet');
    await page.close(); await ctx.close();
  }
  console.log('  stage: phone/tv before + after …');
  await shoot(BEFORE, 'before-phone', 844, 390, 3, { firebase: true }); await shoot(AFTER, 'phone', 844, 390, 3, { firebase: true });
  await shoot(BEFORE, 'before-tv', 1920, 1080, 1, {}); await shoot(AFTER, 'tv', 1920, 1080, 1, {});
  console.log('  portrait before + after (+ after with the one new chip hidden) …');
  await shoot(BEFORE, 'before-portrait', 390, 844, 3, { group: '', runningMs: 0, states: 'portrait' });
  await shoot(AFTER, 'portrait', 390, 844, 3, { group: '', runningMs: 0, states: 'portrait' });
  await shoot(AFTER, 'portrait-nochip', 390, 844, 3, { group: '', runningMs: 0, states: 'portrait', css: '.run-chip{display:none!important}' });
  const cmp = (a, b) => { const A = fs.readFileSync(OUT + a + '.png'), B = fs.readFileSync(OUT + b + '.png'); const eq = A.equals(B); console.log('  ' + (eq ? 'BYTE-IDENTICAL' : 'DIFFERS       '), a, 'vs', b, A.length, B.length); return eq; };
  let allStage = true, allPortrait = true, allNochip = true;
  for (const n of ['setup', 'empty', 'idle', 'running', 'pb', 'idle2', 'board', 'sheet']) { allStage = cmp('before-phone-' + n, 'phone-' + n) && allStage; allStage = cmp('before-tv-' + n, 'tv-' + n) && allStage; }
  for (const n of ['setup', 'empty', 'idle', 'running']) { allPortrait = cmp('before-portrait-' + n, 'portrait-' + n) && allPortrait; allNochip = cmp('before-portrait-' + n, 'portrait-nochip-' + n) && allNochip; }
  console.log(allStage ? 'SCOREBOARD UNCHANGED' : 'SCOREBOARD CHANGED — look');
  console.log(allNochip ? 'LADDER PORTRAIT UNCHANGED (with the RUN chip hidden)' : 'LADDER PORTRAIT CHANGED — look');
  console.log(allPortrait ? 'portrait byte-identical even with the chip' : 'portrait differs only where the RUN chip sits (expected)');
  // the 1210 originals, as a second witness (their GIF frames were not frozen for the stage stills)
  const LT = ROOT + 'design/landscape-tv-0923/stills-built/';
  for (const n of ['setup', 'empty', 'idle', 'running', 'pb', 'idle2', 'board', 'sheet']) for (const k of ['phone', 'tv']) { const a = fs.readFileSync(LT + k + '-' + n + '.png'), b = fs.readFileSync(OUT + k + '-' + n + '.png'); console.log('  vs 1210', k + '-' + n, a.equals(b) ? 'BYTE-IDENTICAL' : 'differs (' + a.length + ' → ' + b.length + ')'); }
  fs.unlinkSync(ROOT + 'www/_before.html');
}
await browser.close();
