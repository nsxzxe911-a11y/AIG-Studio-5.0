/**
 * Real3D 3.2: all TWENTY fingers/toes independently articulated, backed by
 * actual 3D XYZ joint centerlines and smooth non-box 3D swept surfaces.
 * Counts: 10 hand fingers + 10 foot toes, 56 phalanx links (thumbs/big toes
 * have two, others three). 20 independent spread and curl controls.
 *
 * The source Real3D 3.0 model is PRESERVED. Visible 2D hand/foot labels
 * determine evidence status. If not seen, digit meshes are explicit
 * ANATOMICAL_PRIOR_PREVIEW rooted on observed arm/leg endpoints, never a
 * claim to have scanned individual fingers/toes or physical 1:1 accuracy.
 * No physical finger/toe collision or true skin tissue simulation claim.
 */
export const AIG32_SCHEMA='AIG_REAL3D_3_2_TWENTY_INDEPENDENT_DIGIT_SURFACES';
const fail=x=>{throw Error('AIG32_'+x)};
const C=(v,a,b)=>Math.max(a,Math.min(b,v));
const unit=v=>{const m=Math.hypot(...v)||1;return v.map(x=>x/m)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const mul=(a,s)=>a.map(x=>x*s);
const lerp=(a,b,t)=>a.map((x,i)=>x*(1-t)+b[i]*t);
const DIGIT_NAMES=Object.freeze(['thumb','index','middle','ring','little']);
const BODY_SIDES=Object.freeze(['left','right']);
export const AIG32_DIGITS=Object.freeze([
 ...BODY_SIDES.flatMap(side=>DIGIT_NAMES.map((name,index)=>
  Object.freeze({id:side+'Hand'+name,side,type:'hand',
   name,index,phalanges:index===0?2:3}))),
 ...BODY_SIDES.flatMap(side=>DIGIT_NAMES.map((name,index)=>
  Object.freeze({id:side+'Foot'+name,side,type:'foot',
   name,index,phalanges:index===0?2:3})))
]);
const DIGITS_BY_ID=new Map(AIG32_DIGITS.map(x=>[x.id,x]));
const isTyped=s=>s instanceof Float32Array;
function labelsStats(mesh){
 if(!isTyped(mesh?.positions)||
  !(mesh.vertexSourceLabelIds instanceof Uint8Array)||
  mesh.positions.length!==mesh.vertexSourceLabelIds.length*3||
  mesh.positions.length<300)fail('VERIFIED_SOURCE_VERTEX_LABELS_REQUIRED');
 const summary=new Map();
 for(let i=0;i<mesh.vertexSourceLabelIds.length;i++){
  const label=mesh.vertexSourceLabelIds[i],k=i*3,
   x=mesh.positions[k],y=mesh.positions[k+1],z=mesh.positions[k+2];
  if(![x,y,z].every(Number.isFinite))fail('NONFINITE_SOURCE_BODY_POINT');
  if(!summary.has(label))summary.set(label,{
   count:0,minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,
   minZ:Infinity,maxZ:-Infinity,x:0,y:0,z:0
  });
  const v=summary.get(label);v.count++;
  v.x+=x;v.y+=y;v.z+=z;
  v.minX=Math.min(v.minX,x);v.maxX=Math.max(v.maxX,x);
  v.minY=Math.min(v.minY,y);v.maxY=Math.max(v.maxY,y);
  v.minZ=Math.min(v.minZ,z);v.maxZ=Math.max(v.maxZ,z);
 }
 for(const v of summary.values()){
  v.x/=v.count;v.y/=v.count;v.z/=v.count;
 }
 return summary;
}
function getAnchor(byLabel,part,side){
 const left=side==='left';
 const fine=part==='hand'?(left?8:9):(left?12:13);
 const parent=part==='hand'?(left?6:7):(left?10:11);
 const specific=byLabel.get(fine),coarse=byLabel.get(parent);
 const root=specific?.count>=18?specific:coarse?.count>=24?coarse:null;
 if(!root)return null;
 const observedIndividualDigitCount=0; // single 2D class ≠ 5 fingers
 const recordedHandOrFootMask=specific?.count>=18;
 const point=part==='hand'?
  [root.x,root.minY+.009,root.z+.01]:
  [root.x,root.minY+.019,Math.max(root.maxZ,root.z)+.015];
 return {
  xyz:point,parentLabel:parent,sourcePartLabel:fine,
  observedPartLabel:recordedHandOrFootMask,
  observedIndividualDigitCount,
  sourceVisiblePartVertexCount:specific?.count??0,
  effectiveRootSourceLabel:recordedHandOrFootMask?fine:parent,
  sourceEvidence:recordedHandOrFootMask?
   'VISIBLE_HAND_OR_FOOT_CLASS_BUT_DIGITS_NOT_RESOLVED':
   'ANATOMICAL_PRIOR_FROM_VISIBLE_ARM_OR_LEG_ENDPOINT',
  physicallyMeasuredDigitLocation:false
 };
}
export function makeAIG32DigitRig(fused){
 if(!fused?.manifoldAudit?.closedManifold||
  !fused?.fusedOnePieceMesh?.trueOnePieceIndexedGeometry||
  typeof fused.sourceSha256!=='string'||
  !/^sha256:[a-f0-9]{64}$/.test(fused.sourceSha256))
  fail('CLOSED_SOURCE_3D_SURFACE_SHA_REQUIRED');
 const mesh=fused.fusedOnePieceMesh,stats=labelsStats(mesh);
 const height=fused.bodyHeightUnits;
 if(!Number.isFinite(height)||height<.5||height>3)
  fail('SOURCE_BODY_SCALE_BOUNDS_REQUIRED');
 const anchors={},unavailable=[];
 for(const side of BODY_SIDES)for(const type of ['hand','foot']){
  const k=side+(type==='hand'?'Hand':'Foot'),
   value=getAnchor(stats,type,side);
  anchors[k]=value;
  if(!value)unavailable.push(k);
 }
 return {
  schema:AIG32_SCHEMA,sourceSha256:fused.sourceSha256,
  anchoredBodyHeightRelativeUnits:height,
  sourceAnchors:anchors,missingSourceParts:unavailable,
  digitInventory:AIG32_DIGITS,
  definedDigitCount:AIG32_DIGITS.length,
  definedPhalanxCount:AIG32_DIGITS.reduce((n,d)=>n+d.phalanges,0),
  modelActualDigitRootCount:Object.values(anchors).filter(Boolean).length,
  observedIndividualFingerOrToeCount:0,
  originalRestMeshPositionsPreserved:true,originalPhotoPreserved:true,
  originalGLBAndCNCUnchanged:true,preciseHumanFingerMeasurements:false,
  full20AnatomicalRealismApproved:false,releaseAllowed:false
 };
}
function pathPoints(digit,root,bodyHeight,pose){
 const step=bodyHeight*(digit.type==='hand'?.071:.052);
 const lengths=digit.type==='hand'?
  [0.76,0.95,1,0.88,0.72]:
  [1,.82,.77,.67,.54];
 const total=step*lengths[digit.index];
 const seg=digit.phalanges;
 const fractions=seg===2?[.58,.42]:[.48,.32,.20];
 const spreadAngle=C(pose.spread??0,-25,25)*Math.PI/180;
 const width=bodyHeight*(digit.type==='hand'?.018:.027),
  shift=bodyHeight*(digit.type==='hand'?.034:.046);
 const sideSign=digit.side==='left'?-1:1;
 // Little and thumb have distinct lateral base positions; actual photo
 // cannot resolve each digit, so these are inspectable hypotheses.
 const order=digit.index-2,
  base=add(root.xyz,[order*width,
   0,digit.type==='hand'?.012*bodyHeight:0]);
 // Both hands emerge downward from wrists, toes forward from feet.
 const direction=digit.type==='hand'?[0,-1,0]:[0,0,1];
 const spread=add(mul(direction,Math.cos(spreadAngle)),
  [Math.sin(spreadAngle)*sideSign,0,0]);
 let tip=[...base];
 const points=[[...tip]];
 const angles=pose.jointAnglesDegrees??Array(seg).fill(0);
 if(!Array.isArray(angles)||angles.length!==seg||
  angles.some(a=>!Number.isFinite(a)||a<0||a>85))
  fail('PER_PHALANX_FLEXION_OUTSIDE_PREVIEW_0_TO_85');
 let curl=0;
 for(let j=0;j<seg;j++){
  curl+=angles[j]*Math.PI/180;
  // finger flex rotates toward anatomical palm: +Z;
  // toe flex rotates toward the ground: -Y.
  const tangent=digit.type==='hand'?
   unit([spread[0]*Math.cos(curl),-Math.cos(curl),
    Math.sin(curl)]):
   unit([spread[0]*Math.cos(curl),-Math.sin(curl),
    Math.cos(curl)]);
  tip=add(tip,mul(tangent,total*fractions[j]));
  points.push([...tip]);
 }
 return {points,total,angles,base,rootEvidence:root.sourceEvidence};
}
function sweepDigitSurface(digit,origin,bodyHeight,pose,{
 radialSegments=16,ringsPerPhalanx=5
}={}){
 if(!Number.isInteger(radialSegments)||radialSegments<12||
  radialSegments>36||radialSegments%4||
  !Number.isInteger(ringsPerPhalanx)||ringsPerPhalanx<3||
  ringsPerPhalanx>10)fail('BOUNDED_SKIN_RENDER_DETAIL_REQUIRED');
 const chain=pathPoints(digit,origin,bodyHeight,pose);
 const positions=[],indices=[];
 const segmentCount=chain.points.length-1,rings=[],TAU=Math.PI*2;
 const rawRadius=bodyHeight*(digit.type==='hand'?.0095:.012)*
  [1.18,1.03,1,0.94,0.79][digit.index];
 const ringTotal=segmentCount*ringsPerPhalanx+1;
 for(let r=0;r<ringTotal;r++){
  const t=r/(ringTotal-1),
   part=Math.min(segmentCount-1,Math.floor(t*segmentCount)),
   inner=(t*segmentCount-part);
  const a=chain.points[part],b=chain.points[part+1];
  // Cubic smoothstep avoids sharp edges at a single source joint;
  // may only approximate true tendon-driven finger morphology.
  const smooth=inner*inner*(3-2*inner);
  const center=lerp(a,b,smooth);
  const prev=chain.points[Math.max(0,part-1)],
   next=chain.points[Math.min(chain.points.length-1,part+2)];
  const tangent=unit([
   b[0]-a[0]+.2*(next[0]-prev[0]),
   b[1]-a[1]+.2*(next[1]-prev[1]),
   b[2]-a[2]+.2*(next[2]-prev[2])
  ]);
  const ref=digit.type==='hand'?[0,0,1]:[0,1,0];
  let u=unit(cross(tangent,ref)),v=unit(cross(tangent,u));
  const taper=.98-.48*t+.055*Math.sin(t*segmentCount*Math.PI)**2,
   radius=Math.max(.001,rawRadius*taper);
  const ring=[];
  for(let k=0;k<radialSegments;k++){
   const angle=k*TAU/radialSegments,
    pt=add(center,add(mul(u,radius*Math.cos(angle)),
     mul(v,radius*.84*Math.sin(angle))));
   const n=positions.length/3;ring.push(n);positions.push(...pt);
  }
  rings.push(ring);
 }
 for(let r=0;r<rings.length-1;r++)
  for(let k=0;k<radialSegments;k++){
   const next=(k+1)%radialSegments,
    a=rings[r][k],b=rings[r][next],
    c=rings[r+1][k],d=rings[r+1][next];
   indices.push(a,b,c,b,d,c);
  }
 const startCenter=positions.length/3;
 positions.push(...chain.points[0]);
 const endCenter=positions.length/3;
 positions.push(...chain.points[chain.points.length-1]);
 for(let k=0;k<radialSegments;k++){
  const next=(k+1)%radialSegments,
   last=rings[rings.length-1];
  indices.push(startCenter,rings[0][next],rings[0][k]);
  indices.push(endCenter,last[k],last[next]);
 }
 const points=new Float32Array(positions),tris=new Uint32Array(indices);
 if(points.some(v=>!Number.isFinite(v))||
  points.length/3<30||tris.length/3<40)
  fail('VALID_REAL_3D_SURFACE_REQUIRED');
 return {
  id:digit.id,side:digit.side,type:digit.type,index:digit.index,
  sourceProvenance:origin.sourceEvidence,
  sourceVisibleIndividualDigitMeasured:false,
  restJointPointCount:chain.points.length,
  phalanxCount:digit.phalanges,
  actual3DJointXYZ:chain.points,
  articulatedJointAnglesDegrees:[...chain.angles],
  curlDegrees:chain.angles.reduce((a,b)=>a+b,0),
  spreadDegrees:pose.spread??0,
  realCurved3DVertexCount:points.length/3,
  triangleCount:tris.length/3,
  positions:points,indices:tris,
  anatomicalSurfaceFromMeasuredFingers:false,
  printableAsAttachedUnifiedHand:false,
  previewOnly:true
 };
}
export function poseAIG32AllDigits(rig,poses={},opts={}){
 if(rig?.schema!==AIG32_SCHEMA)fail('SOURCE_DIGIT_RIG_REQUIRED');
 if(!poses||typeof poses!=='object'||Array.isArray(poses))
  fail('DIGIT_POSE_MANIFEST_INVALID');
 for(const [id,v] of Object.entries(poses)){
  if(!DIGITS_BY_ID.has(id)||!v||typeof v!=='object'||
   Object.keys(v).some(k=>!['jointAnglesDegrees','spread'].includes(k)))
   fail('UNKNOWN_DIGIT_OR_MALFORMED_POSE_'+id);
 }
 const meshes=[],blocked=[],summary=[];
 for(const digit of AIG32_DIGITS){
  const anchor=rig.sourceAnchors[digit.side+
   (digit.type==='hand'?'Hand':'Foot')];
  if(!anchor){blocked.push(digit.id);continue}
  const p=poses[digit.id]??{
   jointAnglesDegrees:Array(digit.phalanges).fill(0),spread:0};
  if(!Number.isFinite(p.spread)||p.spread<-25||p.spread>25)
   fail('DIGIT_SPREAD_LIMIT_25_DEGREES_'+digit.id);
  const mesh=sweepDigitSurface(digit,anchor,
   rig.anchoredBodyHeightRelativeUnits,p,opts);
  meshes.push(mesh);
  summary.push({
   id:mesh.id,phalanges:mesh.phalanxCount,
   observedSourceDigit:false,sourceProvenance:mesh.sourceProvenance,
   jointAnglesDegrees:mesh.articulatedJointAnglesDegrees,
   actualTipXYZ:mesh.actual3DJointXYZ.at(-1),
   actualTriangleCount:mesh.triangleCount
  });
 }
 return {
  schema:AIG32_SCHEMA,sourceSha256:rig.sourceSha256,
  definedDigits:20,definedPhalanges:56,
  generatedActual3DDigits:meshes.length,
  generatedActual3DPhalanges:meshes.reduce((n,m)=>n+m.phalanxCount,0),
  independentlyControlledDigitCount:meshes.length,
  actualCurved3DTriangleCount:meshes.reduce((n,m)=>n+m.triangleCount,0),
  blockedMissingSourceDigits:blocked,
  all20RenderedOnlyIfFourHandFootRootZonesAvailable:blocked.length===0,
  actualPositionsAndIndexedTrianglesPresent:true,
  anatomicalVisibleSourceDigitCount:0,
  originalRestSDFAndGLBUnmodified:true,
  exactHumanAnatomyVerified:false,
  physical3DPrintabilityVerified:false,
  realMeasured1to1:false,
  digitSummary:summary,meshes
 };
}
