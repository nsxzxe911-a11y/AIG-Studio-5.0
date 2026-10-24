/**
 * Real indexed 3D pose scene playback / pacing / pressure Gate.
 * Frames are ACTUAL ORIGINAL SOURCE XYZ poses made by the existing FK path;
 * no fake video frames, guessed anatomy, implied heat sensors or FPS claims.
 */
import {applyAIGReal3DSourceMeshDelta} from './aig-real3d-gpu-delta-source.mjs';
export const AIG_REAL3D_ADAPTIVE_PLAYBACK_SCHEMA='AIG_REAL3D_SOURCE_POSE_ADAPTIVE_RAF_BUDGET_V1';
const TIERS=[30,60,90,120];
const fail=x=>{throw Error('REAL3D_PLAYBACK_'+x);};
const median=v=>{
 if(!v.length)return null;
 const a=[...v].sort((x,y)=>x-y),i=Math.floor(a.length/2);
 return a.length%2?a[i]:(a[i-1]+a[i])/2;
};
const round=x=>x===null?null:Math.round(x*1000)/1000;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function createAIGReal3DFrameGovernor({
 mode='AUTO',initialHz=60,nowMs=0
}={}){
 if(!['AUTO',...TIERS].includes(mode)||!TIERS.includes(initialHz)||
  !finite(nowMs))fail('INVALID_TARGET_HZ');
 let tier=mode==='AUTO'?initialHz:mode,previousDraw=nowMs-1000/tier,
  slow=0,healthy=0,criticalHeap=false,pressureEvents=0,
  downshifts=0,upshifts=0,skipped=0,rendered=0,hiddenSkips=0,
  heapBytesLast=null,heapLimitBytesLast=null,lastReason='NEW';
 function choose(now,{
  visibility='visible',heapUsedBytes=null,heapLimitBytes=null
 }={}){
  if(!finite(now)||!['visible','hidden'].includes(visibility)||
   (heapUsedBytes!==null&&(!finite(heapUsedBytes)||heapUsedBytes<0))||
   (heapLimitBytes!==null&&(!finite(heapLimitBytes)||heapLimitBytes<=0)))
   fail('INVALID_FRAME_OBSERVATION');
  const ratio=heapUsedBytes!==null&&heapLimitBytes!==null?
   heapUsedBytes/heapLimitBytes:null;
  heapBytesLast=heapUsedBytes;heapLimitBytesLast=heapLimitBytes;
  if(ratio!==null&&ratio>=.93){criticalHeap=true;pressureEvents++;}
  else if(criticalHeap&&ratio!==null&&ratio<.76)criticalHeap=false;
  if(visibility==='hidden'){
   hiddenSkips++;skipped++;lastReason='DOCUMENT_HIDDEN';
   return {draw:false,reason:lastReason,targetHz:tier};
  }
  if(criticalHeap){
   skipped++;lastReason='CRITICAL_HEAP_PAUSE';
   return {draw:false,reason:lastReason,targetHz:tier};
  }
  if(ratio!==null&&ratio>=.85&&tier>30){
   tier=TIERS[TIERS.indexOf(tier)-1];pressureEvents++;downshifts++;
   healthy=0;slow=0;
  }
  const minGap=1000/tier;
  if(now-previousDraw<minGap-1.5){
   skipped++;lastReason='TARGET_FRAME_PACING';
   return {draw:false,reason:lastReason,targetHz:tier};
  }
  previousDraw=now;rendered++;lastReason='RENDER_TRUE_GPU_SOURCE';
  return {draw:true,reason:lastReason,targetHz:tier};
 }
 function observe({renderWallMs}={}){
  if(!finite(renderWallMs)||renderWallMs<0)
   fail('INVALID_REAL_FRAME_DURATION');
  if(renderWallMs>1000/tier*.9){slow++;healthy=0;}
  else {healthy++;slow=0;}
  if(slow>=3&&tier>30){
   tier=TIERS[TIERS.indexOf(tier)-1];downshifts++;slow=0;healthy=0;
  }else if(mode==='AUTO'&&healthy>=24&&tier<120){
   tier=TIERS[TIERS.indexOf(tier)+1];upshifts++;healthy=0;
  }
  return {targetHz:tier,slowFrameStreak:slow};
 }
 return {
  choose,observe,snapshot:()=>({
   requestedMode:mode,targetHz:tier,
   renderedFrames:rendered,pacedOrPressureSkipped:skipped,
   hiddenRafCallbacksSkipped:hiddenSkips,
   downshifts,upshifts,heapPressureEvents:pressureEvents,
   criticalHeapPaused:criticalHeap,
   lastMemoryUsedBytes:heapBytesLast,lastMemoryLimitBytes:heapLimitBytesLast,
   actualDeviceTemperatureCelsius:null,
   thermalSensorAccessible:false,
   thermalProtectionCertified:false,
   continuousNativeAnimationFPSCertified:false,
   sourceAnatomyHumanPASS:false
  })
 };
}
/** Uses rAF clock and the GPU draw of a REAL source-indexed geometry scene.
 * No gl.finish in steady-state pacing, no fake 60Hz timeout, no 60FPS pass.
 */
export async function benchmarkAIGReal3DNativePosePlayback({
 renderer,poseScenes,mode='AUTO',rafCallbacks=60,
 requestFrame=typeof requestAnimationFrame==='function'?requestAnimationFrame:null,
 now=()=>performance.now(),readMemory=()=>({
  used:typeof performance.memory?.usedJSHeapSize==='number'?
   performance.memory.usedJSHeapSize:null,
  limit:typeof performance.memory?.jsHeapSizeLimit==='number'?
   performance.memory.jsHeapSizeLimit:null
 }),readVisibility=()=>typeof document==='undefined'?'visible':document.visibilityState
}={}){
 if(!renderer||typeof renderer.render!=='function'||
  typeof renderer.updateMeshVertices!=='function'||
  !Array.isArray(poseScenes)||poseScenes.length<2||
  poseScenes.some(s=>s?.schema!=='AIG_REAL3D_SCENE_V1')||
  !TIERS.concat('AUTO').includes(mode)||!Number.isInteger(rafCallbacks)||
  rafCallbacks<12||rafCallbacks>180||typeof requestFrame!=='function')
  fail('ACTUAL_GPU_POSE_SCENES_AND_RAF_REQUIRED');
 const governor=createAIGReal3DFrameGovernor({mode});
 const first=poseScenes[0],drawWall=[],deltaUpdates=[],rafIntervals=[];
 let rafFirst=null,rafPrior=null,nextIndex=0,visibleDraws=0,initialRendered=false;
 let heapStart=null,heapEnd=null;
 for(let i=0;i<rafCallbacks;i++){
  const timestamp=await new Promise(resolve=>requestFrame(resolve));
  if(!finite(timestamp))fail('RAF_TIMESTAMP_INVALID');
  if(rafFirst===null)rafFirst=timestamp;
  if(rafPrior!==null&&timestamp>rafPrior)rafIntervals.push(timestamp-rafPrior);
  rafPrior=timestamp;
  const memory=readMemory()??{},visible=readVisibility();
  if(i===0)heapStart=memory.used??null;
  heapEnd=memory.used??null;
  const choice=governor.choose(timestamp,{
   visibility:visible==='hidden'?'hidden':'visible',
   heapUsedBytes:memory.used??null,heapLimitBytes:memory.limit??null
  });
  if(!choice.draw)continue;
  const start=now();
  const target=poseScenes[nextIndex%poseScenes.length];
  let update=null;
  if(initialRendered){
   update=applyAIGReal3DSourceMeshDelta({
    renderer,liveScene:first,nextScene:target
   });
   if(!update.originalSourceTopologyPreserved||
    !update.reusedOriginalIndexGPUBuffers)fail('INDEX_BUFFER_REUSE_FAILED');
   deltaUpdates.push(update);
  }else{
   // First draw allocates one genuine source-indexed GPU scene.
   initialRendered=true;
  }
  const result=renderer.render(first);
  if(result?.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||
   !(result.triangles>=2000))
   fail('SOURCE_OR_GPU_RENDER_INSUFFICIENT');
  const ms=now()-start;
  if(!finite(ms)||ms<0)fail('FRAME_DURATION_INVALID');
  drawWall.push(ms);
  governor.observe({renderWallMs:ms});
  visibleDraws++;nextIndex++;
 }
 const elapsed=rafFirst!==null&&rafPrior>rafFirst?rafPrior-rafFirst:null;
 const summary=governor.snapshot();
 return {
  schema:AIG_REAL3D_ADAPTIVE_PLAYBACK_SCHEMA,
  ...summary,requestedRafCallbacks:rafCallbacks,
  observedRafIntervals:rafIntervals.length,
  observedRafMedianMs:round(median(rafIntervals)),
  actualSourceIndexedDraws:visibleDraws,
  sourcePoseSceneCount:poseScenes.length,
  gpuBufferSubDataCalls:deltaUpdates.reduce((n,x)=>n+x.gpuBufferSubDataCalls,0),
  gpuOriginalIndexReusedForEveryDelta:deltaUpdates.every(x=>x.reusedOriginalIndexGPUBuffers),
  measuredRenderSubmissionMedianMs:round(median(drawWall)),
  measuredRafWindowMs:round(elapsed),
  observedDrawsPerSecondInMeasuredRafWindow:elapsed>0?
   round(visibleDraws/(elapsed/1000)):null,
  observedBrowserHeapBytesBegin:heapStart,
  observedBrowserHeapBytesEnd:heapEnd,
  observedMemoryDataIsBrowserDependent:true,
  rafTimingAndSubmissionNotGPUFinishTime:true,
  noRealHardwareThermalTemperatureReading:true,
  fullAnimation60_90_120FPSGatePASS:false,
  sourceOriginalOBJUnmodified:true,
  genuineGPUIndexBufferNeverReallocated:true,
  releasePASS:false
 };
}
