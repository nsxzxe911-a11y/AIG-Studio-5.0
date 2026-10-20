import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleVec3Accessor,readAccessor} from '../web/fastmodel-data.mjs';
import {scanGeometry} from '../web/scene-tools.mjs';
import {readFileSync} from 'node:fs';
test('sampled GLB accessor reads only requested vertices from interleaved binary',()=>{
 const raw=new ArrayBuffer(6*4*4),data=new DataView(raw);
 for(let i=0;i<6;i++){for(let j=0;j<3;j++)data.setFloat32(i*16+j*4,i*10+j,true);data.setFloat32(i*16+12,999,true);}
 const file={g:{accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:6}],bufferViews:[{byteStride:16,byteOffset:0,byteLength:raw.byteLength}],
  meshes:[{primitives:[{attributes:{POSITION:0}}]}]},bin:data};
 assert.deepEqual([...sampleVec3Accessor(file,0,2)],[0,1,2,20,21,22,40,41,42]);
 const summary=scanGeometry(file,readAccessor,{kind:'tree',maxSamples:3,sampleReader:sampleVec3Accessor});
 assert.equal(summary.samples,3);assert.equal(summary.sampleStride,2);
 assert.deepEqual(summary.sampledExtent,[40,40,40]);assert.equal(summary.semanticsRecognized,false);
 assert.equal(scanGeometry(file,readAccessor,{maxSamples:1,sampleReader:sampleVec3Accessor}).samples,1);
});
test('sampled scanner rejects missing buffer and nonfinite invalid input and oversized work',()=>{
 const f={g:{accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:200000}],bufferViews:[{byteStride:12}]},bin:new DataView(new ArrayBuffer(12))};
 assert.throws(()=>sampleVec3Accessor(f,0,1));
 assert.throws(()=>sampleVec3Accessor(f,0,NaN));
});
test('real Scan button uses binary sampleReader; standalone import stripped and bundled',()=>{
 const main=readFileSync(new URL('../web/main.mjs',import.meta.url),'utf8');
 const pack=readFileSync(new URL('../tools/build_standalone.py',import.meta.url),'utf8');
 assert.match(main,/sampleReader:sampleVec3Accessor/);
 assert.match(pack,/decodeGLB,readAccessor,sampleVec3Accessor/);
 assert.match(pack,/adaptive-detail\.mjs/);
});
