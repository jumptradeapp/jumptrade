/* loads the dark or light build of a script */
(function(){var s=document.currentScript,f=s&&s.getAttribute('data-f');if(!f)return;
document.write('<script src="'+f+(window.JT_THEME==='light'?'_l':'')+'.js"><\/script>');})();
