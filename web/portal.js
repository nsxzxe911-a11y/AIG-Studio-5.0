/* AIG-II public portal controls — no connection to CNC working data. */
(()=>{
  "use strict";
  const menu=document.getElementById("menu-toggle");
  const nav=document.getElementById("primary-nav");
  if (!menu || !nav) return;
  function close(){nav.classList.remove("open");menu.setAttribute("aria-expanded","false")}
  menu.addEventListener("click",()=>{
    const open=nav.classList.toggle("open");
    menu.setAttribute("aria-expanded",String(open));
  });
  nav.querySelectorAll("a").forEach(link=>link.addEventListener("click",close));
  document.addEventListener("keydown",event=>{if(event.key==="Escape")close()});
  document.addEventListener("click",event=>{
    if(!menu.contains(event.target)&&!nav.contains(event.target))close()
  });
})();
