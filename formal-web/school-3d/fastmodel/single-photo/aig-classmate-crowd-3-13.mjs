/**
 * Real3D 3.13 — independently addressable classmate source roster
 * and honest, measured crowd-capacity evidence. One WebGL renderer.
 * A shared test mesh may benchmark draw/GPU cost but never counts as
 * different, source-verified classmates, true independent rigging or
 * 19,200 concurrent hardware cores.
 */
export const AIG313_SCHEMA='AIG_REAL3D_3_13_SOURCED_CLASSMATES_AND_CROWD_BENCH';
export const AIG313_COUNTS=Object.freeze([1,2,4,8,12,16,24,32,48,64]);
export const AIG313_MAX_ROSTER=64;
const fail=s=>{throw Error('AIG313_'+s)};
const sha=s=>typeof s==='string'&&/^sha256:[a-f0-9]{64}$/.test(s);
const id=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{2,80}$/.test(s);
const validName=s=>typeof s==='string'&&s.trim().length>=1&&s.trim().length<=60;
export function createAIG313ClassmateRoster(){
 const entries=new Map();
 return Object.freeze({
  register({characterId,displayName,assetId=null,sourceSha256=null,
   hairAssetId=null,outfitAssetId=null,hasVerifiedRig=false,
   animationClipCount=0,appearanceReviewed=false}={}){
   if(!id(characterId)||!validName(displayName)||
    assetId!==null&&!id(assetId)||
    (assetId===null?sourceSha256!==null:!sha(sourceSha256))||
    hairAssetId!==null&&!id(hairAssetId)||
    outfitAssetId!==null&&!id(outfitAssetId)||
    typeof hasVerifiedRig!=='boolean'||
    !Number.isInteger(animationClipCount)||animationClipCount<0||
    animationClipCount>256||typeof appearanceReviewed!=='boolean')
    fail('PERSONA_CONTRACT_INVALID');
   if(entries.has(characterId))fail('CHARACTER_ID_ALREADY_PRESENT');
   if(entries.size>=AIG313_MAX_ROSTER)fail('ROSTER_LIMIT_REACHED');
   if(assetId===null&&(hasVerifiedRig||animationClipCount||appearanceReviewed))
    fail('NO_ASSET_CANNOT_PASS_RIG_ANIMATION_APPEARANCE');
   const record=Object.freeze({characterId,displayName:displayName.trim(),
    assetId,sourceSha256,hairAssetId,outfitAssetId,
    hasVerifiedRig,animationClipCount,appearanceReviewed,
    assetStatus:assetId?'SOURCE_REFERENCE_REGISTERED':'PENDING_3D_SOURCE',
    activelyRendered:false,characterIdentityIndependentlyVerified:false});
   entries.set(characterId,record);return record;
  },
  all:()=>Object.freeze([...entries.values()]),
  get:id=>entries.get(id)??null,
  count:()=>entries.size,
  snapshot:()=>Object.freeze({schema:AIG313_SCHEMA,
   rosterCount:entries.size,
   sourcedCount:[...entries.values()].filter(e=>!!e.assetId).length,
   pendingCount:[...entries.values()].filter(e=>!e.assetId).length,
   verifiedIndependent3DPeopleRendered:0,
   allAssetsNeedRuntimeSHAReverification:true})
 });
}
export function planAIG313CrowdWork({
 visiblePeople=4,independentActiveRigs=0,trianglesPerSource=28120,
 availableMemoryMiB=256,isMobile=false,
 maxAnimatedUpdatesPerFrame=null
}={}){
 if(!Number.isInteger(visiblePeople)||visiblePeople<1||
  visiblePeople>AIG313_MAX_ROSTER||
  !Number.isInteger(independentActiveRigs)||independentActiveRigs<0||
  independentActiveRigs>visiblePeople||
  !Number.isInteger(trianglesPerSource)||trianglesPerSource<1||
  trianglesPerSource>2e6||
  !Number.isFinite(availableMemoryMiB)||
  availableMemoryMiB<16||availableMemoryMiB>131072)
  fail('VALID_CROWD_WORK_REQUIREMENTS');
 const maxUpdates=maxAnimatedUpdatesPerFrame??(isMobile?3:8);
 if(!Number.isInteger(maxUpdates)||maxUpdates<1||maxUpdates>32)
  fail('INVALID_ANIMATED_UPDATE_BUDGET');
 const activeUpdates=Math.min(independentActiveRigs,maxUpdates);
 const deferredUpdates=Math.max(0,independentActiveRigs-activeUpdates);
 const submittedTrianglesWithoutLOD=visiblePeople*trianglesPerSource;
 // This is a GEOMETRY workload estimate, not a hardware FPS prediction.
 const sourceVertexBudgetedFrames=Math.min(19200,
  trianglesPerSource*3);
 const lod={
  near:Math.min(visiblePeople,isMobile?2:4),
  middle:Math.min(Math.max(0,visiblePeople-(isMobile?2:4)),isMobile?6:12),
 };
 lod.far=Math.max(0,visiblePeople-lod.near-lod.middle);
 const memoryUnknown=true;
 return Object.freeze({
  schema:AIG313_SCHEMA,visiblePeople,independentActiveRigs,
  submittedTrianglesWithoutLOD,
  recommendedPoseUpdatesThisFrame:activeUpdates,
  deferredPoseUpdates:deferredUpdates,
  suggestedLODCounts:Object.freeze(lod),
  logicalWorkSlotPoolSharedAcrossCharacters:19200,
  actualPhysicalCoreCountNotInferred:true,
  estimatedGpuMemoryMiB:null,memoryUnknown,
  availableMemoryMiB,
  staticInstancingCannotIndependentlyRigCharacters:true,
  fpsAndVisualIdentityMustBeMeasured:true,
  oneRendererOnly:true
 });
}
function quantile(values,p){
 if(!values.length)return null;
 const v=[...values].sort((a,b)=>a-b),n=(v.length-1)*p,
  lo=Math.floor(n),hi=Math.ceil(n);
 return v[lo]+(v[hi]-v[lo])*(n-lo);
}
export function evaluateAIG313FrameSamples({
 timestampsMs=[],submitMs=[],drawCalls=[],
 visiblePeople,geometryTriangles,environment='HEADLESS_SOFTWARE_WEBGL',
 targetFps=30
}={}){
 if(!Number.isInteger(visiblePeople)||visiblePeople<1||
  visiblePeople>AIG313_MAX_ROSTER||
  !Number.isInteger(geometryTriangles)||geometryTriangles<1||
  !Number.isFinite(targetFps)||targetFps<15||targetFps>120||
  !Array.isArray(timestampsMs)||timestampsMs.length<24||
  !Array.isArray(submitMs)||submitMs.length!==timestampsMs.length||
  !Array.isArray(drawCalls)||drawCalls.length!==timestampsMs.length||
  !timestampsMs.every(Number.isFinite)||
  !submitMs.every(v=>Number.isFinite(v)&&v>=0)||
  !drawCalls.every(v=>Number.isInteger(v)&&v>=0)||
  timestampsMs.some((v,i)=>i>0&&v<=timestampsMs[i-1]))
  fail('MEASURED_FRAME_SERIES_REQUIRED');
 const intervals=timestampsMs.slice(1).map((v,i)=>v-timestampsMs[i]);
 const p95=quantile(intervals,.95),median=quantile(intervals,.5);
 const fps=1000/median,meetsFrameP95=p95<=1000/targetFps;
 return Object.freeze({
  schema:AIG313_SCHEMA,visiblePeople,geometryTriangles,
  actualSamples:intervals.length,medianFrameIntervalMs:median,
  p95FrameIntervalMs:p95,medianObservedFps:fps,
  medianCpuSubmitMs:quantile(submitMs,.5),
  p95CpuSubmitMs:quantile(submitMs,.95),
  medianDrawCalls:quantile(drawCalls,.5),
  targetFps,p95SampleMeetsTarget:meetsFrameP95,
  measuredInEnvironment:environment,
  runningOnUserActualPhoneOrPc:false,
  softwareWebGLCannotProveHardwarePerformance:environment.includes('SOFTWARE'),
  actualGpuTimeMeasured:false,
  fullCharacterRigMotionIncluded:false,
  classmateIndependentAssetsIncluded:false,
  supportedIndependentAnimatedCharacterCountCertified:null,
  originalSourceSceneUntouched:true
 });
}
export function summariseAIG313CrowdEvidence(rows,{targetFps=30}={}){
 if(!Array.isArray(rows)||!rows.every(r=>r?.schema===AIG313_SCHEMA&&
  Number.isInteger(r.visiblePeople)||false))
  fail('REAL_BENCHMARK_ROWS_REQUIRED');
 const eligible=rows.filter(r=>r.targetFps===targetFps&&
  r.p95SampleMeetsTarget===true);
 return Object.freeze({
  schema:AIG313_SCHEMA,
  testedCounts:rows.map(r=>r.visiblePeople),
  maxTechnicalTestClonesAtTarget:eligible.length?
   Math.max(...eligible.map(r=>r.visiblePeople)):0,
  highestActualTestCount:rows.length?
   Math.max(...rows.map(r=>r.visiblePeople)):0,
  actualIndependentClassmateCapacityCertified:false,
  fullSkinnedAndClothSimulationNotBenchmarkCovered:true,
  sceneAndGPUHardwareSpecific:true,
  cannotTranslateSoftwareResultToUserDevice:true
 });
}
