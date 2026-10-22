/** FastModel 6.9.1 — one RGB program, compact workbench navigation.
 * Presentation only: existing nodes retain stable IDs, callbacks and state.
 * No core, media, assets, or original 3D runtime is deleted or cloned.
 */
import {initAigReadOnlyMotionControls} from './aig-motion-preview-readonly.mjs';
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
 const viewCanvas=byId(doc,'view');
 if(!aside||!stage||!original||!status||!stillCanvas||!viewCanvas)
  return {ready:false,reason:'REQUIRED_RUNTIME_ELEMENTS_MISSING'};
 const children=Array.from(original.children),
   auto=findHeading(children,'AIG FastModel 6.9'),
   model=findHeading(children,'AIG FastModel 6.4'),
   advanced=findHeading(children,'進階／舊版');
 if(auto<0||model<=auto||advanced<=model)
  return {ready:false,reason:'RUNTIME_SECTION_ORDER_CHANGED'};
 // The big viewport is reserved for real user imagery, never the
 // distorted technical body from the old procedural demo.
 const stageInfo=node(doc,'div',{id:'aig-unified-stage-info',role:'status',
  'aria-live':'polite'});
 const caption=node(doc,'strong',{},'AIG FastModel · 等待素材');
 const desc=node(doc,'p',{},'在「創作」選照片或輸入劇情，按「生成動畫」後顯示真預覽。不需要聲音檔。');
 const stageAction=node(doc,'button',{id:'aig-unified-stage-action',type:'button'},'開始創作');
 stageInfo.append(caption,desc,stageAction);
 stage.append(stageInfo);
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
 // Actual main controls FIRST. Original inputs are moved, not cloned.
 // Optional voice/advanced settings must never push them out of view.
 const primary=node(doc,'div',{id:'aig-unified-primary'});
 const essentialIds=['aig65-image','aig65-story','aig65-mode',
  'aig65-duration','aig65-build','aig693-progress'];
 for(const id of essentialIds){
  const control=byId(doc,id);
  const label=doc.querySelector('label[for="'+id+'"]');
  if(!control)throw Error('AIG_UNIFIED_MISSING_ESSENTIAL_'+id);
  if(label)primary.append(label);
  primary.append(control);
 }
 panels.create.insertBefore(primary,info);

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
 // All supplemental controls belong AFTER the essential form, collapsed.
 const faceOption=doc.querySelector('label[for="aig66-face"]');
 if(faceOption)soundHelp.append(faceOption);
 const wavLabel=doc.querySelector('label[for="aig67-voice"]');
 const wavInput=byId(doc,'aig67-voice');
 if(wavLabel)soundHelp.append(wavLabel);
 if(wavInput)soundHelp.append(wavInput);
 const wavStatus=byId(doc,'aig67-status');
 if(wavStatus)soundHelp.append(wavStatus);
 panels.create.insertBefore(soundHelp,info);
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
 panels.model.insertBefore(node(doc,'h2',{},'3D 模型檢視與來源驗證'),panels.model.firstChild);
 const modelNotice=node(doc,'p',{id:'aig-unified-model-notice',
  'data-aig-model-status':'none',role:'status'},
  '尚未載入可顯示的使用者 GLB。技術模型不等於正式女主角。');
 const returnCreate=node(doc,'button',{type:'button',
  id:'aig-unified-model-back'},'返回創作：照片／劇情動畫');
 const importGLB=node(doc,'button',{type:'button',
  id:'aig-unified-import-glb'},'匯入自己的 GLB（檢視與播放）');
 panels.model.insertBefore(importGLB,panels.model.children[1]||null);
 panels.model.insertBefore(returnCreate,importGLB);
 panels.model.insertBefore(modelNotice,returnCreate);
 const technicalHelp=node(doc,'details',{id:'aig-unified-model-technical'});
 technicalHelp.append(node(doc,'summary',{},'技術模型與舊版測試工具（不代表正式人物）'));
 let keepSinglePhotoPrimary=false;
 for(const el of Array.from(panels.model.children)){
  if(el===modelNotice||el===returnCreate||el===importGLB||
   el.tagName==='H2')continue;
  // The tested ONE-PHOTO 17-bone + bilateral real 3D action belongs in
  // the actual 3D Model workbench. Keep the original nodes/listeners visible,
  // while genuinely older technology remains inside the disclosure panel.
  if(el.tagName==='H3'&&el.textContent.trim().startsWith('AIG FastModel 6.4'))
   keepSinglePhotoPrimary=true;
  if(keepSinglePhotoPrimary){
   if(el.id==='aig64-single-status')keepSinglePhotoPrimary=false;
   continue;
  }
  technicalHelp.append(el);
 }
 panels.model.append(technicalHelp);
 // Genuine optional cross-product preview: this adds new standalone
 // file/play/stop controls, without moving/cloning any original 3D or 2D UI.
 const motionBridge=initAigReadOnlyMotionControls(doc,panels.model);
 if(!motionBridge.ready)throw Error('AIG_MOTION_PREVIEW_BINDING_MISSING');
 panels.advanced.append(original); // retains entire legacy DOM and IDs
 panels.advanced.insertBefore(node(doc,'h2',{},'進階工具與來源 Gate'),original);
 const inlineStatus=node(doc,'div',{id:'aig-unified-live-status'});
 primary.append(inlineStatus);
 inlineStatus.append(status);
 const head=doc.querySelector('header h1');
 if(head)head.innerHTML='<span>AIG</span> FastModel <small>6.9.5 · 單一動畫工作區</small>';
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
 let active='create',modelEvidence='none',canvasReady=false;
 function renderStage(){
  const isModel=active==='model'||active==='advanced';
  const allow3D=isModel&&modelEvidence==='imported';
  const showPlaceholder=isModel?!allow3D:!canvasReady;
  stage.dataset.aigUnifiedStage=isModel?'3d':'canvas';
  stage.dataset.aigModelState=modelEvidence;
  stage.dataset.aigPreviewReady=showPlaceholder?'false':'true';
  stageInfo.hidden=!showPlaceholder;
  viewCanvas.hidden=!allow3D;
  if(isModel){
   const msg=modelEvidence==='technical'?
    '此為未通過人物外觀 Gate 的技術 GLB；已停止將錯位的人偶當正式女主角展示。模型仍保留在記憶體，進階分析與下載不受影響。':
    modelEvidence==='imported'?
    '已載入使用者 GLB；可查看真模型，不等於臉部、材質或碰撞已通過正式驗收。':
    '尚未載入 GLB。可先用照片做 2D／2.5D 動畫，再決定是否匯入自己的 3D 模型。';
   modelNotice.textContent=msg;
   modelNotice.dataset.aigModelStatus=modelEvidence;
   caption.textContent=modelEvidence==='technical'?'技術模型已隔離':'3D 模型尚未就緒';
   desc.textContent=msg;
   stageAction.textContent='返回創作';
  }else{
   caption.textContent='AIG FastModel · 等待素材';
   desc.textContent='選照片或輸入劇情 → 生成動畫 → 播放／錄製。音訊檔為選填。';
   stageAction.textContent='開始創作';
  }
 }
 function setModelEvidence(kind){
  if(!['none','technical','imported'].includes(kind))return false;
  modelEvidence=kind;renderStage();return true;
 }
 function setCanvasReady(ready){canvasReady=ready===true;renderStage();}

 function activate(id,{focus=false}={}){
  if(!panels[id])return false;
  active=id;
  for(const key of Object.keys(panels)){
   const selected=key===id;
   panels[key].hidden=!selected;
   tabsById[key].setAttribute('aria-selected',String(selected));
   tabsById[key].tabIndex=selected?0:-1;
  }
  renderStage();
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
 stageAction.addEventListener('click',()=>activate('create'));
 returnCreate.addEventListener('click',()=>activate('create'));
 importGLB.addEventListener('click',()=>{
  const file=byId(doc,'local-glb');
  if(file){technicalHelp.open=true;file.click();}
 });
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
  panels:AIG_UNIFIED_TABS.map(x=>x.id),activate,setModelEvidence,setCanvasReady,
  get modelEvidence(){return modelEvidence;},
  get active(){return active;}};
}
