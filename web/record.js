/* jumptrade track record: replays the app's own rules on two years of daily prices and scores every signal,
   plus a live log of the setups the app actually showed you, scored as prices come in. */
(function () {
  const REC = { busy: 0, res: null, prog: 0 };
  const LS = 'jt.rec2', LOG = 'jt.reclog';
  try { const c = JSON.parse(localStorage.getItem(LS) || 'null'); if (c && Date.now() - c.t < 43200000) REC.res = c; } catch (e) {}
  const ymd = (t) => String(t || '').slice(0, 10);
  const etDay = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })).toISOString().slice(0, 10);

  // walk forward up to 20 sessions: stop first (conservative if both hit the same day), then target, else exit at day-20 close
  function walk(b, i, e, st, tg) {
    const R = e - st; if (!(R > 0)) return null;
    for (let j = i + 1; j < Math.min(b.length, i + 21); j++) {
      if (b[j].l <= st) return { r: -1, ret: st / e - 1, days: j - i, out: 'stop' };
      if (b[j].h >= tg) return { r: (tg - e) / R, ret: tg / e - 1, days: j - i, out: 'target' };
    }
    if (i + 20 >= b.length) return { open: true };
    const x = b[i + 20].c; return { r: (x - e) / R, ret: x / e - 1, days: 20, out: 'time' };
  }
  function rsiArr(b) {
    const out = []; let ag = 0, al = 0;
    for (let i = 1; i < b.length; i++) {
      const ch = b[i].c - b[i - 1].c, g = Math.max(ch, 0), lo = Math.max(-ch, 0);
      if (i <= 14) { ag += g / 14; al += lo / 14; out[i] = null; continue; }
      ag = (ag * 13 + g) / 14; al = (al * 13 + lo) / 14; out[i] = al ? 100 - 100 / (1 + ag / al) : 100;
    }
    return out;
  }
  function replay(sym, b, trades) {
    if (b.length < 120) return;
    // Breakout: first close above the prior 252-day high (or all history if shorter), within 5% of it. Entry at the high, stop 3% under, target 2R.
    for (let i = 60; i < b.length - 1; i++) {
      let hi = 0; for (let j = Math.max(0, i - 252); j < i; j++) hi = Math.max(hi, b[j].h);
      if (b[i].c > hi && b[i - 1].c <= hi && b[i].c <= hi * 1.05) {
        const st = hi * 0.97, w = walk(b, i, hi, st, hi + 2 * (hi - st));
        if (w) { trades.push(Object.assign({ rule: 'breakout', sym: sym, d: ymd(b[i].t), e: hi, st: st }, w)); if (!w.open) i += w.days; else break; }
      }
    }
    // Dip: down 15%+ from the 60-day high, RSI(14) reclaims 40 after being under 30 in the last 10 days. Entry at the close, stop at the 10-day low, target 2R.
    const r = rsiArr(b);
    for (let i = 70; i < b.length - 1; i++) {
      let h60 = 0; for (let j = i - 60; j < i; j++) h60 = Math.max(h60, b[j].h);
      if (b[i].c > h60 * 0.85 || r[i] == null || r[i - 1] == null || !(r[i] >= 40 && r[i - 1] < 40)) continue;
      let sub = false; for (let j = i - 10; j < i; j++) if (r[j] != null && r[j] < 30) sub = true; if (!sub) continue;
      let lo = Infinity; for (let j = i - 10; j <= i; j++) lo = Math.min(lo, b[j].l);
      const e = b[i].c, st = lo * 0.995; if (e - st < e * 0.01) continue;
      const w = walk(b, i, e, st, e + 2 * (e - st));
      if (w) { trades.push(Object.assign({ rule: 'dip', sym: sym, d: ymd(b[i].t), e: e, st: st }, w)); if (!w.open) i += w.days; else break; }
    }
  }
  function stats(list) {
    const c = list.filter((t) => !t.open); const n = c.length; if (!n) return { n: 0 };
    const w = c.filter((t) => t.r > 0).length, hit = c.filter((t) => t.out === 'target').length;
    const avgR = c.reduce((a, t) => a + t.r, 0) / n, avgRet = c.reduce((a, t) => a + t.ret, 0) / n;
    return { n: n, win: w / n, hit: hit / n, avgR: avgR, avgRet: avgRet, open: list.length - n };
  }
  REC.run = async function (force) {
    if (REC.busy) return;
    if (!force && REC.res && Date.now() - REC.res.t < 43200000) return;
    if (typeof mcp === 'undefined' || !mcp) return;
    REC.busy = 1; REC.prog = 0; render();
    const U = ['SPY'].concat(dipUniverse().all.filter((s) => /^[A-Z.]{1,6}$/.test(s)));
    const trades = []; const bars = {};
    for (let k = 0; k < U.length; k += 20) {
      try {
        const res = await mcp.callTool(SERVER, 'get_stock_bars', { symbols: U.slice(k, k + 20), category: 'US_STOCK', timespan: 'D', count: 520 }, { cache: { staleTime: 43200000, gcTime: 86400000 } });
        const p = payloadOf(res);
        ((p && p.result) || []).forEach((x) => { const b = (x.result || []).slice().reverse().map((y) => ({ t: y.time, h: +y.high, l: +y.low, c: +y.close })); bars[x.symbol] = b; if (x.symbol !== 'SPY') replay(x.symbol, b, trades); });
      } catch (e) {}
      REC.prog = Math.min(1, (k + 20) / U.length); if (S.tab === 'record') render();
      await new Promise((r) => setTimeout(r, 250));
    }
    // S&P over the same 20-day windows, for context
    const spy = bars.SPY || []; const spyIdx = {}; spy.forEach((x, i) => { spyIdx[ymd(x.t)] = i; });
    trades.forEach((t) => { const i = spyIdx[t.d]; if (i != null && i + 20 < spy.length) t.spy = spy[i + Math.min(20, t.days || 20)].c / spy[i].c - 1; });
    const lastDay = spy.length ? ymd(spy[spy.length - 1].t) : etDay();
    const cut90 = new Date(new Date(lastDay).getTime() - 90 * 864e5).toISOString().slice(0, 10);
    const out = { t: Date.now(), asOf: lastDay, universe: U.length - 1, rules: {} };
    ['breakout', 'dip'].forEach((k) => {
      const all = trades.filter((t) => t.rule === k), r90 = all.filter((t) => t.d >= cut90);
      const sp = all.filter((t) => !t.open && t.spy != null);
      out.rules[k] = { all: stats(all), d90: stats(r90), spy: sp.length ? sp.reduce((a, t) => a + t.spy, 0) / sp.length : null,
        recent: all.slice().sort((a, b) => b.d.localeCompare(a.d)).slice(0, 12).map((t) => ({ sym: t.sym, d: t.d, e: +t.e.toFixed(2), r: t.open ? null : +t.r.toFixed(2), ret: t.open ? null : +t.ret.toFixed(4), out: t.open ? 'open' : t.out })) };
    });
    // score the live log against the same bars
    REC.scoreLog(bars);
    REC.res = out; try { localStorage.setItem(LS, JSON.stringify(out)); } catch (e) {}
    REC.busy = 0; render();
  };

  // live log: every setup the app put in front of you, once per stock per day
  REC.log = function (list) {
    try {
      const L = JSON.parse(localStorage.getItem(LOG) || '[]'); const d = etDay(); let ch = false;
      list.forEach((x) => { if (!x.e || !x.st || !x.tg) return; if (L.some((y) => y.d === d && y.sym === x.sym)) return; L.push({ d: d, sym: x.sym, kind: x.kind, e: +x.e.toFixed(4), st: +x.st.toFixed(4), tg: +x.tg.toFixed(4) }); ch = true; });
      if (ch) localStorage.setItem(LOG, JSON.stringify(L.slice(-400)));
    } catch (e) {}
  };
  REC.scoreLog = function (bars) {
    try {
      const L = JSON.parse(localStorage.getItem(LOG) || '[]');
      L.forEach((x) => {
        if (x.out && x.out !== 'open') return; const b = bars[x.sym]; if (!b) return;
        const i = b.findIndex((y) => ymd(y.t) >= x.d); if (i < 0) return;
        // entry only counts if price actually reached it within 5 sessions
        let ei = -1; for (let j = i; j < Math.min(b.length, i + 5); j++) if (b[j].h >= x.e && b[j].l <= x.e * 1.02) { ei = j; break; }
        if (ei < 0) { if (i + 5 < b.length) x.out = 'missed'; return; }
        const w = walk(b, ei, x.e, x.st, x.tg); if (!w || w.open) { x.out = 'open'; return; }
        x.out = w.out; x.r = +w.r.toFixed(2); x.ret = +w.ret.toFixed(4);
      });
      localStorage.setItem(LOG, JSON.stringify(L));
    } catch (e) {}
  };
  REC.liveStats = function () { try { const L = JSON.parse(localStorage.getItem(LOG) || '[]'); return { L: L, s: stats(L.filter((x) => x.out && x.out !== 'missed' && x.out !== 'open').map((x) => ({ r: x.r, ret: x.ret, out: x.out }))), since: L.length ? L[0].d : null, open: L.filter((x) => !x.out || x.out === 'open').length }; } catch (e) { return { L: [], s: { n: 0 } }; } };
  REC.summary = function () { return REC.res; };

  const pc = (x, d) => (x >= 0 ? '+' : '') + (x * 100).toFixed(d == null ? 1 : d) + '%';
  const md = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  function ruleCard(name, blurb, R, P) {
    const a = R.all, q = R.d90;
    if (!a.n) return '<div class="glass sec"><p class="desc dim">' + esc(name) + ': no trades in the test window.</p></div>';
    const tile = (lab, v, sub, col) => '<div><span>' + lab + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    const good = a.avgR > 0.1, col = good ? P.up : a.avgR < -0.05 ? P.dn : P.txt;
    let h = '<div class="glass sec rec" style="--c:' + col + '">' + secCap(name.toUpperCase(), col) + '<p class="desc dim" style="margin:-2px 0 10px">' + blurb + '</p>' +
      '<div class="recg">' + tile('Win rate', Math.round(a.win * 100) + '%', a.n + ' trades · 2 yrs', a.win >= 0.5 ? P.up : P.txt) + tile('Avg result', (a.avgR >= 0 ? '+' : '') + a.avgR.toFixed(2) + 'R', pc(a.avgRet) + ' per trade', col) +
      tile('Last 90 days', q.n ? Math.round(q.win * 100) + '%' : '—', q.n ? q.n + ' trades · ' + (q.avgR >= 0 ? '+' : '') + q.avgR.toFixed(2) + 'R' : 'no signals', q.n ? (q.avgR > 0 ? P.up : P.dn) : P.mute) +
      tile('S&P same days', R.spy != null ? pc(R.spy) : '—', 'buy-and-hold', P.txt) + '</div>';
    h += '<div class="recv">' + (good ? 'This rule has made money: about ' + a.avgR.toFixed(2) + ' times the risk per trade.' : a.avgR < -0.05 ? 'This rule has lost money lately. Size it small or skip it.' : 'Roughly break-even. It needs a filter to be worth trading.') + '</div>';
    h += '<div class="cap" style="margin:12px 0 4px">LATEST SIGNALS</div>' + R.recent.slice(0, 6).map((t) => {
      const c = t.out === 'open' ? P.mute : t.r > 0 ? P.up : P.dn; const lab = { target: 'Hit target', stop: 'Stopped', time: '20-day exit', open: 'Still open' }[t.out];
      return '<button class="recrow" data-open="' + esc(t.sym) + '">' + logoHTML(t.sym, 26) + '<span class="rn"><b>' + esc(t.sym) + '</b><small>' + md(t.d) + ' · in at $' + px(t.e) + '</small></span><span class="rp"><b style="color:' + c + '">' + (t.r == null ? '—' : (t.r >= 0 ? '+' : '') + t.r.toFixed(1) + 'R') + '</b><small>' + lab + '</small></span></button>';
    }).join('') + '</div>';
    return h;
  }
  REC.render = function () {
    const P = dPal(); setHTML($('recSeg'), ideasSeg('record'));
    const box = $('recList'); let h = '';
    if (!REC.res) {
      if (!REC.busy) setTimeout(() => REC.run(), 30);
      box.innerHTML = (window.PLAY && PLAY.recordCard ? PLAY.recordCard() : '') + '<div class="empty"><b>' + (REC.busy ? 'Testing every signal… ' + Math.round(REC.prog * 100) + '%' : (typeof mcp !== 'undefined' && mcp ? 'Starting…' : 'Can’t reach live data')) + '</b><span>Replaying two years of daily prices for every stock the scanners watch.</span></div>'; return;
    }
    const X = REC.res; $('recSub').innerHTML = 'Did the signals<br>actually work?';
    const lv = REC.liveStats();
    if (window.PLAY && PLAY.recordCard) h += PLAY.recordCard();
    h += '<div class="glass sec rec" style="--c:' + P.vi + '">' + secCap('YOUR LIVE RECORD', P.vi);
    if (lv.s.n) h += '<div class="recg">' + '<div><span>Closed</span><b>' + lv.s.n + '</b><small>since ' + md(lv.since) + '</small></div><div><span>Win rate</span><b style="color:' + (lv.s.win >= 0.5 ? P.up : P.txt) + '">' + Math.round(lv.s.win * 100) + '%</b></div><div><span>Avg result</span><b style="color:' + (lv.s.avgR > 0 ? P.up : P.dn) + '">' + (lv.s.avgR >= 0 ? '+' : '') + lv.s.avgR.toFixed(2) + 'R</b></div><div><span>Open</span><b>' + lv.open + '</b></div></div>';
    else h += '<p class="desc dim">Every setup jumptrade shows you is now logged with its entry, stop and target, then scored as prices come in. ' + (lv.L.length ? lv.L.length + ' logged so far; results appear once they play out (up to 20 trading days).' : 'Nothing logged yet: open Setups during the week to start the record.') + '</p>';
    h += '</div>';
    h += ruleCard('Breakouts', 'First close above the 52-week high. Buy at the old high, stop 3% under, target 2× the risk.', X.rules.breakout, P);
    h += ruleCard('Dip buys', 'Down 15%+ from the 2-month high, RSI climbs back over 40 after dipping under 30. Stop under the 10-day low, target 2× the risk.', X.rules.dip, P);
    h += '<p class="foot">Tested on ' + X.universe + ' stocks (S&amp;P 500, the app’s theme groups and your watchlists) using two years of daily prices through ' + md(X.asOf) + '. Each trade exits at the stop, the target, or after 20 trading days. If the stop and target are both touched the same day, it counts as a loss. No trading costs included. Past results don’t guarantee future ones. <button class="lnk" data-recrun="1">Re-run test</button></p>';
    box.innerHTML = h;
  };
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-recrun]')) { REC.res = null; try { localStorage.removeItem(LS); } catch (x) {} REC.run(true); } });
  window.REC = REC;
})();
