/* loads a script by base name (single dark build); passes the cache-busting ?v= through */
(function(){var s=document.currentScript,f=s&&s.getAttribute('data-f');if(!f)return;var q=(s.src.split('?')[1]||'');
document.write('<script src="'+f+'.js'+(q?'?'+q:'')+'"><\/script>');})();
