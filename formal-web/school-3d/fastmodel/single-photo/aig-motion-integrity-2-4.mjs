/**
 * Real3D 2.4 | reject photo-card sway / rigid model transforms as animation.
 * Uses actually sampled THREE.SkinnedMesh vertex positions in mesh-local space
 * and internal pairwise-distance differences. Camera moves, billboard
 * rotation/translation/scale, single whole-body rigid motion and static clips
 * cannot create passing anatomical articulation evidence.
 *
 * This is a geometry/motion integrity gate, NOT motion realism certification.
 */
import {AnimationMixer,Vector3} from 'three';
export const AIG24_MOTION_SCHEMA='AIG_REAL3D_2_4_TRUE_ARTICULATED_3D_MOTION_GATE';
const fail=s=>{throw Error('AIG24_MOTION_'+s)};
const finite=Number.isFinite;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
 a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const norm=x=>Math.hypot(...x);
const pick=(pts,count)=>{
 if(pts.length<=count)return pts;
 const out=[];
 for(let i=0;i<count;i++)out.push(pts[Math.floor(i*(pts.length-1)/(count-1))]);
 return out;
};
/** Invariant to all common rigid transforms. Reject billboard/photo planes. */
export function inspectAIG24Volume(points){
 if(!Array.isArray(points)||points.length<4||
  points.length>10000||points.some(p=>!Array.isArray(p)||p.length!==3||
   p.some(n=>!finite(n))))fail('BOUNDED_XYZ_POINTS_REQUIRED');
 const origin=points[0];
 let p1=origin,d1=0;
 for(const p of points){const d=dist(origin,p);
  if(d>d1){d1=d;p1=p}}
 if(d1<=1e-8)return {hasNonPlanarGeometry:false,normalizedThickness:0};
 const axis=sub(p1,origin);
 let p2=origin,d2=0;
 for(const p of points){
  const perp=norm(cross(axis,sub(p,origin)))/d1;
  if(perp>d2){d2=perp;p2=p}
 }
 if(d2<=1e-9)return {hasNonPlanarGeometry:false,normalizedThickness:0};
 const normal=cross(axis,sub(p2,origin)),normalLength=norm(normal);
 let maxPlaneDistance=0;
 for(const p of points)
  maxPlaneDistance=Math.max(maxPlaneDistance,
   Math.abs(dot(normal,sub(p,origin)))/normalLength);
 // A surface that merely tilts in XYZ is still a 2D billboard.
 const ratio=maxPlaneDistance/d1;
 return {hasNonPlanarGeometry:ratio>=.015,
  normalizedThickness:+ratio.toFixed(6)};
}
/** If a rigid image/card or entire model simply rotates, all distances hold. */
export function compareAIG24RelativeGeometry(before,after,{relativeTolerance=.00025}={}){
 if(!Array.isArray(before)||!Array.isArray(after)||
  before.length!==after.length||before.length<4||
  before.length>512||!finite(relativeTolerance)||
  relativeTolerance<=0||relativeTolerance>.1||
  [...before,...after].some(p=>!Array.isArray(p)||p.length!==3||
   p.some(n=>!finite(n))))fail('SAMPLED_POSE_XYZ_REQUIRED');
 const base=pick(before,48),current=pick(after,48);
 let span=0;
 for(const p of base)span=Math.max(span,dist(p,base[0]));
 const tolerance=Math.max(1e-7,span*relativeTolerance);
 let changedPairs=0,comparedPairs=0,maxChange=0;
 // Both long-range and local bonds: rigid transforms preserve EVERY pair.
 for(let i=0;i<base.length;i++){
  for(let j=i+1;j<base.length;j++){
   if(j!==i+1&&j!==i+4&&j!==i+12&&j!==i+24&&j!==base.length-1)continue;
   comparedPairs++;
   const delta=Math.abs(dist(base[i],base[j])-dist(current[i],current[j]));
   if(delta>tolerance){changedPairs++;maxChange=Math.max(delta,maxChange)}
  }
 }
 return {changedPairs,comparedPairs,maxRelativeDistanceChange:
  span?+(maxChange/span).toFixed(6):0,
  internalVertexDeformation:changedPairs>=2};
}
const vertices=(mesh,count)=>{
 const attr=mesh.geometry?.getAttribute('position');
 if(!attr||attr.count<4)fail('ACTUAL_SKINNED_GEOMETRY_REQUIRED');
 const n=attr.count;if(n>60000)fail('SKINNED_MESH_VERTEX_BUDGET');
 const samples=Math.min(count,n),out=[];
 const vec=new Vector3();
 for(let i=0;i<samples;i++){
  const idx=Math.round(i*(n-1)/Math.max(1,samples-1));
  mesh.getVertexPosition(idx,vec);
  if(![vec.x,vec.y,vec.z].every(finite))fail('NONFINITE_SKINNED_POSITION');
  out.push([vec.x,vec.y,vec.z]);
 }
 return out;
};
export function auditAIG24ArticulatedAnimation(gltf,{
 maxClips=5,bodyMeshName='AIG56_NATIVE_FULLBODY_TECHNICAL_SKIN'
}={}){
 if(!gltf?.scene?.traverse||!Array.isArray(gltf.animations)||
  !Number.isInteger(maxClips)||maxClips<1||maxClips>12)
  fail('REAL_ANIMATED_GLTF_REQUIRED');
 const meshes=[];gltf.scene.traverse(n=>{if(n.isSkinnedMesh)meshes.push(n)});
 if(!meshes.length)fail('ONLY_IMAGE_PLANE_OR_UNSKINNED_MESH');
 // For humanoids the actual welded body (not skirt or ponytail) must move.
 const body=meshes.find(m=>m.name===bodyMeshName);
 if(!body||!body.skeleton?.bones?.length)
  fail('WELDED_REAL_SKINNED_BODY_REQUIRED');
 const rest=vertices(body,128);
 const volume=inspectAIG24Volume(rest);
 if(!volume.hasNonPlanarGeometry)fail('BILLBOARD_OR_FLAT_PHOTO_GEOMETRY');
 const distinctWeights=new Set();
 const weights=body.geometry.getAttribute('skinWeight');
 const indices=body.geometry.getAttribute('skinIndex');
 if(!weights||!indices)fail('REAL_SKIN_JOINT_ATTRIBUTES_REQUIRED');
 for(let i=0;i<weights.count;i++){
  for(let k=0;k<4;k++){
   const w=weights.getComponent(i,k),j=indices.getComponent(i,k);
   if(w>.08)distinctWeights.add(j);
  }
 }
 if(distinctWeights.size<6)fail('BODY_NOT_ACTUALLY_CONTROLLED_BY_MULTIPLE_BONES');
 const bones=body.skeleton.bones;
 const stored=bones.map(b=>({
  b,position:b.position.clone(),quaternion:b.quaternion.clone(),scale:b.scale.clone()
 }));
 const mixer=new AnimationMixer(gltf.scene),clips=[];
 try{
  for(const clip of gltf.animations.slice(0,maxClips)){
   if(!finite(clip.duration)||clip.duration<=0||clip.duration>3600)
    fail('ANIMATION_DURATION_INVALID');
   mixer.stopAllAction();
   const action=mixer.clipAction(clip).reset().play();
   mixer.setTime(0);gltf.scene.updateMatrixWorld(true);
   body.skeleton.update();
   const original=vertices(body,128);
   const before=bones.map(b=>({
    q:b.quaternion.clone(),p:b.position.clone()
   }));
   let changed=0,largestChange=0,internal=false,movingNonRootBones=0;
   for(const t of [.25,.5,.75]){
    mixer.setTime(clip.duration*t);
    gltf.scene.updateMatrixWorld(true);body.skeleton.update();
    const report=compareAIG24RelativeGeometry(original,vertices(body,128));
    changed=Math.max(changed,report.changedPairs);
    largestChange=Math.max(largestChange,report.maxRelativeDistanceChange);
    internal ||= report.internalVertexDeformation;
    const moving=bones.slice(1).filter((b,i)=>{
     const prior=before[i+1];
     return 1-Math.abs(b.quaternion.dot(prior.q))>1e-7||
      b.position.distanceTo(prior.p)>1e-5;
    }).length;
    movingNonRootBones=Math.max(movingNonRootBones,moving);
   }
   clips.push({clipName:clip.name,durationSeconds:clip.duration,
    rigidPhotoMotionOnly:!internal,
    realLocalBodyDeformation:internal,movingNonRootBones,
    maxChangedInternalPairs:changed,maxRelativeDistanceChange:largestChange});
   action.stop();
  }
 }finally{
  mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
  for(const s of stored){
   s.b.position.copy(s.position);s.b.quaternion.copy(s.quaternion);
   s.b.scale.copy(s.scale);
  }
  gltf.scene.updateMatrixWorld(true);
 }
 const valid=clips.filter(c=>c.realLocalBodyDeformation&&c.movingNonRootBones>0);
 return {
  schema:AIG24_MOTION_SCHEMA,bodyMeshName,
  nonPlanarVolume:volume.normalizedThickness,
  trueSkinnedBodyMeshCount:meshes.length,distinctWeightedBodyJoints:distinctWeights.size,
  clips,realArticulatedClipCount:valid.length,
  bodyMovementIsNotGlobalPhotoSway:valid.length>0,
  missingWalkRunJumpMotionNotInvented:true,
  verifiedTruePhotoIdentity:false,verifiedContinuousCollisionFree:false,
  releaseAllowed:false,
  status:valid.length?'ARTICULATED_GEOMETRY_DETECTED_TECHNICAL_ONLY':
   'BLOCKED_ONLY_RIGID_PHOTO_OR_INERT_POSE'
 };
}
