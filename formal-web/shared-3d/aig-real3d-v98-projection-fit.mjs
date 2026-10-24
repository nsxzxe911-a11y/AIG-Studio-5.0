/**
 * V98 measured 2D→real 3D SOURCE vertex correspondence optimizer.
 * Only original vertices with observed, explicitly bound image anchors move.
 * The original mesh and triangle indices are NEVER replaced.
 * Orthographic multi-view can constrain depth; one view CANNOT prove depth.
 */
import {createAIG3DMesh}
 from './aig-real3d-core.mjs';
import {AIG_REAL3D_V98_SCHEMA,evaluateAIGReal3DUnifiedReprojection}
 from './aig-real3d-v98-unified-source-projection.mjs';
export const AIG_REAL3D_V98_FIT_SCHEMA='AIG_REAL3D_V98_PIXEL_ERROR_TO_ORIGINAL_XYZ_WORKING_COPY_V1';
const fail=x=>{throw Error('REAL3D_V98_FIT_'+x);};
const v3=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=x=>Math.hypot(...x);
function basis(c){
 const forward=[Math.sin(c.yaw)*Math.cos(c.pitch),Math.sin(c.pitch),
  Math.cos(c.yaw)*Math.cos(c.pitch)];
 const right=cross([0,1,0],forward),up=cross(forward,right);
 return {right,up};
}
function solve3(A,b){
 const m=A.map((row,i)=>[...row,b[i]]);
 for(let k=0;k<3;k++){
  let p=k;for(let j=k+1;j<3;j++)if(Math.abs(m[j][k])>Math.abs(m[p][k]))p=j;
  if(Math.abs(m[p][k])<1e-9)fail('DEGENERATE_VIEW_JACOBIAN');
  [m[k],m[p]]=[m[p],m[k]];
  const d=m[k][k];for(let i=k;i<4;i++)m[k][i]/=d;
  for(let j=0;j<3;j++)if(j!==k){
   const v=m[j][k];for(let i=k;i<4;i++)m[j][i]-=v*m[k][i];
  }
 }
 return m.map(row=>row[3]);
}
function updateNormals(mesh,position){
 const normal=new Array(position.length).fill(0),faces=mesh.indices;
 for(let i=0;i<faces.length;i+=3){
  const [a,b,c]=faces.slice(i,i+3),start=a*3,end=b*3,third=c*3,
   u=[0,1,2].map(k=>position[end+k]-position[start+k]),
   v=[0,1,2].map(k=>position[third+k]-position[start+k]),
   n=cross(u,v),nlen=len(n);
  if(nlen<1e-12)fail('ORIGINAL_TRIANGLE_COLLAPSE');
  const sourceU=[0,1,2].map(k=>mesh.positions[end+k]-mesh.positions[start+k]),
   sourceV=[0,1,2].map(k=>mesh.positions[third+k]-mesh.positions[start+k]),
   old=cross(sourceU,sourceV);
  if(dot(old,n)/(len(old)*nlen)<.15)
   fail('ORIGINAL_FACE_WINDING_FLIPPED');
  for(const idx of [a,b,c])for(let k=0;k<3;k++)normal[idx*3+k]+=n[k];
 }
 for(let i=0;i<normal.length;i+=3){
  const v=normal.slice(i,i+3),m=len(v);
  if(m>1e-10)for(let k=0;k<3;k++)normal[i+k]/=m;
  else for(let k=0;k<3;k++)normal[i+k]=mesh.normals[i+k];
 }
 return normal;
}
export function fitAIGReal3DObservedMultiViewAnchors({
 record,maxCorrectionMeters=.035,minObservedAnchors=3,
 regularization=1e-6
}={}){
 if(record?.schema!==AIG_REAL3D_V98_SCHEMA||record.scene?.units!=='METERS'||
  !Number.isFinite(maxCorrectionMeters)||maxCorrectionMeters<=0||
  maxCorrectionMeters>.1||!Number.isInteger(minObservedAnchors)||
  minObservedAnchors<2||minObservedAnchors>2000||
  !Number.isFinite(regularization)||regularization<=0||regularization>.1)
  fail('SOURCE_RECORD_OR_LIMIT_INVALID');
 const scene=record.scene;
 const initial=evaluateAIGReal3DUnifiedReprojection({record}),anchors=new Map();
 if(initial.independentObservedAnchorCount<minObservedAnchors)
  fail('INSUFFICIENT_OBSERVED_PHOTO_LANDMARKS');
 // This solver changes local XYZ and therefore only allows identity TRS.
 // No silent world/local transform unit inversion.
 for(const node of scene.nodes){
  const t=node.transform;
  if(t?.position?.some(x=>x!==0)||t?.rotationDeg?.some(x=>x!==0)||
   t?.scale?.some(x=>x!==1)||node.parentId!==null)
   fail('NON_IDENTITY_SOURCE_TRANSFORM_REQUIRES_EXPLICIT_INVERSE');
 }
 for(const v of record.imageViews){
  if(v.sourceVisibility!=='OBSERVED')continue;
  if(v.camera.projection!=='orthographic')
   fail('PERSPECTIVE_FIT_CALIBRATION_UNVERIFIED');
  const {right,up}=basis(v.camera),ppm=v.height/v.camera.orthoSpan;
  for(const anchor of v.anchors){
   const key=anchor.nodeId+':'+anchor.vertexIndex;
   const entry=anchors.get(key)||[];
   const measured=initial.views.find(x=>x.viewId===v.viewId)
    .anchorErrors.find(x=>x.nodeId===anchor.nodeId&&
     x.vertexIndex===anchor.vertexIndex);
   if(!measured?.projectedImagePoint)
    fail('VIEW_SOURCE_VERTEX_OUTSIDE_CAMERA');
   entry.push({Jx:right.map(x=>x*ppm),Jy:up.map(x=>-x*ppm),
    dx:anchor.xPx-measured.projectedImagePoint[0],
    dy:anchor.yPx-measured.projectedImagePoint[1],
    w:anchor.confidence,sourceView:v.viewId});
   anchors.set(key,entry);
  }
 }
 const updates=new Map(),metrics=[];let maxShift=0;
 for(const [key,rows] of anchors){
  const div=key.lastIndexOf(':'),nodeId=key.slice(0,div),
   index=Number(key.slice(div+1)),node=scene.nodes.find(x=>x.id===nodeId);
  const p=node.mesh.positions.slice(index*3,index*3+3),
   A=[[regularization,0,0],[0,regularization,0],[0,0,regularization]],
   b=[0,0,0];
  for(const r of rows){
   for(const [J,error] of [[r.Jx,r.dx],[r.Jy,r.dy]])
    for(let i=0;i<3;i++){
     b[i]+=r.w*J[i]*error;
     for(let j=0;j<3;j++)A[i][j]+=r.w*J[i]*J[j];
    }
  }
  const raw=solve3(A,b);
  if(!v3(raw))fail('NONFINITE_XYZ_CORRECTION');
  const m=len(raw),factor=m>maxCorrectionMeters?maxCorrectionMeters/m:1,
   correction=raw.map(x=>x*factor);
  maxShift=Math.max(maxShift,len(correction));
  const pos=p.map((x,i)=>x+correction[i]);
  if(!updates.has(nodeId))updates.set(nodeId,new Map());
  updates.get(nodeId).set(index,pos);
  metrics.push({originalSourceNodeId:nodeId,originalVertexIndex:index,
   actualVertexShiftMeters:len(correction),
   sourceIndependentPhotoViews:[...new Set(rows.map(x=>x.sourceView))],
   positionDepthFromSinglePhotoVerified:false});
 }
 const workingNodes=scene.nodes.map(node=>{
  const patches=updates.get(node.id);
  if(!patches?.size)return {...node};
  const positions=[...node.mesh.positions];
  for(const [index,p] of patches)
   positions.splice(index*3,3,...p);
  const normals=updateNormals(node.mesh,positions);
  const mesh=createAIG3DMesh({positions,normals,
   indices:node.mesh.indices,provenance:
    'V98_WORKING_COPY_OBSERVED_2D_ANCHORS_SOURCE_'+record.originalImageSha256});
  return {...node,mesh,source:'V98_SHA_LOCKED_SOURCE_PROJECTED_WORKING_COPY'};
 });
 const workingScene={...scene,nodes:workingNodes,revision:scene.revision+1};
 const after=evaluateAIGReal3DUnifiedReprojection({record,scene:workingScene});
 if(after.observedRMSEPixels===null||initial.observedRMSEPixels===null||
  after.observedRMSEPixels>=initial.observedRMSEPixels)
  fail('IMAGE_REPROJECTION_DID_NOT_IMPROVE');
 const viewsUsed=record.imageViews.filter(v=>v.sourceVisibility==='OBSERVED'&&v.anchors.length).length;
 return {schema:AIG_REAL3D_V98_FIT_SCHEMA,
  assetId:record.assetId,originalImageSha256:record.originalImageSha256,
  sourceScene:scene,workingScene,
  actuallyMovedOriginalSourceVertices:metrics.length,
  originalTriangleCounts:record.nodeSourceManifest.map(n=>({
   nodeId:n.sourceNodeId,sourceTriangles:n.sourceTriangles})),
  originalMeshTriangleIndicesNeverChanged:true,
  otherUnobservedSourceVerticesNeverChanged:true,
  maxActualVertexDisplacementMeters:maxShift,
  originalSourceMeshesUntouched:true,
  measured2DPixelRMSEBefore:initial.observedRMSEPixels,
  measured2DPixelRMSEAfter:after.observedRMSEPixels,
  sourcePhotoErrorActuallyImproved:true,
  independentlyObservedCameraViews:viewsUsed,
  singlePhoto3DDepthCertified:false,
  trueHumanIdentityCertified:false,
  originalAIGeneratedImageWeightsShared:false,
  workingCopyOnly:true,
  viewReportsBefore:initial,viewReportsAfter:after,
  perVertexChanges:metrics,
  releasePASS:false};
}
