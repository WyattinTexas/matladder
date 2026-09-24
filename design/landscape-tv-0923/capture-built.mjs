// CARD-LT verification stills: landscape phone (844×390@3) + TV (1920×1080) for setup/empty/idle/running/pb/board,
// and PORTRAIT 390×844@3 setup/empty/runs/running captured from BEFORE (git HEAD copy at www/_before.html) and AFTER,
// byte-compared. Deterministic: runs are seeded in localStorage, performance.now is frozen while the clock runs.
// Run: node design/landscape-tv-0923/capture-built.mjs   (puppeteer from /opt/homebrew, Google Chrome, --mute-audio)
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/homebrew/lib/node_modules/puppeteer/package.json');
const puppeteer = require('puppeteer');
const ROOT = process.env.HOME + '/matladder/';
const OUT = ROOT + 'design/landscape-tv-0923/stills-built/';
fs.mkdirSync(OUT, { recursive: true });
const AFTER = 'file://' + ROOT + 'www/index.html';
const BEFORE = 'file://' + ROOT + 'www/_before.html';
const GROUP = 'lt-demo-0923';
const RUNS = [710, 900, 1080, 1260, 1430]; // ms, chronological (mock values)
const wait = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
const newCtx = () => (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());

async function seedFirebase(page) {
  // demo group: three other players today, so the strip and the panel have company (throwaway group id)
  await page.evaluate((g) => new Promise(res => {
    const now = Date.now();
    fbDb.ref('ladder/groups/' + g + '/2in2out').set({
      a1: { time: 690, name: 'Wyatt', date: now - 60000 }, a2: { time: 810, name: 'Sam', date: now - 50000 },
      a3: { time: 840, name: 'Maya', date: now - 40000 }, a4: { time: 920, name: 'Jordan', date: now - 30000 },
    }).then(res).catch(res);
    setTimeout(res, 4000);
  }), GROUP);
}

async function shoot(url, tag, w, h, dpr, { group = GROUP, firebase = false, runningMs = 580, pbMs = 680, states = null } = {}) {
  const ctx = await newCtx();
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  [pageerror]', tag, e.message));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: 'networkidle2' }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await wait(600);
  const freeze = async () => { if (states !== 'portrait') return; await page.addStyleTag({ content: '.go-btn.pulse{animation:none!important}' }); await page.evaluate(() => document.querySelectorAll('img').forEach(i => { if (/\.gif$/i.test(i.getAttribute('src') || '')) i.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNoaGgAAAKEAYFZ7ahjAAAAAElFTkSuQmCC'; })); await wait(150); };
  const snap = async (name) => { await freeze(); await page.screenshot({ path: OUT + tag + '-' + name + '.png' }); console.log('  still', tag + '-' + name); };
  await snap('setup');
  await page.type('#setupName', 'Isaac');
  await page.type('#setupGroup', group);
  await page.evaluate(() => document.getElementById('setupGoBtn').click());
  await wait(900);
  await snap('empty');
  if (firebase) await seedFirebase(page);
  // seed five reps and reload (the name is stored, so the app enters main by itself)
  await page.evaluate((g, runs) => {
    const now = Date.now();
    const list = runs.map((t, i) => ({ time: t, name: 'Isaac', date: now - (runs.length - i) * 20000 })).reverse();
    localStorage.setItem('ladder_' + g + '_2in2out', JSON.stringify(list));
  }, group, RUNS);
  await page.reload({ waitUntil: 'networkidle2' }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await wait(1500);
  await snap('idle');
  // running: freeze the clock
  await page.evaluate(() => { const p0 = performance.now.bind(performance); window.__fixed = 1000; performance.now = () => (window.__fixed !== null ? window.__fixed : p0()); });
  await page.evaluate(() => document.getElementById('goBtn').click());
  await page.evaluate((ms) => { window.__fixed = 1000 + ms; }, runningMs);
  await wait(400);
  await snap('running');
  if (states === 'portrait') { await page.close(); await ctx.close(); return; }
  // stop at a PB (0.68 < 0.71 and < the group's 0.69)
  await page.evaluate((ms) => { window.__fixed = 1000 + ms; }, pbMs);
  await page.evaluate(() => document.getElementById('goBtn').click());
  await wait(700);
  await snap('pb');
  await wait(2600);
  await snap('idle2');
  await page.evaluate(() => document.getElementById('stStrip').click());
  await wait(900);
  await snap('board');
  await page.evaluate(() => document.getElementById('lbCloseBtn').click());
  await wait(400);
  await page.evaluate(() => document.getElementById('stDrill').click());
  await wait(600);
  await snap('sheet');
  await page.close(); await ctx.close();
}

// landscape
await shoot(AFTER, 'phone', 844, 390, 3, { firebase: true });
await shoot(AFTER, 'tv', 1920, 1080, 1, {});
// portrait before/after (solo group so nothing is written to Firebase; 0.00 frozen on the clock)
await shoot(BEFORE, 'portrait-before', 390, 844, 3, { group: '', runningMs: 0, states: 'portrait' });
await shoot(AFTER, 'portrait', 390, 844, 3, { group: '', runningMs: 0, states: 'portrait' });
await browser.close();
let same = true;
for (const n of ['setup', 'empty', 'idle', 'running']) {
  const a = fs.readFileSync(OUT + 'portrait-before-' + n + '.png'), b = fs.readFileSync(OUT + 'portrait-' + n + '.png');
  const eq = a.equals(b); same = same && eq;
  console.log('portrait', n, eq ? 'BYTE-IDENTICAL' : 'DIFFERS', a.length, b.length);
}
console.log(same ? 'PORTRAIT UNCHANGED' : 'PORTRAIT CHANGED — look');
