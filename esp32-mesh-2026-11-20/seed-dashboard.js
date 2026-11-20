/* Cognitum Seed — live RuView dashboard (presence, movement, breathing, heart rate, air quality)
 *
 * How to use: open http://169.254.42.1/guide in Chrome (Seed on USB), open DevTools → Console,
 * paste this whole file, press Enter. It replaces the page with the dashboard and polls the
 * Seed's cog logs every 2 s. Reload the page to get the guide back.
 *
 * Auth: uses window.SEED_TOKEN, else localStorage.seedToken, else asks once (stored locally).
 */
(function () {
  const TOKEN = window.SEED_TOKEN || localStorage.getItem('seedToken') ||
    (function () { const t = prompt('Seed pairing token'); if (t) localStorage.setItem('seedToken', t); return t; })();
  const POLL_MS = 2000, KEEP_S = 600; // keep 10 minutes of history
  const H = { pf: new Map(), hm: new Map(), aq: new Map() }; // timestamp -> record
  const COL = { n1: '#4f8cff', n2: '#f59e0b', n3: '#10b981', br: '#e11d48', hm: '#9ca3af', hr: '#a855f7', th: '#ef4444' };
  let test = null; // breathing test state

  document.title = 'Seed — RuView live';
  document.head.innerHTML = '<meta charset="utf-8"><title>Seed — RuView live</title>';
  document.body.removeAttribute('class'); document.body.removeAttribute('style');
  document.body.innerHTML = `
<style>
  :root{--bg:#0b0f17;--card:#121826;--t1:#e5e7eb;--t2:#9ca3af;--line:#1f2937}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--t1);font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}
  header{display:flex;align-items:center;gap:16px;padding:14px 20px;border-bottom:1px solid var(--line)}
  header h1{font-size:17px;margin:0;font-weight:600} #conn{font-size:12px;color:var(--t2)}
  main{display:grid;grid-template-columns:repeat(12,1fr);gap:14px;padding:16px 20px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}
  .card h2{font-size:13px;margin:0 0 8px;color:var(--t2);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
  .big{font-size:34px;font-weight:700} .sub{color:var(--t2);font-size:12px}
  .s3{grid-column:span 3}.s4{grid-column:span 4}.s6{grid-column:span 6}.s8{grid-column:span 8}.s12{grid-column:span 12}
  canvas{width:100%;height:190px;display:block}
  .pill{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
  .on{background:#14532d;color:#86efac}.off{background:#1f2937;color:#9ca3af}.warn{background:#713f12;color:#fde68a}
  .legend span{margin-right:12px;font-size:12px;color:var(--t2)} .legend i{display:inline-block;width:10px;height:3px;margin-right:4px;vertical-align:middle}
  button{background:#2563eb;color:#fff;border:0;border-radius:6px;padding:8px 14px;font-weight:600;cursor:pointer}
  button:disabled{background:#374151;cursor:default} input{background:#0b0f17;color:var(--t1);border:1px solid var(--line);border-radius:6px;padding:7px;width:80px}
  table{border-collapse:collapse;width:100%;font-size:13px} td{padding:4px 6px;border-bottom:1px solid var(--line)} td:first-child{color:var(--t2)}
</style>
<header><h1>Cognitum Seed · RuView live</h1><span id="conn">connecting…</span></header>
<main>
  <div class="card s3"><h2>Presence</h2><div id="pres" class="big">—</div><div id="presSub" class="sub"></div></div>
  <div class="card s3"><h2>Breathing (presence-field)</h2><div id="br" class="big">—</div><div id="brSub" class="sub"></div></div>
  <div class="card s3"><h2>Heart rate (health-monitor)</h2><div id="hr" class="big">—</div><div class="sub"><span class="pill warn">unreliable · 1 s window</span></div></div>
  <div class="card s3"><h2>Air quality</h2><div id="aq" class="big">—</div><div id="aqSub" class="sub"></div></div>

  <div class="card s8"><h2>Movement / presence per node <span class="sub">(× empty-room floor; red = threshold)</span></h2>
    <div class="legend"><span><i style="background:${COL.n1}"></i>node 1</span><span><i style="background:${COL.n2}"></i>node 2</span><span><i style="background:${COL.n3}"></i>node 3 (C6)</span></div>
    <canvas id="cMove"></canvas></div>
  <div class="card s4"><h2>Breathing test</h2>
    <div class="sub" style="margin-bottom:8px">Sit still ~1 m from a board. Press start, count your breaths for 60 s, then enter your count.</div>
    <button id="tBtn">Start 60 s test</button> <span id="tState" class="sub"></span>
    <div style="margin-top:10px">Your count: <input id="tCount" type="number" min="0" max="60"> <button id="tCmp" disabled>Compare</button></div>
    <table style="margin-top:10px"><tbody id="tRes"></tbody></table></div>

  <div class="card s6"><h2>Breathing rate (bpm)</h2>
    <div class="legend"><span><i style="background:${COL.br}"></i>presence-field (dot size = SNR)</span><span><i style="background:${COL.hm}"></i>health-monitor (unreliable)</span></div>
    <canvas id="cBr"></canvas></div>
  <div class="card s6"><h2>Heart rate (bpm) — experimental</h2>
    <div class="legend"><span><i style="background:${COL.hr}"></i>health-monitor</span></div>
    <canvas id="cHr"></canvas></div>
</main>`;

  const $ = id => document.getElementById(id);

  async function logs(id) {
    const r = await fetch('/api/v1/apps/' + id + '/logs', { headers: { Authorization: 'Bearer ' + TOKEN }, cache: 'no-store' });
    if (!r.ok) throw new Error(id + ' HTTP ' + r.status);
    const j = await r.json();
    return (j.output || []).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
  }
  function ingest(map, rows) {
    rows.forEach(r => { if (r.timestamp) map.set(r.timestamp, r); });
    const cut = Date.now() / 1000 - KEEP_S;
    for (const k of map.keys()) if (k < cut) map.delete(k);
  }
  const sorted = m => [...m.values()].sort((a, b) => a.timestamp - b.timestamp);
  const last = m => { const s = sorted(m); return s[s.length - 1]; };

  function chart(cv, series, opt) {
    const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const L = 34, R = 8, T = 8, B = 18, now = Date.now() / 1000, t0 = now - (opt.span || 300);
    const all = series.flatMap(s => s.pts.map(p => p[1])).concat(opt.hline != null ? [opt.hline] : []);
    let lo = opt.min != null ? opt.min : Math.min(...all, 0), hi = opt.max != null ? opt.max : Math.max(...all, 1);
    if (opt.maxAuto) hi = Math.max(hi, opt.maxAuto);
    const X = t => L + (t - t0) / (now - t0) * (w - L - R), Y = v => T + (1 - (v - lo) / (hi - lo || 1)) * (h - T - B);
    g.strokeStyle = '#1f2937'; g.fillStyle = '#6b7280'; g.font = '10px system-ui'; g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4, y = Y(v); g.beginPath(); g.moveTo(L, y); g.lineTo(w - R, y); g.stroke(); g.fillText(v.toFixed(v < 10 ? 1 : 0), 2, y + 3); }
    g.fillText('-' + Math.round((opt.span || 300) / 60) + ' min', L, h - 4); g.fillText('now', w - R - 18, h - 4);
    if (opt.hline != null) { g.strokeStyle = COL.th; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(L, Y(opt.hline)); g.lineTo(w - R, Y(opt.hline)); g.stroke(); g.setLineDash([]); }
    if (opt.band) { g.fillStyle = 'rgba(37,99,235,.12)'; g.fillRect(X(opt.band[0]), T, X(opt.band[1]) - X(opt.band[0]), h - T - B); }
    series.forEach(s => {
      const pts = s.pts.filter(p => p[0] >= t0); if (!pts.length) return;
      g.strokeStyle = s.c; g.lineWidth = 1.6; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke();
      if (s.dots) { g.fillStyle = s.c; pts.forEach(p => { g.beginPath(); g.arc(X(p[0]), Y(p[1]), Math.min(5, 1 + (p[2] || 0) / 2), 0, 7); g.fill(); }); }
    });
  }

  function render() {
    const pf = sorted(H.pf), hm = sorted(H.hm), p = last(H.pf), m = last(H.hm), a = last(H.aq);
    if (p) {
      $('pres').innerHTML = p.presence_detected ? '<span class="pill on" style="font-size:22px">PRESENT</span>' : '<span class="pill off" style="font-size:22px">empty</span>';
      $('presSub').textContent = `${p.nodes_over_thresh}/${p.nodes} nodes over ${p.threshold}× · quorum ${p.quorum} · score ${p.score.toFixed(1)} · ${p.method}`;
      $('br').textContent = p.breathing_bpm ? p.breathing_bpm.toFixed(1) + ' bpm' : '—';
      $('brSub').textContent = 'SNR ' + (p.breathing_snr || 0).toFixed(1) + (p.breathing_snr >= 4 ? ' · usable' : ' · weak signal');
    }
    if (m) $('hr').textContent = m.heart_rate_bpm.toFixed(0) + ' bpm';
    if (a) { $('aq').textContent = 'AQI ' + a.aqi.toFixed(0); $('aqSub').innerHTML = `${a.aqi_category} · CO₂ ${a.co2_proxy.toFixed(0)} ppm · PM2.5 ${a.pm25_proxy.toFixed(1)} <span class="pill warn">simulated — no sensor</span>`; }
    const node = k => pf.map(r => [r.timestamp, (r.per_node_ratio || {})[k] || 0]);
    chart($('cMove'), [{ c: COL.n1, pts: node('node1') }, { c: COL.n2, pts: node('node2') }, { c: COL.n3, pts: node('node3') }], { hline: pf.length ? pf[pf.length - 1].threshold : 4, min: 0, maxAuto: 8 });
    chart($('cBr'), [
      { c: COL.br, dots: true, pts: pf.filter(r => r.breathing_bpm > 0).map(r => [r.timestamp, r.breathing_bpm, r.breathing_snr]) },
      { c: COL.hm, pts: hm.map(r => [r.timestamp, r.breathing_bpm]) }], { min: 0, max: 40, band: test && [test.t0, test.t1 || Date.now() / 1000] });
    chart($('cHr'), [{ c: COL.hr, pts: hm.map(r => [r.timestamp, r.heart_rate_bpm]) }], { min: 40, max: 130 });
  }

  async function poll() {
    try {
      const [pf, hm, aq] = await Promise.all([logs('presence-field'), logs('health-monitor').catch(() => []), logs('air-quality-index').catch(() => [])]);
      ingest(H.pf, pf); ingest(H.hm, hm); ingest(H.aq, aq);
      $('conn').textContent = 'live · ' + new Date().toLocaleTimeString() + ' · ' + H.pf.size + ' presence samples';
      render();
    } catch (e) { $('conn').textContent = 'error: ' + e.message; }
  }

  // Breathing test: 60 s window, compares presence-field median vs your count
  $('tBtn').onclick = () => {
    test = { t0: Date.now() / 1000, t1: null }; $('tBtn').disabled = true; $('tCmp').disabled = true; $('tRes').innerHTML = '';
    const tick = setInterval(() => {
      const left = Math.max(0, 60 - Math.round(Date.now() / 1000 - test.t0));
      $('tState').textContent = left ? `counting… ${left}s` : 'done — enter your count';
      if (!left) { clearInterval(tick); test.t1 = test.t0 + 60; $('tBtn').disabled = false; $('tCmp').disabled = false; }
    }, 500);
  };
  $('tCmp').onclick = () => {
    const mine = Number($('tCount').value); if (!test || !test.t1 || !mine) return;
    const win = r => r.timestamp >= test.t0 && r.timestamp <= test.t1 + 2;
    const med = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const pfw = sorted(H.pf).filter(win), good = pfw.filter(r => r.breathing_snr >= 4 && r.breathing_bpm > 0);
    const pfMed = med((good.length ? good : pfw).map(r => r.breathing_bpm)), hmMed = med(sorted(H.hm).filter(win).map(r => r.breathing_bpm));
    const pres = pfw.length ? Math.round(100 * pfw.filter(r => r.presence_detected).length / pfw.length) : 0;
    const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
    $('tRes').innerHTML = row('Your count', mine + ' bpm') +
      row('presence-field (median' + (good.length ? ', SNR≥4' : ', all') + ')', isNaN(pfMed) ? 'no data' : `${pfMed.toFixed(1)} bpm (${(pfMed - mine >= 0 ? '+' : '') + (pfMed - mine).toFixed(1)})`) +
      row('health-monitor (median)', isNaN(hmMed) ? 'no data' : `${hmMed.toFixed(0)} bpm`) +
      row('Samples / good-SNR', `${pfw.length} / ${good.length}`) + row('Presence during test', pres + '%');
    console.log('[breathing-test]', { mine, pfMed, hmMed, samples: pfw.length, good: good.length, presencePct: pres, t0: test.t0 });
  };

  poll(); setInterval(poll, POLL_MS); addEventListener('resize', render);
})();
