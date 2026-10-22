import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {analyzeAIG64PartialPortrait,generateAIG64SinglePartialFullbody}
 from '../aig-single-photo-autobody-6-4.mjs';
import {AIG61_MOTION_SCHEMA,upgradeAig64FullBodyMotion,
 auditAig61FullBodyLimbMotion} from '../aig-fullbody-motion-6-11.mjs';

const w=320,h=480,HASH='a'.repeat(64);
const pixels=new Uint8ClampedArray(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const p=(y*w+x)*4;
 pixels[p]=238;pixels[p+1]=235;pixels[p+2]=230;pixels[p+3]=255;
 const head=((x-160)/38)**2+((y-120)/68)**2<1;
 const shoulder=((x-160)/78)**2+((y-300)/137)**2<1;
 if(head||shoulder){pixels[p]=66;pixels[p+1]=53;pixels[p+2]=51;}
}
function make(){
 const source=analyzeAIG64PartialPortrait({
  pixels,imageWidth:w,imageHeight:h,sourceImageSHA256:HASH
 });
 const original=generateAIG64SinglePartialFullbody({analysis:source});
 return {source,original};
}
test('6.11 single partial photo retains original 17-joint 9-mesh 5-clip model and adds TWO true skeletal clips',async()=>{
 const {source,original}=make();
 assert.equal(source.noAdditionalAnglesRequired,true);
 assert.equal(original.originalPhotoFaceIdentityReconstructed,false);
 const after=upgradeAig64FullBodyMotion(original);
 assert.equal(after.schema,AIG61_MOTION_SCHEMA);
 assert.equal(after.riggedBoneCount,17);
 assert.equal(after.skinnedMeshCount,9);
 assert.equal(after.animationClipCount,7);
 assert.equal(after.newClips.length,2);
 assert.equal(after.realPhotoIdentityVerified,false);
 assert.equal(after.releaseAllowed,false);
 const gltf=await new GLTFLoader().parseAsync(after.bytes.buffer.slice(
  after.bytes.byteOffset,after.bytes.byteOffset+after.bytes.byteLength),'');
 assert.equal(gltf.animations.length,7);
 assert.equal(gltf.scene.children.length>0,true);
 assert.equal(gltf.animations[0].name.includes('AIG'),true);
 const proof=await auditAig61FullBodyLimbMotion(after);
 assert.equal(proof.realSkinnedBody,true);
 assert.equal(proof.boneCount,17);
 assert.equal(proof.meshCount,9);
 assert.equal(proof.appendedClipsProven.length,2);
 assert.equal(proof.actualSkinVertexMotionVerified,true);
 assert.equal(proof.leftAndRightLegMotionVerified,true);
 assert.equal(proof.leftAndRightArmMotionVerified,true);
 assert.equal(proof.approvedProductionHeroine,false);
 const walk=proof.appendedClipsProven.find(p=>p.clip.includes('STEP'));
 assert.deepEqual(walk.requiredLimbGroupsMoved,
  ['leftLeg','rightLeg','leftArm','rightArm']);
 for(const k of walk.requiredLimbGroupsMoved)
  assert.ok(walk.actualWeightedMeshVertexDeformation[k]>1e-4,k);
 assert.ok(proof.appendedClipsProven.every(p=>
  p.framesEvaluated===31 && p.cameraMotionUsed===false));
 console.log('AIG61_FULLBODY_SKINNED_LIMB_ANIMATION_PASS|ONE_PARTIAL_PHOTO|17_BONES|9_MESHES|7_CLIPS|BOTH_ARMS_AND_LEGS|31_REAL_GLTF_FRAMES|HEROINE_IDENTITY_NOT_CERTIFIED');
});
test('6.11 real controller is uniquely mounted and bound to verified limb-skin engine, original clip source remains',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 assert.equal((html.match(/id="aig64-single-motion-upgrade"/g)||[]).length,1);
 assert.ok(html.includes('data-aig-button-id="FASTM.MODEL.FULLBODY_MOTION"'));
 assert.ok(html.includes('data-aig-command-id="ANIMATION.FULLBODY_BILATERAL"'));
 assert.ok(app.includes("$('aig64-single-motion-upgrade').addEventListener('click',async()=>"));
 assert.ok(app.includes('const upgraded=upgradeAig64FullBodyMotion({'));
 assert.ok(app.includes('const proof=await auditAig61FullBodyLimbMotion(upgraded);'));
 assert.ok(app.includes('realAnimationClips:7'));
 assert.ok(app.includes('aig64SingleBytes=base;aig64SingleReport=reportBefore;'));
 assert.ok(app.includes('generateAIG64SinglePartialFullbody({analysis})'));
 assert.ok(app.includes('await load(output.bytes.buffer,false,{technical:true})'));
});
test('6.11 rejects imaginary verified model, corrupt source and fake release flags',()=>{
 const {original}=make();
 assert.throws(()=>upgradeAig64FullBodyMotion({...original,
  releaseAllowed:true}),/ACTUAL_ONE_PHOTO_MODEL_REQUIRED/);
 assert.throws(()=>upgradeAig64FullBodyMotion({...original,
  generatedCompleteTechnicalBody:false}),/ACTUAL_ONE_PHOTO_MODEL_REQUIRED/);
 assert.throws(()=>upgradeAig64FullBodyMotion({...original,
  bytes:new Uint8Array([1,2])}),/EXPECTED_REAL_GLB/);
});
