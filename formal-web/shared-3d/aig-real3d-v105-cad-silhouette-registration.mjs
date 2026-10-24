/**
 * V105 source-registered CAD TOP silhouette alignment, not a renderer trick.
 *
 * A source-indexed real XYZ mesh is independently projected to a fixed
 * millimeter XY raster and compared with a calibrated, source-labelled
 * OBSERVED/AI_ESTIMATED CAD polygon on the SAME coordinate grid.
 *
 * Allowed working copy: at most a small global CNC-XY translation of all
 * roots. Triangle XYZ and connectivity remain bit-for-bit unchanged.
 * No inference of hidden back, height, anatomy, skin or material.
 */
import {getAIG3DWorldMatrix,transformAIG3DPoint}
 from './aig-real3d-core.mjs';
import {convertAIGReal3DWorldToCNC,convertAIGReal3DCNCToWorld}
 from './aig-real3d-v104-cad-top-first.mjs';
export const AIG_REAL3D_V105_SCHEMA='AIG_REAL3D_V105_TOP_CAD_SOURCE_SILHOUETTE_REGISTRATION_V1';
const fail=s=>{throw Error('REAL3D_V105_'+s);};
const finite=Number.isFinite;
const sha=x=>typeof x==='string'&&/^[a-fA-F0-9]{64}$/.test(x);
const r6=x=>Math.round(x*1e6)/1e6;
function segmentsIntersect(a,b,c,d){
 const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
 const o1=o(a,b,c),o2=o(a,b,d),o3=o(c,d,a),o4=o(c,d,b);
 const on=(p,q,r)=>Math.min(p[0],q[0])-1e-9<=r[0]&&
  r[0]<=Math.max(p[0],q[0])+1e-9&&
  Math.min(p[1],q[1])-1e-9<=r[1]&&r[1]<=Math.max(p[1],q[1])+1e-9;
 if(Math.abs(o1)<1e-10&&on(a,b,c))return true;
 if(Math.abs(o2)<1e-10&&on(a,b,d))return true;
 if(Math.abs(o3)<1e-10&&on(c,d,a))return true;
 if(Math.abs(o4)<1e-10&&on(c,d,b))return true;
 return (o1>0)!==(o2>0)&&(o3>0)!==(o4>0);
}
function validPolygon(vertices){
 if(!Array.isArray(vertices)||vertices.length<3||vertices.length>512||
  vertices.some(p=>!Array.isArray(p)||p.length!==2||
   p.some(x=>!finite(x)||Math.abs(x)>1e6)))fail('SOURCE_CAD_POLYGON_INVALID');
 for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++){
  if(j===i+1||i===0&&j===vertices.length-1)continue;
  if(segmentsIntersect(vertices[i],vertices[(i+1)%vertices.length],
   vertices[j],vertices[(j+1)%vertices.length]))
   fail('SELF_INTERSECTING_CAD_OUTLINE_BLOCK');
 }
 const area=vertices.reduce((sum,p,i)=>{
  const q=vertices[(i+1)%vertices.length];
  return sum+(p[0]*q[1]-q[0]*p[1]);
 },0)*.5;
 if(Math.abs(area)<1e-8)fail('CAD_POLYGON_ZERO_AREA');
}
function pointInPolygon(x,y,v){
 let inside=false;
 for(let i=0,j=v.length-1;i<v.length;j=i++){
  const a=v[i],b=v[j];
  if((a[1]>y)!==(b[1]>y)&&
   x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])
   inside=!inside;
 }
 return inside;
}
function rasterModel(scene){
 if(scene?.schema!=='AIG_REAL3D_SCENE_V1'||!['MM','METERS'].includes(scene.units)||
  !Array.isArray(scene.nodes)||!scene.nodes.length||scene.nodes.length>128)
  fail('ORIGINAL_XYZ_SCENE_REQUIRED');
 const nodes=[],points=[];
 let totalTriangles=0;
 for(const node of scene.nodes){
  if(node.visible===false)continue;
  const m=node.mesh;
  if(!m?.actualXYZTriangles||
   !Array.isArray(m.positions)||m.positions.length!==m.vertexCount*3||
   !Array.isArray(m.indices)||m.indices.length!==m.triangleCount*3||
   m.indices.some(k=>!Number.isInteger(k)||k<0||k>=m.vertexCount)||
   !m.positions.every(finite))
   fail('SOURCE_XYZ_TRIANGLES_REQUIRED');
  totalTriangles+=m.triangleCount;
  if(totalTriangles>50000||m.vertexCount>120000)
   fail('PREVIEW_TRIANGLE_BUDGET');
  const matrix=getAIG3DWorldMatrix(scene,node.id),xy=[];
  for(let i=0;i<m.positions.length;i+=3){
   const w=transformAIG3DPoint(matrix,m.positions.slice(i,i+3)),
    cnc=convertAIGReal3DWorldToCNC(w,{sceneUnits:scene.units});
   xy.push(cnc.slice(0,2));points.push(cnc.slice(0,2));
  }
  nodes.push({id:node.id,xy,indices:m.indices});
 }
 if(!nodes.length||!points.length)fail('VISIBLE_ORIGINAL_GEOMETRY_MISSING');
 return {nodes,points,totalTriangles};
}
function rasterTriangles(model,frame,size){
 const mask=new Uint8Array(size*size);
 for(const node of model.nodes)for(let f=0;f<node.indices.length;f+=3){
  const v=[0,1,2].map(k=>node.xy[node.indices[f+k]]).map(p=>[
   (p[0]-frame.min[0])/frame.span[0]*size,
   (frame.max[1]-p[1])/frame.span[1]*size]);
  const [a,b,c]=v,det=(b[1]-c[1])*(a[0]-c[0])+
   (c[0]-b[0])*(a[1]-c[1]);
  if(Math.abs(det)<1e-11)continue;
  const loX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),
   hiX=Math.min(size-1,Math.ceil(Math.max(a[0],b[0],c[0]))),
   loY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),
   hiY=Math.min(size-1,Math.ceil(Math.max(a[1],b[1],c[1])));
  for(let y=loY;y<=hiY;y++)for(let x=loX;x<=hiX;x++){
   const px=x+.5,py=y+.5,
    wa=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/det,
    wb=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/det,
    wc=1-wa-wb;
   if(wa>=-1e-9&&wb>=-1e-9&&wc>=-1e-9)mask[y*size+x]=1;
  }
 }
 return mask;
}
function rasterPolygon(points,frame,size){
 const out=new Uint8Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const xx=frame.min[0]+(x+.5)/size*frame.span[0],
   yy=frame.max[1]-(y+.5)/size*frame.span[1];
  if(pointInPolygon(xx,yy,points))out[y*size+x]=1;
 }
 return out;
}
function compare(candidate,target,size,dx,dy){
 let intersection=0,union=0,modelPixels=0,observedPixels=0;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const sx=x-dx,sy=y-dy,idx=y*size+x,
   m=sx>=0&&sx<size&&sy>=0&&sy<size?
    candidate[sy*size+sx]:0,
   o=target[idx];
  if(m)modelPixels++;if(o)observedPixels++;
  if(m&&o)intersection++;
  if(m||o)union++;
 }
 return {iou:union?intersection/union:0,
  intersection,union,modelPixels,observedPixels};
}
function workingCopy(scene,shiftCNCmm){
 const dx=convertAIGReal3DCNCToWorld(
  [shiftCNCmm[0],shiftCNCmm[1],0],{sceneUnits:scene.units});
 const copy={...scene,nodes:scene.nodes.map(n=>({
  ...n,transform:{...n.transform,
   position:[...n.transform.position],
   rotationDeg:[...n.transform.rotationDeg],
   scale:[...n.transform.scale]},
  mesh:n.mesh // share immutable source mesh; only working node transforms move
 })),revision:scene.revision+1};
 for(const node of copy.nodes)if(node.parentId===null){
  for(let k=0;k<3;k++)node.transform.position[k]+=dx[k];
 }
 return copy;
}
export function compareAndRegisterAIGReal3DTopCAD({
 scene,originalGLBSha256,observedTopCAD,
 resolution=96,maxTranslationMM=0.5,
 authorizeTranslation=false,minIoUImprovement=.025
}={}){
 if(!sha(originalGLBSha256)||
  observedTopCAD?.schema!=='AIG_REAL3D_V104_OBSERVED_CAD_XY_TOP_V1'||
  !Number.isInteger(resolution)||resolution<32||resolution>128||
  !finite(maxTranslationMM)||maxTranslationMM<0||maxTranslationMM>100||
  !finite(minIoUImprovement)||minIoUImprovement<0||
  minIoUImprovement>.5||typeof authorizeTranslation!=='boolean')
  fail('CALIBRATED_SOURCE_AND_REGISTRATION_GATES_REQUIRED');
 const obs=observedTopCAD;
 validPolygon(obs.verticesXYmm);
 const points=obs.verticesXYmm.map(p=>[
  p[0]+obs.originCNCmm[0],p[1]+obs.originCNCmm[1]]);
 const model=rasterModel(scene),all=[...model.points,...points],
  bb={min:[Infinity,Infinity],max:[-Infinity,-Infinity]};
 for(const p of all)for(let j=0;j<2;j++){
  bb.min[j]=Math.min(bb.min[j],p[j]);bb.max[j]=Math.max(bb.max[j],p[j]);
 }
 const sizeX=Math.max(1e-8,bb.max[0]-bb.min[0]),
  sizeY=Math.max(1e-8,bb.max[1]-bb.min[1]),
  margin=Math.max(sizeX,sizeY)*.08+maxTranslationMM+1e-4;
 const frame={min:[bb.min[0]-margin,bb.min[1]-margin],
  max:[bb.max[0]+margin,bb.max[1]+margin]};
 frame.span=[frame.max[0]-frame.min[0],frame.max[1]-frame.min[1]];
 const base=rasterTriangles(model,frame,resolution),
  target=rasterPolygon(points,frame,resolution),
  original=compare(base,target,resolution,0,0),
  dxmm=frame.span[0]/resolution,dymm=frame.span[1]/resolution,
  radiusX=Math.min(16,Math.floor(maxTranslationMM/dxmm)),
  radiusY=Math.min(16,Math.floor(maxTranslationMM/dymm));
 let best={dx:0,dy:0,...original},candidates=0;
 for(let dy=-radiusY;dy<=radiusY;dy++)for(let dx=-radiusX;dx<=radiusX;dx++){
  if(Math.abs(dx*dxmm)>maxTranslationMM+1e-8||
   Math.abs(dy*dymm)>maxTranslationMM+1e-8)continue;
  const candidate=compare(base,target,resolution,dx,dy);candidates++;
  if(candidate.iou>best.iou+1e-12){
   best={dx,dy,...candidate};
  }
 }
 const proposedTranslationCNCmm=[
  r6(best.dx*dxmm),r6(-best.dy*dymm),0],
  improvement=r6(best.iou-original.iou),
  sourceObserved=obs.sourceVisibility==='OBSERVED',
  eligible=sourceObserved&&improvement>=minIoUImprovement&&
   (Math.abs(best.dx)>0||Math.abs(best.dy)>0),
  canRegister=eligible&&authorizeTranslation;
 const registration=canRegister?workingCopy(scene,proposedTranslationCNCmm):null;
 const status=canRegister?'CAD_XY_REGISTRATION_WORKING_COPY_READY':
  !sourceObserved?'BLOCK_AI_ESTIMATED_TOP_CANNOT_REGISTER':
  !authorizeTranslation?'OBSERVED_SILHOUETTE_COMPARISON_ONLY_NOT_AUTHORIZED':
  'BLOCK_NO_MEASURED_CAD_SILHOUETTE_IMPROVEMENT';
 return {schema:AIG_REAL3D_V105_SCHEMA,status,originalGLBSha256,
  observationImageSha256:obs.imageSha256,sourceVisibility:obs.sourceVisibility,
  manualSourceLabelHasNotBeenIndependentlyAuthenticated:true,
  originalSourceTriangleCount:model.totalTriangles,
  originalSourceSceneRevision:scene.revision,
  sourceOriginalSceneNeverMutated:true,
  sourceVertexPositionsNotModified:true,
  workCopyMeshVertexBuffersSharedWithOriginal:true,
  onlyRigidPlanarTranslationProposed:true,
  noScaleRotationRetessellationOrInventedDepth:true,
  frontAndBottomSourceEvidenceStillUnknown:true,
  CADSilhouetteObservationNotAutomaticallyOriginalPhoto:true,
  effectiveRasterMMPerPixel:[r6(dxmm),r6(dymm)],
  rasterFrameMM:frame,
  originalRasterIoU:r6(original.iou),
  bestRasterIoU:r6(best.iou),
  measuredRasterIoUImprovement:improvement,
  candidateAlignmentPositionsChecked:candidates,
  proposedTranslationCNCmm,
  allSilhouettePixelsObserved:target.reduce((a,b)=>a+b,0),
  sourceProjectablePixels:base.reduce((a,b)=>a+b,0),
  sourceCADPolygonAreaMM2:Math.abs(obs.signedPolygonAreaMM2),
  declaredAuthorizedTranslation:authorizeTranslation,
  workingScene:registration,previewApprovalOnly:canRegister,
  actualNeuralGeometryInferenceCalled:false,
  independentPhotoFaceOrHairIdentityCertified:false,
  originalCNCMachineKinematicsNotChanged:true,releasePASS:false,
  originalMask:Array.from(base),observedCADMask:Array.from(target),
  resolution,
  shiftedMask:canRegister?
   Array.from({length:resolution*resolution},(_,i)=>{
    const x=i%resolution,y=Math.floor(i/resolution),
     sx=x-best.dx,sy=y-best.dy;
    return sx>=0&&sx<resolution&&sy>=0&&sy<resolution?
     base[sy*resolution+sx]:0;
   }):null
 };
}
