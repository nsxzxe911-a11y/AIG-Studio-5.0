/* AIG-II dual-formal web: Desktop Authority remains separate from Mobile Web.
   NEVER render Desktop source raster as Mobile Authority. Mobile embeds only
   existing real, legacy Web Runtime pages when present. */
(function(window,document){
 'use strict';
 const modes=['auto','desktop','mobile'];
 const modeKey='aigii.formal.web.layout.v1';
 const root=document.documentElement;
 const stage=document.getElementById('mobile-viewport');
 const region=document.getElementById('mobile-page-display');
 const featureBox=document.getElementById('mobile-page-features');
 const image=document.getElementById('authority-image');
 if(!stage||!region||!featureBox||!image)return;
 const controls=Array.from(document.querySelectorAll('[data-aig-view]'));
 const legacyPages=new Set(['CAD','CAM','3AX','4AX','5AX','6AX']);
 let mode='auto';
 try{const saved=window.localStorage&&window.localStorage.getItem(modeKey);if(modes.includes(saved))mode=saved;}catch(_){}
 let currentEmbedded='';
 const mobileNav=document.createElement('nav');
 mobileNav.className='mobile-quicknav';
 mobileNav.setAttribute('aria-label','手機頁面選擇');
 mobileNav.addEventListener('click',event=>{
  const btn=event.target.closest('[data-preview-page]');
  if(!btn)return;
  if(typeof renderPage==='function')renderPage(btn.dataset.previewPage);
  refresh();
 });
 function pageKey(){
  const candidate=(window.location.hash||'#HOME').slice(1).toUpperCase();
  return ORDER.includes(candidate)?candidate:'HOME';
 }
 function phoneNarrow(){
  return typeof window.matchMedia==='function'
   ?window.matchMedia('(max-width: 760px)').matches:Number(window.innerWidth||1280)<=760;
 }
 function mobileShell(page){
  const header=document.createElement('div');
  header.className='mobile-preview-no-core';
  const heading=document.createElement('h3');
  heading.textContent=page==='HOME'?'AIG-II RGB 首頁':page+' 手機工作頁';
  const desc=document.createElement('p');
  desc.textContent='CAM 幻彩玻璃手機排版已建立；此頁正式 Mobile Authority 圖與真核心仍須完成 Gate，不能用桌面圖頂替。';
  const help=document.createElement('div');
  help.className='mobile-preview-status';
  help.textContent='MOBILE SOURCE: PENDING NATIVE-4K VERIFIED AUTHORITY';
  header.append(heading,desc,help);
  return header;
 }
 function pageContent(page){
  const info=PAGES[page]||PAGES.HOME;
  const current=page;
  document.getElementById('mobile-page-label').textContent=page;
  document.getElementById('mobile-page-caption').textContent=info.sub||'AIG-II 手機 Web';
  featureBox.replaceChildren();
  for(const name of info.features||[]){
   const chip=document.createElement('span');chip.textContent=name;featureBox.appendChild(chip);
  }
  mobileNav.replaceChildren();
  for(const key of ORDER){
   const button=document.createElement('button');
   button.type='button';button.dataset.previewPage=key;button.textContent=key;
   if(key===current)button.classList.add('active');
   mobileNav.appendChild(button);
  }
  region.replaceChildren(mobileNav);
  if(legacyPages.has(page)){
   const frame=document.createElement('iframe');
   frame.title='AIG-II '+page+' 手機 Web 真 Runtime 預覽';
   frame.setAttribute('loading','eager');
   frame.setAttribute('referrerpolicy','same-origin');
   frame.src='./legacy-runtime.html#'+encodeURIComponent(page);
   region.appendChild(frame);
   currentEmbedded=page;
  }else{
   region.appendChild(mobileShell(page));
   currentEmbedded='';
  }
 }
 function refresh(){
  const active=mode==='mobile'||(mode==='auto'&&phoneNarrow());
  root.dataset.aigViewMode=mode;
  root.dataset.aigPresentation=active?'mobile':'desktop';
  stage.hidden=!active;
  controls.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.aigView===mode)));
  const page=pageKey();
  if(active){
   if(stage.dataset.page!==page || !region.querySelector('.mobile-quicknav')){
    pageContent(page);stage.dataset.page=page;
   }
   document.getElementById('authority-state').textContent='MOBILE WEB';
   document.getElementById('authority-class').textContent='CAM RGB GLASS / MOBILE';
   document.getElementById('authority-source').textContent='手機 Web 模組 • Desktop PNG 未混用';
   document.getElementById('authority-sha').textContent='MOBILE_4K_AUTHORITY_PENDING';
   document.getElementById('visual-status').textContent='MOBILE WEB PREVIEW';
   document.getElementById('ev-authority').textContent='MOBILE GATE PENDING';
  }else{
   stage.dataset.page='';
   if(currentEmbedded){region.replaceChildren();currentEmbedded='';}
   if(typeof renderPage==='function')renderPage(page);
  }
 }
 function change(next){
  if(!modes.includes(next))return false;
  mode=next;
  try{window.localStorage&&window.localStorage.setItem(modeKey,mode);}catch(_){}
  refresh();
  return true;
 }
 controls.forEach(button=>button.addEventListener('click',()=>change(button.dataset.aigView)));
 window.addEventListener('hashchange',refresh);
 window.addEventListener('resize',()=>{if(mode==='auto')refresh();});
 refresh();
 window.AIGII_WEB_PRESENTATION={getMode:()=>mode,setMode:change,getPresentation:()=>root.dataset.aigPresentation};
})(window,document);
