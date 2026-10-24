import test from 'node:test';
import assert from 'node:assert/strict';
import {extractAIGReal3DV110Foreground}
 from '../aig-real3d-v110-source-mask.mjs';
const sha='1'.repeat(64),manualSha='2'.repeat(64);
function source({w=128,h=128,bg=[233,232,226],fg=[35,78,136],
  alpha=255}={}){
 const rgba=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,inside=(x>=43&&x<=87&&y>=20&&y<=106);
  rgba.set(inside?[...fg,alpha]:[...bg,alpha],i);
 }
 return {rgba,width:w,height:h,imageSha256:sha};
}
test('V110 removes uniform opaque background, preserves original RGB and no false 3D',()=>{
 const input=source(),original=[...input.rgba];
 const result=extractAIGReal3DV110Foreground(input);
 assert.equal(result.sourceMode,'AUTO_SIMPLE_BORDER_BG');
 assert.equal(result.components,1);
 assert.equal(result.foreground,45*87);
 assert.equal(result.mask[55*128+55],1);
 assert.equal(result.mask[0],0);
 assert.equal(result.maskedRGBA[3],0);
 assert.equal(result.maskedRGBA[(55*128+55)*4+3],255);
 assert.equal(result.maxBorderRGBDistance,0);
 assert.equal(result.fractionAmbiguousSourceBoundary,0);
 assert.deepEqual([...input.rgba],original);
 for(let i=0;i<result.mask.length;i++)
  assert.deepEqual([...result.maskedRGBA.slice(i*4,i*4+3)],
   [...input.rgba.slice(i*4,i*4+3)]);
 assert.equal(result.sourceBacksideAndDepthNotObserved,true);
 assert.equal(result.neuralSegmentationWeightsExecuted,false);
 assert.equal(result.originalPhotoIdentityOr3DSimilarityCertified,false);
 assert.equal(result.releasePASS,false);
});
test('V110 rejects scenery, touching foreground, ambiguous flat image',()=>{
 const c=source();
 for(let x=0;x<c.width;x++){const i=x*4;
  c.rgba[i]=(x%2)?6:233;
 }
 assert.throws(()=>extractAIGReal3DV110Foreground(c),
  /COMPLEX_OR_CROPPED_BACKGROUND_NEEDS_INDEPENDENT_MASK/);
 const cropped=source();
 for(let y=0;y<cropped.height;y++)
  cropped.rgba.set([35,78,136,255],(y*128)*4);
 assert.throws(()=>extractAIGReal3DV110Foreground(cropped),
  /COMPLEX_OR_CROPPED_BACKGROUND_NEEDS_INDEPENDENT_MASK/);
 const blank=source({fg:[233,232,226]});
 assert.throws(()=>extractAIGReal3DV110Foreground(blank),
  /UNTRUSTED_SOFT_EDGE_OR_LOW_CONTRAST|MASK_COVERAGE_OUTSIDE_SAFE_RANGE/);
});
test('V110 independent user-supplied mask can salvage complex original RGB only with distinct SHA and consent',()=>{
 const input=source(),reviewed=new Uint8ClampedArray(input.rgba.length);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const v=x>=43&&x<=87&&y>=20&&y<=106?255:0,
   k=(y*128+x)*4;
  reviewed.set([v,v,v,255],k);
  input.rgba.set([x%3*60,y%2*100,50,255],k);
 }
 assert.throws(()=>extractAIGReal3DV110Foreground({
  ...input,externalMaskRGBA:reviewed,externalMaskSha256:manualSha}),
  /INDEPENDENT_REVIEWED_MASK_SOURCE_SHA_AND_CONSENT_REQUIRED/);
 const result=extractAIGReal3DV110Foreground({...input,
  externalMaskRGBA:reviewed,externalMaskSha256:manualSha,
  externalMaskConfirmed:true,externalMaskMode:'LUMINANCE'});
 assert.equal(result.sourceMode,'EXTERNAL_USER_REVIEWED_MASK_NOT_AI_CERTIFIED');
 assert.equal(result.foreground,45*87);
 assert.equal(result.originalPhotoIdentityOr3DSimilarityCertified,false);
 assert.equal(result.releasePASS,false);
});
test('V110 accepts already transparent alpha without claiming neural inference',()=>{
 const input=source();
 for(let y=0;y<128;y++)for(let x=0;x<128;x++)
  if(x<43||x>87||y<20||y>106)input.rgba[(y*128+x)*4+3]=0;
 const result=extractAIGReal3DV110Foreground(input);
 assert.equal(result.sourceMode,'ORIGINAL_ALPHA_ALREADY_SEGMENTED');
 assert.equal(result.foreground,45*87);
});
test('V110 blocks separate subject islands even if border is uniform',()=>{
 const input=source();
 for(let y=25;y<35;y++)for(let x=15;x<30;x++)
  input.rgba.set([35,78,136,255],(y*128+x)*4);
 assert.throws(()=>extractAIGReal3DV110Foreground(input),
  /MASK_HAS_MULTIPLE_DISCONNECTED_SUBJECTS/);
});
