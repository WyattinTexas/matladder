import { createRequire } from 'module';
const require = createRequire('/opt/homebrew/lib/node_modules/puppeteer/package.json');
const puppeteer = require('puppeteer');
const D = process.env.HOME + '/matladder/design/landscape-tv-0923/';
const states = ['idle','running','pb','board','setup'];
const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox','--disable-gpu','--mute-audio'] });
for (const [name,w,h,dpr] of [['phone',844,390,3],['tv',1920,1080,1]]) {
  for (const s of states.concat(['idle&light=1','idle&zones=1'])) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr });
    await page.goto('file://' + D + 'mock-stage.html?s=' + s, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready); await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: D + 'stills/' + name + '-' + s.replace('&','-').replace('=1','') + '.png' });
    await page.close();
  }
}
await browser.close(); console.log('ok');
