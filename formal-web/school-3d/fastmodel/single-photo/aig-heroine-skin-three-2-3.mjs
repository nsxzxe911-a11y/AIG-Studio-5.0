/**
 * AIG Real3D 2.3 — Three.js actual bone-matrix skinning.
 *
 * Instantiates SkinnedMesh (not an overlay skeleton), with independently
 * skinned semantic RGB regions, and exports two SOURCE-LABELED procedural
 * head-motion candidates. No 1:1, backside, natural speech or human gait.
 */
import * as THREE from 'three';
import {buildAIG23DeformationPlan,verifyAIG23Plan}
 from './aig-heroine-deform-2-3.mjs';
const fail=s=>{throw Error('AIG23_THREE_'+s)};
const makeQuat=(angle,axis='y')=>{
 const q=new THREE.Quaternion();
 q.setFromAxisAngle(axis==='x'?new THREE.Vector3(1,0,0):
  new THREE.Vector3(0,1,0),angle*Math.PI/180);
 return q.toArray();
};
export function createAIG23SkinnedCandidate(candidate,opts={}){
 const plan=buildAIG23DeformationPlan(candidate,opts);
 verifyAIG23Plan(plan,candidate);
 const scene=new THREE.Group();
 scene.name='AIG23_USER_GUIDED_SKIN_DRAFT_NOT_METRIC_BODY';
 scene.userData={
  sourceDigest:plan.sourceDigest,
  originalRGBRetained:true,
  sourceDepthUnits:'RELATIVE_NOT_MM',
  originalMeasuredStereoSeparate:true,
  fullBacksideNotKnown:true,
  skeletonUserGuidedNotPhysicalScan:true,
  estimatedSkinInfluencesNotValidatedAnatomy:true,
  physicallyCorrectHumanRig:false,
  animationProceduralPreviewNotOriginalGLB:true
 };
 const bones=plan.joints.map(j=>{
  const b=new THREE.Bone();b.name='AIG23_Bone_'+j.name;return b;
 });
 for(let i=0;i<bones.length;i++){
  const j=plan.joints[i],parent=i>0?plan.joints[i-1]:null;
  const p=parent?.position??[0,0,0];
  bones[i].position.set(j.position[0]-p[0],j.position[1]-p[1],0);
  if(i>0)bones[i-1].add(bones[i]);
 }
 scene.add(bones[0]);scene.updateMatrixWorld(true);
 const skel=new THREE.Skeleton(bones);
 for(const [name,group] of Object.entries(plan.groups)){
  const original=candidate.geometryGroups[name];
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(
   original.positions.slice(),3));
  geometry.setAttribute('uv',new THREE.BufferAttribute(original.uv.slice(),2));
  const rgb=new Float32Array(original.rgb.length);
  for(let i=0;i<rgb.length;i++)rgb[i]=original.rgb[i]/255;
  geometry.setAttribute('color',new THREE.BufferAttribute(rgb,3));
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(
   group.skinIndex.slice(),4));
  geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(
   group.skinWeight.slice(),4));
  geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,
   roughness:1,metalness:0,side:THREE.DoubleSide});
  material.name='AIG23_ORIGINAL_RGB_'+name;
  const mesh=new THREE.SkinnedMesh(geometry,material);
  mesh.name='AIG23_SourceRegion_'+name;
  mesh.userData={sourcePart:name,sourceDigest:plan.sourceDigest,
   physicalThicknessVerified:false,realisticClothSimulation:false,
   visibleImageDerivedSurfaceOnly:true};
  // skinned vertex positions are in world group-local coordinates. Bones
  // have bind pose world positions, skeleton inverses bind them to rest.
  mesh.bind(skel,scene.matrixWorld.clone());
  scene.add(mesh);
 }
 scene.updateMatrixWorld(true);
 skel.calculateInverses();
 skel.update();
 // A small, explicitly PROCEDURAL, actual deforming preview: users are
 // not told this is motion inferred from photographs.
 const angle=plan.requestedHeadAngleDegrees;
 const times=[0,.4,.8,1.2],zero=[0,0,0,1];
 const face=(sign)=>new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0,1,0),sign*angle*Math.PI/180).toArray();
 const nod=(sign)=>new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1,0,0),sign*angle*.65*Math.PI/180).toArray();
 const clips=[
  new THREE.AnimationClip('aig23_estimated_head_turn_USER_PREVIEW',1.2,[
   new THREE.QuaternionKeyframeTrack(
    'AIG23_Bone_neck.quaternion',times,
    [...zero,...face(1),...face(-1),...zero])
  ]),
  new THREE.AnimationClip('aig23_estimated_head_nod_USER_PREVIEW',1.2,[
   new THREE.QuaternionKeyframeTrack(
    'AIG23_Bone_neck.quaternion',times,
    [...zero,...nod(1),...nod(-1),...zero])
  ])
 ];
 if(!scene.children.some(x=>x.isSkinnedMesh))
  fail('SKINNED_MESH_NOT_CREATED');
 return {scene,bones,skeleton:skel,clips,plan,
  verifiedActualSkinnedMeshCount:scene.children.filter(x=>x.isSkinnedMesh).length,
  realDeformingGPUVertices:true,
  proceduralMotionOnly:true,measured1To1:false};
}
export function sampleAIG23VertexDeformation(result,{part='HAIR',vertex=0,
 timeSeconds=.4,clip=0}={}){
 const m=result?.scene?.children?.find(x=>x.isSkinnedMesh&&
  x.userData.sourcePart===part);
 if(!m||!Number.isInteger(vertex)||vertex<0||
  vertex>=m.geometry.attributes.position.count||
  !Number.isFinite(timeSeconds)||timeSeconds<0||
  !result.clips[clip])fail('SOURCE_VERTEX_AND_CLIP_REQUIRED');
 const pos=new THREE.Vector3().fromBufferAttribute(
  m.geometry.attributes.position,vertex);
 const before=pos.clone();
 const mixer=new THREE.AnimationMixer(result.scene);
 const action=mixer.clipAction(result.clips[clip]);
 action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
 mixer.setTime(timeSeconds);
 result.scene.updateMatrixWorld(true);result.skeleton.update();
 m.applyBoneTransform(vertex,pos);
 mixer.stopAllAction();mixer.uncacheRoot(result.scene);
 for(const b of result.bones)b.quaternion.identity();
 result.scene.updateMatrixWorld(true);result.skeleton.update();
 return {before:before.toArray(),after:pos.toArray(),
  distance:before.distanceTo(pos),
  animationSource:'AIG23_USER_GUIDED_PROCEDURAL_SKIN_PREVIEW',
  originalVerticesUnmodified:true};
}
