/**
 * Read-only TRUE original-Indexed-XYZ distal-branch analysis for the two hands.
 * Five fingertip annotations alone never prove five fingers. Check whether
 * original source surface extends into five separately connected distal
 * regions while remaining attached to a common original wrist shell.
 *
 * Entirely diagnostic: palm-cut topology is pose dependent. A successful
 * separation is NOT biometric human identity or natural-anatomy certification.
 * No triangulation, sculpting, decimation, welding or source coordinate writes.
 */
import {AIG_REAL3D_DENSE_SOURCE_SCHEMA}
 from './aig-real3d-dense-source-obj.mjs';
import {AIG_REAL3D_DENSE_ANATOMY_SCHEMA}
 from './aig-real3d-dense-anatomy-review.mjs';
export const AIG_REAL3D_DENSE_DIGIT_BRANCH_SCHEMA=
 'AIG_REAL3D_ORIGINAL_3D_FIVE_DISTAL_BRANCH_DIAGNOSTIC_V1';
const SHA=/^[0-9a-f]{64}$/i;
const CUTFRACTIONS=[.5,.62,.74,.82];
const TIP_NAMES=['ThumbTip','IndexTip','MiddleTip','RingTip','PinkyTip'];
const length=v=>Math.hypot(...v);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const minus=(a,b)=>a.map((x,k)=>x-b[k]);
const round=n=>Math.round(n*1000)/1000;
const fail=code=>{throw Error('DENSE_DIGIT_'+code);};
function sourceToWorld(p,source){
 const raw=source.evidence.upAxis==='Z'?[p[0],p[2],-p[1]]:p;
 const {geometry:g}=source,lo=g.rotatedSourceBoundsMin,
  hi=g.rotatedSourceBoundsMax,s=g.metersPerRawUnit;
 return [(raw[0]-(lo[0]+hi[0])/2)*s,
  (raw[1]-lo[1])*s,(raw[2]-(lo[2]+hi[2])/2)*s];
}
function nearestVertex(target,positions){
 let best=Infinity,id=-1;
 for(let v=0;v<positions.length;v+=3){
  const dx=positions[v]-target[0],dy=positions[v+1]-target[1],
   dz=positions[v+2]-target[2],score=dx*dx+dy*dy+dz*dz;
  if(score<best){best=score;id=v/3;}
 }
 return {id,distanceMm:round(Math.sqrt(best)*1000)};
}
const dsu=count=>{
 const parent=new Int32Array(count),rank=new Uint8Array(count);
 for(let i=0;i<count;i++)parent[i]=i;
 const root=id=>{
  while(parent[id]!==id){parent[id]=parent[parent[id]];id=parent[id];}
  return id;
 };
 const join=(a,b)=>{
  let x=root(a),y=root(b);if(x===y)return;
  if(rank[x]<rank[y]){const swap=x;x=y;y=swap;}
  parent[y]=x;if(rank[x]===rank[y])rank[x]++;
 };
 return {root,join};
};
function prepareSource({sourceGeometry,sourceEvidence,sourceSha256,anatomy}){
 const g=sourceGeometry,e=sourceEvidence;
 if(!SHA.test(sourceSha256??'')||
  e?.schema!==AIG_REAL3D_DENSE_SOURCE_SCHEMA||
  anatomy?.schema!==AIG_REAL3D_DENSE_ANATOMY_SCHEMA||
  e.sourceSha256!==sourceSha256||anatomy.sourceSha256!==sourceSha256||
  !g?.originalGlobalIndexSpace||g.noChunkBoundarySeamInference!==true||
  !(g.positions instanceof Float32Array)||
  !(g.indices instanceof Uint32Array)||
  g.positions.length!==e.originalVertexCount*3||
  g.indices.length!==e.originalTriangleCount*3||
  e.renderedTriangleCount!==e.originalTriangleCount||
  !Number.isFinite(g.metersPerRawUnit)||g.metersPerRawUnit<=0||
  e.originalVertexCount>350000||e.originalTriangleCount>700000)
  fail('SHA_AND_UNCHANGED_GLOBAL_TRIANGLES_REQUIRED');
 return {geometry:g,evidence:e};
}
function worldForVertex(positions,i){
 const k=i*3;return [positions[k],positions[k+1],positions[k+2]];
}
function inspectHand({side,source,landmarks,globalRoot}){
 const label=side==='left'?'左手':'右手';
 const names=[side+'Wrist',...TIP_NAMES.map(t=>side+t)];
 const missing=names.filter(key=>{
  const p=landmarks?.[key];
  return !Array.isArray(p)||p.length!==3||
   !p.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<1e6);
 });
 const base={
  side,label,requiredSourceMarkers:names,missingMarkers:missing,
  original3DTrianglesUsed:true,gpuChunkIndexIgnored:true,
  distalCutsAreGeometricDiagnosticsNotUniversalHumanAnatomy:true,
  fiveFingerHumanShapeVerified:false,naturalHumanAnatomyPASS:false
 };
 if(missing.length)return {
  ...base,cutPlanes:[],technicalFiveDistalBranchesObserved:false,
  reasonCodes:['FIVE_FINGERTIP_AND_WRIST_ORIGINAL_MARKERS_REQUIRED']
 };
 const geo=source.geometry,pos=geo.positions,idx=geo.indices,n=pos.length/3;
 const selected=names.map(name=>{
  const world=sourceToWorld(landmarks[name],source);
  return {name,world,...nearestVertex(world,pos)};
 });
 const wrist=selected[0],tips=selected.slice(1);
 const maxSnap=Math.max(...selected.map(v=>v.distanceMm));
 const acceptedSnapMm=Math.max(3,source.evidence.heightMm*.003);
 const tipIDs=tips.map(t=>t.id);
 const minTipPairMm=(()=>{
  let distance=Infinity;
  for(let a=0;a<tips.length;a++)for(let b=a+1;b<tips.length;b++)
   distance=Math.min(distance,length(minus(tips[a].world,tips[b].world))*1000);
  return round(distance);
 })();
 const originalConnected=tips.every(x=>globalRoot(x.id)===globalRoot(wrist.id));
 const distinctTips=new Set(tipIDs).size===5&&minTipPairMm>=3;
 const center=tips.reduce((acc,p)=>acc.map((v,i)=>v+p.world[i]/5),[0,0,0]);
 const axis=minus(center,wrist.world),axisLength=length(axis);
 const reasonCodes=[];
 if(!originalConnected)reasonCodes.push('FINGERS_NOT_CONNECTED_TO_ORIGINAL_WRIST_SHELL');
 if(!distinctTips)reasonCodes.push('FIVE_TIP_SOURCE_SURFACE_POINTS_NOT_DISTINCT');
 if(maxSnap>acceptedSnapMm)reasonCodes.push('ANNOTATION_TOO_FAR_FROM_SOURCE_SURFACE');
 if(axisLength<.005)reasonCodes.push('HAND_LONGITUDINAL_AXIS_UNRESOLVED');
 if(reasonCodes.length)return {
  ...base,cutPlanes:[],markers:selected.map(({name,id,distanceMm})=>({
   name,originalVertexIndex:id,surfaceOffsetMm:distanceMm
  })),originalWristAndTipsIndexConnected:originalConnected,
  distinctFiveTipsAnnotated:distinctTips,minTipPairSeparationMm:minTipPairMm,
  maximumMarkerSurfaceOffsetMm:maxSnap,
  technicalFiveDistalBranchesObserved:false,reasonCodes
 };
 const dir=axis.map(x=>x/axisLength);
 const minProjectedTip=Math.min(...tips.map(p=>dot(minus(p.world,wrist.world),dir)));
 if(minProjectedTip<.008){
  return {...base,cutPlanes:[],technicalFiveDistalBranchesObserved:false,
   reasonCodes:['TIP_DISTAL_PLANE_CANNOT_BE_DEFINED']};
 }
 const maxWristTip=Math.max(...tips.map(t=>length(minus(t.world,wrist.world))));
 const roiRadius=Math.max(.035,maxWristTip*1.6);
 const tipRootKeys=tipIDs.map(id=>globalRoot(id));
 const cuts=CUTFRACTIONS.map(fraction=>{
  const cutMeters=minProjectedTip*fraction;
  const active=new Uint8Array(n);
  let activeCount=0;
  for(let v=0;v<n;v++){
   const p=worldForVertex(pos,v),offset=minus(p,wrist.world);
   if(dot(offset,dir)>=cutMeters&&length(offset)<=roiRadius){
    active[v]=1;activeCount++;
   }
  }
  const enoughTips=tipIDs.every(id=>active[id]===1);
  const forest=dsu(n);
  let keptTriangles=0;
  for(let k=0;k<idx.length;k+=3){
   const a=idx[k],b=idx[k+1],c=idx[k+2];
   if(active[a]&&active[b])forest.join(a,b);
   if(active[b]&&active[c])forest.join(b,c);
   if(active[c]&&active[a])forest.join(c,a);
   if(active[a]&&active[b]&&active[c])keptTriangles++;
  }
  const groups=enoughTips?tipIDs.map(i=>forest.root(i)):[];
  const uniqueGroups=new Set(groups);
  // Count source vertices for each tip region, ignoring unannotated fragments.
  const volume=new Map(groups.map(g=>[g,0]));
  if(enoughTips)for(let v=0;v<n;v++)if(active[v]){
   const root=forest.root(v);
   if(volume.has(root))volume.set(root,volume.get(root)+1);
  }
  const minTipClusterVertices=volume.size?Math.min(...volume.values()):0;
  const distinctTipBranches=enoughTips&&uniqueGroups.size===5&&
   minTipClusterVertices>=6&&originalConnected&&distinctTips&&
   maxSnap<=acceptedSnapMm;
  return {
   planeFractionOfShortestProjectedTip:fraction,
   planeDistanceFromWristMm:round(cutMeters*1000),
   selected3DSourceVertices:activeCount,
   fullyInsideSourceTriangles:keptTriangles,
   allFiveTipVerticesBeyondPlane:enoughTips,
   distinctSourceSurfaceComponentsAtFiveTips:uniqueGroups.size,
   minDistalTipComponentSourceVertices:minTipClusterVertices,
   observedFiveSeparateDistalBranchesAtCut:distinctTipBranches
  };
 });
 const positive=cuts.filter(x=>x.observedFiveSeparateDistalBranchesAtCut);
 if(!positive.length)reasonCodes.push('FIVE_DISTAL_BRANCHES_NOT_SEPARATED_IN_NATIVE_3D');
 return {
  ...base,markers:selected.map(({name,id,distanceMm})=>({
   name,originalVertexIndex:id,surfaceOffsetMm:distanceMm
  })),maxAcceptedMarkerSnapMm:acceptedSnapMm,
  maximumMarkerSurfaceOffsetMm:maxSnap,
  originalWristAndTipsIndexConnected:originalConnected,
  distinctFiveTipsAnnotated:distinctTips,minTipPairSeparationMm:minTipPairMm,
  cutPlanes:cuts,technicalFiveDistalBranchesObserved:positive.length>0,
  technicalDiagnosticPlaneCount:positive.length,
  reasonCodes,
  fiveDistalBranchesDoNotProveIndividualNaturalFingers:true
 };
}
export function auditAIGReal3DDenseFiveDigitBranches({
 sourceGeometry,sourceEvidence,sourceSha256,anatomy,landmarks=null
}={}){
 const source=prepareSource({
  sourceGeometry,sourceEvidence,sourceSha256,anatomy
 });
 if(landmarks!==null&&(typeof landmarks!=='object'||Array.isArray(landmarks)||
  Object.keys(landmarks).length>80))fail('INVALID_LANDMARK_DOCUMENT');
 const n=sourceEvidence.originalVertexCount,index=sourceGeometry.indices,
  forest=dsu(n);
 for(let i=0;i<index.length;i+=3){
  const a=index[i],b=index[i+1],c=index[i+2];
  if(a>=n||b>=n||c>=n)fail('CORRUPT_GLOBAL_SOURCE_INDEX');
  forest.join(a,b);forest.join(b,c);
 }
 const hands=['left','right'].map(side=>inspectHand({
  side,source,landmarks,globalRoot:forest.root
 }));
 const technicallyObserved=hands.every(h=>h.technicalFiveDistalBranchesObserved);
 return {
  schema:AIG_REAL3D_DENSE_DIGIT_BRANCH_SCHEMA,sourceSha256,
  originalVertexCount:n,originalTriangleCount:sourceEvidence.originalTriangleCount,
  allAnalysisFromOriginalIndexedXYZ:true,
  gpuChunkBoundariesExcluded:true,
  sourceTrianglesWrittenOrReplaced:false,
  handReports:hands,
  bothFiveDistalBranchTechnicalObservations:technicallyObserved,
  sourceActuallyContainsFiveHumanFingersProven:false,
  realisticFingersAndJointsIndependentlyReviewed:false,
  authenticHumanScanIndependentlyVerified:false,
  naturalAppearancePASS:false,releasePASS:false
 };
}
