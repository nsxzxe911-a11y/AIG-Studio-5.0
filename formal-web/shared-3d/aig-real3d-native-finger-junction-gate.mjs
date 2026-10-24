/**
 * Real3D V1: source-native hand/finger root seam and articulation inspection.
 *
 * Operates only on the original, pre-GPU-chunk GLOBAL indexed XYZ triangles.
 * Optional additional source-coordinate landmarks:
 *   left|right + Thumb|Index|Middle|Ring|Pinky + Base|Middle
 * These 20 points are declared observations, NOT automatically inferred joints.
 * Neither landmark bend nor face-normal smoothing certifies actual articulation.
 * Absolutely NO mesh changes, source welding, procedural fingers or fake scans.
 */
import {AIG_REAL3D_DENSE_SOURCE_SCHEMA}
 from './aig-real3d-dense-source-obj.mjs';
import {AIG_REAL3D_DENSE_ANATOMY_SCHEMA}
 from './aig-real3d-dense-anatomy-review.mjs';
import {AIG_REAL3D_DENSE_DIGIT_BRANCH_SCHEMA}
 from './aig-real3d-dense-digit-branch-gate.mjs';
export const AIG_REAL3D_FINGER_JUNCTION_SCHEMA=
 'AIG_REAL3D_NATIVE_FINGER_ROOT_JOINT_SURFACE_EVIDENCE_V1';
const SHA=/^[a-f0-9]{64}$/i;
const FINGERS=['Thumb','Index','Middle','Ring','Pinky'];
const SIDES=['left','right'];
const clamp=x=>Math.min(1,Math.max(-1,x));
const norm=(a)=>Math.hypot(a[0],a[1],a[2]);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const round=x=>Math.round(x*1000)/1000;
const fail=code=>{throw Error('FINGER_JUNCTION_'+code);};
const percentile=(array,fraction)=>{
 if(!array.length)return null;
 array.sort((a,b)=>a-b);
 return round(array[Math.ceil(array.length*fraction)-1]);
};
const key=(a,b)=>Math.min(a,b)*350001+Math.max(a,b);
const point=(flat,i)=>[flat[i*3],flat[i*3+1],flat[i*3+2]];
function validate({sourceGeometry:g,sourceEvidence:e,sourceSha256,anatomy,digitBranching}){
 if(!SHA.test(sourceSha256??'')||e?.schema!==AIG_REAL3D_DENSE_SOURCE_SCHEMA||
  e.sourceSha256!==sourceSha256||
  anatomy?.schema!==AIG_REAL3D_DENSE_ANATOMY_SCHEMA||
  anatomy.sourceSha256!==sourceSha256||
  digitBranching?.schema!==AIG_REAL3D_DENSE_DIGIT_BRANCH_SCHEMA||
  digitBranching.sourceSha256!==sourceSha256||
  digitBranching.originalVertexCount!==e.originalVertexCount||
  digitBranching.originalTriangleCount!==e.originalTriangleCount||
  !g?.originalGlobalIndexSpace||g.noChunkBoundarySeamInference!==true||
  !(g.positions instanceof Float32Array)||
  !(g.indices instanceof Uint32Array)||
  g.positions.length!==e.originalVertexCount*3||
  g.indices.length!==e.originalTriangleCount*3||
  e.originalVertexCount>350000||e.originalTriangleCount>700000||
  e.originalTriangleCount!==e.renderedTriangleCount||
  !Number.isFinite(g.metersPerRawUnit)||g.metersPerRawUnit<=0||
  !['Y','Z'].includes(e.upAxis)||!Number.isInteger(e.heightMm))
  fail('VERIFIED_GLOBAL_ORIGINAL_SOURCE_REQUIRED');
 return {g,e};
}
function toWorld(p,g,upAxis){
 const q=upAxis==='Z'?[p[0],p[2],-p[1]]:p;
 const lo=g.rotatedSourceBoundsMin,hi=g.rotatedSourceBoundsMax;
 const s=g.metersPerRawUnit;
 return [(q[0]-(lo[0]+hi[0])/2)*s,(q[1]-lo[1])*s,
  (q[2]-(lo[2]+hi[2])/2)*s];
}
function snap(p,positions){
 let id=-1,d2=Infinity;
 for(let i=0;i<positions.length/3;i++){
  const q=point(positions,i),d=sub(q,p),score=dot(d,d);
  if(score<d2){d2=score;id=i;}
 }
 return {originalVertexIndex:id,offsetMm:round(Math.sqrt(d2)*1000)};
}
function regionSurface({positions,indices,at,radius}){
 const count=positions.length/3,inside=new Uint8Array(count);
 let vertices=0;
 const r2=radius*radius;
 for(let i=0;i<count;i++){
  const q=point(positions,i),d=sub(q,at);
  if(dot(d,d)<=r2){inside[i]=1;vertices++;}
 }
 const edges=new Map(),lengths=[],areas=[],foldAngles=[];
 let triangles=0,degenerate=0;
 for(let k=0;k<indices.length;k+=3){
  const a=indices[k],b=indices[k+1],c=indices[k+2];
  if(a>=count||b>=count||c>=count)fail('CORRUPT_SOURCE_TRIANGLE_INDEX');
  if(!inside[a]&&!inside[b]&&!inside[c])continue;
  triangles++;
  const p=point(positions,a),q=point(positions,b),r=point(positions,c);
  const v=sub(q,p),w=sub(r,p),normal=cross(v,w),magnitude=norm(normal);
  if(magnitude<1e-11)degenerate++;
  const uv=[a,b,c],pairs=[[a,b],[b,c],[c,a]];
  const span=Math.max(norm(v),norm(w),norm(sub(r,q)))*1000;
  lengths.push(span);areas.push(magnitude*500000);
  for(const [start,end] of pairs){
   if(!inside[start]&&!inside[end])continue;
   const id=key(start,end),existing=edges.get(id);
   const n=magnitude?normal.map(t=>t/magnitude):null;
   if(existing){
    existing.uses++;
    if(start===existing.a)existing.sameDirection++;
    if(existing.firstNormal&&n)
     foldAngles.push(Math.acos(clamp(dot(existing.firstNormal,n)))*180/Math.PI);
   }else edges.set(id,{a:start,uses:1,sameDirection:0,firstNormal:n});
  }
 }
 let boundaryEdges=0,nonManifoldEdges=0,windingConflicts=0;
 for(const edge of edges.values()){
  if(edge.uses===1)boundaryEdges++;
  if(edge.uses>2)nonManifoldEdges++;
  if(edge.uses===2&&edge.sameDirection===1)windingConflicts++;
 }
 return {
  originalSourceVerticesWithinRadius:vertices,
  originalSourceTrianglesTouchingRadius:triangles,
  originalIndexedEdgesTouchingRadius:edges.size,
  sourceOpenEdges:boundaryEdges,sourceNonManifoldEdges:nonManifoldEdges,
  sourceWindingConflicts:windingConflicts,sourceDegenerateTriangles:degenerate,
  longestSourceTriangleEdgeP95Mm:percentile(lengths,.95),
  sourceTriangleAreaP95Mm2:percentile(areas,.95),
  unsignedAdjacentFaceNormalDeltaP95Degrees:percentile(foldAngles,.95),
  originalTrianglesUsedNotGpuChunks:true
 };
}
export function auditAIGReal3DFingerJointSurface({
 sourceGeometry,sourceEvidence,sourceSha256,
 anatomy,digitBranching,landmarks=null
}={}){
 const {g,e}=validate({sourceGeometry,sourceEvidence,sourceSha256,anatomy,digitBranching});
 if(landmarks!==null&&
  (typeof landmarks!=='object'||Array.isArray(landmarks)||Object.keys(landmarks).length>90))
  fail('INVALID_ANNOTATION_DOCUMENT');
 const positions=g.positions,indices=g.indices;
 // The 27 baseline points remain required upstream; this layer adds 20
 // optional observations. Absence is a diagnostic BLOCK, never interpolation.
 const fingerReports=[],missingAdditional=[],maxSnapMm=Math.max(3,e.heightMm*.003);
 for(const side of SIDES){
  const hand=digitBranching.handReports.find(h=>h.side===side);
  if(!hand)fail('MISSING_PRIOR_SOURCE_HAND_REPORT');
  for(const finger of FINGERS){
   const names=[side+finger+'Base',side+finger+'Middle',side+finger+'Tip'];
   const absent=names.filter(name=>!Array.isArray(landmarks?.[name])||
    landmarks[name].length!==3||!landmarks[name].every(
     x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<1e6));
   missingAdditional.push(...absent.filter(n=>n.endsWith('Base')||n.endsWith('Middle')));
   const record={
    side,finger,requiredSourceMarkerNames:names,missingMarkers:absent,
    originalIndexSurfaceOnly:true,materialOrShaderCurvatureIgnored:true,
    sourceFingerArticulationIndependentlyVerified:false,
    naturalKnuckleAnatomyPASS:false
   };
   if(absent.length){
    fingerReports.push({...record,technicalStatus:'BLOCK_MISSING_3D_MARKERS',
     warningCodes:['JOINT_SOURCE_COORDINATES_NOT_PROVIDED']});continue;
   }
   const mapped=names.map(name=>{
    const world=toWorld(landmarks[name],g,e.upAxis);
    return {name,world,...snap(world,positions)};
   });
   const a=mapped[0].world,b=mapped[1].world,c=mapped[2].world,
    ab=sub(a,b),cb=sub(c,b),lab=norm(ab),lbc=norm(cb);
   const angle=lab>1e-8&&lbc>1e-8?
    Math.acos(clamp(dot(ab,cb)/(lab*lbc)))*180/Math.PI:null;
   // 0 = geometrically straight; this measures coordinates only.
   const declaredBendDegrees=angle===null?null:round(180-angle);
   const rootRadius=Math.max(.006,Math.min(.02,lab*.45));
   const jointRadius=Math.max(.005,Math.min(.018,Math.min(lab,lbc)*.45));
   const baseRegion=regionSurface({positions,indices,at:a,radius:rootRadius});
   const middleRegion=regionSurface({positions,indices,at:b,radius:jointRadius});
   const maxOffset=Math.max(...mapped.map(m=>m.offsetMm));
   const warnings=[];
   if(maxOffset>maxSnapMm)warnings.push('JOINT_MARKER_TOO_FAR_FROM_ORIGINAL_MESH');
   if(angle===null||lab<.003||lbc<.003||declaredBendDegrees>170)
    warnings.push('JOINT_BEND_MARKER_GEOMETRY_INVALID');
   if(!baseRegion.originalSourceTrianglesTouchingRadius||
    !middleRegion.originalSourceTrianglesTouchingRadius)
    warnings.push('JOINT_OR_PALM_MISSING_ORIGINAL_TRIANGLES');
   if(baseRegion.sourceOpenEdges||middleRegion.sourceOpenEdges)
    warnings.push('JOINT_OR_PALM_ORIGINAL_OPEN_SEAM');
   if(baseRegion.sourceNonManifoldEdges||middleRegion.sourceNonManifoldEdges)
    warnings.push('JOINT_OR_PALM_ORIGINAL_NONMANIFOLD');
   if(baseRegion.sourceWindingConflicts||middleRegion.sourceWindingConflicts)
    warnings.push('JOINT_OR_PALM_ORIGINAL_WINDING_CONFLICT');
   if(baseRegion.sourceDegenerateTriangles||middleRegion.sourceDegenerateTriangles)
    warnings.push('JOINT_OR_PALM_DEGENERATE_SOURCE_TRIANGLES');
   const fold=middleRegion.unsignedAdjacentFaceNormalDeltaP95Degrees;
   if(fold!==null&&fold>65)
    warnings.push('ABRUPT_JOINT_SURFACE_FACET_TRANSITION_REVIEW');
   if(declaredBendDegrees!==null&&declaredBendDegrees>20&&fold!==null&&fold<1)
    warnings.push('BENT_MARKERS_WITHOUT_MEASURABLE_LOCAL_SURFACE_BEND');
   if(hand.technicalFiveDistalBranchesObserved!==true)
    warnings.push('PRIOR_FIVE_DISTAL_BRANCH_STRUCTURE_NOT_OBSERVED');
   fingerReports.push({
    ...record,markerSnapEvidence:mapped.map(x=>({
     name:x.name,originalVertexIndex:x.originalVertexIndex,
     sourceSurfaceOffsetMm:x.offsetMm
    })),declaredMarkerBendDegrees:declaredBendDegrees,
    palmRootRegion:baseRegion,middleJointRegion:middleRegion,
    technicalStatus:warnings.length?'REVIEW_BLOCK':'SURFACE_METRICS_OBSERVED',
    warningCodes:warnings,
    geometricBendIsNotProofOfSkinDeformation:true
   });
  }
 }
 return {
  schema:AIG_REAL3D_FINGER_JUNCTION_SCHEMA,sourceSha256,
  originalVertexCount:e.originalVertexCount,
  originalTriangleCount:e.originalTriangleCount,
  requiredAdditionalSourceMarkers:20,
  missingAdditionalSourceMarkers:missingAdditional,
  fingersReported:fingerReports.length,fingers:fingerReports,
  fingersWithTechnicalWarnings:fingerReports.filter(f=>f.warningCodes.length).length,
  technicalSurfaceMetricsObservable:fingerReports.every(f=>f.technicalStatus==='SURFACE_METRICS_OBSERVED'),
  actualJointMotionNotEstablishedFromStaticMesh:true,
  cannotCertifyStraightVsBentRealHumanFromLabelsAlone:true,
  sourceCoordinatesAndTrianglesNeverModified:true,
  highDensityGPUChunkBoundariesExcludedFromSurfaceTopology:true,
  trueHumanSourceAuthenticated:false,naturalFingerAndPalmAnatomyPASS:false,
  animationRigPASS:false,releasePASS:false
 };
}
