/* Ask Jump stock sheet: why-it's-moving, live monitor, one-tap report.
   Loaded after v2.js. Uses only live data already on the client (quotes, news,
   filings, setup tags). Owner positions never go into prompts. */
(function () {
  const D = document;
  const V = () => window.V2;
  const S = () => V().S;
  const E = (s) => V().E(s);

  const TABS = [['why', "Why it's moving"], ['mon', 'Live monitor'], ['rep', 'Report']];
  const TOPICS = [
    { id: 'insiders', label: 'Insiders' },
    { id: 'plan', label: '10b5-1' },
    { id: 'funds', label: '13F holders' },
    { id: 'analysts', label: 'Analyst changes' },
    { id: 'catalysts', label: 'Catalysts & earnings' },
    { id: 'short', label: 'Short interest / float' },
    { id: 'news', label: 'News' }
  ];

  // Live-monitor thresholds — stated in the UI. Events fire only when a real tick crosses one.
  const TH = {
    rapidPct: 0.5,     // % move
    rapidMs: 30000,    // inside this window
    reversPct: 0.4,    // size of each leg
    reversMs: 120000,  // legs this far apart can still count
    hodPad: 0,         // new high / low vs the session extreme already seen
    volMult: 3,        // vs the median volume increment
    volMin: 8000,      // shares; ignore tiny prints
    cooldownMs: 20000  // same kind+direction
  };

  const st = S().ajs || (S().ajs = { open: false, sym: '', tab: 'why', topics: { news: 1, catalysts: 1 }, q: '', whyOnce: '', log: {}, hist: {}, sess: {}, cd: {}, news: {}, ins: {}, an: {}, status: {} });

  const isOwner = () => !!(window.JT_PRIV || (window.JT_AUTH && JT_AUTH.user && JT_AUTH.user.owner));
  const num = (x, names) => {
    if (!x) return null;
    for (let i = 0; i < names.length; i++) {
      const v = +x[names[i]];
      if (isFinite(v)) return v;
    }
    return null;
  };

  function close() {
    st.open = false; st.sym = ''; st.whyOnce = '';
    if (S().ai && S().ai.host === '#ajsheet') { V().askStop(); S().ai.host = '.askstage'; }
    paint();
  }

  function open(sym) {
    if (sym === '#ask') { close(); location.hash = 'ask'; return; }
    sym = String(sym || '').toUpperCase();
    if (!/^[A-Z.]{1,8}$/.test(sym)) return;
    st.open = true; st.sym = sym; st.tab = st.tab || 'why'; st.whyOnce = '';
    st.q = 'Why is ' + sym + ' moving?';
    if (V().loadSetup) V().loadSetup([sym], V().curSess && V().curSess());
    if (V().fastSnap) V().fastSnap([sym]).catch(() => {});
    loadNews(sym); loadIns(sym); loadAn(sym); loadFunds(); loadCat(); loadShorts();
    paint();
    waitNews(sym, () => { if (st.open && st.sym === sym) startWhy(sym); });
    armTicks();
  }
  function waitNews(sym, fn) {
    const t0 = Date.now();
    const tick = () => {
      const d = st.news[sym];
      if ((d && !d.loading) || Date.now() - t0 > 8000) fn();
      else setTimeout(tick, 200);
    };
    tick();
  }

  function loadNews(sym) {
    if (st.news[sym] && Date.now() - (st.news[sym].t || 0) < 120000) return;
    if (st.news[sym] && st.news[sym].loading) return;
    st.news[sym] = Object.assign({}, st.news[sym], { loading: 1 });
    V().call('get_stock_news', { symbol: sym }).then((r) => {
      const rows = ((r && r.data) || []).filter((n) => n && n.title).slice(0, 8).map((n, i) => ({
        title: n.title, source: n.source || n.source_name || '', url: n.url || n.news_url || '',
        t: Date.parse(n.publish_time || n.pub_time || '') || 0
      }));
      st.news[sym] = { t: Date.now(), rows };
      if (st.open && st.sym === sym) paint();
    }).catch(() => { st.news[sym] = { t: Date.now(), err: 1, rows: [] }; if (st.open && st.sym === sym) paint(); });
  }
  function loadIns(sym) {
    if (st.ins[sym] && Date.now() - (st.ins[sym].t || 0) < 3600000) return;
    if (st.ins[sym] && st.ins[sym].loading) return;
    st.ins[sym] = Object.assign({}, st.ins[sym], { loading: 1 });
    V().call('get_insider_transactions', { symbol: sym, count: 12 }).then((r) => {
      const rows = (r && (r.data || r.transactions || r)) || [];
      st.ins[sym] = { t: Date.now(), rows: Array.isArray(rows) ? rows : [] };
      if (st.open && st.sym === sym) paint();
    }).catch(() => { st.ins[sym] = { t: Date.now(), err: 1, rows: [] }; if (st.open && st.sym === sym) paint(); });
  }
  function loadAn(sym) {
    if (V().loadAnalyst) V().loadAnalyst([sym], 90, 'one:' + sym);
  }
  function loadFunds() { if (V().loadFunds) V().loadFunds(); }
  function loadCat() {
    if (S().cat || S().catLoading) return;
    S().catLoading = 1;
    V().getJ('/catalysts.json').then((j) => { S().cat = j; }).catch(() => { S().cat = { err: 1 }; }).then(() => { S().catLoading = 0; if (st.open) paint(); });
  }
  function loadShorts() { if (V().loadMoney) V().loadMoney('shorts'); }

  function sourcesFor(sym) {
    const src = []; let n = 1;
    const q = S().q[sym];
    if (q && isFinite(q.pct) && isFinite(q.price)) src.push({ n: n++, kind: 'quote', label: sym + ' ' + V().pct(q.pct) + ' at ' + V().pxs(q.price) });
    const setup = V().setupOf && V().setupOf(sym, V().curSess && V().curSess());
    if (setup && setup.tag && V().SETUP[setup.tag]) src.push({ n: n++, kind: 'setup', label: V().SETUP[setup.tag][0] + ' setup tag' });
    const why = S().why && S().why[sym] && S().why[sym].h;
    const news = ((st.news[sym] && st.news[sym].rows) || []).slice();
    if (why && why.title && !news.some((x) => x.title === why.title)) news.unshift({ title: why.title, source: why.source || '', url: why.url || '', t: why.t || 0 });
    news.slice(0, 6).forEach((h) => { src.push({ n: n++, kind: 'news', label: (h.source ? h.source + ': ' : '') + h.title, url: h.url, title: h.title, source: h.source, t: h.t }); });
    return src;
  }

  function whyFallback(sym, src) {
    const q = S().q[sym];
    const name = V().nameOf(sym) || sym;
    const setup = V().setupOf && V().setupOf(sym, V().curSess && V().curSess());
    const tag = setup && setup.tag && V().SETUP[setup.tag] ? V().SETUP[setup.tag][0] : '';
    const quote = src.find((x) => x.kind === 'quote');
    const news = src.filter((x) => x.kind === 'news');
    const parts = [];
    if (q && isFinite(q.pct) && isFinite(q.price)) {
      parts.push(name + ' (' + sym + ') is ' + (q.pct >= 0 ? 'up ' : 'down ') + Math.abs(q.pct).toFixed(2) + '% at ' + V().pxs(q.price) +
        (quote ? ' [' + quote.n + ']' : '') + (tag ? ', tagged ' + tag : '') + '.');
    } else {
      parts.push('Live price for ' + name + ' isn’t on the tape yet.');
    }
    if (news.length) {
      news.slice(0, 3).forEach((h) => {
        parts.push((h.source ? h.source + ' reports' : 'A recent headline says') + ' “' + h.title + '” [' + h.n + '].');
      });
    } else {
      parts.push('No recent headlines were found for ' + sym + ' in the last 36 hours.');
    }
    parts.push('This is the current tape and the news, not a forecast.');
    return parts.join(' ');
  }

  function startWhy(sym, question) {
    const src = sourcesFor(sym);
    const qtext = question || ('Why is ' + sym + ' moving?');
    st.q = qtext;
    S().ai.host = '#ajsheet';
    S().ai.on = S().ai.on == null ? S().ai.on : S().ai.on;
    const listed = src.map((x) => '[' + x.n + '] ' + x.label).join('\n');
    const fallback = whyFallback(sym, src);
    const go = (answer, used) => V().askPlay(qtext, answer, used || src, '#ajsheet');
    if (S().ai.on) {
      S().ai.busy = true; S().ai.streaming = false; S().ai.err = null; S().ai.a = null; S().ai.shown = ''; S().ai.height = 72; S().ai.sources = src;
      paint();
      const prompt = 'Question: ' + qtext + '\n\nLive data for ' + sym + '. Cite a fact with [n] only when you use that numbered source. Do not invent sources, tickers or numbers.\n' + listed + '\n\nReturn {"answer": "2-5 plain sentences using only this data, with [n] citations"}.';
      fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'ask', prompt }) }).then((r) => r.json().then((j) => ({ ok: r.ok, j }))).then(({ ok, j }) => {
        if (!ok) go(fallback, src);
        else go(String((j.payload && (j.payload.answer || j.payload.text)) || fallback), src);
      }).catch(() => go(fallback, src));
    } else {
      go(fallback, src);
    }
  }

  /* ---------- live monitor ---------- */
  function tickEvent(hist, cur, lastEv, now) {
    if (!cur || !isFinite(cur.px)) return null;
    const prev = hist.filter((x) => now - x.t <= TH.rapidMs && x.t < cur.t);
    const older = hist.filter((x) => now - x.t <= TH.reversMs && x.t < cur.t);
    const ref = prev[0];
    if (ref && isFinite(ref.px) && ref.px > 0) {
      const dp = (cur.px / ref.px - 1) * 100;
      if (Math.abs(dp) >= TH.rapidPct) {
        const kind = dp > 0 ? 'rise' : 'drop';
        if (!cooled(cur.sym, kind, now)) return { kind: kind, dir: dp > 0 ? 'up' : 'dn', text: 'Rapid ' + (dp > 0 ? 'rise' : 'drop') + ' · ' + (dp > 0 ? '+' : '') + dp.toFixed(2) + '% in ' + Math.max(1, Math.round((cur.t - ref.t) / 1000)) + 's', px: cur.px, pct: cur.pct, t: now };
      }
    }
    // reversal: last significant move vs the one before it
    const legs = [];
    for (let i = 1; i < older.length; i++) {
      const a = older[i - 1], b = older[i];
      if (!a.px || !b.px) continue;
      const d = (b.px / a.px - 1) * 100;
      if (Math.abs(d) >= TH.reversPct) legs.push({ d, t: b.t, px: b.px });
    }
    if (cur.px && older.length) {
      const last = older[older.length - 1];
      const d = (cur.px / last.px - 1) * 100;
      if (Math.abs(d) >= TH.reversPct) legs.push({ d, t: cur.t, px: cur.px });
    }
    if (legs.length >= 2) {
      const a = legs[legs.length - 2], b = legs[legs.length - 1];
      if (a.d * b.d < 0 && b.t - a.t <= TH.reversMs && !cooled(cur.sym, 'reversal', now)) {
        return { kind: 'reversal', dir: b.d > 0 ? 'up' : 'dn', text: 'Reversal · ' + (b.d > 0 ? 'turned up +' : 'turned down ') + Math.abs(b.d).toFixed(2) + '% after a ' + (a.d > 0 ? '+' : '') + a.d.toFixed(2) + '% leg', px: cur.px, pct: cur.pct, t: now };
      }
    }
    if (isFinite(cur.prevPx) && isFinite(cur.hi) && cur.px >= cur.hi && cur.px > cur.prevPx && (!isFinite(cur.prevHi) || cur.px > cur.prevHi + TH.hodPad) && !cooled(cur.sym, 'hod', now)) {
      return { kind: 'hod', dir: 'up', text: 'New session high · ' + V().pxs(cur.px), px: cur.px, pct: cur.pct, t: now };
    }
    if (isFinite(cur.prevPx) && isFinite(cur.lo) && cur.px <= cur.lo && cur.px < cur.prevPx && (!isFinite(cur.prevLo) || cur.px < cur.prevLo - TH.hodPad) && !cooled(cur.sym, 'lod', now)) {
      return { kind: 'lod', dir: 'dn', text: 'New session low · ' + V().pxs(cur.px), px: cur.px, pct: cur.pct, t: now };
    }
    if (isFinite(cur.vol) && isFinite(cur.prevVol) && cur.vol > cur.prevVol) {
      const inc = cur.vol - cur.prevVol;
      const incs = hist.slice(-8).map((x, i, a) => (i ? x.vol - a[i - 1].vol : 0)).filter((v) => v > 0).sort((a, b) => a - b);
      const mid = incs.length ? incs[Math.floor(incs.length / 2)] : 0;
      if (inc >= TH.volMin && mid > 0 && inc >= mid * TH.volMult && !cooled(cur.sym, 'vol', now)) {
        return { kind: 'vol', dir: cur.pct >= 0 ? 'up' : 'dn', text: 'Volume burst · ' + V().nfmt(inc) + ' shares this tick, ' + (inc / mid).toFixed(1) + '× the recent median', px: cur.px, pct: cur.pct, t: now };
      }
    }
    return null;
  }
  function cooled(sym, kind, now) {
    const k = sym + ':' + kind;
    if (st.cd[k] && now - st.cd[k] < TH.cooldownMs) return true;
    st.cd[k] = now; return false;
  }
  function sampleOf(sym) {
    const q = S().q[sym], x = S().qx && S().qx[sym];
    if (!q || !isFinite(q.price)) return null;
    const hi = num(x, ['high', 'high_price', 'day_high', 'dayHigh', 'highPrice']);
    const lo = num(x, ['low', 'low_price', 'day_low', 'dayLow', 'lowPrice']);
    const vol = num(x, ['volume', 'total_volume', 'totalVolume']);
    return { sym, t: Date.now(), px: +q.price, pct: +q.pct, chg: +q.chg, hi, lo, vol, tt: q.tt || 0 };
  }
  function scan(sym) {
    const cur = sampleOf(sym); if (!cur) return;
    const hist = st.hist[sym] = st.hist[sym] || [];
    const sess = st.sess[sym] = st.sess[sym] || { hi: cur.hi, lo: cur.lo };
    if (isFinite(cur.hi)) sess.hi = isFinite(sess.hi) ? Math.max(sess.hi, cur.hi) : cur.hi;
    if (isFinite(cur.lo)) sess.lo = isFinite(sess.lo) ? Math.min(sess.lo, cur.lo) : cur.lo;
    if (isFinite(cur.px)) { sess.hi = isFinite(sess.hi) ? Math.max(sess.hi, cur.px) : cur.px; sess.lo = isFinite(sess.lo) ? Math.min(sess.lo, cur.px) : cur.px; }
    const last = hist[hist.length - 1];
    if (last && last.tt && cur.tt && cur.tt <= last.tt && last.px === cur.px && last.vol === cur.vol) return;
    cur.prevPx = last ? last.px : null;
    cur.prevVol = last ? last.vol : null;
    cur.prevHi = last && isFinite(last.seenHi) ? last.seenHi : (isFinite(sess.hi) ? sess.hi : cur.hi);
    cur.prevLo = last && isFinite(last.seenLo) ? last.seenLo : (isFinite(sess.lo) ? sess.lo : cur.lo);
    cur.hi = sess.hi; cur.lo = sess.lo;
    const ev = tickEvent(hist, cur, (st.log[sym] || [])[0], Date.now());
    cur.seenHi = sess.hi; cur.seenLo = sess.lo;
    hist.push(cur); if (hist.length > 80) hist.splice(0, hist.length - 80);
    if (ev) {
      const log = st.log[sym] = st.log[sym] || [];
      log.unshift(ev); if (log.length > 40) log.length = 40;
      if (st.open && st.sym === sym && st.tab === 'mon') paint();
    }
  }
  let tickT = 0;
  function armTicks() {
    if (tickT) return;
    tickT = setInterval(() => { if (!st.open || !st.sym) return; scan(st.sym); }, 1000);
  }

  /* ---------- report ---------- */
  function topicStatus(id, sym) {
    if (id === 'insiders' || id === 'plan') {
      const d = st.ins[sym];
      if (!d) return { ok: false, label: 'loading' };
      if (d.err) return { ok: false, label: 'not connected' };
      if (id === 'plan') {
        const n = (d.rows || []).filter((r) => r.plan || r.aff10b51 || r['10b5']).length;
        return { ok: true, label: n ? n + ' planned sales' : 'none in the latest Form 4s', n, rows: d.rows };
      }
      return { ok: true, label: (d.rows || []).length ? d.rows.length + ' Form 4s' : 'no recent Form 4s', rows: d.rows };
    }
    if (id === 'funds') {
      const j = S().funds;
      if (!j) return { ok: false, label: 'loading' };
      if (j.err) return { ok: false, label: 'not connected' };
      const hits = [];
      (j.funds || []).forEach((f) => {
        (f.h || f.holdings || []).forEach((h) => {
          const t = Array.isArray(h) ? h[0] : (h.s || h.ticker || h.symbol);
          if (t === sym) hits.push({ fund: f.fund || f.name, w: Array.isArray(h) ? +h[2] : +h.w, filed: f.filed });
        });
      });
      hits.sort((a, b) => (b.w || 0) - (a.w || 0));
      return { ok: true, label: hits.length ? hits.length + ' 13F holders' : 'not in the latest 13F snapshot', rows: hits.slice(0, 8) };
    }
    if (id === 'analysts') {
      const an = S().an && S().an['one:' + sym];
      if (!an) return { ok: false, label: 'loading' };
      if (an.err) return { ok: false, label: 'not connected' };
      const rows = (an.p && an.p.data) || an.data || [];
      return { ok: true, label: rows.length ? rows.length + ' actions' : 'no recent analyst actions', rows: rows.slice(0, 8) };
    }
    if (id === 'catalysts') {
      const cat = S().cat;
      const earn = S().earn;
      if (!cat && !earn) return { ok: false, label: 'loading' };
      if (cat && cat.err && !earn) return { ok: false, label: 'not connected' };
      const rows = ((cat && cat.catalysts) || []).filter((c) => c && c.ticker === sym);
      const er = ((earn && (earn.rows || earn.data || earn)) || []);
      const mine = Array.isArray(er) ? er.filter((e) => (e.symbol || e.s) === sym) : [];
      return { ok: true, label: (rows.length + mine.length) ? (rows.length + mine.length) + ' items' : 'none upcoming on the list', rows: rows.concat(mine).slice(0, 8) };
    }
    if (id === 'short') {
      const setup = V().setupOf && V().setupOf(sym, V().curSess && V().curSess());
      const f = (setup && setup.facts) || {};
      const shorts = S().money && S().money.shorts;
      const row = shorts && !shorts.err && (shorts.rows || []).find((r) => r.ticker === sym);
      if (f.si == null && f.float == null && f.siShares == null && !row) {
        if (setup && setup.err) return { ok: false, label: 'not connected' };
        if (shorts && shorts.err && !setup) return { ok: false, label: 'not connected' };
        return { ok: true, label: 'not in the latest short-interest snapshot' };
      }
      return { ok: true, label: (f.si != null ? f.si.toFixed(1) + '% of float short' : (row ? (+row.si).toFixed(1) + '% of float short' : 'float ' + (f.float != null ? V().nfmt(f.float) : 'n/a'))), facts: f, row };
    }
    if (id === 'news') {
      const d = st.news[sym];
      if (!d) return { ok: false, label: 'loading' };
      if (d.err) return { ok: false, label: 'not connected' };
      return { ok: true, label: d.rows && d.rows.length ? d.rows.length + ' headlines' : 'no recent headlines', rows: d.rows || [] };
    }
    return { ok: false, label: 'not connected' };
  }

  function reportText(sym, topics) {
    const name = V().nameOf(sym) || sym;
    const src = []; let n = 1; const parts = [];
    const add = (label, url, sentence) => { const item = { n: n++, label, url }; src.push(item); parts.push(sentence.replace('§', '[' + item.n + ']')); };
    topics.forEach((id) => {
      const t = topicStatus(id, sym);
      if (!t.ok) return;
      if (id === 'news') (t.rows || []).slice(0, 3).forEach((h) => add((h.source ? h.source + ': ' : '') + h.title, h.url, (h.source ? h.source + ' reports' : 'Headline') + ' “' + h.title + '” §.'));
      if (id === 'insiders') {
        const rows = t.rows || [];
        if (!rows.length) parts.push('No recent open-market Form 4s for ' + name + '.');
        else {
          const r = rows[0];
          add('Form 4 · ' + (r.name || r.filer || 'insider'), r.url, (r.name || 'An insider') + ' ' + (r.code === 'P' || /buy/i.test(r.type || '') ? 'bought' : r.code === 'S' || /sell/i.test(r.type || '') ? 'sold' : (r.type || 'filed')) + (r.shares ? ' ' + V().nfmt(r.shares) + ' shares' : '') + (r.date ? ' on ' + r.date : '') + ' §.');
        }
      }
      if (id === 'plan') {
        const rows = (t.rows || []).filter((r) => r.plan || r.aff10b51 || r['10b5']);
        if (!rows.length) parts.push('No 10b5-1 planned sales in the latest Form 4s.');
        else add('10b5-1 · ' + (rows[0].name || 'insider'), rows[0].url, (rows[0].name || 'An insider') + ' filed a 10b5-1 planned sale' + (rows[0].date ? ' dated ' + rows[0].date : '') + ' §.');
      }
      if (id === 'funds') {
        if (!(t.rows || []).length) parts.push(name + ' is not in the latest 13F snapshot on file.');
        else {
          const top = t.rows[0];
          add((top.fund || 'A fund') + ' 13F', null, (top.fund || 'A 13F filer') + ' holds ' + name + (isFinite(top.w) && top.w ? ' at ' + top.w.toFixed(1) + '% of the reported book' : '') + (top.filed ? ', filed ' + top.filed : '') + ' §.');
        }
      }
      if (id === 'analysts') {
        const r = (t.rows || [])[0];
        if (!r) parts.push('No recent analyst actions for ' + name + '.');
        else add((r.firm || 'Analyst') + ' ' + (r.action || r.to || ''), null, (r.firm || 'An analyst') + ' ' + (r.action || 'updated') + ' ' + name + (r.ptFrom || r.old_target ? ' from ' + V().pxs(r.ptFrom || r.old_target) : '') + (r.ptTo || r.new_target ? ' to ' + V().pxs(r.ptTo || r.new_target) : '') + ' §.');
      }
      if (id === 'catalysts') {
        const r = (t.rows || [])[0];
        if (!r) parts.push('No upcoming catalysts or earnings for ' + name + ' on the list.');
        else add(r.title || r.name || 'Catalyst', r.source_url, (r.title || r.name || 'A listed catalyst') + (r.date ? ' on ' + r.date : '') + (r.eps_estimate ? ' · EPS est. $' + (+r.eps_estimate).toFixed(2) : '') + ' §.');
      }
      if (id === 'short') {
        const f = t.facts || {}; const row = t.row;
        const si = f.si != null ? f.si : (row ? +row.si : null);
        const fl = f.float;
        if (si == null && fl == null) parts.push('Short interest and float are not in the latest snapshot for ' + name + '.');
        else add('Short interest / float', null, name + (fl != null ? ' has a ' + V().nfmt(fl) + ' share float' : '') + (si != null ? (fl != null ? ' and ' : ' has ') + si.toFixed(1) + '% of float sold short' : '') + (f.siDate ? ' as of ' + (V().shortD ? V().shortD(f.siDate) : f.siDate) : '') + ' §.');
      }
    });
    if (!parts.length) parts.push('None of the selected sources have data for ' + name + ' right now.');
    parts.push('Compiled from the connected sources above. Not financial advice.');
    return { text: parts.join(' '), sources: src };
  }

  function runReport(sym) {
    const ids = TOPICS.map((t) => t.id).filter((id) => st.topics[id]);
    const { text, sources } = reportText(sym, ids);
    st.q = 'Report · ' + ids.map((id) => (TOPICS.find((t) => t.id === id) || {}).label).join(', ');
    S().ai.host = '#ajsheet';
    V().askPlay(st.q, text, sources, '#ajsheet');
  }

  /* ---------- paint ---------- */
  function headerHTML(sym) {
    const q = S().q[sym];
    const name = V().nameOf(sym) || '';
    const setup = V().setupChip ? V().setupChip(sym, V().curSess && V().curSess()) : '';
    return '<div class="ajs-head">' +
      '<button type="button" class="ajs-x" data-ajx aria-label="Close"><span aria-hidden="true">×</span></button>' +
      '<div class="ajs-id">' + (V().tl ? V().tl(sym, 40) : '') +
      '<div class="nm"><b>' + E(sym) + '</b><small>' + E(name) + '</small></div></div>' +
      (q ? V().qv(q.price, q.chg, q.pct) : V().qv(null)) +
      '</div>' + (setup ? '<div class="ajs-setup">' + setup + '</div>' : '');
  }

  function tabBar() {
    return '<div class="ajs-tabs" role="tablist">' + TABS.map((t) =>
      '<button type="button" class="ajs-tab' + (st.tab === t[0] ? ' on' : '') + '" role="tab" aria-selected="' + (st.tab === t[0] ? 'true' : 'false') + '" data-ajtab="' + t[0] + '">' + E(t[1]) + '</button>'
    ).join('') + '</div>';
  }

  function whyStage(sym) {
    const ai = S().ai || {};
    const shown = (ai.host === '#ajsheet') && (ai.streaming || ai.busy || ai.a);
    if (ai.err && ai.host === '#ajsheet') return '<div class="err">' + E(ai.err) + '</div>';
    if (!shown) return '<div class="kick">Jump</div><p class="ajhint">The summary streams here.</p>';
    const cur = !!(ai.busy || ai.streaming);
    const h = ai.height ? ' style="min-height:' + ai.height + 'px"' : '';
    const shownText = ai.streaming || ai.busy ? ai.shown : (ai.a || '');
    return '<div class="kick">Jump</div><div class="ajsum" aria-live="polite" aria-busy="' + (cur ? 'true' : 'false') + '"' + h + '>' + V().askBodyHTML(shownText, cur, ai.sources) + '</div>';
  }

  function monStage(sym) {
    const log = st.log[sym] || [];
    const note = '<p class="ajth">Thresholds: a rapid rise or drop is ≥ ' + TH.rapidPct.toFixed(1) + '% inside ' + (TH.rapidMs / 1000) + 's; a reversal is two opposite legs of ≥ ' + TH.reversPct.toFixed(1) + '% within ' + (TH.reversMs / 1000) + 's; a new session high or low vs the tape already seen; a volume burst is ≥ ' + TH.volMult + '× the median increment and at least ' + V().nfmt(TH.volMin) + ' shares. Only real crossings are listed. Mint is up, coral is down. Prices refresh about every 5 seconds — there is no exchange stream on this web server.</p>';
    if (!log.length) return note + '<p class="ajhint">Watching live ticks. Events show up here when a threshold is crossed.</p>';
    return note + '<ol class="ajlog">' + log.map((e) => {
      const t = new Date(e.t).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit' });
      return '<li class="' + (e.dir === 'up' ? 'up' : 'dn') + '"><span class="ajlt">' + E(t) + ' ET</span><b>' + E(e.text) + '</b>' + (isFinite(e.px) ? '<small>' + V().pxs(e.px) + (isFinite(e.pct) ? ' · ' + V().pct(e.pct) : '') + '</small>' : '') + '</li>';
    }).join('') + '</ol>';
  }

  function pillsHTML(sym) {
    return '<div class="ajrepbar"><div class="ajpills">' + TOPICS.map((t) => {
      const s = topicStatus(t.id, sym);
      const on = !!st.topics[t.id];
      const miss = !s.ok && s.label === 'not connected';
      return '<button type="button" class="ajpill' + (on ? ' on' : '') + (miss ? ' off' : '') + '" data-ajtopic="' + t.id + '" aria-pressed="' + (on ? 'true' : 'false') + '"' + (miss ? ' disabled' : '') + '>' + E(t.label) + '<small>' + E(s.label) + '</small></button>';
    }).join('') + '</div>' +
      '<button type="button" class="btn pri" id="ajrep"' + (S().ai.busy || S().ai.streaming ? ' disabled' : '') + '>' + (V().ic ? V().ic('spark', 16, 2.1) : '') + ' Make report</button></div>';
  }
  function repStage(sym) {
    const ai = S().ai || {};
    const shown = ai.host === '#ajsheet' && (ai.streaming || ai.busy || ai.a);
    return shown ? whyStage(sym) : '<p class="ajhint">Pick topics, then make a one-tap report from the connected sources. Anything marked “not connected” is left out.</p>';
  }

  function dockHTML() {
    const busy = !!(S().ai && (S().ai.busy || S().ai.streaming) && S().ai.host === '#ajsheet');
    return '<div class="askdock ajs-dock">' +
      '<label class="asklbl" for="ajq">Ask Jump anything</label>' +
      '<textarea id="ajq" class="askq" rows="2" maxlength="400" placeholder="Ask about this stock">' + E(st.q || '') + '</textarea>' +
      '<button type="button" class="btn pri" id="ajgo"' + (busy ? ' disabled' : '') + '>' + (V().ic ? V().ic('spark', 18, 2.1) : '') + (busy ? (S().ai.streaming ? 'Generating…' : 'Thinking…') : 'Ask Jump') + '</button></div>';
  }

  function html() {
    if (!st.open || !st.sym) return '';
    const sym = st.sym;
    const stage = st.tab === 'mon' ? monStage(sym) : st.tab === 'rep' ? repStage(sym) : whyStage(sym);
    return '<div class="ajscrim" data-ajx tabindex="-1"></div>' +
      '<aside id="ajsheet" class="ajsheet" role="dialog" aria-modal="true" aria-label="Ask Jump">' +
      '<div class="ajs-handle" aria-hidden="true"></div>' +
      headerHTML(sym) + tabBar() +
      '<div class="ajs-stage">' + stage + '</div>' +
      (st.tab === 'rep' ? pillsHTML(sym) : '') +
      (st.tab === 'mon' ? '' : '<p class="note askdisc">From live quotes, setup tags and headlines. Not financial advice.</p>') +
      dockHTML() + '</aside>';
  }

  function paint() {
    let root = D.getElementById('ajroot');
    if (!root) { root = D.createElement('div'); root.id = 'ajroot'; D.body.appendChild(root); }
    const keep = D.activeElement && D.activeElement.id === 'ajq' ? D.activeElement.value : null;
    const start = D.activeElement && D.activeElement.id === 'ajq' ? D.activeElement.selectionStart : null;
    root.innerHTML = html();
    D.documentElement.classList.toggle('ajs-open', !!(st.open && st.sym));
    if (keep != null) {
      const el = D.getElementById('ajq');
      if (el) { el.value = keep; st.q = keep; if (start != null) try { el.setSelectionRange(start, start); } catch (e) {} }
    }
  }

  function afterRender() {
    if (st.open && st.sym) {
      loadNews(st.sym); loadIns(st.sym); loadAn(st.sym); loadFunds(); loadCat(); loadShorts();
      paint();
      if (S().ai && S().ai.host === '#ajsheet' && (S().ai.streaming || S().ai.busy)) V().askPaintLive();
    } else if (D.getElementById('ajroot')) paint();
  }

  D.addEventListener('click', (e) => {
    const t = e.target;
    const btn = t.closest && t.closest('[data-aj]');
    if (btn) { e.preventDefault(); e.stopPropagation(); open(btn.getAttribute('data-aj')); return; }
    if (t.closest && t.closest('[data-ajx]')) { e.preventDefault(); close(); return; }
    const tab = t.closest && t.closest('[data-ajtab]');
    if (tab) { e.preventDefault(); st.tab = tab.getAttribute('data-ajtab'); if (st.tab === 'why' && st.sym && !(S().ai && S().ai.host === '#ajsheet' && (S().ai.a || S().ai.streaming))) startWhy(st.sym); paint(); return; }
    const pill = t.closest && t.closest('[data-ajtopic]');
    if (pill && !pill.disabled) { e.preventDefault(); const id = pill.getAttribute('data-ajtopic'); st.topics[id] = st.topics[id] ? 0 : 1; paint(); return; }
    if (t.closest && t.closest('#ajrep')) { e.preventDefault(); if (st.sym) runReport(st.sym); return; }
    if (t.closest && t.closest('#ajgo')) {
      e.preventDefault();
      const el = D.getElementById('ajq'); const q = el && el.value;
      st.q = q || st.q;
      if (st.sym) { st.tab = 'why'; startWhy(st.sym, st.q); paint(); }
      return;
    }
  });
  D.addEventListener('input', (e) => { if (e.target && e.target.id === 'ajq') st.q = e.target.value; });
  D.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && st.open) { e.preventDefault(); close(); return; }
    if (e.key === 'Enter' && !e.shiftKey && e.target && (e.target.id === 'askq' || e.target.id === 'ajq')) {
      e.preventDefault();
      if (e.target.id === 'ajq') { const b = D.getElementById('ajgo'); if (b) b.click(); }
      else { const b = D.getElementById('askgo'); if (b) b.click(); }
    }
  });

  // long-press on Movers or watchlist rows (the icon is the obvious tap; this is the hidden affordance)
  let lpT = 0, lpX = 0, lpY = 0, lpSym = '';
  const rowSym = (el) => {
    if (!el) return '';
    if (el.getAttribute && el.getAttribute('data-mvx')) return el.getAttribute('data-mvx');
    const ico = el.querySelector && el.querySelector('[data-aj]');
    return (ico && ico.getAttribute('data-aj')) || '';
  };
  D.addEventListener('pointerdown', (e) => {
    const row = e.target.closest && e.target.closest('[data-mvx], .wrow, .hlrow');
    if (!row || (e.target.closest && e.target.closest('[data-aj], .xrm, a.mvgo, input, textarea'))) return;
    const sym = rowSym(row); if (!sym || sym === '#ask') return;
    lpSym = sym; lpX = e.clientX; lpY = e.clientY;
    clearTimeout(lpT);
    lpT = setTimeout(() => { lpT = 0; open(lpSym); }, 480);
  });
  const cancelLp = (e) => {
    if (!lpT) return;
    if (e && e.type === 'pointermove' && Math.hypot((e.clientX || 0) - lpX, (e.clientY || 0) - lpY) < 12) return;
    clearTimeout(lpT); lpT = 0;
  };
  ['pointerup', 'pointercancel', 'pointermove'].forEach((ev) => D.addEventListener(ev, cancelLp, { passive: true }));

  window.V2Ask = {
    open, close, afterRender, paint, whyFallback, sourcesFor, tickEvent, topicStatus, reportText, thresholds: TH, state: st
  };
})();
