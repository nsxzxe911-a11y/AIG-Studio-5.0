import test from "node:test";
import {strict as assert} from "node:assert";
import {parseGLB,auditGLB} from "../glb-audit.v1.mjs";
import {readFileSync} from "node:fs";

function makeGLB(doc){
 const json=new TextEncoder().encode(JSON.stringify(doc)),pad=Math.ceil(json.length/4)*4;
 const b=new Uint8Array(12+8+pad+8+4),v=new DataView(b.buffer);
 v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,b.length,true);
 v.setUint32(12,pad,true);v.setUint32(16,0x4e4f534a,true);
 b.fill(32,20,20+pad);b.set(json,20);
 v.setUint32(20+pad,4,true);v.setUint32(24+pad,0x004e4942,true);
 return b;
}
const doc={asset:{version:"2.0"},scenes:[{nodes:[0]}],scene:0,
 nodes:[{name:"SchoolRoot"}],buffers:[{byteLength:4}],
 bufferViews:[{buffer:0,byteOffset:0,byteLength:4}],
 meshes:[{name:"School",primitives:[{attributes:{POSITION:0}}]}],
 accessors:[{count:3,componentType:5126,type:"VEC3"}]};
test("parse valid GLB header",()=>assert.equal(parseGLB(makeGLB(doc)).asset.version,"2.0"));
test("no low-poly 3D mannequin can pass character gate",()=>assert.equal(auditGLB(makeGLB(doc),"character").pass,false));
test("untextured school box never passes campus gate",()=>assert.equal(auditGLB(makeGLB(doc),"campus").pass,false));
test("static asset without clips never passes animation gate",()=>assert.equal(auditGLB(makeGLB(doc),"animations").pass,false));
test("reject GLB with broken magic",()=>{
 const b=makeGLB(doc);b[0]=0;assert.throws(()=>parseGLB(b),/magic/);
});
test("reject truncated GLB",()=>{
 const b=makeGLB(doc).slice(0,-1);assert.throws(()=>parseGLB(b),/長度/);
});
test("reject external web texture",()=>assert.throws(()=>parseGLB(makeGLB({...doc,images:[{uri:"https://bad.example/img.png"}]})),/image/));
test("reject unsupported compressed decoder",()=>assert.throws(()=>parseGLB(makeGLB({...doc,extensionsRequired:["KHR_draco_mesh_compression"]})),/解碼器/));
test("new stage remains BLOCKED until true assets exist",()=>{
 const manifest=JSON.parse(readFileSync(new URL("../authority.v1.json",import.meta.url),"utf8"));
 assert.equal(manifest.deploymentState,"PREVIEW_ONLY_NOT_PRODUCTION");
 assert.equal(Object.values(manifest.assets).every(a=>a.approval.startsWith("PENDING")),true);
});

test("reject explicitly unapproved rig asset even when parseable",()=>{
 const marked=makeGLB({...doc,asset:{version:"2.0",generator:"AIG skinned prototype / NOT VISUAL AUTHORITY"}});
 const x=auditGLB(marked,"character");
 assert.equal(x.pass,false);
 assert.ok(x.errors.some(x=>x.includes("未核准")));
});
