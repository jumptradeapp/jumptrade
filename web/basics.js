/* jumptrade. basics: the plain-English layer for newer investors.
   Why it's moving, earnings warnings, a health light, risk in dollars, tap-to-explain terms, context, market mood, and an alerts nudge. */
(function () {
  const BAS = window.BAS = {};
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $p = (x) => (typeof px === 'function' ? px(x) : (+x).toFixed(2));
  const KIND = { real: 'Real news', news: 'News', warn: 'Careful', weak: 'No clear reason', nonews: 'No news found', halt: 'Halted' };

  // 1. why it's moving: one plain line, or null
  BAS.why = function (sym, pct) {
    const w = (typeof S !== 'undefined' && S.mwhy && S.mwhy[sym]) || null;
    const nw = (typeof S !== 'undefined' && S.news && S.news[sym]) || null;
    const head = (w && w.h && w.h.title) || (nw && nw.why) || null;
    const dir = pct == null ? 'Moving' : pct >= 0 ? 'Up' : 'Down';
    const mv = pct == null ? '' : ' ' + Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0) + '%';
    if (w && w.v === 'warn') return { t: dir + mv + ': ' + (w.kind || 'careful') + '. Often fades.', c: 'warn' };
    if (head) return { t: dir + mv + ' after: ' + head, c: w && w.v === 'real' ? 'real' : 'news' };
    if (w && (w.v === 'weak' || w.v === 'nonews')) return { t: dir + mv + ' with no news found. Moves like this often reverse.', c: 'weak' };
    return null;
  };

  // 2. earnings coming up: { d, label, soon }
  const wd = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  BAS.earn = function (sym, days) {
    const C = typeof FILES !== 'undefined' && FILES['catalysts.json']; if (!C || !C.earnings) return null;
    const t = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })); const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const d0 = iso(t), d1 = iso(new Date(t.getTime() + (days || 14) * 86400000));
    const e = (C.earnings.upcoming || []).find((x) => x.ticker === sym && x.date >= d0 && x.date <= d1); if (!e) return null;
    const n = Math.round((new Date(e.date + 'T12:00:00') - new Date(d0 + 'T12:00:00')) / 86400000);
    const when = n === 0 ? 'today' : n === 1 ? 'tomorrow' : wd(e.date);
    const tm = /before|bmo|pre/i.test(e.timing || '') ? ' before the open' : /after|amc|post/i.test(e.timing || '') ? ' after the close' : '';
    return { n: n, short: 'Earnings ' + (n === 0 ? 'today' : n === 1 ? 'tmrw' : wd(e.date)), label: 'Reports earnings ' + when + tm + '. Stocks often jump or drop 5–15% on the news.', soon: n <= 3 };
  };

  // 3. context: where it sits in its year
  BAS.context = function (sn, price) {
    const hi = +(sn && sn.fifty_two_wk_high), lo = +(sn && sn.fifty_two_wk_low); if (!(hi > 0 && lo > 0 && price > 0 && hi > lo)) return null;
    const offHi = (price / hi - 1) * 100, upLo = (price / lo - 1) * 100;
    if (offHi >= -3) return 'At a 52-week high. Strong, but late buyers chase.';
    if (upLo <= 5) return 'Near its 52-week low. Cheap, or still falling.';
    return Math.round(-offHi) + '% below its 52-week high, ' + Math.round(upLo) + '% above its low.';
  };

  // 4. health light from the app's call
  BAS.light = function (kind) { return kind === 'buy' ? ['#66C99A', 'Healthy'] : kind === 'avoid' ? ['#EC9191', 'Weak'] : ['#F2C27A', 'Mixed']; };

  // 5. risk in dollars on a $1,000 position
  BAS.risk = function (buy, st, tg) {
    if (!(buy > 0 && st > 0 && st < buy)) return '';
    const lose = Math.round(1000 * (buy - st) / buy), win = tg > buy ? Math.round(1000 * (tg - buy) / buy) : 0;
    return '<span class="bRisk" data-gl="risk">On $1,000: <b class="r">−$' + lose + '</b> if stopped' + (win ? ' · <b class="g">+$' + win + '</b> at target' : '') + '</span>';
  };

  // 6. market mood in one word
  BAS.mood = function (fg) { if (fg == null) return null; return fg < 25 ? ['Fearful', '#EC9191'] : fg < 45 ? ['Nervous', '#F2C27A'] : fg <= 60 ? ['Calm', '#9DB8FF'] : fg <= 75 ? ['Confident', '#8CE3B5'] : ['Greedy', '#66C99A']; };

  // the stock page block: why, earnings, context
  BAS.sheet = function (sym, main, sn) {
    const w = BAS.why(sym, main && main.pct), e = BAS.earn(sym, 14), c = BAS.context(sn, main && main.price);
    if (!w && !e && !c) return '';
    return '<div class="bBox">' + (w ? '<div class="bLn ' + w.c + '"><i></i><span><b>Why it’s moving</b>' + E(w.t) + '</span></div>' : '') +
      (e ? '<div class="bLn earn' + (e.soon ? ' soon' : '') + '"><i></i><span><b>Earnings</b>' + E(e.label) + '</span></div>' : '') +
      (c ? '<div class="bLn ctx"><i></i><span><b>This year</b>' + E(c) + '</span></div>' : '') + '</div>';
  };

  // watchlist row line: earnings soon beats why
  BAS.rowNote = function (sym, pct) {
    const e = BAS.earn(sym, 7); if (e) return '<span class="bChip' + (e.soon ? ' soon' : '') + '">' + E(e.short) + '</span>';
    const w = BAS.why(sym, pct); if (w && Math.abs(pct || 0) >= 3) return '<span class="bWhy ' + w.c + '">' + E(w.t.replace(/^(Up|Down|Moving)( [\d.]+%)?( after:)? ?/, '')) + '</span>';
    return '';
  };

  // alerts nudge (once, until dismissed or granted)
  BAS.alertNudge = function () {
    try { if (localStorage.getItem('jt.bNudge') || !window.ALERTS || !('Notification' in window) || Notification.permission === 'granted' || Notification.permission === 'denied') return ''; } catch (e) { return ''; }
    return '<div class="bNudge"><span>🔔 Get a heads-up when your stocks move 5% or report earnings.</span><button data-bnudge="on">Turn on</button><button class="x" data-bnudge="x" aria-label="Dismiss">✕</button></div>';
  };

  // 7. tap-to-explain terms
  const GL = {
    'market cap': 'What the whole company is worth: share price × number of shares.',
    'p/e': 'Price ÷ yearly profit per share. Lower can mean cheaper. Around 20 is average.',
    'volume': 'How many shares traded today. Far above normal means something is going on.',
    '52-week range': 'The lowest and highest price over the last year.',
    'rsi': 'A 0–100 speed gauge. Above 70 = ran up fast, below 30 = sold off hard.',
    'short interest': 'Shares borrowed by people betting it falls. High plus good news can cause a squeeze.',
    'float': 'Shares that can actually trade. A small float moves fast both ways.',
    'eps': 'Earnings per share: profit divided by number of shares.',
    'beta': 'How much it swings vs the market. 2 = twice as jumpy.',
    'stop': 'The price where you sell to keep a loss small if you’re wrong.',
    'target': 'The price where you plan to take profit.',
    'buy': 'The price to get in. Wait until it trades there.',
    'risk-on': 'The market is healthy. Normal position sizes are okay.',
    'risk-off': 'The market is shaky. Smaller positions, tighter stops.',
    'vs 200-day avg': 'How far the S&P 500 is above or below its average of the last 200 days. Above = uptrend.',
    'premium': 'The total dollars paid for an options trade. Bigger = more conviction.',
    'squeeze score': 'How likely a short squeeze is: lots of shorts, rising price, heavy volume.',
    'strength': 'How it ranks vs other stocks over 3–6 months. 90 = beat 90% of them.',
    'risk': 'What a $1,000 buy at the buy price would lose if it hits the stop, or make if it hits the target.',
    'mood': 'How nervous or greedy investors are right now, from the fear & greed index.',
    'rvol': 'Today’s volume vs normal. 3× means three times the usual trading.'
  };
  BAS.GL = GL;
  function tip(el, txt) {
    let t = document.getElementById('bTip'); if (!t) { t = document.createElement('div'); t.id = 'bTip'; document.body.appendChild(t); }
    t.innerHTML = '<b>' + E(el.textContent.trim()) + '</b>' + E(txt); const r = el.getBoundingClientRect();
    t.style.left = Math.max(12, Math.min(window.innerWidth - 272, r.left)) + 'px'; t.style.top = (r.bottom + 8) + 'px'; t.classList.add('on');
    clearTimeout(tip.t); tip.t = setTimeout(() => t.classList.remove('on'), 5000);
  }
  document.addEventListener('click', (e) => {
    const n = e.target.closest('[data-bnudge]'); if (n) { e.preventDefault(); e.stopPropagation(); try { localStorage.setItem('jt.bNudge', '1'); } catch (x) {} if (n.dataset.bnudge === 'on' && window.ALERTS) ALERTS.open(); if (typeof render === 'function') render(); return; }
    const el = e.target.closest('.dGrid span, .hmst small, .mkI small, .bRisk, [data-gl]'); const tt = document.getElementById('bTip');
    if (el) { const k = (el.dataset && el.dataset.gl) || el.textContent.trim().toLowerCase(); if (GL[k]) { e.preventDefault(); e.stopPropagation(); tip(el, GL[k]); return; } }
    if (tt && tt.classList.contains('on') && !e.target.closest('#bTip')) tt.classList.remove('on');
  }, true);
})();
