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
 assert.ok(m.includes('faceShapeSignature(file,sampleVec3Accessor,{characterId:id})'));
 assert.ok(m.includes("el('face-rescan').addEventListener"));
 assert.ok(h.includes('id="face-rescan"'));
 assert.ok(m.includes("faceRoster.add("));assert.ok(m.includes('faceRoster.clear()'));
 assert.ok(p.includes('character-face.mjs'));assert.ok(p.includes("'\\n'+face+'\\n'"));
});

test('unique female lead and classmate duplicate detection prevent same-face cast',()=>{
 const roster=new CharacterFaceRoster();
 const a=roster.add({id:'HERO_01',role:'lead',signature:signature()});
 assert.equal(a.leadId,'HERO_01');
 assert.throws(()=>roster.add({id:'LEAD_B',role:'lead',signature:signature(2)}),/CHARFACE_LEAD_ALREADY_LOCKED/);
 assert.equal(roster.entries.size,1);
 const clone=roster.add({id:'CLASS_01',role:'classmate',signature:signature()});
 assert.equal(clone.warnings.length,1);assert.equal(clone.warnings[0].level,'EXACT_DESCRIPTOR_DUPLICATE');
 assert.equal(clone.warnings[0].id,'HERO_01');
 assert.equal(clone.realPersonRecognized,false);
});
test('same-ID re-scan validates first, changes only its own signature; stable lead remains',()=>{
 const roster=new CharacterFaceRoster();
 const hero=signature();
 roster.add({id:'HERO',role:'lead',signature:hero});
 roster.add({id:'STUDENT',role:'classmate',signature:signature()});
 const result=roster.add({id:'STUDENT',role:'classmate',signature:signature(1,0.5),replace:true});
 assert.equal(result.revision,'RESCANNED_EXISTING_CHARACTER');
 assert.equal(roster.entries.get('HERO').signature,hero);
 assert.equal(roster.entries.size,2);
 assert.throws(()=>roster.add({id:'STUDENT',role:'lead',signature:signature(),replace:true}),/CHARFACE_ROLE_CHANGE_BLOCKED/);
 assert.throws(()=>roster.add({id:'NEW',role:'classmate',signature:signature(),replace:true}),/CHARFACE_REPLACE_NOT_FOUND/);
 assert.equal(roster.entries.size,2);
});
test('a GLB with two classmates must isolate explicit face owner tags',()=>{
 const p=240;const vertices=Array.from({length:p*3},(_,i)=>Math.sin(i*.1)+(i%3));
 const file={g:{nodes:[
  {mesh:0,extras:{aigAnatomyPart:'face',aigCharacterId:'HERO_01'}},
  {mesh:1,extras:{aigAnatomyPart:'face',aigCharacterId:'CLASS_01'}}
 ],meshes:[{primitives:[{attributes:{POSITION:0}}]},{primitives:[{attributes:{POSITION:1}}]}],
 accessors:[{type:'VEC3',count:p},{type:'VEC3',count:p}]}};
 assert.throws(()=>faceShapeSignature(file,()=>Float32Array.from(vertices)),/CHARFACE_MULTIPLE_CHARACTERS_REQUIRE_ID/);
 const one=faceShapeSignature(file,()=>Float32Array.from(vertices),{characterId:'HERO_01'});
 assert.equal(one.faceNodeCount,1);assert.equal(one.characterTag,'HERO_01');
 const two=faceShapeSignature(file,()=>Float32Array.from(vertices),{characterId:'CLASS_01'});
 assert.equal(two.faceNodeCount,1);assert.equal(two.characterTag,'CLASS_01');
 assert.throws(()=>faceShapeSignature(file,()=>Float32Array.from(vertices),{characterId:'OTHER'}),/CHARFACE_CHARACTER_TAG_MISMATCH/);
 file.g.nodes[1].extras.aigCharacterId=undefined;
 assert.throws(()=>faceShapeSignature(file,()=>Float32Array.from(vertices),{characterId:'HERO_01'}),/CHARFACE_OWNER_UNCLEAR/);
});
test('roster is bounded and forbids silent duplicate ID overwrite',()=>{
 const r=new CharacterFaceRoster({maxCharacters:2});
 r.add({id:'HERO',role:'lead',signature:signature()});
 r.add({id:'MATE',role:'classmate',signature:signature(1,.2)});
 assert.throws(()=>r.add({id:'NEXT',role:'classmate',signature:signature(1,.5)}),/CHARFACE_ROSTER_FULL/);
 assert.throws(()=>r.add({id:'MATE',role:'classmate',signature:signature()}),/CHARFACE_ID_ALREADY_EXISTS/);
 assert.equal(r.entries.size,2);
});
