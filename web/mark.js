/* jumptrade. angled 3D tile mark with a motion trail: one tile leaps out of the grid.
   Drawn as a single crisp SVG (projected in JS) instead of stacked CSS-3D layers. */
(function () {
  var T = [[12,12,.62],[41,12,.80],[12,41,.48],[41,41,.66],[70,41,.84],[12,70,.30],[41,70,.46],[70,70,.64]];
  var uid = 0;
  function LT() { if (window.JT_THEME) return window.JT_THEME === 'light'; try { return localStorage.getItem('jt.theme') === 'light'; } catch (e) { return false; } }
  var RY = -30 * Math.PI / 180, RX = 6 * Math.PI / 180;
  function mk(px) {
    var S = px / 104, B = Math.round(px * 1.08), off = (B - px) / 2, c = px / 2, d = px * 2.2;
    function P(x, y, z) { // jmm-local px coords -> svg coords (rotateX then rotateY, then perspective)
      var X = x - c, Y = y - c, Z = z;
      var y1 = Y * Math.cos(RX) - Z * Math.sin(RX), z1 = Y * Math.sin(RX) + Z * Math.cos(RX);
      var x2 = X * Math.cos(RY) + z1 * Math.sin(RY), z2 = -X * Math.sin(RY) + z1 * Math.cos(RY);
      var s = d / (d - z2); return [off + c + x2 * s, off + c + y1 * s];
    }
    function outline(x, y, w, z) { var r = w * .28, pts = [], C = [[x + w - r, y + r, -90], [x + w - r, y + w - r, 0], [x + r, y + w - r, 90], [x + r, y + r, 180]];
      C.forEach(function (q) { for (var k = 0; k <= 4; k++) { var a = (q[2] + 22.5 * k) * Math.PI / 180; pts.push(P(q[0] + r * Math.cos(a), q[1] + r * Math.sin(a), z)); } });
      return pts.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' '); }
    var defs = '', body = '', id = 'jm' + (++uid) + '_';
    function grad(name, a, b, cc, op) { defs += '<linearGradient id="' + id + name + '" x1=".3" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="' + a + '" stop-opacity="' + op + '"/><stop offset=".48" stop-color="' + b + '" stop-opacity="' + op + '"/><stop offset="1" stop-color="' + cc + '" stop-opacity="' + op + '"/></linearGradient>'; }
    defs += '<linearGradient id="' + id + 'hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>';
    function tile(x, y, a, z, hero) {
      var w = 22 * S, X = x * S, Y = y * S, th = Math.max(1.2, 2.6 * S), z0 = z * S / 4;
      var side = hero ? '#0F2FA8' : 'rgba(40,48,56,' + Math.min(1, a + .25).toFixed(2) + ')';
      body += '<polygon points="' + outline(X, Y, w, z0) + '" fill="' + side + '"/>';
      body += '<polygon points="' + outline(X, Y, w, z0 + th * .5) + '" fill="' + side + '" style="filter:brightness(1.25)"/>';
      var n = 't' + body.length; if (hero) grad(n, '#A9C8FF', '#3B7BFF', '#1749FF', 1); else { var o = Math.min(1, a + .25).toFixed(2); if (LT()) grad(n, '#DCE0E4', '#9AA4AE', '#56616C', Math.min(1, a + .35).toFixed(2)); else grad(n, '#F4F4F2', '#BFC5CC', '#6E7A86', o); }
      var top = outline(X, Y, w, z0 + th);
      body += '<polygon points="' + top + '" fill="url(#' + id + n + ')" stroke="rgba(255,255,255,' + (hero ? .9 : .28) + ')" stroke-width="' + (hero ? Math.max(1, 1.5 * S / 1.3) : .8).toFixed(2) + '" stroke-linejoin="round"/>';
      body += '<polygon points="' + top + '" fill="url(#' + id + 'hl)"/>';
    }
    T.forEach(function (t) { tile(t[0], t[1], t[2], 0, false); });
    var hx = 81.2, hy = -4.1, hz = 30.8;
    [[.25, .16], [.5, .30], [.75, .50]].forEach(function (g, i) {
      var gx = 70 + (hx - 70) * g[0], gy = 12 + (hy - 12) * g[0], n = 'g' + i;
      grad(n, '#A9C8FF', '#3B7BFF', '#1749FF', (g[1] * .45).toFixed(2));
      body += '<polygon points="' + outline(gx * S, gy * S, 22 * S, hz * g[0] * S / 4) + '" fill="url(#' + id + n + ')" stroke="rgba(150,190,255,' + (0.35 + g[1] * .9).toFixed(2) + ')" stroke-width="' + Math.max(.9, 1.2 * S / 1.3).toFixed(2) + '" stroke-linejoin="round"/>';
    });
    tile(hx, hy, 1, hz, true);
    return '<span class="jm3" style="width:' + B + 'px;height:' + B + 'px"><svg width="' + B + '" height="' + B + '" viewBox="0 0 ' + B + ' ' + B + '" shape-rendering="geometricPrecision" aria-hidden="true" style="overflow:visible"><defs>' + defs + '</defs>' + body + '</svg></span>';
  }
  function fill() { var els = document.querySelectorAll('.jm:not(.done)'); for (var i = 0; i < els.length; i++) { els[i].innerHTML = mk(+els[i].getAttribute('data-px') || 40); els[i].classList.add('done'); } }
  window.jmMark = mk; fill();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
})();
