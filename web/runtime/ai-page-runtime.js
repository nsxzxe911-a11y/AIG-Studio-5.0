(function(global){
'use strict';

const AIG_ALLOWED_AXES=Object.freeze(['3AX']);
const ROUTE_COST={REUSE_VERIFIED_STAGE:8,NC_FIRST:30,MANUAL_CAM_FIRST:42,CAD_FIRST:60};
function result(type,commandId,revision,evidence={},code='',detail=''){
  return {type,pageId:'AI',commandId,revision,evidence,code,detail};
}
function asBool(v,d=false){ if(v===undefined||v===null||v==='')return d; return v===true||String(v).toLowerCase()==='true'; }
function evidence(args,prefix,page,targetAxis){
  if(args[prefix+'Verified']===undefined)return null;
  return {
    pageId:page,
    revision:Number(args[prefix+'Revision']||0),
    digest:String(args[prefix+'Digest']||''),
    verified:asBool(args[prefix+'Verified']),
    axisMode:String(args[prefix+'Axis']||targetAxis),
    preflightReady:page==='SIM'?asBool(args[prefix+'PreflightReady']):false,
    fixtureCoverageKnown:page==='SIM'?asBool(args[prefix+'FixtureCoverageKnown']):false
  };
}
function safeSimReuse(sim){return !!sim&&sim.verified===true&&sim.preflightReady===true&&sim.fixtureCoverageKnown===true;}
function stagesFor(kind,axis){
  if(kind==='REUSE_VERIFIED_STAGE')return [
    ['NC','NC.OUTPUT','NC_OUTPUT_PREPARE'],['NC','NC.OUTPUT','NC_MACHINE']
  ];
  if(kind==='NC_FIRST')return [
    ['NC','NC.EDITOR','NC_EDIT'],['NC','NC.PARSER','NC_PARSE'],[axis,axis+'.NC_FIRST','AXIS_NC_FIRST_PREVIEW'],
    ['SIM','SIM.MATERIAL','SIM_MATERIAL_REMOVAL'],['SIM','SIM.COLLISION','SIM_COLLISION_CHECK'],['SIM','SIM.RESULT','SIM_ACCEPT'],
    ['NC','NC.VERIFY','NC_VERIFY'],['NC','NC.OUTPUT','NC_OUTPUT_PREPARE'],['NC','NC.OUTPUT','NC_MACHINE']
  ];
  if(kind==='MANUAL_CAM_FIRST')return [
    ['CAM','CAM.MANUAL','CAM_MANUAL_EDIT'],['CAM','CAM.POST_PREVIEW','CAM_POST_PREVIEW'],
    ['SIM','SIM.MATERIAL','SIM_MATERIAL_REMOVAL'],['SIM','SIM.COLLISION','SIM_COLLISION_CHECK'],['SIM','SIM.RESULT','SIM_ACCEPT'],
    ['NC','NC.PARSER','NC_PARSE'],['NC','NC.VERIFY','NC_VERIFY'],['NC','NC.OUTPUT','NC_OUTPUT_PREPARE'],['NC','NC.OUTPUT','NC_MACHINE']
  ];
  return [
    ['CAD','CAD.MAIN','CAD_GEOMETRY_READY'],['CAM','CAM.AUTO','CAM_AUTO_GENERATE'],
    ['SIM','SIM.MATERIAL','SIM_MATERIAL_REMOVAL'],['SIM','SIM.COLLISION','SIM_COLLISION_CHECK'],['SIM','SIM.RESULT','SIM_ACCEPT'],
    ['NC','NC.PARSER','NC_PARSE'],['NC','NC.VERIFY','NC_VERIFY'],['NC','NC.OUTPUT','NC_OUTPUT_PREPARE'],['NC','NC.OUTPUT','NC_MACHINE']
  ];
}
function safe(kind,stages,reused){
  if(kind==='REUSE_VERIFIED_STAGE'){
    const sim=reused.find(x=>x.pageId==='SIM');
    return safeSimReuse(sim)&&reused.some(x=>x.pageId==='NC'&&x.verified)&&stages.at(-1)?.[2]==='NC_MACHINE';
  }
  const sim=stages.findIndex(x=>x[1]==='SIM.RESULT'),verify=stages.findIndex(x=>x[1]==='NC.VERIFY'),machine=stages.findLastIndex(x=>x[2]==='NC_MACHINE');
  return sim>=0&&verify>sim&&machine>verify;
}
function planFrom(args){
  const axis=String(args.targetAxis||'3AX').toUpperCase();
  if(!AIG_ALLOWED_AXES.includes(axis))throw new Error('AIG product supports 3AX only; multi-axis belongs to AIG-II');
  const objective=String(args.objective||'FASTEST_SAFE').toUpperCase();
  const sim=evidence(args,'sim','SIM',axis),nc=evidence(args,'nc','NC',axis);
  const candidates=[];
  function add(kind,eligible,blockers,reused=[]){const stages=stagesFor(kind,axis);const safeOk=safe(kind,stages,reused);const all=[...blockers,...(safeOk?[]:['SIM_NC_SAFETY_SEQUENCE_REQUIRED'])];candidates.push({routeKind:kind,eligible:eligible&&safeOk,estimatedCost:ROUTE_COST[kind],blockers:[...new Set(all)],stages,reusedEvidence:reused});}
  const reuseBlock=[];
  if(!sim?.verified)reuseBlock.push('SIM_VERIFIED_EVIDENCE_REQUIRED');
  else{
    if(!sim.preflightReady)reuseBlock.push('SIM_PREFLIGHT_READY_REQUIRED');
    if(!sim.fixtureCoverageKnown)reuseBlock.push('SIM_FIXTURE_COVERAGE_REQUIRED');
  }
  if(!nc?.verified)reuseBlock.push('NC_VERIFIED_EVIDENCE_REQUIRED');
  if(sim&&sim.axisMode!==axis)reuseBlock.push('SIM_AXIS_MISMATCH');
  if(nc&&nc.axisMode!==axis)reuseBlock.push('NC_AXIS_MISMATCH');
  add('REUSE_VERIFIED_STAGE',reuseBlock.length===0,reuseBlock,[sim,nc].filter(Boolean));
  add('NC_FIRST',asBool(args.hasNcProgram),asBool(args.hasNcProgram)?[]:['NC_PROGRAM_REQUIRED']);
  const hasManual=asBool(args.hasManualCamArtifact)||asBool(args.hasCamToolpath);
  add('MANUAL_CAM_FIRST',hasManual,hasManual?[]:['MANUAL_CAM_ARTIFACT_REQUIRED']);
  add('CAD_FIRST',asBool(args.hasCadGeometry),asBool(args.hasCadGeometry)?[]:['CAD_GEOMETRY_REQUIRED']);
  const eligible=candidates.filter(x=>x.eligible);if(!eligible.length)throw new Error('No safe machining route available');
  let selected;
  if(objective==='MIN_REWORK'){
    const rank={REUSE_VERIFIED_STAGE:0,NC_FIRST:1,MANUAL_CAM_FIRST:2,CAD_FIRST:3};selected=[...eligible].sort((a,b)=>rank[a.routeKind]-rank[b.routeKind]||a.estimatedCost-b.estimatedCost)[0];
  }else selected=[...eligible].sort((a,b)=>a.estimatedCost-b.estimatedCost)[0];
  return {...selected,objective,axis,planId:'WEB-PLAN-'+axis+'-'+objective+'-'+selected.routeKind,considered:candidates};
}

class WebAiPageRuntime{
  constructor(){this.revision=0;this.plan=null;this.input=null;this._messages=[];this.lastAuditSafe=false;}
  messages(){return [...this._messages];}
  dispatch(command){
    const before={revision:this.revision,plan:this.plan,input:this.input,lastAuditSafe:this.lastAuditSafe};
    try{
      if(command.page!=='AI')throw new Error('AI page accepts AI commands only');
      if(command.commandId==='AI.PLAN.BUILD'||command.commandId==='AI.PLAN.OPTIMIZE'||command.commandId==='AI.RECOVERY.REPLAN'){
        const merged={...(this.input||{}),...(command.arguments||{})};this.input=merged;this.plan=planFrom(merged);this.revision++;
        return result('ACCEPTED',command.commandId,this.revision,{planId:this.plan.planId,routeKind:this.plan.routeKind,objective:this.plan.objective,estimatedCost:String(this.plan.estimatedCost),stageCount:String(this.plan.stages.length),replanned:String(command.commandId==='AI.RECOVERY.REPLAN')});
      }
      if(command.commandId==='AI.ASSIST.EXPLAIN'){
        if(!this.plan)throw new Error('Build a machining plan before explanation');
        return result('ACCEPTED',command.commandId,this.revision,{routeKind:this.plan.routeKind,stageCount:String(this.plan.stages.length),explanation:`${this.plan.routeKind} • ${this.plan.objective} • cost=${this.plan.estimatedCost}`});
      }
      if(command.commandId==='AI.AUDIT.RUN'){
        if(!this.plan)throw new Error('Build a machining plan before audit');
        const ok=safe(this.plan.routeKind,this.plan.stages,this.plan.reusedEvidence||[]);if(!ok)throw new Error('Strict SIM preflight / NC safety sequence incomplete');this.lastAuditSafe=true;this.revision++;
        return result('ACCEPTED',command.commandId,this.revision,{safe:'true',endsAtMachine:String(this.plan.stages.at(-1)?.[2]==='NC_MACHINE'),simNcGate:'true'});
      }
      throw new Error('Unknown AI command '+command.commandId);
    }catch(err){this.revision=before.revision;this.plan=before.plan;this.input=before.input;this.lastAuditSafe=before.lastAuditSafe;const msg={pageId:'AI',code:'AI_COMMAND_REJECTED',detail:String(err?.message||err)};this._messages.push(msg);return result('REJECTED',command.commandId,this.revision,{},msg.code,msg.detail);}
  }
}

function init(){
  document.querySelectorAll('[data-ai-page-runtime]').forEach(root=>{
    const axisSelect=root.querySelector('[data-ai-axis]');
    if(axisSelect){
      Array.from(axisSelect.options||[]).forEach(option=>{if(!AIG_ALLOWED_AXES.includes(String(option.value).toUpperCase()))option.remove();});
      axisSelect.value='3AX';
    }
    const runtime=new WebAiPageRuntime();
    const out=root.querySelector('[data-ai-result]');
    const router=new global.AigPageRuntimeRouter({
      runtimeProvider:page=>page==='AI'?runtime:null,
      pageNavigator:page=>typeof global.show==='function'&&global.show(page),
      resultSink:r=>{if(out)out.textContent=r.type==='ACCEPTED'?`${r.evidence.routeKind||r.evidence.safe||'OK'} • r${r.revision}`:`${r.code} • ${r.detail}`;}
    });
    function args(){return {
      objective:root.querySelector('[data-ai-objective]')?.value||'FASTEST_SAFE',
      targetAxis:root.querySelector('[data-ai-axis]')?.value||'3AX',
      hasCadGeometry:String(!!root.querySelector('[data-ai-cad]')?.checked),
      hasManualCamArtifact:String(!!root.querySelector('[data-ai-manual]')?.checked),
      hasCamToolpath:String(!!root.querySelector('[data-ai-cam]')?.checked),
      hasNcProgram:String(!!root.querySelector('[data-ai-nc]')?.checked)
    };}
    root.querySelectorAll('[data-ai-command]').forEach(btn=>{
      const buttonId=btn.dataset.aiCommand,viewId=global.AIG_VIEW_ID_FOR_BUTTON(buttonId);
      btn.dataset.buttonId=buttonId;btn.dataset.viewId=viewId;
      btn.addEventListener('click',()=>router.dispatchView(viewId,args()));
    });
    root._aigAiRuntime=runtime;root._aigAiRouter=router;
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

global.AIG_ALLOWED_AI_AXES=AIG_ALLOWED_AXES;
global.WebAiPageRuntime=WebAiPageRuntime;
global.aigWebMachiningPlan=planFrom;
global.aigWebSafeSimReuse=safeSimReuse;
})(typeof window!=='undefined'?window:globalThis);
