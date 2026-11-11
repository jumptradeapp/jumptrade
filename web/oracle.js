/* jumptrade. Jump check (Home): ask anything about a stock or the market. It pulls live quotes, headlines and today's movers,
   then answers like a sharp trading desk analyst. Home shows the card; the conversation opens in its own sheet. */
(function () {
  const ORC = window.ORC = { msgs: [], busy: false };
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STOP = new Set('I A AN AM IS IT ITS UP ON IN AT TO OF OR AND THE BUY SELL HOLD WHY HOW WHAT WHEN WHO NOW DO DOES DID BE ME MY WE US SO IF BY FOR GO ALL ANY ARE CAN GET GOT HAS HAD NEW OUT TOP DAY ONE TWO LOW HIGH BIG RUN PRE AH OK YES NO NOT GOOD BAD BEST WORTH STOCK STOCKS MARKET TODAY TONIGHT SHOULD WILL WOULD THIS THAT THESE WITH FROM INTO OVER JUST ABOUT DOWN AFTER HOURS ETF CEO IPO EPS FDA AI USA'.split(' '));
  const pctS = (v) => (v >= 0 ? '+' : '') + (+v).toFixed(1) + '%';
  function movers() { return (typeof rowsCache !== 'undefined' ? rowsCache : []).filter((r) => r.price >= 1 && r.pct > 0).slice(0, 10); }
  function known(t) { if (typeof symName === 'function' && symName(t)) return true; return movers().some((r) => r.sym === t) || !!(typeof S !== 'undefined' && S.d && S.d[t]); }
  function tickers(q) {
    const out = []; (q.match(/\$?[A-Za-z]{1,5}(\.[A-Za-z])?\b/g) || []).forEach((w) => {
      const dollar = w[0] === '$', t = w.replace('$', '').toUpperCase();
      if ((dollar || (!STOP.has(t) && (w === w.toUpperCase() || known(t)))) && known(t) && out.indexOf(t) < 0) out.push(t);
    });
    return out.slice(0, 3);
  }
  const num = (v) => (v == null || v === '' || !isFinite(+v) ? null : +v);
  async function gather(q) {
    const syms = tickers(q), D = { asked_at: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET', session: (typeof view === 'function' ? view() : '') };
    const W = (typeof S !== 'undefined' && S.mwhy) || {};
    D.top_movers_now = movers().map((r) => ({ sym: r.sym, pct: +(+r.pct).toFixed(1), price: r.price, scanner: W[r.sym] ? W[r.sym].kind : undefined }));
    if (syms.length && typeof call === 'function') {
      const snap = await call('get_stock_snapshot', { symbols: syms.join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: true }).catch(() => null);
      const SN = {}; (Array.isArray(snap) ? snap : []).forEach((x) => { if (x && x.symbol) SN[x.symbol] = x; });
      D.stocks = await Promise.all(syms.map(async (s) => {
        const x = SN[s] || {}; const n = await call('get_stock_news', { symbol: s }).catch(() => null);
        const news = ((Array.isArray(n) ? n : (n && (n.data || n.list)) || [])).filter((a) => a && a.title).slice(0, 5).map((a) => ({ title: a.title, when: a.publish_time || a.time || '' }));
        let check = null; try { if (window.VERD) { const v = VERD.calc(s, { price: num(x.price), pct: num(x.change_ratio) != null ? num(x.change_ratio) * 100 : null }); if (v) check = { call: v.kind, why: v.line, entry: v.entry, stop: v.stop, target: v.target }; } } catch (e) {}
        return { sym: s, name: (typeof symName === 'function' && symName(s)) || x.name || s, price: num(x.price), day_change_pct: num(x.change_ratio) != null ? +(num(x.change_ratio) * 100).toFixed(2) : null,
          extended_hours_price: num(x.extend_hour_last_price) || num(x.ovn_price), extended_hours_change_pct: num(x.extend_hour_change_ratio) != null ? +(num(x.extend_hour_change_ratio) * 100).toFixed(2) : null,
          volume: num(x.volume), market_cap: num(x.market_value), high_52w: num(x.fifty_two_wk_high), low_52w: num(x.fifty_two_wk_low), pe: num(x.pe_ttm), scanner: W[s] ? W[s].kind : undefined, levels: check, headlines: news };
      }));
    }
    return D;
  }
  const SYS = 'You are Ask Jump, a sharp, confident trading-desk analyst inside a stock app. Answer the trader\'s question in 2 to 5 short, plain sentences. Lead with the answer. Use concrete numbers from DATA: price, % move, levels, the headline that explains a move. If a move has no headline, say so in a few words and read what price and volume show. For "should I buy" questions, give a clear lean and the levels that matter (where to get in, where you are wrong), not a refusal. Never say "my data", never open with what you can\'t do, no bullet points, no markdown. If DATA lacks the stock, say you couldn\'t pull it and suggest typing the ticker. End with nothing extra.';
  function prompt(q, D) {
    const hist = ORC.msgs.slice(-7, -1).map((m) => (m.q ? 'Trader: ' + m.q : 'Ask Jump: ' + m.a)).join('\n');
    return (hist ? 'EARLIER:\n' + hist + '\n\n' : '') + 'DATA:\n' + JSON.stringify(D) + '\n\nQUESTION: ' + q;
  }
  let sampleP = null; const getSample = () => (sampleP = sampleP || (window.claude && claude.use ? claude.use('sample').catch(() => null) : Promise.resolve(null)));
  async function ask(q) {
    q = String(q || '').trim().slice(0, 300); if (!q || ORC.busy) return;
    ORC.msgs.push({ q }); const m = { a: '', live: true }; ORC.msgs.push(m); ORC.busy = true; paint(true);
    try {
      const D = await gather(q); const sm = window.JT_WEB ? null : await getSample();
      if (sm) {
        const r = await sm(SYS + '\n\n' + prompt(q, D), { cache: false, onText: (u) => { m.a = u.text === 'Thinking...' ? '' : u.text; paint(); } });
        m.a = (r && r.text) || m.a || 'No answer came back. Try asking another way.';
      } else {
        const res = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'ask', prompt: SYS + '\n\nReturn JSON: {"answer": "your answer"}.\n\n' + prompt(q, D) }) });
        const j = await res.json().catch(() => ({}));
        m.a = res.status === 503 ? 'Ask Jump isn’t switched on yet.' : res.status === 429 ? 'You’ve hit today’s question limit. It resets tomorrow.' : (j.payload && j.payload.answer) ? String(j.payload.answer).slice(0, 1400) : 'Couldn’t get an answer right now. Try again in a moment.';
      }
    } catch (e) { m.a = e && e.code === 'not_granted' ? 'Ask Jump needs permission to answer. Tap Allow when asked.' : e && e.code === 'rate_limited' ? 'Too many questions at once. Give it a minute.' : (m.a || 'Couldn’t reach Ask Jump. Try again.'); }
    m.live = false; ORC.busy = false; paint(true);
  }
  function suggestions() {
    const M = movers(), out = [];
    if (M[0]) out.push('Why is ' + M[0].sym + ' up ' + Math.round(M[0].pct) + '%?');
    if (M[1]) out.push('Is ' + M[1].sym + ' worth buying here?');
    out.push('What’s the market doing right now?');
    if (out.length < 3) out.push('Is NVDA a buy here?');
    return out.slice(0, 3);
  }
  const MK = (px) => '<span class="orcMk" style="width:' + px + 'px;height:' + px + 'px">' + (window.jmMark ? jmMark(px) : '') + '</span>';
  // Home card: tap anywhere to open the chat
  ORC.card = function () {
    const last = ORC.msgs.filter((x) => x.a && !x.live).slice(-1)[0];
    return '<div class="orcCard"><div class="orcGlow"></div>' +
      '<div class="orcTop">' + MK(42) + '<span class="orcTt"><b>ASK JUMP</b><small>Before you jump, ask anything</small></span></div>' +
      (last ? '<button class="orcLast" data-orcopen="1"><small>Last answer</small>' + E(last.a.slice(0, 150)) + (last.a.length > 150 ? '…' : '') + '</button>' : '') +
      '<button class="orcFake" data-orcopen="1"><span>Ask anything…</span><em>↑</em></button>' +
      '<div class="orcSug">' + suggestions().map((s) => '<button data-orcq="' + E(s) + '">' + E(s) + '</button>').join('') + '</div></div>';
  };
  // the conversation sheet (lives outside the app's re-rendered views, so typing is never interrupted)
  function sheet() {
    let el = document.getElementById('orcSheet'); if (el) return el;
    el = document.createElement('div'); el.id = 'orcSheet';
    el.innerHTML = '<div class="orcBar"><span class="orcTop">' + MK(38) + '<span class="orcTt"><b>ASK JUMP</b><small>Live quotes, headlines and movers</small></span></span><button class="orcX" data-orcclose="1" aria-label="Close">✕</button></div>' +
      '<div class="orcLog" id="orcLog"></div><form class="orcForm" id="orcForm"><input id="orcIn" autocomplete="off" enterkeyhint="send" placeholder="Ask about any stock…" maxlength="300"><button aria-label="Ask">↑</button></form>';
    document.body.appendChild(el);
    el.querySelector('#orcForm').addEventListener('submit', (e) => { e.preventDefault(); const i = el.querySelector('#orcIn'); const v = i.value; i.value = ''; ask(v); });
    return el;
  }
  function paint(scroll) {
    const el = document.getElementById('orcSheet'); if (!el || !el.classList.contains('on')) return;
    const log = el.querySelector('#orcLog');
    log.innerHTML = ORC.msgs.length ? ORC.msgs.map((m) => m.q ? '<div class="orcQ">' + E(m.q) + '</div>' : '<div class="orcA">' + MK(28) + '<p>' + (m.a ? E(m.a) : '<span class="orcDots"><i></i><i></i><i></i></span>') + '</p></div>').join('')
      : '<div class="orcHello">' + MK(84) + '<b>What do you want to know?</b><small>Ask why a stock is moving, whether it’s worth buying, or what the market is doing. Answers use live prices and headlines.</small><div class="orcSug">' + suggestions().map((s) => '<button data-orcq="' + E(s) + '">' + E(s) + '</button>').join('') + '</div></div>';
    if (scroll !== false) log.scrollTop = log.scrollHeight;
  }
  ORC.open = function (q) { const el = sheet(); el.classList.add('on'); document.body.classList.add('orc-open'); paint(true); if (q) ask(q); else setTimeout(() => { const i = el.querySelector('#orcIn'); if (i) i.focus(); }, 250); };
  ORC.close = function () { const el = document.getElementById('orcSheet'); if (el) el.classList.remove('on'); document.body.classList.remove('orc-open'); if (typeof render === 'function') render(); };
  document.addEventListener('click', (e) => {
    const q = e.target.closest('[data-orcq]'); if (q) { e.preventDefault(); e.stopPropagation(); ORC.open(q.dataset.orcq); return; }
    if (e.target.closest('[data-orcopen]')) { e.preventDefault(); e.stopPropagation(); ORC.open(); return; }
    if (e.target.closest('[data-orcclose]')) { e.preventDefault(); ORC.close(); }
  }, true);
})();
