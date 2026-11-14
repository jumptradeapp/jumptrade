/* jumptrade. mark: tile grid with a J, top-right tile jumping out. Pure vector. jmMark(px) flat, jmMark3d(px) extruded. */
(function () {
  var uid = 0, VB = '-4 -10 104 106';
  function g(id, a, b) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>'; }
  var R = function (x, y) { return '<rect x="' + x + '" y="' + y + '" width="26" height="26" rx="5"/>'; };
  var J = 'M73 34H89A5 5 0 0 1 94 39V64A30 30 0 0 1 64 94H39A5 5 0 0 1 34 89V73A5 5 0 0 1 39 68H63A5 5 0 0 0 68 63V39A5 5 0 0 1 73 34Z';
  function svg(k, w, h) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="' + VB + '" shape-rendering="geometricPrecision" aria-hidden="true"><defs>' +
      g(k + 't', '#5B8CFF', '#2450C8') + g(k + 'j', '#9DBEFF', '#4C7FF0') + g(k + 'p', '#E6FFFF', '#5FDCF2') + '</defs>' +
      '<g fill="url(#' + k + 't)">' + R(0, 0) + R(34, 0) + R(0, 34) + R(34, 34) + R(0, 68) + '</g>' +
      '<path d="' + J + '" fill="url(#' + k + 'j)"/>' +
      '<rect x="72" y="-8" width="26" height="26" rx="5" transform="rotate(14 85 5)" fill="url(#' + k + 'p)"/></svg>';
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
