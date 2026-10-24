/**
 * Source-native 3-stage FK: Base -> Middle -> Distal.
 * No auto-rig, mesh synthesis, subdivision or original OBJ mutations.
 * Child joints inherit MOVED pivots/axes. Swept AABB is a conservative
 * across-sample risk screen, NOT a continuous triangle collision proof.
 */
import {AIG_REAL3D_DENSE_SOURCE_SCHEMA} from './aig-real3d-dense-source-obj.mjs';
import {AIG_REAL3D_FINGER_JUNCTION_SCHEMA} from './aig-real3d-native-finger-junction-gate.mjs';
import {inspectAIGReal3DLocalSourceTriangleContact}
 from './aig-real3d-dual-channel-timeline.mjs';
export const AIG_REAL3D_THREE_JOINT_SCHEMA=
 'AIG_REAL3D_EXPLICIT_THREE_JOINT_SOURCE_FK_SWEEP_V1';
export const AIG_REAL3D_FAST_SPARSE_FK_SCHEMA=
 'AIG_REAL3D_SPARSE_FK_SOURCE_TOPOLOGY_CACHE_V1';
export const AIG_REAL3D_THREE_JOINT_MANIFEST=
 'AIG_REAL3D_EXPLICIT_THREE_JOINT_WEIGHTS_V1';
const fingerNames=['Thumb','Index','Middle','Ring','Pinky'];
const fail=code=>{throw Error('THREE_JOINT_'+code);};
const sub=(a,b)=>a.map((x,k)=>x-b[k]);
const add=(a,b)=>a.map((x,k)=>x+b[k]);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>Math.hypot(...a);
const round=n=>{const x=Math.round(n*1000)/1000;return Object.is(x,-0)?0:x;};
const vec=p=>Array.isArray(p)&&p.length===3&&p.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<1e6);
const pt=(a,i)=>[a[3*i],a[3*i+1],a[3*i+2]];
function world(p,g,up){
 const q=up==='Z'?[p[0],p[2],-p[1]]:p,lo=g.rotatedSourceBoundsMin,
  hi=g.rotatedSourceBoundsMax,s=g.metersPerRawUnit;
 return [(q[0]-(lo[0]+hi[0])/2)*s,(q[1]-lo[1])*s,
  (q[2]-(lo[2]+hi[2])/2)*s];
}
function rotate(p,pivot,axis,rad){
 const v=sub(p,pivot),co=Math.cos(rad),si=Math.sin(rad),proj=dot(axis,v),
  cr=cross(axis,v);
 return add(pivot,v.map((x,k)=>x*co+si*cr[k]+(1-co)*proj*axis[k]));
}
function rotateAxis(axis,parentAxis,angle){
 const end=rotate(axis,[0,0,0],parentAxis,angle);
 const l=len(end);return end.map(x=>x/l);
}
function closest(worldPoint,positions){
 let dist=Infinity,id=-1;
 for(let i=0;i<positions.length;i+=3){
  const dx=positions[i]-worldPoint[0],dy=positions[i+1]-worldPoint[1],
   dz=positions[i+2]-worldPoint[2],dd=dx*dx+dy*dy+dz*dz;
  if(dd<dist){dist=dd;id=i/3;}
 }
 return {id,meters:Math.sqrt(dist)};
}
function validate(dense,junction,m){
 const e=dense?.evidence,g=dense?.sourceGeometry;
 if(e?.schema!==AIG_REAL3D_DENSE_SOURCE_SCHEMA||
  junction?.schema!==AIG_REAL3D_FINGER_JUNCTION_SCHEMA||
  !/^[a-f0-9]{64}$/i.test(e.sourceSha256??'')||
  junction.sourceSha256!==e.sourceSha256||
  !(g?.positions instanceof Float32Array)||!(g.indices instanceof Uint32Array)||
  g.positions.length!==3*e.originalVertexCount||
  g.indices.length!==3*e.originalTriangleCount||
  !g.originalGlobalIndexSpace||!g.noChunkBoundarySeamInference||
  e.renderedTriangleCount!==e.originalTriangleCount||
  m?.schema!==AIG_REAL3D_THREE_JOINT_MANIFEST||
  m.sourceSha256!==e.sourceSha256||m.sourceVertexCount!==e.originalVertexCount||
  !['left','right'].includes(m.side)||!fingerNames.includes(m.finger)||
  !Array.isArray(m.joints)||m.joints.length!==3||
  m.joints.some((j,i)=>j?.joint!==['Base','Middle','Distal'][i]))
  fail('SOURCE_SHA_EXPLICIT_THREE_STAGE_REQUIRED');
 const report=junction.fingers?.find(x=>x.side===m.side&&x.finger===m.finger);
 if(!report)fail('NATIVE_3D_JOINT_REPORT_MISSING');
 const pivots=[],axes=[],weights=[],snap=[];
 for(const j of m.joints){
  if(!vec(j.pivotSourceXYZ)||!vec(j.axisWorld)||
   !Array.isArray(j.vertexWeights)||j.vertexWeights.length<3||
   j.vertexWeights.length>=e.originalVertexCount)
   fail('SOURCE_JOINT_WEIGHTS_INVALID');
  const pivot=world(j.pivotSourceXYZ,g,e.upAxis),nearest=closest(pivot,g.positions);
  const originalMarker=report.markerSnapEvidence?.find(
   x=>x.name===m.side+m.finger+j.joint);
  if(j.joint!=='Distal'&&!originalMarker)fail('BASE_MIDDLE_MARKERS_NOT_PRESENT');
  if(originalMarker&&len(sub(pivot,pt(g.positions,originalMarker.originalVertexIndex)))>.006)
   fail('ORIGINAL_JOINT_MARKER_MISMATCH');
  if(nearest.meters>.006)fail('JOINT_PIVOT_NOT_ON_NATIVE_SOURCE');
  const mag=len(j.axisWorld);
  if(mag<.5||mag>2)fail('JOINT_AXIS_INVALID');
  const w=new Float32Array(e.originalVertexCount),seen=new Set();
  for(const pair of j.vertexWeights){
   if(!Array.isArray(pair)||pair.length!==2||!Number.isInteger(pair[0])||
    pair[0]<0||pair[0]>=w.length||typeof pair[1]!=='number'||
    !Number.isFinite(pair[1])||pair[1]<=0||pair[1]>1||seen.has(pair[0]))
    fail('DUPLICATE_OR_INVALID_ORIGINAL_VERTEX_WEIGHT');
   w[pair[0]]=pair[1];seen.add(pair[0]);
  }
  pivots.push(pivot);axes.push(j.axisWorld.map(x=>x/mag));weights.push(w);
  snap.push({joint:j.joint,closestOriginalVertexIndex:nearest.id,
   distanceToSourceMm:round(nearest.meters*1000)});
 }
 if(len(sub(pivots[0],pivots[1]))<.001||
  len(sub(pivots[1],pivots[2]))<.001||
  len(sub(pivots[0],pivots[2]))<.001)
  fail('THREE_DISTINCT_SOURCE_JOINT_PIVOTS_REQUIRED');
 for(let i=0;i<e.originalVertexCount;i++){
  if(weights[2][i]>weights[1][i]+1e-6||
   weights[1][i]>weights[0][i]+1e-6)
   fail('DISTAL_WEIGHTS_WITHOUT_ANCESTOR_INHERITANCE');
 }
 // V2 FAST: build a source-indexed influence list and touching-face cache ONCE.
 // This is derived from supplied weights, not geometric sculpting or inferred anatomy.
 const affected=new Uint8Array(e.originalVertexCount),ids=[];
 for(let i=0;i<e.originalVertexCount;i++){
  if(weights[0][i]||weights[1][i]||weights[2][i]){
   affected[i]=1;ids.push(i);
  }
 }
 const offsets=[];
 for(let k=0;k<g.indices.length;k+=3)
  if(affected[g.indices[k]]||affected[g.indices[k+1]]||
   affected[g.indices[k+2]])offsets.push(k);
 const activeSourceIds=Uint32Array.from(ids);
 const affectedTriangleOffsets=Uint32Array.from(offsets);
 return {e,g,m,pivots,axes,weights,snap,activeSourceIds,
  affectedTriangleOffsets,originalTriangleCount:g.indices.length/3};
}
function deform(prep,angleDegrees){
 const {g,pivots,axes,weights}=prep,angles=angleDegrees.map(x=>x*Math.PI/180);
 const middlePivot=rotate(pivots[1],pivots[0],axes[0],angles[0]),
  middleAxis=rotateAxis(axes[1],axes[0],angles[0]);
 const distalParent=rotate(pivots[2],pivots[0],axes[0],angles[0]),
  distalPivot=rotate(distalParent,middlePivot,middleAxis,angles[1]);
 const distalAxis=rotateAxis(rotateAxis(axes[2],axes[0],angles[0]),
  middleAxis,angles[1]);
 const source=g.positions,positions=new Float32Array(source);
 let moved=0,maxMovement=0;
 for(const i of prep.activeSourceIds){
  const a=weights[0][i],b=weights[1][i],c=weights[2][i];
  if(a===0&&b===0&&c===0)continue;
  const original=pt(source,i);
  const p1=a?rotate(original,pivots[0],axes[0],angles[0]*a):original,
   p2=b?rotate(p1,middlePivot,middleAxis,angles[1]*b):p1,
   p3=c?rotate(p2,distalPivot,distalAxis,angles[2]*c):p2;
  const k=3*i;positions[k]=p3[0];positions[k+1]=p3[1];positions[k+2]=p3[2];
  const displacement=len(sub(original,p3));if(displacement>1e-8)moved++;
  maxMovement=Math.max(maxMovement,displacement*1000);
 }
 return {positions,moved,maxMovementMm:round(maxMovement),
  activeOriginalVerticesEvaluated:prep.activeSourceIds.length,
  worldJointPivots:[pivots[0],middlePivot,distalPivot],
  worldJointAxes:[axes[0],middleAxis,distalAxis]};
}
function strain(a,b,idx,affectedOffsets){
 let maxStretch=0,maxCompress=0,flipped=0,collapsed=0,dirtyTriangles=0;
 for(const k of affectedOffsets){
  const t=[idx[k],idx[k+1],idx[k+2]];
  const old=t.map(i=>pt(a,i)),now=t.map(i=>pt(b,i));
  if(old.every((p,i)=>p.every((x,j)=>x===now[i][j])))continue;
  dirtyTriangles++;
  for(const [x,y] of [[0,1],[1,2],[2,0]]){
   const prior=len(sub(old[x],old[y])),curr=len(sub(now[x],now[y]));
   if(prior<1e-9)continue;
   maxStretch=Math.max(maxStretch,(curr/prior-1)*100);
   maxCompress=Math.max(maxCompress,(1-curr/prior)*100);
  }
  const n=cross(sub(old[1],old[0]),sub(old[2],old[0])),
   m=cross(sub(now[1],now[0]),sub(now[2],now[0]));
  if(len(m)<1e-11||len(m)/Math.max(len(n),1e-20)<.01)collapsed++;
  if(dot(n,m)<-1e-12)flipped++;
 }
 return {changedSourceTriangles:dirtyTriangles,
  sourceTrianglesActuallyInspected:affectedOffsets.length,
  sourceTopologyIndexCachedOutsideTimeLoop:true,
  maxSourceEdgeStretchPercent:round(maxStretch),
  maxSourceEdgeCompressionPercent:round(maxCompress),
  invertedSourceTriangles:flipped,nearlyCollapsedSourceTriangles:collapsed,
  originalTriangleCountUnchanged:idx.length/3};
}
function triangleGroups(idx,w){
 const base=[],middle=[],distal=[];
 for(let k=0;k<idx.length;k+=3){
  const t=[idx[k],idx[k+1],idx[k+2]];
  if(t.some(i=>w[2][i]))distal.push(t);
  else if(t.some(i=>w[1][i]))middle.push(t);
  else if(t.some(i=>w[0][i]))base.push(t);
 }
 return {base,middle,distal};
}
function boundsAcross(tri,frames){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const f of frames)for(const v of tri)for(let j=0;j<3;j++){
  min[j]=Math.min(min[j],f[3*v+j]);max[j]=Math.max(max[j],f[3*v+j]);
 }
 return {min,max,tri};
}
/** One conservative interval AABB overlap screen. May falsely flag possible
 * crossings, but never claims a positive overlap is an actual collision. */
export function inspectAIGReal3DSweptSourceRisk({
 from,to,groupA,groupB,budget=100000
}={}){
 if(!(from instanceof Float32Array)||!(to instanceof Float32Array)||
  from.length!==to.length||from.length%3||!Array.isArray(groupA)||
  !Array.isArray(groupB)||!Number.isInteger(budget)||budget<1||budget>200000||
  [...groupA,...groupB].some(t=>!Array.isArray(t)||t.length!==3||
   t.some(i=>!Number.isInteger(i)||i<0||i>=from.length/3)))
  fail('SWEPT_INPUT_INVALID');
 const a=groupA.map(t=>boundsAcross(t,[from,to])),
  b=groupB.map(t=>boundsAcross(t,[from,to])).sort((x,y)=>x.min[0]-y.min[0]);
 let possible=0,visited=0,budgetExhausted=false;
 for(const t of a){
  for(const v of b){
   if(v.min[0]>t.max[0])break;
   if(++visited>budget*16){budgetExhausted=true;break;}
   if(v.max[0]<t.min[0]||v.min[1]>t.max[1]||
    v.max[1]<t.min[1]||v.min[2]>t.max[2]||v.max[2]<t.min[2]||
    t.tri.some(i=>v.tri.includes(i)))continue;
   if(++possible>budget){budgetExhausted=true;break;}
  }
  if(budgetExhausted)break;
 }
 return {possibleCrossChannelSweptAABBOverlaps:possible,
  candidateSourcePairsVisited:visited,budgetExhausted,
  intervalNeedsNarrowerSamplingOrFurtherCollisionReview:possible>0||budgetExhausted,
  sweptAABBOverlapNotProofOfActualTriangleIntersection:true,
  noContinuousCollisionFreeCertification:true};
}
export function createAIGReal3DThreeJointTimeline({
 dense,fingerJunction,manifest,targetAnglesDeg=[25,25,20],
 maxAngularStepDeg=6,displayFrameCount=3,contactBudget=120000,
 maxEdgeStrainPercent=20
}={}){
 const prep=validate(dense,fingerJunction,manifest);
 if(!Array.isArray(targetAnglesDeg)||targetAnglesDeg.length!==3||
  targetAnglesDeg.some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>45)||
  !Number.isFinite(maxAngularStepDeg)||maxAngularStepDeg<2||maxAngularStepDeg>12||
  !Number.isInteger(displayFrameCount)||displayFrameCount<3||displayFrameCount>9||
  !Number.isInteger(contactBudget)||contactBudget<1||contactBudget>200000||
  !Number.isFinite(maxEdgeStrainPercent)||maxEdgeStrainPercent<1||
  maxEdgeStrainPercent>100)
  fail('SAMPLING_OR_SAFETY_CONFIG_INVALID');
 const steps=Math.max(displayFrameCount-1,
  Math.ceil(Math.max(...targetAnglesDeg.map(Math.abs))/maxAngularStepDeg));
 if(steps>24)fail('SUBFRAME_MEMORY_BUDGET_EXCEEDED');
 const displays=[...new Set(Array.from({length:displayFrameCount},(_,i)=>
  Math.round(i*steps/(displayFrameCount-1))))],groups=triangleGroups(prep.g.indices,prep.weights);
 const sparseStats={
  schema:AIG_REAL3D_FAST_SPARSE_FK_SCHEMA,
  inputSourceVertexCount:prep.e.originalVertexCount,
  activeWeightedGlobalVertexCount:prep.activeSourceIds.length,
  skippedUnweightedGlobalVerticesPerFrame:prep.e.originalVertexCount-prep.activeSourceIds.length,
  inputOriginalSourceTriangles:prep.originalTriangleCount,
  indexedAffectedOriginalTriangles:prep.affectedTriangleOffsets.length,
  skippedUnaffectedOriginalTrianglesPerFrame:
   prep.originalTriangleCount-prep.affectedTriangleOffsets.length,
  globalIndexedGeometryUnmodified:true,
  allAffectedFacesCollectedBeforeFrameEvaluation:true,
  physicsCollisionGroupsPrebuiltOnce:true,
  runtimeImageGPUChunksStillRebuiltPerCapture:true,
  noBenchmarkedFPSAssertion:true
 };
 const frames=[];let observedContact=false,unfinished=false,sweptRisk=false,
  unsafeStrain=false,inverted=false,maxStretch=0;
 for(let i=0;i<=steps;i++){
  const t=i/steps,angles=targetAnglesDeg.map(a=>a*t),pose=deform(prep,angles),
   deformation=strain(prep.g.positions,pose.positions,prep.g.indices,
    prep.affectedTriangleOffsets);
  const contact=inspectAIGReal3DLocalSourceTriangleContact({
   positions:pose.positions,firstTriangles:groups.base,
   secondTriangles:groups.distal,maxPairs:contactBudget
  });
  const previous=frames.at(-1);
  const swept=previous?inspectAIGReal3DSweptSourceRisk({
   from:previous.workingCopyPositions,to:pose.positions,
   groupA:groups.base,groupB:groups.distal,budget:contactBudget
  }):null;
  observedContact ||=contact.observedContactAtSample;
  unfinished ||=contact.budgetExhausted||Boolean(swept?.budgetExhausted);
  sweptRisk ||=Boolean(swept?.intervalNeedsNarrowerSamplingOrFurtherCollisionReview);
  unsafeStrain ||=deformation.maxSourceEdgeStretchPercent>maxEdgeStrainPercent||
   deformation.maxSourceEdgeCompressionPercent>maxEdgeStrainPercent;
  inverted ||=deformation.invertedSourceTriangles>0||deformation.nearlyCollapsedSourceTriangles>0;
  maxStretch=Math.max(maxStretch,deformation.maxSourceEdgeStretchPercent);
  frames.push({
   sampleIndex:i,timeFraction:round(t),anglesDeg:angles.map(round),
   worldJointPivots:pose.worldJointPivots,
   worldJointAxes:pose.worldJointAxes,
   workingCopyPositions:pose.positions,
   movedOriginalVertices:pose.moved,maxMovementMm:pose.maxMovementMm,
   deformation,contact,sweptRiskFromPriorSample:swept
  });
 }
 return {
  schema:AIG_REAL3D_THREE_JOINT_SCHEMA,sourceSha256:prep.e.sourceSha256,
  jointNames:['Base','Middle','Distal'],
  sourceOriginalVertices:prep.e.originalVertexCount,
  sourceOriginalTriangles:prep.e.originalTriangleCount,
  sourceMarkerSnaps:prep.snap,sparseSourceTopology:sparseStats,
  frameCount:frames.length,displayFrameIndexes:displays,
  maxActualAngularSampleStepDeg:round(
   Math.max(...targetAnglesDeg.map(Math.abs))/steps),
  frames,
  diagnostics:{
   trueThreeJointParentChildInheritance:true,
   sourceGlobalVertexCoordinatesUnchanged:true,
   originalSourceTriangleIndicesPreserved:true,
   anySampledSourceTriangleIntersections:observedContact,
   possibleUnsampledSweptIntervalCollision:sweptRisk,
   collisionSearchBudgetIncomplete:unfinished,
   exceedingSourceEdgeStrainThreshold:unsafeStrain,
   invertedOrCollapsedSourceFaces:inverted,
   maxMeasuredEdgeStretchPercent:round(maxStretch),
   cpuSparseFKSourceTopologyCacheUsed:true,
   sourceWeightedVerticesScannedOnly:true,
   sparseTriangleStrainFullyCoversAffectedSourceFaces:true,
   manualSourceWeightsNotAutoRig:true,
   sweptAABBRiskIsNotContinuousCollisionProof:true,
   noNativeHumanScanAnatomyEvidence:true,
   naturalSkinDeformationPASS:false,verifiedHumanRigPASS:false,
   continuousCollisionFreePASS:false,releasePASS:false
  },releasePASS:false
 };
}
