import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildAIG23PhotoActor,AIG23_SCHEMA}
 from '../aig-photo-rig-world-2-3.mjs';
const w=320,h=480;
function image(kind='face'){
 const p=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<p.length;i+=4){
  p[i]=238;p[i+1]=235;p[i+2]=230;p[i+3]=255;
 }
 if(kind==='blank')return p;
 for(let y=31;y<180;y++)for(let x=110;x<210;x++){
  if(((x-160)/39)**2+((y-105)/74)**2>1)continue;
  const k=(y*w+x)*4;
  p[k]=68;p[k+1]=53;p[k+2]=52;
 }
 return p;
}
const source='1'.repeat(64);
test('Real3D 2.3 one still image makes source-bound REAL 17 bone skinned GLB usable by 2.2 story',async()=>{
 const {bytes,proof}=await buildAIG23PhotoActor({
  pixels:image(),width:w,height:h,sourceImageSHA256:source
 });
 assert.equal(proof.schema,AIG23_SCHEMA);
 assert.equal(proof.sourceImageSHA256,source);
 assert.equal(proof.realBones,17);
 assert.equal(proof.realSkinnedMeshes,9);
 assert.equal(proof.genuineSkinningWeightsValidated,true);
 assert.equal(proof.realSourceClips.length,5);
 assert.equal(proof.separateSkinnedGarmentAndHairMeshes.length,7);
 assert.ok(proof.realSourceClips.some(x=>/turn.head|head.turn/i.test(x.name)));
 assert.equal(proof.originalPhotoStoredSeparatelyRequired,true);
 assert.equal(proof.candidate715GeometryAutomaticallySkinned,false);
 assert.equal(proof.newWalkRunJumpGenerated,false);
 assert.equal(proof.measuredPersonHeight,false);
 assert.equal(proof.releaseAllowed,false);
 assert.equal(proof.androidWindowsNativeVerified,false);
 assert.equal(proof.modelGLBSHA256,
  createHash('sha256').update(bytes).digest('hex'));
 assert.ok(proof.sampledPoseCount>0);
 assert.equal(typeof proof.contactRiskNeedsRepair,'boolean');
});
test('Real3D 2.3 rejects absent actual pixels, forged digest or blank input',async()=>{
 await assert.rejects(()=>buildAIG23PhotoActor({
  pixels:image(),width:w,height:h,sourceImageSHA256:'x'
 }),/AIG23_BOUNDED_ACTUAL/);
 await assert.rejects(()=>buildAIG23PhotoActor({
  pixels:image(),width:w,height:0,sourceImageSHA256:source
 }),/AIG23_BOUNDED_ACTUAL/);
 await assert.rejects(()=>buildAIG23PhotoActor({
  pixels:image('blank'),width:w,height:h,sourceImageSHA256:source
 }),/AIG64_NO_OBSERVABLE_SUBJECT_CONTRAST/);
});
