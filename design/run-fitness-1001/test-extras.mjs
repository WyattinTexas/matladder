// CARD-RF: PLANK 2:00 / 3:00 + BREATHE ∞ — behaviour checks + stills, on the shipped www/index.html.
//   node design/run-fitness-1001/test-extras.mjs          → asserts + stills/{plank-*,breathe-*,warmup-plank}.png (390×844@3)
// puppeteer from /opt/homebrew, Google Chrome, --mute-audio.
import { createRequire } from 'module';
import fs from 'fs';
import assert from 'node:assert/strict';
const require = createRequire('/opt/homebrew/lib/node_modules/puppeteer/package.json');
const puppeteer = require('puppeteer');
const ROOT = process.env.HOME + '/matladder/';
const OUT = ROOT + 'design/run-fitness-1001/stills/';
fs.mkdirSync(OUT, { recursive: true });
const URL_ = 'file://' + ROOT + 'www/index.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ok   ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };

const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
async function open({ speed = 1 } = {}) {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  page.on('pageerror', e => { fail++; console.log('  [pageerror]', e.message); });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  // a clock the test can push forward (plank = wall clock) and, for the breathing, intervals that run `speed` times faster
  await page.evaluateOnNewDocument((speed) => {
    const real = Date.now.bind(Date); window.__adv = 0; Date.now = () => real() + window.__adv;
    if (speed !== 1) { const si = window.setInterval.bind(window); window.setInterval = (fn, ms, ...a) => si(fn, ms / speed, ...a); }
    window.__wake = []; // record the keep-awake calls
  }, speed);
  await page.goto(URL_, { waitUntil: 'networkidle2' }).catch(() => {});
  await page.evaluate(() => document.fonts.ready); await wait(400);
  await page.type('#setupName', 'Wyatt');
  await page.evaluate(() => document.getElementById('setupGoBtn').click()); await wait(500);
  await page.evaluate(() => { const on = window.fwWake.on, off = window.fwWake.off; window.fwWake.on = t => { window.__wake.push('+' + t); on(t); }; window.fwWake.off = t => { window.__wake.push('-' + t); off(t); }; });
  return { ctx, page };
}
const txt = (page, sel) => page.evaluate(s => document.querySelector(s).textContent.trim(), sel);
const vis = (page, sel) => page.evaluate(s => document.querySelector(s).classList.contains('visible'), sel);
const click = (page, sel) => page.evaluate(s => document.querySelector(s).click(), sel);

// ── PLANK ──
console.log('PLANK');
{
  const { ctx, page } = await open();
  ok(await page.evaluate(() => !!document.querySelector('.drill-chip.plank-chip')), 'the Plank chip is in the picker');
  ok(await page.evaluate(() => { const c = [...document.querySelectorAll('.drill-chip')].map(x => x.textContent); return c.indexOf('Plank') === c.indexOf('Wall Sits') + 1; }), 'it sits beside Wall Sits');
  await click(page, '.plank-chip'); await wait(450);
  ok(await vis(page, '#plOverlay'), 'the chip opens the plank screen');
  ok(await txt(page, '#plTimer') === '2:00', 'default hold 2:00');
  ok(await page.evaluate(() => [...document.querySelectorAll('#plPicks button')].map(b => b.textContent).join(' ') === '2:00 3:00'), 'two pills: 2:00 and 3:00');
  await page.screenshot({ path: OUT + 'plank-ready.png' });
  await click(page, '#plPicks button[data-s="180"]'); await wait(150);
  ok(await txt(page, '#plTimer') === '3:00', '3:00 pill → the clock reads 3:00');
  ok(await page.evaluate(() => localStorage.getItem('footwork_plank_secs') === '180'), 'the pick is remembered');
  await page.screenshot({ path: OUT + 'plank-3min.png' });
  await click(page, '#plGo'); await wait(350);
  ok(await page.evaluate(() => document.getElementById('plGo').style.display === 'none' && document.getElementById('plCancel').style.display === ''), 'GO → STOP shows');
  ok(await page.evaluate(() => document.getElementById('plPicks').classList.contains('locked')), 'the pills lock during the hold');
  ok((await page.evaluate(() => window.__wake)).includes('+plank'), 'the screen is kept awake');
  await page.evaluate(() => { window.__adv = 47000; }); await wait(450);
  ok(await txt(page, '#plTimer') === '2:13', '47 s in → 2:13 (' + await txt(page, '#plTimer') + ')');
  await page.screenshot({ path: OUT + 'plank-hold.png' });
  await page.evaluate(() => { window.__adv = 90200; }); await wait(450);
  ok(await txt(page, '#plHint') === 'Halfway — keep that line!', 'halfway line at 1:30');
  await page.evaluate(() => { window.__adv = 170200; }); await wait(450);
  ok(await txt(page, '#plHint') === 'Ten seconds — finish strong!', 'ten-second line');
  // STOP resets to the picker without closing
  await click(page, '#plCancel'); await wait(200);
  ok(await vis(page, '#plOverlay') && await txt(page, '#plTimer') === '3:00', 'STOP → back to the picker, clock reset');
  ok((await page.evaluate(() => window.__wake)).includes('-plank'), 'the wake lock is let go on STOP');
  // a full 2:00 hold to the end
  await click(page, '#plPicks button[data-s="120"]'); await wait(100);
  await page.evaluate(() => { window.__adv = 0; });
  await click(page, '#plGo'); await wait(300);
  await page.evaluate(() => { window.__adv = 118300; }); await wait(450);
  ok(await txt(page, '#plTimer') === '0:02', 'two seconds left (' + await txt(page, '#plTimer') + ')');
  await page.evaluate(() => { window.__adv = 120500; }); await wait(500);
  ok(await txt(page, '#plTimer') === '0:00' && await txt(page, '#plHint') === 'DONE — nice work!', 'the hold ends at 0:00 with DONE');
  await page.screenshot({ path: OUT + 'plank-done.png' });
  await wait(1700);
  ok(!(await vis(page, '#plOverlay')), 'the screen closes itself');
  ok((await txt(page, '#toast')).startsWith('PLANK complete — 2:00'), 'the toast names the hold');
  // reopen → the remembered pick
  await click(page, '.plank-chip'); await wait(300);
  ok(await txt(page, '#plTimer') === '2:00', 'reopens on the last pick');
  await click(page, '#plClose'); await wait(200);
  // the Warm Up's plank step: 0:30 default + the pills
  await click(page, '.warmup-chip'); await wait(300);
  for (let i = 0; i < 5; i++) { await click(page, '#warmupRoutineSkip'); await wait(60); }
  ok(await txt(page, '#warmupRoutineLabel') === 'PLANK' && await txt(page, '#warmupRoutineTimer') === '0:30', 'Warm Up plank step still opens at 0:30');
  ok(await page.evaluate(() => [...document.querySelectorAll('#warmupRoutinePicks button')].map(b => b.textContent).join(' ') === '0:30 2:00 3:00'), 'Warm Up plank pills 0:30 · 2:00 · 3:00');
  await click(page, '#warmupRoutinePicks button[data-s="120"]'); await wait(100);
  ok(await txt(page, '#warmupRoutineTimer') === '2:00', 'Warm Up plank → 2:00');
  await page.screenshot({ path: OUT + 'warmup-plank.png' });
  await click(page, '#warmupRoutinePicks button[data-s="30"]'); await wait(100);
  await click(page, '#warmupRoutineClose');
  // step 1 (jumping jacks) has no pills
  await click(page, '.warmup-chip'); await wait(200);
  ok(await page.evaluate(() => document.getElementById('warmupRoutinePicks').style.display === 'none'), 'no pills on the other Warm Up steps');
  await click(page, '#warmupRoutineClose');
  await page.close(); await ctx.close();
}

// ── BREATHE ∞ ──
console.log('BREATHE ∞');
{
  const { ctx, page } = await open({ speed: 40 });   // a 1 s tick every 25 ms → a round in 0.4 s
  await click(page, '.breathe-chip'); await wait(400);
  ok(await vis(page, '#bbOverlay'), 'Breathe opens');
  ok(await txt(page, '#bbRoundOf') === '10', 'the label reads "/ 10" (was "/ 4")');
  ok(await page.evaluate(() => !!document.getElementById('bbInfBtn') && document.getElementById('bbInfBtn').textContent === '∞'), 'the ∞ button is there');
  // the 10 rounds still end on their own
  await click(page, '#bbStartBtn'); await wait(10 * 16 * 25 + 900);
  ok(await txt(page, '#bbPhase') === 'Complete', 'without ∞: 10 rounds, then Complete');
  // one tap on ∞ starts it and it never stops
  await click(page, '#bbInfBtn'); await wait(120);
  ok(await page.evaluate(() => document.getElementById('bbInfBtn').classList.contains('on')), '∞ lights');
  ok(await txt(page, '#bbStartBtn') === 'Pause', 'one tap on ∞ starts the breathing');
  ok(await txt(page, '#bbRoundOf') === '∞', 'the label reads "/ ∞"');
  await wait(12 * 16 * 25 + 600);
  const r1 = +(await txt(page, '#bbRound'));
  ok(r1 > 10 && await txt(page, '#bbStartBtn') === 'Pause', 'still playing past round 10 (round ' + r1 + ')');
  ok((await page.evaluate(() => window.__wake)).filter(x => x === '+breathe').length >= 2, 'the screen is kept awake while it plays');
  // pause / resume keep the mode
  await click(page, '#bbStartBtn'); await wait(100);
  ok(await txt(page, '#bbStartBtn') === 'Resume' && await txt(page, '#bbRoundOf') === '∞', 'Pause holds the ∞ mode');
  await click(page, '#bbInfBtn'); await wait(100);       // ∞ off while paused → back to 10 rounds, stays paused
  ok(await txt(page, '#bbRoundOf') === '10' && await txt(page, '#bbStartBtn') === 'Resume', 'second tap on ∞ → back to 10 rounds');
  await click(page, '#bbInfBtn'); await wait(100);       // ∞ on while paused → resumes
  ok(await txt(page, '#bbStartBtn') === 'Pause' && await txt(page, '#bbRoundOf') === '∞', '∞ while paused resumes it');
  // ∞ off past round 10 → completes at the end of the round in hand
  await click(page, '#bbInfBtn'); await wait(16 * 25 + 500);
  ok(await txt(page, '#bbPhase') === 'Complete', '∞ off past round 10 → the round in hand finishes it');
  // Reset + close let the wake lock go; reopening is back on 10 rounds
  await click(page, '#bbInfBtn'); await wait(150);
  await click(page, '#bbClose'); await wait(200);
  const w = await page.evaluate(() => window.__wake);
  ok(w[w.length - 1] === '-breathe', 'closing lets the screen sleep again');
  await click(page, '.breathe-chip'); await wait(300);
  ok(await txt(page, '#bbRoundOf') === '10' && await txt(page, '#bbStartBtn') === 'Start', 'reopens on 10 rounds, not playing');
  await page.close(); await ctx.close();
}
// stills at real speed
{
  const { ctx, page } = await open();
  await click(page, '.breathe-chip'); await wait(500);
  await page.screenshot({ path: OUT + 'breathe-ready.png' });
  await click(page, '#bbInfBtn'); await wait(6300);
  await page.screenshot({ path: OUT + 'breathe-endless.png' });
  await page.close(); await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
