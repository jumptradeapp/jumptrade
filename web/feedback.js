/* Beta feedback sheet: Bug / Idea / Feel & navigation, a text box, Send. Posts to /api/feedback. FB.open() */
(function () {
  const D = document; let kind = 'bug';
  const KINDS = [['bug', 'Bug', '#FF8A8A'], ['idea', 'Idea', '#5EE0A0'], ['ux', 'Feel & navigation', '#9CC0FF']];
  const HINT = { bug: 'What happened, and on which page? What did you expect instead?', idea: 'What would make jumptrade more useful to you?', ux: 'What felt confusing, slow or hard to find?' };
  function close() { const w = D.getElementById('fbS'); if (w) { w.classList.remove('on'); setTimeout(() => w.remove(), 220); } }
  function paint(w) {
    w.querySelector('.fbK').innerHTML = KINDS.map((k) => '<button class="' + (k[0] === kind ? 'on' : '') + '" data-fbk="' + k[0] + '" style="--c:' + k[2] + '">' + k[1] + '</button>').join('');
    w.querySelector('textarea').placeholder = HINT[kind];
  }
  function open(k) {
    if (k) kind = k; if (D.getElementById('fbS')) return;
    const w = D.createElement('div'); w.id = 'fbS';
    let nm = ''; try { nm = localStorage.getItem('jt.name') || ''; } catch (e) {}
    w.innerHTML = '<div class="fbBg" data-fbx></div><div class="fbSheet"><div class="fbHead"><div><h3>Send feedback<em>.</em></h3><p>Thanks for beta testing. Every note is read.</p></div><button class="fbX" data-fbx aria-label="Close">✕</button></div>' +
      '<div class="fbK"></div><textarea rows="6" maxlength="2000"></textarea><input class="fbN" type="text" maxlength="40" placeholder="Your name (optional)" value="' + nm.replace(/"/g, '') + '">' +
      '<button class="fbGo">Send</button><p class="fbMsg"></p></div>';
    w.addEventListener('click', (e) => {
      if (e.target.closest('[data-fbx]')) return close();
      const b = e.target.closest('[data-fbk]'); if (b) { kind = b.dataset.fbk; paint(w); return; }
      if (e.target.closest('.fbGo')) send(w);
    });
    D.body.appendChild(w); paint(w); requestAnimationFrame(() => w.classList.add('on'));
  }
  function send(w) {
    const ta = w.querySelector('textarea'), msg = w.querySelector('.fbMsg'), go = w.querySelector('.fbGo'), text = ta.value.trim();
    if (text.length < 3) { msg.textContent = 'Write a few words first.'; return; }
    go.disabled = true; go.textContent = 'Sending…';
    fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, text, name: w.querySelector('.fbN').value.trim(), page: (window.S && S.tab) || '' }) })
      .then((r) => r.json()).then((j) => { if (!j.ok) throw new Error(j.error && j.error.code); w.querySelector('.fbSheet').innerHTML = '<div class="fbDone"><b>Got it. Thank you!</b><span>Your feedback helps shape what gets built next.</span><button class="fbGo" data-fbx>Done</button></div>'; })
      .catch((e) => { go.disabled = false; go.textContent = 'Send'; msg.textContent = String(e.message) === 'limit' ? 'That’s a lot of feedback for one day. Try again tomorrow.' : 'Couldn’t send. Check your connection and try again.'; });
  }
  window.FB = { open, close };
})();
