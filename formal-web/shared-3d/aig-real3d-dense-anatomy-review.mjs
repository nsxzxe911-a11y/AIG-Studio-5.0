/**
 * Real3D high-density ORIGINAL-INDEX anatomy/detail DIAGNOSTIC.
 * All spatial metrics originate in the 3D source, never GPU chunk boundaries,
 * normals, 2D masks, synthetic meshes or claimed human identity.
 * Read-only: no welding, smoothing, decimation, resampling or inferred fingers.
 */
import {validateAIGReal3DLandmarkSidecar}
 from './aig-real3d-source-review-gate.mjs';
import {AIG_REAL3D_DENSE_SOURCE_SCHEMA}
 from './aig-real3d-dense-source-obj.mjs';
export const AIG_REAL3D_DENSE_ANATOMY_SCHEMA='AIG_REAL3D_DENSE_ORIGINAL_INDEX_FIVE_REGION_REVIEW_V1';
export const AIG_REAL3D_DENSE_FOURVIEW_SCHEMA='AIG_REAL3D_DENSE_FOURVIEW_RENDER_COMPARISON_V1';
const SHA=/^[a-f0-9]{64}$/i;
const VIEWS=['front','side','back','threeQuarter'];
const EXTRA_DIGITS=['MiddleTip','RingTip','PinkyTip'];
const tips=side=>['ThumbTip','IndexTip',...EXTRA_DIGITS].map(n=>side+n);
const ZONES=[
 {id:'HEAD_NECK_JOIN',label:'頭頸',names:['chin','neckBase','leftShoulder','rightShoulder']},
 {id:'LEFT_HAND_FIVE_DIGITS',label:'左手五指',names:['leftWrist',...tips('left')]},
 {id:'RIGHT_HAND_FIVE_DIGITS',label:'右手五指',names:['rightWrist',...tips('right')]},
 {id:'LEFT_FOOT',label:'左腳',names:['leftKnee','leftHeel','leftToe']},
 {id:'RIGHT_FOOT',label:'右腳',names:['rightKnee','rightHeel','rightToe']}
];
const fail=code=>{throw Error('DENSE_ANATOMY_'+code);};
const p3=(positions,i)=>i*3;
const dist2=(p,x,y,z)=>{const dx=p[0]-x,dy=p[1]-y,dz=p[2]-z;return dx*dx+dy*dy+dz*dz;};
const round=n=>Math.round(n*1000)/1000;
const pct95=values=>values.length?
 round(values.sort((a,b)=>a-b)[Math.ceil(values.length*.95)-1]):null;
function worldMarker(p,geo,upAxis){
 const q=upAxis==='Z'?[p[0],p[2],-p[1]]:p;
 return [
  (q[0]-(geo.rotatedSourceBoundsMin[0]+geo.rotatedSourceBoundsMax[0])/2)*geo.metersPerRawUnit,
  (q[1]-geo.rotatedSourceBoundsMin[1])*geo.metersPerRawUnit,
  (q[2]-(geo.rotatedSourceBoundsMin[2]+geo.rotatedSourceBoundsMax[2])/2)*geo.metersPerRawUnit
 ];
}
function measureMarker(name,point,geo,upAxis){
 const target=worldMarker(point,geo,upAxis),xyz=geo.positions;
 let index=-1,best=Infinity;
 for(let i=0;i<xyz.length;i+=3){
  const d=dist2(target,xyz[i],xyz[i+1],xyz[i+2]);
  if(d<best){best=d;index=i/3;}
 }
 return {name,index,distanceMm:round(Math.sqrt(best)*1000),world:target};
}
export function auditAIGReal3DDenseAnatomy({
 sourceGeometry,sourceEvidence,sourceSha256,landmarks=null
}={}){
 const geo=sourceGeometry,e=sourceEvidence;
 if(!SHA.test(sourceSha256??'')||
  e?.schema!==AIG_REAL3D_DENSE_SOURCE_SCHEMA||
  e.sourceSha256!==sourceSha256||
  !geo?.originalGlobalIndexSpace||geo.noChunkBoundarySeamInference!==true||
  !(geo.positions instanceof Float32Array)||
  !(geo.indices instanceof Uint32Array)||
  geo.positions.length!==e.originalVertexCount*3||
  geo.indices.length!==e.originalTriangleCount*3||
  e.renderedTriangleCount!==e.originalTriangleCount||
  !Number.isFinite(geo.metersPerRawUnit)||geo.metersPerRawUnit<=0)
  fail('SOURCE_GLOBAL_INDEX_AND_SHA_REQUIRED');
 const n=e.originalVertexCount,faces=e.originalTriangleCount,
  pos=geo.positions,index=geo.indices;
 if(n<4||n>350000||faces<4||faces>700000)
  fail('SOURCE_CAPACITY_EXCEEDED');
 // A sidecar is a self-reported coordinate annotation, not scan authentication.
 if(landmarks!==null&&(typeof landmarks!=='object'||Array.isArray(landmarks)||
  Object.keys(landmarks).length>80))fail('LANDMARK_FORMAT');
 const base=validateAIGReal3DLandmarkSidecar(landmarks);
 const names=[...new Set(ZONES.flatMap(z=>z.names))];
 const missing=names.filter(name=>{
  const p=landmarks?.[name];
  return !Array.isArray(p)||p.length!==3||
   !p.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<1e6);
 });
 const measured={};
 for(const name of names)if(!missing.includes(name))
  measured[name]=measureMarker(name,landmarks[name],geo,e.upAxis);
 // Source index connectivity, NEVER recomputed from separated GPU chunks.
 const parent=new Int32Array(n);
 for(let i=0;i<n;i++)parent[i]=i;
 const root=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
 const join=(a,b)=>{const x=root(a),y=root(b);if(x!==y)parent[y]=x;};
 for(let i=0;i<index.length;i+=3){
  const a=index[i],b=index[i+1],c=index[i+2];
  if(a>=n||b>=n||c>=n||a===b||b===c||a===c)
   fail('INVALID_ORIGINAL_TRIANGLE');
  join(a,b);join(b,c);
 }
 const components=new Set();
 for(let i=0;i<n;i++)components.add(root(i));
 const radius=Math.max(.035,e.heightMm/1000*.04);
 const regions=ZONES.map(zone=>{
  const available=zone.names.map(name=>measured[name]).filter(Boolean);
  const absent=zone.names.filter(name=>!measured[name]);
  const mask=new Uint8Array(n),selected=[];
  if(available.length){
   const threshold=radius*radius;
   for(let i=0;i<n;i++){
    const at=p3(pos,i),x=pos[at],y=pos[at+1],z=pos[at+2];
    if(available.some(m=>dist2(m.world,x,y,z)<=threshold)){
     mask[i]=1;selected.push(i);
    }
   }
  }
  const edges=new Map(),longest=[],areas=[];
  let selectedTriangles=0,degenerate=0;
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const vi of selected){
   const at=p3(pos,vi);
   for(let k=0;k<3;k++){
    min[k]=Math.min(min[k],pos[at+k]);
    max[k]=Math.max(max[k],pos[at+k]);
   }
  }
  const BASE=350001;
  const addEdge=(a,b)=>{
   // Only edges incident on the selected radius are measured; all their
   // incident global source faces are included by the triangle scan.
   if(!mask[a]&&!mask[b])return;
   const small=Math.min(a,b),large=Math.max(a,b),id=small*BASE+large;
   const old=edges.get(id);
   if(old){old.count++;if(a===old.a)old.sameDirection++;}
   else edges.set(id,{a,b,count:1,sameDirection:0});
  };
  if(available.length)for(let i=0;i<index.length;i+=3){
   const a=index[i],b=index[i+1],c=index[i+2];
   if(!mask[a]&&!mask[b]&&!mask[c])continue;
   selectedTriangles++;
   const a0=p3(pos,a),b0=p3(pos,b),c0=p3(pos,c);
   const ux=pos[b0]-pos[a0],uy=pos[b0+1]-pos[a0+1],uz=pos[b0+2]-pos[a0+2],
    vx=pos[c0]-pos[a0],vy=pos[c0+1]-pos[a0+1],vz=pos[c0+2]-pos[a0+2],
    cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;
   const twiceArea=Math.hypot(cx,cy,cz);
   if(twiceArea<1e-11)degenerate++;
   areas.push(twiceArea*500000);
   const ab=Math.hypot(ux,uy,uz),
    ac=Math.hypot(vx,vy,vz),
    bc=Math.hypot(pos[c0]-pos[b0],pos[c0+1]-pos[b0+1],pos[c0+2]-pos[b0+2]);
   longest.push(Math.max(ab,ac,bc)*1000);
   addEdge(a,b);addEdge(b,c);addEdge(c,a);
   if(edges.size>1050000)fail('REGION_EDGE_BUDGET_EXCEEDED');
  }
  let open=0,nonmanifold=0,winding=0;
  for(const edge of edges.values()){
   if(edge.count===1)open++;
   else if(edge.count>2)nonmanifold++;
   else if(edge.sameDirection===1)winding++;
  }
  const markerRoots=new Set(available.map(a=>root(a.index)));
  const worstSnap=available.length?Math.max(...available.map(m=>m.distanceMm)):null;
  const warning=[];
  if(absent.length)warning.push('REQUIRED_NATIVE_MARKER_MISSING');
  if(!selectedTriangles||selected.length<10)warning.push('LOCAL_SOURCE_TRIANGLES_MISSING');
  if(open)warning.push('ORIGINAL_SOURCE_OPEN_EDGES');
  if(nonmanifold)warning.push('ORIGINAL_SOURCE_NONMANIFOLD_EDGES');
  if(winding)warning.push('ORIGINAL_SOURCE_WINDING_CONFLICT');
  if(markerRoots.size>1)warning.push('MARKERS_ON_DISCONNECTED_ORIGINAL_SHELLS');
  if(worstSnap!==null&&worstSnap>Math.max(3,e.heightMm*.003))
   warning.push('LANDMARK_TOO_FAR_FROM_ORIGINAL_SURFACE');
  const p95=pct95(longest);
  if(p95!==null&&p95>8)warning.push('SOURCE_DETAIL_TOO_COARSE_8MM_REVIEW');
  if(degenerate)warning.push('SOURCE_DEGENERATE_TRIANGLES');
  let fingerEvidence=null;
  if(zone.id.includes('FIVE_DIGITS')){
   const side=zone.id.startsWith('LEFT')?'left':'right';
   const points=tips(side).map(name=>measured[name]).filter(Boolean);
   let pairwiseDistinct=points.length===5;
   let minimumTipSeparationMm=null;
   for(let a=0;a<points.length;a++)for(let b=a+1;b<points.length;b++){
    const d=round(Math.sqrt(dist2(points[a].world,...points[b].world))*1000);
    minimumTipSeparationMm=Math.min(minimumTipSeparationMm??Infinity,d);
    if(d<3||points[a].index===points[b].index)pairwiseDistinct=false;
   }
   if(!pairwiseDistinct)warning.push('FIVE_DISTINCT_FINGERTIPS_NOT_DEMONSTRATED');
   fingerEvidence={
    fiveNamedTipsProvided:points.length===5,
    distinctNativeSurfaceVertexReferences:new Set(points.map(p=>p.index)).size,
    minimumWorldTipSeparationMm,
    distinctFiveTipAnnotationCheck:pairwiseDistinct,
    fiveRealFingerBranchesGeometricallyProven:false,
    naturalFiveFingersCertified:false
   };
  }
  return {
   id:zone.id,label:zone.label,sourceGlobalIndexSpace:true,
   sourceRadiusMm:round(radius*1000),
   requiredMarkers:zone.names,missingMarkers:absent,
   snappedMarkers:available.map(m=>({
    name:m.name,originalVertexIndex:m.index,snapErrorMm:m.distanceMm,
    originalIndexShell:root(m.index)
   })),
   sourceVerticesWithinRadius:selected.length,
   originalTrianglesTouchingRadius:selectedTriangles,
   originalSourceEdgesTouchingRadius:edges.size,
   openEdges:open,nonManifoldEdges:nonmanifold,
   windingConflictEdges:winding,degenerateTriangles:degenerate,
   markerIndexConnectedComponents:markerRoots.size,
   localLongestTriangleEdgeP95Mm:p95,
   localTriangleAreaP95Mm2:pct95(areas),
   localXYZExtentsMm:selected.length?min.map((x,k)=>round((max[k]-x)*1000)):null,
   fingerEvidence,warnings:warning,
   technicalInspectabilityReady:warning.length===0,
   humanAnatomicalNaturalnessVerified:false
  };
 });
 return {
  schema:AIG_REAL3D_DENSE_ANATOMY_SCHEMA,
  sourceSha256,
  originalVertices:n,originalTriangles:faces,
  gpuChunksExcludedFromTopologyAnalysis:true,
  fullGlobalOriginalIndexSpaceUsed:true,
  globalOriginalIndexConnectedComponents:components.size,
  originalSourceTrianglesPreserved:faces===e.renderedTriangleCount,
  requiredBase21LandmarksPresent:base.allRequiredNamesPresent,
  requiredExtraSixFingertipsPresent:EXTRA_DIGITS.every(t=>
   ['left','right'].every(s=>Boolean(measured[s+t]))),
  missingRequiredMarkers:missing,
  regions,regionsRequiringReview:regions.filter(r=>r.warnings.length).length,
  localGeometryCanBeInspected:regions.every(r=>r.technicalInspectabilityReady),
  zeroAutomaticGeometryChanges:true,
  independentlyVerifiedTrueHumanScan:false,
  naturallyAnatomicalHeadNeckFingersFeetApproved:false,
  humanReviewRequired:true,
  releasePASS:false
 };
}
export function reviewAIGReal3DDenseFourView({
 sourceSha256,anatomy,viewRecords=[]
}={}){
 if(!SHA.test(sourceSha256??'')||anatomy?.sourceSha256!==sourceSha256||
 anatomy.schema!==AIG_REAL3D_DENSE_ANATOMY_SCHEMA||
 !Array.isArray(viewRecords)||viewRecords.length>4)
  fail('FOURVIEW_SOURCE_AND_ANATOMY_REQUIRED');
 const seen=new Set(),views=[];
 for(const v of viewRecords){
  if(!VIEWS.includes(v?.angle)||seen.has(v.angle)||!SHA.test(v.gpuSha256??'')||
   v.width!==1080||v.height!==1920||
   (v.referenceSha256!==null&&v.referenceSha256!==undefined&&
    !SHA.test(v.referenceSha256))||
   (v.iou!==null&&v.iou!==undefined&&
    (!Number.isFinite(v.iou)||v.iou<0||v.iou>1)))
   fail('FOURVIEW_RECORD_INVALID');
  seen.add(v.angle);
  views.push({angle:v.angle,gpuSha256:v.gpuSha256,
   referenceSha256:v.referenceSha256??null,
   width:v.width,height:v.height,
   intersectionOverUnion:v.iou??null,
   comparisonError:v.comparisonError??null,
   actualGpuCapture:true,
   contourDiagnosticOnlyNotBiometricIdentity:true});
 }
 const missingGpu=VIEWS.filter(x=>!seen.has(x)),
  missingReferences=VIEWS.filter(x=>!views.some(v=>v.angle===x&&
   v.referenceSha256&&v.intersectionOverUnion!==null));
 return {
  schema:AIG_REAL3D_DENSE_FOURVIEW_SCHEMA,sourceSha256,views,
  missingGpuAngles:missingGpu,missingValidatedReferenceComparisons:missingReferences,
  fourRealGPUViewsCaptured:missingGpu.length===0,
  fourReferenceContoursCompared:missingReferences.length===0,
  fourAnglesGeometryAndContourTechnicalReviewReady:missingGpu.length===0&&
   missingReferences.length===0&&anatomy.localGeometryCanBeInspected,
  referencePhotosSamePersonIndependentlyAuthenticated:false,
  modelSourceIndependentlyAuthenticated:false,
  anatomicalRealismCertified:false,
  naturalAppearancePASS:false,
  releasePASS:false
 };
}
