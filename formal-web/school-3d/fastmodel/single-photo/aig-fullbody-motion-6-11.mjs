/** Actual generated one-photo technical humanoid → extra full-body GLB
 * skeletal clips. No camera fake, no photo likeness/physics certification.
 * Appends real glTF LINEAR quaternion channels to 17-bone skinned meshes.
 */
import {AIG64_AUTOBODY_SCHEMA} from './aig-single-photo-autobody-6-4.mjs';
import {AIG56_BONES} from './aig-native-body-5-6.mjs';
import {AnimationMixer,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const AIG61_MOTION_SCHEMA='AIG_FASTMODEL_REAL_TECHNICAL_FULLBODY_MOTION_V1';
const align4=n=>(n+3)&~3;
const BUDGET=16*1024*1024;
function inspect(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<40||bytes.length>BUDGET)
  throw Error('AIG61_EXPECTED_REAL_GLB');
 const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2||
  dv.getUint32(8,true)!==bytes.length||dv.getUint32(16,true)!==0x4e4f534a)
  throw Error('AIG61_BAD_GLB_HEADER');
 const jl=dv.getUint32(12,true),binStart=20+jl;
 if(jl<=0||jl>2*1024*1024||binStart+8>bytes.length||
  dv.getUint32(binStart+4,true)!==0x004e4942)throw Error('AIG61_GLB_CHUNKS');
 const binLength=dv.getUint32(binStart,true);
 if(binStart+8+binLength!==bytes.length)throw Error('AIG61_GLB_LENGTH');
 const json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,binStart)));
 if(json.animations?.length!==5||json.meshes?.length!==9||
  json.skins?.length!==1||json.skins[0].joints?.length!==17||
  json.extras?.schema!==AIG64_AUTOBODY_SCHEMA||
  json.extras?.releaseAllowed!==false)
  throw Error('AIG61_UNVERIFIED_64_FULLBODY_SOURCE');
 const skin=json.skins[0];
 if(!AIG56_BONES.every((name,i)=>json.nodes[skin.joints[i]]?.name===name))
  throw Error('AIG61_REAL_17_BONE_MAPPING_REQUIRED');
 return {json,binary:bytes.slice(binStart+8),jointNodes:skin.joints};
}
function pack(json,binary){
 const encoded=new TextEncoder().encode(JSON.stringify(json));
 const size=align4(encoded.length),out=new Uint8Array(12+8+size+8+binary.length);
 if(out.length>BUDGET)throw Error('AIG61_GLB_BUDGET');
 const dv=new DataView(out.buffer);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);
 dv.setUint32(8,out.length,true);dv.setUint32(12,size,true);
 dv.setUint32(16,0x4e4f534a,true);
 out.set(encoded,20);out.fill(32,20+encoded.length,20+size);
 dv.setUint32(20+size,binary.length,true);
 dv.setUint32(24+size,0x004e4942,true);
 out.set(binary,28+size);
 return out;
}
const radians=d=>d*Math.PI/180;
const quaternionX=angle=>[Math.sin(radians(angle)/2),0,0,Math.cos(radians(angle)/2)];
const quaternionY=angle=>[0,Math.sin(radians(angle)/2),0,Math.cos(radians(angle)/2)];
const degs=[
 {name:'AIG61_OPPOSING_LEG_ARM_STEP_IN_PLACE',bones:[
  ['hips','y',[0,2,0,-2,0,2,0,-2,0]],
  ['leftUpperLeg','x',[0,18,10,-12,0,18,10,-12,0]],
  ['rightUpperLeg','x',[0,-12,0,18,10,-12,0,18,0]],
  ['leftLowerLeg','x',[0,8,17,5,0,8,17,5,0]],
  ['rightLowerLeg','x',[0,17,5,0,8,17,5,0,8]],
  ['leftUpperArm','x',[0,-11,0,13,0,-11,0,13,0]],
  ['rightUpperArm','x',[0,13,0,-11,0,13,0,-11,0]]
 ]},
 {name:'AIG61_BILATERAL_ARM_REACH',bones:[
  ['leftUpperArm','x',[0,-18,-42,-67,-82,-67,-42,-18,0]],
  ['rightUpperArm','x',[0,-18,-42,-67,-82,-67,-42,-18,0]],
  ['leftForeArm','x',[0,-7,-15,-20,-24,-20,-15,-7,0]],
  ['rightForeArm','x',[0,-7,-15,-20,-24,-20,-15,-7,0]]
 ]}
];
export function upgradeAig64FullBodyMotion(model){
 if(model?.schema!==AIG64_AUTOBODY_SCHEMA||
  model.generatedCompleteTechnicalBody!==true||
  model.releaseAllowed!==false||model.riggedBoneCount!==17||
  !/^[a-f0-9]{64}$/.test(model.sourceImageSHA256||''))
  throw Error('AIG61_ACTUAL_ONE_PHOTO_MODEL_REQUIRED');
 const {json,binary,jointNodes}=inspect(model.bytes);
 const additions=[];let offset=align4(binary.length);
 function append(data,type,componentType){
  const arr=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
  offset=align4(offset);const at=offset;offset+=arr.byteLength;
  additions.push({at,arr});
  const i=json.bufferViews.push({buffer:0,byteOffset:at,byteLength:arr.byteLength})-1;
  return json.accessors.push({bufferView:i,componentType,
   count: type==='SCALAR'?data.length:data.length/4,type})-1;
 }
 const times=new Float32Array([0,.25,.5,.75,1,1.25,1.5,1.75,2]);
 const timeAccessor=append(times,'SCALAR',5126);
 for(const spec of degs){
  const samplers=[],channels=[];
  for(const [bone,axis,values] of spec.bones){
   if(values.length!==times.length)throw Error('AIG61_KEYFRAME_MISMATCH');
   const boneIndex=AIG56_BONES.indexOf(bone);
   if(boneIndex<0)throw Error('AIG61_BONE_MISSING');
   const quaternion=new Float32Array(values.flatMap(
    v=>axis==='x'?quaternionX(v):quaternionY(v)));
   const output=append(quaternion,'VEC4',5126);
   channels.push({sampler:samplers.length,
    target:{node:jointNodes[boneIndex],path:'rotation'}});
   samplers.push({input:timeAccessor,output,interpolation:'LINEAR'});
  }
  json.animations.push({name:spec.name,samplers,channels});
 }
 const combined=new Uint8Array(align4(offset));
 combined.set(binary);
 for(const {at,arr} of additions)combined.set(arr,at);
 json.buffers=[{byteLength:combined.length}];
 json.extras={...json.extras,
  motionSchema:AIG61_MOTION_SCHEMA,originalSinglePhotoSourceSHA256:model.sourceImageSHA256,
  originalTechnicalFiveAnimationsRetained:true,
  actualAddedFullBodySkeletalClips:degs.map(c=>c.name),
  physicalFootPlantVerified:false,
  opticalMotionCaptureVerified:false,
  sourcePersonLikenessVerified:false,
  formalCharacterApproved:false,releaseAllowed:false};
 const bytes=pack(json,combined);
 return {schema:AIG61_MOTION_SCHEMA,bytes,
  sourceImageSHA256:model.sourceImageSHA256,
  riggedBoneCount:17,skinnedMeshCount:9,animationClipCount:7,
  originalAnimationClipsRetained:5,newClips:degs.map(c=>c.name),
  actualFullBodyPoseChannelsAdded:degs.reduce((n,c)=>n+c.bones.length,0),
  fullBodyLimbMotionNotYetAudited:true,realPhotoIdentityVerified:false,
  hairAndGarmentCollisionVerified:false,actualWalkingFootContactsVerified:false,
  androidAndWindowsFpsVerified:false,releaseAllowed:false};
}
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export async function auditAig61FullBodyLimbMotion(model){
 if(model?.schema!==AIG61_MOTION_SCHEMA||model.riggedBoneCount!==17||
  model.skinnedMeshCount!==9||model.animationClipCount!==7||
  model.releaseAllowed!==false)
  throw Error('AIG61_UNVERIFIED_ANIMATION_OUTPUT');
 const gltf=await new GLTFLoader().parseAsync(model.bytes.buffer.slice(
  model.bytes.byteOffset,model.bytes.byteOffset+model.bytes.byteLength),'');
 const targets=degs.map(x=>gltf.animations.find(c=>c.name===x.name));
 if(targets.some(x=>!x)||gltf.animations.length!==7)
  throw Error('AIG61_REAL_BONE_CLIPS_NOT_IN_GLB');
 let body=null;gltf.scene.traverse(o=>{
  if(o.isSkinnedMesh&&/AIG56_NATIVE_FULLBODY/.test(o.name))body=o;
 });
 if(!body||body.skeleton.bones.length!==17)
  throw Error('AIG61_REAL_BODY_SKIN_NOT_FOUND');
 const joint=body.geometry.getAttribute('skinIndex'),
  weight=body.geometry.getAttribute('skinWeight');
 if(!joint||!weight||joint.count!==weight.count)
  throw Error('AIG61_REAL_SKIN_WEIGHTS_MISSING');
 const areas={
  leftLeg:[9,10,11],rightLeg:[12,13,14],
  leftArm:[5,6],rightArm:[7,8]
 };
 const picks={};
 for(const [name,bones] of Object.entries(areas)){
  const selected=[];
  for(let i=0;i<joint.count;i++){
   let influence=0;
   for(let k=0;k<4;k++)
    if(bones.includes(joint.getComponent(i,k)))influence+=weight.getComponent(i,k);
   if(influence>=.6)selected.push(i);
  }
  if(selected.length<8)throw Error('AIG61_MISSING_'+name.toUpperCase()+'_WEIGHTED_VERTICES');
  const stride=Math.max(1,Math.floor(selected.length/48));
  picks[name]=selected.filter((_,i)=>i%stride===0).slice(0,48);
 }
 const mixer=new AnimationMixer(gltf.scene),point=new Vector3(),proof=[];
 for(const clip of targets){
  mixer.stopAllAction();const action=mixer.clipAction(clip);action.reset().play();
  const samples=[];
  for(let k=0;k<=30;k++){
   mixer.setTime(clip.duration*k/30);
   gltf.scene.updateMatrixWorld(true);body.skeleton.update();
   const areasNow={};
   for(const [area,indices] of Object.entries(picks)){
    areasNow[area]=indices.map(i=>{
     body.getVertexPosition(i,point);
     if(![point.x,point.y,point.z].every(Number.isFinite))
      throw Error('AIG61_SKIN_VERTEX_NONFINITE');
     return [point.x,point.y,point.z];
    });
   }
   samples.push(areasNow);
  }
  const displacement={};
  for(const area of Object.keys(areas)){
   const first=samples[0][area];
   displacement[area]=Math.max(...samples.flatMap(s=>s[area].map((p,i)=>
    Math.hypot(...p.map((v,j)=>v-first[i][j])))));
  }
  const wanted=clip.name.includes('STEP')?
   ['leftLeg','rightLeg','leftArm','rightArm']:['leftArm','rightArm'];
  if(wanted.some(k=>displacement[k]<=1e-4))
   throw Error('AIG61_FAKE_STATIC_LIMB_'+clip.name);
  proof.push({clip:clip.name,framesEvaluated:31,
   actualWeightedMeshVertexDeformation:displacement,
   requiredLimbGroupsMoved:wanted,
   cameraMotionUsed:false});
  action.stop();
 }
 mixer.stopAllAction();
 return {schema:AIG61_MOTION_SCHEMA,actualGlbRoundTrip:true,
  realSkinnedBody:true,boneCount:17,meshCount:9,
  existingFiveClipsPreserved:true,appendedClipsProven:proof,
  leftAndRightLegMotionVerified:true,
  leftAndRightArmMotionVerified:true,
  actualSkinVertexMotionVerified:true,
  individualSourcePhotoLikenessVerified:false,
  realPhysicalFootPlantVerified:false,
  realHairAndGarmentCollisionVerified:false,
  approvedProductionHeroine:false,releaseAllowed:false};
}
