/* Earnings page ("Who's reporting"): week strip, next-up cards, and the just-reported scoreboard. Company name + ticker everywhere; price on top, $ change and % under it. */
(function () {
  const E = window.ERN = { day: null, q: {} };
  const PX = (v) => (v == null || !isFinite(v) ? '—' : '$' + px(+v));
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const ymd = (d) => d.toISOString().slice(0, 10);
  function weekOf(t) { const d = new Date(t + 'T12:00:00Z'); const dow = d.getUTCDay(); const mon = new Date(d); mon.setUTCDate(d.getUTCDate() - ((dow + 6) % 7)); return [0, 1, 2, 3, 4].map((i) => { const x = new Date(mon); x.setUTCDate(mon.getUTCDate() + i); return ymd(x); }); }
  function when(t) { return /BMO|before|pre/i.test(t || '') ? '☀ Before the open' : /AMC|after|post/i.test(t || '') ? '☾ After the close' : 'Time not set'; }
  function name(e) { return cleanName(e.company || symName(e.ticker) || '') || e.ticker; }
  function quote(sym) { const q = E.q[sym] || (window.TODAY && TODAY.wlQ && TODAY.wlQ[sym]); return q && q.price ? q : null; }
  function priceBlock(sym, fallbackPct) { const q = quote(sym); const P = dPal();
    if (q) { const m = q.reg && q.reg.price ? q.reg : q; return '<span class="ePx"><b>$' + px(m.price) + '</b><small style="color:' + ((m.pct || 0) >= 0 ? P.up : P.dn) + '">' + (dS(m.chg, m.pct, m.price) || '') + ' ' + pctS(m.pct || 0) + '</small></span>'; }
    return fallbackPct != null ? '<span class="ePx"><small style="color:' + (fallbackPct >= 0 ? P.up : P.dn) + '">' + pctS(fallbackPct) + '</small></span>' : ''; }
  function needQuotes(list) { const need = list.filter((s) => /^[A-Z.]{1,6}$/.test(s) && !E.q[s]).slice(0, 100); if (!need.length || typeof watch !== 'function') return;
    watch('ern:q', 'get_stock_snapshot', { symbols: need.join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: true }, (p) => { (Array.isArray(p) ? p : []).forEach((x) => { E.q[x.symbol] = typeof wlRow === 'function' ? wlRow(x, view()) : snapRow(x, 'regular'); }); if (S.tab === 'catalysts') renderCatalysts(); }); }
  E.top = function () {
    const C = file('catalysts.json'); if (!ready(C)) return '<div class="empty"><b>Loading earnings…</b></div>';
    const today = et().ymd; const up = (C.earnings && C.earnings.upcoming) || []; const rep = (C.earnings && C.earnings.reported) || [];
    const mine = S.allWl || {}; const wk = weekOf(today);
    if (!E.day || wk.indexOf(E.day) < 0) E.day = wk.find((d) => d >= today && up.some((e) => e.date === d)) || wk.find((d) => d >= today) || wk[4];
    const cnt = (d) => up.filter((e) => e.date === d).length + rep.filter((e) => e.date === d).length;
    let h = '<div class="eWeek">' + wk.map((d) => { const dt = new Date(d + 'T12:00:00Z'); return '<button class="eDay' + (d === E.day ? ' on' : '') + (d < today ? ' past' : '') + '" data-eday="' + d + '"><small>' + DAYS[dt.getUTCDay()] + '</small><b>' + dt.getUTCDate() + '</b><em>' + cnt(d) + ' report' + (cnt(d) === 1 ? '' : 's') + '</em></button>'; }).join('') + '</div>';
    const dayList = up.filter((e) => e.date === E.day).sort((a, b) => (mine[b.ticker] ? 1 : 0) - (mine[a.ticker] ? 1 : 0) || (+b.rev_est_usd || 0) - (+a.rev_est_usd || 0));
    const dt = new Date(E.day + 'T12:00:00Z');
    h += '<div class="eCap"><span><i class="eSq"></i>' + (E.day === today ? 'TODAY' : dt.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toUpperCase()) + '</span><b>' + dayList.length + ' reporting</b></div>';
    h += dayList.length ? '<div class="eCards">' + dayList.slice(0, 24).map((e) => '<button class="eCard' + (mine[e.ticker] ? ' mine' : '') + '" data-open="' + esc(e.ticker) + '" data-name="' + esc(e.company || '') + '">' + (mine[e.ticker] ? '<em class="eStar">★</em>' : '') + logoHTML(e.ticker, 34) + '<b>' + esc(e.ticker) + '</b><span class="eNm">' + esc(name(e)) + '</span><small class="eWh">' + when(e.timing) + '</small><span class="eEst"><span>EPS est<b>' + (e.eps_est != null ? (e.eps_est < 0 ? '−$' + Math.abs(e.eps_est).toFixed(2) : '$' + (+e.eps_est).toFixed(2)) : '—') + '</b></span><span>Sales est<b>' + (e.rev_est_usd ? money(e.rev_est_usd) : '—') + '</b></span></span>' + priceBlock(e.ticker) + '</button>').join('') + '</div>' : '<div class="empty"><b>No reports this day</b></div>';
    const recent = rep.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
    if (recent.length) {
      h += '<div class="eCap"><span><i class="eSq"></i>JUST REPORTED · PRICE TODAY</span></div><div class="eBoard">' + recent.map((e) => { const a = +e.eps_actual, s = +e.eps_est; const has = isFinite(a) && isFinite(s) && e.eps_actual != null && e.eps_est != null; const beat = has && a >= s;
        return '<button class="eRow" data-open="' + esc(e.ticker) + '" data-name="' + esc(e.company || '') + '">' + logoHTML(e.ticker, 32) + '<span class="eRn"><b>' + esc(e.ticker) + '<span class="eNm2">' + esc(name(e)) + '</span></b><small>' + (has ? 'EPS <b>' + (a < 0 ? '−$' + Math.abs(a).toFixed(2) : '$' + a.toFixed(2)) + '</b> vs ' + (s < 0 ? '−$' + Math.abs(s).toFixed(2) : '$' + s.toFixed(2)) + ' est · <span style="color:' + (beat ? dPal().up : dPal().dn) + '">' + (beat ? 'Beat' : 'Missed') + '</span>' : 'Reported') + (e.guidance === 'raised' ? ' · <span style="color:#9DBEFF">Guidance raised</span>' : e.guidance === 'lowered' ? ' · <span style="color:#EC9191">Guidance cut</span>' : '') + '</small>' + (e.headline ? '<small class="eHl">' + esc(e.headline) + '</small>' : '') + '</span>' + priceBlock(e.ticker, e.reaction_pct != null ? +e.reaction_pct : null) + '</button>'; }).join('') + '</div>';
    }
    needQuotes(dayList.slice(0, 24).map((e) => e.ticker).concat(recent.map((e) => e.ticker)));
    return h;
  };
  document.addEventListener('click', (ev) => { const t = ev.target.closest('[data-eday]'); if (!t) return; E.day = t.dataset.eday; renderCatalysts(); });
})();
