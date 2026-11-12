/* jumptrade. news thumbnails: a picture on the left of every story. The company's logo on a tile, or a topic icon for market stories. */
(function () {
  const NAMES = [[/\bnvidia\b/i, 'NVDA'], [/\bapple\b/i, 'AAPL'], [/\bmicrosoft\b/i, 'MSFT'], [/\btesla\b/i, 'TSLA'], [/\bamazon\b/i, 'AMZN'], [/\b(alphabet|google)\b/i, 'GOOGL'], [/\bmeta\b|\bfacebook\b/i, 'META'], [/\bbroadcom\b/i, 'AVGO'], [/\bamd\b|advanced micro/i, 'AMD'], [/\bintel\b/i, 'INTC'], [/\bnetflix\b/i, 'NFLX'], [/\bpalantir\b/i, 'PLTR'], [/\bcoreweave\b/i, 'CRWV'], [/\boracle\b/i, 'ORCL'], [/\bjpmorgan\b/i, 'JPM'], [/\bwalmart\b/i, 'WMT'], [/\bcostco\b/i, 'COST'], [/\balibaba\b/i, 'BABA'], [/\bsupermicro|super micro\b/i, 'SMCI'], [/\bcoinbase\b/i, 'COIN'], [/\brobinhood\b/i, 'HOOD'], [/\bdisney\b/i, 'DIS'], [/\bboeing\b/i, 'BA'], [/\bservicenow\b/i, 'NOW'], [/\bsalesforce\b/i, 'CRM'], [/\bmicron\b/i, 'MU'], [/\btsmc\b|taiwan semi/i, 'TSM'], [/\bberkshire\b/i, 'BRK.B'], [/\buber\b/i, 'UBER'], [/\bstarbucks\b/i, 'SBUX'], [/\bnike\b/i, 'NKE']];
  const IC = {
    infl: ['#F2C27A', '<path d="M5 19L19 5"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>'],
    fed: ['#9DB8FF', '<path d="M3 9l9-5 9 5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>'],
    rates: ['#C3A8FF', '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'],
    oil: ['#8CE3B5', '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>'],
    crypto: ['#F7A440', '<path d="M9 6v12M9 6h5a3 3 0 0 1 0 6H9m0 0h6a3 3 0 0 1 0 6H9M11 4v2M11 18v2"/>'],
    gov: ['#EC9191', '<path d="M12 3v3M5 21h14M7 21V11h10v10M4 11h16l-8-5z"/>'],
    mkt: ['#6FA8FF', '<path d="M4 20V10M9 20V4M14 20v-7M19 20V8"/>'],
    news: ['#8FA3BF', '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>']
  };
  const BAD = /^(ES|EMD|NQ|YM|RTY|ZN|UB|KX|BTC|ETH|GC|CL)/;
  function tk(n) {
    const rs = (n.tk || n.related_symbols || []).filter((s) => /^[A-Z]{1,5}(\.[A-Z])?$/.test(s) && !BAD.test(s));
    const t = n.title || ''; const hit = NAMES.find((x) => x[0].test(t));
    return hit ? hit[1] : rs[0] || null;
  }
  function topic(t) {
    return /\b(cpi|inflation|prices rose|ppi|pce)\b/i.test(t) ? 'infl' : /\b(fed|fomc|powell|waller|rate hike|rate cut)\b/i.test(t) ? 'fed' : /\b(yield|treasur|bond)\b/i.test(t) ? 'rates' : /\b(oil|crude|opec|gas prices)\b/i.test(t) ? 'oil' : /\b(bitcoin|crypto|ether)\b/i.test(t) ? 'crypto' : /\b(senat|congress|house|white house|trump|tariff|subpoena|sec|doj|lawmaker)\b/i.test(t) ? 'gov' : /\b(s&p|nasdaq|dow|stocks|market|futures)\b/i.test(t) ? 'mkt' : 'news';
  }
  window.NTH = function (n, size) {
    const s = size || 52, sym = tk(n);
    if (sym && typeof logoHTML === 'function') return '<span class="nth lg" style="width:' + s + 'px;height:' + s + 'px">' + logoHTML(sym, Math.round(s * 0.62)) + '</span>';
    const c = IC[topic((n.title || '') + ' ' + (n.summary || ''))];
    return '<span class="nth ic" style="width:' + s + 'px;height:' + s + 'px;--c:' + c[0] + '"><svg viewBox="0 0 24 24" width="' + Math.round(s * 0.46) + '" height="' + Math.round(s * 0.46) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + c[1] + '</svg></span>';
  };
  window.NTH.tk = tk;
})();
