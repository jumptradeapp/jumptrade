/* jumptrade. mark: hexagon C with three stepped bars (flipped, bars climb toward the C). Pure vector. jmMark(px) flat, jmMark3d(px) extruded. */
(function () {
  var uid = 0, VB = '0.8 2 90.85 90.85';
  var C = 'M57.00 13.50L83.53 27.42L69.93 33.45L57.00 26.67ZM83.53 28.52L83.53 67.42L48.17 85.98L48.17 72.81L70.98 60.84L70.98 35.10Z', B0 = 'M44.17 8.87L33.78 14.32L33.78 80.53L44.17 85.98Z', B1 = 'M31.69 17.42L21.30 22.87L21.30 75.97L31.69 81.43Z', B2 = 'M19.21 25.97L8.82 31.42L8.82 71.42L19.21 76.88Z';
  function g(id, a, b) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>'; }
  function svg(k, w, h, cw) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="' + VB + '" shape-rendering="geometricPrecision" aria-hidden="true"><defs>' +
      g(k + 'u', '#BFEAFB', '#6EC3F5') + g(k + 'b', '#6EC3F5', '#2F6FD8') + g(k + 'd', '#2F6FD8', '#16307E') + '</defs>' +
      '<path d="' + C + '" fill="' + (cw || (window.JT_THEME === 'light' ? '#0F1B2D' : '#fff')) + '"/><path d="' + B0 + '" fill="url(#' + k + 'u)"/><path d="' + B1 + '" fill="url(#' + k + 'b)"/><path d="' + B2 + '" fill="url(#' + k + 'd)"/></svg>';
  }
  function mk(px) { var B = Math.round(px), k = 'jmk' + (uid++); return '<span class="jm3" style="width:' + B + 'px;height:' + B + 'px">' + svg(k, B, B) + '</span>'; }
  var URI = null;
  function uri() { if (!URI) URI = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg('u', 300, 300).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); return URI; }
  function mk3(px) {
    var B = Math.round(px), n = 18, dep = Math.max(4, B * 0.17), s = '', u = uri();
    for (var i = n; i > 0; i--) s += '<img alt="" src="' + u + '" style="position:absolute;inset:0;width:100%;height:100%;transform:translateZ(' + (-dep * i / n).toFixed(2) + 'px);filter:brightness(' + (0.42 - 0.2 * i / n).toFixed(3) + ') saturate(1.25)">';
    s += '<img alt="" src="' + u + '" style="position:absolute;inset:0;width:100%;height:100%">';
    return '<span class="jm3 jm3d" style="width:' + B + 'px;height:' + B + 'px;perspective:' + (B * 7) + 'px"><span style="position:relative;display:block;width:100%;height:100%;transform-style:preserve-3d;transform:rotateY(-28deg) rotateX(12deg) rotateZ(-4deg)">' + s + '</span></span>';
  }
  function fill() { var els = document.querySelectorAll('.jm:not(.done)'); for (var i = 0; i < els.length; i++) { var p = +els[i].getAttribute('data-px') || 40; els[i].innerHTML = mk(p); els[i].classList.add('done'); } }
  window.jmMark = mk; window.jmMark3d = mk; // flat everywhere (3D retired) window.jmMarkSVG = function (w, h) { return svg('x' + (uid++), w, h); }; fill();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
})();
