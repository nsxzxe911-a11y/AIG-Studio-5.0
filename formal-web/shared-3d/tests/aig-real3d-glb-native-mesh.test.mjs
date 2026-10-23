import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGReal3DGLBStatic,AIG_REAL3D_GLB_SCHEMA}
 from '../aig-real3d-glb-native-mesh.mjs';
import {auditAIG3DScene} from '../aig-real3d-core.mjs';

/** Elliptical shape with NO anatomical meaning; pipeline fixture only. */
function makeGLB({external=false,scale=1,badIndex=false}={}){
 const rows=41,sections=42,vertices=[],inds=[];
 for(let j=0;j<rows;j++)for(let k=0;k<sections;k++){
  const y=j/(rows-1),radius=Math.max(.009,Math.sin(Math.PI*y));
  const t=2*Math.PI*k/sections;
  vertices.push(.24*radius*Math.cos(t),y,.14*radius*Math.sin(t));
 }
 for(let j=0;j<rows-1;j++)for(let k=0;k<sections;k++){
  const a=j*sections+k,b=j*sections+(k+1)%sections,
   c=(j+1)*sections+k,d=(j+1)*sections+(k+1)%sections;
  inds.push(a,b,d,a,d,c);
 }
 let o=vertices.length/3;
 vertices.push(0,0,0,0,1,0);
 const low=o,high=o+1;
 for(let k=0;k<sections;k++){
  const next=(k+1)%sections;
  inds.push(low,next,k,high,(rows-1)*sections+k,(rows-1)*sections+next);
 }
 if(badIndex)inds[0]=99999999;
 const vb=Buffer.from(new Float32Array(vertices).buffer);
 const ib=Buffer.from(new Uint32Array(inds).buffer);
 const buffer=Buffer.concat([vb,ib]);
 const json={
  asset:{version:'2.0',generator:'synthetic nonhuman pipeline fixture'},
  buffers:[{byteLength:buffer.length,...(external?{uri:'https://external.invalid/test.bin'}:{})}],
  bufferViews:[
   {buffer:0,byteOffset:0,byteLength:vb.length},
   {buffer:0,byteOffset:vb.length,byteLength:ib.length}
  ],
  accessors:[
   {bufferView:0,componentType:5126,count:vertices.length/3,type:'VEC3'},
   {bufferView:1,componentType:5125,count:inds.length,type:'SCALAR'}
  ],
  meshes:[{primitives:[{attributes:{POSITION:0},indices:1,mode:4}]}],
  nodes:[{mesh:0,scale:[scale,scale,scale]}],
  scenes:[{nodes:[0]}],scene:0
 };
 const raw=Buffer.from(JSON.stringify(json));
 const padding=(4-raw.length%4)%4;
 const jsonBytes=Buffer.concat([raw,Buffer.alloc(padding,32)]);
 const total=12+8+jsonBytes.length+8+buffer.length;
 const out=Buffer.alloc(total);
 out.writeUInt32LE(0x46546c67,0);
 out.writeUInt32LE(2,4);out.writeUInt32LE(total,8);
 out.writeUInt32LE(jsonBytes.length,12);out.writeUInt32LE(0x4e4f534a,16);
 jsonBytes.copy(out,20);
 const at=20+jsonBytes.length;
 out.writeUInt32LE(buffer.length,at);out.writeUInt32LE(0x004e4942,at+4);
 buffer.copy(out,at+8);
 return out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength);
}
test('local complete static GLB geometry passes real indexed render plumbing',()=>{
 const r=buildAIGReal3DGLBStatic({bytes:makeGLB(),heightMm:1680,
  sourceName:'synthetic-non-human.glb',sourceSha256:'a'.repeat(64)});
 assert.equal(r.evidence.schema,AIG_REAL3D_GLB_SCHEMA);
 assert.equal(r.evidence.actualTriangles,42*40*2+42*2);
 assert.equal(r.evidence.renderGeometryPASS,true);
 assert.equal(r.evidence.primitiveCount,1);
 assert.equal(r.evidence.degenerateTriangles,0);
 assert.equal(r.evidence.sourceFormat,'GLB_2_BINARY_LOCAL');
 assert.equal(r.evidence.originalGLBTexturesApplied,false);
 assert.equal(r.evidence.originalGLBSkinningAnimated,false);
 assert.equal(r.evidence.trueHumanSourceAuthenticityVerified,false);
 assert.equal(r.evidence.humanShapeAndFaceVisuallyApproved,false);
 assert.equal(r.evidence.stage1ReleasePASS,false);
 assert.equal(r.releasePASS,false);
 assert.equal(auditAIG3DScene(r.scene).triangleCount,r.evidence.actualTriangles);
});
test('GLB scene transform and measured height always use native XYZ',()=>{
 const a=buildAIGReal3DGLBStatic({bytes:makeGLB({scale:1}),heightMm:1750});
 const b=buildAIGReal3DGLBStatic({bytes:makeGLB({scale:2}),heightMm:1750});
 const m=b.scene.nodes[0].mesh;
 assert.ok(Math.abs(m.bounds.max[1]-1.75)<1e-6);
 assert.deepEqual(m.bounds,a.scene.nodes[0].mesh.bounds);
});
test('rejects GLB that references remote buffers, corrupt indices or unknown source',()=>{
 assert.throws(()=>buildAIGReal3DGLBStatic({bytes:makeGLB({external:true}),heightMm:1680}),
  /EXTERNAL/);
 assert.throws(()=>buildAIGReal3DGLBStatic({bytes:makeGLB({badIndex:true}),heightMm:1680}),
  /INDEX_OUTSIDE_PRIMITIVE/);
 assert.throws(()=>buildAIGReal3DGLBStatic({bytes:new ArrayBuffer(0),heightMm:1680}),
  /FILE_SIZE/);
 assert.throws(()=>buildAIGReal3DGLBStatic({bytes:makeGLB(),heightMm:0}),
  /MEASURED_HEIGHT/);
});
