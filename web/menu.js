/* jumptrade. page menu: a button in every top bar that opens a sheet listing every page */
(function () {
  const G = [
    ['Market', [['home', 'Home', 'Your day at a glance'], ['movers', 'Top gainers', 'Live movers'], ['news', 'News', 'Live headlines'], ['catalysts', 'Calendar', 'Earnings & events'], ['sectors', 'Sectors', 'Where money is rotating'], ['ipos', 'IPOs', 'New listings']]],
    ['Ideas', [['setups', 'Setups', 'Best entries now'], ['runners', 'Runners', 'Early signs of a run'], ['dips', 'Dips', 'Pullbacks to buy'], ['leaders', 'Leaders', 'Strongest stocks'], ['value', 'Value', 'Undervalued names'], ['buzz', 'Buzz', 'Most talked about']]],
    ['Money', [['flow', 'Money flow', 'Big buyers & sellers'], ['options', 'Options', 'Unusual bets'], ['congress', 'Congress', 'Lawmakers’ trades'], ['insiders', 'Insiders', 'Executives buying'], ['shorts', 'Shorts', 'Most shorted'], ['ratings', 'Ratings', 'Analyst calls']]],
    ['Research & you', [['research', 'Research', 'Deep dives'], ['compare', 'Compare', 'Side by side'], ['portfolios', 'Strategies', 'Model portfolios'], ['watch', 'Watchlist', 'Your stocks'], ['record', 'Record', 'Your trade journal']]],
  ];
  const IC = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>';
  const add = () => document.querySelectorAll('.view > .top .bar').forEach((bar) => {
    if (bar.querySelector('.menuBtn')) return;
    const b = document.createElement('button'); b.className = 'menuBtn'; b.setAttribute('aria-label', 'All pages'); b.innerHTML = IC;
    const s = bar.querySelector('.searchBtn'); s ? bar.insertBefore(b, s) : bar.appendChild(b);
  });
  // The menu lives in the bottom bar: the last button (was Portfolios, which is now in the menu) becomes "More".
  const nb = document.getElementById('navPort');
  if (nb) { nb.id = 'navMore'; nb.setAttribute('aria-label', 'All pages'); nb.innerHTML = '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg><span>More</span>';
    nb.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); open(); }); }
  let el = null;
  function open() {
    if (el) return; el = document.createElement('div'); el.id = 'pgMenu';
    el.innerHTML = '<div class="pmSheet" role="dialog" aria-label="All pages"><div class="pmHead"><b>All pages</b><button class="popX pmX" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      G.map((g) => '<div class="pmCap">' + g[0] + '</div><div class="pmGrid">' + g[1].map((p) => '<button class="pmItem' + (S.tab === p[0] ? ' on' : '') + '" data-pm="' + p[0] + '"><b>' + p[1] + '</b><small>' + p[2] + '</small></button>').join('') + '</div>').join('') + '</div>';
    el.addEventListener('click', (e) => { e.stopPropagation(); const it = e.target.closest('[data-pm]'); if (it) { const t = it.dataset.pm; close(); setTimeout(() => goTab(t), 0); return; } if (e.target.closest('.pmX') || !e.target.closest('.pmSheet')) close(); });
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('in'));
  }
  function close() { if (!el) return; const e = el; el = null; e.classList.remove('in'); setTimeout(() => e.remove(), 220); }
  document.addEventListener('click', (e) => {
    if (e.target.closest('.menuBtn')) { e.preventDefault(); e.stopPropagation(); open(); return; }
  }, true);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();
