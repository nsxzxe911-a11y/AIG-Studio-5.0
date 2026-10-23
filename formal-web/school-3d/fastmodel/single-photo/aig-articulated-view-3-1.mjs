/**
 * Real3D 3.1: real, bounded smooth vertex deformation of the existing ONE
 * 3.0 SDF fused surface. Unlike moving the whole object, skull motion
 * is independent from neck, spine, shoulders, elbows, hips, knees and ankles.
 *
 * Conservative motion envelopes are engineering preview limits, NOT medically
 * universal cervical ROM. Head camera orbit +/-180 deg is CAMERA ONLY.
 * No second renderer, no bone labels invented from RGB, no fake measured
 * anatomy, source geometry and GLB remain unchanged. Posed surface topology
 * retains indices, but self-intersection/collision is NOT yet certified.
 */
export const AIG31_SCHEMA='AIG_REAL3D_3_1_SOURCE_BOUNDED_SMOOTH_JOINT_DEFORM';
const fail=s=>{throw Error('AIG31_'+s)};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const JOINTS={
 neckYaw:{axis:'y',min:-30,max:30},
 neckPitch:{axis:'x',min:-20,max:20},
 headYaw:{axis:'y',min:-40,max:40},
 headPitch:{axis:'x',min:-25,max:25},
 headRoll:{axis:'z',min:-20,max:20},
 spineBend:{axis:'x',min:-20,max:20},
 leftShoulder:{axis:'z',min:-75,max:75},
 rightShoulder:{axis:'z',min:-75,max:75},
 leftElbow:{axis:'x',min:0,max:120},
 rightElbow:{axis:'x',min:0,max:120},
 leftHip:{axis:'x',min:-45,max:60},
 rightHip:{axis:'x',min:-45,max:60},
 leftKnee:{axis:'x',min:0,max:125},
 rightKnee:{axis:'x',min:0,max:125},
 leftAnkle:{axis:'x',min:-25,max:25},
 rightAnkle:{axis:'x',min:-25,max:25}
};
export const AIG31_JOINT_LIMITS=Object.freeze(Object.fromEntries(
 Object.entries(JOINTS).map(([k,v])=>[k,Object.freeze({...v})])));
const VALID_CLASSES=new Set([2,3,4,5,6,7,8,9,10,11,12,13,14]);
const radialDistance=(p,j)=>Math.hypot(p[0]-j[0],p[1]-j[1],p[2]-j[2]);
function centroid(points,filter,minCount=15){
 let n=0,x=0,y=0,z=0,minY=Infinity,maxY=-Infinity;
 for(const p of points)if(filter(p)){
  x+=p.x;y+=p.y;z+=p.z;n++;
  minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
 }
 if(n<minCount)return null;
 return {x:x/n,y:y/n,z:z/n,minY,maxY,count:n};
}
function geometryPoints(mesh){
 const {positions,vertexSourceLabelIds:labels}=mesh||{};
 if(!(positions instanceof Float32Array)||
  !(labels instanceof Uint8Array)||positions.length/3!==labels.length||
  positions.length<450||positions.length>2000000)
  fail('SOURCE_FUSED_MESH_POSITION_CLASS_REQUIRED');
 const pts=[];
 for(let i=0;i<labels.length;i++){
  const k=i*3,p={x:positions[k],y:positions[k+1],
   z:positions[k+2],label:labels[i]};
  if(![p.x,p.y,p.z].every(Number.isFinite))fail('NONFINITE_SOURCE_VERTEX');
  pts.push(p);
 }
 return pts;
}
function jointAnchors(pts){
 const skull=centroid(pts,p=>p.label===2),
  neck=centroid(pts,p=>p.label===4),
  torso=centroid(pts,p=>p.label===14||p.label===5),
  leftArm=centroid(pts,p=>p.label===6||p.label===8),
  rightArm=centroid(pts,p=>p.label===7||p.label===9),
  leftLeg=centroid(pts,p=>p.label===10||p.label===12),
  rightLeg=centroid(pts,p=>p.label===11||p.label===13);
 if(!skull||!neck||!torso||!leftArm||!rightArm||!leftLeg||!rightLeg)
  fail('REVIEWED_HEAD_NECK_TORSO_TWO_ARMS_TWO_LEGS_REQUIRED');
 if(!(skull.y>neck.y&&neck.y>torso.minY&&
  leftLeg.y<torso.y&&rightLeg.y<torso.y))
  fail('ACTUAL_SOURCE_ANATOMY_VERTICAL_ORDER_INVALID');
 // All pivots constrained to visible source geometry; NOT tracked
 // or physically measured skeleton joint centers.
 const headBase=(skull.minY+neck.maxY)/2;
 const pivots={
  neckYaw:[neck.x,neck.minY,neck.z],
  neckPitch:[neck.x,neck.minY,neck.z],
  headYaw:[skull.x,headBase,skull.z],
  headPitch:[skull.x,headBase,skull.z],
  headRoll:[skull.x,headBase,skull.z],
  spineBend:[torso.x,torso.minY+(.26*(torso.maxY-torso.minY)),torso.z]
 };
 const setSide=(prefix,arm,leg)=>{
  const s=prefix==='left'?-1:1;
  pivots[prefix+'Shoulder']=[arm.x,arm.maxY-.035,arm.z];
  pivots[prefix+'Elbow']=[arm.x+s*.004,arm.minY+.46*(arm.maxY-arm.minY),arm.z];
  pivots[prefix+'Hip']=[leg.x,leg.maxY+.016,leg.z];
  pivots[prefix+'Knee']=[leg.x,leg.minY+.54*(leg.maxY-leg.minY),leg.z];
  pivots[prefix+'Ankle']=[leg.x,leg.minY+.13*(leg.maxY-leg.minY),leg.z];
 };
 setSide('left',leftArm,leftLeg);setSide('right',rightArm,rightLeg);
 return {pivots,skull,neck,torso,leftArm,rightArm,leftLeg,rightLeg};
}
function rotateAround(point,pivot,axis,degree){
 const rad=degree*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad);
 const x=point[0]-pivot[0],y=point[1]-pivot[1],z=point[2]-pivot[2];
 let a,b,d;
 if(axis==='x'){a=x;b=y*c-z*s;d=y*s+z*c}
 else if(axis==='y'){a=x*c+z*s;b=y;d=z*c-x*s}
 else {a=x*c-y*s;b=x*s+y*c;d=z}
 return [pivot[0]+a,pivot[1]+b,pivot[2]+d];
}
function jointWeight(joint,p,anchors){
 const {skull,neck,torso,leftArm,rightArm,leftLeg,rightLeg,pivots}=anchors;
 const height=Math.max(.45,skull.maxY-Math.min(leftLeg.minY,rightLeg.minY));
 const width=.035*height,headBase=pivots.headYaw[1];
 const inHead=p.label===2||p.label===3, inNeck=p.label===4;
 if(joint.startsWith('head')){
  if(inHead)return smooth((p.y-headBase+width)/(width*2));
  if(inNeck)return .18*smooth((p.y-neck.minY)/(neck.maxY-neck.minY||1));
  return 0;
 }
 if(joint.startsWith('neck')){
  if(inHead)return 1;
  if(inNeck)return smooth((p.y-neck.minY)/(neck.maxY-neck.minY||1));
  return 0;
 }
 if(joint==='spineBend'){
  const w=smooth((p.y-pivots.spineBend[1])/(height*.22));
  if(inHead||inNeck||p.label===14||p.label===5)return w;
  if(p.label===6||p.label===7||p.label===8||p.label===9)return .45*w;
  return 0;
 }
 const left=joint.startsWith('left'),arm=left?leftArm:rightArm,
  leg=left?leftLeg:rightLeg;
 const shoulder=joint.endsWith('Shoulder'),elbow=joint.endsWith('Elbow'),
  hip=joint.endsWith('Hip'),knee=joint.endsWith('Knee'),
  ankle=joint.endsWith('Ankle');
 if(shoulder||elbow){
  const match=left?[6,8]:[7,9];
  if(!match.includes(p.label))return 0;
  if(shoulder)return 1;
  return smooth((pivots[joint][1]-p.y+width)/(width*2));
 }
 if(hip||knee||ankle){
  const match=left?[10,12]:[11,13];
  if(!match.includes(p.label))return 0;
  if(hip)return 1;
  return smooth((pivots[joint][1]-p.y+width)/(width*2));
 }
 return 0;
}
export function makeAIG31HeadBodyRig(fused){
 const mesh=fused?.fusedOnePieceMesh,pts=geometryPoints(mesh);
 if(!fused?.manifoldAudit?.closedManifold||
  !fused?.sourceSha256?.startsWith('sha256:')||
  !mesh?.trueOnePieceIndexedGeometry||
  mesh.indices?.length!==mesh.triangleCount*3)
  fail('VERIFIED_SINGLE_FUSED_SOURCE_MESH_REQUIRED');
 const anchors=jointAnchors(pts),original=new Float32Array(mesh.positions);
 const ids=Object.keys(JOINTS),affected={};
 for(const joint of ids){
  let count=0;
  for(const p of pts)if(jointWeight(joint,p,anchors)>.01)count++;
  affected[joint]=count;
 }
 for(const key of ['headYaw','neckYaw','leftShoulder','rightShoulder',
  'leftHip','rightHip'])
  if(affected[key]<15)fail('SOURCE_VERTEX_REGION_MISSING_'+key);
 return {
  schema:AIG31_SCHEMA,sourceSha256:fused.sourceSha256,
  restPositions:original,restIndices:mesh.indices,
  restVertexSourceLabels:new Uint8Array(mesh.vertexSourceLabelIds),
  anchorMetadata:anchors,
  realHeadNeckSeparateRegions:true,
  jointCount:ids.length,
  jointLimits:AIG31_JOINT_LIMITS,affectedVertices:affected,
  jointsDerivedFromVisiblePhotoLabels:true,
  anatomicallyMeasuredJointCenters:false,
  smoothBodyDeformationInsteadOfRigidWholeBodyRotation:true,
  fullNeck180DegreeRotationNotPermitted:true,
  originalGLBAndSourceVertexBytesPreserved:true,
  poseSelfIntersectionCertifed:false,
  humanLikenessCertified:false
 };
}
export function poseAIG31FusedMesh(rig,angles={}){
 if(rig?.schema!==AIG31_SCHEMA||
  !(rig.restPositions instanceof Float32Array))
  fail('VALID_REAL_REST_RIG_REQUIRED');
 for(const [name,degree] of Object.entries(angles)){
  if(!Object.hasOwn(JOINTS,name)||!Number.isFinite(degree)||
   degree<JOINTS[name].min||degree>JOINTS[name].max)
   fail('JOINT_RANGE_LIMIT_OR_UNKNOWN_JOINT_'+name);
 }
 const pose=Object.fromEntries(Object.keys(JOINTS).map(k=>[k,angles[k]??0]));
 const positions=new Float32Array(rig.restPositions),affected={};
 const pts=geometryPoints({positions:rig.restPositions,
  vertexSourceLabelIds:rig.restVertexSourceLabels});
 const order=['headYaw','headPitch','headRoll','neckYaw','neckPitch',
  'leftElbow','rightElbow','leftShoulder','rightShoulder',
  'leftKnee','rightKnee','leftAnkle','rightAnkle',
  'leftHip','rightHip','spineBend'];
 for(const joint of order){
  const angle=pose[joint];if(!angle)continue;
  const {axis}=JOINTS[joint],pivot=rig.anchorMetadata.pivots[joint];
  let changed=0;
  for(let i=0;i<pts.length;i++){
   const w=jointWeight(joint,pts[i],rig.anchorMetadata);
   if(w<=0)continue;
   const k=i*3,original=[positions[k],positions[k+1],positions[k+2]];
   const rotated=rotateAround(original,pivot,axis,angle*w);
   if(radialDistance(original,rotated)>1e-9)changed++;
   positions.set(rotated,k);
  }
  affected[joint]=changed;
 }
 let displaced=0,maxDisplacement=0,skullDisplaced=0,
  neckDisplaced=0,torsoDisplaced=0,armDisplaced=0;
 for(let i=0;i<pts.length;i++){
  const k=i*3,d=Math.hypot(positions[k]-rig.restPositions[k],
   positions[k+1]-rig.restPositions[k+1],
   positions[k+2]-rig.restPositions[k+2]);
  if(d>1e-8)displaced++;
  maxDisplacement=Math.max(maxDisplacement,d);
  const id=pts[i].label;
  if(d>1e-8&&id===2)skullDisplaced++;
  if(d>1e-8&&id===4)neckDisplaced++;
  if(d>1e-8&&(id===14||id===5))torsoDisplaced++;
  if(d>1e-8&&(id===6||id===7))armDisplaced++;
 }
 return {
  schema:AIG31_SCHEMA,sourceSha256:rig.sourceSha256,
  positions,poseAnglesDegrees:pose,actualMovedVertexCount:displaced,
  actualMaxVertexDisplacement:maxDisplacement,
  actuallyMovedByJoint:affected,
  headActualMovedVertices:skullDisplaced,
  neckActualMovedVertices:neckDisplaced,
  torsoActualMovedVertices:torsoDisplaced,
  armActualMovedVertices:armDisplaced,
  originalIndicesUnchanged:true,
  restSourceVertexBytesUnchanged:true,
  deformationRecomputesSurfaceNormalsInWebGL:true,
  selfIntersectionAndCollisionGate:'NOT_YET_MEASURED',
  headIsIndependentFromNeck:true,
  verifiedHumanCervicalROM:false,releaseAllowed:false
 };
}
export function cameraAIG31Orbit({
 target=[0,1,0],azimuthDegrees=0,
 elevationDegrees=0,radius=1.25
}={}){
 if(!Array.isArray(target)||target.length!==3||
  target.some(x=>!Number.isFinite(x))||
  !Number.isFinite(azimuthDegrees)||azimuthDegrees< -180||
  azimuthDegrees>180||
  !Number.isFinite(elevationDegrees)||elevationDegrees< -89||
  elevationDegrees>89||
  !Number.isFinite(radius)||radius<.20||radius>10)
  fail('CAMERA_ORBIT_ANGLE_BOUNDS_INVALID');
 const a=azimuthDegrees*Math.PI/180,e=elevationDegrees*Math.PI/180,
  dir=[Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)];
 return {
  target:[...target],position:target.map((v,i)=>v+dir[i]*radius),
  azimuthDegrees,elevationDegrees,
  headOrBodyWasPhysicallyTwisted:false,
  cameraFullLeftRight180Supported:true,
  cameraHeadTopAndFootUndersideSupported:true
 };
}
