/* Valuation engine: what is priced in, cheap vs rich. Inputs: Webull snapshot row, forecast EPS list, analyst target, hot rank. */
(function (root) {
  'use strict';
  const n = (x) => (x == null || x === '' || isNaN(+x)) ? null : +x;
  function value(snap, fc, tgt, hotRank) {
    if (!snap) return null;
    const price = n(snap.close) || n(snap.price); if (!price) return null;
    const epsTTM = n(snap.eps_ttm), peTTM = n(snap.pe_ratio) > 0 ? n(snap.pe_ratio) : null, ps = n(snap.ps_ratio), pb = n(snap.pb_ratio), mcap = n(snap.market_value);
    const list = Array.isArray(fc) ? fc : [];
    const next = list.filter((x) => !x.reported && n(x.est) != null).sort((a, b) => a.fiscal_year - b.fiscal_year || a.fiscal_period - b.fiscal_period)[0] || null;
    const yearAgo = next ? list.find((x) => x.reported && x.fiscal_year === next.fiscal_year - 1 && x.fiscal_period === next.fiscal_period) : null;
    const fwdEps = next ? n(next.est) * 4 : null;
    const fwdPE = fwdEps && fwdEps > 0 ? price / fwdEps : null;
    const ya = yearAgo ? n(yearAgo.actual) : null;
    const growth = next && ya && ya > 0 ? n(next.est) / ya - 1 : null;
    const peg = fwdPE && growth != null && growth > 0.03 ? fwdPE / (growth * 100) : null;
    const tMean = tgt ? n(tgt.mean) : null, tHigh = tgt ? n(tgt.high) : null;
    const upside = tMean ? tMean / price - 1 : null;
    const profitable = (fwdEps && fwdEps > 0) || (epsTTM && epsTTM > 0);
    let verdict, why = [], score = 0;
    if (!profitable) {
      if (ps && ps > 20) { verdict = 'perfection'; why.push('Losing money and priced at ' + ps.toFixed(0) + '× sales'); score = -3; }
      else if (ps && ps > 8) { verdict = 'expensive'; why.push('Not profitable yet, ' + ps.toFixed(1) + '× sales'); score = -1.5; }
      else { verdict = 'unprofitable'; why.push('Not profitable yet' + (ps ? ', ' + ps.toFixed(1) + '× sales' : '')); score = -0.5; }
    } else {
      const pe = fwdPE || peTTM;
      if (pe != null) { score += pe < 12 ? 2 : pe < 18 ? 1 : pe < 30 ? 0 : pe < 45 ? -0.7 : pe < 70 ? -1.5 : -2.5; }
      if (peg != null) { score += peg < 0.8 ? 2 : peg < 1.3 ? 1 : peg < 2.5 ? 0 : peg < 4 ? -1 : -2; }
      else if (growth != null && growth <= 0.03) score -= 0.7;
      if (upside != null) score += upside > 0.3 ? 1.5 : upside > 0.15 ? 0.6 : upside < 0 ? -1 : 0;
      verdict = (pe && pe > 80) || (ps && ps > 30) ? 'perfection' : score >= 2.5 ? 'under' : score >= 0.7 ? 'reasonable' : score >= -1.2 ? 'full' : 'expensive';
      if (fwdPE) why.push(fwdPE.toFixed(1) + '× forward earnings'); else if (peTTM) why.push(peTTM.toFixed(1) + '× trailing earnings');
      if (growth != null) why.push('EPS ' + (growth >= 0 ? '+' : '') + Math.round(growth * 100) + '% next quarter vs a year ago');
      if (peg != null) why.push('PEG ' + peg.toFixed(2));
    }
    if (upside != null) why.push('analysts’ average target ' + (upside >= 0 ? '+' : '') + Math.round(upside * 100) + '%');
    // what is priced in
    let priced;
    if (!profitable) priced = ps ? 'The market pays ' + ps.toFixed(1) + '× sales for a company that doesn’t make money yet, so it is pricing in fast growth and future profits.' : 'No earnings to value it on yet.';
    else if (fwdPE && growth != null) {
      const g = Math.round(growth * 100);
      priced = peg != null && peg < 1 ? 'At ' + fwdPE.toFixed(0) + '× forward earnings with EPS growing ' + g + '%, the price assumes growth slows a lot. If it doesn’t, the stock is cheap.'
        : peg != null && peg > 2.5 ? 'At ' + fwdPE.toFixed(0) + '× forward earnings, the price already assumes years of growth above today’s ' + g + '%. Little room for a miss.'
        : growth <= 0.03 ? 'Earnings aren’t growing, so ' + fwdPE.toFixed(0) + '× forward earnings is a bet on a turnaround or steady payouts.'
        : 'At ' + fwdPE.toFixed(0) + '× forward earnings and ' + g + '% EPS growth, the price is roughly in line with growth.';
    } else priced = fwdPE ? fwdPE.toFixed(0) + '× forward earnings.' : peTTM ? peTTM.toFixed(0) + '× trailing earnings.' : 'Not enough estimates to judge.';
    const hot = hotRank != null && hotRank <= 60;
    const hype = hot && (verdict === 'expensive' || verdict === 'perfection');
    return { price: price, mcap: mcap, epsTTM: epsTTM, peTTM: peTTM, ps: ps, pb: pb, fwdEps: fwdEps, fwdPE: fwdPE, growth: growth, peg: peg, upside: upside, tMean: tMean, tHigh: tHigh,
      verdict: verdict, score: Math.round(score * 10) / 10, why: why, priced: priced, hotRank: hot ? hotRank : null, hype: hype, nextQ: next ? 'FY' + next.fiscal_year + ' Q' + next.fiscal_period : null };
  }
  const VERDICT = { under: ['Undervalued', '#5EE0A0'], reasonable: ['Reasonable', '#8CE3B5'], full: ['Fully valued', '#C9D2E0'], expensive: ['Expensive', '#FFB38A'], perfection: ['Priced for perfection', '#FF8A8A'], unprofitable: ['Not profitable', '#F2C27A'] };
  const api = { value: value, VERDICT: VERDICT };
  if (typeof module !== 'undefined') module.exports = api; else root.VAL = api;
})(this);
