/* jumptrade. portfolio analyzer: read-only. Reads positions (never places trades), then scores
   concentration, risk, diversification, valuation and each holding's setup. */
(function () {
  const AZ = { src: null, accts: null, acctData: {}, bars: {}, snap: {}, prof: {}, res: null, busy: false, err: null, paste: '', pasteOpen: false };
  window.AZ = AZ;
  const ctool = (tool, input, hours) => mcp.callTool(SERVER, tool, input, { cache: { staleTime: hours * 3600e3, gcTime: hours * 3600e3 } }).then(payloadOf);
  const arr = (p) => Array.isArray(p) ? p : p && Array.isArray(p.data) ? p.data : [];
  const fmtP = (p) => p == null || !isFinite(p) ? '—' : '$' + (p < 1 ? p.toFixed(4) : p >= 1000 ? Math.round(p).toLocaleString('en-US') : p.toFixed(2));
  const usd = (v) => v == null || !isFinite(v) ? '—' : (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2 });

  /* ---------- sources ---------- */
  function loadAccounts() {
    if (AZ.accts || AZ.acctLoading || !mcp || mcp.delayed) return; AZ.acctLoading = true;
    ctool('get_account_list', {}, 0.1).then((p) => {
      AZ.accts = arr(p).filter((a) => a.account_class !== 'CRYPTO');
      return Promise.all(AZ.accts.map((a) => Promise.all([ctool('get_account_positions', { account_id: a.account_id }, 0.02).catch(() => []), ctool('get_account_balance', { account_id: a.account_id }, 0.02).catch(() => null)])
        .then((r) => { AZ.acctData[a.account_id] = { pos: arr(r[0]), bal: r[1] || {} }; })));
    }).catch((e) => { AZ.accts = []; AZ.acctErr = (e && e.code) || 'error'; }).finally(() => { AZ.acctLoading = false; render(); });
  }
  function sources() {
    const out = [];
    (AZ.accts || []).forEach((a) => { const d = AZ.acctData[a.account_id]; out.push({ id: 'acct:' + a.account_id, label: (a.account_label || a.account_class_mapping || 'Account') + (d && d.bal ? ' · ' + usd(+d.bal.total_net_liquidation_value) : ''), kind: 'webull' }); });
    if ((AZ.accts || []).length > 1) out.unshift({ id: 'acct:all', label: 'All accounts', kind: 'webull' });
    myPorts().forEach((p) => out.push({ id: 'mine:' + p.id, label: p.name, kind: 'mine' }));
    (S.models || []).filter((m) => m.syms && m.syms.length).forEach((m) => out.push({ id: 'model:' + m.watchlist_id, label: m.name, kind: 'model' }));
    out.push({ id: 'paste', label: 'Paste holdings', kind: 'paste' });
    return out;
  }
  // → { name, holdings:[{sym, w, value?, qty?, cost?, pl?}], cash, total, live }
  function holdingsFor(id) {
    if (id.indexOf('acct:') === 0) {
      const ids = id === 'acct:all' ? (AZ.accts || []).map((a) => a.account_id) : [id.slice(5)];
      const map = {}; let cash = 0, other = 0;
      ids.forEach((aid) => { const d = AZ.acctData[aid]; if (!d) return; cash += +(d.bal && d.bal.total_cash_balance) || 0;
        d.pos.forEach((p) => { const v = +p.market_value || 0; if (p.instrument_type && !/EQUITY|ETF|STOCK/i.test(p.instrument_type)) { other += v; return; }
          const m = map[p.symbol] || (map[p.symbol] = { sym: p.symbol, value: 0, qty: 0, cost: 0, pl: 0, dayPl: 0 }); m.value += v; m.qty += +p.quantity || 0; m.cost += +p.cost || 0; m.pl += +p.unrealized_profit_loss || 0; m.dayPl += +p.day_profit_loss || 0; }); });
      const hs = Object.values(map).filter((h) => h.value > 0); const inv = hs.reduce((a, h) => a + h.value, 0);
      const acct = id === 'acct:all' ? null : (AZ.accts || []).find((a) => a.account_id === id.slice(5));
      return { name: acct ? acct.account_label || 'Brokerage account' : 'All accounts', holdings: hs.map((h) => Object.assign(h, { w: inv ? h.value / inv : 0 })), cash: cash, other: other, total: inv + cash + other, live: true };
    }
    if (id.indexOf('mine:') === 0) { const p = myPorts().find((x) => x.id === id.slice(5)); if (!p) return null; return { name: p.name, holdings: p.h.map((x) => ({ sym: x[0], w: x[1] / 100, entry: x[2] })), cash: 0, total: null }; }
    if (id.indexOf('model:') === 0) { const m = (S.models || []).find((x) => String(x.watchlist_id) === id.slice(6)); if (!m) return null; return { name: m.name, holdings: (m.syms || []).map((s) => ({ sym: s, w: 1 / m.syms.length })), cash: 0, total: null }; }
    if (id === 'paste') return parsePaste(AZ.paste);
    return null;
  }
  function parsePaste(txt) {
    const rows = []; (txt || '').split(/[\n;]+/).forEach((line) => {
      const m = line.trim().toUpperCase().match(/^\$?([A-Z][A-Z.]{0,5})\b[\s,:=-]*([$]?[\d,.]+\s*%?|[\d,.]+\s*(SHARES?|SH)?)?/); if (!m) return;
      const raw = (m[2] || '').replace(/,/g, '').trim(); let kind = 'eq', val = 1;
      if (/%$/.test(raw)) { kind = 'pct'; val = parseFloat(raw); } else if (/^\$/.test(raw)) { kind = 'usd'; val = parseFloat(raw.slice(1)); } else if (raw) { kind = 'qty'; val = parseFloat(raw); }
      if (isFinite(val) && val > 0) rows.push({ sym: m[1].replace(/\.$/, ''), kind: kind, val: val });
    });
    return { name: 'Pasted holdings', paste: rows, holdings: [], cash: 0, total: null };
  }

  /* ---------- math ---------- */
  const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const cov = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb); return s / Math.max(1, a.length - 1); };
  const sd = (a) => Math.sqrt(cov(a, a));
  function rets(sym, dates) { const b = AZ.bars[sym]; if (!b) return null; const m = {}; b.forEach((x) => { m[x.d] = x.c; }); const out = []; let prev = null;
    for (const d of dates) { const c = m[d]; if (c == null) { out.push(0); continue; } out.push(prev ? c / prev - 1 : 0); prev = c; } return out; }

  async function analyze(id) {
    AZ.src = id; AZ.res = null; AZ.err = null;
    const base = holdingsFor(id); if (!base) { render(); return; }
    if (!base.paste && !base.holdings.length) { AZ.res = { base: base, empty: true }; render(); return; }
    if (base.paste && !base.paste.length) { AZ.res = { base: base, empty: true }; render(); return; }
    AZ.busy = true; render();
    try {
      const syms = Array.from(new Set((base.paste ? base.paste.map((r) => r.sym) : base.holdings.map((h) => h.sym)))).filter((s) => /^[A-Z.]{1,6}$/.test(s)).slice(0, 60);
      for (let i = 0; i < syms.length; i += 100) { const p = await ctool('get_stock_snapshot', { symbols: syms.slice(i, i + 100).join(','), category: 'US_STOCK', extend_hour_required: false, overnight_required: false }, 0.1); arr(p).forEach((x) => { AZ.snap[x.symbol] = x; }); }
      if (base.paste) { // turn pasted rows into weights using live prices
        const vals = base.paste.map((r) => { const px = +(AZ.snap[r.sym] || {}).price || 0; return { sym: r.sym, v: r.kind === 'usd' ? r.val : r.kind === 'qty' ? r.val * px : r.kind === 'pct' ? r.val : 1, kind: r.kind, qty: r.kind === 'qty' ? r.val : null }; });
        const allPct = vals.every((v) => v.kind === 'pct'), allEq = vals.every((v) => v.kind === 'eq'); const tot = vals.reduce((a, v) => a + v.v, 0) || 1;
        base.holdings = vals.map((v) => ({ sym: v.sym, w: v.v / tot, value: allPct || allEq ? null : v.v, qty: v.qty }));
        base.total = allPct || allEq ? null : tot;
      }
      const need = ['SPY'].concat(syms).filter((s) => !AZ.bars[s]);
      const chunks = []; for (let i = 0; i < need.length; i += 20) chunks.push(need.slice(i, i + 20));
      await Promise.all(chunks.map((ch) => ctool('get_stock_bars', { symbols: ch, category: 'US_STOCK', timespan: 'D', count: 260 }, 6).then((p) => { ((p && p.result) || []).forEach((r) => { AZ.bars[r.symbol] = (r.result || []).map((b) => ({ d: String(b.time).slice(0, 10), o: +b.open, h: +b.high, l: +b.low, c: +b.close, v: +b.volume })).filter((b) => b.c > 0).reverse(); }); }).catch(() => {})));
      await Promise.all(syms.filter((s) => !AZ.prof[s]).map((s) => ctool('get_company_profile', { symbol: s, category: 'US_STOCK' }, 168).then((p) => { AZ.prof[s] = p || {}; }).catch(() => { AZ.prof[s] = {}; })));
      AZ.res = compute(base);
    } catch (e) { AZ.err = 'Couldn’t finish the analysis. Pull down to retry.'; }
    AZ.busy = false; render();
  }

  function compute(base) {
    const hs = base.holdings.filter((h) => h.w > 0).sort((a, b) => b.w - a.w);
    const spyB = AZ.bars.SPY || []; const dates = spyB.slice(-252).map((b) => b.d); const spyR = rets('SPY', dates) || [];
    const varS = cov(spyR, spyR) || 1e-9;
    hs.forEach((h) => {
      const sn = AZ.snap[h.sym] || {}; const r = rets(h.sym, dates); const b = AZ.bars[h.sym];
      h.name = cleanName(sn.name || symName(h.sym) || ''); h.px = +sn.price || (b && b.length ? b[b.length - 1].c : null); h.day = sn.change_ratio != null ? +sn.change_ratio * 100 : null;
      h.mcap = +sn.market_value || 0; h.pe = +sn.pe_ratio || null; h.hi52 = +sn.fifty_two_wk_high || null;
      h.beta = r ? cov(r, spyR) / varS : null; h.vol = r ? sd(r) * Math.sqrt(252) * 100 : null; h.r = r;
      h.y1 = b && b.length > 200 ? (b[b.length - 1].c / b[Math.max(0, b.length - 252)].c - 1) * 100 : null;
      h.off = h.hi52 && h.px ? (h.px / h.hi52 - 1) * 100 : null;
      const ind = (AZ.prof[h.sym] || {}).industries; h.sector = Array.isArray(ind) && ind.length ? ind[ind.length - 1] : 'Other';
      h.dip = b && b.length >= 60 && window.DIP ? DIP.analyze(h.sym, b) : null;
      h.val = S.val && S.val[h.sym] ? S.val[h.sym] : null;
      if (h.entry && h.px) h.pl = null, h.since = (h.px / h.entry - 1) * 100;
    });
    const withR = hs.filter((h) => h.r); const wR = withR.reduce((a, h) => a + h.w, 0) || 1;
    const port = dates.map((_, i) => withR.reduce((a, h) => a + h.w / wR * h.r[i], 0));
    let eq = 1, pk = 1, mdd = 0; const curve = [], spyC = []; let s = 1;
    port.forEach((r, i) => { eq *= 1 + r; s *= 1 + (spyR[i] || 0); pk = Math.max(pk, eq); mdd = Math.min(mdd, eq / pk - 1); curve.push([dates[i], eq]); spyC.push([dates[i], s]); });
    let spk = 1, smdd = 0; spyC.forEach((x) => { spk = Math.max(spk, x[1]); smdd = Math.min(smdd, x[1] / spk - 1); });
    const beta = withR.reduce((a, h) => a + h.w / wR * h.beta, 0);
    const vol = sd(port) * Math.sqrt(252) * 100, spyVol = sd(spyR) * Math.sqrt(252) * 100;
    let cs = 0, cw = 0; for (let i = 0; i < withR.length; i++) for (let j = i + 1; j < withR.length; j++) { const a = withR[i], b = withR[j]; const c = cov(a.r, b.r) / ((sd(a.r) * sd(b.r)) || 1e-9); cs += c * a.w * b.w; cw += a.w * b.w; }
    const corr = cw ? cs / cw : null;
    // risk contribution, stress tests, pairs that move together
    const covM = withR.map((a) => withR.map((b) => cov(a.r, b.r))); const ww = withR.map((h) => h.w / wR);
    let pv = 0; for (let i = 0; i < withR.length; i++) for (let j = 0; j < withR.length; j++) pv += ww[i] * ww[j] * covM[i][j];
    const rc = withR.map((h, i) => ({ sym: h.sym, w: h.w, c: pv > 0 ? ww[i] * covM[i].reduce((a, c, j) => a + ww[j] * c, 0) / pv : 0 })).sort((a, b) => b.c - a.c);
    const pairs = []; for (let i = 0; i < withR.length; i++) for (let j = i + 1; j < withR.length; j++) { const c = covM[i][j] / ((Math.sqrt(covM[i][i] * covM[j][j])) || 1e-9); if (c >= 0.6) pairs.push([withR[i].sym, withR[j].sym, c, withR[i].w + withR[j].w]); }
    pairs.sort((a, b) => b[3] * b[2] - a[3] * a[2]);
    let w1 = 0, w5 = 0; port.forEach((r, i) => { w1 = Math.min(w1, r); if (i >= 4) { let x = 1; for (let k = i - 4; k <= i; k++) x *= 1 + port[k]; w5 = Math.min(w5, x - 1); } });
    const inv = (base.total || 0) - (base.cash || 0);
    const stress = { spx10: -beta * 0.10, worstDay: w1, worstWeek: w5, inv: inv };
    const effN = 1 / hs.reduce((a, h) => a + h.w * h.w, 0);
    const top1 = hs[0] ? hs[0].w * 100 : 0, top3 = hs.slice(0, 3).reduce((a, h) => a + h.w, 0) * 100;
    const sectors = {}; hs.forEach((h) => { sectors[h.sector] = (sectors[h.sector] || 0) + h.w; });
    const secList = Object.keys(sectors).map((k) => [k, sectors[k] * 100]).sort((a, b) => b[1] - a[1]);
    const prof = hs.filter((h) => h.pe > 0); const ew = prof.reduce((a, h) => a + h.w, 0);
    const pe = ew ? ew / prof.reduce((a, h) => a + h.w / h.pe, 0) : null; const unprof = hs.filter((h) => !(h.pe > 0)).reduce((a, h) => a + h.w, 0) * 100;
    const y1 = (eq - 1) * 100, spy1 = (s - 1) * 100;
    const cashPct = base.total ? (base.cash || 0) / base.total * 100 : null;
    // flags, worst first
    const F = [];
    if (top1 >= 25) F.push(['red', hs[0].sym + ' is ' + top1.toFixed(0) + '% of the portfolio. One bad print moves the whole account; most pros cap a single name at 10–15%.']);
    else if (top1 >= 15) F.push(['amber', hs[0].sym + ' is ' + top1.toFixed(0) + '% of the portfolio. That’s a big bet; fine if it’s deliberate.']);
    if (secList[0] && secList[0][1] >= 45 && hs.length > 2) F.push([secList[0][1] >= 60 ? 'red' : 'amber', secList[0][1].toFixed(0) + '% sits in ' + secList[0][0] + '. Those names tend to fall together.']);
    if (corr != null && corr >= 0.55 && hs.length > 3) F.push(['amber', 'Holdings move together (average correlation ' + corr.toFixed(2) + '). ' + hs.length + ' names behave more like ' + Math.max(1, Math.round(hs.length / (1 + (hs.length - 1) * corr))) + '.']);
    if (beta >= 1.4) F.push([beta >= 1.8 ? 'red' : 'amber', 'Beta ' + beta.toFixed(2) + ': on a day the S&P drops 3%, this mix has typically dropped about ' + (beta * 3).toFixed(1) + '%.']);
    if (mdd * 100 <= -35) F.push(['red', 'Held for the past year, this exact mix would have fallen ' + (mdd * 100).toFixed(0) + '% from its high at the worst point (S&P: ' + (smdd * 100).toFixed(0) + '%).']);
    if (unprof >= 30) F.push(['amber', unprof.toFixed(0) + '% is in companies with no trailing profits. That’s where drawdowns hit hardest when money gets tight.']);
    const breaking = hs.filter((h) => h.dip && (h.dip.state === 'breaking' || h.dip.state === 'falling'));
    if (breaking.length) F.push(['amber', breaking.map((h) => h.sym).join(', ') + (breaking.length > 1 ? ' are' : ' is') + ' still breaking down on the chart. Check your stops.']);
    if (cashPct != null && cashPct >= 40) F.push(['blue', cashPct.toFixed(0) + '% is in cash, which cushions drawdowns and leaves room to buy dips.']);
    if (effN >= 8 && (corr == null || corr < 0.45) && beta < 1.3) F.push(['green', 'Well spread out: about ' + effN.toFixed(0) + ' meaningful positions that don’t all move together.']);
    if (y1 > spy1 + 5) F.push(['green', 'Over the last year this mix returned ' + pctS(y1) + ' vs ' + pctS(spy1) + ' for the S&P.']);
    // overall score 0–100
    let score = 100; score -= Math.max(0, top1 - 12) * 1.2; score -= Math.max(0, (secList[0] ? secList[0][1] : 0) - 35) * 0.6; score -= Math.max(0, (corr || 0) - 0.35) * 60; score -= Math.max(0, beta - 1.1) * 25; score -= Math.max(0, -mdd * 100 - 25) * 0.6; score = Math.max(5, Math.min(99, Math.round(score)));
    return { rc: rc, pairs: pairs.slice(0, 3), stress: stress, base: base, hs: hs, beta: beta, vol: vol, spyVol: spyVol, mdd: mdd * 100, spyMdd: smdd * 100, corr: corr, effN: effN, top1: top1, top3: top3, secList: secList, pe: pe, unprof: unprof, y1: y1, spy1: spy1, curve: curve, spyC: spyC, flags: F, score: score, cashPct: cashPct };
  }

  /* ---------- UI ---------- */
  const FC = { red: '#FF8A8A', amber: '#F2C27A', blue: '#A8C8E8', green: '#5EE0A0' };
  function chart(r) {
    const W = 340, H = 130, P = 6, n = r.curve.length; if (n < 20) return '';
    const all = r.curve.map((x) => x[1]).concat(r.spyC.map((x) => x[1])); const lo = Math.min(...all), hi = Math.max(...all);
    const X = (i) => P + (W - 2 * P) * i / (n - 1), Y = (v) => H - P - (H - 2 * P) * (v - lo) / ((hi - lo) || 1);
    const line = (a) => a.map((x, i) => (i % 2 && i !== n - 1 ? '' : X(i).toFixed(1) + ',' + Y(x[1]).toFixed(1))).filter(Boolean).join(' ');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="This mix vs the S&P 500 over the past year"><line x1="' + P + '" x2="' + (W - P) + '" y1="' + Y(1).toFixed(1) + '" y2="' + Y(1).toFixed(1) + '" stroke="rgba(255,255,255,.12)" stroke-dasharray="3 4"></line><polyline points="' + line(r.spyC) + '" fill="none" stroke="#7D8796" stroke-width="1.6"></polyline><polyline points="' + line(r.curve) + '" fill="none" stroke="#8CB8E0" stroke-width="2.2" stroke-linejoin="round"></polyline></svg>' +
      '<div class="legend"><span><i style="background:#8CB8E0"></i>This mix ' + pctS(r.y1) + '</span><span><i style="background:#7D8796"></i>S&amp;P 500 ' + pctS(r.spy1) + '</span><span class="dim">past 12 months</span></div>';
  }
  AZ.renderChips = function () {
    return sources().map((s) => '<button class="chip' + (AZ.src === s.id ? ' on' : '') + '" data-azsrc="' + esc(s.id) + '">' + (s.kind === 'webull' ? '● ' : '') + esc(s.label) + '</button>').join('');
  };
  AZ.renderList = function () {
    loadAccounts(); if (!S.models && S.wlists) loadModels(); else if (!S.wlists && mcp && !mcp.delayed) loadWatch();
    if (!mcp || mcp.delayed) return '<div class="empty"><b>Coming soon to the web version</b><span>The analyzer will read your positions once accounts arrive in the web version.</span></div>';
    if (!AZ.src && !AZ.restoring) { const ss = sources(); const first = ss.find((s) => s.kind === 'webull' && s.id !== 'acct:all' && (AZ.acctData[s.id.slice(5)] || { pos: [] }).pos.length) || ss.find((s) => s.kind === 'mine') || ss.find((s) => s.kind === 'model'); if (first && !AZ.acctLoading) setTimeout(() => analyze(first.id), 0); }
    let h = '<div class="glass"><div class="cap">READ-ONLY</div><div class="small" style="color:#C9D2E0">Pick an account, one of your portfolios or models, or paste holdings. jumptrade only reads positions; it never trades.</div></div>';
    if (AZ.src === 'paste' || AZ.pasteOpen) { const rows = parsePaste(AZ.paste).paste, unit = AZ.unit || 'qty';
      h += '<div class="glass azform"><div class="cap">YOUR POSITIONS</div>' + (rows.length ? rows.map((r, i) => '<div class="azrow">' + logoHTML(r.sym, 28) + '<span class="azn"><b>' + esc(r.sym) + '</b><small>' + esc(cleanName(symName(r.sym) || '')) + '</small></span><span class="azv">' + (r.kind === 'usd' ? usd(r.val) : r.kind === 'pct' ? r.val + '%' : r.kind === 'qty' ? r.val + ' sh' : 'equal') + '</span><button class="azx" data-azrm="' + i + '" aria-label="Remove ' + esc(r.sym) + '">×</button></div>').join('') : '<p class="small dim" style="margin:6px 0 10px">Add stocks one at a time, by shares, dollars or % weight.</p>') +
        '<div class="azadd"><input id="azT" class="cin" placeholder="Ticker" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="6"><input id="azA" class="cin" placeholder="' + (unit === 'usd' ? '$ amount' : unit === 'pct' ? '% weight' : 'Shares') + '" inputmode="decimal"></div>' +
        '<div class="azunits">' + [['qty', 'Shares'], ['usd', 'Dollars'], ['pct', '% weight']].map((u) => '<button class="chip' + (unit === u[0] ? ' on' : '') + '" data-azunit="' + u[0] + '">' + u[1] + '</button>').join('') + '</div><div class="azhint" id="azHint"></div>' +
        '<div class="azbtns"><button class="pbtn" data-azadd="1">+ Add</button><button class="pbtn pri" data-azgo="1"' + (rows.length ? '' : ' disabled') + '>Analyze' + (rows.length ? ' ' + rows.length : '') + '</button></div>' +
        '<button class="azlink" data-azpt="1">' + (AZ.showPaste ? 'Hide the list box' : 'Or paste a whole list') + '</button>' + (AZ.showPaste ? '<textarea id="azPaste" class="cin" rows="5" placeholder="One per line, e.g.&#10;NVDA 20&#10;CRWV $5,000&#10;VST 15%" style="resize:vertical;min-height:110px">' + esc(AZ.paste) + '</textarea><span class="small dim">One per line: NVDA 20, CRWV $5,000 or VST 15%.</span>' : '') + '</div>'; }
    if (AZ.busy) return h + '<div class="empty"><b>Analyzing…</b><span>Pulling a year of prices, quotes and company profiles.</span></div>';
    if (AZ.err) return h + '<div class="empty"><b>' + esc(AZ.err) + '</b></div>';
    const r = AZ.res; if (!r) return h + (AZ.acctLoading ? '<div class="empty"><b>Reading your accounts…</b></div>' : '');
    if (r.empty) return h + '<div class="empty"><b>Nothing to analyze</b><span>' + (r.base.live ? 'This account has no stock positions' + (r.base.cash ? ', just ' + usd(r.base.cash) + ' in cash' : '') + '.' : 'Add some holdings first.') + '</span></div>';
    const hs = r.hs; const scoreCol = r.score >= 75 ? '#5EE0A0' : r.score >= 55 ? '#F2C27A' : '#FF8A8A';
    const parts = hs.slice(0, 12).map((x) => [x.sym, x.w]).concat(hs.length > 12 ? [['Other', hs.slice(12).reduce((a, x) => a + x.w, 0), '#4A5566']] : []);
    const totalPl = hs.reduce((a, x) => a + (x.pl || 0), 0);
    if (AZ.src === 'paste') h += '<div class="glass azsave">' + (AZ.savedMsg ? '<span class="small" style="font-weight:700">✓ ' + esc(AZ.savedMsg) + '</span>' : AZ.saving ? '<input id="azName" class="cin" placeholder="Name this portfolio" maxlength="40"><div class="azbtns"><button class="pbtn" data-azsc="1">Cancel</button><button class="pbtn pri" data-azsg="1">Save</button></div><span class="small dim" id="azSaveMsg"></span>' : '<button class="pbtn pri" data-azsave="1">Save as a portfolio</button><span class="small dim">Keeps these positions under Portfolios › Mine so you can re-check them anytime.</span>') + '</div>';
    h += '<div class="glass"><div class="dHero" style="padding:4px 0">' + bigDonut(parts, 176, '<b style="color:' + scoreCol + '">' + r.score + '</b><small>health score</small>') + '<h2 style="font-size:22px">' + esc(r.base.name) + '</h2><span class="small dim">' + hs.length + ' holdings' + (r.base.total ? ' · ' + usd(r.base.total) : '') + (r.cashPct != null ? ' · ' + r.cashPct.toFixed(0) + '% cash' : '') + (r.base.live && totalPl ? ' · <span style="color:' + gc(totalPl) + '">' + usd(totalPl) + ' unrealized</span>' : '') + '</span></div></div>';
    h += '<div class="tg4 six">' + [['Beta', r.beta.toFixed(2), r.beta > 1.4 ? '#F2C27A' : null], ['Volatility', r.vol.toFixed(0) + '%', null], ['Worst drop 1y', r.mdd.toFixed(0) + '%', r.mdd < -35 ? '#FF8A8A' : null], ['Top holding', r.top1.toFixed(0) + '%', r.top1 >= 25 ? '#FF8A8A' : r.top1 >= 15 ? '#F2C27A' : null], ['Real positions', r.effN.toFixed(1), null], ['P/E (weighted)', r.pe ? r.pe.toFixed(0) + '×' : '—', null]].map((c) => '<div><span>' + c[0] + '</span><b' + (c[2] ? ' style="color:' + c[2] + '"' : '') + '>' + c[1] + '</b></div>').join('') + '</div>';
    h += '<div class="small dim" style="margin:-4px 4px 0">S&amp;P for reference: beta 1.00 · volatility ' + r.spyVol.toFixed(0) + '% · worst drop ' + r.spyMdd.toFixed(0) + '%. "Real positions" counts how many equal-size bets your weights add up to.</div>';
    if (r.flags.length) h += '<div class="glass"><div class="cap">WHAT STANDS OUT</div>' + r.flags.map((f) => '<div class="flag"><i style="background:' + FC[f[0]] + '"></i><span>' + esc(f[1]) + '</span></div>').join('') + '</div>';
    if (r.stress) { const st = r.stress, sec = r.secList[0]; const m = (x) => st.inv ? usd(Math.abs(x * st.inv)) : Math.abs(x * 100).toFixed(1) + '%';
      const rowS = (lab, x, sub) => '<div class="strow"><span><b>' + lab + '</b><small>' + sub + '</small></span><span class="stv" style="color:#FF8A8A">−' + Math.abs(x * 100).toFixed(1) + '%<small>' + (st.inv ? '−' + m(x) : '') + '</small></span></div>';
      h += '<div class="glass"><div class="cap">STRESS TEST · WHAT A BAD STRETCH COSTS</div>' + (r.beta > 0.05 ? rowS('S&amp;P falls 10%', st.spx10, 'Using this mix’s beta of ' + r.beta.toFixed(2)) : '') +
        (sec ? rowS(esc(sec[0]) + ' falls 20%', -(sec[1] / 100) * 0.2, 'Your biggest sector, ' + sec[1].toFixed(0) + '% of the mix') : '') +
        rowS('Worst day, past year', st.worstDay, 'What today’s weights actually did') + rowS('Worst week, past year', st.worstWeek, 'Five trading days in a row') + '</div>'; }
    if (r.rc && r.rc.length > 1) { const mx = Math.max.apply(null, r.rc.map((x) => x.c)) || 1;
      h += '<div class="glass"><div class="cap">WHERE THE RISK COMES FROM</div>' + r.rc.slice(0, 6).map((x) => '<div class="rcrow" data-open="' + esc(x.sym) + '">' + logoHTML(x.sym, 24) + '<b>' + esc(x.sym) + '</b><span class="wbar" style="flex:1;margin:0 10px"><i style="width:' + Math.max(3, x.c / mx * 100).toFixed(1) + '%;background:' + (x.c > x.w * 1.5 ? '#FF8A8A' : '#8CB8E0') + '"></i></span><span class="rcv">' + Math.round(x.c * 100) + '%<small>' + Math.round(x.w * 100) + '% of $</small></span></div>').join('') +
        '<span class="small dim">Share of the portfolio’s day-to-day swings each position causes. Red = it adds far more risk than its dollar weight.</span>' +
        (r.pairs.length ? '<div class="cap" style="margin-top:12px">MOVE TOGETHER</div>' + r.pairs.map((p) => '<div class="flag"><i style="background:#F2C27A"></i><span><b>' + esc(p[0]) + '</b> and <b>' + esc(p[1]) + '</b> move together (correlation ' + p[2].toFixed(2) + '): ' + Math.round(p[3] * 100) + '% of the book behaves like one bet.</span></div>').join('') : '') + '</div>'; }
    h += '<div class="glass"><div class="cap">THIS MIX VS THE S&amp;P · PAST YEAR</div>' + chart(r) + '<span class="small dim">Today’s weights held for the past 12 months. It shows how the mix behaves, not what you actually made.</span></div>';
    h += '<div class="glass"><div class="cap">SECTORS</div>' + r.secList.slice(0, 8).map((s, i) => '<div class="secrow"><span>' + esc(s[0]) + '</span><span class="wbar" style="flex:1;margin:0 10px"><i style="width:' + Math.max(3, s[1]).toFixed(1) + '%;background:' + PAL[i % PAL.length] + '"></i></span><b>' + s[1].toFixed(0) + '%</b></div>').join('') + '</div>';
    const maxW = hs[0] ? hs[0].w : 1;
    h += '<div class="glass"><div class="ih"><span class="cap">HOLDINGS</span><span class="cap">WEIGHT · SETUP</span></div>' + hs.map((x, i) => {
      const col = i < 12 ? PAL[i % PAL.length] : '#4A5566'; const st = x.dip ? x.dip.state : null;
      const det = [x.name, x.px ? fmtP(x.px) : '', x.beta != null ? 'β ' + x.beta.toFixed(1) : '', x.y1 != null ? '1y ' + pctS(x.y1) : '', x.off != null ? pctS(x.off) + ' from high' : ''].filter(Boolean).join(' · ');
      const pl = x.dip && x.dip.plan; const plan = pl && pl.kind !== 'Wait' ? (pl.kind === 'Buy zone' ? 'Buy zone ' + fmtP(pl.zoneLo) + '–' + fmtP(pl.zoneHi) : pl.kind + (pl.trig ? ' ' + fmtP(pl.trig) : '')) + (pl.stop ? ' · stop ' + fmtP(pl.stop) : '') + (pl.tgt ? ' · target ' + fmtP(pl.tgt) : '') : '';
      return '<button class="srow hrow" data-open="' + esc(x.sym) + '"><i class="sw" style="background:' + col + '"></i>' + logoHTML(x.sym, 32) + '<span class="rn"><b>' + esc(x.sym) + ' ' + (st ? dipBadge(st) : '') + '</b><small>' + esc(det) + '</small>' + (x.value != null || x.pl ? '<small class="dim">' + (x.value != null ? usd(x.value) : '') + (x.pl ? ' · <span style="color:' + gc(x.pl) + '">' + usd(x.pl) + '</span>' : '') + '</small>' : '') + (plan ? '<small class="dim">' + esc(plan) + '</small>' : '') + '<span class="wbar"><i style="width:' + Math.max(3, x.w / maxW * 100).toFixed(1) + '%;background:' + col + '"></i></span></span><span class="rp"><b>' + (x.w * 100).toFixed(1) + '%</b>' + (x.day != null ? '<small style="color:' + gc(x.day) + '">' + pctS(x.day) + '</small>' : '') + '</span></button>'; }).join('') + '</div>';
    h += '<p class="foot">Read-only analysis. Beta, volatility, correlation and the past-year line use 12 months of daily prices for today’s weights. It shows how the mix behaves; it isn’t a forecast or advice.</p>';
    return h;
  };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-azsrc],[data-azgo]'); if (!t) return; e.stopPropagation(); e.preventDefault();
    if (t.dataset.azsrc) { const id = t.dataset.azsrc; if (id === 'paste') { AZ.src = 'paste'; AZ.res = null; AZ.pasteOpen = true; render(); setTimeout(() => { const el = $('azPaste'); if (el) el.focus(); }, 60); } else { AZ.pasteOpen = false; analyze(id); } }
    else if (t.dataset.azgo) { const el = $('azPaste'); if (el && AZ.showPaste) AZ.paste = el.value; AZ.savedMsg = null; analyze('paste'); }
  }, true);
  document.addEventListener('input', (e) => { if (e.target.id === 'azPaste') AZ.paste = e.target.value; });
  AZ.analyze = analyze;

  /* ---------- position entry form + save ---------- */
  const rowsTxt = (rows) => rows.map((r) => r.kind === 'usd' ? r.sym + ' $' + r.val : r.kind === 'pct' ? r.sym + ' ' + r.val + '%' : r.kind === 'qty' ? r.sym + ' ' + r.val : r.sym).join('\n');
  function addRow() {
    const tEl = $('azT'), aEl = $('azA'); if (!tEl) return; const sym = (tEl.value || '').trim().toUpperCase().replace(/^\$/, ''); const raw = (aEl && aEl.value || '').replace(/[$,%\s]/g, '');
    const hint = $('azHint'); if (!/^[A-Z][A-Z.]{0,5}$/.test(sym)) { if (hint) hint.textContent = 'Enter a ticker, like NVDA.'; tEl.focus(); return; }
    const val = parseFloat(raw); const unit = AZ.unit || 'qty'; const rows = parsePaste(AZ.paste).paste.filter((r) => r.sym !== sym);
    rows.push(isFinite(val) && val > 0 ? { sym: sym, kind: unit, val: val } : { sym: sym, kind: 'eq', val: 1 });
    AZ.paste = rowsTxt(rows); AZ.res = null; AZ.savedMsg = null; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); render(); setTimeout(() => { const e = $('azT'); if (e) e.focus(); }, 60);
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-azadd],[data-azrm],[data-azunit],[data-azpt],[data-azsave],[data-azsc],[data-azsg]'); if (!t) return; e.preventDefault();
    if (t.dataset.azadd) addRow();
    else if (t.dataset.azrm != null) { const rows = parsePaste(AZ.paste).paste; rows.splice(+t.dataset.azrm, 1); AZ.paste = rowsTxt(rows); AZ.res = null; render(); }
    else if (t.dataset.azunit) { AZ.unit = t.dataset.azunit; render(); }
    else if (t.dataset.azpt) { AZ.showPaste = !AZ.showPaste; render(); }
    else if (t.dataset.azsave) { AZ.saving = true; render(); setTimeout(() => { const n = $('azName'); if (n) n.focus(); }, 60); }
    else if (t.dataset.azsc) { AZ.saving = false; render(); }
    else if (t.dataset.azsg) {
      const n = $('azName'), name = n ? n.value.trim() : ''; const msg = $('azSaveMsg'); if (!name) { if (msg) msg.textContent = 'Give it a name first.'; if (n) n.focus(); return; }
      const hs = (AZ.res && AZ.res.hs) || []; const tot = hs.reduce((a, x) => a + (x.w || 0), 0); if (!hs.length || !tot) { if (msg) msg.textContent = 'Analyze first, then save.'; return; }
      const p = { id: 'p' + Date.now().toString(36), name: name, h: hs.map((x) => [x.sym, +(x.w / tot * 100).toFixed(3), x.px || null]), eq: false, created: new Date().toISOString() };
      savePorts(myPorts().concat([p])); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); AZ.saving = false; AZ.savedMsg = 'Saved as “' + name + '” in Portfolios › Mine'; render();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && (e.target.id === 'azT' || e.target.id === 'azA')) { e.preventDefault(); if (e.target.id === 'azT' && $('azA') && !$('azA').value) $('azA').focus(); else addRow(); } if (e.key === 'Enter' && e.target && e.target.id === 'azName') { const b = document.querySelector('[data-azsg]'); if (b) b.click(); } });
  document.addEventListener('input', (e) => { if (e.target && e.target.id === 'azT') { const h = $('azHint'); const v = e.target.value.trim().toUpperCase(); if (h) h.textContent = v ? (symName(v) ? cleanName(symName(v)) : (v.length >= 1 ? 'Not in the list yet; it will still try.' : '')) : ''; } });
})();
