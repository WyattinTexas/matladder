// CARD-RUN: node --test design/marathon-0923/test-run-engine.mjs — the split engine sliced out of the shipped www/index.html
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeLoop, MI } from './synthetic-run.mjs';
const html = fs.readFileSync(new URL('../../www/index.html', import.meta.url), 'utf8');
const src = html.slice(html.indexOf('// RUN-ENGINE-BEGIN'), html.indexOf('// RUN-ENGINE-END'));
const { makeRunEngine, runVoiceLine, RUN_MI, RUN_KM } = new Function(src + '\nreturn { makeRunEngine, runVoiceLine, runHaversine, RUN_MI, RUN_KM };')();

function drive(fixes, opts = {}) {
  let clock = fixes[0].time;
  const E = makeRunEngine({ now: () => clock, ...opts });
  E.start();
  for (const f of fixes) { clock = f.time; E.onFix(f); E.tick(clock); }
  return E;
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);

test('5-mile loop at 8:40 with GPS-like jitter → 5 splits within the drift (2.5 s), cold fixes ignored, the 100 m jump rejected', () => {
  const fixes = makeLoop({ paces: [520, 520, 520, 520, 520], extraMiles: 0.05, jitter: true });
  const E = drive(fixes);
  const s = E.splits();
  assert.equal(s.length, 5, 'five mile splits');
  // A mile boundary cannot be placed better than the GPS drift: this jitter drifts 2.5 m (σ, τ 120 s), ≈ 0.8 s at 8:40 per
  // boundary, so each split is asked to land within 2.5 s; the clean loop (next test) proves the math itself to 60 ms.
  // The two junk cold fixes cost mile 1 their two seconds (the clock starts at START, the distance at the first trusted fix).
  near(s[0].time, 522000, 2500, 'mile 1 split (+2 s of junk cold fixes)');
  s.slice(1).forEach(x => near(x.time, 520000, 2500, `mile ${x.n} split`));
  near(s.reduce((a, x) => a + x.time, 0), 5 * 520000 + 2000, 6000, 'the five miles together');
  E.finish();
  assert.ok(Math.abs(E.dist / (5.05 * MI) - 1) < 0.003, 'total distance within 0.25 %: ' + ((E.dist / (5.05 * MI) - 1) * 100).toFixed(3) + ' %');
  assert.ok(E.rejected >= 1, 'the jump (and the fuzzy fixes) were rejected: ' + E.rejected);
    // cold start: the first two fixes (500 m away) never counted — the track starts at 0 and the first 30 s cover < 150 m
  assert.equal(E.track[0].d, 0);
  const early = E.track.filter(p => p.t <= 32000).pop();
  assert.ok(early && early.d < 150, 'first 30 s: ' + (early && early.d));
  assert.equal(E.state, 'done');
});

test('interpolated crossings are exact on a clean loop', () => {
  const E = drive(makeLoop({ paces: [520, 520, 520, 520, 520], extraMiles: 0.05, jitter: false, jump: false, fuzzy: false, cold: false }));
  const s = E.splits();
  assert.equal(s.length, 5);
  s.forEach(x => near(x.time, 520000, 60, `mile ${x.n} split`));
});

test('a 100 m jump is rejected and adds no distance', () => {
  const fixes = makeLoop({ paces: [520], jitter: false, jump: false, fuzzy: false, cold: false }).slice(0, 120);
  const E = drive(fixes);
  const d0 = E.dist, r0 = E.rejected;
  const last = fixes[fixes.length - 1];
  E.onFix({ latitude: last.latitude + 100 / 111132, longitude: last.longitude, accuracy: 6, speed: 3.1, time: last.time + 1000 });
  assert.equal(E.rejected, r0 + 1);
  assert.equal(E.dist, d0);
});

test('accuracy > 30 m is dropped', () => {
  const fixes = makeLoop({ paces: [520], jitter: false, jump: false, fuzzy: false, cold: false }).slice(0, 60);
  const E = drive(fixes);
  const d0 = E.dist, last = fixes[59];
  E.onFix({ latitude: last.latitude + 0.001, longitude: last.longitude, accuracy: 48, speed: 3.1, time: last.time + 1000 });
  assert.equal(E.dist, d0);
});

test('auto-pause after 10 s standing still, back-dated; auto-resume on movement; paused time excluded', () => {
  const run = makeLoop({ paces: [520], jitter: false, jump: false, fuzzy: false, cold: false });
  const first = run.slice(0, 61);                       // 60 s of running
  let clock = first[0].time;
  const E = makeRunEngine({ now: () => clock }); E.start();
  for (const f of first) { clock = f.time; E.onFix(f); E.tick(clock); }
  const still = first[60];
  const t1 = still.time;
  for (let i = 1; i <= 40; i++) {                        // 40 s standing still (0.3 m wobble, speed 0)
    clock = t1 + i * 1000;
    E.onFix({ latitude: still.latitude + (i % 2 ? 0.3 : -0.3) / 111132, longitude: still.longitude, accuracy: 7, speed: 0, time: clock });
    E.tick(clock);
    if (i === 12) { assert.equal(E.state, 'paused'); assert.equal(E.autoPaused, true); }
  }
  assert.equal(E.state, 'paused');
  near(E.elapsed(clock), 60000, 2500, 'elapsed frozen at the stop');
  // move again at 3.1 m/s along the same heading
  let k = 0, resumedAt = null;
  for (let i = 1; i <= 30; i++) {
    clock = t1 + 40000 + i * 1000; k += 3.1;
    E.onFix({ latitude: still.latitude + k / 111132, longitude: still.longitude, accuracy: 7, speed: 3.1, time: clock });
    E.tick(clock);
    if (E.state === 'running' && resumedAt == null) resumedAt = i;
  }
  assert.equal(E.state, 'running');
  assert.ok(resumedAt != null && resumedAt <= 4, 'resumed within a few fixes: ' + resumedAt);
  near(E.elapsed(clock), 60000 + (30 - resumedAt + 1) * 1000, 3000, 'elapsed = run + resumed movement');
  assert.ok(E.pausedMs >= 38000, 'paused time counted: ' + E.pausedMs);
});

test('a manual pause: walking during it adds no distance', () => {
  const run = makeLoop({ paces: [520], jitter: false, jump: false, fuzzy: false, cold: false }).slice(0, 61);
  let clock = run[0].time;
  const E = makeRunEngine({ now: () => clock }); E.start();
  for (const f of run) { clock = f.time; E.onFix(f); }
  E.pause(false);
  const d0 = E.dist, last = run[60];
  for (let i = 1; i <= 30; i++) { clock = last.time + i * 1000; E.onFix({ latitude: last.latitude + i * 1.4 / 111132, longitude: last.longitude, accuracy: 7, speed: 1.4, time: clock }); }
  assert.equal(E.dist, d0);
  E.resume();
  for (let i = 31; i <= 40; i++) { clock = last.time + i * 1000; E.onFix({ latitude: last.latitude + (30 * 1.4 + (i - 30) * 3.1) / 111132, longitude: last.longitude, accuracy: 7, speed: 3.1, time: clock }); }
  near(E.dist - d0, 10 * 3.1, 16, 'only the running after resume counts');
  near(E.elapsed(clock), 70000, 1500, 'elapsed excludes the pause');
});

test('the voice: the fitness-app line, exactly the doc example', () => {
  const all = [{ n: 1, time: 511000, cum: 511000 }, { n: 2, time: 525000, cum: 1036000 }, { n: 3, time: 522000, cum: 1558000 }];
  assert.equal(runVoiceLine(all[2], all, 'mi', 0), 'Mile three. Eight forty-two. Average pace eight thirty-nine. Eleven seconds off your best mile.');
  assert.equal(runVoiceLine(all[0], all, 'mi', 0), 'Mile one. Eight thirty-one.');
  const best = [{ n: 1, time: 511000, cum: 511000 }, { n: 2, time: 485000, cum: 996000 }];
  assert.equal(runVoiceLine(best[1], best, 'mi', 0), 'Mile two. Eight oh five. Average pace eight eighteen. Your best mile.');
  const surge = [{ n: 1, time: 500000, cum: 500000 }, { n: 2, time: 540000, cum: 1040000 }, { n: 3, time: 525000, cum: 1565000 }];
  assert.equal(runVoiceLine(surge[2], surge, 'mi', 0), 'Mile three. Eight forty-five. Average pace eight forty-two. Fifteen seconds faster than last mile.');
  assert.equal(runVoiceLine(all[2], all, 'mi', 520000), 'Mile three. Eight forty-two. Average pace eight thirty-nine. Eleven seconds off your best mile. On pace.');
  assert.equal(runVoiceLine(all[1], all, 'mi', 500000), 'Mile two. Eight forty-five. Average pace eight thirty-eight. Fourteen seconds off your best mile. Twenty-five seconds behind pace.');
  assert.equal(runVoiceLine({ n: 21, time: 300000, cum: 6300000 }, [{ n: 20, time: 300000, cum: 6000000 }], 'km', 0), 'Kilometer twenty-one. Five flat. Average pace five flat. Your best kilometer.');
});

test('KM mode: the same track gives 8 km splits for 5 miles, no re-announcing', () => {
  const E = drive(makeLoop({ paces: [520, 520, 520, 520, 520], extraMiles: 0.05, jitter: false, jump: false, fuzzy: false, cold: false }));
  const announced = E.announced;
  assert.equal(announced, 5);
  E.setUnit('km');
  const s = E.splits();
  assert.equal(s.length, 8);
  s.forEach(x => near(x.time, 520000 * RUN_KM / RUN_MI, 60, `km ${x.n}`));
  assert.equal(E.announced, 8, 'counts already-passed km as announced');
  assert.equal(RUN_MI, 1609.344);
});

test('pace now over the last 200 m and the average pace', () => {
  const E = drive(makeLoop({ paces: [520, 480], jitter: false, jump: false, fuzzy: false, cold: false }));
  near(E.paceNow(), 480000, 6000, 'pace now on mile 2');
  near(E.avgPace(), (520000 + 480000) / 2, 3000, 'avg pace');
});
