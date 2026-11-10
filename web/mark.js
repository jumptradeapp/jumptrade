/* jumptrade. mark: five tiles climbing up and to the right, navy to sky blue (the "steps" logo). */
(function () {
  var uid = 0;
  var PAL = [['#14306F', '#0C2257'], ['#2450C8', '#1A3FB0'], ['#3B7BFF', '#2A63E8'], ['#6FA8FF', '#4F8EF7'], ['#B7DBFB', '#8CC2F5']];
  var POS = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]];
  function mk(px) {
    var B = Math.round(px * 1.08), id = 'jmk' + (uid++);
    var S = 100, G = 22, R = 16, BR = 62, W = 3 * S + 2 * G, H = W;
    var defs = '', body = '';
    PAL.forEach(function (c, k) { defs += '<linearGradient id="' + id + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient>'; });
    POS.forEach(function (p, k) {
      var x = p[0] * (S + G), y = H - (p[1] + 1) * S - p[1] * G;
      if (k === 2) body += '<path d="M' + (x + BR) + ' ' + y + ' H' + (x + S - R) + ' Q' + (x + S) + ' ' + y + ' ' + (x + S) + ' ' + (y + R) + ' V' + (y + S - R) + ' Q' + (x + S) + ' ' + (y + S) + ' ' + (x + S - R) + ' ' + (y + S) + ' H' + (x + R) + ' Q' + x + ' ' + (y + S) + ' ' + x + ' ' + (y + S - R) + ' V' + (y + BR) + ' Q' + x + ' ' + y + ' ' + (x + BR) + ' ' + y + ' Z" fill="url(#' + id + k + ')"/>';
      else body += '<rect x="' + x + '" y="' + y + '" width="' + S + '" height="' + S + '" rx="' + R + '" fill="url(#' + id + k + ')"/>';
    });
    var pad = W * 0.14;
    return '<span class="jm3" style="width:' + B + 'px;height:' + B + 'px"><svg width="' + B + '" height="' + B + '" viewBox="' + (-pad) + ' ' + (-pad) + ' ' + (W + 2 * pad) + ' ' + (H + 2 * pad) + '" shape-rendering="geometricPrecision" aria-hidden="true"><defs>' + defs + '</defs>' + body + '</svg></span>';
  }
  function fill() { var els = document.querySelectorAll('.jm:not(.done)'); for (var i = 0; i < els.length; i++) { els[i].innerHTML = mk(+els[i].getAttribute('data-px') || 40); els[i].classList.add('done'); } }
  window.jmMark = mk; fill();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
})();
