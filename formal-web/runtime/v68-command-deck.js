/* AIG V68  |  one-position CNC command deck.
 * Reparents EXISTING controls inside their original event-delegation root.
 * It never calls click(), never duplicates a CNC action, never writes NC,
 * never creates machine output and never changes the core command handler.
 */
(function(w,d){"use strict";
const CONTRACT="./runtime/v68-button-layout-contract.json";
const LANES=["EDIT","VIEW","RUN","VERIFY","FILE","DANGER"];
const labels={EDIT:"編輯",VIEW:"視圖",RUN:"執行",VERIFY:"驗證",FILE:"儲存",DANGER:"刪除／重設"};
let manifest=null,initError="",ready=false,revision=0,queued=false;
const decks=new Map();
const hash=str=>{let n=2166136261;for(const c of str){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return(n>>>0).toString(16).toUpperCase().padStart(8,"0")};
const token=value=>String(value||"").toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,64);
function rootFor(page,spec){
 const screen=d.querySelector('.app>.shell>.screen[data-page="'+page+'"]');
 return screen?.querySelector(spec[0]?.root)||null;
}
function isCompact(){return !!w.matchMedia?.("(max-width:900px)").matches}
function nativeControl(node){return node instanceof Element&&node.matches("button,input[type=button]")}
function ensureDeck(page,list){
 const root=rootFor(page,list);
 if(!root)return null;
 const previous=decks.get(page);
 if(previous?.root===root&&previous.el.isConnected)return previous;
 const deck=d.createElement("section");
 deck.className="aig68-deck";deck.dataset.aig68Page=page;deck.dataset.aig68Selected="EDIT";
 deck.setAttribute("aria-label",page+" 固定位置 CNC 功能操作列");
 const head=d.createElement("div");head.className="aig68-deck-head";
 const name=d.createElement("span");name.className="aig68-deck-name";
 name.textContent="AIG · "+(page==="TOOLPATH"?"3D 走刀":page)+" · 操作";
 const caution=d.createElement("span");caution.className="aig68-deck-caution";
 caution.textContent="機台輸出關閉 · 紅色區域為刪除／重設";
 head.append(name,caution);
 const tabs=d.createElement("div");tabs.className="aig68-tabs";tabs.setAttribute("role","tablist");
 tabs.setAttribute("aria-label","所有頁面固定次序：編輯、視圖、執行、驗證、儲存、刪除／重設");
 const body=d.createElement("div");body.className="aig68-deck-body";
 for(const lane of LANES){
  const tab=d.createElement("button");tab.type="button";tab.className="aig68-tab";
  tab.dataset.aig68LaneTab=lane;tab.dataset.aig68ButtonId="BTN."+page+".DECK.TAB_"+lane;
  tab.dataset.aig68CommandId="COMMAND."+page+".DECK.OPEN_"+lane;
  tab.textContent=labels[lane];tab.setAttribute("role","tab");
  tab.setAttribute("aria-controls","aig68-"+page+"-"+lane);
  tab.addEventListener("click",()=>selectLane(page,lane,true));
  tabs.append(tab);
  const group=d.createElement("section");group.className="aig68-lane";
  group.dataset.aig68Lane=lane;group.id="aig68-"+page+"-"+lane;
  group.setAttribute("role","tabpanel");group.setAttribute("aria-label",labels[lane]);
  const title=d.createElement("span");title.className="aig68-lane-label";title.textContent=labels[lane];
  const controls=d.createElement("div");controls.className="aig68-native-actions";
  group.append(title,controls);body.append(group);
 }
 deck.append(head,tabs,body);root.insertBefore(deck,root.firstChild);
 const ctx={page,root,el:deck,byLane:Object.fromEntries(LANES.map(l=>[l,[]])),
  selected:"EDIT",issues:[],moved:0,missing:0,allControls:0,unknown:0,duplicates:0};
 decks.set(page,ctx);
 return ctx;
}
function selectLane(page,lane,fromUser=false){
 const ctx=decks.get(page);if(!ctx||!LANES.includes(lane))return false;
 if(!ctx.byLane[lane].length)return false;
 ctx.selected=lane;ctx.el.dataset.aig68Selected=lane;
 for(const tab of ctx.el.querySelectorAll("[data-aig68-lane-tab]")){
  const chosen=tab.dataset.aig68LaneTab===lane;
  tab.setAttribute("aria-selected",String(chosen));tab.tabIndex=chosen?0:-1;
 }
 for(const section of ctx.el.querySelectorAll("[data-aig68-lane]")){
  const visible=!isCompact()||section.dataset.aig68Lane===lane;
  section.hidden=!visible;section.setAttribute("aria-hidden",String(!visible));
 }
 if(fromUser)ctx.el.dispatchEvent(new CustomEvent("aig68:lane",{bubbles:true,
   detail:{page,lane,cncActionTriggered:false}}));
 return true;
}
function stableDomKey(el,root){
 let parts=[],node=el;
 for(let i=0;i<8&&node&&node!==root&&node.parentElement;i++,node=node.parentElement){
  const parent=node.parentElement,siblings=[...parent.children].filter(x=>x.tagName===node.tagName);
  const raw=node.getAttribute("data-button-id")||node.getAttribute("data-command-id")||
   node.getAttribute("data-cmd")||node.getAttribute("data-nc-key")||node.id||node.className||"";
  parts.push(node.tagName+":"+siblings.indexOf(node)+":"+raw);
 }
 return parts.reverse().join("/");
}
function recordId(ctx,node,ids){
 const dup=ids.has(node.dataset.aig68ButtonId);
 if(dup){node.dataset.aig68Issue="DUPLICATE_CANONICAL_BUTTON_ID";
  node.dataset.aig68ButtonId+="__"+hash(stableDomKey(node,ctx.root));ctx.duplicates++}
 ids.add(node.dataset.aig68ButtonId);
}
function inventory(ctx){
 const ids=new Set();
 ctx.unknown=0;ctx.duplicates=0;ctx.allControls=0;
 for(const node of ctx.root.querySelectorAll("button,input[type=button]")){
  if(!nativeControl(node))continue;ctx.allControls++;
  if(!node.dataset.aig68ButtonId){
   const source=[...node.attributes].find(a=>/^data-(?:cad-tool|cad-action|cam-action|cam-strategy|tp-action|cmd|editcmd|nc-action|nc-key|ai-command|sim-axis|axis-subpage|render-quality|button-id|open-page)/.test(a.name));
   const part=source?token(source.name.replace(/^data-/,"")+"_"+source.value):"UNKNOWN_"+hash(stableDomKey(node,ctx.root));
   node.dataset.aig68ButtonId="BTN."+ctx.page+".UNMAPPED."+part;
   node.dataset.aig68CommandId=source?"UNVERIFIED_SOURCE_"+part:"UNMAPPED_BLOCKED";
   node.dataset.aig68CallbackStatus="UNMAPPED_REQUIRES_CALLBACK_AUDIT";
   node.dataset.aig68Issue="NO_VERIFIED_MANIFEST_SELECTOR";
  }
  if(node.dataset.aig68Issue)ctx.unknown++;
  recordId(ctx,node,ids);
 }
}
function mountPage(page){
 const list=manifest.allRecords.filter(x=>x.page===page);
 const ctx=ensureDeck(page,list);if(!ctx)return;
 // Important: all controls remain descendants of the ORIGINAL CNC callback root.
 // No cloneNode, no synthetic buttons, no event re-dispatch and no new Post.
 for(const item of list){
  const native=ctx.root.querySelector(item.sourceSelector);
  if(!native||!nativeControl(native)){
   if(!ctx.issues.some(x=>x.id===item.buttonId)){
    ctx.issues.push({id:item.buttonId,selector:item.sourceSelector,reason:"REAL_BUTTON_MISSING"});
    ctx.missing++;
   }continue;
  }
  if(native.dataset.aig68ButtonId&&native.dataset.aig68ButtonId!==item.buttonId){
   // A source selector can be a reused native button. Fail closed instead
   // of assigning one active node two conflicting command IDs.
   ctx.issues.push({id:item.buttonId,reason:"SOURCE_NODE_ALREADY_OWNED"});
   continue;
  }
  native.dataset.aig68ButtonId=item.buttonId;
  native.dataset.aig68CommandId=item.commandId;
  native.dataset.aig68CallbackStatus="NATIVE_HANDLER_PRESERVED_BROWSER_CLICK_NOT_PROVEN";
  native.dataset.aig68Slot=item.slot;
  native.dataset.aig68SubpageId=item.subpageId;
  native.dataset.aig68OriginalButtonId=native.getAttribute("data-button-id")||"";
  native.dataset.aig68OriginalCommandId=native.getAttribute("data-command-id")||"";
  native.classList.add("aig68-native-button");
  const target=ctx.el.querySelector('[data-aig68-lane="'+item.slot+'"] .aig68-native-actions');
  if(!target.contains(native)){target.append(native);ctx.moved++}
  if(!ctx.byLane[item.slot].includes(item.buttonId))ctx.byLane[item.slot].push(item.buttonId);
 }
 for(const lane of LANES){
  const tab=ctx.el.querySelector('[data-aig68-lane-tab="'+lane+'"]');
  const count=ctx.byLane[lane].length;
  tab.disabled=count===0;tab.title=count?labels[lane]+" · "+count+" 項實際功能":"本頁無此類按鈕";
  const panel=ctx.el.querySelector('[data-aig68-lane="'+lane+'"]');
  if(!count&&!panel.querySelector(".aig68-empty")){
   const text=d.createElement("span");text.className="aig68-empty";text.textContent="本頁不適用";
   panel.querySelector(".aig68-native-actions").append(text);
  }
 }
 inventory(ctx);
 const preferred=ctx.byLane[ctx.selected].length?ctx.selected:
  ["VIEW","EDIT","RUN","VERIFY","FILE","DANGER"].find(l=>ctx.byLane[l].length);
 if(preferred)selectLane(page,preferred,false);
 revision++;
}
function refresh(){
 if(!manifest)return false;
 for(const page of manifest.pageOrder)mountPage(page);
 return true;
}
function snapshot(){
 const pages=[...decks].map(([page,c])=>({
  page,mounted:c.el.isConnected,selected:c.selected,
  fixedOrder:LANES.slice(),mountedRealButtons:c.moved,
  currentRealButtonCount:LANES.reduce((n,l)=>n+c.byLane[l].length,0),
  missingConfiguredButtons:c.missing,allButtonCount:c.allControls,
  unmappedButtonCount:c.unknown,duplicateButtonIds:c.duplicates,
  dangerSeparated:!!c.el.querySelector('[data-aig68-lane="DANGER"]'),
  lanePositions:LANES.map(l=>{
   const t=c.el.querySelector('[data-aig68-lane-tab="'+l+'"]'),r=t?.getBoundingClientRect();
   return {lane:l,enabled:!t?.disabled,left:r?Math.round(r.left):null,
    top:r?Math.round(r.top):null,width:r?Math.round(r.width):null}
  }),issues:c.issues.slice(0,40)
 }));
 return {schema:"AIG_V68_REAL_COMMAND_DECK",ready,initError,revision,
  lanes:LANES.slice(),pages,releaseGate:"PENDING_REAL_BROWSER_UI_AND_CALLBACK_TEST",
  originalButtonsMovedNotCloned:true,machineOutput:"BLOCKED"};
}
async function init(){
 const controller=new AbortController(),timer=w.setTimeout(()=>controller.abort(),6000);
 try{
  const r=await fetch(CONTRACT,{signal:controller.signal,cache:"no-store"});
  if(!r.ok)throw Error("V68_BUTTON_CONTRACT_HTTP_"+r.status);
  const parsed=await r.json();
  if(parsed.schema!=="AIG_V68_REAL_BUTTON_LAYOUT_CONTRACT"||parsed.lanes.length!==6||
    !parsed.allRecords.length)throw Error("INVALID_V68_COMMAND_CONTRACT");
  manifest=parsed;ready=true;refresh();
  const shell=d.querySelector(".app>.shell");
  if(shell)new MutationObserver(()=>{
   if(queued)return;queued=true;w.requestAnimationFrame(()=>{queued=false;refresh()});
  }).observe(shell,{childList:true,subtree:true});
  w.addEventListener("resize",()=>{for(const [page,c]of decks)selectLane(page,c.selected,false)},{passive:true});
 }catch(e){initError=String(e?.message||e);ready=false;}
 finally{w.clearTimeout(timer)}
}
w.AIG_V68_COMMAND_DECK=Object.freeze({version:"68.0.0",refresh,selectLane,snapshot,inspect:()=>({
 ready,initError,revision,pages:decks.size,registeredRealControls:[...decks.values()].reduce((n,c)=>n+Object.values(c.byLane).reduce((a,l)=>a+l.length,0),0)
})});
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window,document);