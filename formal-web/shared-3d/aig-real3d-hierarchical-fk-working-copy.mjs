/**
 * Real3D explicit parent-child finger FK on ORIGINAL source GLOBAL indexed XYZ.
 * Unlike PR#71 independent channels, child rotation inherits the physically
 * displaced parent pivot. Sparse weights are manually annotated, SHA-bound;
 * this is NOT automatic human rigging or natural soft-tissue simulation.
 *
 * No source writes. Subframes sample trajectory, NOT continuous collision proof.
 */
import {AIG_REAL3D_DENSE_SOURCE_SCHEMA}
 from './aig-real3d-dense-source-obj.mjs';
import {AIG_REAL3D_FINGER_JUNCTION_SCHEMA}
 from './aig-real3d-native-finger-junction-gate.mjs';
import {inspectAIGReal3DLocalSourceTriangleContact}
 from './aig-real3d-dual-channel-timeline.mjs';
export const AIG_REAL3D_HIERARCHICAL_FK_SCHEMA=
 'AIG_REAL3D_EXPLICIT_FINGER_PARENT_CHILD_FK_SUBFRAME_V1';
export const AIG_REAL3D_HIERARCHICAL_MANIFEST_SCHEMA=
 'AIG_REAL3D_EXPLICIT_FINGER_HIERARCHY_WEIGHTS_V1';
const fingers=['Thumb','Index','Middle','Ring','Pinky'];
const sha=/^[a-f0-9]{64}$/i;
const fail=code=>{throw Error('REAL3D_HIERARCHY_'+code);};
const point=(v,i)=>[v[3*i],v[3*i+1],v[3*i+2]];
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
const round=x=>{const y=Math.round(x*1000)/1000;return Object.is(y,-0)?0:y;};
const validVec=p=>Array.isArray(p)&&p.length===3&&p.every(
 x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<1e6);
const world=(p,g,up)=>{
 const q=up==='Z'?[p[0],p[2],-p[1]]:p;
 const lo=g.rotatedSourceBoundsMin,hi=g.rotatedSourceBoundsMax,s=g.metersPerRawUnit;
 return [(q[0]-(lo[0]+hi[0])/2)*s,(q[1]-lo[1])*s,
  (q[2]-(lo[2]+hi[2])/2)*s];
};
function rotate(p,pivot,axis,rad){
 const v=sub(p,pivot),co=Math.cos(rad),si=Math.sin(rad),cr=cross(axis,v),
  pr=dot(axis,v);
 return add(pivot,v.map((x,k)=>co*x+si*cr[k]+(1-co)*pr*axis[k]));
}
function validate({dense,fingerJunction,manifest}){
 const e=dense?.evidence,g=dense?.sourceGeometry,m=manifest;
 if(e?.schema!==AIG_REAL3D_DENSE_SOURCE_SCHEMA||
  fingerJunction?.schema!==AIG_REAL3D_FINGER_JUNCTION_SCHEMA||
  !sha.test(e.sourceSha256??'')||fingerJunction.sourceSha256!==e.sourceSha256||
  !(g?.positions instanceof Float32Array)||!(g.indices instanceof Uint32Array)||
  !g.originalGlobalIndexSpace||g.noChunkBoundarySeamInference!==true||
  g.positions.length!==e.originalVertexCount*3||
  g.indices.length!==e.originalTriangleCount*3||
  e.renderedTriangleCount!==e.originalTriangleCount||
  m?.schema!==AIG_REAL3D_HIERARCHICAL_MANIFEST_SCHEMA||
  m.sourceSha256!==e.sourceSha256||m.sourceVertexCount!==e.originalVertexCount||
  !['left','right'].includes(m.side)||!fingers.includes(m.finger)||
  m.parent?.joint!=='Base'||m.child?.joint!=='Middle')
  fail('ORIGINAL_GLOBAL_SOURCE_JOINT_AND_MANIFEST_REQUIRED');
 const report=fingerJunction.fingers?.find(f=>f.side===m.side&&f.finger===m.finger);
 if(!report)fail('ORIGINAL_JOINT_SOURCE_REPORT_REQUIRED');
 const joints=[m.parent,m.child];
 const pivots=[],axes=[],weights=[];
 for(let k=0;k<2;k++){
  const j=joints[k],markerName=m.side+m.finger+j.joint,
   marker=report.markerSnapEvidence?.find(x=>x.name===markerName);
  if(!marker||!Number.isInteger(marker.originalVertexIndex)||
   marker.originalVertexIndex<0||marker.originalVertexIndex>=e.originalVertexCount||
   !validVec(j.pivotSourceXYZ)||!validVec(j.axisWorld)||
   !Array.isArray(j.vertexWeights)||j.vertexWeights.length<3||
   j.vertexWeights.length>=e.originalVertexCount)
   fail('EXPLICIT_PARENT_AND_CHILD_3D_SOURCE_JOINTS_REQUIRED');
  const pivot=world(j.pivotSourceXYZ,g,e.upAxis),
   nearest=point(g.positions,marker.originalVertexIndex),axisNorm=norm(j.axisWorld);
  if(norm(sub(pivot,nearest))>.006)fail('JOINT_PIVOT_OFF_SOURCE_MESH');
  if(axisNorm<.5||axisNorm>2)fail('JOINT_AXIS_INVALID');
  const arr=new Float32Array(e.originalVertexCount),seen=new Set();
  for(const pair of j.vertexWeights){
   if(!Array.isArray(pair)||pair.length!==2||
    !Number.isInteger(pair[0])||pair[0]<0||pair[0]>=arr.length||
    typeof pair[1]!=='number'||!Number.isFinite(pair[1])||
    pair[1]<=0||pair[1]>1||seen.has(pair[0]))
    fail('DUPLICATE_OR_INVALID_SOURCE_JOINT_WEIGHT');
   arr[pair[0]]=pair[1];seen.add(pair[0]);
  }
  pivots.push(pivot);axes.push(j.axisWorld.map(x=>x/axisNorm));weights.push(arr);
 }
 if(norm(sub(pivots[0],pivots[1]))<.001)
  fail('PARENT_CHILD_PIVOTS_COINCIDENT');
 let childOnly=0,weightedParent=0,weightedChild=0;
 for(let i=0;i<e.originalVertexCount;i++){
  if(weights[0][i])weightedParent++;
  if(weights[1][i])weightedChild++;
  if(weights[1][i]>weights[0][i]+1e-6)childOnly++;
 }
 if(childOnly)fail('CHILD_WEIGHTS_WITHOUT_PARENT_INHERITANCE');
 return {e,g,m,report,pivots,axes,weights,weightedParent,weightedChild};
}
function geometryDiagnostics(original,posed,indices){
 let stretched=0,compressed=0,flipped=0,collapsed=0,changed=0;
 for(let i=0;i<indices.length;i+=3){
  const ids=[indices[i],indices[i+1],indices[i+2]];
  if(ids.some(id=>id>=original.length/3))fail('SOURCE_INDEX_OUT_OF_RANGE');
  const old=ids.map(id=>point(original,id)),now=ids.map(id=>point(posed,id));
  if(old.every((p,j)=>p.every((n,k)=>n===now[j][k])))continue;
  changed++;
  for(const [a,b] of [[0,1],[1,2],[2,0]]){
   const before=norm(sub(old[a],old[b])),after=norm(sub(now[a],now[b]));
   if(before<1e-9)continue;
   stretched=Math.max(stretched,(after/before-1)*100);
   compressed=Math.max(compressed,(1-after/before)*100);
  }
  const x=cross(sub(old[1],old[0]),sub(old[2],old[0])),
   y=cross(sub(now[1],now[0]),sub(now[2],now[0]));
  if(norm(y)<1e-11||norm(y)/Math.max(norm(x),1e-20)<.01)collapsed++;
  if(dot(x,y)<-1e-12)flipped++;
 }
 return {
  originalSourceTriangleCount:indices.length/3,
  actuallyDeformedTriangles:changed,
  maxOriginalEdgeStretchPercent:round(stretched),
  maxOriginalEdgeCompressionPercent:round(compressed),
  invertedOriginalTriangles:flipped,
  nearlyCollapsedOriginalTriangles:collapsed,
  sourceTrianglesAdded:0,sourceTrianglesRemoved:0
 };
}
function surfaceGroups(indices,parentW,childW){
 const parent=[],child=[];
 for(let j=0;j<indices.length;j+=3){
  const t=[indices[j],indices[j+1],indices[j+2]];
  if(t.some(i=>childW[i]>0))child.push(t);
  else if(t.some(i=>parentW[i]>0))parent.push(t);
 }
 return {parent,child};
}
function evaluate(prep,parentAngleDeg,childAngleDeg,group,contactBudget){
 const {g,pivots,axes,weights,e}=prep;
 const [pa,ch]=[parentAngleDeg,childAngleDeg].map(x=>x*Math.PI/180);
 const movedPivot=rotate(pivots[1],pivots[0],axes[0],pa);
 const movedAxis=add(rotate(add(pivots[1],axes[1]),
  pivots[0],axes[0],pa),movedPivot.map(x=>-x));
 const axisNorm=norm(movedAxis),effectiveAxis=movedAxis.map(x=>x/axisNorm);
 const xyz=g.positions,posed=new Float32Array(xyz);
 let moved=0,maxDisplacement=0;
 for(let i=0;i<weights[0].length;i++){
  const wp=weights[0][i],wc=weights[1][i];
  if(wp===0&&wc===0)continue;
  const src=point(xyz,i),
   parentPoint=wp?rotate(src,pivots[0],axes[0],pa*wp):src,
   childPoint=wc?rotate(parentPoint,movedPivot,effectiveAxis,ch*wc):parentPoint;
  const o=i*3;for(let k=0;k<3;k++)posed[o+k]=childPoint[k];
  const disp=norm(sub(childPoint,src));
  if(disp>1e-8)moved++;
  maxDisplacement=Math.max(maxDisplacement,disp*1000);
 }
 const deformation=geometryDiagnostics(xyz,posed,g.indices),
  contact=inspectAIGReal3DLocalSourceTriangleContact({
   positions:posed,firstTriangles:group.parent,secondTriangles:group.child,
   maxPairs:contactBudget
  });
 return {parentAngleDeg:round(parentAngleDeg),childAngleDeg:round(childAngleDeg),
  parentSourcePivotWorldMeters:pivots[0],
  transformedChildPivotWorldMeters:movedPivot,
  childAxisInParentSpaceWorld:effectiveAxis,
  workingCopyPositions:posed,
  movedOriginalVertices:moved,maxDisplacementMm:round(maxDisplacement),
  deformation,contact,
  originalGlobalIndexedXYZPreserved:true,
  trueHumanMotionOrSkinPhysicsCertified:false};
}
/** Sample a parent->child FK trajectory with bounded angular steps; samples do
 * not prove continuous collision freedom, even when no sample intersects. */
export function createAIGReal3DHierarchicalFingerTimeline({
 dense,fingerJunction,manifest,
 targetAnglesDeg=[30,30],displayFrameCount=3,
 maxDegreesBetweenCheckedSamples=8,contactBudget=120000
}={}){
 const prep=validate({dense,fingerJunction,manifest});
 if(!Array.isArray(targetAnglesDeg)||targetAnglesDeg.length!==2||
  targetAnglesDeg.some(x=>typeof x!=='number'||!Number.isFinite(x)||Math.abs(x)>45)||
  !Number.isInteger(displayFrameCount)||displayFrameCount<3||displayFrameCount>9||
  !Number.isFinite(maxDegreesBetweenCheckedSamples)||
  maxDegreesBetweenCheckedSamples<2||maxDegreesBetweenCheckedSamples>15||
  !Number.isInteger(contactBudget)||contactBudget<1||contactBudget>200000)
  fail('TIMELINE_SAMPLING_OR_ANGLE_INVALID');
 const segments=Math.max(displayFrameCount-1,
  Math.ceil(Math.max(...targetAnglesDeg.map(Math.abs))/maxDegreesBetweenCheckedSamples));
 const subframeCount=segments+1;
 if(subframeCount>32)fail('SUBFRAME_BUDGET_EXCEEDED');
 const group=surfaceGroups(prep.g.indices,prep.weights[0],prep.weights[1]),
  samples=[],displayIndexes=[...new Set(Array.from({length:displayFrameCount},
   (_,i)=>Math.round(i*segments/(displayFrameCount-1))))];
 let anyCollision=false,anyIncomplete=false,maxStretch=0,maxCompression=0,anyInversion=false;
 for(let i=0;i<=segments;i++){
  const t=i/segments,
   sample=evaluate(prep,targetAnglesDeg[0]*t,targetAnglesDeg[1]*t,group,contactBudget);
  sample.sampleIndex=i;sample.normalizedTime=round(t);
  sample.visibleGPUFrame=displayIndexes.includes(i);
  samples.push(sample);
  anyCollision ||= sample.contact.observedContactAtSample;
  anyIncomplete ||= sample.contact.budgetExhausted;
  maxStretch=Math.max(maxStretch,sample.deformation.maxOriginalEdgeStretchPercent);
  maxCompression=Math.max(maxCompression,sample.deformation.maxOriginalEdgeCompressionPercent);
  anyInversion ||=sample.deformation.invertedOriginalTriangles>0||
   sample.deformation.nearlyCollapsedOriginalTriangles>0;
 }
 return {
  schema:AIG_REAL3D_HIERARCHICAL_FK_SCHEMA,
  sourceSha256:prep.e.sourceSha256,
  sourceOriginalVertexCount:prep.e.originalVertexCount,
  sourceOriginalTriangleCount:prep.e.originalTriangleCount,
  jointHierarchy:['Base','Middle'],finger:prep.m.finger,side:prep.m.side,
  bothJointsExplicitlyAnnotatedAndSourceBound:true,
  parentWeightedSourceVertices:prep.weightedParent,
  childWeightedSourceVertices:prep.weightedChild,
  targetAnglesDeg,displayFrameIndexes:displayIndexes,subframeCount,
  maxActualDegreesBetweenSamples:round(
   Math.max(...targetAnglesDeg.map(Math.abs))/segments),
  samples,
  diagnostics:{
   parentPivotCarriesChildPivot:true,
   sourceTriangleIndexTopologyNeverChanged:true,
   sourceXYZNeverModified:true,
   maxOriginalEdgeStretchPercent:round(maxStretch),
   maxOriginalEdgeCompressionPercent:round(maxCompression),
   anyInvertedOrNearlyCollapsedSourceTriangles:anyInversion,
   observedCrossRegionTriangleIntersectionAtSample:anyCollision,
   anyCollisionCheckBudgetExhausted:anyIncomplete,
   excludesCoplanarAndTangentContacts:true,
   sampledFramesDoNotProveContinuousCollisionFreedom:true,
   notAnIndependentlyVerifiedHumanSkeleton:true,
   skinAndJointNaturalnessPASS:false,animationRigPASS:false,releasePASS:false
  },releasePASS:false
 };
}
