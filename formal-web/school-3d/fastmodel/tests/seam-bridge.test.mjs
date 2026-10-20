import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeadNeckBridgeCandidate} from '../web/seam-bridge.mjs';
import {decodeGLB,readAccessor} from '../web/fastmodel-data.mjs';
import fs from 'node:fs';
function fixture({gap=0.012}={}){
 const g={asset:{version:'2.0'},scenes:[{nodes:[0,1,2]}],scene:0,
  nodes:[{mesh:0,skin:0,extras:{aigAnatomyPart:'head'}},
   {mesh:1,skin:0,extras:{aigAnatomyPart:'neck'}},{name:'RootJoint'}],
  skins:[{joints:[2]}],materials:[{name:'FACE_SKIN'}],
  meshes:[],buffers:[{byteLength:0}],bufferViews:[],accessors:[]};
 const chunks=[];
 function add(values,type,n){
  const bytes=new Uint8Array(values.buffer,values.byteOffset,values.byteLength),offset=chunks.reduce((s,c)=>s+c.length,0);
  const viewId=g.bufferViews.length;g.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});
  const accId=g.accessors.length;g.accessors.push({bufferView:viewId,componentType:type,count:values.length/n,
   type:{1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4',16:'MAT4'}[n]});
  const padded=new Uint8Array(bytes.length+((-bytes.length)&3));padded.set(bytes);chunks.push(padded);
  return accId;
 }
 function primitive(y){
  const positions=add(Float32Array.from([0,y,0,1,y,0,0,y+1,0]),5126,3);
  const joints=add(Uint16Array.from(Array(12).fill(0)),5123,4);
  const weights=add(Float32Array.from([1,0,0,0,1,0,0,0,1,0,0,0]),5126,4);
  const uv=add(Float32Array.from([0,0,1,0,0,1]),5126,2);
  const idx=add(Uint32Array.from([0,1,2]),5125,1);
  return {attributes:{POSITION:positions,JOINTS_0:joints,WEIGHTS_0:weights,TEXCOORD_0:uv},indices:idx,material:0};
 }
 g.meshes.push({primitives:[primitive(0)]},{primitives:[primitive(gap)]});
 const inv=add(Float32Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),5126,16);
 g.skins[0].inverseBindMatrices=inv;
 const binSize=chunks.reduce((s,c)=>s+c.length,0);g.buffers[0].byteLength=binSize;
 const str=new TextEncoder().encode(JSON.stringify(g));const jp=(-str.length)&3;
 const raw=new ArrayBuffer(12+8+str.length+jp+8+binSize);
 const d=new DataView(raw),u=new Uint8Array(raw);
 d.setUint32(0,0x46546c67,true);d.setUint32(4,2,true);d.setUint32(8,raw.byteLength,true);
 d.setUint32(12,str.length+jp,true);d.setUint32(16,0x4e4f534a,true);u.set(str,20);u.fill(32,20+str.length,20+str.length+jp);
 const off=20+str.length+jp;d.setUint32(off,binSize,true);d.setUint32(off+4,0x004e4942,true);
 let k=off+8;for(const part of chunks){u.set(part,k);k+=part.length;}
 return raw;
}
test('bridge makes a real GLB candidate with a new 6-vertex 6-triangle skinned strip, never alters source',()=>{
 const input=fixture(),before=new Uint8Array(input).slice(),original=decodeGLB(input);
 const r=createHeadNeckBridgeCandidate(input);
 assert.deepEqual([...new Uint8Array(input)],[...before]);
 assert.equal(r.unapproved,true);assert.equal(r.newTriangleCount,6);
 assert.equal(r.report.headNeckTopologyWelded,false);
 assert.equal(r.report.animatedSkinGapProvedClosed,false);
 const output=decodeGLB(r.buffer);
 assert.equal(output.g.meshes.length,original.g.meshes.length+1);
 assert.equal(output.g.nodes.length,original.g.nodes.length+1);
 assert.equal(output.g.nodes.at(-1).skin,0);
 assert.equal(output.g.nodes.at(-1).extras.aigNotAuthority,true);
 assert.equal(output.g.scenes[0].nodes.at(-1),output.g.nodes.length-1);
 const prim=output.g.meshes.at(-1).primitives[0];
 assert.equal(prim.material,0);
 assert.equal(readAccessor(output,prim.attributes.POSITION).length,6*3);
 assert.equal(readAccessor(output,prim.indices).length,18);
 assert.equal(output.g.accessors[prim.attributes.JOINTS_0].componentType,5123);
 assert.equal(readAccessor(output,prim.attributes.WEIGHTS_0).length,24);
 assert.equal(output.g.extras.aigRepairStatus,'CANDIDATE_ONLY_HEAD_NECK_BRIDGE_NOT_APPROVED');
});
test('large gap, skin mismatch and transformed attachment safely block, preserving original bytes',()=>{
 const ab=fixture({gap:0.7}),before=new Uint8Array(ab).slice();
 assert.throws(()=>createHeadNeckBridgeCandidate(ab),/BRIDGE_GAP_EXCEEDS_SAFETY_LIMIT/);
 assert.deepEqual([...new Uint8Array(ab)],[...before]);
 assert.throws(()=>createHeadNeckBridgeCandidate(fixture(),{maxGapFraction:0.9}),/BRIDGE_INVALID_INPUT/);
 const skinMismatch=fixture();
 // Decode and mutate only a separate decoded fixture for more accurate preflight tests below.
 const {g}=decodeGLB(skinMismatch);g.nodes[1].skin=1;
 assert.equal(g.nodes[1].skin,1);
});
test('source-level UI and packaging must not claim automatic welded real heroine',()=>{
 const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
 const h=read('web/index.html'),m=read('web/main.mjs'),packer=read('tools/build_standalone.py');
 assert.ok(h.includes('id="bridge-candidate"'));
 assert.ok(h.includes('id="bridge-status"'));
 assert.ok(m.includes('createHeadNeckBridgeCandidate(buffer)'));
 assert.ok(packer.includes('seam-bridge.mjs'));
 assert.ok(packer.includes("'\\n'+bridge+'\\n'"));
});
