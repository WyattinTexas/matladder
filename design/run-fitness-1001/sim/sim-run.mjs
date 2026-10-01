// CARD-RF / RF-2 — the real app in the iOS Simulator on a simulated run (the real CoreLocation → plugin → page path).
//   node design/run-fitness-1001/sim/sim-run.mjs run     [speed m/s, default 6]   → the whole flow: screenshots + clips
//   node design/run-fitness-1001/sim/sim-run.mjs prompt                           → a fresh install up to the phone's own location prompt
//   node design/run-fitness-1001/sim/sim-run.mjs bg                               → a run with 35 s behind another app
//   node design/run-fitness-1001/sim/sim-run.mjs restore                          → the page restarted mid-run, in front and behind another app
// Needs: a booted simulator (UDID in $RF_UDID) with its volume at zero, and a Debug simulator build of ios/App at $RF_APP.
// The driver (rf-driver.js) goes into the SIMULATOR bundle only. The route is route-austin.json fed to `simctl location start`.
// Shots and clips land in $RF_OUT (default: this folder); events-<mode>.json keeps every line the driver wrote.
import fs from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
const ROOT = process.env.HOME + '/matladder/';
const HERE = ROOT + 'design/run-fitness-1001/sim/';
const UDID = process.env.RF_UDID, APP = process.env.RF_APP, OUT = (process.env.RF_OUT || HERE).replace(/\/?$/, '/');
if (!UDID || !APP) { console.error('set RF_UDID and RF_APP'); process.exit(2); }
const MODE = ['prompt', 'bg', 'restore'].includes(process.argv[2]) ? process.argv[2] : 'run', SPEED = +(process.argv[3] || 6), TAG = process.argv[4] || MODE;
const BUNDLE = 'com.corkscrewgames.footwork';
const sim = (...a) => execFileSync('xcrun', ['simctl', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const wait = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
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
  } catch (e) { return null; }                                       // mid-write: try again next round
};
const shot = async (name) => { try { sim('io', UDID, 'screenshot', '--type=png', OUT + 'sim-' + TAG + '-' + name + '.png'); console.log('   [shot] ' + name); } catch (e) { console.log('   [shot failed] ' + name); } };
let rec = null;
const recStart = (name) => { if (rec) return; rec = spawn('xcrun', ['simctl', 'io', UDID, 'recordVideo', '--codec=h264', '--force', OUT + 'sim-' + TAG + '-' + name + '.mp4'], { stdio: 'ignore' }); console.log('   [rec] ' + name); };
const recStop = async () => { if (!rec) return; const p = rec; rec = null; p.kill('SIGINT'); await new Promise(r => { p.on('exit', r); setTimeout(r, 6000); }); console.log('   [rec stopped]'); };
const LINE = ['tick', 'recording-start', 'mile', 'before-end', 'restored-2', 'restored-3', 'front-again', 'arming-background-restart', 'restarting-in-front'];
let seen = 0, done = false, events = [];
const t0 = Date.now(), LIMIT = (MODE === 'run' ? 16 : MODE === 'restore' ? 6 : MODE === 'bg' ? 5 : 2) * 60000;
while (!done && Date.now() - t0 < LIMIT) {
  await wait(300);
  const all = readLog(); if (!all) continue;
  if (all.length < seen) seen = 0;
  for (const o of all.slice(seen)) {
    seen++;
    events.push(o);
    const stamp = ((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's ';
    if (o.ev === 'cmd') {
      if (o.do === 'shot') await shot(o.name);
      else if (o.do === 'rec-start') recStart(o.name);
      else if (o.do === 'rec-stop') await recStop();
      else if (o.do === 'background') { sim('launch', UDID, 'com.apple.mobilesafari'); console.log(stamp + '[Safari in front: FOOTWORK is in the background]'); setTimeout(() => shot('backgrounded'), 5000); }
      else if (o.do === 'foreground') { sim('launch', UDID, BUNDLE); console.log(stamp + '[FOOTWORK in front again]'); }
      continue;
    }
    const brief = LINE.includes(o.ev) ? ` clock ${o.clock} dist ${o.dist} (${o.engDist} m) chips [${o.chips}] pins ${o.pins} gps ${o.gps} loc ${o.loc} state ${o.state} track ${o.track} vis ${o.vis} fit ${o.fit} toast "${o.toast}"`
      : o.text ? ' "' + o.text + '"' + (o.ms ? ' ' + o.ms + ' ms' : '') : o.ev === 'addWatcher' ? ` id ${o.id} ask ${o.ask} background ${o.background}` : o.ev === 'removeWatcher' ? ` id ${o.id}` : (o.err || o.msg ? ' ' + (o.err || o.msg) : '');
    console.log(stamp + o.ev + brief);
    if (o.ev === 'done' || o.ev === 'driver-error') done = true;
  }
}
await recStop();
fs.writeFileSync(HERE + 'events-' + TAG + '.json', JSON.stringify(events.filter(e => e.ev !== 'cmd'), null, 1));
try { sim('location', UDID, 'clear'); } catch (e) {}
try { sim('terminate', UDID, BUNDLE); } catch (e) {}
console.log(done ? 'finished' : 'TIMED OUT', '— events in', 'events-' + TAG + '.json');
