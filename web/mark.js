/* jumptrade. mark: hexagon C with three stepped bars (flipped, bars climb toward the C). Pure vector. jmMark(px) flat, jmMark3d(px) extruded. */
(function () {
  var uid = 0, VB = '0 0 90.85 90.85';
  var C = 'M48.17 8.87L83.53 27.42L83.53 26.33L69.93 33.45L48.17 22.04ZM83.53 28.52L83.53 67.42L48.17 85.98L48.17 72.81L70.98 60.84L70.98 35.10Z', B0 = 'M42.67 4.87L32.28 10.32L32.28 76.53L42.67 81.98Z', B1 = 'M30.19 13.42L19.80 18.87L19.80 71.97L30.19 77.43Z', B2 = 'M17.71 21.97L7.32 27.42L7.32 67.42L17.71 72.88Z';
  function g(id, a, b) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>'; }
  function svg(k, w, h, cw) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="' + VB + '" shape-rendering="geometricPrecision" aria-hidden="true"><defs>' +
      g(k + 'u', '#9DBEFF', '#4C7FF0') + g(k + 'b', '#5B8CFF', '#2450C8') + g(k + 'd', '#2F5BD0', '#16307E') + '</defs>' +
      '<path d="' + C + '" fill="' + (cw || '#fff') + '"/><path d="' + B0 + '" fill="url(#' + k + 'u)"/><path d="' + B1 + '" fill="url(#' + k + 'b)"/><path d="' + B2 + '" fill="url(#' + k + 'd)"/></svg>';
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
  function fill() { var els = document.querySelectorAll('.jm:not(.done)'); for (var i = 0; i < els.length; i++) { var p = +els[i].getAttribute('data-px') || 40; els[i].innerHTML = els[i].hasAttribute('data-3d') ? mk3(p) : mk(p); els[i].classList.add('done'); } }
  window.jmMark = mk; window.jmMark3d = mk3; window.jmMarkSVG = function (w, h) { return svg('x' + (uid++), w, h); }; fill();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
})();
