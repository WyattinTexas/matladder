// CARD-RF: a synthetic run along a real path (route-austin.json: the Lady Bird Lake trail loop) — 1 Hz fixes at given
// mile paces, with phone-like GPS error (a slow 2.5 m drift + a little white noise), one 100 m jump and a few fuzzy
// fixes, the same errors as design/marathon-0923/synthetic-run.mjs puts on its circle.
import fs from 'node:fs';
import { makeRng, MI } from '../marathon-0923/synthetic-run.mjs';
export const AUSTIN = JSON.parse(fs.readFileSync(new URL('./route-austin.json', import.meta.url), 'utf8')).path;
const R = 6371008.8, rad = Math.PI / 180;
const hav = (a, b) => { const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad, s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); };
export function pathLength(path) { let d = 0; for (let i = 1; i < path.length; i++) d += hav(path[i - 1], path[i]); return d; }
export function makeRouteRun({ path = AUSTIN, paces = [520], miles = null, jitter = true, seed = 7, t0 = 0, jump = true, fuzzy = true } = {}) {
  const rng = makeRng(seed), gauss = () => { const u = 1 - rng(), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const cum = [0]; for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + hav(path[i - 1], path[i]));
  const total = miles ? Math.min(cum[cum.length - 1], miles * MI) : cum[cum.length - 1], mPerDegLat = 2 * Math.PI * R / 360;
  const fixes = []; let d = 0, t = 0, seg = 1, i = 0, driftN = 0, driftE = 0;
  const TAU = 120, SIG = 2.5, WHITE = 0.25;
  while (d < total) {
    while (seg < path.length - 1 && cum[seg] < d) seg++;
    const f = Math.max(0, Math.min(1, (d - cum[seg - 1]) / ((cum[seg] - cum[seg - 1]) || 1)));
    const lat = path[seg - 1][0] + f * (path[seg][0] - path[seg - 1][0]), lon = path[seg - 1][1] + f * (path[seg][1] - path[seg - 1][1]);
    if (jitter) { driftN += (-driftN / TAU + SIG * Math.sqrt(2 / TAU) * gauss()); driftE += (-driftE / TAU + SIG * Math.sqrt(2 / TAU) * gauss()); }
    let n = jitter ? driftN + WHITE * gauss() : 0, e = jitter ? driftE + WHITE * gauss() : 0;
    const v = MI / paces[Math.min(paces.length - 1, Math.floor(d / MI))];
    let accuracy = 6 + Math.round(rng() * 4);
    if (jump && i === 1300) n += 100;                              // a 100 m jump, one fix
    if (fuzzy && i > 0 && i % 400 === 0) accuracy = 45;            // a fuzzy fix, dropped
    fixes.push({ latitude: lat + n / mPerDegLat, longitude: lon + e / (mPerDegLat * Math.cos(lat * rad)), accuracy, speed: v, time: t0 + t * 1000 });
    t++; d += v; i++;
  }
  return fixes;
}
