/* AIG V67 START public portal ID audit — preserve nature/RGB portal styling,
 * existing links and native handlers. No injected fake controls. */
(function(w,d){"use strict";
 let count=0,duplicates=0,unknown=0,ready=false;
 const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16).toUpperCase()};
 const norm=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,64);
 function group(n){
  if(n.closest("#site-appearance"))return "SITE_THEME";
  if(n.closest("#site-navigation,.primary-nav,.utility-bar"))return "LANDING";
  if(n.closest("#dual-projects"))return "DUAL_PROJECTS";
  if(n.closest("#modules"))return "LANDING";
  return "LANDING";
 }
 function assign(){
  const map=new Map(),nodes=[...d.querySelectorAll("a[href],button")];
  count=nodes.length;duplicates=unknown=0;
  for(const n of nodes){
   const parent=group(n),href=n.getAttribute("href"),theme=n.dataset.themeChoice;
   const semantic=theme?"SELECT_"+norm(theme):href?"OPEN_"+norm(href.replace(/^\.\//,"")):
    n.id?"ACTION_"+norm(n.id):null;
   const id="BTN.START."+parent+"."+(semantic||"UNMAPPED_"+hash(n.outerHTML.slice(0,120)));
   n.dataset.aig67ButtonId=id;n.dataset.aig67SubpageId="SUBPAGE_START_"+parent;
   n.dataset.aig67CommandId=semantic?"COMMAND.START."+parent+"."+semantic:"UNMAPPED_BLOCKED";
   n.dataset.aig67CallbackEvidence=semantic?"SOURCE_LINK_OR_THEME_UNVERIFIED":"UNMAPPED_BLOCKED";
   if(map.has(id)){duplicates++;n.dataset.aig67Issue="DUPLICATE_BUTTON_ID";map.get(id).dataset.aig67Issue="DUPLICATE_BUTTON_ID";}
   else map.set(id,n);
   if(!semantic){unknown++;n.dataset.aig67Issue="UNMAPPED_BUTTON"}
  }
  ready=true;
 }
 function init(){assign();
  const root=d.querySelector(".site-container")||d.body;
  if(root)new MutationObserver(()=>w.requestAnimationFrame(assign)).observe(root,{childList:true,subtree:true});
 }
 w.AIG_V67_PORTAL_REGISTRY=Object.freeze({inspect:()=>({ready,count,duplicates,unknown,implementation:"SOURCE_LINK_ONLY;_CALLBACK_NOT_PROVEN"})});
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window,document);
