/* jumptrade. Big-news alerts: tags stories that can move a stock as Warning or Good news, shows them on Home, in News and on the stock page. */
(function () {
  const WARN = /\b(resign(s|ed|ation)?|ousted|ouster|steps? down|fired|probe|investigat\w*|subpoena|sec (charges|sues|probe)|fraud|lawsuit|sued|class action|recall(s|ed)?|downgrades?|downgraded|cuts? (its |full[- ]year )?(guidance|outlook|forecast)|lowers? (its )?(guidance|outlook|forecast)|miss(es|ed)? (on )?(estimates|expectations|revenue|earnings)|bankrupt\w*|chapter 11|delist\w*|going concern|short[- ]seller|short report|scandal|affair|data breach|hacked|cyberattack|dilut\w*|public offering|guidance cut)\b/i;
  const GOOD = /\b(beats? and raises?|raises? (its |full[- ]year )?(guidance|outlook|forecast)|upgrades?|upgraded|fda (approv\w*|clear\w*)|wins? (a |an |\$[\d.]+\w* )?(contract|deal|award)|awarded|record (revenue|quarter|sales)|buyback|repurchase|to be acquired|acquired by|takeover offer|beats? (estimates|expectations))\b/i;
  const STRONG = /resign|ousted|ouster|steps? down|fraud|bankrupt|chapter 11|delist|going concern|sec |subpoena|scandal|fda approv|to be acquired|acquired by/i;
  const BN = window.BN = { seen: {} };
  BN.classify = function (n) {
    const t = ((n && n.title) || '') + ' ' + ((n && n.summary) || '');
    if (/maintains|reiterates|price target/i.test(n.title || '') && !/downgrad|upgrad/i.test(n.title || '')) return null;
    const ti = (n && n.title) || '';
    const fell = /\b(sinks?|sank|plunges?|plunged|tumbles?|tumbled|slides?|slid|falls?|fell|drops?|dropped|crash(es|ed)?|tanks?|tanked|slumps?|slumped|craters?|sell-?off|down \d)/i.test(ti);
    const rose = /\b(soars?|soared|surges?|surged|jumps?|jumped|rall(y|ies|ied)|climbs?|climbed|spikes?|spiked|rockets?|pops?|popped|up \d)/i.test(ti);
    const w = WARN.test(ti), g = (GOOD.test(ti) || rose) && !fell;
    if (w && !g) return { k: 'warn', strong: STRONG.test(t) };
    if (g && !w) return { k: 'good', strong: STRONG.test(t) };
    if (w && g) return /raises?|beat/i.test(ti) && !fell ? { k: 'good' } : { k: 'warn' };
    return null;
  };
  const okSym = (s) => /^[A-Z]{1,5}$/.test(s) && !/^(ES|NQ|YM|RTY|ZN|UB|EMD)/.test(s);
  function mentions(sym, n) { const t = (n.title || '') + ' ' + (n.summary || ''); const nm = cleanName(symName(sym) || '').split(' ')[0]; return t.indexOf(sym) >= 0 || (nm && nm.length > 2 && t.toLowerCase().indexOf(nm.toLowerCase()) >= 0); }
  // every alert in the last 36 hours, newest first, one per stock+story
  BN.list = function () {
    const out = [], key = {}, cut = Date.now() - 36 * 3600000;
    const add = (sym, n) => { const t = Date.parse(n.publish_time || n.time); if (!(t > cut)) return; const c = BN.classify(n); if (!c) return; const k = sym + '|' + (n.title || '').slice(0, 60); if (key[k]) return; key[k] = 1; out.push({ sym: sym, n: n, t: t, k: c.k, strong: !!c.strong }); };
    Object.keys(S.news || {}).forEach((sym) => ((S.news[sym] && S.news[sym].items) || []).forEach((n) => { if (mentions(sym, n)) add(sym, n); }));
    (S.newsItems || []).forEach((n) => (n.related_symbols || []).filter(okSym).slice(0, 2).forEach((sym) => { if (mentions(sym, n)) add(sym, n); }));
    const mine = Object.assign({}, S.allWl || {});
    return out.sort((a, b) => (mine[b.sym] ? 1 : 0) - (mine[a.sym] ? 1 : 0) || (b.strong ? 1 : 0) - (a.strong ? 1 : 0) || b.t - a.t);
  };
  BN.forSym = function (sym) { return BN.list().filter((a) => a.sym === sym); };
  // keep news flowing for watchlist names so their alerts show up first
  BN.load = function () { if (typeof newsFor !== 'function') return; Object.keys(S.allWl || {}).slice(0, 12).forEach((s) => newsFor(s, 600000)); };
  const ICON = { warn: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F2C27A" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01" stroke-linecap="round"/></svg>', good: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#66C99A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 16l6-6 4 4 6-7"/><path d="M15 7h5v5"/></svg>' };
  BN.icon = (k) => ICON[k];
  BN.label = (k) => (k === 'warn' ? 'WARNING' : 'GOOD NEWS');
  function q(sym) { const W = (window.TODAY && TODAY.wlQ) || {}; const r = (typeof rowsCache !== 'undefined' ? rowsCache : []).find((x) => x.sym === sym); return W[sym] || r || (S.nwQ || {})[sym] || null; }
  function priceB(sym) { const r = q(sym); const P = dPal(); return r && r.price ? '<span class="rp tvp"><b>$' + px(r.price) + '</b>' + (r.pct != null ? '<small style="color:' + (r.pct >= 0 ? P.up : P.dn) + '">' + mvS(r.pct, r.price, r.chg) + '</small>' : '') + '</span>' : ''; }
  const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + 'm ago' : Math.round(m / 60) + 'h ago'; };
  BN.card = function (a, small) {
    if (small) return '<div class="bnA ' + a.k + ' sm" data-open="' + esc(a.sym) + '"><div class="bnH">' + ICON[a.k] + '<b>' + BN.label(a.k) + (a.strong ? ' · MAJOR NEWS' : '') + '</b><span>' + ago(a.t) + '</span></div><p>' + esc(a.n.title || '') + '</p></div>';
    const img = window.JT_WEB && a.n.url ? '<img class="bnTh" loading="lazy" alt="" src="/api/nimg?v=2&u=' + encodeURIComponent(a.n.url) + '&s=' + encodeURIComponent(a.sym || '') + '&t=' + encodeURIComponent((a.n.title || '').slice(0, 140)) + '" onerror="this.remove()">' : '';
    return '<div class="bnA bnC ' + a.k + '" data-open="' + esc(a.sym) + '">' + img + '<div class="bnBody"><div class="bnH">' + ICON[a.k] + '<b>' + BN.label(a.k) + (a.strong ? ' · MAJOR' : '') + '</b><span>' + ago(a.t) + '</span></div><p class="bnT">' + esc(a.n.title || '') + '</p><small class="bnS">' + logoHTML(a.sym, 18) + '<b>' + esc(a.sym) + '</b> · ' + esc(cleanName(symName(a.sym) || '')) + '</small></div></div>';
  };
  BN.homeCard = function () { BN.load(); const seen = {}; const L = BN.list().filter((a) => !seen[a.sym] && (seen[a.sym] = 1)).slice(0, 3); return L.length ? '<div class="bnWrap">' + L.map((a) => BN.card(a)).join('') + '</div>' : ''; };
})();
