import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectAnimatedIntegrity} from '../web/animated-integrity.mjs';
const realFixture=()=>{
 const accessors=[],data=new Map();
 const add=(values,type,count)=>{const id=accessors.length;accessors.push({type,count:values.length/count});data.set(id,values);return id;};
 const meshes=[];
 for(const verts of [
  [0,0,0,.1,0,0,0,.1,0],
  [0,.08,0,.1,.08,0,0,.18,0],
  [1,0,0,1.1,0,0,1,.1,0]
 ]){
  const position=add(Float32Array.from(verts),'VEC3',3);
  const joints=add(Uint16Array.from(Array(12).fill(0)),'VEC4',4);
  const weights=add(Float32Array.from([1,0,0,0,1,0,0,0,1,0,0,0]),'VEC4',4);
  meshes.push({primitives:[{mode:4,attributes:{POSITION:position,JOINTS_0:joints,WEIGHTS_0:weights}}]});
 }
 const input=add(Float32Array.from([0,1]),'SCALAR',1),
       output=add(Float32Array.from([0,0,0,1,0,0,Math.SQRT1_2,Math.SQRT1_2]),'VEC4',4);
 const nodes=[
  {mesh:0,skin:0,extras:{aigAnatomyPart:'head'}},
  {mesh:1,skin:0,extras:{aigAnatomyPart:'neck'}},
  {mesh:2,skin:1,extras:{aigAnatomyPart:'hair'}},
  {},{}
 ];
 const file={g:{accessors,meshes,nodes,skins:[{joints:[3]},{joints:[4]}],
 animations:[{samplers:[{input,output,interpolation:'LINEAR'}],
 channels:[{sampler:0,target:{node:4,path:'rotation'}}]}]}};
 const reader=(_file,id)=>data.get(id);
 return {file,reader};
};
test('explicit selected clip audits the same source pose without mixing alternatives',()=>{
 const {file,reader}=realFixture();
 file.g.animations.push(structuredClone(file.g.animations[0]));
 file.g.animations[1].channels[0].target.node=3;
 const before=JSON.stringify(file.g);
 const hair=inspectAnimatedIntegrity(file,reader,{clipIndex:0});
 const body=inspectAnimatedIntegrity(file,reader,{clipIndex:1});
 assert.equal(hair.clipIndex,0);assert.equal(body.clipIndex,1);
 assert.equal(hair.movementObserved,true);assert.equal(body.movementObserved,false);
 assert.equal(inspectAnimatedIntegrity(file,reader).reason,'MULTIPLE_ANIMATION_CLIPS_NEED_EXPLICIT_SELECTION');
 assert.equal(inspectAnimatedIntegrity(file,reader,{clipIndex:7}).reason,'ANIMATION_CLIP_INDEX');
 assert.equal(JSON.stringify(file.g),before);
});
test('reads real animated joints, samples moving hair and reports per-frame risk, no fake collision approval',()=>{
 const {file,reader}=realFixture();
 const s=inspectAnimatedIntegrity(file,reader,{frames:13});
 assert.equal(s.status,'POSED_SAMPLE_RISK_REVIEW_REQUIRED');
 assert.equal(s.sampledFrames,13);assert.equal(s.readings.length,13);
 assert.equal(s.readings[0].frame,0);
 assert.ok(s.readings.some(r=>r.timeSec>0));
 assert.ok(s.movementObserved);
 assert.ok(s.readings.every(r=>Number.isFinite(r.headNeckNearestSample)));
 assert.ok(s.readings.every(r=>Number.isFinite(r.hairNeckNearestSample)));
 assert.equal(s.actualSeamFixed,false);
 assert.equal(s.animatedCollisionProved,false);
 assert.equal(s.exactTrianglePenetrationTested,false);
 assert.equal(s.realDeviceTest,false);
});
test('missing tagged hair, unsupported animation channel and missing clip fail closed',()=>{
 const {file,reader}=realFixture();
 file.g.nodes[2].extras.aigAnatomyPart='UNKNOWN';
 const a=inspectAnimatedIntegrity(file,reader);assert.equal(a.status,'BLOCKED');assert.match(a.reason,/NO_EXPLICIT_HAIR/);
 file.g.nodes[2].extras.aigAnatomyPart='hair';
 file.g.animations[0].channels[0].target.path='translation';
 const b=inspectAnimatedIntegrity(file,reader);assert.equal(b.status,'BLOCKED');assert.match(b.reason,/UNSUPPORTED_ANIMATION_CHANNEL/);
 file.g.animations=[];
 const c=inspectAnimatedIntegrity(file,reader);assert.equal(c.status,'BLOCKED');assert.equal(c.reason,'NO_SUPPORTED_ROTATION_ANIMATION');
});
test('bad skin indexes and node transformations are blocked, source never changed',()=>{
 const {file,reader}=realFixture();
 const original=JSON.stringify(file.g);
 file.g.nodes[2].translation=[0,0,0];
 assert.equal(inspectAnimatedIntegrity(file,reader).reason,'MESH_NODE_TRANSFORM_OR_PARENT_UNSUPPORTED');
 delete file.g.nodes[2].translation;
 file.g.skins[1].joints=[];
 assert.equal(inspectAnimatedIntegrity(file,reader).status,'BLOCKED');
 file.g.skins[1].joints=[4];
 assert.equal(JSON.stringify(file.g),original);
});
test('bounded sampling and truthful UI/offline wiring',()=>{
 const {file,reader}=realFixture();
 assert.throws(()=>inspectAnimatedIntegrity(file,reader,{frames:400}),/ANIMATION_AUDIT_BUDGET/);
 assert.throws(()=>inspectAnimatedIntegrity(file,reader,{maxVerticesPerRole:1}),/ANIMATION_AUDIT_BUDGET/);
 const base=new URL('../',import.meta.url),load=f=>fs.readFileSync(new URL(f,base),'utf8');
 const html=load('web/index.html'),main=load('web/main.mjs'),packer=load('tools/build_standalone.py');
 for(const id of ['animated-check','animated-status'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(main.includes('inspectAnimatedIntegrity(f,readAccessor'));
 assert.ok(main.includes('animatedPoseAudit:lastAnimatedAudit'));
 assert.ok(packer.includes('animated-integrity.mjs'));
 assert.ok(packer.includes("'\\n'+animationAudit+'\\n'"));
});

test('separate named animation clips are not accidentally merged into fake animation',()=>{
 const {file,reader}=realFixture();
 file.g.animations.push({...file.g.animations[0]});
 const result=inspectAnimatedIntegrity(file,reader);
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.reason,'MULTIPLE_ANIMATION_CLIPS_NEED_EXPLICIT_SELECTION');
});
test('same joint multiple conflicting channels cannot fake a stable sampled pose',()=>{
 const {file,reader}=realFixture();
 file.g.animations[0].channels.push({...file.g.animations[0].channels[0]});
 const result=inspectAnimatedIntegrity(file,reader);
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.reason,'DUPLICATE_NODE_ANIMATION_TRACK');
});
