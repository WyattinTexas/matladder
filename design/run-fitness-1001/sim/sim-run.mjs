// CARD-RF — the real app in the iOS Simulator on a simulated run (the real CoreLocation → plugin → page path).
//   node design/run-fitness-1001/sim/sim-run.mjs run [speed m/s, default 6]     → the whole flow, screenshots + two clips
//   node design/run-fitness-1001/sim/sim-run.mjs prompt                          → a fresh install up to the phone's own location prompt
// Needs: a booted simulator (UDID in $RF_UDID) with its volume at zero, and a Debug simulator build of ios/App at $RF_APP.
// The driver (rf-driver.js) goes into the SIMULATOR bundle only. The route is route-austin.json fed to `simctl location start`.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
const ROOT = process.env.HOME + '/matladder/';
const HERE = ROOT + 'design/run-fitness-1001/sim/';
const UDID = process.env.RF_UDID, APP = process.env.RF_APP;
if (!UDID || !APP) { console.error('set RF_UDID and RF_APP'); process.exit(2); }
const MODE = ['prompt', 'bg'].includes(process.argv[2]) ? process.argv[2] : 'run', SPEED = +(process.argv[3] || 6), TAG = process.argv[4] || MODE;
const BUNDLE = 'com.corkscrewgames.footwork';
const sim = (...a) => execFileSync('xcrun', ['simctl', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const wait = ms => new Promise(r => setTimeout(r, ms));
// the bundle's web folder = www/ as it is now + the driver
execFileSync('rsync', ['-a', '--delete', '--exclude', '*.bak', ROOT + 'www/', APP + '/public/']);
fs.writeFileSync(APP + '/public/rf-driver.js', fs.readFileSync(HERE + 'rf-driver.js', 'utf8').replace('__MODE__', MODE));
{ const p = APP + '/public/index.html'; let h = fs.readFileSync(p, 'utf8'); const i = h.lastIndexOf('</body>'); h = h.slice(0, i) + '<script src="rf-driver.js"></script>\n' + h.slice(i); fs.writeFileSync(p, h); }
try { sim('terminate', UDID, BUNDLE); } catch (e) {}
try { sim('uninstall', UDID, BUNDLE); } catch (e) {}
sim('install', UDID, APP);
if (MODE !== 'prompt') sim('privacy', UDID, 'grant', 'location', BUNDLE); else { try { sim('privacy', UDID, 'reset', 'location', BUNDLE); } catch (e) {} }
// the simulated run: the Lady Bird Lake loop at SPEED m/s, a fix every second
const route = JSON.parse(fs.readFileSync(ROOT + 'design/run-fitness-1001/route-austin.json', 'utf8')).path;
try { sim('location', UDID, 'clear'); } catch (e) {}
{ const p = spawn('xcrun', ['simctl', 'location', UDID, 'start', '--speed=' + SPEED, '--interval=1', '-'], { stdio: ['pipe', 'inherit', 'inherit'] }); p.stdin.write(route.map(q => q[0] + ',' + q[1]).join('\n') + '\n'); p.stdin.end(); await new Promise(r => p.on('exit', r)); }
sim('launch', '--terminate-running-process', UDID, BUNDLE);
// the driver's lines: read from the app's own localStorage database (WebKit, inside the simulator's container on this Mac)
const CONTAINER = sim('get_app_container', UDID, BUNDLE, 'data').trim();
const findDb = () => { try { return execFileSync('find', [CONTAINER + '/Library/WebKit', '-name', 'localstorage.sqlite3'], { encoding: 'utf8' }).trim().split('\n')[0] || ''; } catch (e) { return ''; } };
let DB = '';
const readLog = () => {
  if (!DB) { DB = findDb(); if (!DB) return []; }
  try {
    const hex = execFileSync('sqlite3', ['-readonly', DB, "select hex(value) from ItemTable where key='rf_log'"], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (!hex) return [];
    return JSON.parse(Buffer.from(hex, 'hex').toString('utf16le'));
  } catch (e) { return []; }
};
const shot = async (name, delay = 0) => { if (delay) await wait(delay); try { sim('io', UDID, 'screenshot', '--type=png', HERE + 'sim-' + TAG + '-' + name + '.png'); console.log('   [shot] ' + name); } catch (e) { console.log('   [shot failed] ' + name); } };
let rec = null;
const recStart = (name) => { if (rec) return; rec = spawn('xcrun', ['simctl', 'io', UDID, 'recordVideo', '--codec=h264', '--force', HERE + 'sim-' + TAG + '-' + name + '.mp4'], { stdio: 'ignore' }); console.log('   [rec] ' + name); };
const recStop = async () => { if (!rec) return; const p = rec; rec = null; p.kill('SIGINT'); await new Promise(r => { p.on('exit', r); setTimeout(r, 6000); }); console.log('   [rec stopped]'); };
const SHOTS = { ladder: 600, 'ready-off': 300, ask: 300, asked: 2500, countdown: 100, 'recording-start': 500, mile: 0, 'after-mile': 0, bigmap: 300, paused: 300, resumed: 300, 'end-armed': 0, summary: 500, 'summary-2': 300, ready: 500, history: 300, settings: 300, 'prompt-end': 0 };
let seen = 0, done = false, ticks = 0, events = [];
const t0 = Date.now(), LIMIT = (MODE === 'run' ? 14 : MODE === 'bg' ? 5 : 2) * 60000;
while (!done && Date.now() - t0 < LIMIT) {
  await wait(300);
  const all = readLog();
  if (all.length < seen) seen = 0;                                  // the driver cleared its log (a reload)
  for (const o of all.slice(seen)) {
    seen++;
    events.push(o);
    const brief = o.ev === 'tick' ? ` clock ${o.clock} dist ${o.dist} cal ${o.cal} pace ${o.pace} avg ${o.avg} gps ${o.gps} loc ${o.loc} track ${o.track} rej ${o.rejected} vis ${o.vis || ''} pos ${o.pos}` : o.ev === 'tick' || o.ev === 'recording-start' || o.ev === 'mile' || o.ev === 'before-end' ? ` clock ${o.clock} dist ${o.dist} cal ${o.cal} pace ${o.pace} avg ${o.avg} gps ${o.gps} loc ${o.loc} kind ${o.kind} track ${o.track} rej ${o.rejected} pos ${o.pos}` : (o.text ? ' "' + o.text + '"' + (o.ms ? ' ' + o.ms + ' ms' : '') : (o.err || o.msg ? ' ' + (o.err || o.msg) : ''));
    console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's ' + o.ev + brief);
    if (o.ev === 'asked' && MODE === 'run') recStart('start');
    if (o.ev === 'tick' && MODE === 'bg') {
      ticks++;
      // the phone goes to another app for 35 s (Safari), then comes back: the run must keep recording meanwhile
      if (ticks === 3) { sim('launch', UDID, 'com.apple.mobilesafari'); console.log('   [backgrounded: Safari in front]'); setTimeout(() => shot('backgrounded'), 6000); setTimeout(() => { sim('launch', UDID, BUNDLE); console.log('   [foreground again]'); setTimeout(() => shot('foreground-again'), 2500); }, 35000); }
      continue;
    }
    if (o.ev === 'tick') { ticks++; if (ticks === 5) await recStop(); if (rec === null && parseFloat(o.dist) >= 0.88 && !events.some(e => e.ev === 'mile') && !events.some(e => e.ev === 'rec2')) { events.push({ ev: 'rec2' }); recStart('mile'); } }
    if (o.ev === 'tick' && ticks === 3) await shot('running', 200);
    if (o.ev in SHOTS) await shot(o.ev, SHOTS[o.ev]);
    if (o.ev === 'after-mile') await recStop();
    if (o.ev === 'done' || o.ev === 'prompt-end' || o.ev === 'driver-error') done = true;
  }
}
await recStop();
fs.writeFileSync(HERE + 'events-' + TAG + '.json', JSON.stringify(events.filter(e => e.ev !== 'rec2'), null, 1));
try { sim('location', UDID, 'clear'); } catch (e) {}
try { sim('terminate', UDID, BUNDLE); } catch (e) {}
console.log(done ? 'finished' : 'TIMED OUT', '— events in', 'events-' + TAG + '.json');
