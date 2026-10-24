/**
 * Two independent, explicit-weight source 3D finger channels -> sampled timeline.
 * NOT a skeletal hierarchy; overlapping vertex weights are BLOCK, not blended.
 * Tri-tri collision checks cover affected source triangles, not unrelated body.
 * No fabricated joints, no voxel skin, no changes to original high-density OBJ.
 */
import {createAIGReal3DWeightedFingerPose} from './aig-real3d-weighted-motion-working-copy.mjs';
export const AIG_REAL3D_DUAL_TIMELINE_SCHEMA='AIG_REAL3D_DUAL_WEIGHTED_MOTION_SAMPLED_TIMELINE_V1';
const fail=x=>{throw Error('REAL3D_DUAL_'+x);};
const sq=(x)=>x*x;
const pos=(v,i)=>[v[3*i],v[3*i+1],v[3*i+2]];
const delta=(p,q)=>[p[0]-q[0],p[1]-q[1],p[2]-q[2]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=p=>Math.hypot(...p);
const round=x=>Math.round(x*1000)/1000;
const edge=(a,b,v)=>len(delta(pos(v,a),pos(v,b)));
function segmentTriangle(a,b,p,q,r){
 const d=delta(b,a),u=delta(q,p),v=delta(r,p),h=cross(d,v);
 const det=dot(u,h);
 if(Math.abs(det)<1e-11)return false; // coplanar cases not certified
 const inv=1/det,s=delta(a,p),t=dot(s,h)*inv;
 if(t<=1e-7||t>=1-1e-7)return false;
 const k=cross(s,u),w=dot(d,k)*inv;
 if(w<=1e-7||t+w>=1-1e-7)return false;
 const time=dot(v,k)*inv;
 return time>1e-7&&time<1-1e-7;
}
function trianglesCross(v,a,b){
 const pa=a.map(i=>pos(v,i)),pb=b.map(i=>pos(v,i));
 for(let k=0;k<3;k++){
  if(segmentTriangle(pa[k],pa[(k+1)%3],...pb))return true;
  if(segmentTriangle(pb[k],pb[(k+1)%3],...pa))return true;
 }
 return false;
}
function affectedTriangles(indices,selectedVertices){
 const out=[];
 for(let k=0;k<indices.length;k+=3)if(
  selectedVertices.has(indices[k])||selectedVertices.has(indices[k+1])||
  selectedVertices.has(indices[k+2]))
  out.push([indices[k],indices[k+1],indices[k+2]]);
 return out;
}
function bounding(tri,positions){
 const pts=tri.map(i=>pos(positions,i));
 return {tri,minimum:[0,1,2].map(axis=>Math.min(...pts.map(p=>p[axis]))),
  maximum:[0,1,2].map(axis=>Math.max(...pts.map(p=>p[axis])))};
}
function contacts(positions,first,second,maxPairs=150000){
 // The index mapping remains global; triangles sharing an original vertex are
 // continuous surface neighbors and excluded from self-contact reporting.
 const A=first.map(t=>bounding(t,positions)),B=second.map(t=>bounding(t,positions))
  .sort((x,y)=>x.minimum[0]-y.minimum[0]);
 let pairsBroadphase=0,pairsNarrowphase=0,intersections=0,exhausted=false,\n  examinedCandidatePairs=0;
 for(const a of A){
  for(const b of B){
   if(b.minimum[0]>a.maximum[0])break;
   if(b.maximum[0]<a.minimum[0]||
    b.minimum[1]>a.maximum[1]||b.maximum[1]<a.minimum[1]||
    b.minimum[2]>a.maximum[2]||b.maximum[2]<a.minimum[2])continue;
   if(a.tri.some(i=>b.tri.includes(i))||
    a.tri[0]===b.tri[0]&&a.tri[1]===b.tri[1]&&a.tri[2]===b.tri[2])continue;
   pairsBroadphase++;
   if(pairsBroadphase>maxPairs){exhausted=true;break;}
   pairsNarrowphase++;
   if(trianglesCross(positions,a.tri,b.tri))intersections++;
  }
  if(exhausted)break;
 }
 return {
  firstChannelAffectedSourceTriangles:first.length,
  secondChannelAffectedSourceTriangles:second.length,
  aabbOverlappingNonadjacentPairs:pairsBroadphase,\n  totalBroadphaseCandidatesVisited:examinedCandidatePairs,
  exactNoncoplanarTrianglePairsTested:pairsNarrowphase,
  observedSourceTriangleIntersections:intersections,
  pairTestBudget:maxPairs,budgetExhausted:exhausted,
  untestedCoplanarOrTangentialCases:true,
  observedContactAtSample:intersections>0,
  exhaustiveWholeBodyCollisionFreeProof:false
 };
}
export function inspectAIGReal3DLocalSourceTriangleContact({
 positions,firstTriangles,secondTriangles,maxPairs=150000
}={}){
 if(!(positions instanceof Float32Array)||positions.length%3!==0||
  !Array.isArray(firstTriangles)||!Array.isArray(secondTriangles)||
  !Number.isInteger(maxPairs)||maxPairs<1||maxPairs>200000||
  [...firstTriangles,...secondTriangles].some(t=>!Array.isArray(t)||t.length!==3||
   t.some(i=>!Number.isInteger(i)||i<0||i>=positions.length/3)))
  fail('TRIANGLE_CONTACT_INPUT_INVALID');
 return contacts(positions,firstTriangles,secondTriangles,maxPairs);
}
function deformation(original,posed,indices){
 let maxStretch=0,maxCompress=0,flipped=0,collapsed=0,changed=0;
 for(let k=0;k<indices.length;k+=3){
  const a=indices[k],b=indices[k+1],c=indices[k+2];
  let dirty=false;
  for(const i of [a,b,c])for(let d=0;d<3;d++)
   if(original[3*i+d]!==posed[3*i+d])dirty=true;
  if(!dirty)continue;
  changed++;
  for(const [x,y] of [[a,b],[b,c],[c,a]]){
   const prior=edge(x,y,original),after=edge(x,y,posed);
   if(prior>1e-9){
    maxStretch=Math.max(maxStretch,(after/prior-1)*100);
    maxCompress=Math.max(maxCompress,(1-after/prior)*100);
   }
  }
  const p=pos(original,a),q=pos(original,b),r=pos(original,c);
  const x=pos(posed,a),y=pos(posed,b),z=pos(posed,c);
  const n=cross(delta(q,p),delta(r,p)),m=cross(delta(y,x),delta(z,x));
  if(len(m)<1e-11||len(m)/Math.max(1e-20,len(n))<.01)collapsed++;
  if(dot(n,m)<-1e-12)flipped++;
 }
 return {changedOriginalTriangles:changed,
  maxSourceEdgeStretchPercent:round(maxStretch),
  maxSourceEdgeCompressionPercent:round(maxCompress),
  invertedSourceTriangles:flipped,nearCollapsedSourceTriangles:collapsed,
  sourceTriangleCountUnchanged:indices.length/3};
}
function validateManifestPair(dense,manifests,angles,frameCount){
 const src=dense?.sourceGeometry,e=dense?.evidence;
 if(!(src?.positions instanceof Float32Array)||
  !(src.indices instanceof Uint32Array)||!src.originalGlobalIndexSpace||
  !Array.isArray(manifests)||manifests.length!==2||
  !Array.isArray(angles)||angles.length!==2||
  !angles.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=45)||
  !Number.isInteger(frameCount)||frameCount<3||frameCount>9||
  manifests.some(m=>m?.schema!=='AIG_REAL3D_EXPLICIT_VERTEX_WEIGHTS_V1'||
   m.sourceSha256!==e?.sourceSha256||m.sourceVertexCount!==e.originalVertexCount))
  fail('TWO_SOURCE_BOUND_CHANNELS_REQUIRED');
 if(manifests[0].side===manifests[1].side&&
  manifests[0].finger===manifests[1].finger)
  fail('SEPARATE_FINGER_CHANNELS_REQUIRED');
 const a=new Set(manifests[0].vertexWeights?.map(x=>x[0])??[]);
 const b=new Set(manifests[1].vertexWeights?.map(x=>x[0])??[]);
 if(a.size!==manifests[0].vertexWeights?.length||
  b.size!==manifests[1].vertexWeights?.length)fail('DUPLICATE_GLOBAL_VERTEX_WEIGHTS');
 for(const i of a)if(b.has(i))fail('OVERLAPPING_INDEPENDENT_CHANNELS_REQUIRE_HIERARCHICAL_RIG');
 return {a,b};
}
export function createAIGReal3DDualFingerTimeline({
 dense,fingerJunction,weightManifests,targetAnglesDeg=[20,-20],frameCount=5,
 maxContactPairs=150000
}={}){
 const {a,b}=validateManifestPair(dense,weightManifests,targetAnglesDeg,frameCount);
 if(!Number.isInteger(maxContactPairs)||maxContactPairs<1||maxContactPairs>200000)
  fail('CONTACT_BUDGET_INVALID');
 const zeroA=createAIGReal3DWeightedFingerPose({
  dense,fingerJunction,weightManifest:weightManifests[0],angleDeg:0
 });
 const zeroB=createAIGReal3DWeightedFingerPose({
  dense,fingerJunction,weightManifest:weightManifests[1],angleDeg:0
 });
 const origin=dense.sourceGeometry.positions,indices=dense.sourceGeometry.indices;
 const first=affectedTriangles(indices,a),second=affectedTriangles(indices,b),frames=[];
 let anyContact=false,contactIncomplete=false,maxStretch=0,maxCompress=0;
 for(let i=0;i<frameCount;i++){
  const progress=i/(frameCount-1),
   angles=targetAnglesDeg.map(deg=>deg*progress);
  const poseA=progress===0?zeroA:createAIGReal3DWeightedFingerPose({
   dense,fingerJunction,weightManifest:weightManifests[0],angleDeg:angles[0]
  });
  const poseB=progress===0?zeroB:createAIGReal3DWeightedFingerPose({
   dense,fingerJunction,weightManifest:weightManifests[1],angleDeg:angles[1]
  });
  const positions=new Float32Array(origin);
  for(const x of a)for(let axis=0;axis<3;axis++){
   const k=x*3+axis;positions[k]=poseA.workingCopyPositions[k];
  }
  for(const x of b)for(let axis=0;axis<3;axis++){
   const k=x*3+axis;positions[k]=poseB.workingCopyPositions[k];
  }
  const stretch=deformation(origin,positions,indices);
  const collision=contacts(positions,first,second,maxContactPairs);
  anyContact ||=collision.observedContactAtSample;
  contactIncomplete ||=collision.budgetExhausted;
  maxStretch=Math.max(maxStretch,stretch.maxSourceEdgeStretchPercent);
  maxCompress=Math.max(maxCompress,stretch.maxSourceEdgeCompressionPercent);
  frames.push({frameIndex:i,progress:round(progress),
   angleDegrees:angles.map(round),workingCopyPositions:positions,
   deformation:stretch,contact:collision,
   sourceOriginalTriangles:indices.length/3,
   actualGlobalXYZWorkingCopy:true});
 }
 return {
  schema:AIG_REAL3D_DUAL_TIMELINE_SCHEMA,
  sourceSha256:dense.evidence.sourceSha256,
  sourceOriginalVertices:origin.length/3,sourceOriginalTriangles:indices.length/3,
  channels:weightManifests.map((m,i)=>({
   side:m.side,finger:m.finger,joint:m.joint,
   explicitlyWeightedOriginalVertices:i===0?a.size:b.size,
   requestedFinalAngleDeg:targetAnglesDeg[i]})),
  frames,frameCount,diagnostics:{
   observedInterpenetratingTrianglePairsInSampledFrames:anyContact,
   broadphaseOrNarrowphaseBudgetExhausted:contactIncomplete,
   maxSourceEdgeStretchPercent:maxStretch,maxSourceEdgeCompressionPercent:maxCompress,
   samplingDoesNotProveCollisionFreeBetweenFrames:true,
   overlappingInfluenceWeightsRejected:true,
   selfCollisionAgainstRestOfBodyNotYetInspected:true,
   independentTwoChannelWeightsNotHierarchicalSkeleton:true,
   naturalSkinAndPhysicallyValidMotionVerified:false,
   trueHumanScanAuthenticated:false,
   animationRigPASS:false,releasePASS:false
  },
  sourceGlobalPositionsNotModified:true,sourceGlobalTriangleIndicesNotModified:true,
  releasePASS:false
 };
}
