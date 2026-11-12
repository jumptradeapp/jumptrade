/* picks dark/light before first paint: the saved choice (default dark). The main stylesheet stays on; light mode adds its overrides on top. */
(function(){var p='dark';try{p=localStorage.getItem('jt.theme')||'dark'}catch(e){}
if(p!=='light')p='dark';var L=p==='light';
window.JT_PREF=p;window.JT_THEME=L?'light':'dark';document.documentElement.classList.add('th-'+window.JT_THEME);
var l=document.getElementById('cssL'),m=document.getElementById('thColor');
if(l)l.media=L?'all':'not all';if(m)m.content=L?'#F7F5F0':'#0A0A0A';})();
