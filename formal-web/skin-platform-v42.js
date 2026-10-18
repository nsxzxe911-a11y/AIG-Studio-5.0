/* V42: Mobile and Desktop skins are separate, autonomous CSS resources.
   User-selected layout takes priority; does not touch machining state, NC, CAD, CAM or WebGL.
   Uploaded AIG-10.rar images remain UNINGESTED until archive file inspection succeeds. */
(function(w,d){"use strict";
 const html=d.documentElement;
 let current=null,started=false,observer=null;
 const media=w.matchMedia?.("(max-width:900px)")||{matches:(w.innerWidth||1280)<=900};
 function infer(){
   const requested=html.dataset.aigLayoutMode || w.AIG_LAYOUT_VIEW?.getMode?.() || "auto";
   if(requested==="mobile")return"mobile";
   if(requested==="desktop")return"desktop";
   const compact=html.dataset.aigV37Compact==="true";
   const actual=html.dataset.aigPresentation;
   const app=d.querySelector(".app"),width=app?.getBoundingClientRect?.().width||w.innerWidth||1280;
   if(actual==="mobile"||compact||media.matches||width<=900)return"mobile";
   return"desktop";
 }
 function update(){
   const next=infer();
   if(current!==next){
     current=next;html.dataset.aigSkinPlatform=next;
     html.dataset.aigSkinRelease="42";
   }
   return Object.freeze({webRelease:"42.0.0",platform:next,
    mobileStyle:"./skin-mobile-v42.css",desktopStyle:"./skin-desktop-v42.css",
    images:"ARCHIVE_INGEST_PENDING"});
 }
 function start(){
   if(started)return;started=true;update();
   if(w.MutationObserver){
     observer=new w.MutationObserver(()=>update());
     observer.observe(html,{attributes:true,attributeFilter:["data-aig-layout-mode","data-aig-presentation","data-aig-v37-compact"]});
   }
   w.addEventListener?.("resize",update,{passive:true});
   w.addEventListener?.("orientationchange",update,{passive:true});
   media.addEventListener?.("change",update);
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",start,{once:true});else start();
 w.AIG_SKIN_V42=Object.freeze({release:"42.0.0",update,read:()=>({platform:current,imageAssets:"PENDING_AIG10_ARCHIVE"}),
  stop:()=>{observer?.disconnect();w.removeEventListener?.("resize",update);w.removeEventListener?.("orientationchange",update);}});
})(window,document);
