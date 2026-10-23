/**
 * Real3D 3.6 — one shared reconstruction/render contract, 120 identical
 * LOGICAL compute slots. These are NOT physical CPU/GPU cores and do not
 * create 120 WebGL contexts. Bounded, cooperative vertex work keeps one
 * source photo / same renderer and yields between batches.
 *
 * Hardware ray tracing is intentionally NOT claimed by WebGL capability
 * detection. The user-facing ray request must fall back to supported PBR.
 */
import {aig26SRGBToLinear} from './aig-vision-metric-color-2-6.mjs';
export const AIG36_SCHEMA='AIG_REAL3D_3_6_ONE_KERNEL_120_LOGICAL_SLOTS';
export const AIG36_SLOT_LIMIT=120;
export const AIG36_STAGES=Object.freeze([
 'SOURCE_RGBA_SHA','SEGMENTATION_MASK','SDF_SURFACE','SOURCE_XY_FIT',
 'APPEARANCE_SCALE_COLOUR','PBR_SHADING','VISIBLE_CAMERA_FRAMING',
 'SOURCE_COMPARE','GPU_BUDGET','ARTICULATION_AFTER_APPEARANCE_GATE'
]);
const fail=s=>{throw Error('AIG36_'+s)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(n)=>typeof n==='number'&&Number.isFinite(n);
export function planAIG36UnifiedCore({
 requestedLogicalSlots=120,hardwareConcurrency=2,deviceMemoryGb=null,
 mobile=false,rayTracingRequested=false,gpuContextAvailable=true
}={}){
 if(!Number.isInteger(requestedLogicalSlots)||requestedLogicalSlots<1||
  requestedLogicalSlots>AIG36_SLOT_LIMIT)
  fail('LOGICAL_SLOT_RANGE_1_TO_120');
 const reported=finite(hardwareConcurrency)?Math.floor(hardwareConcurrency):2;
 // These bounded runners share ONE JavaScript event loop. Never count them
 // as parallel CPU workers or GPU units.
 const cpuHint=clamp(reported,1,32);
 const memoryLow=finite(deviceMemoryGb)&&deviceMemoryGb<=2;
 const schedulingLanes=Math.max(1,Math.min(mobile?2:4,
  Math.floor(cpuHint/2)||1,memoryLow?1:4));
 return Object.freeze({
  schema:AIG36_SCHEMA,kernelImplementationCount:1,
  logicalSlotCapacity:AIG36_SLOT_LIMIT,
  logicalSlotsConfigured:requestedLogicalSlots,
  schedulingLanes,realWebWorkersSpawned:0,
  parallelHardwareCoresCertified:0,
  execution:'ONE_JS_EVENT_LOOP_COOPERATIVE_SHARDS',
  browserReportedHardwareConcurrency:reported,
  sharedWebGLContextCount:gpuContextAvailable?1:0,
  lightingMode:rayTracingRequested?
   'REQUESTED_RAYTRACE_UNAVAILABLE_FALLBACK_PBR':'PBR',
  actualHardwareRayTracingEnabled:false,
  gpuContextAvailable:!!gpuContextAvailable,
  physicalMeasurementsCertified:false,
  stages:AIG36_STAGES
 });
}
export function selectAIG36Lighting(mode,plan){
 if(!['balanced','soft','quality','raytrace'].includes(mode))
  fail('UNKNOWN_LIGHTING_MODE');
 if(!plan?.gpuContextAvailable)
  return Object.freeze({requested:mode,active:'NO_GPU_CONTEXT',
   pbr:false,shadows:false,rayTracing:false});
 if(mode==='raytrace')
  return Object.freeze({requested:mode,active:'QUALITY_PBR_FALLBACK',
   pbr:true,shadows:true,rayTracing:false,
   reason:'NO_VERIFIED_NATIVE_RAY_TRACING_BACKEND'});
 return Object.freeze({requested:mode,
  active:mode==='quality'?'QUALITY_PBR':mode==='soft'?'SOFT_PBR':'BALANCED_PBR',
  pbr:true,shadows:mode==='quality',rayTracing:false});
}
/**
 * 120 numbered slots run THE SAME vertex shader-source projection kernel.
 * Work is real, measured vertex colour data, not 120 fictitious engines.
 * The cooperative queue bounds outstanding operations and yields to UI.
 */
export async function colourAIG36VertexShards({
 shell,source,bodyHeightUnits,colourGain=1,plan,
 yieldControl=()=>new Promise(resolve=>setTimeout(resolve,0)),
 signal=null
}={}){
 const positions=shell?.positions,ids=shell?.vertexSourceLabelIds;
 const {width:w,height:h,labels,pixels}=source||{};
 if(!(positions instanceof Float32Array)||positions.length%3||
  !(ids instanceof Uint8Array)||ids.length!==positions.length/3||
  !(labels instanceof Uint8Array)||labels.length!==w*h||
  !(pixels instanceof Uint8Array||pixels instanceof Uint8ClampedArray)||
  pixels.length!==w*h*4||!finite(bodyHeightUnits)||
  bodyHeightUnits<=0||!finite(colourGain)||colourGain<.7||colourGain>1.3||
  plan?.schema!==AIG36_SCHEMA||!plan.gpuContextAvailable)
  fail('SOURCE_MESH_DEVICE_AND_SHARED_CONTEXT_REQUIRED');
 const count=ids.length;
 if(count<1)fail('EMPTY_MESH');
 const slots=Math.min(count,plan.logicalSlotsConfigured);
 const colors=new Float32Array(positions.length);
 let nextSlot=0,completed=0;
 const worker=async()=>{
  while(nextSlot<slots){
   if(signal?.aborted)fail('CANCELLED_BEFORE_APPLY');
   const slot=nextSlot++,begin=Math.floor(slot*count/slots),
    end=Math.floor((slot+1)*count/slots);
   for(let i=begin;i<end;i++){
    const k=i*3,x=positions[k],y=positions[k+1],z=positions[k+2];
    const classId=ids[i];
    const sx=clamp(Math.round(x/bodyHeightUnits*h+(w-1)/2),0,w-1);
    const sy=clamp(Math.round(h-1-y/bodyHeightUnits*h),0,h-1);
    const index=sy*w+sx;
    const front=z>=0,observed=front&&labels[index]===classId&&
     pixels[index*4+3]>128;
    const raw=shell.sourceClassColorRGB?.[classId]??[.55,.52,.52];
    for(let c=0;c<3;c++){
     const v=observed?pixels[index*4+c]/255:raw[c];
     colors[k+c]=aig26SRGBToLinear(clamp(
      (front?v:v*.80)*colourGain,0,1));
    }
   }
   completed++;
   // Yield to allow input/rendering even on a single-threaded phone.
   if(completed%4===0)await yieldControl();
  }
 };
 await Promise.all(Array.from({length:Math.min(slots,
  plan.schedulingLanes)},()=>worker()));
 if(signal?.aborted)fail('CANCELLED_BEFORE_APPLY');
 return Object.freeze({
  colours:colors,actualVerticesColoured:count,
  completedIdenticalKernelSlots:completed,
  logicalSlotsConfigured:plan.logicalSlotsConfigured,
  trueParallelCPUWorkers:0,sourcePixelsAltered:false,
  rendererContextsCreated:0
 });
}
/** Convert bounding-box extents to a camera distance that fits both axes.
 * The frontend applies the result to the existing shared PerspectiveCamera.
 */
export function fitAIG36Camera({width,height,depth,verticalFovDeg,aspect,
 margin=1.35}={}){
 if(![width,height,depth,verticalFovDeg,aspect,margin].every(finite)||
  Math.min(width,height,depth,aspect)<=0||
  verticalFovDeg<=1||verticalFovDeg>=160||margin<1.05||margin>2.5)
  fail('INVALID_CAMERA_BOUNDS');
 const vfov=verticalFovDeg*Math.PI/180;
 const hfov=2*Math.atan(Math.tan(vfov/2)*aspect);
 const distance=Math.max(height/(2*Math.tan(vfov/2)),
  width/(2*Math.tan(hfov/2))) *margin+depth*1.2;
 return Object.freeze({distance,near:Math.max(.001,distance/250),
  far:Math.max(10,distance*20),sourceBoundsUsed:true,
  fullBodyVisibilityGuaranteeRequiresRenderedPixelEvidence:true});
}
