/**
 * V96 geometry-first native 4K proof, on the existing truthful WebGL indexed
 * XYZ renderer. Neither upscaled 1080p, manufactured source details nor
 * fictitious PBR/HDR/4K60fps. Same camera + original triangle topology.
 */
import {getAIG3DWorldMatrix,transformAIG3DPoint}
 from './aig-real3d-core.mjs';
export const AIG_REAL3D_V96_SCHEMA='AIG_REAL3D_V96_NATIVE_4K_SOURCE_DETAIL_GATE_V1';
export const AIG_REAL3D_V96_OUTPUTS=Object.freeze({
 UHD_4K:Object.freeze({width:3840,height:2160}),
 FULL_HD:Object.freeze({width:1920,height:1080}),
 UHD_2K:Object.freeze({width:2560,height:1440})
});
const fail=x=>{throw Error('REAL3D_V96_4K_'+x);};
const finite=Number.isFinite,round=x=>Math.round(x*1000)/1000;
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a);return l<1e-9?null:a.map(v=>v/l);};
const meshSHA=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s);

/** Memory estimate is a conservative minimum, not GPU_DRIVER_USAGE. */
export function planAIGReal3DNative4K({
 output='UHD_4K',gpuLimit=8192,estimatedWorkingMemoryMB=256,
 maxFramePixels=9_000_000,requiredFPS=24,
 pixelBufferCount=5,sourceTriangles=0
}={}){
 const spec=AIG_REAL3D_V96_OUTPUTS[output];
 if(!spec||!Number.isInteger(gpuLimit)||gpuLimit<256||gpuLimit>32768||
  !finite(estimatedWorkingMemoryMB)||estimatedWorkingMemoryMB<1||
  estimatedWorkingMemoryMB>262144||
  !Number.isInteger(maxFramePixels)||maxFramePixels<200000||
  maxFramePixels>9_000_000||![24,30,60].includes(requiredFPS)||
  !Number.isInteger(pixelBufferCount)||pixelBufferCount<3||pixelBufferCount>10||
  !Number.isInteger(sourceTriangles)||sourceTriangles<0||sourceTriangles>2_000_000)
  fail('HARDWARE_OUTPUT_OR_SOURCE_BUDGET_INVALID');
 const pixels=spec.width*spec.height,bytesPerBuffer=pixels*4,
  estimatedMinBytes=bytesPerBuffer*pixelBufferCount,
  budgetBytes=estimatedWorkingMemoryMB*1024*1024,
  fit=gpuLimit>=Math.max(spec.width,spec.height)&&
   pixels<=maxFramePixels&&estimatedMinBytes<=budgetBytes;
 return {schema:AIG_REAL3D_V96_SCHEMA,output,width:spec.width,height:spec.height,
  nativeFramebufferPixels:pixels,outputResampledFromSmallerBitmap:false,
  cpuGpuRGBABytesPerBuffer:bytesPerBuffer,
  minWorkingSetBytesEstimate:estimatedMinBytes,
  availableWorkingSetBytesConfigured:Math.floor(budgetBytes),
  gpuFramebufferDimensionLimit:gpuLimit,maxFramePixels,
  memoryEstimateIsNotMeasuredDriverAllocation:true,
  targetFPS:requiredFPS,sourceTriangles,
  hardwareBudgetPASS:fit,
  insufficientGPUDimension:gpuLimit<Math.max(spec.width,spec.height),
  insufficientFramebufferBudget:pixels>maxFramePixels,
  insufficientMemoryEstimate:estimatedMinBytes>budgetBytes,
  actualGPUFPS:null,realHDR10:false,realRayTracing:false,
  truePBRLightingCertified:false,highQualityGeometryCertified:false,
  filmNativeFrameSequenceEncoded:false,releasePASS:false};
}

/** Evaluates actual source geometry screen-space edge sizes, NO re-meshing. */
export function auditAIGReal3D4KSourceProjection({
 scene,sourceSha256,camera={
  projection:'orthographic',yaw:0,pitch:0,focus:[0,0,0],orthoSpan:2.4,
  distance:4,fovDeg:55
 },width=3840,height=2160,
 maxSourceEdgePx=20,maxOverLimitFraction=.08
}={}){
 if(scene?.schema!=='AIG_REAL3D_SCENE_V1'||!meshSHA(sourceSha256)||
  !Array.isArray(scene.nodes)||!scene.nodes.length||scene.nodes.length>128||
  scene.units!=='METERS'||!Number.isInteger(width)||!Number.isInteger(height)||
  width<640||width>7680||height<480||height>4320||
  !['orthographic','perspective'].includes(camera?.projection)||
  ![camera.yaw,camera.pitch,camera.orthoSpan,camera.distance,camera.fovDeg]
   .every(finite)||!Array.isArray(camera.focus)||camera.focus.length!==3||
  !camera.focus.every(finite)||Math.abs(camera.pitch)>1.45||
  camera.orthoSpan<=0||camera.distance<=0||
  camera.fovDeg<15||camera.fovDeg>110||
  !finite(maxSourceEdgePx)||maxSourceEdgePx<1||maxSourceEdgePx>500||
  !finite(maxOverLimitFraction)||maxOverLimitFraction<0||maxOverLimitFraction>1)
  fail('SOURCE_GEOMETRY_CAMERA_OR_RESOLUTION_INVALID');
 const x=Math.sin(camera.yaw)*Math.cos(camera.pitch),
  y=Math.sin(camera.pitch),z=Math.cos(camera.yaw)*Math.cos(camera.pitch),
  toward=norm([x,y,z]),right=norm(cross([0,1,0],toward)),
  up=cross(toward,right);
 const aspect=width/height,origin=camera.focus;
 const metersToPx=height/camera.orthoSpan;
 function project(p){
  const d=sub(p,origin),rx=dot(d,right),ry=dot(d,up),
   dz=dot(d,toward);
  if(camera.projection==='orthographic')
   return [rx*metersToPx,ry*metersToPx,true];
  const forward=camera.distance-dz;
  if(forward<.01)return [0,0,false];
  const scale=height/(2*Math.tan(camera.fovDeg*Math.PI/360)*forward);
  return [rx*scale,ry*scale,true];
 }
 let edges=0,excess=0,maxPx=0,sourceTriangles=0,
  unseen=0,tooFewTriangles=false;
 const perNode=[];
 for(const node of scene.nodes){
  const mesh=node.mesh;
  if(!mesh?.actualXYZTriangles||!Array.isArray(mesh.indices)||
   !Array.isArray(mesh.positions)||mesh.indices.length!==mesh.triangleCount*3)
   fail('ACTUAL_SOURCE_XYZ_INDEXED_TRIANGLES_REQUIRED');
  const world=getAIG3DWorldMatrix(scene,node.id);
  const pts=Array.from({length:mesh.vertexCount},(_,i)=>
   project(transformAIG3DPoint(world,mesh.positions.slice(i*3,i*3+3))));
  let nEdges=0,nExcess=0,nMax=0,nUnseen=0;
  for(let f=0;f<mesh.triangleCount;f++){
   const idx=mesh.indices.slice(f*3,f*3+3);
   if(idx.length!==3||idx.some(i=>!Number.isInteger(i)||i<0||i>=pts.length))
    fail('SOURCE_FACE_INDEX_INVALID');
   const corners=idx.map(i=>pts[i]);
   if(corners.some(p=>!p[2])){nUnseen++;continue;}
   for(let k=0;k<3;k++){
    const a=corners[k],b=corners[(k+1)%3],
     edgePx=Math.hypot(a[0]-b[0],a[1]-b[1]);
    nMax=Math.max(nMax,edgePx);
    nEdges++;if(edgePx>maxSourceEdgePx)nExcess++;
   }
  }
  edges+=nEdges;excess+=nExcess;maxPx=Math.max(maxPx,nMax);
  unseen+=nUnseen;sourceTriangles+=mesh.triangleCount;
  perNode.push({id:node.id,sourceTriangles:mesh.triangleCount,
   originalIndexedTopologyUnchanged:true,projectedSourceEdges:nEdges,
   overDetailedShotEdgeBudget:nExcess,maximumProjectedEdgePx:round(nMax),
   skippedBehindEyeTriangles:nUnseen});
 }
 const fraction=edges?excess/edges:1;
 return {schema:'AIG_REAL3D_V96_PROJECTED_ORIGINAL_SOURCE_GEOMETRY_QA_V1',
  sourceSha256,width,height,sourceTriangles,
  sourceProjectedEdgeCount:edges,
  sourceEdgesAbove4KDetailLimit:excess,
  sourceOverThresholdFraction:round(fraction),
  maxSourceEdgePixels:round(maxPx),
  toleratedEdgePixels:maxSourceEdgePx,
  missingNearCameraSourceTriangles:unseen,
  sourceDetailCandidatePASS:edges>0&&fraction<=maxOverLimitFraction,
  originalMeshFacesAdded:0,originalMeshFacesDeleted:0,
  generatedMissingHumanDetails:false,
  evidenceIsScreenProjectionNotCurvatureTruth:true,
  sourceMaterialTextureResolutionVerified:false,
  sourcePhysicallyCorrectBRDFVerified:false,
  native4KHumanVisualAcceptancePASS:false,
  nodes:perNode,releasePASS:false};
}

/** Renderer already implements a native 3840x2160 readPixels PNG (not upscaling).
 * Require output, source topology, SHA and strict dimensions at this boundary.
 */
export async function captureAIGReal3DNative4K({
 renderer,scene,sourceSha256,output='UHD_4K',
 workingMemoryMB=256,requireSourceDetailPASS=false,
 camera=null
}={}){
 if(!renderer||renderer.status!=='READY'||!meshSHA(sourceSha256)||
  scene?.schema!=='AIG_REAL3D_SCENE_V1'||typeof requireSourceDetailPASS!=='boolean')
  fail('NATIVE_SOURCE_RENDERER_REQUIRED');
 const dimensions=AIG_REAL3D_V96_OUTPUTS[output];
 if(!dimensions)fail('NATIVE_OUTPUT_UNSUPPORTED');
 const budget=planAIGReal3DNative4K({output,
  gpuLimit:renderer.getGpuLimit(),estimatedWorkingMemoryMB:workingMemoryMB,
  sourceTriangles:scene.nodes.reduce((sum,n)=>sum+n.mesh.triangleCount,0)});
 if(!budget.hardwareBudgetPASS)fail('NATIVE_FRAMEBUFFER_MEMORY_OR_HARDWARE_BLOCK');
 const quality=camera?auditAIGReal3D4KSourceProjection({
  scene,sourceSha256,camera,width:dimensions.width,height:dimensions.height
 }):null;
 if(requireSourceDetailPASS&&(!quality||!quality.sourceDetailCandidatePASS))
  fail('SOURCE_GEOMETRY_INSUFFICIENT_FOR_CLOSEUP');
 const originalMeshState=scene.nodes.map(n=>({m:n.mesh,
  vertices:n.mesh.vertexCount,faces:n.mesh.triangleCount}));
 const start=performance.now();
 const png=await renderer.captureNativePNG(scene,dimensions);
 const drawMs=Math.round((performance.now()-start)*1000)/1000;
 if(png.width!==dimensions.width||png.height!==dimensions.height||
  png.nativeOutputPixels!==dimensions.width*dimensions.height||
  !png.genuineGpuReadback||png.resampledFromSmallerImage||
  !meshSHA(png.sha256)||
  originalMeshState.some(x=>x.m.vertexCount!==x.vertices||x.m.triangleCount!==x.faces))
  fail('NATIVE_GPU_SOURCE_OR_DIMENSION_EVIDENCE_INVALID');
 return {schema:AIG_REAL3D_V96_SCHEMA,sourceSha256,
  pngBlob:png.blob,sha256:png.sha256,
  output,width:png.width,height:png.height,
  nativeFramePixels:png.nativeOutputPixels,
  trueGPUReadPixels:true,resampledFromSmallerBitmap:false,
  captureAndEncodeWallMilliseconds:drawMs,
  estimated4KCapacity:budget,
  sourceGeometryProjectionQA:quality,
  originalIndexedFacesPreserved:true,
  faceIdentityOrAnatomicalAccuracyCertified:false,
  truePBROrHDRCertified:false,
  measuredFrameRateForMovie:null,
  actual24FPSLongFilmPASS:false,
  actual60FPSLongFilmPASS:false,releasePASS:false};
}
