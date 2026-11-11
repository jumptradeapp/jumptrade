/* jumptrade. Chart patterns: a plain-English guide to the shapes price makes before a move, with how to trade each one. */
(function () {
  // pts: price path. ln: trendlines. e: entry point. st: stop level. tg: target level. (box is 200 x 100, y grows down)
  const P = [
    { id: 'bflag', n: 'Bull flag', t: 'bull', k: 'Continuation',
      s: 'A sharp run up, then a short, tidy drift lower. Buyers are resting, not leaving.',
      pts: [[6, 92], [44, 26], [56, 38], [66, 31], [78, 43], [88, 36], [100, 47], [118, 18], [138, 6]], ln: [[44, 26, 106, 40], [56, 38, 106, 51]], e: [108, 38], st: 50, tg: 4, lb: [[18,56,'Pole'],[78,62,'Flag']],
      buy: 'When price breaks above the top of the flag, ideally on a jump in volume.', stop: 'Just under the lowest point of the flag.', tgt: 'Add the height of the first run (the pole) to the breakout price.', warn: 'If the flag gives back more than half the pole, it is not a flag anymore.' },
    { id: 'bearflag', n: 'Bear flag', t: 'bear', k: 'Continuation',
      s: 'A sharp drop, then a weak bounce that drifts up. Sellers are catching their breath.',
      pts: [[6, 8], [44, 74], [56, 62], [66, 69], [78, 57], [88, 64], [100, 53], [118, 82], [138, 94]], ln: [[44, 74, 106, 60], [56, 62, 106, 49]], e: [108, 62], st: 50, tg: 96, lb: [[16,44,'Pole'],[78,38,'Flag']],
      buy: 'Sell or avoid when price breaks below the bottom of the flag.', stop: 'Just above the highest point of the bounce.', tgt: 'Subtract the height of the first drop from the breakdown price.', warn: 'If it climbs back above the top of the flag, the drop is probably done.' },
    { id: 'cup', n: 'Cup and handle', t: 'bull', k: 'Continuation',
      s: 'A rounded dip back to an old high, then a small pullback before breaking out.',
      pts: [[6, 30], [20, 36], [36, 52], [56, 60], [76, 60], [96, 50], [112, 36], [122, 30], [130, 37], [138, 40], [146, 35], [154, 28], [176, 6]], ln: [[6, 30, 160, 30]], e: [155, 29], st: 42, tg: 2, lb: [[66,72,'Cup'],[140,52,'Handle'],[30,24,'Old high']],
      buy: 'When price clears the handle and the old high (the rim).', stop: 'Below the low of the handle.', tgt: 'Add the depth of the cup to the breakout price.', warn: 'A V-shaped cup or a handle that sinks into the bottom half of the cup is weaker.' },
    { id: 'asc', n: 'Ascending triangle', t: 'bull', k: 'Continuation',
      s: 'Sellers hold one price, but buyers keep stepping in higher. Something has to give.',
      pts: [[6, 82], [26, 28], [46, 62], [66, 28], [86, 50], [106, 28], [122, 40], [138, 28], [156, 10], [176, 2]], ln: [[22, 28, 144, 28], [6, 82, 128, 38]], e: [141, 26], st: 42, tg: 2, lb: [[64,22,'Flat top'],[78,66,'Higher lows']],
      buy: 'When price closes above the flat top.', stop: 'Below the most recent higher low.', tgt: 'Add the height of the triangle at its widest to the breakout price.', warn: 'A breakout on light volume often slips back inside.' },
    { id: 'desc', n: 'Descending triangle', t: 'bear', k: 'Continuation',
      s: 'Buyers defend one price, but each bounce is weaker. Support usually cracks.',
      pts: [[6, 18], [26, 72], [46, 38], [66, 72], [86, 50], [106, 72], [122, 60], [138, 72], [156, 90], [176, 98]], ln: [[22, 72, 144, 72], [6, 18, 128, 62]], e: [141, 74], st: 58, tg: 98, lb: [[64,82,'Flat bottom'],[78,36,'Lower highs']],
      buy: 'Sell or avoid when price closes below the flat bottom.', stop: 'Above the most recent lower high.', tgt: 'Subtract the triangle’s height from the breakdown price.', warn: 'If it breaks above the falling line instead, sellers have run out.' },
    { id: 'sym', n: 'Symmetrical triangle', t: 'either', k: 'Continuation',
      s: 'Highs get lower and lows get higher. Price coils, then usually breaks the way it was already going.',
      pts: [[6, 50], [22, 14], [42, 80], [62, 24], [82, 70], [100, 34], [116, 60], [130, 42], [146, 22], [168, 8]], ln: [[22, 14, 140, 44], [42, 80, 140, 52]], e: [139, 40], st: 58, tg: 4, lb: [[84,50,'Coiling']],
      buy: 'Trade the direction it breaks, once a candle closes outside the lines.', stop: 'Just back inside the triangle, past the last swing.', tgt: 'The height of the triangle at its widest, added from the breakout.', warn: 'Breakouts near the very tip are less reliable. Fake moves are common.' },
    { id: 'dbot', n: 'Double bottom', t: 'bull', k: 'Reversal',
      s: 'Price tests the same low twice and holds. A “W” that often ends a downtrend.',
      pts: [[6, 10], [32, 76], [56, 40], [82, 76], [106, 40], [120, 28], [142, 10]], ln: [[32, 40, 130, 40], [24, 77, 92, 77]], e: [110, 38], st: 80, tg: 4, lb: [[32,88,'Low 1'],[82,88,'Low 2'],[70,34,'Neckline']],
      buy: 'When price breaks above the middle peak of the W (the neckline).', stop: 'Below the second low.', tgt: 'Add the distance from the lows to the neckline.', warn: 'Two lows weeks apart are stronger than two lows days apart.' },
    { id: 'dtop', n: 'Double top', t: 'bear', k: 'Reversal',
      s: 'Price fails at the same high twice. An “M” that often ends an uptrend.',
      pts: [[6, 90], [32, 24], [56, 60], [82, 24], [106, 60], [120, 72], [142, 90]], ln: [[32, 60, 130, 60], [24, 23, 92, 23]], e: [110, 62], st: 20, tg: 96, lb: [[32,16,'High 1'],[82,16,'High 2'],[70,70,'Neckline']],
      buy: 'Sell or avoid when price breaks below the dip between the two highs.', stop: 'Above the second high.', tgt: 'Subtract the distance from the highs to the neckline.', warn: 'Until the neckline breaks, it is just a stock taking a break.' },
    { id: 'hs', n: 'Head and shoulders', t: 'bear', k: 'Reversal',
      s: 'A high, a higher high, then a lower high. The uptrend is losing steam.',
      pts: [[6, 80], [30, 40], [46, 58], [72, 16], [98, 58], [116, 40], [134, 60], [148, 74], [168, 92]], ln: [[38, 58, 146, 61]], e: [138, 62], st: 36, tg: 98, lb: [[30,32,'Shoulder'],[72,8,'Head'],[116,32,'Shoulder'],[90,70,'Neckline']],
      buy: 'Sell or avoid when price breaks below the neckline (the line under both shoulders).', stop: 'Above the right shoulder.', tgt: 'Subtract the distance from the head down to the neckline.', warn: 'Price often bounces back up to test the neckline once before falling.' },
    { id: 'ihs', n: 'Inverse head and shoulders', t: 'bull', k: 'Reversal',
      s: 'A low, a lower low, then a higher low. Sellers are getting tired.',
      pts: [[6, 20], [30, 60], [46, 42], [72, 84], [98, 42], [116, 60], [134, 40], [148, 26], [168, 8]], ln: [[38, 42, 146, 39]], e: [138, 38], st: 64, tg: 2, lb: [[30,70,'Shoulder'],[72,94,'Head'],[116,70,'Shoulder'],[90,32,'Neckline']],
      buy: 'When price breaks above the neckline (the line across both bounce highs).', stop: 'Below the right shoulder.', tgt: 'Add the distance from the head up to the neckline.', warn: 'Wants rising volume on the right side. Without it, be skeptical.' },
    { id: 'fwedge', n: 'Falling wedge', t: 'bull', k: 'Reversal',
      s: 'Price slides lower in a narrowing channel. Each drop is smaller. Sellers are fading.',
      pts: [[6, 12], [22, 40], [36, 26], [52, 54], [66, 40], [82, 64], [96, 52], [110, 68], [124, 52], [144, 24], [164, 10]], ln: [[6, 12, 128, 54], [22, 40, 128, 72]], e: [124, 52], st: 72, tg: 10, lb: [[50,62,'Narrowing']],
      buy: 'When price breaks above the upper falling line.', stop: 'Below the last low inside the wedge.', tgt: 'Back to where the wedge started.', warn: 'Can take a long time to resolve. Wait for the break, don’t guess it.' },
    { id: 'rwedge', n: 'Rising wedge', t: 'bear', k: 'Reversal',
      s: 'Price climbs in a narrowing channel. Each push is weaker. Buyers are fading.',
      pts: [[6, 88], [22, 60], [36, 74], [52, 46], [66, 60], [82, 36], [96, 48], [110, 32], [124, 48], [144, 76], [164, 90]], ln: [[6, 88, 128, 46], [22, 60, 128, 28]], e: [124, 48], st: 28, tg: 90, lb: [[50,36,'Narrowing']],
      buy: 'Sell or avoid when price breaks below the lower rising line.', stop: 'Above the last high inside the wedge.', tgt: 'Back to where the wedge started.', warn: 'Common after a long run in a hot stock. Tighten stops if you own it.' },
    { id: 'base', n: 'Flat base breakout', t: 'bull', k: 'Continuation',
      s: 'After a run, price moves sideways in a tight range for weeks, then breaks out.',
      pts: [[6, 88], [36, 40], [48, 34], [60, 44], [72, 36], [84, 46], [96, 35], [108, 44], [120, 34], [134, 22], [156, 8]], ln: [[42, 33, 126, 33], [42, 47, 126, 47]], e: [124, 32], st: 48, tg: 6, lb: [[84,58,'Tight range']],
      buy: 'When price clears the top of the range on strong volume.', stop: 'Below the bottom of the range.', tgt: 'A common goal is 20–25% above the breakout.', warn: 'A range wider than about 15% is sloppy, not a base.' },
  ];
  const COL = { bull: '#5EE0A0', bear: '#FF8A8A', either: '#9DB8FF' };
  const LBL = { bull: 'Bullish', bear: 'Bearish', either: 'Either way' };
  const E = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function chart(p) {
    const c = COL[p.t], bear = p.t === 'bear', up = p.tg < p.e[1];
    const path = p.pts.map((q, i) => (i ? 'L' : 'M') + q[0] + ' ' + q[1]).join(' ');
    const lines = p.ln.map((l) => '<line x1="' + l[0] + '" y1="' + l[1] + '" x2="' + l[2] + '" y2="' + l[3] + '" stroke="#B7CCF2" stroke-opacity=".8" stroke-width="1.3" stroke-dasharray="5 3"/>').join('');
    const zone = p.ln.length === 2 ? '<path d="M' + p.ln[0][0] + ' ' + p.ln[0][1] + 'L' + p.ln[0][2] + ' ' + p.ln[0][3] + 'L' + p.ln[1][2] + ' ' + p.ln[1][3] + 'L' + p.ln[1][0] + ' ' + p.ln[1][1] + 'Z" fill="#6FA8FF" opacity=".09"/>' : '';
    const x0 = p.e[0], ex = p.e[0], ey = p.e[1];
    const hl = (y, col, t) => '<line x1="' + x0 + '" y1="' + y + '" x2="200" y2="' + y + '" stroke="' + col + '" stroke-width="1.2" stroke-dasharray="2.5 2.5"/><text x="200" y="' + (y + (y < ey ? -3 : 9)) + '" text-anchor="end" fill="' + col + '" class="pT">' + t + '</text>';
    const labs = (p.lb || []).map((l) => '<text x="' + l[0] + '" y="' + l[1] + '" text-anchor="middle" class="pL">' + l[2] + '</text>').join('');
    const mid = 'pa' + p.id;
    return '<svg class="patSvg" viewBox="-4 -12 208 124" aria-hidden="true"><defs><marker id="' + mid + '" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + c + '"/></marker></defs>' +
      zone + hl(p.tg, '#5EE0A0', 'TARGET') + hl(p.st, '#FF8A8A', 'STOP') + lines +
      '<path d="' + path + '" fill="none" stroke="' + c + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" marker-end="url(#' + mid + ')"/>' + labs +
      '<circle cx="' + ex + '" cy="' + ey + '" r="4.2" fill="#fff" stroke="#3B7BFF" stroke-width="2.4"/>' +
      '<text x="' + (ex - 7) + '" y="' + (ey + (up ? 13 : -7)) + '" text-anchor="end" class="pB">' + (bear ? 'SELL' : 'BUY') + '</text></svg>';
  }
  /* ---------- Candlesticks ---------- */
  const DN = [[62, 63, 55, 56], [57, 58, 50, 51], [52, 53, 45, 46]], UPC = [[38, 45, 37, 44], [43, 50, 42, 49], [48, 55, 47, 54]];
  const C = [
    { id: 'hammer', n: 'Hammer', t: 'bull', ctx: DN, c: [[42.5, 46.5, 34, 46]], s: 'Small body on top, long wick below, after a drop. Sellers pushed down hard and buyers shoved it back.', means: 'The selling may be running out.', conf: 'The next candle closes higher.', act: 'Buy above the hammer’s high. Stop under its wick.' },
    { id: 'invh', n: 'Inverted hammer', t: 'bull', ctx: DN, c: [[42.5, 56, 42, 46]], s: 'Small body at the bottom, long wick on top, after a drop. Buyers are starting to test higher.', means: 'An early hint the drop could turn.', conf: 'A strong green candle next.', act: 'Buy above its high once confirmed. Stop under its low.' },
    { id: 'engbull', n: 'Bullish engulfing', t: 'bull', ctx: DN, c: [[47, 47.5, 44, 44.5], [44, 52, 43.5, 51.5]], s: 'A big green candle that completely covers the red candle before it.', means: 'Buyers took over in one day.', conf: 'Stronger on high volume and at a support level.', act: 'Buy above the green candle. Stop under its low.' },
    { id: 'mstar', n: 'Morning star', t: 'bull', ctx: DN.slice(0, 2), c: [[51, 52, 43, 44], [42, 43.5, 40, 42.5], [43.5, 52, 43, 51]], s: 'Big red, a small pause candle, then big green. Three days that turn a downtrend.', means: 'One of the more reliable bottoms.', conf: 'The green candle closes past the middle of the red one.', act: 'Buy near the third candle’s close. Stop under the small middle candle.' },
    { id: 'pierce', n: 'Piercing line', t: 'bull', ctx: DN, c: [[51, 52, 43, 44], [42, 49, 41.5, 48.5]], s: 'After a red day, it opens lower but closes more than halfway up the red candle.', means: 'Buyers erased most of the prior loss.', conf: 'Follow-through higher the next day.', act: 'Buy above its high. Stop under its low.' },
    { id: 'soldiers', n: 'Three white soldiers', t: 'bull', ctx: DN.slice(1), c: [[44, 49.5, 43.5, 49], [48, 54.5, 47.5, 54], [53, 59.5, 52.5, 59]], s: 'Three strong green candles in a row, each closing near its high.', means: 'A steady, real shift to buying.', conf: 'Small wicks. Long upper wicks mean it is tiring.', act: 'Buy a small dip after. Stop under the second candle.' },
    { id: 'haramibull', n: 'Bullish harami', t: 'bull', ctx: DN, c: [[52, 53, 42, 43], [45, 48, 44.5, 47.5]], s: 'A small green candle tucked inside the previous big red one.', means: 'The selling has stalled.', conf: 'Needs a higher close next. Weaker on its own.', act: 'Buy above the big red candle’s high. Stop under its low.' },
    { id: 'star', n: 'Shooting star', t: 'bear', ctx: UPC, c: [[57.5, 67, 53.5, 54]], s: 'Small body at the bottom, long wick on top, after a run. Buyers pushed up and got rejected.', means: 'The rally may be running out.', conf: 'The next candle closes lower.', act: 'Sell or tighten your stop under its low.' },
    { id: 'hang', n: 'Hanging man', t: 'bear', ctx: UPC, c: [[57.5, 58, 46, 54]], s: 'Looks like a hammer, but shows up after a run up. A warning, not a signal.', means: 'Sellers showed up during the day.', conf: 'A red candle that closes below it.', act: 'Tighten your stop under its low.' },
    { id: 'engbear', n: 'Bearish engulfing', t: 'bear', ctx: UPC, c: [[54, 57.5, 53.5, 57], [58, 58.5, 50, 51]], s: 'A big red candle that completely covers the green candle before it.', means: 'Sellers took over in one day.', conf: 'Stronger on high volume and near resistance.', act: 'Sell or avoid. Stop above the red candle’s high.' },
    { id: 'estar', n: 'Evening star', t: 'bear', ctx: UPC.slice(0, 2), c: [[49, 58, 48.5, 57], [58.5, 61, 58, 59], [57.5, 58, 49, 50]], s: 'Big green, a small pause candle, then big red. Three days that turn an uptrend.', means: 'One of the more reliable tops.', conf: 'The red candle closes past the middle of the green one.', act: 'Sell or avoid. Stop above the small middle candle.' },
    { id: 'cloud', n: 'Dark cloud cover', t: 'bear', ctx: UPC, c: [[49, 58, 48.5, 57], [59, 59.5, 51, 52]], s: 'After a green day, it opens higher but closes more than halfway down the green candle.', means: 'Sellers erased most of the prior gain.', conf: 'Follow-through lower the next day.', act: 'Sell or tighten your stop under its low.' },
    { id: 'crows', n: 'Three black crows', t: 'bear', ctx: UPC.slice(1), c: [[58, 58.5, 52.5, 53], [53.5, 54, 47.5, 48], [48.5, 49, 42.5, 43]], s: 'Three strong red candles in a row, each closing near its low.', means: 'A steady, real shift to selling.', conf: 'Small wicks. A long lower wick means it is tiring.', act: 'Sell or avoid. Wait for a base before buying.' },
    { id: 'doji', n: 'Doji', t: 'either', ctx: UPC, c: [[55, 61, 49, 55.2]], s: 'Opens and closes at almost the same price. A cross shape.', means: 'Buyers and sellers are tied. After a big run, that is a caution sign.', conf: 'Means nothing alone. Watch what the next candle does.', act: 'Wait. Trade the direction of the next candle.' },
    { id: 'spin', n: 'Spinning top', t: 'either', ctx: DN, c: [[44, 49.5, 39, 46.5]], s: 'A small body with wicks on both sides.', means: 'Indecision. The trend is losing push.', conf: 'The next candle shows who won.', act: 'Wait for the next candle before acting.' },
  ];
  function candles(q) {
    const all = q.ctx.concat(q.c), lo = Math.min.apply(0, all.map((k) => k[2])), hi = Math.max.apply(0, all.map((k) => k[1]));
    const Y = (v) => 8 + (hi - v) / (hi - lo) * 84, n = all.length, gap = 200 / (n + 1), w = Math.min(16, gap * 0.55);
    const first = q.ctx.length, x1 = gap * (first + 1) - gap / 2, x2 = gap * n + gap / 2;
    let h = '<svg class="patSvg" viewBox="0 0 200 100" aria-hidden="true"><rect x="' + (x1 + 2) + '" y="2" width="' + (x2 - x1 - 4) + '" height="96" rx="7" fill="#6FA8FF" opacity=".1"/>';
    all.forEach((k, i) => {
      const x = gap * (i + 1), g = k[3] >= k[0], col = g ? '#5EE0A0' : '#FF6B6B', ctx = i < first, top = Y(Math.max(k[0], k[3])), bot = Y(Math.min(k[0], k[3]));
      h += '<g opacity="' + (ctx ? .32 : 1) + '"><line x1="' + x + '" y1="' + Y(k[1]) + '" x2="' + x + '" y2="' + Y(k[2]) + '" stroke="' + col + '" stroke-width="1.6"/>' +
        '<rect x="' + (x - w / 2) + '" y="' + top + '" width="' + w + '" height="' + Math.max(1.6, bot - top) + '" rx="1.5" fill="' + col + '"/></g>';
    });
    return h + '</svg>';
  }
  function anatomy() {
    const k = (x, g) => { const col = g ? '#5EE0A0' : '#FF6B6B', o = g ? 70 : 30, c = g ? 30 : 70;
      return '<line x1="' + x + '" y1="8" x2="' + x + '" y2="92" stroke="' + col + '" stroke-width="2"/><rect x="' + (x - 11) + '" y="30" width="22" height="40" rx="2" fill="' + col + '"/>' +
        '<text x="' + (x + 18) + '" y="11" class="pL" text-anchor="start">High</text><text x="' + (x + 18) + '" y="94" class="pL" text-anchor="start">Low</text>' +
        '<text x="' + (x + 18) + '" y="' + (o + 3) + '" class="pT" fill="#E6EBF2" text-anchor="start">Open</text><text x="' + (x + 18) + '" y="' + (c + 3) + '" class="pT" fill="#E6EBF2" text-anchor="start">Close</text>'; };
    return '<div class="glass sec patCard patAna"><div class="patArt"><svg class="patSvg" viewBox="0 0 200 100" aria-hidden="true">' + k(38, true) + k(130, false) +
      '<text x="10" y="53" class="pL" text-anchor="middle" transform="rotate(-90 10 53)">BODY</text><text x="124" y="20" class="pL" text-anchor="end">Wick</text><text x="124" y="86" class="pL" text-anchor="end">Wick</text></svg></div>' +
      '<div class="patHd"><b>How to read a candle</b></div><p class="patS">Each candle is one day (or one bar). The <b style="color:#fff">body</b> runs from the open to the close. <b style="color:#5EE0A0">Green</b> closed higher than it opened, <b style="color:#FF6B6B">red</b> closed lower. The thin <b style="color:#fff">wicks</b> show the highest and lowest prices it reached.</p>' +
      '<p class="patS">Long wicks mean a price was tried and rejected. One candle is a hint. Always wait for the next one to confirm.</p></div>';
  }
  const PAT = { f: 'all', m: 'shapes', open: {} };
  PAT.render = function () {
    const el = document.getElementById('patList'); if (!el) return;
    const ok = (t) => PAT.f === 'all' || t === PAT.f || t === 'either';
    const chip = (k, l) => '<button class="patChip' + (PAT.f === k ? ' on' : '') + '" data-patf="' + k + '">' + l + '</button>';
    const tab = (k, l) => '<button class="' + (PAT.m === k ? 'on' : '') + '" data-patm="' + k + '">' + l + '</button>';
    const pill = (t) => '<span class="patPill" style="color:' + COL[t] + ';border-color:' + COL[t] + '55">' + LBL[t] + '</span>';
    const row = (col, lbl, txt) => '<div><i style="background:' + col + '"></i><span><b>' + lbl + '</b>' + E(txt) + '</span></div>';
    const card = (p) => {
      const o = PAT.open[p.id];
      return '<div class="glass sec patCard' + (o ? ' open' : '') + '" data-pato="' + p.id + '"><div class="patArt">' + chart(p) + '</div>' +
        '<div class="patHd"><b>' + E(p.n) + '</b>' + pill(p.t) + '<small>' + p.k + '</small></div><p class="patS">' + E(p.s) + '</p>' +
        (o ? '<div class="patHow">' + row('#3B7BFF', p.t === 'bear' ? 'Sell when' : 'Buy when', p.buy) + row('#FF8A8A', 'Stop', p.stop) + row('#5EE0A0', 'Target', p.tgt) + row('#F2C27A', 'Watch out', p.warn) + '</div>' : '<div class="patMore">How to trade it ›</div>') + '</div>';
    };
    const ccard = (q) => {
      const o = PAT.open[q.id];
      return '<div class="glass sec patCard' + (o ? ' open' : '') + '" data-pato="' + q.id + '"><div class="patArt">' + candles(q) + '</div>' +
        '<div class="patHd"><b>' + E(q.n) + '</b>' + pill(q.t) + '<small>' + q.c.length + ' candle' + (q.c.length > 1 ? 's' : '') + '</small></div><p class="patS">' + E(q.s) + '</p>' +
        (o ? '<div class="patHow">' + row('#9DB8FF', 'What it means', q.means) + row('#F2C27A', 'Confirm with', q.conf) + row('#3B7BFF', 'What to do', q.act) + '</div>' : '<div class="patMore">What to do ›</div>') + '</div>';
    };
    const body = PAT.m === 'candles' ? anatomy() + C.filter((q) => ok(q.t)).map(ccard).join('') : P.filter((p) => ok(p.t)).map(card).join('');
    setHTML(el,
      '<div class="patTabs">' + tab('shapes', 'Chart patterns') + tab('candles', 'Candlesticks') + '</div>' +
      '<div class="patChips">' + chip('all', 'All') + chip('bull', 'Bullish') + chip('bear', 'Bearish') + '</div>' + body +
      '<div class="glass sec patRules"><b>Three rules for every pattern</b>' +
      '<div><em>1</em><span>No breakout, no trade. A pattern isn’t finished until price confirms it.</span></div>' +
      '<div><em>2</em><span>Volume should jump on the breakout. A quiet move often fails.</span></div>' +
      '<div><em>3</em><span>Set your stop before you buy, and keep each loss small.</span></div>' +
      '<small>Patterns raise the odds. They don’t guarantee anything. Educational, not advice.</small></div>');
  };
  document.addEventListener('click', (e) => {
    const m = e.target.closest('[data-patm]'); if (m) { PAT.m = m.dataset.patm; PAT.render(); const sc = document.getElementById('patScroller'); if (sc) sc.scrollTop = 0; return; }
    const f = e.target.closest('[data-patf]'); if (f) { PAT.f = f.dataset.patf; PAT.render(); return; }
    const o = e.target.closest('[data-pato]'); if (o) { const id = o.dataset.pato; PAT.open[id] = !PAT.open[id]; PAT.render(); }
  });
  window.PAT = PAT;
})();
