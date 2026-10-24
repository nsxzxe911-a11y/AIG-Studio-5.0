import test from 'node:test';
import assert from 'node:assert/strict';
import {segmentAIGReal3DV111FromUserSeeds}
 from '../aig-real3d-v111-seeded-segmentation.mjs';
const sha='a'.repeat(64);
function scene(w=128,h=144){
 const rgba=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const idx=(y*w+x)*4;
  // Repeating, highly non-uniform / patterned synthetic scenery.
  const bg=(Math.floor(x/8)+Math.floor(y/8))%2?
   [34,171,83]:[213,185,58];
  const object=x>=38&&x<=91&&y>=21&&y<=120;
  const fg=y<70?[54,77,181]:[189,72,114];
  rgba.set([...(object?fg:bg),255],idx);
 }
 return {rgba,width:w,height:h,imageSha256:sha,
  foregroundSeeds:[{x:53,y:35},{x:75,y:100}],
  backgroundSeeds:[{x:3,y:3},{x:12,y:3}]};
}
test('V111 two-sided scribbles yield connected original-photo RGB on checkerboard scenery',()=>{
 const s=scene(),bytes=Uint8ClampedArray.from(s.rgba);
 const receipt=segmentAIGReal3DV111FromUserSeeds(s);
 assert.equal(receipt.segmentationMode,'INTERACTIVE_COLOR_CONNECTED_NOT_NEURAL_AI');
 assert.equal(receipt.foregroundPixelCount,54*100);
 assert.equal(receipt.seedForegroundCount,2);
 assert.equal(receipt.seedBackgroundCount,2);
 assert.equal(receipt.uncertainBoundaryFraction,0);
 assert.equal(receipt.sourceMaskIndependentlyProvenCorrect,false);
 assert.equal(receipt.actualNeuralInferencePerformed,false);
 assert.equal(receipt.full1to1ReleaseGate,'BLOCK_MULTIVIEW_AND_DEPTH_SOURCE_UNVERIFIED');
 assert.equal(receipt.originalWorkingRGBA[(40*128+45)*4+3],255);
 assert.equal(receipt.originalWorkingRGBA[(1*128+1)*4+3],0);
 assert.equal(receipt.releasePASS,false);
 assert.deepEqual([...s.rgba],[...bytes]);
 for(let i=0;i<128*144;i++)
  for(let c=0;c<3;c++)
   assert.equal(receipt.originalWorkingRGBA[i*4+c],s.rgba[i*4+c]);
});
test('V111 wrong or missing marks are BLOCK, not assumed AI success',()=>{
 const s=scene();
 for(const input of [
  {...s,foregroundSeeds:[]},
  {...s,backgroundSeeds:[]},
  {...s,foregroundSeeds:[{x:3,y:3},{x:75,y:100}]},
  {...s,backgroundSeeds:[{x:53,y:35},{x:12,y:3}]},
  {...s,backgroundSeeds:[{x:3,y:3},{x:3,y:3}]},
  {...s,foregroundSeeds:[{x:75,y:100},{x:130,y:40}]}
 ])assert.throws(()=>segmentAIGReal3DV111FromUserSeeds(input),/REAL3D_V111_/);
});
test('V111 reject edge-touching subject without misrepresenting backdrop',()=>{
 const s=scene();
 for(let y=0;y<144;y++)
  for(let x=0;x<128;x++)
   if(x<38&&y>=21&&y<=120)
    s.rgba.set([54,77,181,255],(y*128+x)*4);
 assert.throws(()=>segmentAIGReal3DV111FromUserSeeds(s),
  /SUBJECT_TOUCHES_FRAME_OR_SPILLS_INTO_BACKGROUND/);
});
test('V111 flat RGB without separable subject stays BLOCK',()=>{
 const s=scene();
 for(let i=0;i<s.rgba.length;i+=4)s.rgba.set([25,25,25,255],i);
 assert.throws(()=>segmentAIGReal3DV111FromUserSeeds(s),
  /FOREGROUND_BACKGROUND_COLOR_UNRESOLVED/);
});
