/**
 * Conservative nonplanar OBJ hole interpolation on an IMMUTABLE working copy.
 * Real existing indexed XYZ + adjacent face evidence; NOT anatomy synthesis.
 * Different from existing strictly planar small-hole repair.
 */
import {parseAIGScanNativeOBJ,buildAIGReal3DScanNative} from './aig-real3d-scan-native-mesh.mjs';
export const AIG_REAL3D_CURVED_PATCH_SCHEMA='AIG_REAL3D_CURVED_SOURCE_JUNCTION_WORKING_COPY_V1';
const SHA=/^[a-f0-9]{64}$/i;
const fail=x=>{throw Error('REAL3D_CURVED_PATCH_'+x);};
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const avg=points=>[0,1,2].map(i=>points.reduce((n,p)=>n+p[i],0)/points.length);
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const mag=x=>Math.hypot(...x);
const unit=x=>x.map(v=>v/(mag(x)||1));
const mul=(p,v)=>p.map(x=>x*v);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const rnd=v=>Math.round(v*100000)/100000;
const key=(a,b)=>a<b?a+':'+b:b+':'+a;
function worldData(raw,heightMm,upAxis){
 const rotated=raw.map(p=>upAxis==='Z'?[p[0],p[2],-p[1]]:[...p]),
  lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const p of rotated)for(let i=0;i<3;i++){
  lo[i]=Math.min(lo[i],p[i]);hi[i]=Math.max(hi[i],p[i]);
 }
 if(hi[1]-lo[1]<1e-8)fail('ZERO_SOURCE_HEIGHT');
 const scale=heightMm/1000/(hi[1]-lo[1]);
 const world=rotated.map(p=>[(p[0]-(lo[0]+hi[0])/2)*scale,
  (p[1]-lo[1])*scale,(p[2]-(lo[2]+hi[2])/2)*scale]);
 return {world,scale};
}
export function createAIGReal3DCurvedJunctionWorkingCopy({
 objText,sourceSha256,sourceName='source.obj',heightMm,upAxis='Y',
 authorizeWorkingCopy=false,maxHoleDiameterMm=90,
 maxNonplanarityMm=3,maxFaceBendDegrees=55
}={}){
 if(!authorizeWorkingCopy)fail('EXPLICIT_USER_WORKING_COPY_ACTION_REQUIRED');
 if(!SHA.test(sourceSha256??'')||typeof sourceName!=='string'||
 !sourceName.toLowerCase().endsWith('.obj'))fail('ORIGINAL_OBJ_SHA_REQUIRED');
 if(!Number.isInteger(heightMm)||heightMm<900||heightMm>2200||
 !['Y','Z'].includes(upAxis))fail('SOURCE_CALIBRATION_REQUIRED');
 if(!Number.isFinite(maxHoleDiameterMm)||maxHoleDiameterMm<10||
 maxHoleDiameterMm>100||!Number.isFinite(maxNonplanarityMm)||
 maxNonplanarityMm<=0||maxNonplanarityMm>3||
 !Number.isFinite(maxFaceBendDegrees)||maxFaceBendDegrees<15||
 maxFaceBendDegrees>60)fail('SAFETY_LIMITS_INVALID');
 const {original,indices}=parseAIGScanNativeOBJ(objText);
 const {world,scale}=worldData(original,heightMm,upAxis);
 const edges=new Map(),faceNormals=[];
 let inconsistent=0,nonmanifold=0;
 for(let i=0;i<indices.length;i+=3){
  const ids=indices.slice(i,i+3),p=ids.map(x=>world[x]),
   n=cross(sub(p[1],p[0]),sub(p[2],p[0]));
  if(mag(n)<1e-10)fail('SOURCE_DEGENERATE_TRIANGLE');
  const fid=faceNormals.length;faceNormals.push(unit(n));
  for(const [a,b,c] of [[ids[0],ids[1],ids[2]],
   [ids[1],ids[2],ids[0]],[ids[2],ids[0],ids[1]]]){
   const k=key(a,b),e=edges.get(k);
   if(!e)edges.set(k,{a,b,third:c,face:fid,uses:1,conflicts:0});
   else {e.uses++;if(e.a===a)e.conflicts++;}
  }
 }
 const boundary=[];
 for(const e of edges.values()){
  if(e.uses===1)boundary.push(e);
  if(e.uses>2)nonmanifold++;
  if(e.conflicts)inconsistent++;
 }
 if(nonmanifold||inconsistent)fail('SOURCE_TOPOLOGY_NOT_WATERTIGHT_EXCEPT_SMALL_HOLE');
 if(boundary.length<4||boundary.length>8)fail('ONLY_ONE_FOUR_TO_EIGHT_EDGE_HOLE_SUPPORTED');
 const next=new Map(),back=new Map(),byStart=new Map();
 for(const e of boundary){
  if(next.has(e.a)||back.has(e.b))fail('BRANCHED_BOUNDARY');
  next.set(e.a,e.b);back.set(e.b,e.a);byStart.set(e.a,e);
 }
 const start=boundary[0].a,loop=[],seen=new Set();
 let k=start;
 for(let n=0;n<=boundary.length;n++){
  if(seen.has(k))break;
  if(!next.has(k))fail('BOUNDARY_NOT_CLOSED');
  loop.push(k);seen.add(k);k=next.get(k);
 }
 if(k!==start||loop.length!==boundary.length)fail('MULTIPLE_LOOPS_OR_OPEN_BOUNDARY');
 const pts=loop.map(i=>world[i]),base=avg(pts);
 let newell=[0,0,0],maxSpan=0;
 for(let i=0;i<pts.length;i++){
  const p=pts[i],q=pts[(i+1)%pts.length];
  newell[0]+=(p[1]-q[1])*(p[2]+q[2]);
  newell[1]+=(p[2]-q[2])*(p[0]+q[0]);
  newell[2]+=(p[0]-q[0])*(p[1]+q[1]);
  for(const v of pts)maxSpan=Math.max(maxSpan,mag(sub(p,v)));
 }
 if(mag(newell)<1e-8)fail('BOUNDARY_NORMAL_AMBIGUOUS');
 if(maxSpan*1000>maxHoleDiameterMm)fail('HOLE_TOO_LARGE');
 const normal=unit(newell),
  maxPlane=Math.max(...pts.map(p=>Math.abs(dot(sub(p,base),normal))))*1000;
 if(maxPlane<.01)fail('PLANAR_USE_EXISTING_PATCH_V1');
 if(maxPlane>maxNonplanarityMm)fail('SURFACE_TOO_NONPLANAR_TO_INFER');
 // Orthogonal-plane convexity: a star fan should not bridge outside outline.
 const axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
 const uv=p=>axis===0?[p[1],p[2]]:axis===1?[p[0],p[2]]:[p[0],p[1]];
 let sign=0;
 for(let i=0;i<pts.length;i++){
  const a=uv(pts[i]),b=uv(pts[(i+1)%pts.length]),
   c=uv(pts[(i+2)%pts.length]);
  const x=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
  if(Math.abs(x)<1e-9)fail('COLLINEAR_CORNER');
  if(sign&&Math.sign(x)!==sign)fail('CONCAVE_HOLE_NOT_SAFE_FOR_FAN');
  sign=Math.sign(x);
 }
 // Use adjacent, ORIGINAL triangle third vertices as curvature EVIDENCE.
 // No free-form smoothing; max displacement from boundary centroid 1.5 mm.
 const neighbors=loop.map(i=>world[byStart.get(i).third]);
 const neighborSigned=neighbors.map(p=>dot(sub(p,base),normal));
 const support=neighborSigned.reduce((s,v)=>s+v,0)/neighborSigned.length;
 const offset=Math.max(-.0015,Math.min(.0015,-support*.25));
 const centerWorld=add(base,mul(normal,offset));
 const centerRaw=avg(loop.map(i=>original[i]));
 const corrected=upAxis==='Z'?
  add(centerRaw,[normal[0]*offset/scale,-normal[2]*offset/scale,normal[1]*offset/scale]):
  add(centerRaw,mul(normal,offset/scale));
 const centerIndex=original.length;
 const triangles=[];
 let worstBend=0,minArea=Infinity;
 for(let i=0;i<loop.length;i++){
  const e=byStart.get(loop[i]),tri=[e.b,e.a,centerIndex],
   a=world[tri[0]],b=world[tri[1]],
   plane=cross(sub(b,a),sub(centerWorld,a)),
   length=mag(plane);
  const area=length*500000;
  if(area<1)fail('SLIVER_TRIANGLE_CANDIDATE');
  minArea=Math.min(minArea,area);
  const bend=Math.acos(Math.max(-1,Math.min(1,
   dot(unit(plane),faceNormals[e.face]))))*180/Math.PI;
  worstBend=Math.max(worstBend,bend);
  if(bend>maxFaceBendDegrees)fail('SOURCE_TANGENT_JUNCTION_TOO_SHARP');
  triangles.push(tri);
 }
 const baseText=objText.endsWith('\n')?objText:objText+'\n';
 const candidate=baseText+[
  '# AIG CURVED JUNCTION CANDIDATE - SOURCE OBJ IMMUTABLE',
  '# original_sha256 '+sourceSha256,
  'g aig_curved_junction_candidate',
  'v '+corrected.map(v=>v.toFixed(9)).join(' '),
  ...triangles.map(t=>'f '+t.map(i=>i+1).join(' ')),
  ''
 ].join('\n');
 const verified=buildAIGReal3DScanNative({
  objText:candidate,heightMm,upAxis,sourceName:'working.obj',
  sourceSha256
 });
 if(verified.evidence.openEdges||verified.evidence.nonManifoldEdges||
 verified.evidence.degenerateTriangles)
  fail('POST_PATCH_SOURCE_MESH_TECHNICAL_GATE_FAIL');
 if(verified.evidence.actualVertices!==original.length+1||
 verified.evidence.actualTriangles!==indices.length/3+triangles.length)
  fail('POST_PATCH_VERTEX_FACE_COUNT_INCONSISTENT');
 return {
  schema:AIG_REAL3D_CURVED_PATCH_SCHEMA,sourceSha256,sourceName,
  workingCopyCandidateObjText:candidate,
  sourceVertices:original.length,sourceTriangles:indices.length/3,
  candidateVertices:verified.evidence.actualVertices,
  candidateTriangles:verified.evidence.actualTriangles,
  addedSourceVertices:1,addedSourceTriangles:triangles.length,
  holeBoundaryVertexIDs:loop,
  holeDiameterMm:rnd(maxSpan*1000),boundaryNonplanarityMm:rnd(maxPlane),
  adjacentSourceCurvatureSupportMm:rnd(support*1000),
  centerNormalCorrectionMm:rnd(offset*1000),
  worstAddedToOriginalFaceBendDegrees:rnd(worstBend),
  minimumNewFaceAreaMm2:rnd(minArea),
  candidateSourceTopologyClosed:true,originalFacesAndVerticesNotChanged:true,
  newSourceGeometryIsInterpolatedApproximationNotMeasured:true,
  noInventedAnatomicalHandsHeadFaceFeet:true,
  requiresTrue4ViewReferenceAndHumanReview:true,
  realHumanShapePASS:false,releasePASS:false
 };
}
