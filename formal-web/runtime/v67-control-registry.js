/* AIG V67 native DOM control-ID registrar, noninvasive: no click interception.
 * Does not pretend that setting an ID proves callback execution.
 * Exact contract file is source of truth; all unknown controls flagged for audit.
 * START is public index.html, HOME..AI are runtime screens.
 */
(function(w,d){"use strict";
const URL="./runtime/v67-page-subpage-contract.json";
const PREFIX="BTN.";let contract=null,ready=false,error="",observer=null,revision=0,unknown=0,duplicates=0;
const PAGES=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"];
const ATTRS=[
 ["axis-subpage",null],["cad-tool","DRAW"],["cad-action","MODIFY"],
 ["cam-strategy","STRATEGY"],["cam-action","AUTO"],["tp-action","PREVIEW"],
 ["nc-action","EDITOR"],["nc-key","KEYPAD"],["ai-command","WORKFLOW"],
 ["menu-action","MAIN"],["editcmd","NC_FIRST"],["cmd","MACHINE"],
 ["render-quality","MACHINE"],["sim-axis","PLAYBACK"],["open-page",null],
 ["data-open-page",null],["layout-mode","MAIN"],["aig6-axis","ABC"],
 ["aig66-retry","MACHINE"],["aig6-retry","MACHINE"],
 ["aig50-pane","MAIN"],["aig49-pane","MAIN"],["aig6-panel-open","MACHINE"],
 ["axis","MACHINE"],["toolkey","TOOL"],["assembly-new","FIXTURE"],
 ["assembly-field","FIXTURE"],["setup-jump-axis","MAIN"],
 ["cam-action","AUTO"],["home-action","MAIN"],["aig50-choice",null],
 ["aig65-mode",null],["aig41-layout","MACHINE"],["aig44-action","MACHINE"],
 ["ux27-page","NAV"],["aig67-global-route","NAV"],["aig67-global-nav","NAV"],
 ["page","NAV"],["aig57-action","MAIN"],["aig43-action","MACHINE"],["aig66-panel","MACHINE"]
];
const norm=s=>String(s??"").toUpperCase().trim().replace(/[^A-Z0-9_]+/g,"_").replace(/^_+|_+$/g,"").slice(0,80);
const fp=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,"0").toUpperCase()};
function pageOf(n){const screen=n.closest?.(".screen[data-page]");if(screen)return screen.dataset.page;
 if(n.closest?.("#nav,.nav"))return "HOME";
 if(n.closest?.("[data-ai-page-runtime]"))return "AI";
 return "HOME";
}
function readData(n,key){return n.getAttribute?.("data-"+key)}
function subpage(page,attr,val,n){
 const explicit=n.closest?.("[data-subpage-id]")?.getAttribute("data-subpage-id");
 if(explicit?.startsWith("SUBPAGE_"+page+"_"))return explicit.slice(("SUBPAGE_"+page+"_").length);
 if(attr==="global-route"||attr==="global-nav"||attr==="page"||attr==="ux27-page")return "NAV";
 if(attr==="aig50-choice")return norm(val)==="CODE"?"NC_FIRST":norm(val);
 if(attr==="aig65-mode")return norm(val);
 if(attr==="button-id"&&val.startsWith("BTN."))return val.split(".")[2];
 if(attr==="axis-subpage")return norm(val);
 if(attr==="cad-action"){
  const cmd=norm(val);return ["SNAP"].includes(cmd)?"SNAP":["DIM"].includes(cmd)?"DIMENSION":
   ["FIT","PAN"].includes(cmd)?"VIEW":"MODIFY";
 }
 if(attr==="nc-action")return ["VERIFY","PARSE"].includes(norm(val))?"PARSER":"EDITOR";
 if(attr==="open-page")return page==="AI"?"WORKFLOW":"MAIN";
 if(attr==="cam-action")return ["RELOAD","CALC"].includes(norm(val))?"AUTO":"PREVIEW";
 if(attr==="aig6-axis")return norm(val)==="H"?"HEAD_TILT":"ABC";
 if(attr==="cmd"&&["3AX","4AX","5AX","6AX"].includes(page))return "MACHINE";
 if(attr==="sim-axis")return "PLAYBACK";
 if(page==="HOME")return "MAIN";
 if(page==="NC")return "EDITOR";
 if(page==="AI")return "ASSISTANT";
 if(["3AX","4AX","5AX","6AX"].includes(page))return "MACHINE";
 return norm(ATTRS.find(([a])=>a===attr)?.[1]||"MAIN");
}
function getSemantic(n){
 const global=n.getAttribute?.("data-aig67-global-route");
 if(global!==null&&global!==undefined)return{attr:"global-route",value:"OPEN_"+global,sub:"NAV",kind:"NATIVE_ROUTER"};
 if(n.matches?.("[data-aig67-global-nav]"))return{attr:"global-nav",value:"TOGGLE",sub:"NAV",kind:"NATIVE_ROUTER"};
 if(n.matches?.(".nav button[data-page]"))return {attr:"page",value:"OPEN_"+readData(n,"page"),sub:"NAV",kind:"LEGACY_NAV"};
 const legacy=readData(n,"button-id");
 if(legacy&&/^BTN\.[A-Z0-9_]+\.[A-Z0-9_]+\.[A-Z0-9_]+$/.test(legacy))
  return{attr:"button-id",value:legacy,sub:legacy.split(".")[2],kind:"EXPLICIT_CANONICAL"};
 for(const [attr]of ATTRS){const val=readData(n,attr);if(val!==null)
  return{attr,value:attr==="open-page"?"OPEN_"+val:val,kind:"SOURCE_SELECTOR"}}
 if(legacy)return {attr:"button-id",value:legacy,sub:null,kind:"LEGACY_DECLARED"};
 if(n.matches?.("a[href^='#']")&&n.closest?.(".screen"))return{attr:"href",value:n.getAttribute("href"),kind:"NAVIGATION"};
 return null;
}
function stableNodeKey(n){let parts=[],p=n;for(let i=0;i<6&&p?.parentElement;i++,p=p.parentElement){
 const peers=[...p.parentElement.children].filter(x=>x.tagName===p.tagName);
 parts.push(p.tagName+"."+(p.id||p.classList?.[0]||"")+"#"+peers.indexOf(p));}
 return parts.reverse().join("/")+"/"+norm(n.textContent?.slice(0,32));
}
function labelNode(n,page){const sem=getSemantic(n),sub=sem?(sem.sub||subpage(page,sem.attr,sem.value,n)):"UNMAPPED";
 const code=sem?norm(sem.value)||"EMPTY":fp(stableNodeKey(n));
 const explicit=sem?.kind==="EXPLICIT_CANONICAL"?sem.value:null;
 const id=explicit||PREFIX+(sem?.kind==="NATIVE_ROUTER"?"GLOBAL":page)+"."+sub+"."+
   (sem&&sem.kind!=="EXPLICIT_CANONICAL"?code:"UNMAPPED_"+code);
 const command=sem?"COMMAND."+(sem.kind==="NATIVE_ROUTER"?"GLOBAL":page)+"."+sub+"."+code:null;
 // Preserve every preexisting V65 Button ID and Command ID — not interchangeable.
 n.dataset.aig67ButtonId=id;
 n.dataset.aig67SubpageId="SUBPAGE_"+page+"_"+sub;
 n.dataset.aig67CallbackEvidence=sem?(
  sem.kind==="NATIVE_ROUTER"?"ROUTER_DECLARED_NOT_YET_CLICK_TESTED":
  sem.kind==="EXPLICIT_CANONICAL"?"LEGACY_CALLBACK_ID_DECLARED_UNVERIFIED":
  "SOURCE_SELECTOR_ONLY_UNVERIFIED"):"UNMAPPED_BLOCKED";
 n.dataset.aig67CommandId=command||"UNMAPPED_BLOCKED";
 if(!sem)n.dataset.aig67Issue="UNMAPPED_BUTTON";
 else delete n.dataset.aig67Issue;
 return {id,command,sub,source:sem?.attr||"NONE"};
}
function controls(root){return [...root.querySelectorAll("button,a[data-open-page],input[type=button],input[type=range],input[type=checkbox],select[data-axis]")]}
function annotate(root=d){
 if(!contract)return null;
 const nodes=controls(root);
 const map=new Map();unknown=0;duplicates=0;
 for(const n of nodes){const page=pageOf(n);const v=labelNode(n,page);
  if(n.dataset.aig67Issue)unknown++;
  if(map.has(v.id)){
   duplicates++;
   // The old ID is preserved. A stable V67 region suffix makes this live
   // control uniquely inspectable while keeping the duplicate legacy Gate RED.
   const variant=v.id+"_"+fp(stableNodeKey(n));
   n.dataset.aig67ButtonId=variant;
   n.dataset.aig67Issue="LEGACY_DUPLICATE_REQUIRES_MANIFEST_FIX";
   map.set(variant,n);
  }else map.set(v.id,n);
 }
 // Page and subpage identity remains stable across layout switches; no new UI shells.
 for(const p of contract.pages){const screen=d.querySelector('.screen[data-page="'+p.id+'"]');
  if(screen){screen.dataset.aig67PageId=p.pageId;
   for(const s of p.subpages){const target=screen.querySelector(s.selector);
    if(target&&!target.dataset.aig67SubpageId)target.dataset.aig67SubpageId=s.id;}
  }
 }
 revision++;w.dispatchEvent(new CustomEvent("aig67:control-manifest",{detail:{revision,count:nodes.length,unknown,duplicates}}));
 return {count:nodes.length,unknown,duplicates};
}
function snapshot(){
 const screens=contract?.pages||[];
 const all=controls(d).map(n=>({
  page:pageOf(n),id:n.dataset.aig67ButtonId||null,
  originalId:n.dataset.buttonId||null,
  subpage:n.dataset.aig67SubpageId||null,
  command:n.dataset.aig67CommandId||null,
  callbackStatus:n.dataset.aig67CallbackEvidence||"MISSING",
  issue:n.dataset.aig67Issue||null,
  visible:!!(n.getClientRects?.().length),disabled:!!n.disabled
 }));
 const pageStatus=screens.map(p=>({page:p.id,pageId:p.pageId,
  subpages:p.subpages.map(s=>({id:s.id,kind:s.kind,selector:s.selector,
   present:p.kind==="runtime"?!!d.querySelector('.screen[data-page="'+p.id+'"] '+s.selector):
    p.id==="START"?"PORTAL_SEPARATE_NOT_IN_RUNTIME":false,
   declaredStatus:s.status
  }))}));
 return {schema:"AIG_V67_RUNTIME_CONTROL_AUDIT",ready,error,revision,unknown,duplicates,
  all,controllers:all.length,pages:pageStatus,realCallbackVerification:"NOT_DONE_BY_ID_DECORATION",machineOutput:"BLOCKED"};
}
async function initialize(){
 try{
  const ac=new AbortController();const timeout=w.setTimeout(()=>ac.abort(),4500);
  let response;try{response=await fetch(URL,{cache:"no-store",signal:ac.signal})}finally{w.clearTimeout(timeout)}
  if(!response.ok)throw Error("CONTRACT_FETCH_HTTP_"+response.status);
  contract=await response.json();
  if(contract?.schema!=="AIG_V67_PAGE_SUBPAGE_BUTTON_COMMAND_CONTRACT"||contract.pages?.length!==11)
   throw Error("WRONG_PAGE_CONTRACT");
  annotate(d);ready=true;
  const root=d.getElementById("screens")||d.body;
  observer=new MutationObserver(()=>{if(!contract)return;w.requestAnimationFrame(()=>annotate(d))});
  observer.observe(root,{childList:true,subtree:true});
 }catch(e){error=String(e?.message||e);ready=false;w.dispatchEvent(new CustomEvent("aig67:control-error",{detail:{error}}));}
}
w.AIG_V67_CONTROL_REGISTRY=Object.freeze({
 version:"67.0.0",initialize,annotate,snapshot,
 inspect:()=>({ready,error,revision,unknown,duplicates,contractPages:contract?.pages.length||0})
});
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})(window,document);
