/* AIG-II Web Desktop / Mobile presentation switch.
   Uses the SAME verified Page ID, Button ID and Runtime DOM in both modes.
   Presentation only; never replaces CAM/NC/3D output with images. */
(function(global,document){
  'use strict';
  const docRoot=document.documentElement;
  const toolbar=document.getElementById('aig-layout-switch');
  if(!docRoot||!toolbar)return;
  const valid=new Set(['auto','desktop','mobile']);
  const key='aigii.web.layout.v1';
  let mode='auto';
  try{const saved=global.localStorage&&global.localStorage.getItem(key);if(valid.has(saved))mode=saved;}catch(_){}
  const buttons=Array.from(toolbar.querySelectorAll('[data-layout-mode]'));
  const message=toolbar.querySelector('[data-layout-message]');
  function narrow(){
    if(typeof global.matchMedia==='function')return global.matchMedia('(max-width: 900px)').matches;
    return Number(global.innerWidth||1280)<=900;
  }
  function apply(notify){
    const presentation=mode==='mobile'||(mode==='auto'&&narrow())?'mobile':'desktop';
    docRoot.dataset.aigLayoutMode=mode;
    docRoot.dataset.aigPresentation=presentation;
    for(const button of buttons){
      const selected=button.dataset.layoutMode===mode;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-pressed',String(selected));
    }
    if(message)message.textContent=presentation==='mobile'?'手機版畫面':'桌面版畫面';
    // V38: toggle must synchronously reach the actual live responsive CNC layout.
    if(typeof global.AIG_MOBILE_LAYOUT_V37?.refresh==='function')global.AIG_MOBILE_LAYOUT_V37.refresh();
    if(notify&&typeof global.dispatchEvent==='function'){
      const fire=()=>global.dispatchEvent(new Event('resize'));
      if(typeof global.requestAnimationFrame==='function')global.requestAnimationFrame(fire);else fire();
    }
  }
  function setMode(value){
    if(!valid.has(value))return false;
    mode=value;
    try{if(global.localStorage)global.localStorage.setItem(key,mode);}catch(_){}
    apply(true);
    return true;
  }
  for(const button of buttons)button.addEventListener('click',()=>setMode(button.dataset.layoutMode));
  if(typeof global.addEventListener==='function')global.addEventListener('resize',()=>{if(mode==='auto')apply(false);});
  apply(false);
  global.AIG_LAYOUT_VIEW={getMode:()=>mode,setMode,getPresentation:()=>docRoot.dataset.aigPresentation};
})(window,document);
