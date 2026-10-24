/**
 * True OBJ source-triangle repair, in a SEPARATE working copy.
 * Only isolated, small, planar, convex boundary loops are supported.
 * No new vertices, no implicit "anatomical" geometry, no source overwrite.
 */
import {parseAIGScanNativeOBJ,buildAIGReal3DScanNative} from './aig-real3d-scan-native-mesh.mjs';
export const AIG_REAL3D_LOCAL_PATCH_SCHEMA='AIG_REAL3D_IMMUTABLE_SOURCE_TRIANGLE_PATCH_V1';
const SHA=/^[a-f0-9]{64}$/i;
const err=s=>{throw Error('REAL3D_LOCAL_PATCH_'+s);};
const vec=(a,b)=>a.map((x,k)=>x-b[k]);
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=v=>Math.hypot(...v);
const edgeKey=(a,b)=>a<b?a+':'+b:b+':'+a;
const round=v=>Math.round(v*1e5)/1e5;
function sourceWorldPositions(points,heightMm,upAxis){
 const raw=points.map(p=>upAxis==='Z'?[p[0],p[2],-p[1]]:p),
 min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const p of raw)for(let i=0;i<3;i++){
  min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);
 }
 const h=max[1]-min[1];
 if(h<1e-8)err('SOURCE_HEIGHT_INVALID');
 const scale=heightMm/1000/h;
 return raw.map(p=>[(p[0]-(min[0]+max[0])/2)*scale,
  (p[1]-min[1])*scale,(p[2]-(min[2]+max[2])/2)*scale]);
}
function findBoundaryLoops(positions,indices,{maximumHoleDiameterMm,maximumHoles}){
 const map=new Map();
 let windingConflicts=0,overSubscribed=0;
 for(let i=0;i<indices.length;i+=3){
  const tri=indices.slice(i,i+3);
  const a=positions[tri[0]],b=positions[tri[1]],c=positions[tri[2]];
  if(length(cross(vec(b,a),vec(c,a)))<1e-9)err('DEGENERATE_SOURCE_TRIANGLE');
  for(const [s,t] of [[tri[0],tri[1]],[tri[1],tri[2]],[tri[2],tri[0]]]){
   const k=edgeKey(s,t),e=map.get(k);
   if(e){e.uses++;if(e.from===s)e.sameDirection++;}
   else map.set(k,{from:s,to:t,uses:1,sameDirection:0});
  }
 }
 const boundary=[];
 for(const e of map.values()){
  if(e.uses===1)boundary.push(e);
  else if(e.uses>2)overSubscribed++;
  else if(e.sameDirection>0)windingConflicts++;
 }
 if(overSubscribed||windingConflicts)err('NONMANIFOLD_OR_WINDING_SOURCE_BLOCK');
 if(!boundary.length)err('NO_OPEN_BOUNDARY_TO_REPAIR');
 if(boundary.length>48)err('TOO_MANY_BOUNDARY_EDGES');
 const next=new Map(),prev=new Map();
 for(const e of boundary){
  if(next.has(e.from)||prev.has(e.to))err('BRANCHED_OR_INCONSISTENT_BOUNDARY');
  next.set(e.from,e.to);prev.set(e.to,e.from);
 }
 if(next.size!==prev.size)err('OPEN_NONCYCLIC_BOUNDARY');
 const visited=new Set(),loops=[];
 for(const first of next.keys()){
  if(visited.has(first))continue;
  const ids=[],loc=new Set();
  let current=first;
  while(!loc.has(current)&&ids.length<=12){
   if(visited.has(current))err('INTERCONNECTED_BOUNDARY_LOOPS');
   loc.add(current);visited.add(current);ids.push(current);
   if(!next.has(current))err('OPEN_NONCYCLIC_BOUNDARY');
   current=next.get(current);
  }
  if(current!==first||ids.length<3||ids.length>8)
   err('LOOP_NOT_CLOSED_OR_TOO_LARGE');
  if(loops.length>=maximumHoles)err('TOO_MANY_INDEPENDENT_HOLES');
  const pts=ids.map(i=>positions[i]);
  const origin=pts[0];
  // Newell normal is stable for polygons with >3 vertices.
  let norm=[0,0,0];
  for(let i=0;i<pts.length;i++){
   const p=pts[i],q=pts[(i+1)%pts.length];
   norm[0]+=(p[1]-q[1])*(p[2]+q[2]);
   norm[1]+=(p[2]-q[2])*(p[0]+q[0]);
   norm[2]+=(p[0]-q[0])*(p[1]+q[1]);
  }
  const len=length(norm);
  if(len<1e-9)err('HOLE_SURFACE_AREA_TOO_SMALL');
  norm=norm.map(v=>v/len);
  const maxPlanarityMm=Math.max(...pts.map(p=>Math.abs(dot(vec(p,origin),norm))*1000));
  if(maxPlanarityMm>0.5)err('HOLE_TOO_NONPLANAR_FOR_SAFE_PATCH');
  let maxSpan=0;
  for(const p of pts)for(const q of pts)
   maxSpan=Math.max(maxSpan,length(vec(p,q))*1000);
  if(maxSpan>maximumHoleDiameterMm)err('HOLE_EXCEEDS_ALLOWED_DIAMETER');
  const ax=norm.map(Math.abs).indexOf(Math.max(...norm.map(Math.abs)));
  const coord=p=>ax===0?[p[1],p[2]]:ax===1?[p[0],p[2]]:[p[0],p[1]];
  const coords=pts.map(coord);
  let direction=0;
  for(let i=0;i<coords.length;i++){
   const [a,b,c]=[coords[i],coords[(i+1)%coords.length],coords[(i+2)%coords.length]];
   const det=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
   if(Math.abs(det)<1e-8)err('HOLE_HAS_DEGENERATE_CORNER');
   const sign=Math.sign(det);
   if(direction&&direction!==sign)err('HOLE_IS_CONCAVE_REQUIRES_EXPLICIT_REVIEW');
   direction=sign;
  }
  const patchTriangles=[];
  // Invert the boundary winding inherited from the untouched source.
  for(let i=1;i<ids.length-1;i++){
   const tri=[ids[0],ids[i+1],ids[i]];
   const v=tri.map(j=>positions[j]);
   const areaMm2=length(cross(vec(v[1],v[0]),vec(v[2],v[0])))*500000;
   if(areaMm2<1)err('PATCH_SLIVER_TRIANGLE_BLOCK');
   patchTriangles.push(tri);
  }
  loops.push({
   originalBoundaryVertexIds:ids,
   diameterMm:round(maxSpan),maxPlanarityErrorMm:round(maxPlanarityMm),
   originalBoundaryEdges:ids.length,sourceCoordinatePatchOnly:true,
   addedFaces:patchTriangles
  });
 }
 if(visited.size!==boundary.length)err('BOUNDARY_INCOMPLETE');
 return {loops,boundaryEdges:boundary.length};
}
export function createAIGReal3DOBJLocalPatchWorkingCopy({
 objText,heightMm,upAxis='Y',sourceSha256,sourceName='original.obj',
 maximumHoleDiameterMm=100,maximumHoles=2,authorizeWorkingCopy=false
}={}){
 if(!authorizeWorkingCopy)err('EXPLICIT_WORKING_COPY_REQUEST_REQUIRED');
 if(!SHA.test(sourceSha256??''))err('SOURCE_SHA_REQUIRED');
 if(typeof sourceName!=='string'||!sourceName.toLowerCase().endsWith('.obj'))
  err('OBJ_SOURCE_REQUIRED');
 if(!Number.isInteger(heightMm)||heightMm<900||heightMm>2200||
 !['Y','Z'].includes(upAxis))
  err('CALIBRATED_HEIGHT_AXIS_REQUIRED');
 if(!Number.isFinite(maximumHoleDiameterMm)||maximumHoleDiameterMm<5||
 maximumHoleDiameterMm>100||!Number.isInteger(maximumHoles)||
 maximumHoles<1||maximumHoles>4)err('PATCH_BOUNDS_INVALID');
 const {original,indices}=parseAIGScanNativeOBJ(objText);
 const positions=sourceWorldPositions(original,heightMm,upAxis);
 const boundary=findBoundaryLoops(positions,indices,{
  maximumHoleDiameterMm,maximumHoles
 });
 const added=boundary.loops.flatMap(l=>l.addedFaces);
 if(indices.length/3+added.length>180000)err('MAX_TRIANGLE_BUDGET');
 const baseSource=objText.endsWith('\n')?objText:objText+'\n';
 const appended=[
  '# AIG Real3D LOCAL PATCH WORKING COPY - ORIGINAL SOURCE UNCHANGED',
  '# source_sha256 '+sourceSha256,
  'g aig_working_copy_small_planar_hole_patch',
  ...added.map(tri=>'f '+tri.map(i=>i+1).join(' ')),
  ''
 ].join('\n');
 const candidateObjText=baseSource+appended;
 const inspected=buildAIGReal3DScanNative({
  objText:candidateObjText,heightMm,upAxis,sourceName:'candidate.obj',
  sourceSha256
 });
 if(inspected.evidence.openEdges!==0||
 inspected.evidence.nonManifoldEdges!==0||
 inspected.evidence.degenerateTriangles!==0)
  err('CANDIDATE_MESH_TOPOLOGY_VERIFICATION_BLOCK');
 return {
  schema:AIG_REAL3D_LOCAL_PATCH_SCHEMA,
  sourceSha256,sourceName,heightMm,upAxis,
  workingCopyCandidateObjText:candidateObjText,
  addedFaceCount:added.length,
  repairedSourceBoundaryEdges:boundary.boundaryEdges,
  sourceOriginalVertices:original.length,
  candidateVertices:inspected.evidence.actualVertices,
  candidateTriangles:inspected.evidence.actualTriangles,
  reconstructedLoopEvidence:boundary.loops,
  existingVerticesChanged:false,existingFacesChanged:false,
  addedOnlyPlanarFacesOnExistingSourceVertices:true,
  verifiedCandidateTopologyClosed:true,
  sourceModelNotOverwritten:true,
  shapeAndBodyAnatomyNotReconstructed:true,
  realHumanAppearanceVerified:false,
  autoReleasePASS:false
 };
}
