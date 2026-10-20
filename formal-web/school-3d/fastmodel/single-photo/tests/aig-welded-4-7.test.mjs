import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AIG45_POSES,recognizePose,auditMarks} from '../aig-calibration-4-5.mjs';
import {normalizePoseSet,buildHeadNeckPonytail,meshTopology} from '../aig-head-neck-4-6.mjs';
import {AIG47_SCHEMA,buildAIG47Draft,exportAIG47GLB} from '../aig-welded-4-7.mjs';
const marks={
 headTop:{x:.5,y:.07},chin:{x:.5,y:.17},
 leftShoulder:{x:.39,y:.25},rightShoulder:{x:.61,y:.25},
 leftHip:{x:.42,y:.53},rightHip:{x:.58,y:.53},
 leftAnkle:{x:.44,y:.90},rightAnkle:{x:.56,y:.90}
};
function source(){
 const p=AIG45_POSES[0],cal=auditMarks(recognizePose({sha256:p.sha256,width:p.width,height:p.height}),marks);
 return normalizePoseSet([cal]);
}
function connected(mesh){
 const n=mesh.positions.length/3,adj=Array.from({length:n},()=>new Set());
 for(let i=0;i<mesh.indices.length;i+=3){
  const t=[mesh.indices[i],mesh.indices[i+1],mesh.indices[i+2]];
  for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3];adj[a].add(b);adj[b].add(a);}
 }
 const seen=new Set([0]),todo=[0];while(todo.length){
  const v=todo.pop();for(const next of adj[v])if(!seen.has(next)){seen.add(next);todo.push(next);}
 }
 return seen.size===n;
}
test('4.7 keeps authoritative 4.5 SHA and 4.6 original three-part source unchanged',()=>{
 const p=source(),before=buildHeadNeckPonytail(p),snap=before.parts.map(x=>[...x.positions]);
 const r=buildAIG47Draft(p);
 assert.equal(r.schema,AIG47_SCHEMA);
 assert.deepEqual(r.sourceSHA256,[AIG45_POSES[0].sha256]);
 assert.equal(r.parts.length,2);
 assert.deepEqual(r.parts.map(x=>x.name),['headNeck','ponytail']);
 assert.equal(r.headNeckSharedVertexJoin,true);
 assert.equal(r.headNeckIsSingleConnectedIndexedSurface,true);
 assert.equal(r.headNeckExternalSkinWelded,false);
 assert.equal(r.skinnedOrRigged,false);
 assert.equal(r.releaseAllowed,false);
 assert.deepEqual(before.parts.map(x=>[...x.positions]),snap);
});
test('head/neck is a SINGLE indexed connected watertight outward volume, not two overlapping capped surfaces',()=>{
 const d=buildAIG47Draft(source()),m=d.parts[0],q=meshTopology(m);
 assert.ok(m.actualSharedJoinRingVertices>=16);
 assert.ok(connected(m),'All head and neck surface vertices must be reachable through shared edges');
 assert.equal(q.closed,true);
 assert.equal(q.normalOrientationVerified,true);
 assert.equal(q.degenerateTriangles,0);
 assert.equal(q.nonManifoldEdges,0);
 assert.equal(q.orientationConflicts,0);
 const join=m.joinY,y=m.positions;
 const ids=Array.from({length:y.length/3},(_,i)=>i).filter(i=>Math.abs(y[3*i+1]-join)<1e-6);
 assert.equal(ids.length,m.actualSharedJoinRingVertices,'only ONE shared seam ring exists');
 const seam=new Set(ids),up=new Set(),down=new Set();
 for(let i=0;i<m.indices.length;i+=3){
  const t=[...m.indices.slice(i,i+3)];
  if(t.some(n=>seam.has(n))){
   if(t.some(n=>y[3*n+1]>join+1e-5))t.filter(n=>seam.has(n)).forEach(x=>up.add(x));
   if(t.some(n=>y[3*n+1]<join-1e-5))t.filter(n=>seam.has(n)).forEach(x=>down.add(x));
  }
 }
 assert.equal(up.size,ids.length);
 assert.equal(down.size,ids.length);
 assert.equal(d.topologyQA,true);
});
test('actual ponytail vertex clearance risk is measured but never called physical strand collision-free',()=>{
 const a=buildAIG47Draft(source(),{ponytailBack:.04,ponytailSwing:-.08});
 const b=buildAIG47Draft(source(),{ponytailBack:.19,ponytailSwing:.08});
 assert.deepEqual([...a.parts[0].positions],[...b.parts[0].positions]);
 assert.notDeepEqual([...a.parts[1].positions],[...b.parts[1].positions]);
 assert.ok(a.hairClearance.sampledPonytailVertices>=0);
 assert.ok(a.hairClearance.verticesInsideEnvelope>=0);
 assert.equal(a.hairClearance.exactTriangleIntersectionVerified,false);
 assert.equal(b.realHairCollisionVerified,false);
 assert.equal(b.fullBackSideSourceVerified,false);
 assert.equal(b.completeHumanModel,false);
 assert.throws(()=>buildAIG47Draft(source(),{ponytailSwing:1}),/NORMALIZED_PROFILE_REQUIRED/);
 assert.throws(()=>buildAIG47Draft({schema:'fake'}),/SHA_BOUND_PROFILE_REQUIRED/);
});
test('genuine self-contained glTF 2.0 GLB contains two technical mesh primitives and no invented rig or texture',()=>{
 const d=buildAIG47Draft(source()),out=exportAIG47GLB(d),data=out.bytes;
 assert.equal(out.container,'glb');
 assert.equal(out.releaseAllowed,false);
 assert.ok(data.length>8000);
 const dv=new DataView(data.buffer,data.byteOffset,data.byteLength);
 assert.equal(dv.getUint32(0,true),0x46546c67);
 assert.equal(dv.getUint32(4,true),2);
 assert.equal(dv.getUint32(8,true),data.byteLength);
 const jl=dv.getUint32(12,true);
 assert.equal(dv.getUint32(16,true),0x4e4f534a);
 const json=JSON.parse(new TextDecoder().decode(data.subarray(20,20+jl)));
 assert.equal(json.asset.version,'2.0');
 assert.equal(json.meshes.length,2);
 assert.equal(json.nodes.length,2);
 assert.equal(json.materials.length,2);
 assert.equal(json.accessors.length,4);
 assert.equal(json.extras.validForFormalCharacterRelease,false);
 assert.equal(json.extras.rigged,false);
 assert.equal(json.extras.uvMapped,false);
 assert.ok(!json.skins&&!json.animations&&!json.images&&!json.textures);
 assert.deepEqual(json.extras.originalSourceSHA256,d.sourceSHA256);
 const offset=20+jl,bl=dv.getUint32(offset,true);
 assert.equal(dv.getUint32(offset+4,true),0x004e4942);
 assert.equal(offset+8+bl,data.length);
 assert.equal(json.buffers[0].byteLength,bl);
 for(const view of json.bufferViews){
  assert.equal(view.byteOffset%4,0);
  assert.ok(view.byteLength>0&&view.byteOffset+view.byteLength<=bl);
 }
 assert.throws(()=>exportAIG47GLB({...d,topologyQA:false}),/UNVERIFIED_DRAFT/);
});
test('exported binary 4.7 technical GLB really loads back into a Three.js scene with two mesh objects',async()=>{
 const glb=exportAIG47GLB(buildAIG47Draft(source()));
 const parsed=await new GLTFLoader().parseAsync(glb.bytes.buffer,'');
 let count=0,triangles=0;
 parsed.scene.traverse(node=>{
  if(!node.isMesh)return;
  count++;
  assert.ok(node.geometry.getAttribute('position').count>100);
  assert.ok(node.geometry.index?.count>100);
  triangles+=node.geometry.index.count/3;
  assert.equal(node.isSkinnedMesh,undefined);
 });
 assert.equal(count,2);
 assert.ok(triangles>300);
 assert.equal(parsed.animations.length,0);
});
test('4.7 UI provides genuine source-bound shared mesh and glb download action, preserves prior versions',()=>{
 const read=x=>fs.readFileSync(new URL(x,import.meta.url),'utf8');
 const html=read('../index.html'),app=read('../app.mjs'),core=read('../aig-welded-4-7.mjs');
 for(const id of ['aig47-build','aig47-download','aig47-evidence','aig47-status'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(app.includes('buildAIG47Draft(aig46Profile'));
 assert.ok(app.includes('exportAIG47GLB(aig47Draft)'));
 assert.ok(app.includes('aig47Reset('));
 assert.ok(app.includes('AIG-4.7-technical-shared-head-neck-NOT-HEROINE.glb'));
 assert.ok(app.includes('aig47Draft||aig46Draft'));
 assert.ok(!/MeshyClient|StableFast3D|fetch\(|https:\/\//.test(core));
 assert.ok(html.includes('id="aig46-build"'));
 assert.ok(app.includes('exportOBJ(aig46Draft)'));
});
