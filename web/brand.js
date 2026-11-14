/* jumptrade. brand layer: navy grain background (dark mode) */
(function(){
  var D=document;
  function fix(){
    var dark=D.documentElement.classList.contains('th-dark');
    D.querySelectorAll('.bg').forEach(function(b){
      if(dark){b.style.setProperty('background','#030716 url(img/bg-navy.jpg) center top/cover no-repeat','important');
        Array.prototype.forEach.call(b.children,function(c){c.style.setProperty('display','none','important')});}
    });
  }
  fix();D.addEventListener('DOMContentLoaded',fix);window.addEventListener('load',fix);setTimeout(fix,800);setTimeout(fix,2500);
})();
