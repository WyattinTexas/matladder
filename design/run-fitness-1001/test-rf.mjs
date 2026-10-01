// CARD-RF: node --test design/run-fitness-1001/test-rf.mjs — the run engine sliced out of the shipped www/index.html
// (the RUN-ENGINE-BEGIN/END markers), so what is tested is what ships. The split math of CARD-RUN keeps its own kit
// (design/marathon-0923/test-run-engine.mjs); this one covers what CARD-RF adds: the voice line, calories, the route.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeLoop, MI } from '../marathon-0923/synthetic-run.mjs';
import { makeRouteRun, pathLength, AUSTIN } from './route-run.mjs';
const html = fs.readFileSync(new URL('../../www/index.html', import.meta.url), 'utf8');
const src = html.slice(html.indexOf('// RUN-ENGINE-BEGIN'), html.indexOf('// RUN-ENGINE-END'));
const { makeRunEngine, runVoiceLine, runSayClock, runCalories, runEncodePolyline, runDecodePolyline, runPublicRec, runHaversine } =
  new Function(src + '\nreturn { makeRunEngine, runVoiceLine, runSayClock, runCalories, runEncodePolyline, runDecodePolyline, runPublicRec, runHaversine };')();

function drive(fixes, opts = {}) {
  let clock = fixes[0].time;
  const E = makeRunEngine({ now: () => clock, ...opts });
  E.start();
  for (const f of fixes) { clock = f.time; E.onFix(f); E.tick(clock); }
  return E;
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);
const clean = { jitter: false, jump: false, fuzzy: false, cold: false };
const KG = 160 * 0.45359237;

test('the voice says the mile, the pace, the average and the time', () => {
  const all = [{ n: 1, time: 511000, cum: 511000 }, { n: 2, time: 525000, cum: 1036000 }, { n: 3, time: 522000, cum: 1558000 }];
  assert.equal(runVoiceLine(all[0], all, 'mi', 0), 'Mile one. Pace, eight thirty-one.');
  assert.equal(runVoiceLine(all[2], all, 'mi', 0), 'Mile three. Pace, eight forty-two. Average pace, eight thirty-nine. Time, twenty-five fifty-eight.');
  const best = [{ n: 1, time: 511000, cum: 511000 }, { n: 2, time: 485000, cum: 996000 }];
  assert.equal(runVoiceLine(best[1], best, 'mi', 0), 'Mile two. Pace, eight oh five. Average pace, eight eighteen. Time, sixteen thirty-six. Your fastest mile.');
  assert.equal(runVoiceLine(all[2], all, 'mi', 520000), 'Mile three. Pace, eight forty-two. Average pace, eight thirty-nine. Time, twenty-five fifty-eight. On pace.');
  assert.equal(runVoiceLine(all[1], all, 'mi', 500000), 'Mile two. Pace, eight forty-five. Average pace, eight thirty-eight. Time, seventeen sixteen. Twenty-five seconds behind pace.');
  assert.equal(runVoiceLine(all[0], all, 'mi', 540000), 'Mile one. Pace, eight thirty-one. Twenty-nine seconds ahead of pace.');
  assert.equal(runVoiceLine({ n: 21, time: 300000, cum: 6300000 }, [{ n: 20, time: 300000, cum: 6000000 }], 'km', 0), 'Kilometer twenty-one. Pace, five flat. Average pace, five flat. Time, one hour forty-five minutes.');
  // every line says the word "pace" and, past the first, the time
  for (const s of all) assert.match(runVoiceLine(s, all, 'mi', 0), /Pace, /);
});

test('the time, spoken: under an hour as minutes and seconds, then hours and minutes', () => {
  assert.equal(runSayClock(1557000), 'twenty-five fifty-seven');
  assert.equal(runSayClock(3600000), 'one hour');
  assert.equal(runSayClock(3731000), 'one hour two minutes');
  assert.equal(runSayClock(7260000), 'two hours one minute');
  assert.equal(runSayClock(45000), 'forty-five seconds');
});

test('calories: a 5-mile run at 8:40 for 160 lb ≈ 1.0 kcal per kg per km, total adds the resting burn', () => {
  const E = drive(makeLoop({ paces: [520, 520, 520, 520, 520], extraMiles: 0, ...clean }));
  E.finish();
  const c = runCalories(E.track, KG, E.elapsed());
  near(c.active, KG * E.dist * 0.001, 0.5, 'active = kg × m × 0.001 at running speed');
  near(c.active, 584, 8, 'about 584 active kcal for 5 miles at 160 lb');
  near(c.total - c.active, KG * 0.0175 * (E.elapsed() / 60000), 0.01, 'resting part = 3.5 ml/kg/min for the active time');
  near(c.total, 584 + 55, 10, 'about 639 total');
});

test('calories: walking costs half per metre, and the blend between is smooth', () => {
  const walk = [{ t: 0, d: 0 }], jog = [{ t: 0, d: 0 }], run = [{ t: 0, d: 0 }];
  for (let i = 1; i <= 100; i++) { walk.push({ t: i * 10000, d: i * 14 }); jog.push({ t: i * 10000, d: i * 20 }); run.push({ t: i * 10000, d: i * 31 }); }   // 1.4 · 2.0 · 3.1 m/s
  near(runCalories(walk, 70, 0).active, 70 * 1400 * 0.0005, 1e-6, 'a walk: 0.5 kcal per kg per km');
  near(runCalories(jog, 70, 0).active, 70 * 2000 * 0.00075, 1e-6, 'halfway between: 0.75');
  near(runCalories(run, 70, 0).active, 70 * 3100 * 0.001, 1e-6, 'a run: 1.0');
  assert.equal(runCalories([], 70, 0).active, 0);
  assert.equal(runCalories([{ t: 0, d: 0 }], 70, 60000).active, 0);
  // a zero-length step (the gap point a manual resume leaves) and a zero-time step add nothing and do not divide by zero
  const odd = [{ t: 0, d: 0 }, { t: 5000, d: 15 }, { t: 5000, d: 15, g: 1 }, { t: 5000, d: 30 }, { t: 10000, d: 45 }];
  assert.ok(Number.isFinite(runCalories(odd, 70, 10000).active));
});

test('calories pause with the clock: an auto-pause adds no active calories and no resting time', () => {
  const run = makeLoop({ paces: [520], ...clean }).slice(0, 121);     // 2 min of running
  let clock = run[0].time;
  const E = makeRunEngine({ now: () => clock }); E.start();
  for (const f of run) { clock = f.time; E.onFix(f); E.tick(clock); }
  const before = runCalories(E.track, KG, E.elapsed(clock));
  const still = run[120];
  for (let i = 1; i <= 120; i++) { clock = still.time + i * 1000; E.onFix({ latitude: still.latitude, longitude: still.longitude, accuracy: 7, speed: 0, time: clock }); E.tick(clock); }
  assert.equal(E.state, 'paused');
  const after = runCalories(E.track, KG, E.elapsed(clock));
  near(after.active, before.active, 0.01, 'standing still burns no active calories');
  near(after.total, before.total, 0.6, 'and the resting part stops with the clock');
});

test('the polyline: the published test vector, and a round trip of a real route within a metre', () => {
  assert.equal(runEncodePolyline([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]), '_p~iF~ps|U_ulLnnqC_mqNvxq`@');
  assert.deepEqual(runDecodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@'), [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]);
  const E = drive(makeLoop({ paces: [520, 520], extraMiles: 0.1 }));
  E.finish();
  const pts = E.track.map(p => [p.la, p.lo]);
  const back = runDecodePolyline(runEncodePolyline(pts));
  assert.equal(back.length, pts.length);
  let worst = 0;
  back.forEach((p, i) => { worst = Math.max(worst, runHaversine({ latitude: p[0], longitude: p[1] }, { latitude: pts[i][0], longitude: pts[i][1] })); });
  assert.ok(worst < 1, 'every point within a metre: ' + worst.toFixed(3));
  assert.equal(runEncodePolyline([]), '');
  assert.deepEqual(runDecodePolyline(''), []);
  // southern + eastern hemispheres (negative latitudes, positive longitudes)
  const syd = [[-33.86882, 151.20929], [-33.86901, 151.21012], [-33.87, 151.2099]];
  assert.deepEqual(runDecodePolyline(runEncodePolyline(syd)), syd);
});

test('the route: every track point carries its place, the line follows the fixes, the length agrees with the distance', () => {
  const fixes = makeLoop({ paces: [520, 520, 520], extraMiles: 0.05 });
  const E = drive(fixes);
  E.finish();
  assert.ok(E.track.length > 300, 'a point every 15 m or so: ' + E.track.length);
  for (const p of E.track) { assert.equal(typeof p.la, 'number'); assert.equal(typeof p.lo, 'number'); }
  let len = 0;
  for (let i = 1; i < E.track.length; i++) len += runHaversine({ latitude: E.track[i - 1].la, longitude: E.track[i - 1].lo }, { latitude: E.track[i].la, longitude: E.track[i].lo });
  near(len, E.dist, 0.01, 'the drawn line is as long as the run');
  // the junk cold fixes (500 m off) and the 100 m jump are not on the line
  const lat0 = 30.2672, mPerDeg = 2 * Math.PI * 6371008.8 / 360;
  for (const p of E.track) assert.ok(Math.abs(p.la - lat0) * mPerDeg < 1700, 'no stray point');
  near(E.dist, 3.05 * MI, 3.05 * MI * 0.003, 'and the distance is still right');
});

test('a manual pause leaves a break in the route where the run picks up again, and adds no distance', () => {
  const run = makeLoop({ paces: [520], ...clean }).slice(0, 61);
  let clock = run[0].time;
  const E = makeRunEngine({ now: () => clock }); E.start();
  for (const f of run) { clock = f.time; E.onFix(f); }
  E.pause(false);
  const d0 = E.dist, n0 = E.track.length, last = run[60];
  for (let i = 1; i <= 30; i++) { clock = last.time + i * 1000; E.onFix({ latitude: last.latitude + i * 1.4 / 111132, longitude: last.longitude, accuracy: 7, speed: 1.4, time: clock }); }
  E.resume();
  assert.equal(E.dist, d0);
  assert.equal(E.track.length, n0 + 1, 'one break point');
  const g = E.track[n0];
  assert.equal(g.g, 1); assert.equal(g.d, d0);
  near(g.la, last.latitude + 30 * 1.4 / 111132, 1e-9, 'the break sits where the run resumes');
  // an auto-pause leaves no break
  const E2 = makeRunEngine({ now: () => clock }); clock = run[0].time; E2.start();
  for (const f of run) { clock = f.time; E2.onFix(f); E2.tick(clock); }
  const s = run[60];
  for (let i = 1; i <= 20; i++) { clock = s.time + i * 1000; E2.onFix({ latitude: s.latitude, longitude: s.longitude, accuracy: 7, speed: 0, time: clock }); E2.tick(clock); }
  assert.equal(E2.state, 'paused');
  for (let i = 1; i <= 10; i++) { clock = s.time + 20000 + i * 1000; E2.onFix({ latitude: s.latitude + i * 3.1 / 111132, longitude: s.longitude, accuracy: 7, speed: 3.1, time: clock }); E2.tick(clock); }
  assert.equal(E2.state, 'running');
  assert.ok(!E2.track.some(p => p.g), 'no break after an auto-pause');
});

test('what goes to the group: the old fields only — no route, no route times, no calories, no weight', () => {
  const rec = { ts: 1, date: 1, name: 'Wyatt', dist: 8046, time: 2600000, avg: 520000, bestMile: 511000, splits: [511000, 525000], splitsKm: [320000], gps: true,
                route: '_p~iF~ps|U', rt: [0, 5, 5], cal: 584, calTotal: 639, kg: 72.6, start: 123, paused: 4000 };
  const pub = runPublicRec(rec);
  assert.deepEqual(Object.keys(pub).sort(), ['avg', 'bestMile', 'date', 'dist', 'gps', 'name', 'splits', 'splitsKm', 'time', 'ts']);
  for (const k of ['route', 'rt', 'cal', 'calTotal', 'kg', 'start', 'paused']) assert.ok(!(k in pub), k + ' stays on the phone');
  assert.ok(!JSON.stringify(pub).includes('_p~iF'), 'no coordinates in what is sent');
  assert.deepEqual(runPublicRec({ ts: 2, name: 'x' }), { ts: 2, name: 'x' });
});

test('no fixes is not standing still: location off never pauses the clock; a GPS gap keeps the clock and the distance catches up', () => {
  // timer only (the UI passes pauseAfter: Infinity when location is off)
  let clock = 1_800_000_000_000;
  const T = makeRunEngine({ now: () => clock, pauseAfter: Infinity }); T.start();
  for (let i = 1; i <= 65; i++) { clock += 1000; T.tick(clock); }
  assert.equal(T.state, 'running'); near(T.elapsed(clock), 65000, 1, 'the timer-only clock runs on');
  // auto-pause on, but not one fix: silence is not standing still
  const S = makeRunEngine({ now: () => clock }); S.start();
  const s0 = clock;
  for (let i = 1; i <= 65; i++) { clock += 1000; S.tick(clock); }
  assert.equal(S.state, 'running'); near(S.elapsed(clock), clock - s0, 1, 'no fix at all: still running');
  // a 40 s GPS gap in the middle of a run
  const run = makeLoop({ paces: [520], ...clean });
  clock = run[0].time;
  const E = makeRunEngine({ now: () => clock }); E.start();
  for (let i = 0; i < 120; i++) { clock = run[i].time; E.onFix(run[i]); E.tick(clock); }
  for (let i = 120; i < 160; i++) { clock = run[i].time; E.tick(clock); assert.equal(E.state, 'running', 'never paused in the gap (second ' + (i - 120) + ')'); }
  for (let i = 160; i < 300; i++) { clock = run[i].time; E.onFix(run[i]); E.tick(clock); }
  assert.equal(E.state, 'running');
  near(E.elapsed(clock), run[299].time - run[0].time, 1, 'the clock kept the 40 s');
  near(E.dist, 299 * MI / 520, 16, 'the distance caught up across the gap (to within the 15 m step in hand)');
  // standing still with fixes arriving still auto-pauses (the old rule holds) …
  const still = run[299];
  for (let i = 1; i <= 15; i++) { clock = still.time + i * 1000; E.onFix({ latitude: still.latitude, longitude: still.longitude, accuracy: 7, speed: 0, time: clock }); E.tick(clock); }
  assert.equal(E.state, 'paused'); assert.equal(E.autoPaused, true);
  // … unless auto-pause is switched off mid-run (location refused while recording)
  const F = makeRunEngine({ now: () => clock }); clock = run[0].time; F.start();
  for (let i = 0; i < 60; i++) { clock = run[i].time; F.onFix(run[i]); F.tick(clock); }
  F.auto = false;
  for (let i = 1; i <= 30; i++) { clock = run[59].time + i * 1000; F.onFix({ latitude: run[59].latitude, longitude: run[59].longitude, accuracy: 7, speed: 0, time: clock }); F.tick(clock); }
  assert.equal(F.state, 'running');
});

test('a winding trail (the Lady Bird Lake loop, 606 way points): the anchors follow the bends — within 1 % of a perfect GPS, clean or noisy', () => {
  const paces = [511, 525, 522, 520, 524, 518];
  const clean = makeRouteRun({ paces, jitter: false, jump: false, fuzzy: false });
  // the reference is what a perfect 1 Hz GPS measures: the sum of the clean fix-to-fix steps, and the mile crossings on it
  // (the way's own zigzags smaller than a stride-second are below what any GPS can see)
  let ref = 0, k = 1, lastT = 0; const refSplits = [];
  for (let i = 1; i < clean.length; i++) {
    const step = runHaversine(clean[i - 1], clean[i]);
    while (ref + step >= k * MI) { const t = (i - 1 + (k * MI - ref) / step) * 1000; refSplits.push(t - lastT); lastT = t; k++; }
    ref += step;
  }
  near(ref / pathLength(AUSTIN), 1, 0.01, 'the reference is the path itself to 1 %');
  for (const [name, fixes] of [['clean', clean], ['GPS-like', makeRouteRun({ paces })], ['GPS-like, another sky', makeRouteRun({ paces, seed: 23 })]]) {
    const E = drive(fixes); E.finish();
    const err = E.dist / ref - 1;
    assert.ok(Math.abs(err) < 0.01, name + ': ' + (err * 100).toFixed(2) + ' %');
    const s = E.splits();
    assert.equal(s.length, 5, name + ': five full miles in 5.6');
    s.forEach((x, i) => near(x.time, refSplits[i], 8000, name + ' mile ' + x.n));
    assert.equal(E.state, 'done'); assert.equal(E.pausedMs, 0, name + ': never auto-paused on the move');
  }
  // straight 15 m steps alone cut the corners: about 2 % short on this trail — the bend rule is what holds the distance
  const E0 = drive(clean, { bend: Infinity }); E0.finish();
  assert.ok(E0.dist / ref < 0.985, 'without the bend rule: ' + ((E0.dist / ref - 1) * 100).toFixed(2) + ' %');
});

test('standing still for five minutes (auto-pause off) adds next to nothing; nor does it with the bend rule', () => {
  let s = 7; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }, g = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const still = []; let dn = 0, de = 0;
  for (let i = 0; i < 300; i++) {                     // a 2.5 m slow drift + 0.5 m of white noise, speed ~0
    dn += -dn / 120 + 2.5 * Math.sqrt(2 / 120) * g(); de += -de / 120 + 2.5 * Math.sqrt(2 / 120) * g();
    still.push({ latitude: 30.26 + (dn + 0.5 * g()) / 111320, longitude: -97.75 + (de + 0.5 * g()) / 96000, accuracy: 8, speed: 0.1, time: 1_800_000_000_000 + i * 1000 });
  }
  const E = drive(still, { pauseAfter: Infinity }); E.finish();
  assert.ok(E.dist < 10, 'five minutes on the spot: ' + E.dist.toFixed(1) + ' m');
  // with auto-pause on it pauses within seconds and counts nothing after
  const P = drive(still);
  assert.equal(P.state, 'paused'); assert.ok(P.dist < 4, 'auto-paused: ' + P.dist.toFixed(1) + ' m');
});
