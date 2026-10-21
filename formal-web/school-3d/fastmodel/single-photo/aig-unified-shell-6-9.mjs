/** FastModel 6.9.1 — one RGB program, compact workbench navigation.
 * Presentation only: existing nodes retain stable IDs, callbacks and state.
 * No core, media, assets, or original 3D runtime is deleted or cloned.
 */
export const AIG_UNIFIED_SHELL_SCHEMA='AIG_FASTMODEL_SINGLE_WORKSPACE_6_9_1';
export const AIG_UNIFIED_TABS=Object.freeze([
 {id:'create',title:'創作',hint:'照片與劇情'},
 {id:'output',title:'預覽／輸出',hint:'播放、錄影、下載'},
 {id:'model',title:'3D 模型',hint:'GLB、骨架與動畫'},
 {id:'advanced',title:'進階',hint:'舊版技術及工程驗證'}
]);
const byId=(doc,id)=>doc.getElementById(id);
function findHeading(nodes,prefix){
 return nodes.findIndex(n=>n.tagName==='H3'&&n.textContent.trim().startsWith(prefix));
}
function node(doc,name,attrs={},text=''){
 const el=doc.createElement(name);
 for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);
 if(text)el.textContent=text;
 return el;
}
export function initAIGUnifiedShell(doc=globalThis.document){
 if(!doc||byId(doc,'aig-unified-tabs'))return {ready:false,reason:'ALREADY_STARTED_OR_NO_DOCUMENT'};
 const aside=doc.querySelector('main > aside');
 const stage=doc.querySelector('main > .workspace');
 const original=byId(doc,'generation');
 const status=byId(doc,'aig65-status');
 const stillCanvas=byId(doc,'aig65-canvas');
 if(!aside||!stage||!original||!status||!stillCanvas)
  return {ready:false,reason:'REQUIRED_RUNTIME_ELEMENTS_MISSING'};
 const children=Array.from(original.children),
   auto=findHeading(children,'AIG FastModel 6.9'),
   model=findHeading(children,'AIG FastModel 6.4'),
   advanced=findHeading(children,'進階／舊版');
 if(auto<0||model<=auto||advanced<=model)
  return {ready:false,reason:'RUNTIME_SECTION_ORDER_CHANGED'};
 const shell=node(doc,'div',{id:'aig-unified-shell'});
 const tabs=node(doc,'nav',{id:'aig-unified-tabs','aria-label':'AIG FastModel 功能切換','role':'tablist'});
 const paneBox=node(doc,'div',{id:'aig-unified-panel-box'});
 shell.append(tabs,paneBox);
 // Insert the actual panel host before moving any controls: moving a node
 // to a detached panel makes getElementById() fail even though it exists.
 aside.prepend(shell);
 const panels={};
 const tabsById={};
 for(const {id,title,hint} of AIG_UNIFIED_TABS){
  const tab=node(doc,'button',{
   type:'button',id:'aig-unified-tab-'+id,role:'tab',
   'aria-controls':'aig-unified-panel-'+id,
   'aria-selected':id==='create'?'true':'false',
   'title':hint
  },title);
  const panel=node(doc,'section',{
   id:'aig-unified-panel-'+id,role:'tabpanel',
   'aria-labelledby':'aig-unified-tab-'+id,
   'data-aig-panel':id
  });
  if(id!=='create')panel.hidden=true;
  tabs.append(tab);paneBox.append(panel);
  panels[id]=panel;tabsById[id]=tab;
 }
 panels.create.append(node(doc,'h2',{},'照片 ＋ 劇情 → 動畫'));
 for(const el of children.slice(auto,model))panels.create.append(el);
 // Keep the long explanatory text available, but no longer place it
 // above the first interaction on Android.
 const info=node(doc,'details',{id:'aig-unified-help'});
 info.append(node(doc,'summary',{},'功能說明與限制'));
 for(const el of Array.from(panels.create.children).filter(e=>e.tagName==='H3'||
   (e.tagName==='P'&&!e.id)))info.append(el);
 panels.create.insertBefore(info,panels.create.children[1]||null);
 // Audio is an optional enhancement; make existing local sound toggles
 // accessible in the main Create page instead of hidden under the 3D tab.
 // Move the ORIGINAL controls, never duplicate IDs or handlers.
 const soundHelp=node(doc,'details',{id:'aig-unified-auto-sound'});
 soundHelp.append(node(doc,'summary',{},'自動聲音（選填；免上傳音檔）'));
 soundHelp.append(node(doc,'p',{class:'aig-unified-mini'},
  '不提供 WAV 也可生成、播放與錄製。播放可使用裝置繁中朗讀與 AIG 原創音效／配樂；影片可封入原創音效／配樂，但系統朗讀不會自動錄到影片。'));
 const liveSoundOptions=doc.querySelector('.story-sound-options');
 const moveControls=[
  doc.querySelector('label[for="music-mood"]'),
  byId(doc,'music-mood'),
  doc.querySelector('label[for="audio-volume"]'),
  byId(doc,'audio-volume')
 ];
 for(const el of [liveSoundOptions,...moveControls])if(el)soundHelp.append(el);
 const createButton=byId(doc,'aig65-build');
 if(createButton)panels.create.insertBefore(soundHelp,createButton);
 const noWavTip=node(doc,'p',{id:'aig-unified-no-wav-tip',class:'aig-unified-mini'},
  '聲音檔非必要！直接按「生成動畫」即可。');
 const wavInput=byId(doc,'aig67-voice');
 if(wavInput)panels.create.insertBefore(noWavTip,wavInput);
 // Move real callbacks, outputs and downloads — never clone input elements.
 const outputElements=['aig65-play','aig65-stop','aig65-record',
  'aig68-review','aig68-status','aig65-report',
  'aig65-video','aig65-downloads'];
 panels.output.append(node(doc,'h2',{},'播放 · 錄影 · 驗證'));
 panels.output.append(node(doc,'p',{class:'aig-unified-mini'},
  '錄影格式依瀏覽器支援；真 1080p 畫面與音訊須另行驗收。'));
 for(const id of outputElements){
  const el=byId(doc,id);
  if(!el)throw Error('AIG_UNIFIED_MISSING_OUTPUT_'+id);
  panels.output.append(el);
 }
 // Runtime keeps the SAME physical preview canvas and Three/WebGL canvas.
 stage.append(stillCanvas);
 const originalTail=Array.from(aside.children).filter(el=>el!==original&&el!==shell);
 for(const el of children.slice(model,advanced))panels.model.append(el);
 for(const el of originalTail)panels.model.append(el);
 panels.model.insertBefore(node(doc,'h2',{},'真正的 3D、骨架與影片'),panels.model.firstChild);
 panels.advanced.append(original); // retains entire legacy DOM and IDs
 panels.advanced.insertBefore(node(doc,'h2',{},'進階工具與來源 Gate'),original);
 shell.append(node(doc,'div',{id:'aig-unified-live-status'}));
 byId(doc,'aig-unified-live-status').append(status);
 const head=doc.querySelector('header h1');
 if(head)head.innerHTML='<span>AIG</span> FastModel <small>6.9.2 · 單一動畫工作區</small>';
 const displayLabels={
  'aig65-build':'生成動畫',
  'aig65-play':'▶ 播放',
  'aig65-stop':'■ 停止',
  'aig65-record':'● 錄製 1080p',
  'aig68-review':'驗證影片',
  'aig65-report':'下載驗證報告',
  'aig64-single-build':'生成 3D 技術模型'
 };
 for(const [id,title] of Object.entries(displayLabels)){
  const el=byId(doc,id);
  if(el){el.title=el.textContent.trim();el.textContent=title;}
 }
 let active='create';
 function activate(id,{focus=false}={}){
  if(!panels[id])return false;
  active=id;
  for(const key of Object.keys(panels)){
   const selected=key===id;
   panels[key].hidden=!selected;
   tabsById[key].setAttribute('aria-selected',String(selected));
   tabsById[key].tabIndex=selected?0:-1;
  }
  stage.dataset.aigUnifiedStage=(id==='model'||id==='advanced')?'3d':'canvas';
  aside.scrollTop=0;
  if(focus)tabsById[id].focus();
  try{doc.defaultView?.dispatchEvent(new Event('resize'));}catch{}
  return true;
 }
 for(let i=0;i<AIG_UNIFIED_TABS.length;i++){
  const id=AIG_UNIFIED_TABS[i].id,tab=tabsById[id];
  tab.addEventListener('click',()=>activate(id));
  tab.addEventListener('keydown',event=>{
   let next=null;
   if(event.key==='ArrowRight')next=(i+1)%AIG_UNIFIED_TABS.length;
   if(event.key==='ArrowLeft')next=(i+AIG_UNIFIED_TABS.length-1)%AIG_UNIFIED_TABS.length;
   if(event.key==='Home')next=0;
   if(event.key==='End')next=AIG_UNIFIED_TABS.length-1;
   if(next!==null){event.preventDefault();activate(AIG_UNIFIED_TABS[next].id,{focus:true});}
  });
 }
 activate('create');
 // Only switch after successful AUTO plan, preserving the genuine input
 // state and avoiding switching to a fake ready output after BLOCKED.
 let buildPending=false;
 function reflectAutoStatus(){
  if(!buildPending)return;
  const t=status.textContent;
  if(/BLOCKED|失敗|錯誤/.test(t)){buildPending=false;return;}
  if(/AUTO 選定/.test(t)){
   buildPending=false;
   if(/真 3D/.test(t))activate('model');
   else activate('output');
  }
 }
 // Capture phase wins even when a text-only AUTO build finishes
 // synchronously before the original bubble-phase build callback returns.
 byId(doc,'aig65-build').addEventListener('click',()=>{
  buildPending=true;
  doc.defaultView?.setTimeout?.(reflectAutoStatus,0);
 },true);
 if(typeof doc.defaultView?.MutationObserver==='function'){
  const observer=new doc.defaultView.MutationObserver(reflectAutoStatus);
  observer.observe(status,{subtree:true,childList:true,characterData:true});
 }
 return {ready:true,schema:AIG_UNIFIED_SHELL_SCHEMA,
  preservedStableButtonIDs:true,legacyModulesStillInDOM:true,
  panels:AIG_UNIFIED_TABS.map(x=>x.id),activate,get active(){return active;}};
}
