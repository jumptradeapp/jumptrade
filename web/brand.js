/* jumptrade. brand layer: ink background with ice/cyan glows over the navy grain (dark mode) */
(function(){
  var D=document;
  function fix(){
    var dark=D.documentElement.classList.contains('th-dark');
    D.querySelectorAll('.bg').forEach(function(b){
      if(dark){b.style.setProperty('background','radial-gradient(90% 35% at 10% 0%,rgba(185,240,252,.30),rgba(185,240,252,0) 70%),radial-gradient(130% 60% at 50% 105%,rgba(63,208,240,.75),rgba(63,208,240,.25) 40%,rgba(63,208,240,0) 72%),linear-gradient(180deg,rgba(1,2,10,.94),rgba(2,4,16,.9) 55%,rgba(2,6,18,.8)),url(img/bg-navy.jpg) center top/cover no-repeat,#02030C','important');b.style.setProperty('height','100vh','important');
        Array.prototype.forEach.call(b.children,function(c){c.style.setProperty('display','none','important')});}
    });
  }
  fix();D.addEventListener('DOMContentLoaded',fix);window.addEventListener('load',fix);setTimeout(fix,800);setTimeout(fix,2500);
})();
