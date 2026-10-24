/**
 * Real3D V102 — image composition owns framing, renderer follows.
 *
 * An AI rebuilder's original Indexed XYZ scene NEVER changes to fit
 * a canvas. The GPU camera/canvas adapts to actual artwork aspect/ROI.
 * Bound cost: 8 world-space box corners per scene node, not each vertex.
 * Backside/identity/ML contents remain unobserved and unverified.
 */
import {getAIG3DWorldMatrix,transformAIG3DPoint}
 from './aig-real3d-core.mjs';
export const AIG_REAL3D_V102_FRAME_SCHEMA='AIG_REAL3D_V102_ARTWORK_FRAME_ADAPTIVE_CAMERA_V1';
const fail=s=>{throw Error('REAL3D_V102_'+s);};
const finite=Number.isFinite;
const dot=(a,b)=>a.reduce((x,v,i)=>x+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const scale=(a,k)=>a.map(v=>v*k);
const round=v=>Math.round(v*1e6)/1e6;
const safeSHA=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s);
const boxCorners=({min,max})=>{
 const out=[];
 for(const x of [min[0],max[0]])
  for(const y of [min[1],max[1]])
   for(const z of [min[2],max[2]])out.push([x,y,z]);
 return out;
};
const validateROI=(r,w,h)=>{
 if(!r||![r.x,r.y,r.width,r.height].every(finite)||
  r.x<0||r.y<0||r.width<=0||r.height<=0||
  r.x+r.width>w+1e-7||r.y+r.height>h+1e-7)
  fail('IMAGE_FRAME_OR_SUBJECT_REGION_INVALID');
};
export function collectAIGReal3DSourceBoundingCorners(scene){
 if(scene?.schema!=='AIG_REAL3D_SCENE_V1'||!Array.isArray(scene.nodes)||
  !scene.nodes.length||scene.nodes.length>128)
  fail('ACTUAL_INDEXED_SCENE_REQUIRED');
 const out=[];
 for(const node of scene.nodes){
  if(node.visible===false)continue;
  const mesh=node.mesh;
  if(!mesh?.actualXYZTriangles||mesh.vertexCount<3||
   !mesh.bounds||!Array.isArray(mesh.bounds.min)||!Array.isArray(mesh.bounds.max)||
   mesh.bounds.min.length!==3||mesh.bounds.max.length!==3||
   ![...mesh.bounds.min,...mesh.bounds.max].every(finite))
   fail('TRUE_SOURCE_MESH_BOUNDS_REQUIRED');
  const matrix=getAIG3DWorldMatrix(scene,node.id);
  for(const corner of boxCorners(mesh.bounds))
   out.push(transformAIG3DPoint(matrix,corner));
 }
 if(!out.length)fail('ALL_MODEL_NODES_HIDDEN');
 return out;
}
/**
 * Crop/render framing is IMAGE driven: width/height from real image,
 * optional actual alpha-bound ROI. The 3D model fits INSIDE the ROI
 * without geometry remeshing or image stretching.
 */
export function planAIGReal3DAdaptiveArtworkFrame({
 scene,artworkWidth,artworkHeight,subjectROI=null,
 yaw=.58,pitch=.2,marginFraction=.07,
 originalImageSha256=null,sourceRevision=0
}={}){
 if(!Number.isInteger(artworkWidth)||!Number.isInteger(artworkHeight)||
  artworkWidth<96||artworkHeight<96||artworkWidth>7680||artworkHeight>4320||
  ![yaw,pitch,marginFraction].every(finite)||Math.abs(pitch)>1.45||
  Math.abs(yaw)>Math.PI*6||marginFraction<0||marginFraction>.3||
  !Number.isInteger(sourceRevision)||sourceRevision<0||
  (originalImageSha256!==null&&!safeSHA(originalImageSha256)))
  fail('ARTWORK_DIMENSIONS_OR_SOURCE_UNTRUSTED');
 const roi=subjectROI??{x:0,y:0,width:artworkWidth,height:artworkHeight};
 validateROI(roi,artworkWidth,artworkHeight);
 const corners=collectAIGReal3DSourceBoundingCorners(scene);
 const toward=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),
  Math.cos(yaw)*Math.cos(pitch)],
  right=cross([0,1,0],toward),up=cross(toward,right);
 const q=corners.map(p=>[dot(p,right),dot(p,up),dot(p,toward)]);
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const p of q)for(let k=0;k<3;k++){
  min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);
 }
 const aspect=artworkWidth/artworkHeight,
  availableX=roi.width/artworkWidth*(1-2*marginFraction),
  availableY=roi.height/artworkHeight*(1-2*marginFraction);
 const rangeX=Math.max(1e-6,max[0]-min[0]),
  rangeY=Math.max(1e-6,max[1]-min[1]);
 const orthoSpan=Math.max(.01,rangeY/availableY,rangeX/(availableX*aspect));
 const center=scale(add(min,max),.5);
 // These desired picture coordinates preserve asymmetrical composition:
 // off-center AI characters/ships remain off-center after 3D fitting.
 const u=(roi.x+roi.width/2)/artworkWidth,
  v=(roi.y+roi.height/2)/artworkHeight;
 const focus=add(add(
  add(scale(right,center[0]),scale(up,center[1])),
   scale(toward,center[2])),
  add(scale(right,-(u-.5)*orthoSpan*aspect),
   scale(up,(v-.5)*orthoSpan)));
 const depthSpan=max[2]-min[2],
  distance=Math.max(3,orthoSpan*2,depthSpan*2+1);
 const camera={projection:'orthographic',yaw,pitch,focus,
  orthoSpan,distance};
 const projectionPixels=corners.map(p=>{
  const d=p.map((x,i)=>x-focus[i]);
  return [artworkWidth*(.5+dot(d,right)/(orthoSpan*aspect)),
   artworkHeight*(.5-dot(d,up)/orthoSpan)];
 });
 const box2D={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};
 for(const [x,y] of projectionPixels){
  box2D.minX=Math.min(x,box2D.minX);
  box2D.minY=Math.min(y,box2D.minY);
  box2D.maxX=Math.max(x,box2D.maxX);
  box2D.maxY=Math.max(y,box2D.maxY);
 }
 const inside=box2D.minX>=roi.x-1e-5&&box2D.maxX<=roi.x+roi.width+1e-5&&
  box2D.minY>=roi.y-1e-5&&box2D.maxY<=roi.y+roi.height+1e-5;
 if(!inside)fail('MODEL_PROJECTED_OUTSIDE_IMAGE_FRAME');
 return {schema:AIG_REAL3D_V102_FRAME_SCHEMA,
  originalImageSha256,sourceRevision,
  artworkWidth,artworkHeight,aspectRatio:aspect,
  intendedImageSubjectROI:{...roi},camera,
  projected3DBoundsInArtworkPixels:Object.fromEntries(
   Object.entries(box2D).map(([k,x])=>[k,round(x)])),
  modelFitsInsideOriginalArtworkROI:inside,
  actualSourceSceneUsed:scene.schema,
  original3DSourceVertexCountUnchanged:true,
  sourceTrianglesRetessellated:0,
  cameraOnlyFramingNoGeometryEdits:true,
  originalImageAspectPreserved:true,
  virtualDepthOrIdentityAccuracyNotInferred:true,
  generatedArtIsNotProofOfHiddenGeometry:true,
  referenceArtworkPixelsUntouched:true,
  releasePASS:false};
}
/** Optional safe alpha ROI: opaque images deliberately remain full-frame;
 * no untrained RGB segmenter is pretended. Sampling bounded to 1,048,576
 * samples for extremely large images. */
export function findAIGReal3DVisibleAlphaROI({
 rgba,width,height,threshold=16
}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<96||height<96||width>7680||height>4320||
  !rgba||rgba.length!==width*height*4||
  !Number.isInteger(threshold)||threshold<0||threshold>254)
  fail('ORIGINAL_IMAGE_ALPHA_DATA_INVALID');
 const step=Math.max(1,Math.ceil(Math.sqrt(width*height/1048576)));
 let minX=width,minY=height,maxX=-1,maxY=-1,transparent=0;
 for(let y=0;y<height;y+=step)for(let x=0;x<width;x+=step){
  const alpha=rgba[(y*width+x)*4+3];
  if(alpha<=threshold){transparent++;continue;}
  minX=Math.min(minX,x);minY=Math.min(minY,y);
  maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
 }
 const detected=transparent>0&&maxX>=0;
 const roi=detected?
  {x:minX,y:minY,width:Math.min(width-minX,maxX-minX+step),
   height:Math.min(height-minY,maxY-minY+step)}:
  {x:0,y:0,width,height};
 return {schema:'AIG_REAL3D_V102_ORIGINAL_IMAGE_ALPHA_FRAME_QA_V1',
  imageWidth:width,imageHeight:height,subjectROI:roi,
  actualTransparencySamplesDetected:transparent,
  alphaDerivedROI:detected,
  nonTransparentRGBSemanticSegmentationNotInvented:true,
  originalPixelMaskNotModified:true,releasePASS:false};
}
/**
 * Lightweight frame task queue: AI owns writes, renderer only snapshots.
 * At most ONE latest scene waiting; no back-pressure on the AI re-builder.
 * Browser integration may invoke pump only from requestAnimationFrame. This
 * is COALESCING not an actual separate CPU/GPU thread or measured FPS.
 */
export function createAIGReal3DAdaptivePreviewGate({
 aiActiveMinIntervalMs=240,idleMinIntervalMs=16
}={}){
 if(![aiActiveMinIntervalMs,idleMinIntervalMs].every(finite)||
  aiActiveMinIntervalMs<30||aiActiveMinIntervalMs>3000||
  idleMinIntervalMs<0||idleMinIntervalMs>250)
  fail('PREVIEW_BUDGET_INVALID');
 let pending=null,lastAt=-Infinity,draws=0,coalesced=0,lastKey=null,
  workModelBusy=false,locked=false,latest=null;
 function enqueue({scene,sourceRevision,sourceSHA}={}){
  if(scene?.schema!=='AIG_REAL3D_SCENE_V1'||
   !Number.isInteger(sourceRevision)||sourceRevision<0||
   !safeSHA(sourceSHA))
   fail('PREVIEW_SOURCE_VERSION_OR_SHA_REQUIRED');
  if(pending){coalesced++;}
  pending={scene,sourceRevision,sourceSHA};
  return snapshot();
 }
 function setAIRebuilderBusy(busy){
  if(typeof busy!=='boolean')fail('AI_BUSY_FLAG_INVALID');
  workModelBusy=busy;return snapshot();
 }
 function pump(now,draw){
  if(!finite(now)||now<0||typeof draw!=='function')
   fail('DRAW_TICK_AND_REAL_GPU_CALLBACK_REQUIRED');
  if(locked||!pending)return {status:'SKIPPED_NO_NEW_FRAME',...snapshot()};
  const interval=workModelBusy?aiActiveMinIntervalMs:idleMinIntervalMs;
  if(now-lastAt<interval)return {status:'SKIPPED_GPU_PREVIEW_THROTTLED',
   ...snapshot()};
  const item=pending;
  const key=item.sourceSHA+':'+item.sourceRevision;
  if(key===lastKey){pending=null;return {status:'SKIPPED_UNCHANGED_SOURCE',...snapshot()};}
  locked=true;
  try{
   // Genuine renderer.draw called ONCE. Keep the latest pending snapshot
   // if new AI source arrived while rendering.
   const returned=draw(item.scene,item);
   if(returned?.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')
    fail('GPU_FRAME_NOT_RENDERED');
   if(pending===item)pending=null;
   lastAt=now;lastKey=key;draws++;latest=item;
   return {status:'RENDERED_LATEST_SOURCE',...snapshot()};
  }finally{locked=false;}
 }
 function snapshot(){return {schema:'AIG_REAL3D_V102_ADAPTIVE_PREVIEW_SNAPSHOT_V1',
  AIRebuilderBusy:workModelBusy,pendingRevision:pending?.sourceRevision??null,
  latestRenderedRevision:latest?.sourceRevision??null,
  coalescedSupersededModels:coalesced,realGPUDrawCallbackCount:draws,
  no4KReadbackTriggeredByPreview:true,
  actualAIPipelineRunInParallelThread:false,
  maxQueuedFullMeshSnapshots:1,sourceMeshUnchanged:true};}
 return {enqueue,pump,setAIRebuilderBusy,snapshot};
}
