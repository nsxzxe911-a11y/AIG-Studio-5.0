import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGReal3DV109PhotoSurfaceGLB}
 from '../aig-real3d-v109-photo-surface.mjs';
const sha='a'.repeat(64),depthSha='b'.repeat(64);
function source(){
 const width=64,height=64,rgba=new Uint8ClampedArray(width*height*4);
 for(let y=9;y<52;y++)for(let x=14;x<48;x++){
  const i=(y*width+x)*4;
  rgba[i]=214;rgba[i+1]=155;rgba[i+2]=126;rgba[i+3]=255;
 }
 const png=new Uint8Array(200);
 png.set([137,80,78,71,13,10,26,10]);
 for(let i=8;i<png.length;i++)png[i]=i%251;
 return {rgba,width,height,originalPNGBytes:png,imageSha256:sha};
}
function parse(glbBytes){
 const dv=new DataView(glbBytes.buffer,glbBytes.byteOffset,glbBytes.byteLength);
 assert.equal(dv.getUint32(0,true),0x46546c67);
 assert.equal(dv.getUint32(4,true),2);
 assert.equal(dv.getUint32(8,true),glbBytes.length);
 const len=dv.getUint32(12,true);
 const gltf=JSON.parse(new TextDecoder().decode(glbBytes.slice(20,20+len)).trim());
 const offset=20+len;
 assert.equal(dv.getUint32(offset+4,true),0x004e4942);
 return {gltf,binStart:offset+8};
}
test('V109 transparent PNG creates real indexed XYZ GLB with original PNG embedded',()=>{
 const input=source(),before=Uint8Array.from(input.rgba);
 const out=buildAIGReal3DV109PhotoSurfaceGLB(input);
 const {gltf,binStart}=parse(out.glbBytes);
 assert.equal(out.receipt.mode,'ALPHA_ONLY_FLAT_FRONT_2_5D');
 assert.equal(out.receipt.observedGeometry,'VISIBLE_FRONT_ONLY');
 assert.equal(out.receipt.inferredBackside,false);
 assert.ok(out.receipt.surfaceTriangles>12);
 assert.equal(out.receipt.foregroundReprojectionIoU,1);
 assert.equal(out.receipt.geometryGenerationGate,'FRONT_SURFACE_CREATED');
 assert.equal(out.receipt.multiView1to1Gate,'BLOCK_INDEPENDENT_BACK_SIDE_AND_DEPTH_NOT_VERIFIED');
 assert.equal(gltf.materials[0].pbrMetallicRoughness.baseColorTexture.index,0);
 assert.equal(gltf.accessors[0].count,out.receipt.sourceUVVertices);
 assert.equal(gltf.accessors[3].count,out.receipt.surfaceTriangles*3);
 assert.equal(gltf.meshes[0].primitives[0].attributes.TEXCOORD_0,2);
 const textureView=gltf.bufferViews[gltf.images[0].bufferView];
 assert.deepEqual([...out.glbBytes.slice(binStart+textureView.byteOffset,
  binStart+textureView.byteOffset+textureView.byteLength)],
  [...input.originalPNGBytes]);
 assert.deepEqual(input.rgba,before);
});
test('V109 independently provided depth generates nonzero relief but never a fake backside',()=>{
 const input=source(),depth=new Float32Array(64*64);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++)depth[y*64+x]=x*0.2;
 const out=buildAIGReal3DV109PhotoSurfaceGLB({...input,
  depthValuesMM:depth,depthSourceSha256:depthSha,depthMeasurementDeclared:true});
 const {gltf}=parse(out.glbBytes);
 assert.equal(out.receipt.mode,'USER_DECLARED_CALIBRATED_FRONT_DEPTH');
 assert.ok(gltf.accessors[0].max[2]>gltf.accessors[0].min[2]);
 assert.equal(out.receipt.measuredDepthIndependentVerificationPassed,false);
 assert.equal(out.receipt.volumeCertified,false);
});
test('V109 rejects opaque, cropped, insufficient mask, and invented depth evidence',()=>{
 const base=source();
 const opaque=Uint8ClampedArray.from(base.rgba);
 for(let i=3;i<opaque.length;i+=4)opaque[i]=255;
 assert.throws(()=>buildAIGReal3DV109PhotoSurfaceGLB({...base,rgba:opaque}),
  /ALPHA_FOREGROUND_MISSING_OPAQUE_OR_CROPPED/);
 const border=Uint8ClampedArray.from(base.rgba);
 border[3]=255;
 assert.throws(()=>buildAIGReal3DV109PhotoSurfaceGLB({...base,rgba:border}),
  /ALPHA_FOREGROUND_MISSING_OPAQUE_OR_CROPPED/);
 assert.throws(()=>buildAIGReal3DV109PhotoSurfaceGLB({...base,
  depthValuesMM:new Float32Array(64*64)}),
  /SEPARATE_CALIBRATED_DEPTH_SOURCE_AND_SHA_REQUIRED/);
 assert.throws(()=>buildAIGReal3DV109PhotoSurfaceGLB({...base,
  originalPNGBytes:new Uint8Array(200)}),/SOURCE_PNG_RGBA_SHA/);
});
