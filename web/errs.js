/* jumptrade. quietly report app errors to the owner's Admin page (at most 5 per visit, no repeats) */
(function () {
  var sent = {}, n = 0;
  function report(msg, src) {
    try {
      msg = String(msg || '').slice(0, 300); if (!msg || sent[msg] || n >= 5) return; if (/ResizeObserver|Script error\.?$|Load failed|NetworkError|AbortError|The operation was aborted/i.test(msg)) return;
      sent[msg] = 1; n++;
      var page = (window.S && S.tab) || (typeof S !== 'undefined' ? S.tab : '') || location.hash.slice(1, 30);
      fetch('/api/clienterr', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ msg: msg, src: src || '', page: page }), keepalive: true }).catch(function () {});
    } catch (e) {}
  }
  addEventListener('error', function (e) { report(e.message, (e.filename || '').split('/').pop() + ':' + (e.lineno || '')); });
  addEventListener('unhandledrejection', function (e) { var r = e.reason; report((r && (r.message || r)) || 'Unhandled promise rejection', r && r.stack ? String(r.stack).split('\n')[1] : ''); });
})();
