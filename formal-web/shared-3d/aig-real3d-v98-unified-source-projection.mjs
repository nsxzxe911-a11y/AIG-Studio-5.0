/**
 * V98 unified 2D / AI image evidence / actual source-indexed 3D contract.
 * Domains: person, animal, ship, environment, CNC part. Same stable asset,
 * mesh node IDs and original photo/source SHA shared across 2D and 3D.
 *
 * User-marked image-to-mesh vertex anchors permit actual reprojection loss.
 * Inferred viewpoints may visualize, but NEVER certify missing backside.
 * No pretrained 2D image model is loaded by this module.
 */
import {getAIG3DWorldMatrix,transformAIG3DPoint}
 from './aig-real3d-core.mjs';
export const AIG_REAL3D_V98_SCHEMA='AIG_REAL3D_V98_SHARED_IMAGE_GEOMETRY_SOURCE_V1';
export const AIG_REAL3D_V98_DOMAINS=Object.freeze(
 ['PERSON','ANIMAL','SHIP','ENVIRONMENT','CNC_PART']);
const fail=x=>{throw Error('REAL3D_V98_SHARED_'+x);};
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{1,63}$/.test(x);
const finite=Number.isFinite;
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a);return l<1e-12?null:a.map(v=>v/l);};
const point=(p,i)=>p.slice(i*3,i*3+3);
const round=x=>Math.round(x*1e6)/1e6;
function cameraBasis(c){
 const toward=[Math.sin(c.yaw)*Math.cos(c.pitch),Math.sin(c.pitch),
  Math.cos(c.yaw)*Math.cos(c.pitch)];
 const right=norm(cross([0,1,0],toward));
 if(!right)fail('CAMERA_RIGHT_DEGENERATE');
 return {toward,right,up:cross(toward,right)};
}
function cameraCheck(c){
 if(!c||!['orthographic','perspective'].includes(c.projection)||
  ![c.yaw,c.pitch,c.orthoSpan,c.distance,c.fovDeg].every(finite)||
  !Array.isArray(c.focus)||c.focus.length!==3||!c.focus.every(finite)||
  c.orthoSpan<=0||c.distance<=0||c.fovDeg<15||c.fovDeg>110||
  Math.abs(c.pitch)>1.45)fail('CAMERA_EVIDENCE_INVALID');
}
function imageCheck(view,nodeIds,scene){
 if(!id(view?.viewId)||!sha(view?.imageSha256)||
  !Number.isInteger(view.width)||!Number.isInteger(view.height)||
  view.width<96||view.width>7680||view.height<96||view.height>4320||
  !['OBSERVED','AI_ESTIMATED'].includes(view.sourceVisibility)||
  !['USER_MARKED','LOCAL_MODEL','REFERENCE_ONLY'].includes(view.landmarkSource)||
  !Array.isArray(view.anchors)||view.anchors.length>2500)fail('IMAGE_EVIDENCE_INVALID');
 cameraCheck(view.camera);
 const seen=new Set();
 for(const a of view.anchors){
  const node=scene.nodes.find(n=>n.id===a?.nodeId);
  if(!node||!nodeIds.has(a.nodeId)||!Number.isInteger(a.vertexIndex)||
   a.vertexIndex<0||a.vertexIndex>=node.mesh.vertexCount||
   ![a.xPx,a.yPx,a.confidence].every(finite)||
   a.xPx<0||a.xPx>view.width||a.yPx<0||a.yPx>view.height||
   a.confidence<=0||a.confidence>1)fail('OBSERVATION_VERTEX_OR_PIXEL_INVALID');
  const key=a.nodeId+':'+a.vertexIndex;
  if(seen.has(key))fail('DUPLICATE_IMAGE_ANCHOR');seen.add(key);
 }
}
export function createAIGReal3DUnifiedSource({
 assetId,domain,scene,originalImageSha256,
 approvedIdentitySha256=null,sourceGeometrySha256=null,
 imageViews=[]
}={}){
 if(!id(assetId)||!AIG_REAL3D_V98_DOMAINS.includes(domain)||
  scene?.schema!=='AIG_REAL3D_SCENE_V1'||
  !['METERS','MM'].includes(scene.units)||
  !Array.isArray(scene.nodes)||!scene.nodes.length||scene.nodes.length>128||
  !sha(originalImageSha256)||approvedIdentitySha256!==null&&!sha(approvedIdentitySha256)||
  sourceGeometrySha256!==null&&!sha(sourceGeometrySha256)||
  !Array.isArray(imageViews)||imageViews.length>16)
  fail('ASSET_ID_DOMAIN_SOURCE_SHA_REQUIRED');
 const nodeIds=new Set();
 for(const n of scene.nodes){
  if(!id(n.id)||nodeIds.has(n.id)||!n.mesh?.actualXYZTriangles||
   !Array.isArray(n.mesh.positions)||!Array.isArray(n.mesh.indices)||
   n.mesh.positions.length!==n.mesh.vertexCount*3||
   n.mesh.indices.length!==n.mesh.triangleCount*3)
   fail('ORIGINAL_SOURCE_NODE_INVALID');
  nodeIds.add(n.id);
 }
 const viewIds=new Set();
 for(const v of imageViews){
  imageCheck(v,nodeIds,scene);
  if(viewIds.has(v.viewId))fail('DUPLICATE_VIEW_ID');
  viewIds.add(v.viewId);
 }
 const provenance=scene.nodes.map(n=>({
  sourceNodeId:n.id,sourceTriangles:n.mesh.triangleCount,
  originalVertexCount:n.mesh.vertexCount,
  sourceProvenance:n.mesh.provenance
 }));
 return {schema:AIG_REAL3D_V98_SCHEMA,assetId,domain,
  originalImageSha256,approvedIdentitySha256,sourceGeometrySha256,
  scene,imageViews:imageViews.map(v=>({...v,
   camera:{...v.camera,focus:[...v.camera.focus]},
   anchors:v.anchors.map(a=>({...a}))})),
  nodeSourceManifest:provenance,
  stableAssetIdentity:assetId,
  originalMeshIndexesAreAuthoritative:true,
  identityVisualSimilarityMeasured:false,
  originalGeometryAuthenticityVerified:false,
  independentPhotoDepthVerified:false,
  pretrainedImageGenerationModelIntegrated:false,
  shared2D3DSourceContractPASS:true,
  officialAuthorityPromoted:false,releasePASS:false};
}
export function projectAIGReal3DToImage({scene,nodeId,vertexIndex,camera,width,height}={}){
 cameraCheck(camera);
 if(scene?.schema!=='AIG_REAL3D_SCENE_V1'||!Number.isInteger(width)||
  !Number.isInteger(height)||width<96||height<96)
  fail('PROJECTION_CONTEXT_INVALID');
 const node=scene.nodes.find(n=>n.id===nodeId);
 if(!node||!Number.isInteger(vertexIndex)||vertexIndex<0||
  vertexIndex>=node.mesh.vertexCount)fail('PROJECTED_SOURCE_VERTEX_INVALID');
 const position=transformAIG3DPoint(getAIG3DWorldMatrix(scene,nodeId),
  point(node.mesh.positions,vertexIndex));
 const {toward,right,up}=cameraBasis(camera),d=sub(position,camera.focus),
  x=dot(d,right),y=dot(d,up),z=dot(d,toward),
  forward=camera.distance-z;
 if(camera.projection==='perspective'&&forward<=.01)
  return {visible:false,xPx:null,yPx:null,depthMeters:forward};
 const pxPerMeter=camera.projection==='orthographic'?
  height/camera.orthoSpan:height/(2*Math.tan(camera.fovDeg*Math.PI/360)*forward);
 return {visible:true,xPx:width*.5+x*pxPerMeter,
  yPx:height*.5-y*pxPerMeter,depthMeters:forward,
  worldPositionMeters:position};
}
export function evaluateAIGReal3DUnifiedReprojection({
 record,scene=record?.scene,includeEstimated=false
}={}){
 if(record?.schema!==AIG_REAL3D_V98_SCHEMA||
  scene?.schema!=='AIG_REAL3D_SCENE_V1'||
  typeof includeEstimated!=='boolean')fail('SHARED_RECORD_AND_SCENE_REQUIRED');
 const nodeIds=new Set(record.nodeSourceManifest.map(n=>n.sourceNodeId));
 if(scene.nodes.length!==record.nodeSourceManifest.length||
  scene.nodes.some(n=>!nodeIds.has(n.id)||
   n.mesh.triangleCount!==record.nodeSourceManifest.find(x=>x.sourceNodeId===n.id).sourceTriangles))
  fail('ORIGINAL_SOURCE_TOPOLOGY_CHANGED');
 let measured=0,squared=0,sum=0,max=0,inferredExcluded=0;
 const views=record.imageViews.map(v=>{
  const results=v.anchors.map(a=>{
   const p=projectAIGReal3DToImage({
    scene,nodeId:a.nodeId,vertexIndex:a.vertexIndex,
    camera:v.camera,width:v.width,height:v.height});
   const residual=p.visible?Math.hypot(p.xPx-a.xPx,p.yPx-a.yPx):null;
   if(v.sourceVisibility==='OBSERVED'&&p.visible){
    measured++;squared+=residual*residual;sum+=residual;
    max=Math.max(max,residual);
   }else if(v.sourceVisibility==='AI_ESTIMATED')inferredExcluded++;
   return {nodeId:a.nodeId,vertexIndex:a.vertexIndex,
    sourceVisibility:v.sourceVisibility,
    observedImagePoint:[a.xPx,a.yPx],
    projectedImagePoint:p.visible?[round(p.xPx),round(p.yPx)]:null,
    measuredResidualPx:residual===null?null:round(residual),
    genuinelyObservedPhotoAnchor:v.sourceVisibility==='OBSERVED'};
  });
  return {viewId:v.viewId,imageSha256:v.imageSha256,
   sourceVisibility:v.sourceVisibility,anchorErrors:results,
   role:v.landmarkSource};
 });
 return {schema:'AIG_REAL3D_V98_BIDIRECTIONAL_REPROJECTION_QA_V1',
  assetId:record.assetId,originalImageSha256:record.originalImageSha256,
  views,independentObservedAnchorCount:measured,
  AIInferredAnchorsExcludedFromGroundTruth:inferredExcluded,
  observedRMSEPixels:measured?round(Math.sqrt(squared/measured)):null,
  observedMeanErrorPixels:measured?round(sum/measured):null,
  observedMaxErrorPixels:measured?round(max):null,
  sourceIndexedFaceCountsPreserved:true,
  inferredSideBackCertified:false,
  sourcePhotoLikenessCertified:false,
  independentIdentityVerified:false,releasePASS:false};
}
export function buildAIGReal3DProjectedWireframe({
 record,viewId,scene=record?.scene,maxEdges=50000
}={}){
 if(record?.schema!==AIG_REAL3D_V98_SCHEMA||
  !Number.isInteger(maxEdges)||maxEdges<10||maxEdges>150000)
  fail('WIREFRAME_SOURCE_OR_BUDGET_INVALID');
 const view=record.imageViews.find(x=>x.viewId===viewId);
 if(!view)fail('UNKNOWN_ORIGINAL_IMAGE_VIEW');
 const edges=[],seen=new Set();
 for(const n of scene.nodes){
  for(let i=0;i<n.mesh.indices.length;i+=3){
   const a=n.mesh.indices.slice(i,i+3);
   for(let j=0;j<3;j++){
    const b=a[j],c=a[(j+1)%3],key=n.id+':'+Math.min(b,c)+':'+Math.max(b,c);
    if(seen.has(key))continue;seen.add(key);
    if(edges.length>=maxEdges)fail('PROJECTED_WIREFRAME_EDGE_BUDGET');
    const x=projectAIGReal3DToImage({scene,nodeId:n.id,vertexIndex:b,
     camera:view.camera,width:view.width,height:view.height});
    const y=projectAIGReal3DToImage({scene,nodeId:n.id,vertexIndex:c,
     camera:view.camera,width:view.width,height:view.height});
    if(x.visible&&y.visible)edges.push({
     nodeId:n.id,from:[round(x.xPx),round(x.yPx)],
     to:[round(y.xPx),round(y.yPx)]});
   }
  }
 }
 return {schema:'AIG_REAL3D_V98_TRUE_3D_TO_2D_SOURCE_EDGES_V1',
  assetId:record.assetId,viewId,sourceImageSha256:view.imageSha256,
  edges,actual3DIndexedSourceProjection:true,
  AIInferredImageSurfaceUsedAsGroundTruth:false,releasePASS:false};
}
