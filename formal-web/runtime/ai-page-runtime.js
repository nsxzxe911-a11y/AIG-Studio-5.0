/* AIG-II / AI ORCHESTRATOR V2 — Web local-first, 3AX..6AX.
 * Native Studio/AIG-II engines are NOT hosted by this static website.
 * Advisory-only; never dispatches NC_MACHINE, connects a machine, or invents SIM PASS.
 */
(function(global){
'use strict';
const AXES=Object.freeze(['3AX','4AX','5AX','6AX']);
const FIELDS=Object.freeze({CAD:'aig-cad-draft-v1',CAM:'aig-cam-toolpath-v1'});
const NC_KEY=axis=>'aig-code-'+axis;
const OBJECTIVES=Object.freeze(['FASTEST_SAFE','MIN_REWORK','MIN_TOOL_CHANGES']);
const DISPLAY=Object.freeze({
 NC_FIRST:'NC-first 直接程式',MANUAL_CAM_FIRST:'手動 CAM 優先',CAD_FIRST:'CAD 設計優先',
 PREPARE_NC:'先建立 NC 程式',AUDIT:'安全預檢',ASSIST:'工作說明'
});
const OWNER={CAD:'CAD',CAM:'CAM',SIM:'SIM',NC:'NC',AXIS:'3AX～6AX'};
const ROUTES={
 NC_FIRST:['NC 編輯','NC 解析','多軸刀路預覽','SIM 材料移除','SIM 碰撞與界限','NC 驗證','實機前人工確認'],
 MANUAL_CAM_FIRST:['手動 CAM 刀路','CAM 後處理預覽','SIM 材料移除','SIM 碰撞與界限','NC 解析','NC 驗證','實機前人工確認'],
 CAD_FIRST:['CAD 幾何檢查','CAM 真刀路','SIM 材料移除','SIM 碰撞與界限','NC 解析','NC 驗證','實機前人工確認'],
 PREPARE_NC:['NC 編輯建立','NC 解析','多軸刀路預覽','SIM 材料移除','SIM 碰撞與界限','NC 驗證','實機前人工確認']
};
function result(type,commandId,revision,evidence={},code='',detail=''){
 return{type,pageId:'AI',commandId,revision,evidence,code,detail};
}
function readString(store,key){
 try{return String(store?.getItem(key)||'')}
 catch(e){return''}
}
function readJSON(store,key){
 try{const value=JSON.parse(readString(store,key)||'null');return value&&typeof value==='object'&&!Array.isArray(value)?value:null}
 catch(e){return null}
}
function snapshotFromStorage(store,axis){
 if(!AXES.includes(axis))throw Error('不支援的加工軸數');
 const cad=readJSON(store,FIELDS.CAD),cam=readJSON(store,FIELDS.CAM);
 const shapes=Array.isArray(cad?.shapes)?cad.shapes:[];
 const paths=Array.isArray(cam?.paths)?cam.paths:[];
 const program=readString(store,NC_KEY(axis));
 const lines=program.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const hasNc=lines.some(x=>!/^[(;%]/.test(x));
 // Actual on-disk local Web state, NOT an unverified checkbox or remote native artifact.
 return {axis,cadCount:shapes.length,camCount:paths.length,ncLines:hasNc?lines.length:0,
  hasCad:shapes.length>0,hasCam:paths.length>0,hasNc,ncText:hasNc?program:'',
  localEvidence:true,verifiedSim:false,verifiedNc:false};
}
function inspectNc(program,axis){
 const issues=[],text=String(program||'').toUpperCase();
 if(!text.trim())return[{owner:'NC',code:'NC_PROGRAM_REQUIRED',level:'BLOCK',message:'未找到此軸已保存的 G-code'}];
 const code=text.replace(/\([^)]*\)/g,'').split(/\r?\n/).map(x=>x.replace(/;.*/,'')).join('\n');
 const has=pattern=>pattern.test(code);
 if(!has(/\bG9[01](?!\d)/))issues.push({owner:'NC',code:'NC_COORDINATE_MODE_UNCLEAR',level:'CHECK',message:'未找到明確的 G90／G91 座標模式'});
 if(!has(/\bG5[4-9](?!\d)/))issues.push({owner:'NC',code:'NC_WCS_UNCLEAR',level:'CHECK',message:'未找到 G54～G59 工作座標設定'});
 if(!has(/\bM(?:30|0?2)(?!\d)/))issues.push({owner:'NC',code:'NC_END_UNCLEAR',level:'CHECK',message:'未找到 M30／M02 結束指令'});
 if((axis==='4AX'&&!has(/\bA[+-]?\d/))||(axis==='5AX'&&!has(/\b[AB][+-]?\d/))||(axis==='6AX'&&!has(/\b[ABC][+-]?\d/))){
  issues.push({owner:axis,code:'AXIS_WORDS_NOT_FOUND',level:'CHECK',message:'程式未找到對應旋轉軸字，請確認機型與程式內容'});
 }
 if(has(/\bG0?0(?!\d)/)&&!has(/\bG43(?!\d)/)){
  issues.push({owner:'NC',code:'TOOL_LENGTH_CONFIRM',level:'CHECK',message:'存在快移；請核對刀長補償、Safe-Z 與夾治具'});
 }
 // These checks are only syntax hints; controller semantics require the real parser.
 return issues;
}
function planFrom(args){
 const axis=String(args.targetAxis||'3AX').toUpperCase();
 if(!AXES.includes(axis))throw Error('軸數必須為 3AX～6AX');
 const objective=String(args.objective||'FASTEST_SAFE').toUpperCase();
 if(!OBJECTIVES.includes(objective))throw Error('未支援的加工目標');
 const state=args.snapshot&&args.snapshot.axis===axis?args.snapshot:{
  axis,hasNc:Boolean(args.hasNcProgram),hasCam:Boolean(args.hasCamToolpath||args.hasManualCamArtifact),
  hasCad:Boolean(args.hasCadGeometry),ncText:'',cadCount:0,camCount:0,ncLines:0,
  verifiedSim:false,verifiedNc:false,localEvidence:false
 };
 const route=state.hasNc?'NC_FIRST':state.hasCam?'MANUAL_CAM_FIRST':state.hasCad?'CAD_FIRST':'PREPARE_NC';
 const issues=[];
 if(!state.hasNc)issues.push({owner:'NC',code:'NC_MISSING',level:'BLOCK',message:'此軸尚未保存 NC 程式'});
 if(!state.hasCam&&route==='CAD_FIRST')issues.push({owner:'CAM',code:'CAM_MISSING',level:'BLOCK',message:'CAD 有資料，但尚未產生並保存刀路'});
 if(!state.hasNc&&!state.hasCam&&!state.hasCad)issues.push({owner:'AI',code:'NO_SOURCE_ARTIFACT',level:'BLOCK',message:'目前沒有本機加工來源，請先建立 CAD、CAM 或 NC'});
 issues.push({owner:'SIM',code:'SIM_NOT_VERIFIED',level:'BLOCK',message:'尚無真材料移除與夾具碰撞的驗證證據'});
 issues.push({owner:'NC',code:'NC_NOT_VERIFIED',level:'BLOCK',message:'尚無對應機型與 NC 安全 Gate 的驗證證據'});
 if(state.hasNc)issues.push(...inspectNc(state.ncText,axis));
 if(axis!=='3AX')issues.push({owner:axis,code:'MULTIAXIS_KINEMATICS_CONFIRM',level:'CHECK',message:'旋轉中心、A/B/C 方向及機型運動學尚需獨立核對'});
 return {axis,objective,routeKind:route,planId:'AIG-AI-V2-'+axis+'-'+route,stages:ROUTES[route].slice(),
  issues,state,estimatedCost:route==='NC_FIRST'?30:route==='MANUAL_CAM_FIRST'?42:route==='CAD_FIRST'?60:70,
  machineEnabled:false,safeForMachine:false,safeToAutoApprove:false};
}
class WebAiPageRuntime{
 constructor(){this.revision=0;this.plan=null;this._messages=[];this.input=null;this.lastAuditSafe=false;}
 messages(){return this._messages.slice();}
 dispatch(command){
  const before={revision:this.revision,plan:this.plan,input:this.input,lastAuditSafe:this.lastAuditSafe};
  try{
   if(command.page!=='AI')throw Error('只接受 AI 頁面指令');
   const id=command.commandId;
   if(['AI.PLAN.BUILD','AI.PLAN.OPTIMIZE','AI.RECOVERY.REPLAN'].includes(id)){
    const args={...(this.input||{}),...(command.arguments||{})};
    this.plan=planFrom(args);this.input=args;this.revision++;this.lastAuditSafe=false;
    return result('ACCEPTED',id,this.revision,
      {routeKind:this.plan.routeKind,axis:this.plan.axis,stageCount:String(this.plan.stages.length),blockers:String(this.plan.issues.filter(x=>x.level==='BLOCK').length),
       machineEnabled:'false',planId:this.plan.planId});
   }
   if(id==='AI.ASSIST.EXPLAIN'){
    if(!this.plan)throw Error('請先建立加工方案');
    return result('ACCEPTED',id,this.revision,{routeKind:this.plan.routeKind,stageCount:String(this.plan.stages.length),
     explanation:DISPLAY[this.plan.routeKind]+'，先完成 SIM 與 NC 獨立驗證；不可由 AI 直接啟動機台。'});
   }
   if(id==='AI.AUDIT.RUN'){
    if(!this.plan)throw Error('請先建立加工方案');
    this.revision++;
    // Reviewing a proposed sequence is NOT equivalent to observing real SIM/NC verification.
    const blocks=this.plan.issues.filter(x=>x.level==='BLOCK');
    this.lastAuditSafe=false;
    return result('ACCEPTED',id,this.revision,{safe:'false',audit:'BLOCK',
      blockCount:String(blocks.length),warningCount:String(this.plan.issues.length-blocks.length),
      message:blocks.length?'尚缺必要驗證，真機輸出維持關閉':'僅完成 Web 預檢，沒有實機許可'});
   }
   throw Error('未知 AI 指令 '+id);
  }catch(err){
   this.revision=before.revision;this.plan=before.plan;this.input=before.input;this.lastAuditSafe=before.lastAuditSafe;
   const detail=String(err?.message||err),m={pageId:'AI',code:'AI_COMMAND_REJECTED',detail};this._messages.push(m);
   return result('REJECTED',command.commandId,this.revision,{},m.code,detail);
  }
 }
}
function node(tag,text,className){
 const el=document.createElement(tag);if(text!=null)el.textContent=String(text);
 if(className)el.className=className;return el;
}
function paintPlan(root,plan,action,resp){
 const intro=root.querySelector('[data-ai-status]');
 if(intro)intro.textContent=resp.type==='REJECTED'?'操作未完成：'+resp.detail:
  '本機分析完成 · '+plan.axis+' · '+DISPLAY[plan.routeKind]+' · revision '+resp.revision;
 const stages=root.querySelector('[data-ai-stages]'),issues=root.querySelector('[data-ai-issues]'),details=root.querySelector('[data-ai-detail]');
 if(!stages||!issues||!details)return;
 stages.replaceChildren();issues.replaceChildren();details.replaceChildren();
 const count=root.querySelector('[data-ai-blocker-count]');if(count)count.textContent=plan.issues.filter(x=>x.level==='BLOCK').length+' 項待確認';
 plan.stages.forEach((name,i)=>{
  const row=node('li',null,'aiStage');row.append(node('span',String(i+1).padStart(2,'0'),'aiStageNum'),node('span',name));
  stages.appendChild(row);
 });
 plan.issues.forEach(it=>{
  const li=node('li',null,'aiFinding ai'+it.level);
  li.append(node('span',it.owner+' / '+it.code,'aiFindingCode'),node('span',it.message,'aiFindingText'));
  issues.appendChild(li);
 });
 const state=plan.state;
 details.append(
  node('span','CAD '+state.cadCount+' 筆','aiDataPill'),
  node('span','CAM '+state.camCount+' 條','aiDataPill'),
  node('span','NC '+state.ncLines+' 行','aiDataPill'),
  node('span','SIM 尚未驗證','aiDataPill aiPending')
 );
 if(action==='AI.AUDIT.RUN')intro.textContent='預檢完成 · '+plan.issues.filter(x=>x.level==='BLOCK').length+' 項阻擋 · 未核發任何機台許可';
 if(action==='AI.ASSIST.EXPLAIN')intro.textContent='說明 · '+DISPLAY[plan.routeKind]+'，需逐一由 CAD／CAM／SIM／NC 模組完成驗證';
}
function init(){
 document.querySelectorAll('[data-ai-page-runtime]').forEach(root=>{
  if(root.dataset.aiBound==='1')return;
  root.dataset.aiBound='1';
  const runtime=new WebAiPageRuntime();
  const select=root.querySelector('[data-ai-axis]');
  let axis='3AX';
  try{const last=global.sessionStorage?.getItem('aigii-ai-axis');if(AXES.includes(last))axis=last}catch(_){}
  if(select)select.value=axis;
  const out=root.querySelector('[data-ai-result]');
  const router=new global.AigPageRuntimeRouter({
   runtimeProvider:page=>page==='AI'?runtime:null,
   pageNavigator:page=>typeof global.show==='function'&&global.show(page),
   resultSink:r=>{if(out)out.textContent=r.type==='REJECTED'?r.code+' · '+r.detail:
     'AI '+(r.evidence.audit||DISPLAY[r.evidence.routeKind]||'完成')+' · r'+r.revision;}
  });
  const refresh=()=>{
   const axis=select?.value||'3AX',state=snapshotFromStorage(global.localStorage,axis);
   const info=root.querySelector('[data-ai-data]');
   if(info)info.textContent=axis+'：CAD '+state.cadCount+' 筆、CAM '+state.camCount+' 條、NC '+state.ncLines+' 行；SIM 驗證未連接';
   return state;
  };
  if(select)select.addEventListener('change',()=>{try{global.sessionStorage?.setItem('aigii-ai-axis',select.value)}catch(_){}refresh()});
  root.querySelector('[data-ai-refresh]')?.addEventListener('click',refresh);
  function argumentsForCommand(){
   const targetAxis=select?.value||'3AX',snapshot=refresh();
   return {targetAxis,objective:root.querySelector('[data-ai-objective]')?.value||'FASTEST_SAFE',snapshot};
  }
  root.querySelectorAll('[data-ai-command]').forEach(btn=>{
   const buttonId=btn.dataset.aiCommand;
   const viewId=global.AIG_VIEW_ID_FOR_BUTTON(buttonId);
   btn.dataset.buttonId=buttonId;btn.dataset.viewId=viewId;
   btn.addEventListener('click',()=>{
    const res=router.dispatchView(viewId,argumentsForCommand());
    if(runtime.plan&&res.type==='ACCEPTED')paintPlan(root,runtime.plan,buttonId,res);
    else{const status=root.querySelector('[data-ai-status]');if(status)status.textContent=res.code+' · '+res.detail;}
   });
  });
  root._aigAiRuntime=runtime;root._aigAiRouter=router;
  refresh();
 });
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}
global.AIG_ALLOWED_AI_AXES=AXES;
global.WebAiPageRuntime=WebAiPageRuntime;
global.aigWebMachiningPlan=planFrom;
global.aigAiSnapshot=snapshotFromStorage;
global.aigAiInspectNc=inspectNc;
})(typeof window!=='undefined'?window:globalThis);
