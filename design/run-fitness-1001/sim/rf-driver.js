// CARD-RF / RF-2 — the Simulator driver. It is copied into the SIMULATOR build's bundle only (never into www/): it presses
// the app's own buttons on a timeline and writes what the app shows, so sim-run.mjs can take screenshots and clips at
// the right moments. The location comes from `xcrun simctl location … start` (the real CoreLocation → plugin → page
// path). MODE: 'run' (the whole flow) | 'prompt' (a fresh install up to the phone's own prompt) | 'bg' (35 s behind
// another app) | 'restore' (the page restarted mid-run: once in front, once in the background) | 'lock' (the run on the
// lock screen and in the Dynamic Island: the Live Activity) | 'stale' (the card allowed, the island opened, then the app
// is killed mid-run: the card says so after three minutes, and the run comes back when FOOTWORK is opened) | 'island'
// (a quick look at the Dynamic Island, shut and open).
(function () {
  const MODE = '__MODE__';
  // The app's console does not reach the Mac from a Simulator build, so each line goes into localStorage (rf_log):
  // sim-run.mjs reads that key straight from the simulator's WebKit database on disk. rf_phase survives a page restart.
  const LOGKEY = 'rf_log', PHASE = +(localStorage.getItem('rf_phase') || 1);
  if (PHASE === 1) { try { localStorage.removeItem(LOGKEY); } catch (e) {} }
  const log = o => { try { const a = JSON.parse(localStorage.getItem(LOGKEY) || '[]'); a.push(o); localStorage.setItem(LOGKEY, JSON.stringify(a)); } catch (e) {} };
  const cmd = (what, name) => log({ ev: 'cmd', do: what, name: name || '' });       // 'shot' | 'rec-start' | 'rec-stop' | 'background' | 'foreground' | 'home' | 'lock' (name: awake | dim | unlocked) | 'tap' (name: "x,y" or "x,y,hold ms", the phone's points) | 'kill' (name: seconds to stay dead) | 'after' (the home screen, the lock screen, a shot)
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const click = sel => { const e = typeof sel === 'string' ? document.querySelector(sel) : sel; if (e) e.click(); return !!e; };
  // what goes to the phone's own plugins: every speak() and its end, every location watcher added or removed
  try {
    const P = window.Capacitor.Plugins, T = P.TextToSpeech, speak = T.speak.bind(T);
    T.speak = opts => { const t0 = Date.now(); log({ ev: 'speak', text: opts.text }); const r = speak(opts); return r.then(v => { log({ ev: 'spoken', text: opts.text, ms: Date.now() - t0 }); return v; }, e => { log({ ev: 'speak-error', text: opts.text, err: String((e && e.message) || e) }); throw e; }); };
    const G = P.BackgroundGeolocation, add = G.addWatcher.bind(G), rem = G.removeWatcher.bind(G);
    let fixes = 0;
    G.addWatcher = (o, cb) => { const id = add(o, (loc, err) => { if (err) log({ ev: 'watch-error', code: err.code, err: String(err.message || err) }); else if (loc && ++fixes <= 2) log({ ev: 'native-fix', n: fixes, acc: Math.round(loc.accuracy), speed: loc.speed, vis: document.visibilityState }); cb(loc, err); }); log({ ev: 'addWatcher', id: String(id), ask: o.requestPermissions, background: !!o.backgroundMessage, distanceFilter: o.distanceFilter }); return id; };
    G.removeWatcher = o => { log({ ev: 'removeWatcher', id: o.id }); return rem(o); };
  } catch (e) { log({ ev: 'wrap-failed', err: String(e) }); }
  // what goes to the lock screen card (the Live Activity), and what the phone answers
  try {
    const L = window.Capacitor.Plugins.RunActivity;
    for (const verb of ['start', 'update', 'end']) {
      const f = L[verb].bind(L);
      L[verb] = a => { const r = f(a); a = a || {}; const line = { ev: 'la', verb, elapsed: a.elapsed, distance: a.distance, pace: a.pace, split: a.splitLabel, last: a.lastSplit, status: a.status, resume: !!a.resume, vis: document.visibilityState };
        r.then(o => log(Object.assign(line, { on: o && o.on, why: o && o.why, kept: o && o.kept })), e => log({ ev: 'la-error', verb, err: String((e && e.message) || e) })); return r; };
    }
  } catch (e) { log({ ev: 'la-wrap-failed', err: String(e) }); }
  const snap = (ev, extra) => {
    const R = window.Run, E = R.engine(), p = R.pos(), C = window.Capacitor, S = R.sum();
    log(Object.assign({ ev, at: new Date().toISOString().slice(11, 19), vis: document.visibilityState, body: document.body.className, zone: $('runZone').className, kind: R.mapKind(), loc: R.locKind(),
      gps: $('rnGpsT').textContent, perm: localStorage.getItem('footwork_run_loc'), clock: $('rnClock').textContent, dist: $('rnDist').textContent, cal: $('rnCal').textContent,
      pace: $('rnPaceNow').textContent, avg: $('rnAvg').textContent, paused: $('rnPausedLbl').textContent, chips: [...document.querySelectorAll('#rnSplits .rn-chip')].map(c => c.textContent).join(' '),
      pins: document.querySelectorAll('.rn-mile').length, pos: p ? [p.latitude.toFixed(5), p.longitude.toFixed(5), Math.round(p.accuracy)] : null,
      state: E ? E.state : null, splits: E ? E.splits().map(s => Math.round(s.time / 1000)) : null, track: E ? E.track.length : null, rejected: E ? E.rejected : null, engDist: E ? Math.round(E.dist) : null,
      ann: $('rnAnn').classList.contains('show') ? $('rnAnnSub').textContent + ' ' + $('rnAnnT').textContent : '', toast: $('toast').classList.contains('show') ? $('toast').textContent : '',
      live: (localStorage.getItem('footwork_run_live') || '').length, wids: localStorage.getItem('footwork_run_wids') || '', sum: S ? { where: S.where, sel: S.sel } : null,
      fit: (() => { try { const s = $('rnSplits').getBoundingClientRect(), b = document.querySelector('#rnPause i').getBoundingClientRect(); return [Math.round(s.bottom), Math.round(b.top), Math.round($('rnMap').getBoundingClientRect().height), innerHeight]; } catch (e) { return null; } })(),
      native: !!(C && C.isNativePlatform && C.isNativePlatform()) }, extra || {}));
  };
  const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await wait(200); } return false; };
  const recInfo = () => { const r = window.Run.log()[0] || {}; return { dist: r.dist, time: r.time, splits: r.splits, cal: r.cal, route: (r.route || '').length, rp: (r.rp || '').length, gps: r.gps, runs: window.Run.log().length }; };
  const end = async () => { if (window.Run.engine() && window.Run.engine().state === 'running') { click('#rnPause'); await wait(700); } click('#rnFinish'); await wait(900); click('#rnFinish'); await wait(3500); };
  const begin = async () => {                                       // from a fresh install to a recording run
    if ($('setupView').classList.contains('active')) { $('setupName').value = 'Wyatt'; click('#setupGoBtn'); await wait(900); }
    snap('ladder'); cmd('shot', 'ladder'); await wait(3000);
    click('.run-chip'); await wait(4000);
    snap('ready-off'); cmd('shot', 'ready-off'); await wait(2500);
    click('#rnStart'); await wait(900);
    $('rnGoalAsk').value = '5:40'; $('rnWeightAsk').value = '175';
    snap('ask'); cmd('shot', 'ask'); await wait(2500);
    click('#rnAskGo'); await wait(1200);
    snap('asked');
  };
  window.addEventListener('error', e => log({ ev: 'js-error', msg: e.message, at: (e.filename || '').slice(-30) + ':' + e.lineno }));
  window.addEventListener('load', async () => {
    try {
      await wait(1800);
      // ── FOOTWORK was killed mid-run and opened again three minutes later (MODE stale, phase 2) ──
      if (PHASE >= 2 && MODE === 'stale') {
        snap('recovered'); await wait(1500); cmd('shot', 'recovered'); await wait(2500);        // the run is back, paused where it was saved
        cmd('home'); await wait(4000); cmd('lock', 'awake'); await wait(7000); snap('tick'); cmd('shot', 'locked-recovered'); await wait(3000);   // and so is its card
        cmd('foreground'); await wait(8000);
        click('#rnPause'); await wait(6000); snap('resumed');
        await end();
        snap('summary', { rec: recInfo() }); cmd('shot', 'summary'); await wait(3000);
        localStorage.removeItem('rf_phase'); cmd('after', 'locked-after'); snap('done'); return;
      }
      // ── the page was restarted mid-run (MODE restore, phases 2 and 3) ──
      if (PHASE >= 2) {
        snap('restored-' + PHASE); await wait(1500); cmd('shot', 'restored-' + PHASE);
        for (let i = 0; i < 6; i++) { await wait(5000); snap('tick'); }
        if (PHASE === 2) {
          // now the same while FOOTWORK is behind another app: the reload is set for 9 s from now, the app goes back first
          localStorage.setItem('rf_phase', '3'); window.Run.liveSave(true);
          snap('arming-background-restart'); cmd('background');
          setTimeout(() => location.reload(), 9000);
          return;
        }
        cmd('foreground'); await wait(4000); snap('front-again'); cmd('shot', 'front-again');
        for (let i = 0; i < 3; i++) { await wait(5000); snap('tick'); }
        await end();
        snap('summary', { rec: recInfo() }); cmd('shot', 'summary'); await wait(2500);
        localStorage.removeItem('rf_phase'); snap('done'); return;
      }
      await begin();
      if (MODE === 'prompt') { cmd('shot', 'asked'); await wait(4000); snap('prompt-end'); cmd('shot', 'prompt-end'); snap('done'); return; }
      cmd('rec-start', 'start');
      await until(() => document.getElementById('rnCount').classList.contains('go'), 30000);
      snap('countdown'); cmd('shot', 'countdown');
      await until(() => document.body.classList.contains('recording'), 10000);
      await wait(600); snap('recording-start');
      if (MODE === 'bg') {
        for (let i = 0; i < 20; i++) { await wait(5000); snap('tick'); if (i === 2) cmd('background'); if (i === 9) cmd('foreground'); }
        cmd('rec-stop'); await end();
        snap('summary', { rec: recInfo() }); snap('done'); return;
      }
      if (MODE === 'island') {
        // ── a quick look at the Dynamic Island, shut and open (MODE island) ──
        cmd('rec-stop');
        for (let i = 0; i < 3; i++) { await wait(5000); snap('tick'); }
        cmd('home'); await wait(6000); snap('tick'); cmd('shot', 'island'); await wait(2500);
        cmd('tap', '201,32,1100'); await wait(2600); cmd('shot', 'island-open'); cmd('shot', 'island-open-2'); cmd('shot', 'island-open-3'); await wait(7000);   // three in a row: one of them falls between two updates (the phone blurs a number while it changes)
        cmd('foreground'); await wait(8000);
        await end();
        snap('summary', { rec: recInfo() }); snap('done'); return;
      }
      if (MODE === 'stale') {
        cmd('rec-stop');
        for (let i = 0; i < 3; i++) { await wait(5000); snap('tick'); }
        cmd('home'); await wait(6000);
        cmd('tap', '201,32,1100'); await wait(3000); cmd('shot', 'island-open'); await wait(5000);     // a press held on the island opens it
        cmd('lock', 'awake'); await wait(7000);
        cmd('tap', '289,709'); await wait(4500);                                                       // the phone's one-time question: Allow
        snap('tick'); cmd('shot', 'allowed'); await wait(2500);
        cmd('rec-start', 'allowed'); await wait(13000); cmd('rec-stop'); await wait(3000);
        click('#rnPause'); await wait(5000); snap('paused'); cmd('shot', 'allowed-paused'); await wait(2500);
        click('#rnPause'); await wait(6000); snap('resumed');
        localStorage.setItem('rf_phase', '2'); window.Run.liveSave(true); snap('before-kill'); await wait(600);
        cmd('kill', '200');                                                                            // sim-run.mjs: kill, wait, the lock screen's shot, open FOOTWORK again
        return;
      }
      if (MODE === 'lock') {
        // ── the run on the lock screen (MODE lock): the island, the phone's one-time question, the card running, the
        //    always-on screen, paused, a mile, the end. sim-run.mjs runs the commands one after another, in this order.
        cmd('rec-stop');
        for (let i = 0; i < 4; i++) { await wait(5000); snap('tick'); }
        cmd('shot', 'app'); await wait(2500);                               // FOOTWORK in front: the run is on the screen, the island is empty
        cmd('home'); await wait(7000); snap('tick'); cmd('shot', 'island'); await wait(3000);   // behind the home screen: the island carries the run
        cmd('tap', '201,32,1100'); await wait(3500); cmd('shot', 'island-open'); await wait(6000);   // a press held on the island opens it
        cmd('lock', 'awake'); await wait(10000); cmd('shot', 'locked-first'); await wait(2500); // the first time: the phone's own question under the card
        cmd('tap', '289,709'); await wait(5000);                                                // Allow
        cmd('lock', 'awake'); await wait(8000); snap('tick'); cmd('shot', 'locked'); await wait(2500);
        cmd('rec-start', 'locked'); await wait(14000); cmd('rec-stop'); await wait(3500);       // the clocks tick on the lock screen
        cmd('lock', 'dim'); await wait(9000); cmd('shot', 'locked-dim'); await wait(3000);      // the always-on screen
        cmd('lock', 'awake'); await wait(10000);
        click('#rnPause'); await wait(9000); snap('paused'); cmd('shot', 'locked-paused'); await wait(7000);
        click('#rnPause'); await wait(5000); snap('resumed');
        const got = await until(() => { const E = window.Run.engine(); return E && E.splits().length >= 1; }, 8 * 60000);
        await wait(9000); snap('mile', { got });
        cmd('lock', 'awake'); await wait(9000); cmd('shot', 'locked-mile'); await wait(2500);
        cmd('rec-start', 'locked-mile'); await wait(12000); cmd('rec-stop'); await wait(3500);
        cmd('foreground'); await wait(10000); snap('front-again'); cmd('shot', 'front-again'); await wait(2500);
        await end();
        snap('summary', { rec: recInfo() }); cmd('shot', 'summary'); await wait(3000);
        cmd('after', 'locked-after'); snap('done'); return;                 // the run is over: the card is gone (sim-run.mjs locks the phone and takes the shot: with no run recording, iOS puts this page to sleep behind the lock)
      }
      if (MODE === 'restore') {
        for (let i = 0; i < 6; i++) { await wait(5000); snap('tick'); }
        cmd('rec-stop');
        localStorage.setItem('rf_phase', '2'); window.Run.liveSave(true);
        snap('restarting-in-front'); await wait(300);
        location.reload();
        return;
      }
      // ── the whole run (MODE run): to the first mile, the map view, pause, end, the summary, the route view, All runs ──
      let lastTick = Date.now(), ticks = 0, t0 = Date.now(), rec2 = false;
      while (Date.now() - t0 < 8 * 60000) {
        const E = window.Run.engine(); if (!E) break;
        if (E.splits().length >= 1) { await wait(700); snap('mile'); cmd('shot', 'mile'); await wait(9000); snap('after-mile'); cmd('shot', 'after-mile'); cmd('rec-stop'); break; }
        if (Date.now() - lastTick >= 10000) {
          lastTick = Date.now(); ticks++; snap('tick');
          if (ticks === 3) cmd('shot', 'running');
          if (ticks === 5) cmd('rec-stop');
          if (!rec2 && E.dist >= 0.88 * 1609.344) { rec2 = true; cmd('rec-start', 'mile'); }
        }
        await wait(250);
      }
      await wait(2500);
      click('#rnMap'); await wait(1500); snap('bigmap'); cmd('shot', 'bigmap'); await wait(3500);
      click('#rnMap'); await wait(1500);
      click('#rnPause'); await wait(1200); snap('paused'); cmd('shot', 'paused'); await wait(5000);
      click('#rnPause'); await wait(1200); snap('resumed'); await wait(7000);
      snap('before-end');
      click('#rnPause'); await wait(600); click('#rnFinish'); await wait(900); snap('end-armed'); cmd('shot', 'end-armed'); click('#rnFinish'); await wait(3500);
      snap('summary', { rec: recInfo(), sumPins: document.querySelectorAll('#rnDoneMap .rn-mile').length, rows: [...document.querySelectorAll('#rnDoneSplits .r')].map(r => r.textContent.replace(/\s+/g, ' ').trim()) });
      cmd('shot', 'summary'); await wait(4000);
      // the route view: tap the first split → that mile lit; All; the last stretch; close
      cmd('rec-start', 'route');
      await wait(1500);
      click('#rnDoneSplits .r'); await wait(3500);
      snap('route-split', { show: $('rnRoute').classList.contains('show'), glIn: !!document.querySelector('#rnRouteMap #rnMapGl'), lit: document.querySelectorAll('#rnRouteMap .rn-mile.on').length, label: $('rnRouteL').textContent, pan: window.Run.map() ? window.Run.map().dragPan.isEnabled() : null });
      cmd('shot', 'route-split'); await wait(2500);
      click('#rnRouteStrip .rn-chip[data-k="-1"]'); await wait(3000);
      snap('route-all', { label: $('rnRouteL').textContent }); cmd('shot', 'route-all'); await wait(2000);
      const part = document.querySelector('#rnRouteStrip .rn-chip[data-k="1"]'); if (part) { part.click(); await wait(3000); snap('route-part', { label: $('rnRouteL').textContent }); }
      click('#rnRouteX'); await wait(2000);
      cmd('rec-stop');
      snap('route-closed', { glBack: !!document.querySelector('#rnDoneMap #rnMapGl') });
      $('rnDone').scrollTop = $('rnDone').scrollHeight; await wait(1200); snap('summary-2'); cmd('shot', 'summary-2'); await wait(2500);
      click('#rnDoneBack'); await wait(3000); snap('ready'); cmd('shot', 'ready'); await wait(2500);
      click('#rnHistBtn'); await wait(1500);
      snap('history', { sp: (document.querySelector('.rn-hist-row .sp') || {}).textContent, thumb: !!document.querySelector('.rn-hist-row canvas') }); cmd('shot', 'history'); await wait(3000);
      click('#rnHistClose'); await wait(800);
      snap('done');
    } catch (e) { log({ ev: 'driver-error', err: String((e && e.stack) || e) }); }
  });
})();
