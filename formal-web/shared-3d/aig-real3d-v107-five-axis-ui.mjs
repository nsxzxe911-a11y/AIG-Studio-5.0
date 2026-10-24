/** Third-project only V107 source-mesh 5AX GPU control. */
import {createAIGReal3DV107IncrementalStage}
 from './aig-real3d-v107-five-axis-foot-head.mjs';
const $=id=>document.getElementById(id);
let source=null,scene=null,stage=null,playing=false,lastDraw=0,frameId=null;
const keys=['v107-x','v107-y','v107-z','v107-a','v107-b',
 'v107-progress','v107-start','v107-step','v107-pause',
 'v107-resume','v107-full'];
function setReady(ready){for(const id of keys)$(id).disabled=!ready;}
function message(s){$('v107-stage-status').textContent=s;}
function report(s){$('v107-stage-report').textContent=JSON.stringify(s,null,2);}
const position=()=>[
 Number($('v107-x').value),Number($('v107-y').value),Number($('v107-z').value)];
const axes=()=>({
 topXYZCNCmm:position(),
 aTiltDeg:Number($('v107-a').value),
 bTurnDeg:Number($('v107-b').value)
});
function reflect(){
 $('v107-a-val').textContent=$('v107-a').value+'°';
 $('v107-b-val').textContent=$('v107-b').value+'°';
 $('v107-progress-val').textContent=$('v107-progress').value+'%';
}
function applyPlan(plan){
 if(!scene||!source||!stage)throw Error('V107_SOURCE_NOT_READY');
 const detail={scene,sourceGLBSha256:source.actualSourceModelSha256,
  pose:plan,sourceOriginalSceneRevision:scene.revision};
 document.dispatchEvent(new CustomEvent('aig-real3d-v107-pose-request',{detail}));
 // GPU bridge emits a synchronous PASS/BLOCK result; never claim GPU passed
 // from only dispatching a DOM event.
 const latest=$('v107-stage-report').textContent;
 if(latest.startsWith('BLOCK'))throw Error(latest);
 const frameStatus=JSON.parse(latest);
 if(frameStatus.actualWebGLFrameStatus!=='WEBGL_XYZ_TRIANGLES_RENDERED')
  throw Error('V107_GPU_STAGE_NO_DRAW_EVIDENCE');
 message('第三專案五軸 GPU：A '+plan.aTiltDeg+'°、B '+plan.bTurnDeg+
  '°，由腳到頭 '+Math.round(plan.progress*100)+'% 已顯示。');
}
function stopPlayer(){
 playing=false;
 if(frameId!==null){cancelAnimationFrame(frameId);frameId=null;}
}
function onControl(){
 if(!stage||!scene)return;
 stopPlayer();reflect();
 try{applyPlan(stage.jump(Number($('v107-progress').value)/100,axes()));}
 catch(e){message('BLOCK：'+String(e?.message??e));}
}
function drawStep(){
 if(!stage||!scene)return;
 try{
  const next=stage.step(axes());
  if(next.status==='BLOCK_CANCELLED_MUST_RESUME')throw Error(next.status);
  $('v107-progress').value=String(Math.round(next.progress*100));
  reflect();applyPlan(next);
  if(next.step>=stage.steps){stopPlayer();message('已到頭頂；僅原始 GLB 模型逐層顯示，未憑空增生 3D。');}
 }catch(e){stopPlayer();message('BLOCK：'+String(e?.message??e));}
}
function animate(now){
 if(!playing)return;
 if(now-lastDraw>=90){lastDraw=now;drawStep();}
 if(playing)frameId=requestAnimationFrame(animate);
}
document.addEventListener('aig-real3d-v104-source-ready',event=>{
 const d=event.detail;
 if(!d?.imported?.actualSourceModelSha256||
  d.scene?.schema!=='AIG_REAL3D_SCENE_V1')return;
 stopPlayer();
 source=d.imported;scene=d.scene;
 try{
  stage=createAIGReal3DV107IncrementalStage({
   scene,sourceGLBSha256:source.actualSourceModelSha256,steps:100});
  // Existing V99 render stays full until the user explicitly activates 5AX.
  setReady(true);
  for(const id of ['v107-x','v107-y','v107-z','v107-a','v107-b'])
   $(id).value='0';
  $('v107-progress').value='100';reflect();
  message('已鎖定唯一 GLB SHA，V107 可從腳往頭分層顯示。此功能不控制實體 CNC。');
  report({schema:stage.schema,
   sourceGLBSha256:source.actualSourceModelSha256,
   originalTriangleCount:stage.sourceAudit.trueIndexedSourceTriangles,
   heightYWorld:stage.sourceAudit.worldBounds,
   independentObservationXYZ:true,bottomAParentOfB:true,
   originalSourceMeshesUnchanged:true,
   physical5AXCNCAndMissingAnatomyNotCertified:true,
   status:'READY_NOT_YET_RENDERED',releasePASS:false});
 }catch(e){stage=null;setReady(false);message('BLOCK：'+String(e?.message??e));}
});
document.addEventListener('aig-real3d-v107-pose-result',event=>{
 const outcome=event.detail;
 if(!outcome?.ready){report('BLOCK：'+String(outcome?.error??'V107_SOURCE_GPU_BLOCK'));return;}
 report({schema:outcome.schema,
  sourceGLBSha256:outcome.sourceGLBSha256,
  actualWebGLFrameStatus:outcome.status,
  actualGPUV107OriginalYClip:outcome.clipEnabled,
  modelStageABLocalAxis:outcome.localBAxis,
  originalTrueTriangles:outcome.triangles,
  footHeadProgress:outcome.progress,
  topXYZCNCmm:outcome.topXYZCNCmm,
  aTiltDeg:outcome.aTiltDeg,bTurnDeg:outcome.bTurnDeg,
  trueOneGLBSource:true,noRemeshing:true,
  independentlyObservedBackOrFaceLikenessCertified:false,
  CNC5AxisPhysicalCollisionAndFeedNotValidated:true,
  releasePASS:false});
});
for(const id of ['v107-x','v107-y','v107-z','v107-a','v107-b','v107-progress'])
 $(id).addEventListener('input',onControl);
$('v107-full').addEventListener('click',()=>{
 stopPlayer();
 for(const id of ['v107-x','v107-y','v107-z','v107-a','v107-b'])
  $(id).value='0';
 $('v107-progress').value='100';reflect();
 try{applyPlan(stage.jump(1,axes()));}
 catch(e){message('BLOCK：'+String(e?.message??e));}
});
$('v107-start').addEventListener('click',()=>{
 if(!stage)return;stopPlayer();
 stage.reset();$('v107-progress').value='0';reflect();
 try{applyPlan(stage.jump(0,axes()));}
 catch(e){message('BLOCK：'+String(e?.message??e));return;}
 playing=true;lastDraw=performance.now();frameId=requestAnimationFrame(animate);
});
$('v107-step').addEventListener('click',()=>{stopPlayer();drawStep();});
$('v107-pause').addEventListener('click',()=>{
 if(!stage)return;stopPlayer();stage.cancel();
 message('逐層繪圖已暫停於第 '+stage.current()+' 層；不清除原模型或 GPU。');
});
$('v107-resume').addEventListener('click',()=>{
 if(!stage)return;
 try{
  stage.resume();playing=true;lastDraw=performance.now();
  frameId=requestAnimationFrame(animate);
 }catch(e){message('BLOCK：'+String(e?.message??e));}
});
setReady(false);
