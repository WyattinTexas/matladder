import { createRequire } from 'module';
const require = createRequire('/opt/homebrew/lib/node_modules/puppeteer/package.json');
const puppeteer = require('puppeteer');
const D = process.env.HOME + '/matladder/design/marathon-0923/';
const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox','--disable-gpu','--mute-audio'] });
for (const s of ['run','mile','ask','done']) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
  await page.goto('file://' + D + 'mock-run.html?s=' + s, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready); await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: D + 'stills/run-' + s + '.png' }); await page.close();
}
await browser.close(); console.log('ok');
