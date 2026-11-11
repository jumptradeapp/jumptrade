/* jumptrade. Chart patterns: a plain-English guide to the shapes price makes before a move, with how to trade each one. */
(function () {
  // pts: price path. ln: trendlines. e: entry point. st: stop level. tg: target level. (box is 200 x 100, y grows down)
  const P = [
    { id: 'bflag', n: 'Bull flag', t: 'bull', k: 'Continuation',
      s: 'A sharp run up, then a short, tidy drift lower. Buyers are resting, not leaving.',
      pts: [[6, 92], [44, 26], [56, 38], [66, 31], [78, 43], [88, 36], [100, 47], [118, 18], [138, 6]], ln: [[44, 26, 106, 40], [56, 38, 106, 51]], e: [108, 38], st: 50, tg: 4,
      buy: 'When price breaks above the top of the flag, ideally on a jump in volume.', stop: 'Just under the lowest point of the flag.', tgt: 'Add the height of the first run (the pole) to the breakout price.', warn: 'If the flag gives back more than half the pole, it is not a flag anymore.' },
    { id: 'bearflag', n: 'Bear flag', t: 'bear', k: 'Continuation',
      s: 'A sharp drop, then a weak bounce that drifts up. Sellers are catching their breath.',
      pts: [[6, 8], [44, 74], [56, 62], [66, 69], [78, 57], [88, 64], [100, 53], [118, 82], [138, 94]], ln: [[44, 74, 106, 60], [56, 62, 106, 49]], e: [108, 62], st: 50, tg: 96,
      buy: 'Sell or avoid when price breaks below the bottom of the flag.', stop: 'Just above the highest point of the bounce.', tgt: 'Subtract the height of the first drop from the breakdown price.', warn: 'If it climbs back above the top of the flag, the drop is probably done.' },
    { id: 'cup', n: 'Cup and handle', t: 'bull', k: 'Continuation',
      s: 'A rounded dip back to an old high, then a small pullback before breaking out.',
      pts: [[6, 30], [20, 36], [36, 52], [56, 60], [76, 60], [96, 50], [112, 36], [122, 30], [130, 37], [138, 40], [146, 35], [154, 28], [176, 6]], ln: [[6, 30, 160, 30]], e: [155, 29], st: 42, tg: 2,
      buy: 'When price clears the handle and the old high (the rim).', stop: 'Below the low of the handle.', tgt: 'Add the depth of the cup to the breakout price.', warn: 'A V-shaped cup or a handle that sinks into the bottom half of the cup is weaker.' },
    { id: 'asc', n: 'Ascending triangle', t: 'bull', k: 'Continuation',
      s: 'Sellers hold one price, but buyers keep stepping in higher. Something has to give.',
      pts: [[6, 82], [26, 28], [46, 62], [66, 28], [86, 50], [106, 28], [122, 40], [138, 28], [156, 10], [176, 2]], ln: [[22, 28, 144, 28], [6, 82, 128, 38]], e: [141, 26], st: 42, tg: 2,
      buy: 'When price closes above the flat top.', stop: 'Below the most recent higher low.', tgt: 'Add the height of the triangle at its widest to the breakout price.', warn: 'A breakout on light volume often slips back inside.' },
    { id: 'desc', n: 'Descending triangle', t: 'bear', k: 'Continuation',
      s: 'Buyers defend one price, but each bounce is weaker. Support usually cracks.',
      pts: [[6, 18], [26, 72], [46, 38], [66, 72], [86, 50], [106, 72], [122, 60], [138, 72], [156, 90], [176, 98]], ln: [[22, 72, 144, 72], [6, 18, 128, 62]], e: [141, 74], st: 58, tg: 98,
      buy: 'Sell or avoid when price closes below the flat bottom.', stop: 'Above the most recent lower high.', tgt: 'Subtract the triangle’s height from the breakdown price.', warn: 'If it breaks above the falling line instead, sellers have run out.' },
    { id: 'sym', n: 'Symmetrical triangle', t: 'either', k: 'Continuation',
      s: 'Highs get lower and lows get higher. Price coils, then usually breaks the way it was already going.',
      pts: [[6, 50], [22, 14], [42, 80], [62, 24], [82, 70], [100, 34], [116, 60], [130, 42], [146, 22], [168, 8]], ln: [[22, 14, 140, 44], [42, 80, 140, 52]], e: [139, 40], st: 58, tg: 4,
      buy: 'Trade the direction it breaks, once a candle closes outside the lines.', stop: 'Just back inside the triangle, past the last swing.', tgt: 'The height of the triangle at its widest, added from the breakout.', warn: 'Breakouts near the very tip are less reliable. Fake moves are common.' },
    { id: 'dbot', n: 'Double bottom', t: 'bull', k: 'Reversal',
      s: 'Price tests the same low twice and holds. A “W” that often ends a downtrend.',
      pts: [[6, 10], [32, 76], [56, 40], [82, 76], [106, 40], [120, 28], [142, 10]], ln: [[32, 40, 130, 40], [24, 77, 92, 77]], e: [110, 38], st: 80, tg: 4,
      buy: 'When price breaks above the middle peak of the W (the neckline).', stop: 'Below the second low.', tgt: 'Add the distance from the lows to the neckline.', warn: 'Two lows weeks apart are stronger than two lows days apart.' },
    { id: 'dtop', n: 'Double top', t: 'bear', k: 'Reversal',
      s: 'Price fails at the same high twice. An “M” that often ends an uptrend.',
      pts: [[6, 90], [32, 24], [56, 60], [82, 24], [106, 60], [120, 72], [142, 90]], ln: [[32, 60, 130, 60], [24, 23, 92, 23]], e: [110, 62], st: 20, tg: 96,
      buy: 'Sell or avoid when price breaks below the dip between the two highs.', stop: 'Above the second high.', tgt: 'Subtract the distance from the highs to the neckline.', warn: 'Until the neckline breaks, it is just a stock taking a break.' },
    { id: 'hs', n: 'Head and shoulders', t: 'bear', k: 'Reversal',
      s: 'A high, a higher high, then a lower high. The uptrend is losing steam.',
      pts: [[6, 80], [30, 40], [46, 58], [72, 16], [98, 58], [116, 40], [134, 60], [148, 74], [168, 92]], ln: [[38, 58, 146, 61]], e: [138, 62], st: 36, tg: 98,
      buy: 'Sell or avoid when price breaks below the neckline (the line under both shoulders).', stop: 'Above the right shoulder.', tgt: 'Subtract the distance from the head down to the neckline.', warn: 'Price often bounces back up to test the neckline once before falling.' },
    { id: 'ihs', n: 'Inverse head and shoulders', t: 'bull', k: 'Reversal',
      s: 'A low, a lower low, then a higher low. Sellers are getting tired.',
      pts: [[6, 20], [30, 60], [46, 42], [72, 84], [98, 42], [116, 60], [134, 40], [148, 26], [168, 8]], ln: [[38, 42, 146, 39]], e: [138, 38], st: 64, tg: 2,
      buy: 'When price breaks above the neckline (the line across both bounce highs).', stop: 'Below the right shoulder.', tgt: 'Add the distance from the head up to the neckline.', warn: 'Wants rising volume on the right side. Without it, be skeptical.' },
    { id: 'fwedge', n: 'Falling wedge', t: 'bull', k: 'Reversal',
      s: 'Price slides lower in a narrowing channel. Each drop is smaller. Sellers are fading.',
      pts: [[6, 12], [22, 40], [36, 26], [52, 54], [66, 40], [82, 64], [96, 52], [110, 68], [124, 52], [144, 24], [164, 10]], ln: [[6, 12, 128, 54], [22, 40, 128, 72]], e: [124, 52], st: 72, tg: 10,
      buy: 'When price breaks above the upper falling line.', stop: 'Below the last low inside the wedge.', tgt: 'Back to where the wedge started.', warn: 'Can take a long time to resolve. Wait for the break, don’t guess it.' },
    { id: 'rwedge', n: 'Rising wedge', t: 'bear', k: 'Reversal',
      s: 'Price climbs in a narrowing channel. Each push is weaker. Buyers are fading.',
      pts: [[6, 88], [22, 60], [36, 74], [52, 46], [66, 60], [82, 36], [96, 48], [110, 32], [124, 48], [144, 76], [164, 90]], ln: [[6, 88, 128, 46], [22, 60, 128, 28]], e: [124, 48], st: 28, tg: 90,
      buy: 'Sell or avoid when price breaks below the lower rising line.', stop: 'Above the last high inside the wedge.', tgt: 'Back to where the wedge started.', warn: 'Common after a long run in a hot stock. Tighten stops if you own it.' },
    { id: 'base', n: 'Flat base breakout', t: 'bull', k: 'Continuation',
      s: 'After a run, price moves sideways in a tight range for weeks, then breaks out.',
      pts: [[6, 88], [36, 40], [48, 34], [60, 44], [72, 36], [84, 46], [96, 35], [108, 44], [120, 34], [134, 22], [156, 8]], ln: [[42, 33, 126, 33], [42, 47, 126, 47]], e: [124, 32], st: 48, tg: 6,
      buy: 'When price clears the top of the range on strong volume.', stop: 'Below the bottom of the range.', tgt: 'A common goal is 20–25% above the breakout.', warn: 'A range wider than about 15% is sloppy, not a base.' },
  ];
  const COL = { bull: '#5EE0A0', bear: '#FF8A8A', either: '#9DB8FF' };
  const LBL = { bull: 'Bullish', bear: 'Bearish', either: 'Either way' };
  const E = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function chart(p) {
    const c = COL[p.t], up = p.tg < p.e[1];
    const path = p.pts.map((q, i) => (i ? 'L' : 'M') + q[0] + ' ' + q[1]).join(' ');
    const lines = p.ln.map((l) => '<line x1="' + l[0] + '" y1="' + l[1] + '" x2="' + l[2] + '" y2="' + l[3] + '" stroke="#9DB8FF" stroke-opacity=".55" stroke-width="1.4" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>').join('');
    const x0 = p.e[0], x1 = 196;
    return '<svg class="patSvg" viewBox="0 -4 200 108" preserveAspectRatio="none" aria-hidden="true">' +
      '<line x1="' + x0 + '" y1="' + p.tg + '" x2="' + x1 + '" y2="' + p.tg + '" stroke="#5EE0A0" stroke-width="1.2" stroke-dasharray="2 3" opacity=".8" vector-effect="non-scaling-stroke"/>' +
      '<line x1="' + x0 + '" y1="' + p.st + '" x2="' + x1 + '" y2="' + p.st + '" stroke="#FF8A8A" stroke-width="1.2" stroke-dasharray="2 3" opacity=".8" vector-effect="non-scaling-stroke"/>' +
      lines + '<path d="' + path + '" fill="none" stroke="' + c + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
      '</svg><span class="patDot" style="left:' + (p.e[0] / 2) + '%;top:' + ((p.e[1] + 4) / 1.08) + '%"></span>' +
      '<span class="patTag g" style="top:' + ((p.tg + 4) / 1.08) + '%">Target</span><span class="patTag r" style="top:' + ((p.st + 4) / 1.08) + '%">Stop</span>' +
      '<span class="patTag b" style="left:' + Math.max(2, p.e[0] / 2 - 6) + '%;top:' + ((p.e[1] + 4) / 1.08 + (up ? 6 : -16)) + '%">' + (p.t === 'bear' ? 'Sell' : 'Buy') + '</span>';
  }
  const PAT = { f: 'all', open: {} };
  PAT.render = function () {
    const el = document.getElementById('patList'); if (!el) return;
    const list = P.filter((p) => PAT.f === 'all' || p.t === PAT.f || (PAT.f === 'bull' && p.t === 'either') || (PAT.f === 'bear' && p.t === 'either'));
    const chip = (k, l) => '<button class="patChip' + (PAT.f === k ? ' on' : '') + '" data-patf="' + k + '">' + l + '</button>';
    const card = (p) => {
      const o = PAT.open[p.id];
      return '<div class="glass sec patCard' + (o ? ' open' : '') + '" data-pato="' + p.id + '">' +
        '<div class="patArt">' + chart(p) + '</div>' +
        '<div class="patHd"><b>' + E(p.n) + '</b><span class="patPill" style="color:' + COL[p.t] + ';border-color:' + COL[p.t] + '55">' + LBL[p.t] + '</span><small>' + p.k + '</small></div>' +
        '<p class="patS">' + E(p.s) + '</p>' +
        (o ? '<div class="patHow">' +
          '<div><i style="background:#3B7BFF"></i><span><b>' + (p.t === 'bear' ? 'Sell when' : 'Buy when') + '</b>' + E(p.buy) + '</span></div>' +
          '<div><i style="background:#FF8A8A"></i><span><b>Stop</b>' + E(p.stop) + '</span></div>' +
          '<div><i style="background:#5EE0A0"></i><span><b>Target</b>' + E(p.tgt) + '</span></div>' +
          '<div><i style="background:#F2C27A"></i><span><b>Watch out</b>' + E(p.warn) + '</span></div></div>'
          : '<div class="patMore">How to trade it ›</div>') + '</div>';
    };
    setHTML(el,
      '<div class="patChips">' + chip('all', 'All') + chip('bull', 'Bullish') + chip('bear', 'Bearish') + '</div>' +
      list.map(card).join('') +
      '<div class="glass sec patRules"><b>Three rules for every pattern</b>' +
      '<div><em>1</em><span>No breakout, no trade. A pattern isn’t finished until price breaks out of it.</span></div>' +
      '<div><em>2</em><span>Volume should jump on the breakout. A quiet breakout often fails.</span></div>' +
      '<div><em>3</em><span>Set your stop before you buy, and keep each loss small.</span></div>' +
      '<small>Patterns raise the odds. They don’t guarantee anything. Educational, not advice.</small></div>');
  };
  document.addEventListener('click', (e) => {
    const f = e.target.closest('[data-patf]'); if (f) { PAT.f = f.dataset.patf; PAT.render(); return; }
    const o = e.target.closest('[data-pato]'); if (o) { const id = o.dataset.pato; PAT.open[id] = !PAT.open[id]; PAT.render(); }
  });
  window.PAT = PAT;
})();
