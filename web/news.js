/* jumptrade. News: our own analysis pieces (jumptrade newsdesk) mixed with outside headlines, and an in-app reader for both.
   Ours open in full. Outside stories open a reader card (headline, source, the feed's own summary, live stock cards) with a button to the original. */
(function () {
  const NR = window.NR = { list: null, full: {}, t: 0, q: {}, cur: null };
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
  const when = (t) => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  // our pieces (web app only: they come from the server)
  NR.load = function (force) {
    if (!window.JT_WEB) return; if (!force && Date.now() - NR.t < 150000) return; NR.t = Date.now();
    fetch('/api/jtnews', { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then((j) => { if (j && Array.isArray(j.payload)) { const was = JSON.stringify((NR.list || []).map((a) => a.id)); NR.list = j.payload; if (JSON.stringify(NR.list.map((a) => a.id)) !== was && typeof render === 'function') render(); } else if (!NR.list) NR.list = []; }).catch(() => { if (!NR.list) NR.list = []; });
  };
  setInterval(() => { if (!document.hidden && typeof S !== 'undefined' && (S.tab === 'news' || S.tab === 'home')) NR.load(); }, 60000);

  const art = (a) => { const k = a.kind === 'brief' ? ['#3B7BFF', '#14306F'] : a.tag === 'Earnings' ? ['#5EE0A0', '#0E3B2B'] : a.tag === 'Big mover' ? ['#F2C27A', '#3A2A10'] : ['#FF8A8A', '#3A1416']; return 'background:radial-gradient(120% 120% at 100% 0%,' + k[0] + '55,transparent 60%),linear-gradient(160deg,' + k[1] + ',#0A0D14)'; };
  const tagHTML = (a) => '<span class="nwTag ours">JUMPTRADE ANALYSIS</span><span class="nwTag k">' + E(a.tag || (a.kind === 'brief' ? 'Brief' : 'Breaking')) + '</span>';

  // featured piece: the top of the news page and of Home
  NR.featured = function (compact) {
    const a = NR.list && NR.list[0]; if (!a) return '';
    return '<button class="nwFeat' + (compact ? ' sm' : '') + '" data-nrj="' + E(a.id) + '"><div class="nwArt" style="' + art(a) + '">' + (a.tickers && a.tickers[0] && typeof logoHTML === 'function' ? '<span class="nwLg">' + logoHTML(a.tickers[0], compact ? 40 : 54) + '</span>' : '<span class="nwSq"></span>') + '<span class="nwTags">' + tagHTML(a) + '</span></div>' +
      '<div class="nwFt"><b>' + E(a.title) + '</b>' + (compact ? '' : '<p>' + E(a.dek) + '</p>') + '<small>jumptrade newsdesk · ' + ago(a.t) + (a.tickers && a.tickers.length ? ' · ' + a.tickers.map(E).join(', ') : '') + '</small></div></button>';
  };
  NR.ourRows = function (skipFirst, n) { return (NR.list || []).slice(skipFirst ? 1 : 0, (skipFirst ? 1 : 0) + (n || 6)); };

  // ---------- the reader ----------
  function sheet(html) {
    let el = document.getElementById('nrSheet');
    if (!el) { el = document.createElement('div'); el.id = 'nrSheet'; document.body.appendChild(el); el.addEventListener('click', (e) => { if (e.target.closest('[data-nrx-close]')) NR.close(); }); }
    el.innerHTML = '<div class="nrPanel"><div class="nrTop"><button class="nrX" data-nrx-close="1" aria-label="Close">✕</button></div><div class="nrBody">' + html + '</div></div>';
    el.classList.add('on'); document.body.classList.add('nr-open'); const b = el.querySelector('.nrBody'); if (b) b.scrollTop = 0;
  }
  NR.close = function () { const el = document.getElementById('nrSheet'); if (el) { el.classList.remove('on'); setTimeout(() => { if (!el.classList.contains('on')) el.innerHTML = ''; }, 250); } document.body.classList.remove('nr-open'); NR.cur = null; };

  function quotes(tk) {
    tk = (tk || []).filter((s) => /^[A-Z.]{1,6}$/.test(s)).slice(0, 4); if (!tk.length || typeof call !== 'function') return;
    call('get_stock_snapshot', { symbols: tk.join(','), category: 'US_STOCK', extend_hour_required: false, overnight_required: false }).then((p) => {
      (Array.isArray(p) ? p : []).forEach((x) => { if (x && x.symbol) NR.q[x.symbol] = { price: +x.price || +x.close, pct: +x.change_ratio * 100, chg: +x.change }; });
      document.querySelectorAll('[data-nrq]').forEach((el) => { const q = NR.q[el.dataset.nrq]; if (q) el.innerHTML = cardInner(el.dataset.nrq, q); });
    }).catch(() => {});
  }
  function cardInner(s, q) {
    const up = q && q.pct >= 0; const c = q ? (up ? '#5EE0A0' : '#FF8A8A') : '#8B98AE';
    return (typeof logoHTML === 'function' ? logoHTML(s, 34) : '') + '<span class="nrQn"><b>' + E(s) + '</b><small>' + E((typeof symName === 'function' && symName(s)) || '') + '</small></span>' +
      '<span class="nrQp"><b>' + (q && q.price ? '$' + (q.price < 1 ? q.price.toFixed(4) : q.price.toFixed(2)) : '—') + '</b><small style="color:' + c + '">' + (q && isFinite(q.pct) ? (up ? '+' : '−') + '$' + Math.abs(q.chg || 0).toFixed(q.price < 1 ? 4 : 2) + ' ' + (up ? '+' : '') + q.pct.toFixed(2) + '%' : '') + '</small></span>';
  }
  const stockCards = (tk) => (tk || []).filter((s) => /^[A-Z.]{1,6}$/.test(s)).slice(0, 3).map((s) => '<div class="nrQ"><div class="nrQr" data-nrq="' + E(s) + '" data-open="' + E(s) + '">' + cardInner(s, NR.q[s]) + '</div><div class="nrQb"><button class="nrBtn" data-jcopen="' + E(s) + '">✦ Before you jump</button><button class="nrBtn ghost" data-open="' + E(s) + '">Open ' + E(s) + ' ›</button></div></div>').join('');

  NR.openOurs = function (id) {
    NR.cur = id; const show = (a) => {
      if (NR.cur !== id) return;
      const sec = (h, t) => t ? '<h3>' + h + '</h3><p>' + E(t) + '</p>' : '';
      sheet('<div class="nrArt" style="' + art(a) + '">' + (a.tickers && a.tickers[0] && typeof logoHTML === 'function' ? logoHTML(a.tickers[0], 64) : '<span class="nwSq big"></span>') + '</div>' +
        '<div class="nrTags">' + tagHTML(a) + '</div><h1>' + E(a.title) + '</h1>' + (a.dek ? '<p class="nrDek">' + E(a.dek) + '</p>' : '') +
        '<div class="nrBy"><span class="jm" data-px="22"></span><span><b>jumptrade newsdesk</b><small>' + when(a.t) + ' · AI-assisted, written from live market data</small></span></div>' +
        stockCards(a.tickers) +
        (a.summary ? '<div class="nrSum"><span>SUMMARY</span><p>' + E(a.summary) + '</p></div>' : '') +
        sec('What happened', a.what) + sec('Why it matters', a.why) + sec('Levels to watch', a.levels) + sec('The bigger picture', a.bigger) +
        (a.src && a.src.length ? '<h3>Sources</h3>' + a.src.filter((x) => x.title).map((x) => '<a class="nrSrc" href="' + E(x.url || '#') + '" target="_blank" rel="noopener"><b>' + E(x.title) + '</b><small>' + E(x.source || '') + ' ›</small></a>').join('') : '') +
        '<p class="nrFine">jumptrade analysis is written by AI from live prices, volume and headlines, and reviewed by rules, not people. It can be wrong. Ideas, not advice.</p>');
      document.querySelectorAll('#nrSheet .jm').forEach((e) => { if (window.jmMark) e.innerHTML = jmMark(22); });
      quotes(a.tickers);
    };
    if (NR.full[id]) return show(NR.full[id]);
    const lite = (NR.list || []).find((a) => a.id === id); if (lite) sheet('<div class="nrArt" style="' + art(lite) + '"></div><div class="nrTags">' + tagHTML(lite) + '</div><h1>' + E(lite.title) + '</h1><div class="skel"></div><div class="skel"></div><div class="skel" style="width:60%"></div>');
    fetch('/api/jtnews?id=' + encodeURIComponent(id)).then((r) => r.ok ? r.json() : null).then((j) => { if (j && j.payload) { NR.full[id] = j.payload; show(j.payload); } }).catch(() => {});
  };
  NR.openOutside = function (n) {
    NR.cur = 'x'; const t = Date.parse(n.publish_time || n.time); const tk = (n.related_symbols || n.tickers || []).filter((s) => /^[A-Z.]{1,6}$/.test(s) && !/^(ES|NQ|YM|RTY|ZN|UB|EMD)/.test(s)).slice(0, 3);
    sheet('<div class="nrTags"><span class="nwTag">' + E((n.source || 'News').toUpperCase()) + '</span></div><h1>' + E(n.title) + '</h1><div class="nrBy plain"><span><b>' + E(n.source || 'Outside source') + '</b><small>' + (isNaN(t) ? '' : when(t) + ' · ' + ago(t)) + '</small></span></div>' +
      (n.summary ? '<div class="nrSum"><span>FROM THE SOURCE</span><p>' + E(String(n.summary).slice(0, 420)) + '</p></div>' : '') +
      (n.url ? '<a class="nrRead" href="' + E(n.url) + '" target="_blank" rel="noopener">Read the full article at ' + E(n.source || 'the source') + ' ›</a>' : '') +
      (tk.length ? '<h3>Stocks in this story</h3>' + stockCards(tk) : '') +
      '<p class="nrFine">This story is from ' + E(n.source || 'an outside source') + '. jumptrade shows the headline and the source’s own summary; the full article is on their site.</p>');
    quotes(tk);
  };

  document.addEventListener('click', (e) => {
    const j = e.target.closest('[data-nrj]'); if (j) { e.preventDefault(); e.stopPropagation(); NR.openOurs(j.dataset.nrj); return; }
    const x = e.target.closest('[data-nrx]'); if (x && !e.target.closest('[data-open]')) { e.preventDefault(); e.stopPropagation(); const n = (window.__nx || [])[+x.dataset.nrx]; if (n) NR.openOutside(n); return; }
    const h = e.target.closest('[data-hnx]'); if (h) { e.preventDefault(); e.stopPropagation(); const n = (window.__hnx || [])[+h.dataset.hnx]; if (n) NR.openOutside({ title: n.title, url: n.url, source: n.source, summary: n.summary, publish_time: new Date(n.t).toISOString(), related_symbols: n.tk }); return; }
    if (e.target.closest('#nrSheet [data-open],#nrSheet [data-jcopen]')) setTimeout(NR.close, 30);
  }, true);
})();
