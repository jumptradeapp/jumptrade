/* skin v2: page subtitles read as one line ("Market open · 2:08 PM ET") instead of a stacked right-hand block */
(function () {
  function fix(el) { if (el.innerHTML.indexOf('<br') < 0) return; el.innerHTML = el.innerHTML.replace(/<br\s*\/?>(\s*)(.)/gi, function (m, w, c) { return (/[a-z]/.test(c) ? ' ' : ' · ') + c; }); }
  function all() { document.querySelectorAll('.view .title .sub').forEach(fix); }
  all();
  new MutationObserver(function (ms) { ms.forEach(function (m) { var t = m.target.nodeType === 1 ? m.target : m.target.parentNode; var s = t && t.closest && t.closest('.title .sub'); if (s) fix(s); }); }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
