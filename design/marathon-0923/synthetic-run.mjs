// A synthetic run for the engine test and the stills: a loop around a point in Austin at given mile paces, 1 Hz fixes,
// with iOS-like jitter (a slow drift + a little white noise), two cold-start fixes, a 100 m GPS jump, a few fuzzy fixes.
export const MI = 1609.344;
export function makeRng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function makeLoop({ paces = [520, 520, 520, 520, 520], extraMiles = 0, jitter = true, seed = 7, t0 = 1_800_000_000_000, cold = true, jump = true, fuzzy = true, lat0 = 30.2672, lon0 = -97.7431 } = {}) {
  const rng = makeRng(seed), gauss = () => { const u = 1 - rng(), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const total = (paces.length + extraMiles) * MI, r = total / (2 * Math.PI), mPerDegLat = 2 * Math.PI * 6371008.8 / 360, mPerDegLon = mPerDegLat * Math.cos(lat0 * Math.PI / 180);
  const fixes = []; let t = 0, d = 0, i = 0, driftN = 0, driftE = 0;
  const TAU = 120, SIG = 2.5, WHITE = 0.25;
  const push = (north, east, extra = {}) => fixes.push({ latitude: lat0 + north / mPerDegLat, longitude: lon0 + east / mPerDegLon, accuracy: extra.accuracy ?? (6 + Math.round(rng() * 4)), speed: extra.speed ?? null, time: t0 + t * 1000 });
  if (cold) { push(500, 300, { accuracy: 8 }); t++; push(498, 302, { accuracy: 8 }); t++; }
  const speedAt = dist => MI / paces[Math.min(paces.length - 1, Math.floor(dist / MI))];
  while (d < total) {
    const v = speedAt(d), a = d / r, north = r * Math.sin(a), east = r * (1 - Math.cos(a));
    if (jitter) { driftN += (-driftN / TAU + SIG * Math.sqrt(2 / TAU) * gauss()); driftE += (-driftE / TAU + SIG * Math.sqrt(2 / TAU) * gauss()); }
    const jn = jitter ? driftN + WHITE * gauss() : 0, je = jitter ? driftE + WHITE * gauss() : 0;
    const extra = { speed: v };
    if (jump && i === 1300) { push(north + jn + 100, east + je, { ...extra, accuracy: 7 }); t++; d += v; i++; continue; }   // a 100 m jump, one fix
    if (fuzzy && i > 0 && i % 400 === 0) extra.accuracy = 45;                                                             // a fuzzy fix, dropped
    push(north + jn, east + je, extra);
    t++; d += v; i++;
  }
  return fixes;
}
