/* jumptrade. mark: four tiles, one lifted, in one navy-to-sky sweep (the "Bloc" logo). Pure vector, so it stays sharp at any size. */
(function () {
  var uid = 0;
  function mk(px) {
    var B = Math.round(px), id = 'jmk' + (uid++);
    return '<span class="jm3" style="width:' + B + 'px;height:' + B + 'px"><svg width="' + B + '" height="' + B + '" viewBox="0 0 64 64" shape-rendering="geometricPrecision" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="6" y1="58" x2="61" y2="3"><stop offset="0" stop-color="#0E2A6B"/><stop offset=".45" stop-color="#2F6BFF"/><stop offset="1" stop-color="#C4E3FF"/></linearGradient></defs>' +
      '<rect x="6" y="35" width="23" height="23" rx="5" fill="url(#' + id + ')"/><rect x="6" y="8" width="23" height="23" rx="5" fill="url(#' + id + ')"/>' +
      '<rect x="33" y="35" width="23" height="23" rx="5" fill="url(#' + id + ')"/><rect x="37" y="3" width="24" height="24" rx="5.5" fill="url(#' + id + ')"/></svg></span>';
  }
  function fill() { var els = document.querySelectorAll('.jm:not(.done)'); for (var i = 0; i < els.length; i++) { els[i].innerHTML = mk(+els[i].getAttribute('data-px') || 40); els[i].classList.add('done'); } }
  window.jmMark = mk; fill();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
})();
