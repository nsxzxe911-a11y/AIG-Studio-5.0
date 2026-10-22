import test from 'node:test';
import assert from 'node:assert/strict';
import {detectAIG24Image,AIG24_SCHEMA}
 from '../aig-auto-image-detect-2-4.mjs';
const W=320,H=480,SHA='d'.repeat(64);
function rgba(type='face'){
 const p=new Uint8ClampedArray(W*H*4);
 for(let i=0;i<p.length;i+=4){
  p[i]=236;p[i+1]=232;p[i+2]=225;p[i+3]=255;
 }
 const ellipse=(cx,cy,rx,ry)=>{
  for(let y=Math.max(0,cy-ry);y<=Math.min(H-1,cy+ry);y++)
   for(let x=Math.max(0,cx-rx);x<=Math.min(W-1,cx+rx);x++){
    if(((x-cx)/rx)**2+((y-cy)/ry)**2>1)continue;
    let a=(y*W+x)*4;p[a]=64;p[a+1]=55;p[a+2]=54;
   }
 };
 if(type==='face')ellipse(160,105,39,74);
 if(type==='two'){ellipse(75,140,33,65);ellipse(245,140,33,65)}
 if(type==='building'){
  for(let y=120;y<220;y++)for(let x=60;x<265;x++){
   const a=(y*W+x)*4;p[a]=60;p[a+1]=80;p[a+2]=85;
  }
 }
 return p;
}
const inspect=type=>detectAIG24Image({
 pixels:rgba(type),width:W,height:H,sourceImageSHA256:SHA
});
test('2.4 true RGBA source image is automatically inspected before any rigging',()=>{
 const r=inspect('face');
 assert.equal(r.schema,AIG24_SCHEMA);
 assert.equal(r.sourceImageSHA256,SHA);
 assert.equal(r.status,'AUTO_TECHNICAL_RIG_CANDIDATE');
 assert.equal(r.autoTechnicalRigAllowed,true);
 assert.equal(r.classificationIsNotLearnedHumanFaceDetection,true);
 assert.equal(r.actualPersonIdentityRecognized,false);
 assert.equal(r.releaseAllowed,false);
});
test('2.4 blank source and two separate regions are not called one character',()=>{
 assert.equal(inspect('blank').autoTechnicalRigAllowed,false);
 assert.equal(inspect('two').autoTechnicalRigAllowed,false);
 assert.equal(inspect('two').autoProcessReason,'MULTIPLE_FOREGROUND_REGIONS_UNCERTAIN');
});
test('2.4 a wide building-like colored rectangle is not a humanoid candidate',()=>{
 assert.equal(inspect('building').autoTechnicalRigAllowed,false);
});
test('2.4 source metadata never invented and malformed pixel data BLOCK',()=>{
 assert.throws(()=>detectAIG24Image({
  pixels:rgba('face'),width:W,height:H,sourceImageSHA256:'FAKE'
 }),/AIG24_VERIFIED_BOUNDED_IMAGE_RGBA_AND_SHA_REQUIRED/);
});
