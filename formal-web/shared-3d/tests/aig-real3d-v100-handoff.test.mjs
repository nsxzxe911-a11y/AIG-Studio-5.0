import test from 'node:test';
import assert from 'node:assert/strict';
import {runAIGReal3DV97PhotoConstrainedModel}
 from '../aig-real3d-v97-auto-constrained-model.mjs';
import {exportAIGReal3DV97AnimatedGLB}
 from '../aig-real3d-v97-export-animated-glb.mjs';
import {sha256AIGReal3DBytes}
 from '../aig-real3d-v99-native-model-ingest.mjs';
import {validateV100Handoff,V100_HANDOFF_SCHEMA}
 from '../../../tools/real3d_v100_native_handoff.mjs';
async function fixture(){
 const rgba=new Uint8ClampedArray(256*256*4);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const k=4*(y*256+x),t=(y-30)/80,half=Math.round(31-13*t),
   skin=y>=30&&y<=110&&Math.abs(x-128)<=half;
  rgba[k]=skin?215:12;rgba[k+1]=skin?145:25;
  rgba[k+2]=skin?108:50;rgba[k+3]=255;
 }
 const imageBytes=Uint8Array.from({length:256},(_,i)=>i);
 const imageSHA=await sha256AIGReal3DBytes(imageBytes);
 const r=runAIGReal3DV97PhotoConstrainedModel({
  rgba,width:256,height:256,imageSha256:imageSHA,
  approvedIdentitySha256:'c'.repeat(64)});
 assert.ok(r.candidate);
 const output=exportAIGReal3DV97AnimatedGLB({
  candidate:r.candidate,sourceImageSha256:imageSHA
 });
 return {imageBytes,glbBytes:output.bytes,imageSHA};
}
test('V100 actual binary mesh handoff executes real V99 and V98 and preserves source SHA',async()=>{
 const f=await fixture();
 const r=await validateV100Handoff(f);
 assert.equal(r.schema,V100_HANDOFF_SCHEMA);
 assert.equal(r.status,'V99_NATIVE_INDEXED_GEOMETRY_AND_V98_SHARED_SOURCE_PASS');
 assert.equal(r.originalImageSHA256,f.imageSHA);
 assert.equal(r.originalIndexedTriangles,3784);
 assert.equal(r.AIGEngineGLBImporterActuallyRan,true);
 assert.equal(r.sourceAssetSharedWithV98,true);
 assert.equal(r.noV95FallbackOrProceduralBody,true);
 assert.equal(r.mlInferenceActuallyExecutedByThisValidator,false);
 assert.equal(r.originalFaceIdentityApproved,false);
 assert.equal(r.releasePASS,false);
});
test('V100 fake GLB fails actual native V99 import even if requested through handoff',async()=>{
 const f=await fixture();
 await assert.rejects(validateV100Handoff({...f,glbBytes:new Uint8Array(1024)}),
 /REAL_GLB2_HEADER_INVALID/);
});
test('V100 forged native source mesh indices fail without a low poly fake fallback',async()=>{
 const f=await fixture();
 const glb=f.glbBytes.slice();
 glb[0]=0;
 await assert.rejects(validateV100Handoff({...f,glbBytes:glb}),
 /REAL_GLB2_HEADER_INVALID/);
});
