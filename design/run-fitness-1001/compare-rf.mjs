// CARD-RF: the ladder timer (portrait) and the Scoreboard (landscape phone / TV) BEFORE the card vs AFTER, byte-compared.
//   node design/run-fitness-1001/compare-rf.mjs [base-commit]      (default base: 051cb8d, the commit before CARD-RF)
// Stills go to a scratch folder (not the repo). GIFs and pulses are frozen so two captures of one file are identical.
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
const require = createRequire('/opt/homebrew/lib/node_modules/puppeteer/package.json');
const puppeteer = require('puppeteer');
const ROOT = process.env.HOME + '/matladder/';
const BASE = process.argv[2] || '051cb8d';
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'rf-compare-')) + '/';
const AFTER = 'file://' + ROOT + 'www/index.html', BEFORE = 'file://' + ROOT + 'www/_before.html';
fs.writeFileSync(ROOT + 'www/_before.html', execSync('git show ' + BASE + ':www/index.html', { cwd: ROOT, maxBuffer: 1 << 26 }));
const wait = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
const PIX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNoaGgAAAKEAYFZ7ahjAAAAAElFTkSuQmCC';
async function freeze(page) { await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' }); await page.evaluate((px) => document.querySelectorAll('img').forEach(i => { if (/\.gif$/i.test(i.getAttribute('src') || '')) i.src = px; }), PIX); await wait(150); }
const RUNS = [710, 900, 1080, 1260, 1430];
async function shoot(url, tag, w, h, dpr, portrait) {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  [pageerror]', tag, e.message));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: 'networkidle2' }).catch(() => {});
  await page.evaluate(() => document.fonts.ready); await wait(600);
  const snap = async (name) => { await freeze(page); await page.screenshot({ path: OUT + tag + '-' + name + '.png' }); };
  await snap('setup');
  await page.type('#setupName', 'Isaac');
  await page.evaluate(() => document.getElementById('setupGoBtn').click()); await wait(900);
  await snap('empty');
  await page.evaluate((runs) => { const now = Date.now(); localStorage.setItem('ladder__solo_2in2out', JSON.stringify(runs.map((t, i) => ({ time: t, name: 'Isaac', date: now - (runs.length - i) * 20000 })).reverse())); }, RUNS);
  await page.reload({ waitUntil: 'networkidle2' }).catch(() => {});
  await page.evaluate(() => document.fonts.ready); await wait(1200);
  await snap('idle');
  await page.evaluate(() => { window.__fixed = 1000; performance.now = () => window.__fixed; });
  await page.evaluate(() => document.getElementById('goBtn').click());
  await page.evaluate(() => { window.__fixed = 1580; }); await wait(400);
  await snap('running');
  if (!portrait) {
    await page.evaluate(() => { window.__fixed = 1680; });
    await page.evaluate(() => document.getElementById('goBtn').click()); await wait(700);
    await snap('pb'); await wait(2700); await snap('idle2');
    await page.evaluate(() => document.getElementById('stDrill').click()); await wait(600); await snap('sheet');
    await page.evaluate(() => document.getElementById('stSheetClose').click()); await wait(300);
  } else {
    // portrait: stop, the session grid, then the extras that existed before the card
    await page.evaluate(() => { window.__fixed = 1680; });
    await page.evaluate(() => document.getElementById('goBtn').click()); await wait(600);
    await snap('stopped');
    await page.evaluate(() => document.querySelector('.warmup-chip').click()); await wait(500); await snap('warmup');
    await page.evaluate(() => document.getElementById('warmupRoutineClose').click()); await wait(300);
    await page.evaluate(() => [...document.querySelectorAll('.drill-chip')].find(c => c.textContent === 'Wall Sits').click()); await wait(500); await snap('wallsits');
    await page.evaluate(() => document.getElementById('wsClose').click()); await wait(300);
    await page.evaluate(() => document.getElementById('lbOpenBtn').click()); await wait(1200); await snap('board');
  }
  await page.close(); await ctx.close();
}
const jobs = [['portrait', 390, 844, 3, true], ['phone', 844, 390, 3, false], ['tv', 1920, 1080, 1, false]];
for (const [tag, w, h, dpr, p] of jobs) { await shoot(BEFORE, 'before-' + tag, w, h, dpr, p); await shoot(AFTER, tag, w, h, dpr, p); }
await browser.close();
fs.unlinkSync(ROOT + 'www/_before.html');
let same = 0, diff = 0;
for (const [tag, , , , p] of jobs) for (const n of (p ? ['setup', 'empty', 'idle', 'running', 'stopped', 'warmup', 'wallsits', 'board'] : ['setup', 'empty', 'idle', 'running', 'pb', 'idle2', 'sheet'])) {
  const A = fs.readFileSync(OUT + 'before-' + tag + '-' + n + '.png'), B = fs.readFileSync(OUT + tag + '-' + n + '.png'), eq = A.equals(B);
  if (eq) same++; else diff++;
  console.log('  ' + (eq ? 'BYTE-IDENTICAL' : 'DIFFERS       '), tag + '-' + n, A.length, B.length);
}
console.log(`\nbase ${BASE}: ${same} identical, ${diff} differ   (stills in ${OUT})`);
