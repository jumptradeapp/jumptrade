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

  JC.card = function (sym, main, ext) {
    if (!JC.open[sym]) return '';
    const f = facts(sym, main, ext); const r = read(f);
    if (!r) return '<div class="jc"><div class="jcCap"><i></i>JUMP CHECK</div><div class="skel"></div><div class="skel" style="width:70%"></div><p class="jcNote">Loading price history…</p></div>';
    const col = r.call === 'BUY' ? '#5EE0A0' : r.call === 'AVOID' ? '#FF8A8A' : '#F2C27A';
    const row = (k, t) => '<div class="jcRow"><em>' + k + '</em><p>' + E(t) + '</p></div>';
    let h = '<div class="jc"><div class="jcCap"><i></i>JUMP CHECK</div><div class="jcCall"><b style="color:' + col + '">' + r.call + '</b><span>' + E(r.sub) + '</span></div>' +
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
    const data = { symbol: sym, name: f.name, industry: f.industry, price: f.price, change_pct_today: f.pct, change_usd_today: f.chg, after_hours: f.ext && f.ext.price ? { price: f.ext.price, pct: f.ext.pct } : null, volume: f.vol, relative_volume: f.rv, market_cap: f.mc, eps_ttm: f.eps, high_52w: f.hi52, low_52w: f.lo52, halted: !!f.halted, earnings_in_days: f.earnDays,
      news_headline: f.news ? f.news.title : (f.newsLoaded ? 'none found today' : 'not loaded'), jump_check_call: r.call, plan_levels: r.levels, red_flags: (r.F || []).map((y) => y[1]) };
    const hist = C.slice(-7, -1).map((m) => (m.q ? 'User: ' + m.q : 'You: ' + m.a)).join('\n');
    const prompt = 'You answer follow-up questions about one stock inside jumptrade\'s "Jump check". Use ONLY the data below; if something isn\'t in it, say you don\'t have it. Keep the same call and levels as the Jump check (don\'t invent new prices). Plain English, short sentences, at most 90 words, no personal financial advice, no guarantees.\n\nDATA: ' + JSON.stringify(data) + (hist ? '\n\nEARLIER IN THIS CHAT:\n' + hist : '') + '\n\nQUESTION: ' + q + '\n\nReturn JSON only: {"answer": "..."} (you may use **bold** for a few key words).';
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
  JC.homeCard = function () {
    const rows = (typeof rowsCache !== 'undefined' && rowsCache.length ? rowsCache : (typeof moverRows === 'function' ? moverRows() : [])).filter((r) => r.price >= 1).slice(0, 4);
    return '<div class="glass sec hm jcHome" style="--c:#4C8DFF"><div class="hmcap">' + (typeof secCap === 'function' ? secCap('JUMP CHECK', '#4C8DFF') : '<b>JUMP CHECK</b>') + '</div>' +
      '<p class="desc dim" style="margin:2px 0 10px">The call, the risks and the plan for any stock, in ten seconds.</p>' +
      '<form class="jcAsk" data-jchome="1"><input name="t" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="Type a ticker, like NVDA"><button aria-label="Check">›</button></form>' +
      (rows.length ? '<div class="jcChips" style="margin-top:10px">' + rows.map((r) => '<button class="jcChip" data-jcopen="' + E(r.sym) + '">' + E(r.sym) + ' <span style="color:#5EE0A0">' + (r.pct >= 0 ? '+' : '') + Math.round(r.pct) + '%</span></button>').join('') + '</div>' : '') + '</div>';
  };
  function openCheck(sym) { sym = String(sym || '').toUpperCase().replace(/[^A-Z.]/g, '').slice(0, 6); if (!sym) return; JC.open[sym] = 1; if (typeof openDetail === 'function') openDetail(sym); setTimeout(() => { const el = document.querySelector('.jc'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 900); }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-jc]'); if (b) { e.preventDefault(); e.stopPropagation(); const s = b.dataset.jc; JC.open[s] = !JC.open[s]; if (typeof render === 'function') render(); if (JC.open[s]) setTimeout(() => { const el = document.querySelector('.jc'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120); return; }
    const c = e.target.closest('[data-jcq]'); if (c) { e.preventDefault(); e.stopPropagation(); ask(c.dataset.jcs, c.dataset.jcq); return; }
    const o = e.target.closest('[data-jcopen]'); if (o) { e.preventDefault(); e.stopPropagation(); openCheck(o.dataset.jcopen); }
  }, true);
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-jcform],[data-jchome]'); if (!f) return; e.preventDefault();
    const inp = f.querySelector('input'); const v = inp.value; inp.value = '';
    if (f.dataset.jchome) openCheck(v); else ask(f.dataset.jcform, v);
  }, true);
})();
