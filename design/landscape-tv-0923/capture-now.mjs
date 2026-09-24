import { createRequire } from 'module';
const require = createRequire('/opt/homebrew/lib/node_modules/puppeteer/package.json');
const puppeteer = require('puppeteer');
const OUT = process.env.HOME + '/matladder/design/landscape-tv-0923/stills-now/';
const URL = 'file://' + process.env.HOME + '/matladder/www/index.html';
const sizes = [['landscape', 844, 390, 3], ['tv', 1920, 1080, 1]];
const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
for (const [name, w, h, dpr] of sizes) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: OUT + name + '-1-setup.png' });
  await page.type('#setupName', 'Isaac');
  await page.type('#setupGroup', 'garage-crew');
  await page.evaluate(() => document.getElementById('setupGoBtn').click());
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: OUT + name + '-2-main-empty.png' });
  for (let i = 0; i < 5; i++) { await page.evaluate(() => document.getElementById('goBtn').click()); await new Promise(r => setTimeout(r, 700 + i * 180)); await page.evaluate(() => document.getElementById('goBtn').click()); await new Promise(r => setTimeout(r, 400)); }
  await page.screenshot({ path: OUT + name + '-3-main-runs.png' });
  await page.evaluate(() => document.getElementById('goBtn').click()); await new Promise(r => setTimeout(r, 1300));
  await page.screenshot({ path: OUT + name + '-4-running.png' });
  await page.evaluate(() => document.getElementById('goBtn').click()); await new Promise(r => setTimeout(r, 300));
  const info = await page.evaluate(() => ({ orient: screen.orientation && screen.orientation.type, main: document.getElementById('mainView').getBoundingClientRect().toJSON(), timer: document.getElementById('timerDisplay').getBoundingClientRect().toJSON(), go: document.getElementById('goBtn').getBoundingClientRect().toJSON(), runs: document.querySelectorAll('.run-cell:not(.empty-slot)').length, timerFont: getComputedStyle(document.getElementById('timerDisplay')).fontSize }));
  console.log(name, JSON.stringify(info));
  await page.close();
}
await browser.close();
