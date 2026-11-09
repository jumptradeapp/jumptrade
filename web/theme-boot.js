/* picks dark/light before first paint: saved choice, else the iPhone setting */
(function(){var p='dark';try{localStorage.setItem('jt.theme','dark')}catch(e){}
if(p!=='light')p='dark';var L=p==='light';
window.JT_PREF=p;window.JT_THEME=L?'light':'dark';document.documentElement.classList.add('th-'+window.JT_THEME);
var d=document.getElementById('cssD'),l=document.getElementById('cssL'),m=document.getElementById('thColor');
if(d)d.media=L?'not all':'all';if(l)l.media=L?'all':'not all';if(m)m.content=L?'#ECEBE8':'#0A0A0A';})();
