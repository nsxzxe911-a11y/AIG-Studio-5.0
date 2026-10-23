/**
 * AIG Real3D 2-in-1 Drawing/Rendering pipeline.
 *
 * "19200" = accounting partitions of the real work queue, NEVER physical
 * CPU/GPU cores, WebGL contexts, simultaneous threads or shader units.
 * Drawing is CPU cooperative work; Rendering is the EXISTING shared WebGL
 * context. They can overlap only if actual worker capability is implemented.
 * No sketch/photo/SDF generator is fabricated by this dispatch layer.
 */
export const AIG_REAL3D_DUAL_19200_SCHEMA='AIG_REAL3D_DRAW_RENDER_DUAL_PIPELINE_19200_V1';
export const AIG_REAL3D_LOGICAL_BUDGET=19200;
export const AIG_REAL3D_METHODS=Object.freeze([
 'sdf','metaball','template-morph','subdivision',
 'voxel-contour','sweep-loft'
]);
const fail=m=>{throw Error('AIG_REAL3D_DUAL_'+m)};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clamp=(v,l,h)=>Math.min(h,Math.max(l,v));
const liveWindow=typeof window!=='undefined';
const wasAborted=signal=>signal?.aborted===true;
const safeNow=()=>typeof performance!=='undefined'&&
 typeof performance.now==='function'?performance.now():Date.now();
export function inspectAIGReal3DSource(input={}){
 if(!input||typeof input!=='object')fail('SOURCE_OBJECT_REQUIRED');
 const candidates=[];
 if(input.photo?.pixels instanceof Uint8Array||
  input.photo?.pixels instanceof Uint8ClampedArray)
  candidates.push('photo-pixels');
 if(input.sketch?.strokes?.length>0)candidates.push('sketch-strokes');
 if(Array.isArray(input.scene?.nodes)&&input.scene.nodes.length)
  candidates.push('indexed-scene');
 if(Array.isArray(input.model?.parts)&&input.model.parts.length)
  candidates.push('human-parts');
 if(typeof input.nc==='string'&&/\bG0?1\b/.test(input.nc))
  candidates.push('nc-source');
 if(candidates.length!==1)fail('EXACTLY_ONE_SOURCE_FORMAT_REQUIRED');
 const type=candidates[0];
 let realWorkUnits=0,actualSourceVertexCount=0;
 if(type==='indexed-scene'){
  for(const node of input.scene.nodes){
   const mesh=node.mesh;
   if(mesh?.actualXYZTriangles!==true||
    !Array.isArray(mesh.positions)||!Array.isArray(mesh.indices)||
    mesh.positions.length%3||mesh.indices.length%3)
    fail('INDEXED_MESH_REQUIRED');
   realWorkUnits+=mesh.indices.length/3;
   actualSourceVertexCount+=mesh.positions.length/3;
  }
 }else if(type==='human-parts'){
  for(const part of input.model.parts){
   const x=part.geometry;
   if(!x||!(x.positions instanceof Float32Array)||
    !(x.indices instanceof Uint32Array))
    fail('REAL_HUMAN_SOURCE_REQUIRED');
   realWorkUnits+=x.indices.length/3;
   actualSourceVertexCount+=x.positions.length/3;
  }
 }else if(type==='photo-pixels')
  realWorkUnits=input.photo.width*input.photo.height;
 else if(type==='sketch-strokes')
  realWorkUnits=input.sketch.strokes.reduce((n,s)=>n+(s.points?.length||0),0);
 else realWorkUnits=(input.nc.match(/G0?[0123]/gi)||[]).length;
 if(!Number.isInteger(realWorkUnits)||realWorkUnits<1)
  fail('EMPTY_ACTUAL_SOURCE_DATA');
 return Object.freeze({
  sourceType:type,realWorkUnits,actualSourceVertexCount,
  hasRealObservedPixels:type==='photo-pixels',
  hasSourceBoundMillimeters:input.scene?.units==='MM'||
   input.model?.originCoordinates?.units==='mm',
  sourceNotAssumedPhotorealistic:true
 });
}
export function planAIGReal3DDual19200({
 sourceStats,capabilities={},method='auto',resolution='preview',
 mobile=false,hardwareConcurrency=2,deviceMemoryGB=null,
 recentFrameMs=null,contextAvailable=true,
 registeredAlgorithms=[]
}={}){
 if(!sourceStats||!Number.isInteger(sourceStats.realWorkUnits)||
  sourceStats.realWorkUnits<1||!Number.isInteger(hardwareConcurrency)||
  hardwareConcurrency<1||hardwareConcurrency>256||
  !['auto',...AIG_REAL3D_METHODS,'existing-mesh'].includes(method)||
  !['preview','1080p','2k','3k','4k'].includes(resolution)||
  !Array.isArray(registeredAlgorithms)||
  registeredAlgorithms.some(m=>!AIG_REAL3D_METHODS.includes(m)))
  fail('INVALID_SOURCE_HARDWARE_OR_METHOD');
 // Algorithms are never declared present just because the UI has a label.
 const existing=sourceStats.sourceType==='indexed-scene'||
  sourceStats.sourceType==='human-parts';
 const selected=method==='auto'?
  (existing?'existing-mesh':
   registeredAlgorithms.find(m=>m==='sdf')||
   registeredAlgorithms.find(m=>m==='template-morph')||
   registeredAlgorithms[0]||null):method;
 const installed=selected==='existing-mesh'?existing:
  registeredAlgorithms.includes(selected);
 const gpuUsable=capabilities.webgl!==false&&contextAvailable===true;
 const memoryPressure=finite(deviceMemoryGB)&&deviceMemoryGB<3;
 const framePressure=finite(recentFrameMs)&&recentFrameMs>28;
 const sourcePressure=Math.min(1,sourceStats.realWorkUnits/30000);
 const gpuPressure=Math.min(1,{
  preview:1,'1080p':2.0736,'2k':3.6864,'3k':5.76,'4k':8.2944
 }[resolution]/8.2944);
 // A dimensionless scheduler weighting: no invented milliseconds/FPS gains.
 const drawWeight=2+sourcePressure*5+(existing?0:2);
 const renderWeight=2+gpuPressure*4+(framePressure?2:0);
 let drawing=Math.round(AIG_REAL3D_LOGICAL_BUDGET*
  drawWeight/(drawWeight+renderWeight));
 drawing=clamp(drawing,3200,16000);
 if(memoryPressure||mobile)drawing=Math.min(drawing,11520);
 const rendering=AIG_REAL3D_LOGICAL_BUDGET-drawing;
 if(rendering<3200||drawing<3200)fail('BAD_RESERVED_BUDGET');
 const cpuLanes=clamp(Math.floor(hardwareConcurrency/2)||1,1,
  mobile||memoryPressure?2:4);
 const limitations=[];
 if(!installed)limitations.push('SELECTED_SURFACE_ALGORITHM_NOT_INSTALLED');
 if(!gpuUsable)limitations.push('REAL_WEBGL_RENDERER_REQUIRED');
 if(resolution==='4k'&&(memoryPressure||
  capabilities.maxRenderbufferSize<3840))
  limitations.push('NATIVE_4K_GPU_CAPABILITY_NOT_CONFIRMED');
 const fallback=limitations.length>0;
 const plan={
  schema:AIG_REAL3D_DUAL_19200_SCHEMA,
  requestedLogicalWorkSlots:AIG_REAL3D_LOGICAL_BUDGET,
  totalLogicalWorkSlots:drawing+rendering,
  drawingKernel:{
   id:'DRAW_CPU_GEOMETRY',
   reservedSlots:drawing,queueRange:[0,drawing],
   actualHardwareThreadsCreated:0,cooperativeCpuLanes:cpuLanes,
   actualSourceWorkUnits:sourceStats.realWorkUnits,
   workKind:sourceStats.sourceType,
   selectedMethod:selected,
   testedMethods:registeredAlgorithms.slice(),
   methodInstalled:installed
  },
  renderingKernel:{
   id:'RENDER_EXISTING_GPU',
   reservedSlots:rendering,
   queueRange:[drawing,AIG_REAL3D_LOGICAL_BUDGET],
   sharedWebGLContextCount:gpuUsable?1:0,
   extraWebGLContextsCreated:0,
   requestedResolution:resolution,
   sourceDisplayDoesNotCertifySilhouette:true
  },
  policy:{
   deviceClass:mobile?'mobile':'desktop',
   reportedCpuConcurrency:hardwareConcurrency,
   memoryPressure,framePressure,sourcePressure,gpuPressure,
   adaptiveAllocationBasedOnRealInputs:true,
   actualPhysicalNewCores:0,additionalGpuProcessors:0,
   hardwareFPSGainCertified:false,
   appearanceApproved:false,
   failClosed:limitations.length>0
  },
  limitationReasons:limitations,
  dispatchAllowed:!fallback
 };
 return Object.freeze(plan);
}
export async function executeAIGReal3DDual19200({
 source,renderer,method='auto',algorithmRegistry={},
 resolution='preview',mobile=false,hardwareConcurrency=2,
 deviceMemoryGB=null,recentFrameMs=null,signal=null,
 shouldAcceptGeometry=()=>true,
 yieldControl=()=>new Promise(resolve=>setTimeout(resolve,0))
}={}){
 const stats=inspectAIGReal3DSource(source);
 const registry=Object.keys(algorithmRegistry);
 const actualRenderer=renderer?.status==='READY'&&
  typeof renderer.render==='function'&&renderer.getCamera?.();
 const plan=planAIGReal3DDual19200({
  sourceStats:stats,method,resolution,mobile,
  hardwareConcurrency,deviceMemoryGB,recentFrameMs,
  registeredAlgorithms:registry,
  capabilities:{
   webgl:!!actualRenderer,
   maxRenderbufferSize:renderer?.getGpuLimit?.()??null
  },
  contextAvailable:!!actualRenderer
 });
 if(!plan.dispatchAllowed)fail(plan.limitationReasons.join('_'));
 if(wasAborted(signal))fail('CANCELLED_BEFORE_DRAWING');
 const start=safeNow(),metrics={drawingChunks:0,drawingVisitedTriangles:0,
  drawingActualVerticesChecked:0,renderPasses:0};
 let scene;
 if(plan.drawingKernel.selectedMethod==='existing-mesh'){
  if(stats.sourceType!=='indexed-scene')fail('RENDERABLE_SCENE_REQUIRED');
  scene=source.scene;
 }else{
  const build=algorithmRegistry[plan.drawingKernel.selectedMethod];
  if(typeof build!=='function')fail('SELECTED_ALGORITHM_NOT_EXECUTABLE');
  const built=await build({source,plan,signal,yieldControl});
  if(!built?.scene||!Array.isArray(built.scene.nodes))
   fail('ALGORITHM_NO_RENDERABLE_SCENE');
  scene=built.scene;
 }
 // The drawing kernel does REAL vertex/index validation, chunked by
 // allocation, yielding to input. 19,200 slots are accounting not loops.
 let inspected=0;
 const nodes=scene.nodes;
 for(const node of nodes){
  const pos=node.mesh?.positions,idx=node.mesh?.indices;
  if(!Array.isArray(pos)||!Array.isArray(idx)||pos.length%3||
   idx.length%3||!pos.length||!idx.length)
   fail('INVALID_ACTUAL_INDEXED_GEOMETRY');
  const verts=pos.length/3,triangles=idx.length/3;
  const chunk=Math.max(1,Math.ceil(triangles/
   Math.min(triangles,plan.drawingKernel.reservedSlots,192)));
  for(let i=0;i<idx.length;i+=chunk*3){
   if(wasAborted(signal))fail('CANCELLED_DURING_DRAWING');
   const end=Math.min(idx.length,i+chunk*3);
   for(let k=i;k<end;k++){
    const n=idx[k],b=n*3;
    if(!Number.isInteger(n)||n<0||n>=verts||
     ![pos[b],pos[b+1],pos[b+2]].every(finite))
     fail('REAL_SOURCE_TRIANGLE_INDEX_INVALID');
   }
   metrics.drawingVisitedTriangles+=(end-i)/3;
   metrics.drawingChunks++;
   if(metrics.drawingChunks%32===0)await yieldControl();
  }
  inspected+=verts;
 }
 metrics.drawingActualVerticesChecked=inspected;
 if(!shouldAcceptGeometry({scene,sourceStats:stats,plan,metrics}))
  fail('GEOMETRY_APPEARANCE_GATE_BLOCKED');
 if(wasAborted(signal))fail('CANCELLED_BEFORE_RENDER');
 // Second core is the existing real renderer, not an invented extra context.
 const frame=renderer.render(scene);
 metrics.renderPasses=1;
 if(frame?.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||
  frame.triangles!==metrics.drawingVisitedTriangles)
  fail('ACTUAL_GPU_FRAME_OR_SOURCE_TRIANGLES_FAILED');
 return Object.freeze({
  schema:plan.schema,plan,sourceStats:stats,metrics,
  gpuEvidence:frame,
  drawingElapsedMs:safeNow()-start,
  verifiedPipelineTraversal:true,
  appearanceVisuallyApproved:false,
  noHumanPhotoLikenessClaim:true,
  didNotReplaceSourceGeometry:true
 });
}
