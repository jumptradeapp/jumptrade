/* jumptrade. mark: two stacked 3D diamond tiles with a piece jumping off the top. Pure vector, sharp at any size. */
(function () {
  var uid = 0;
  function g(id, a, b) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>'; }
  function mk(px) {
    var B = Math.round(px), k = 'jmk' + (uid++);
    return '<span class="jm3" style="width:' + B + 'px;height:' + B + 'px"><svg width="' + B + '" height="' + B + '" viewBox="-3 -3 108 108" shape-rendering="geometricPrecision" aria-hidden="true"><defs>' +
      g(k + 'b', '#5B8CFF', '#2450C8') + g(k + 'u', '#9DBEFF', '#4C7FF0') + g(k + 'q', '#E4F0FF', '#9CC4F8') +
      '<linearGradient id="' + k + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="M9 47.7L49.8 70.1V75.1L9 52.7Z" fill="#2F5BD0"/><path d="M90.6 47.7L49.8 70.1V75.1L90.6 52.7Z" fill="#3E6FE6"/>' +
      '<path d="M49.8 25.2L90.6 47.7L49.8 70.1L9 47.7Z" fill="url(#' + k + 'u)"/><path d="M49.8 47.7L70.5 36.2L90.6 47.7L70.5 59.1Z" fill="url(#' + k + 'q)"/>' +
      '<path d="M9 73.6L49.8 96.3V102.3L9 79.6Z" fill="#16307E"/><path d="M90.6 73.6L49.8 96.3V102.3L90.6 79.6Z" fill="#1E3E99"/>' +
      '<path d="M49.8 50.7L90.6 73.6L49.8 96.3L9 73.6Z" fill="url(#' + k + 'b)"/><path d="M49.8 50.7L90.6 73.6L49.8 96.3L9 73.6Z" fill="url(#' + k + 's)" opacity=".7"/>' +
      '<path d="M56.9 9.7L74.8 19.9V22.9L56.9 12.7Z" fill="#9CC4F8"/><path d="M92.6 9.7L74.8 19.9V22.9L92.6 12.7Z" fill="#BCD6FB"/><path d="M74.8 0L92.6 9.7L74.8 19.9L56.9 9.7Z" fill="#fff"/></svg></span>';
  }
  function fill() { var els = document.querySelectorAll('.jm:not(.done)'); for (var i = 0; i < els.length; i++) { els[i].innerHTML = mk(+els[i].getAttribute('data-px') || 40); els[i].classList.add('done'); } }
  window.jmMark = mk; fill();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
})();
