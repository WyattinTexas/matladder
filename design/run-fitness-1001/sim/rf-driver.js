// CARD-RF — the Simulator driver. It is copied into the SIMULATOR build's bundle only (never into www/): it presses the
// app's own buttons on a timeline and prints what the app shows, so sim-run.mjs can take screenshots at the right moments.
// The location comes from `xcrun simctl location … start` (the real CoreLocation → plugin → page path). MODE: 'run' | 'prompt' | 'bg'.
(function () {
  const MODE = '__MODE__';
  // the app's console does not reach the Mac from a Simulator build, so each line also goes into localStorage (rf_log):
  // sim-run.mjs reads that key straight from the simulator's WebKit database on disk
  const LOGKEY = 'rf_log'; try { localStorage.removeItem(LOGKEY); } catch (e) {}
  const log = o => { try { const a = JSON.parse(localStorage.getItem(LOGKEY) || '[]'); a.push(o); localStorage.setItem(LOGKEY, JSON.stringify(a)); } catch (e) {} console.log('RFDRV ' + JSON.stringify(o)); };
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const click = sel => { const e = typeof sel === 'string' ? document.querySelector(sel) : sel; if (e) e.click(); return !!e; };
  // what goes to the phone's own plugins: every speak() and its end, every location watcher added or removed
  try {
    const P = window.Capacitor.Plugins, T = P.TextToSpeech, speak = T.speak.bind(T);
    T.speak = opts => { const t0 = Date.now(); log({ ev: 'speak', text: opts.text }); const r = speak(opts); return r.then(v => { log({ ev: 'spoken', text: opts.text, ms: Date.now() - t0 }); return v; }, e => { log({ ev: 'speak-error', text: opts.text, err: String((e && e.message) || e) }); throw e; }); };
    const G = P.BackgroundGeolocation, add = G.addWatcher.bind(G), rem = G.removeWatcher.bind(G);
    let fixes = 0;
    G.addWatcher = (o, cb) => { const id = add(o, (loc, err) => { if (err) log({ ev: 'watch-error', code: err.code, err: String(err.message || err) }); else if (loc && ++fixes <= 2) log({ ev: 'native-fix', n: fixes, acc: Math.round(loc.accuracy), speed: loc.speed, simulated: loc.simulated }); cb(loc, err); }); log({ ev: 'addWatcher', id: String(id), ask: o.requestPermissions, background: !!o.backgroundMessage, distanceFilter: o.distanceFilter }); return id; };
    G.removeWatcher = o => { log({ ev: 'removeWatcher', id: o.id }); return rem(o); };
  } catch (e) { log({ ev: 'wrap-failed', err: String(e) }); }
  const snap = (ev, extra) => {
    const R = window.Run, E = R.engine(), p = R.pos(), C = window.Capacitor;
    log(Object.assign({ ev, at: new Date().toISOString().slice(11, 19), body: document.body.className, zone: $('runZone').className, map: $('rnMap').className, kind: R.mapKind(), loc: R.locKind(),
      gps: $('rnGpsT').textContent, perm: localStorage.getItem('footwork_run_loc'), clock: $('rnClock').textContent, dist: $('rnDist').textContent, cal: $('rnCal').textContent,
      pace: $('rnPaceNow').textContent, avg: $('rnAvg').textContent, paused: $('rnPausedLbl').textContent,
      pos: p ? [p.latitude.toFixed(5), p.longitude.toFixed(5), Math.round(p.accuracy), p.speed] : null,
      state: E ? E.state : null, splits: E ? E.splits().map(s => Math.round(s.time / 1000)) : null, track: E ? E.track.length : null, rejected: E ? E.rejected : null,
      ann: $('rnAnn').classList.contains('show') ? $('rnAnnSub').textContent + ' ' + $('rnAnnT').textContent : '',
      tiles: R.map() ? R.map().areTilesLoaded() : null, native: !!(C && C.isNativePlatform && C.isNativePlatform()),
      plugins: C ? ['BackgroundGeolocation', 'TextToSpeech', 'KeepAwake'].map(n => C.isPluginAvailable(n)) : null,
      font: getComputedStyle($('rnClock')).fontFamily.slice(0, 24), vw: innerWidth, vh: innerHeight, safeTop: getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom') }, extra || {}));
  };
  const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await wait(200); } return false; };
  window.addEventListener('error', e => log({ ev: 'js-error', msg: e.message, at: (e.filename || '').slice(-30) + ':' + e.lineno }));
  window.addEventListener('load', async () => {
    try {
      await wait(1800);
      if ($('setupView').classList.contains('active')) { $('setupName').value = 'Wyatt'; click('#setupGoBtn'); await wait(900); }
      snap('ladder');                                              // the white drill timer: the edges must be white, the status text dark
      await wait(3500);
      click('.run-chip'); await wait(4000);
      snap('ready-off');
      await wait(3500);
      click('#rnStart'); await wait(900);
      $('rnGoalAsk').value = '4:30'; $('rnWeightAsk').value = '175';
      snap('ask'); await wait(3500);
      click('#rnAskGo'); await wait(1200);
      snap('asked');
      if (MODE === 'prompt') { await wait(4000); snap('prompt-end'); return; }
      await until(() => document.getElementById('rnCount').classList.contains('go'), 30000);
      snap('countdown');
      await until(() => document.body.classList.contains('recording'), 10000);
      await wait(600); snap('recording-start');
      if (MODE === 'bg') {
        // the background test: a line every 5 s for 100 s while sim-run.mjs sends the app to the background and brings it back
        for (let i = 0; i < 20; i++) { await wait(5000); snap('tick', { vis: document.visibilityState }); }
        click('#rnPause'); await wait(600); click('#rnFinish'); await wait(900); click('#rnFinish'); await wait(3000);
        snap('summary', { rec: (() => { const r = window.Run.log()[0] || {}; return { dist: r.dist, time: r.time, route: (r.route || '').length, rt: (r.rt || []).length, gps: r.gps }; })() });
        snap('done'); return;
      }
      // the run: a line every 10 s; the mile moment the instant the first split lands
      let lastTick = Date.now(), mile = false, t0 = Date.now();
      while (Date.now() - t0 < 8 * 60000) {
        const E = window.Run.engine(); if (!E) break;
        if (!mile && E.splits().length >= 1) { mile = true; await wait(700); snap('mile'); await wait(9000); snap('after-mile'); break; }
        if (Date.now() - lastTick >= 10000) { lastTick = Date.now(); snap('tick'); }
        await wait(250);
      }
      await wait(3000);
      click('#rnMap'); await wait(1500); snap('bigmap'); await wait(5000);
      click('#rnMap'); await wait(1500);
      click('#rnPause'); await wait(1200); snap('paused'); await wait(7000);
      click('#rnPause'); await wait(1200); snap('resumed'); await wait(8000);
      snap('before-end');
      click('#rnPause'); await wait(600); click('#rnFinish'); await wait(900); snap('end-armed'); click('#rnFinish'); await wait(3500);
      snap('summary', { sum: { time: $('rnDoneTime').textContent, dist: $('rnDoneDist').textContent, cal: $('rnDoneCal').textContent, avg: $('rnDoneAvg').textContent, best: $('rnDoneBest').textContent, rows: document.querySelectorAll('#rnDoneSplits .r').length, map: getComputedStyle($('rnDoneMap')).display, glIn: !!document.querySelector('#rnDoneMap #rnMapGl'), when: $('rnDoneK').textContent },
        rec: (() => { const r = window.Run.log()[0] || {}; return { dist: r.dist, time: r.time, splits: r.splits, cal: r.cal, route: (r.route || '').length, rt: (r.rt || []).length, gps: r.gps }; })() });
      await wait(6000);
      $('rnDone').scrollTop = $('rnDone').scrollHeight; await wait(1200); snap('summary-2'); await wait(5000);
      click('#rnDoneBack'); await wait(3000); snap('ready'); await wait(5000);
      click('#rnHistBtn'); await wait(1500); snap('history'); await wait(5000);
      click('#rnHistClose'); await wait(800);
      click('#rnOpts'); await wait(1500); snap('settings'); await wait(5000);
      click('#rnSetDone'); await wait(800);
      snap('done');
    } catch (e) { log({ ev: 'driver-error', err: String((e && e.stack) || e) }); }
  });
})();
