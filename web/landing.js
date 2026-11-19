/* jumptrade. public landing page: what people see before they're signed in.
   A short pitch, a live teaser (real movers right now and real 13F buying), invite requests and the sign-in-code form.
   auth.js calls JT_LANDING.show() instead of the old lock screen. */
(function () {
  const D = document;
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%';
  const shortD = (iso) => { const d = new Date(iso + 'T12:00:00'); return isFinite(d) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''; };

  const html = () => '<div class="lp">' +
    '<header class="lpTop"><img src="/v2/img/jump-lockup.svg?v=6" alt="jumptrade." width="141" height="26"><button class="lpLink" data-lp="code">Sign in</button></header>' +
    '<section class="lpHero"><div class="lpPitch">' +
      '<h1>Know before you jump.</h1>' +
      '<p class="lpSub">See what’s moving right now, why it’s moving, and what the biggest funds just bought. One fast app for people who trade.</p>' +
      '<div class="lpCta"><button class="lpBtn" data-lp="req">Request an invite</button><button class="lpBtn2" data-lp="code">Sign in with a code</button></div>' +
      '<div class="lpCode" id="lpCode" hidden><label for="gCode">Sign-in code or invite link</label><div class="lpRow"><input id="gCode" type="text" maxlength="80" autocapitalize="characters" autocomplete="one-time-code" spellcheck="false" placeholder="K7F2-9QXA"><button id="gGo">Sign in</button></div><p id="gMsg" class="lpMsg" role="status"></p>' +
        '<p class="lpHint">Signed in on Safari already? Open the menu there, then Your other devices, to get a code for this one.</p></div>' +
    '</div>' +
    '<div class="lpLive" id="lpLive" aria-live="polite">' + liveSkel() + '</div></section>' +
    '<section class="lpFeat">' +
      feat('Every jump, explained.', 'The biggest movers before the bell, during the day and after hours, each with the headline behind it, plus volume, float and short interest.') +
      feat('What the big funds just did.', 'Fresh 13F filings from 70+ funds, the stocks most of them bought, and FDA decisions, trial results and deals as they land.') +
      feat('Build it, then track it.', 'Paper portfolios from a theme or a fund, measured against the S&amp;P 500 from the day you build them.') +
    '</section>' +
    '<section class="lpReq" id="lpReq"><h2>Request an invite</h2><p>jumptrade is in private beta. Leave your name and email, and you’ll get an invite when a spot opens.</p>' +
      '<form id="lpForm" novalidate><label>First name<input name="name" autocomplete="given-name" maxlength="40" required></label><label>Email<input name="email" type="email" autocomplete="email" inputmode="email" spellcheck="false" maxlength="120" required></label>' +
      '<label>What do you trade? <span>(optional)</span><input name="note" maxlength="300" autocomplete="off" placeholder="Small caps, options, ETFs…"></label><button class="lpBtn" type="submit">Request invite</button><p class="lpMsg" id="lpFormMsg" role="status"></p></form>' +
      '<p class="lpFine">Your email is only used to send your invite.</p></section>' +
    '<footer class="lpFoot"><span>Market data for research. Not investment advice.</span><a href="/beta.html" target="_blank" rel="noopener">Privacy &amp; terms</a></footer></div>';
  const feat = (t, d) => '<div class="lpF"><h3>' + t + '</h3><p>' + d + '</p></div>';
  const liveSkel = () => '<div class="lpCard"><div class="lpH"><span class="lpDot"></span>Checking the market…</div>' + '<i class="lpSk"></i>'.repeat(5) + '</div>';

  function live(el) {
    fetch('/api/public/teaser').then((r) => r.json()).then((j) => {
      const S = { pre: 'Jumping before the bell', day: 'Jumping right now', after: 'Jumping after hours' };
      const mv = (j.movers || []);
      const a = mv.length ? '<div class="lpCard"><div class="lpH"><span class="lpDot' + (j.closed ? ' off' : '') + '"></span>' + (j.closed ? 'Biggest movers last session' : S[j.sess] || S.day) + '</div><ol class="lpList">' +
        mv.map((x) => '<li><b>' + E(x.s) + '</b><span>' + E(x.n) + '</span><em class="' + (x.pct >= 0 ? 'up' : 'dn') + '">' + pct(x.pct) + '</em></li>').join('') + '</ol></div>' : '';
      const b = (j.buys || []).length ? '<div class="lpCard"><div class="lpH">Big funds just bought<small>' + j.nf + (j.nf === 1 ? ' fund filed' : ' funds filed') + (j.filed ? ' through ' + shortD(j.filed) : '') + '</small></div><ol class="lpList">' +
        j.buys.map((x) => '<li><b>' + E(x.s) + '</b><span>' + E(x.nm || 'bought or added by') + '</span><em>' + x.n + (x.n === 1 ? ' fund' : ' funds') + '</em></li>').join('') + '</ol></div>' : '';
      el.innerHTML = a || b ? a + b : '<div class="lpCard"><div class="lpH">Live data is resting right now</div><p class="lpMuted">Check back during market hours.</p></div>';
    }).catch(() => { el.innerHTML = '<div class="lpCard"><div class="lpH">Live data didn’t load</div><p class="lpMuted">Refresh the page to try again.</p></div>'; });
  }

  function wireForm(g) {
    const f = g.querySelector('#lpForm'), msg = g.querySelector('#lpFormMsg');
    f.onsubmit = (e) => { e.preventDefault(); const d = { name: f.name.value.trim(), email: f.email.value.trim(), note: f.note.value.trim() };
      if (!d.name) { msg.textContent = 'Add your first name.'; f.name.focus(); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) { msg.textContent = 'Add an email like you@example.com.'; f.email.focus(); return; }
      const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Sending…'; msg.textContent = '';
      fetch('/api/public/invite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) }).then((r) => r.json().then((j) => ({ ok: r.ok, j })))
        .then(({ ok, j }) => { if (!ok) throw j; f.outerHTML = '<div class="lpDone"><b>Request sent.</b> You’ll get an email when a spot opens' + (d.name ? ', ' + E(d.name) : '') + '.</div>'; })
        .catch((e) => { btn.disabled = false; btn.textContent = 'Request invite'; msg.textContent = (e && e.error && e.error.message) || 'Couldn’t send it. Check your connection and try again.'; }); };
  }

  window.JT_LANDING = {
    // returns the gate element; auth.js wires the sign-in code form (#gCode, #gGo, #gMsg)
    show() {
      let g = D.getElementById('jtGate'); if (!g) { g = D.createElement('div'); g.id = 'jtGate'; D.body.appendChild(g); }
      g.className = 'lpGate'; g.innerHTML = html(); D.documentElement.classList.add('jt-gated'); D.title = 'jumptrade: live movers, 13F filings and paper portfolios';
      g.addEventListener('click', (e) => { const b = e.target.closest('[data-lp]'); if (!b) return;
        if (b.dataset.lp === 'req') { g.querySelector('#lpReq').scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => g.querySelector('#lpForm input') && g.querySelector('#lpForm input').focus({ preventScroll: true }), 450); }
        if (b.dataset.lp === 'code') { const c = g.querySelector('#lpCode'); c.hidden = false; g.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => g.querySelector('#gCode').focus({ preventScroll: true }), 200); } });
      live(g.querySelector('#lpLive')); wireForm(g); return g;
    }
  };
})();
