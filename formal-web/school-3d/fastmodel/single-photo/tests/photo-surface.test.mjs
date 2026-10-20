import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPhotoSurface,photoMotion} from '../photo-surface.mjs';
import {parseRiggedGLB,AnimationController} from '../viewer.mjs';
import {Mesh,MeshBasicMaterial} from 'three';
test('photo grid preserves aspect, UV mapping and bounded inferred depth',()=>{
 const pixels=new Uint8ClampedArray([0,0,0,255,255,255,255,255,128,128,128,255,64,64,64,255]);
 const g=buildPhotoSurface(pixels,2,2,2);g.computeBoundingBox();
 assert.equal(g.attributes.position.count,4);assert.equal(g.index.count,6);
 assert.equal(g.boundingBox.max.x-g.boundingBox.min.x,2);
 assert.equal(g.boundingBox.max.y-g.boundingBox.min.y,1);
 assert.ok(g.boundingBox.max.z>g.boundingBox.min.z);
 assert.ok(g.boundingBox.max.z<=.13);assert.equal(g.attributes.uv.getY(0),1);
 const mesh=new Mesh(g,new MeshBasicMaterial());mesh.name='PhotoSurface';const clip=photoMotion();
 const controller=new AnimationController(mesh,[clip]);controller.select(0);controller.update(1);
 assert.ok(Math.abs(mesh.rotation.y)>.05);assert.equal(mesh.geometry.attributes.position.count,4);
});
test('malformed and excessively large grids are rejected',()=>{
 assert.throws(()=>buildPhotoSurface(new Uint8Array(4),2,2,1));
 assert.throws(()=>buildPhotoSurface(new Uint8Array(),99999,1,1));
 assert.throws(()=>buildPhotoSurface(new Uint8Array(16),2,2,NaN));
});

test('GLB with external buffer URLs fails before any network request',async()=>{
 const text=JSON.stringify({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,1]}],bufferViews:[{buffer:0,byteLength:36}],buffers:[{uri:'https://example.invalid/leak',byteLength:36}]});
 const json=new TextEncoder().encode(text+' '.repeat((4-text.length%4)%4)),bytes=new ArrayBuffer(20+json.length),dv=new DataView(bytes);dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,bytes.byteLength,true);dv.setUint32(12,json.length,true);dv.setUint32(16,0x4e4f534a,true);new Uint8Array(bytes,20).set(json);
 await assert.rejects(parseRiggedGLB(bytes),/GLB_EXTERNAL_ASSETS_NOT_ALLOWED/);
});

test('external texture URI is rejected rather than silently losing the material',async()=>{
 const text=JSON.stringify({asset:{version:'2.0'},images:[{uri:'https://example.invalid/texture.png'}]});
 const json=new TextEncoder().encode(text+' '.repeat((4-text.length%4)%4)),bytes=new ArrayBuffer(20+json.length),dv=new DataView(bytes);dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,bytes.byteLength,true);dv.setUint32(12,json.length,true);dv.setUint32(16,0x4e4f534a,true);new Uint8Array(bytes,20).set(json);
 await assert.rejects(parseRiggedGLB(bytes),/GLB_EXTERNAL_ASSETS_NOT_ALLOWED/);
});
