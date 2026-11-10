/* jumptrade. appearance picker — Dark / Light */
(function () {
  var D = document, LT = window.JT_THEME === 'light';
  var ICON = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"></path></svg>';
  var css = '.thBtn{width:38px;height:38px;flex-shrink:0;border-radius:999px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:6px;' +
    (LT ? 'color:#1F242C}' : 'color:#E6EBF2}') +
    '.bar .thBtn{margin-left:auto}.bar .searchBtn{margin-left:8px}.bar .live{margin-left:auto}.bar .live+.thBtn{margin-left:10px}' +'#vMovers .bar{flex-wrap:wrap}#vMovers .bar .live{order:3;width:100%;flex-direction:row;align-items:center;justify-content:flex-start;gap:8px;margin:8px 0 0;padding-left:2px;white-space:nowrap}#vMovers .bar .thBtn{margin-left:auto}' +
    '#thm{position:fixed;inset:0;z-index:60;display:none}#thm.on{display:block}' +
    '#thm .tbg{position:absolute;inset:0;background:rgba(0,0,0,' + (LT ? '.18' : '.45') + ')}' +
    '#thm .tp2{position:absolute;left:0;right:0;bottom:0;border-radius:24px 24px 0 0;padding:18px 16px calc(22px + env(safe-area-inset-bottom));animation:pkup .28s cubic-bezier(.2,.8,.2,1);' +
    (LT ? 'background:#FFFFFF;border-top:1px solid rgba(17,24,39,.08)}' : 'background:#141618;border-top:1px solid rgba(255,255,255,.1)}') +
    '#thm h3{margin:0 0 4px;font-size:22px;letter-spacing:-.02em;font-weight:800}#thm h3 em{font-style:normal;color:' + (LT ? '#2457E6' : '#4C8DFF') + '}' +
    '#thm .tsub{font-size:12.5px;color:' + (LT ? '#6B7280' : '#9AA2AB') + ';margin-bottom:12px}' +
    '#thm .topt{width:100%;display:flex;align-items:center;gap:12px;padding:14px;margin-top:8px;border-radius:16px;text-align:left;cursor:pointer;font-size:16px;font-weight:700;' +
    (LT ? 'background:rgba(17,24,39,.035);border:1px solid rgba(17,24,39,.06)}' : 'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}') +
    '#thm .topt small{display:block;font-size:12px;font-weight:500;color:' + (LT ? '#6B7280' : '#9AA2AB') + ';margin-top:2px}' +
    '#thm .topt .sw{width:34px;height:34px;border-radius:11px;flex-shrink:0;border:1px solid rgba(127,140,160,.35)}' +
    '#thm .topt .ck{margin-left:auto;width:22px;height:22px;border-radius:999px;display:flex;align-items:center;justify-content:center;border:1.5px solid rgba(127,140,160,.45);color:#fff;font-size:13px}' +
    '#thm .topt.on{border-color:' + (LT ? '#2457E6' : '#4C8DFF') + '}#thm .topt.on .ck{background:' + (LT ? '#2457E6' : '#3B7BFF') + ';border-color:transparent}';
  var st = D.createElement('style'); st.textContent = css; D.head.appendChild(st);

  function addBtns() { return;
    var s = D.querySelectorAll('.bar .searchBtn');
    for (var i = 0; i < s.length; i++) {
      var p = s[i].previousElementSibling;
      if (p && p.classList.contains('thBtn')) continue;
      var b = D.createElement('button'); b.className = 'thBtn'; b.setAttribute('aria-label', LT ? 'Switch to dark mode' : 'Switch to light mode'); b.innerHTML = ICON; var cs = getComputedStyle(s[i]); b.style.background = cs.background; b.style.border = cs.border; b.style.boxShadow = cs.boxShadow; b.style.color = cs.color;
      s[i].parentNode.insertBefore(b, s[i]);
    }
  }
  var OPTS = [['dark', 'Dark', 'Obsidian + electric blue', '#0A0A0A']];
  var wrap = D.createElement('div'); wrap.id = 'thm'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', 'Appearance');
  function paint() {
    var p = window.JT_PREF || 'dark';
    wrap.innerHTML = '<div class="tbg" data-thclose="1"></div><div class="tp2"><h3>Appearance<em>.</em></h3><div class="tsub">Pick how jumptrade looks. Dark is the default.</div>' +
      OPTS.map(function (o) {
        return '<button class="topt' + (p === o[0] ? ' on' : '') + '" data-th="' + o[0] + '"><span class="sw" style="background:' + o[3] + '"></span><span>' + o[1] + '<small>' + o[2] + '</small></span><span class="ck">' + (p === o[0] ? '✓' : '') + '</span></button>';
      }).join('') + '</div>';
  }
  D.body.appendChild(wrap);

  function want(p) { return 'dark'; }
  function apply() {
    var t = want(window.JT_PREF || 'dark');
    if (t === window.JT_THEME) return;
    var lt = t === 'light';
    D.getElementById('cssD').media = lt ? 'not all' : 'all';
    D.getElementById('cssL').media = lt ? 'all' : 'not all';
    // Charts and inline colors are drawn per theme, so reload — and land back on this same screen.
    if (D.visibilityState === 'visible') {
      try { if (typeof saveView === 'function') saveView(); } catch (e) {}
      try { localStorage.setItem('jt.vis', 'visible'); localStorage.setItem('jt.seen', String(Date.now())); } catch (e) {}
    }
    setTimeout(function () { location.reload(); }, 60);
  }
  D.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('.thBtn')) { var np = window.JT_THEME === 'light' ? 'dark' : 'light'; try { localStorage.setItem('jt.theme', np); } catch (e3) {} window.JT_PREF = np; apply(); return; }
    if (t.closest('[data-thclose]')) { wrap.classList.remove('on'); return; }
    var o = t.closest('[data-th]');
    if (o) {
      var p = o.getAttribute('data-th');
      try { localStorage.setItem('jt.theme', p); } catch (e2) {}
      window.JT_PREF = p; paint();
      setTimeout(function () { wrap.classList.remove('on'); apply(); }, 180);
    }
  });
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: light)');
    var onCh = function () { if ((window.JT_PREF || 'dark') === 'auto') apply(); };
    if (mq.addEventListener) mq.addEventListener('change', onCh); else if (mq.addListener) mq.addListener(onCh);
  }
  addBtns(); setTimeout(addBtns, 1500);
})();
