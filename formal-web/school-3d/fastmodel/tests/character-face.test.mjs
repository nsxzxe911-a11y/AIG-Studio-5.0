import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {faceShapeSignature,compareFaceShapes,CharacterFaceRoster} from '../web/character-face.mjs';
const signature=(scale=1,twist=0)=>{
 const count=240,data=[];
 for(let i=0;i<count;i++){
  const a=i*.49,y=(i%29)/28,z=(i%11)/10;
  data.push((Math.sin(a)*(1-y*.45)+twist*y)*scale,(y-.5)*scale,(Math.cos(a)*(1-y*.32)+z*.1)*scale);
 }
 const file={g:{nodes:[{mesh:0,extras:{aigAnatomyPart:'face'}}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{type:'VEC3',count}]}};
 return faceShapeSignature(file,()=>Float32Array.from(data),{maxSamples:1500});
};
test('same fake 3D actor is detected as similar, no real identity result',()=>{
 const a=signature(),b=signature();
 const r=compareFaceShapes(a,b);
 assert.equal(r.alert,true);assert.equal(r.score,1);
 assert.equal(a.biometricIdentityRecognized,false);
 assert.equal(a.poseInvariant,false);
});
test('roster keeps original leading actor and warns when classmate is near clone',()=>{
 const r=new CharacterFaceRoster(),a=signature();
 assert.equal(r.add({id:'HERO_01',role:'lead',signature:a}).compared,0);
 const next=r.add({id:'CLASSMATE_02',role:'classmate',signature:signature()});
 assert.equal(next.compared,1);assert.equal(next.warnings.length,1);
 assert.equal(next.warnings[0].id,'HERO_01');assert.equal(r.entries.get('HERO_01').signature,a);
 assert.throws(()=>r.add({id:'HERO_01',role:'classmate',signature:a}),/CHARFACE_ID_ALREADY_EXISTS/);
 r.clear();assert.equal(r.entries.size,0);
});
test('unmarked models are not fake-recognized and input is safely bounded',()=>{
 const file={g:{nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{type:'VEC3',count:240}]}};
 assert.throws(()=>faceShapeSignature(file,()=>[]),/CHARFACE_NO_EXPLICIT_FACE_TAG/);
 assert.throws(()=>faceShapeSignature(file,()=>[],{maxSamples:99999}),/CHARFACE_SAMPLE_BUDGET/);
 assert.throws(()=>new CharacterFaceRoster().add({id:'bad id',role:'lead',signature:signature()}),/CHARFACE_INVALID_CHARACTER/);
});
test('offline bundle and UI use actual comparisons, not fake recognition status',()=>{
 const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const h=read('web/index.html'),m=read('web/main.mjs'),p=read('tools/build_standalone.py');
 for(const x of ['id="face-compare"','id="face-clear"','id="character-id"','id="character-role"','id="face-status"'])assert.ok(h.includes(x),x);
 assert.ok(m.includes('faceShapeSignature(file,sampleVec3Accessor)'));
 assert.ok(m.includes("faceRoster.add("));assert.ok(m.includes('faceRoster.clear()'));
 assert.ok(p.includes('character-face.mjs'));assert.ok(p.includes("'\\n'+face+'\\n'"));
});
