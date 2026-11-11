/* jumptrade. Jump check: a quick, honest read on one stock. The call, the biggest risk, the plan and what would change it,
   plus red flags from real data. All instant and rule-based (same levels as the stock page); follow-up questions use AI when it's on. */
(function () {
  const JC = window.JC = { open: {}, chat: {}, busy: {} };
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const d$ = (v) => v == null || !isFinite(v) ? '—' : '$' + (v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v < 1 ? v.toFixed(3) : v.toFixed(2));
  const big = (v) => v >= 1e12 ? (v / 1e12).toFixed(2) + 'T' : v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : String(Math.round(v || 0));
  const usd = (v) => '$' + big(v);

  // everything the read is built from, gathered from what the stock page already loaded
  function facts(sym, main, ext) {
    const d = (typeof S !== 'undefined' && S.d[sym]) || {}; const sn = d.snap || {};
    const price = main && main.price, pct = main && main.pct, chg = main && main.chg;
    const mc = +sn.market_value || 0, vol = +sn.volume || (main && main.vol) || 0, hi52 = +sn.fifty_two_wk_high || 0, lo52 = +sn.fifty_two_wk_low || 0;
    const eps = sn.eps_ttm != null && sn.eps_ttm !== '' ? +sn.eps_ttm : null;
    const v = window.VERD ? VERD.calc(sym, main) : null;
    const rv = window.ENR && ENR.rvol ? ENR.rvol(sym, vol) : null;
    const news = window.ENR && ENR.whyItem ? ENR.whyItem(sym) : null;
    const newsLoaded = !!(S.news && S.news[sym]);
    const halted = (sn.trade_status === 'HLT') || (typeof isHalted === 'function' && isHalted(sym));
    const e = d.earn && d.earn[0]; let earnDays = null; if (e) { const dt = e.release_date || e.date || e.report_date; if (dt) earnDays = Math.round((Date.parse(dt) - Date.now()) / 86400000); }
    return { sym, name: (d.prof && d.prof.name) || (typeof symName === 'function' ? symName(sym) : '') || sym, price, pct, chg, ext, mc, vol, hi52, lo52, eps, v, rv, news, newsLoaded, halted, earnDays, industry: d.prof && d.prof.industries && d.prof.industries[0] };
  }

  // red flags: plain facts, worst first
  function flags(f) {
    const F = [];
    if (f.halted) F.push(['r', 'Trading halted', 'Trading in it is halted right now. You can’t get in or out until it reopens.']);
    if (f.hi52 && f.price && f.hi52 / f.price > 60) F.push(['r', 'Likely reverse split', 'Its 52-week high is ' + d$(f.hi52) + ' against ' + d$(f.price) + ' now. That usually means a big reverse split, a common sign of a struggling company.']);
    if (f.mc && f.mc < 50e6) F.push(['r', 'Tiny company · ' + usd(f.mc), 'The whole company is worth about ' + usd(f.mc) + '. Small companies can swing wildly and often sell new shares into spikes.']);
    if (f.pct != null && f.pct >= 30 && f.newsLoaded && !f.news) F.push(['r', 'No news behind the move', 'Up ' + Math.round(f.pct) + '% with no company headline found. Moves like that are often traders chasing momentum, and they can reverse fast.']);
    if (f.price && f.price < 1) F.push(['y', 'Under $1', 'It trades under $1, which can lead to delisting warnings and more reverse splits.']);
    if (f.eps != null && f.eps < 0) F.push(['y', 'Losing money', 'The company is losing money, so it may need to raise cash by selling shares.']);
    if (f.pct != null && f.pct >= 40) F.push(['y', 'Already up ' + Math.round(f.pct) + '%', 'Most of today’s move may already be done. Chasing late is where people get hurt.']);
    if (f.earnDays != null && f.earnDays >= 0 && f.earnDays <= 7) F.push(['y', f.earnDays === 0 ? 'Earnings today' : 'Earnings in ' + f.earnDays + ' days', 'Earnings can move the price sharply either way.']);
    const below = f.v && f.v.cons && f.v.cons.find((c) => /Downtrend|Below its 50-day/.test(c)); if (below) F.push(['y', /Downtrend/.test(below) ? 'In a downtrend' : 'Below its 50-day avg', below + '.']);
    return F;
  }

  // the quick read: call + four lines, all from the same levels as the stock page
  function read(f) {
    const v = f.v; if (!v) return null;
    const F = flags(f); const red = F.filter((x) => x[0] === 'r');
    let call = v.kind === 'buy' ? 'BUY' : v.kind === 'avoid' ? 'AVOID' : 'WATCH';
    if (call === 'BUY' && red.length) call = 'WATCH'; // never a clean buy with a red flag on it
    if (f.halted) call = 'WATCH';
    const sub = call === 'BUY' ? 'The setup lines up' : call === 'AVOID' ? 'Odds aren’t on your side' : red.length ? 'Big move, bigger risk' : 'Close, but not yet';
    const moved = f.pct != null ? (f.pct >= 0 ? 'Up ' : 'Down ') + Math.abs(f.pct).toFixed(1) + '% (' + (f.chg >= 0 ? '+$' : '−$') + Math.abs(f.chg || 0).toFixed(f.price >= 1 ? 2 : 4) + ')' : 'Price ' + d$(f.price);
    const what = moved + (f.vol ? ' on ' + big(f.vol) + ' shares' + (f.rv && f.rv >= 1.5 ? ', ' + (f.rv >= 10 ? Math.round(f.rv) : f.rv.toFixed(1)) + '× normal volume' : '') : '') + '.' +
      (f.news ? ' News: ' + f.news.title.replace(/\s+/g, ' ').slice(0, 110) + '.' : '') + (f.ext && f.ext.price ? ' After hours: ' + d$(f.ext.price) + ' (' + (f.ext.pct >= 0 ? '+' : '') + (f.ext.pct || 0).toFixed(1) + '%).' : '');
    const risk = red.length ? red[0][2] : F.length ? F[0][2] : (v.cons[0] ? v.cons[0] + '.' : 'Nothing major stands out. The usual risk: the market turns and drags it down.');
    let plan, change;
    if (call === 'AVOID') { plan = 'Stay out for now.'; change = 'It gets back above ' + d$(v.entry) + ' and holds.'; }
    else if (call === 'BUY') { plan = (/above/i.test(v.line) ? 'Buy above ' : 'Buy near ') + d$(v.entry) + '. Stop ' + d$(v.stop) + ', target ' + d$(v.target) + '.'; change = 'It closes below ' + d$(v.stop) + ': the idea is wrong.'; }
    else { plan = 'Only above ' + d$(v.entry) + (red.length ? ', and small size' : '') + '. Stop ' + d$(v.stop) + ', target ' + d$(v.target) + '.'; change = 'It breaks below ' + d$(v.stop) + ': the setup has failed.'; }
    return { call, sub, what, risk, plan, change, F, levels: { entry: v.entry, stop: v.stop, target: v.target } };
  }

  JC.button = function (sym) { return '<button class="jcBtn' + (JC.open[sym] ? ' on' : '') + '" data-jc="' + E(sym) + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z"/></svg>Jump check</button>'; };

  JC.reveal = {};
  const SCAN = ['Price and trend', 'Volume vs normal', 'News and catalysts', 'Company size and risk', 'Your plan levels'];
  JC.card = function (sym, main, ext) {
    if (!JC.open[sym]) return '';
    const f = facts(sym, main, ext); const r = read(f);
    const now = Date.now(); const rv = JC.reveal[sym] || 0;
    const head = '<div class="jcHead"><span class="jcOrb"><i></i></span><span class="jcHt"><b>JUMP CHECK</b><small><em class="jcLive"></em>' + (now < rv ? 'Analyzing ' + E(sym) + '…' : 'Live · updates with the price') + '</small></span></div>';
    if (now < rv) { // the scan: each check ticks off in turn
      const step = Math.floor((1 - (rv - now) / 1600) * SCAN.length);
      return '<div class="jc jcGlow scanning">' + head + '<div class="jcScan">' + SCAN.map((t, i) => '<div class="jcStep' + (i < step ? ' done' : i === step ? ' on' : '') + '"><i>' + (i < step ? '✓' : '') + '</i>' + t + '</div>').join('') + '</div><div class="jcBar"><i style="width:' + Math.min(100, Math.round((1 - (rv - now) / 1600) * 100)) + '%"></i></div></div>';
    }
    const fresh = now - rv < 1800; 
    if (!r) return '<div class="jc"><div class="jcCap"><i></i>JUMP CHECK</div><div class="skel"></div><div class="skel" style="width:70%"></div><p class="jcNote">Loading price history…</p></div>';
    const col = r.call === 'BUY' ? '#5EE0A0' : r.call === 'AVOID' ? '#FF8A8A' : '#F2C27A';
    const row = (k, t) => '<div class="jcRow"><em>' + k + '</em><p>' + E(t) + '</p></div>';
    const sc = f.v ? f.v.score : 0; const lit = Math.max(1, Math.min(r.call === 'BUY' ? 5 : r.call === 'WATCH' ? 3 : 2, Math.round(sc + 3)));
    const meter = '<div class="jcMeter" title="How many signals line up">' + [1, 2, 3, 4, 5].map((i) => '<i' + (i <= lit ? ' style="background:' + col + ';box-shadow:0 0 8px ' + col + '88"' : '') + '></i>').join('') + '<span>' + (lit >= 4 ? 'Strong' : lit === 3 ? 'Mixed' : 'Weak') + ' setup</span></div>';
    let h = '<div class="jc jcGlow' + (fresh ? ' jcIn' : '') + '" style="--jc:' + col + '">' + head + '<div class="jcCall"><b class="jcPill" style="color:' + col + ';border-color:' + col + '66;background:' + col + '14;box-shadow:0 0 24px ' + col + '33">' + r.call + '</b><span>' + E(r.sub) + '</span></div>' + meter +
      row('WHAT’S UP', r.what) + row('BIGGEST RISK', r.risk) + row('THE PLAN', r.plan) + row('CHANGES IF', r.change);
    if (r.F.length) h += '<div class="jcCap" style="margin-top:12px"><i style="background:#FF8A8A"></i>RED FLAGS</div><div class="jcFlags">' + r.F.map((x) => '<span class="jcF ' + x[0] + '">' + E(x[1]) + '</span>').join('') + '</div>';
    // follow-ups
    const C = JC.chat[sym] || [];
    h += '<div class="jcCap" style="margin-top:14px"><i></i>ASK A FOLLOW-UP</div>' + C.map((m) => m.q ? '<div class="jcQ">' + E(m.q) + '</div>' : '<div class="jcA">' + E(m.a).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') + '</div>').join('') +
      (JC.busy[sym] ? '<div class="jcA dim">Thinking…</div>' : '') +
      '<div class="jcChips">' + ['Why is it moving?', 'Will they sell shares?', 'Safer entry?', 'What would make this a buy?'].filter((q) => !C.some((m) => m.q === q)).slice(0, 3).map((q) => '<button class="jcChip" data-jcq="' + E(q) + '" data-jcs="' + E(sym) + '">' + E(q) + '</button>').join('') + '</div>' +
      '<form class="jcAsk" data-jcform="' + E(sym) + '"><input name="q" maxlength="200" autocomplete="off" placeholder="Ask about ' + E(sym) + '…"><button aria-label="Send">›</button></form>' +
      '<p class="jcNote">Built from today’s price, volume and company data. Ideas, not advice.</p></div>';
    JC._f = JC._f || {}; JC._f[sym] = { f, r };
    return h;
  };

  async function ask(sym, q) {
    q = String(q || '').trim().slice(0, 200); if (!q || JC.busy[sym]) return;
    const C = JC.chat[sym] = JC.chat[sym] || []; C.push({ q }); JC.busy[sym] = 1; if (typeof render === 'function') render();
    const x = (JC._f && JC._f[sym]) || {}; const f = x.f || {}, r = x.r || {};
    const dd = ((S.d[sym] || {}).daily || []).filter((b) => +b.close > 0); const cl = dd.map((b) => +b.close); const av = (a) => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null;
    const sn = (S.d[sym] || {}).snap || {}; const nws = ((S.news && S.news[sym] && S.news[sym].items) || []).slice(0, 5).map((n) => ({ title: n.title, source: n.source || '', when: n.publish_time }));
    const lv = dd.length >= 20 ? { day_high: +sn.high || null, day_low: +sn.low || null, prev_close: +sn.pre_close || null, high_20d: Math.max.apply(null, dd.slice(0, 20).map((b) => +b.high)), low_20d: Math.min.apply(null, dd.slice(0, 20).map((b) => +b.low)), low_10d: Math.min.apply(null, dd.slice(0, 10).map((b) => +b.low)), avg_20d: av(cl.slice(0, 20)), avg_50d: av(cl.slice(0, 50)), avg_200d: cl.length >= 150 ? av(cl.slice(0, 200)) : null } : null;
    const data = { symbol: sym, name: f.name, levels: lv, recent_headlines: nws, analyst_target: (S.d[sym] || {}).tgt ? +(S.d[sym].tgt.mean) || null : null, verdict_reasons: f.v ? { for: f.v.pros, against: f.v.cons } : null, industry: f.industry, price: f.price, change_pct_today: f.pct, change_usd_today: f.chg, after_hours: f.ext && f.ext.price ? { price: f.ext.price, pct: f.ext.pct } : null, volume: f.vol, relative_volume: f.rv, market_cap: f.mc, eps_ttm: f.eps, high_52w: f.hi52, low_52w: f.lo52, halted: !!f.halted, earnings_in_days: f.earnDays,
      news_headline: f.news ? f.news.title : (f.newsLoaded ? 'none found today' : 'not loaded'), jump_check_call: r.call, plan_levels: r.levels, red_flags: (r.F || []).map((y) => y[1]) };
    const hist = C.slice(-7, -1).map((m) => (m.q ? 'User: ' + m.q : 'You: ' + m.a)).join('\n');
    const prompt = 'You are jumptrade\'s Jump check analyst answering a trader\'s follow-up about one stock. STYLE: lead with a direct, confident answer in the first sentence, like a sharp trading desk analyst. Never open with what you don\'t know, never say "my data", never say "I can\'t advise". If the cause of a move isn\'t in the headlines, say so in a few words and give the most useful read of what the price and volume show. For entry questions, point to concrete levels from DATA.levels (support like the 10-day low, 20/50-day average, prior close; resistance like the 20-day high) and say what each would mean ("a pullback toward $X, its 20-day average, is a lower-risk spot"). Stay consistent with the Jump check call and levels. Use ONLY numbers in DATA; never invent facts or news. Plain English, 50-90 words, a few **bold** key numbers. No guarantees.\n\nDATA: ' + JSON.stringify(data) + (hist ? '\n\nEARLIER IN THIS CHAT:\n' + hist : '') + '\n\nQUESTION: ' + q + '\n\nReturn JSON only: {"answer": "..."} (you may use **bold** for a few key words).';
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'ask', prompt }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 503) C.push({ a: 'Follow-up questions aren’t switched on yet. The read above is live and built from real data.' });
      else if (res.status === 429) C.push({ a: 'You’ve hit today’s question limit. It resets tomorrow.' });
      else if (!res.ok || !j.payload) C.push({ a: 'Couldn’t get an answer right now. Try again in a moment.' });
      else C.push({ a: String(j.payload.answer || '').slice(0, 900) || 'No answer came back. Try asking another way.' });
    } catch (e) { C.push({ a: 'Couldn’t reach the server.' }); }
    JC.busy[sym] = 0; if (typeof render === 'function') render();
  }

  // home widget: check any ticker, with today's biggest movers one tap away
  // home: the Jump check engine. A live readout cycling through today's movers, with what the scanner found.
  const MWV = { real: ['#5EE0A0', 'Real catalyst'], warn: ['#F2C27A', 'Careful'], weak: ['#FF8A8A', 'Weak move'], halt: ['#FF8A8A', 'Halted'], news: ['#8CB8E0', 'In the news'], nonews: ['#AEB9C8', 'No news'] };
  JC.reel = [];
  JC.homeCard = function () {
    const rows = (typeof rowsCache !== 'undefined' && rowsCache.length ? rowsCache : (typeof moverRows === 'function' ? moverRows() : [])).filter((r) => r.price >= 1 && r.pct > 0).slice(0, 12);
    const W = (typeof S !== 'undefined' && S.mwhy) || {};
    JC.reel = rows.map((r) => { const w = W[r.sym]; const m = w ? MWV[w.v] || MWV.news : null; return { sym: r.sym, pct: r.pct, price: r.price, tag: m ? m[1] : (r.pct >= 40 ? 'Too hot to chase' : 'Checking…'), why: w && w.kind && w.kind !== m[1] ? w.kind : '', col: m ? m[0] : (r.pct >= 40 ? '#F2C27A' : '#8CB8E0') }; });
    const cnt = { real: 0, warn: 0, weak: 0 }; rows.forEach((r) => { const w = W[r.sym]; if (w && cnt[w.v] != null) cnt[w.v]++; });
    const stat = (n, l, c) => '<div><b style="color:' + c + '">' + n + '</b><span>' + l + '</span></div>';
    return '<div class="jcEng"><div class="jcEngBg"></div><div class="jcHead"><span class="jcOrb big"><i></i></span><span class="jcHt"><b>JUMP CHECK ENGINE</b><small><em class="jcLive"></em>Scanning ' + (rows.length || 'the') + ' movers live</small></span></div>' +
      '<div class="jcReel" data-jcreel="1"></div>' +
      (rows.length ? '<div class="jcStats">' + stat(rows.length, 'scanned', '#E6EBF2') + stat(cnt.real, 'real catalysts', '#5EE0A0') + stat(cnt.warn + cnt.weak, 'red flags', '#FF8A8A') + '</div>' : '') +
      '<div class="jcEngF"><span>Tap any stock for its full check</span><button class="jcAnyB" data-opensearch="1">⌕ Check another</button></div></div>';
  };
  let reelI = 0, reelT = 0;
  function reelPaint(force) {
    const el = document.querySelector('[data-jcreel]'); if (!el) return; if (!JC.reel.length) { if (!el.firstChild) el.innerHTML = '<div class="jcWait"><i></i><i></i><i></i><span>Waiting for today\'s movers. The scan picks up again in premarket.</span></div>'; return; }
    if (!force && el.dataset.at && Date.now() - reelT < 2600) return; reelT = Date.now();
    const n = JC.reel.length, k = reelI++ % n; el.dataset.at = String(k);
    const rowH = (x, top) => '<button class="jcReelIn' + (top ? ' lead' : '') + '" data-jcopen="' + E(x.sym) + '" style="--k:' + x.col + '">' + (typeof logoHTML === 'function' ? logoHTML(x.sym, top ? 38 : 30) : '') + '<span class="jcRn"><b>' + E(x.sym) + ' <em style="color:#5EE0A0">+' + (x.pct >= 100 ? Math.round(x.pct) : x.pct.toFixed(1)) + '%</em></b><small style="color:' + x.col + '"><i style="background:' + x.col + '"></i>' + E(x.tag) + (x.why ? ' · ' + E(x.why) : '') + '</small></span>' + (top ? '<span class="jcGo">Check ›</span><span class="jcScanL"></span>' : '') + '</button>';
    el.innerHTML = [0, 1, 2].filter((o) => o < n).map((o) => rowH(JC.reel[(k + o) % n], o === 0)).join('');
  }
  setInterval(() => { const el = document.querySelector('[data-jcreel]'); if (el && (!el.firstChild || el.querySelector('.jcWait') || Date.now() - reelT >= 2600)) { if (el.querySelector('.jcWait') && JC.reel.length) el.innerHTML = ''; reelPaint(true); } }, 300);
  function startScan(sym) { JC.reveal[sym] = Date.now() + 1600; let n = 0; const t = setInterval(() => { if (typeof render === 'function') render(); if (++n > 9) clearInterval(t); }, 200); setTimeout(() => { if (typeof render === 'function') render(); }, 3500); }
  function openCheck(sym) { sym = String(sym || '').toUpperCase().replace(/[^A-Z.]/g, '').slice(0, 6); if (!sym) return; JC.open[sym] = 1; startScan(sym); if (typeof openDetail === 'function') openDetail(sym); setTimeout(() => { const el = document.querySelector('.jc'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 900); }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-jc]'); if (b) { e.preventDefault(); e.stopPropagation(); const s = b.dataset.jc; JC.open[s] = !JC.open[s]; if (JC.open[s]) startScan(s); if (typeof render === 'function') render(); if (JC.open[s]) setTimeout(() => { const el = document.querySelector('.jc'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120); return; }
    const c = e.target.closest('[data-jcq]'); if (c) { e.preventDefault(); e.stopPropagation(); ask(c.dataset.jcs, c.dataset.jcq); return; }
    const os = e.target.closest('[data-opensearch]'); if (os) { e.preventDefault(); e.stopPropagation(); if (typeof openSearch === 'function') openSearch(); return; }
    const o = e.target.closest('[data-jcopen]'); if (o) { e.preventDefault(); e.stopPropagation(); openCheck(o.dataset.jcopen); }
  }, true);
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-jcform],[data-jchome]'); if (!f) return; e.preventDefault();
    const inp = f.querySelector('input'); const v = inp.value; inp.value = '';
    if (f.dataset.jchome) openCheck(v); else ask(f.dataset.jcform, v);
  }, true);
})();
