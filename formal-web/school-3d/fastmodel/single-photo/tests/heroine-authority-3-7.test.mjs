import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HEROINE_REFERENCE,identifyHeroineSource,inspectHeroineImage,evaluateHeroineJob} from '../heroine-authority-3-7.mjs';
const h=HEROINE_REFERENCE.sha256,g='c'.repeat(64);
const source=()=>({sha256:h,width:1152,height:1536,mime:'image/jpeg'});
test('actual provided source image is pinned by bytes, dimensions and JPEG magic rather than filename',()=>{
 const ok=identifyHeroineSource(source());
 assert.equal(ok.sourceMatched,true);
 assert.equal(ok.scene3dGenerated,false);
 for(const bad of [{...source(),sha256:g},{...source(),width:1153},{...source(),mime:'image/png'}])
  assert.equal(identifyHeroineSource(bad).sourceMatched,false);
 assert.equal(HEROINE_REFERENCE.unseenGeometryInferred,true);
});
test('source reader hashes supplied bytes and rejects non-JPEG even if named .png',async()=>{
 let calls=0;
 const file={size:120,name:'1000012158.png',arrayBuffer:async()=>{
  const b=new Uint8Array(120);b.set([255,216,255]);return b.buffer;}};
 const key=new Uint8Array(h.match(/.{2}/g).map(x=>parseInt(x,16)));
 const cryptoImpl={subtle:{digest:async()=>{calls++;return key.buffer;}}};
 const result=await inspectHeroineImage(file,{cryptoImpl,decodeImage:async()=>({width:1152,height:1536})});
 assert.equal(result.sourceMatched,true);assert.equal(calls,1);
 await assert.rejects(()=>inspectHeroineImage({...file,arrayBuffer:async()=>new Uint8Array(120).buffer},{
  cryptoImpl,decodeImage:async()=>({width:1152,height:1536})}),/HEROINE_SOURCE_NOT_JPEG/);
 assert.equal(calls,1);
});
function validJob(){return {id:'a'.repeat(32),sourceSHA256:h,status:'COMPLETE',
 provider:'Meshy',mode:'humanoid',stages:{model:{status:'SUCCEEDED'},rig:{status:'SUCCEEDED'},animation:{status:'SUCCEEDED'}},
 artifacts:{'animated.glb':{sha256:g,audit:{vertices:12400,triangles:20800,skins:1,animationClips:2,changingKeys:true,structuralOnly:true}}}};}
test('only the real source journal AND exact downloaded GLB SHA can be considered linked, never visually approved',()=>{
 const good=evaluateHeroineJob({job:validJob(),modelSha256:g});
 assert.equal(good.sourceChainMatched,true);assert.equal(good.confirmedPhotorealHeroine,false);
 assert.equal(good.formalReleaseAllowed,false);
 assert.equal(good.headNeckSeamVerified,false);
 for(const patch of [
  {...validJob(),sourceSHA256:'b'.repeat(64)},
  {...validJob(),status:'RUNNING'},
  {...validJob(),stages:{model:{status:'SUCCEEDED'},rig:{status:'FAILED'},animation:{status:'SUCCEEDED'}}},
  {...validJob(),artifacts:{'animated.glb':{sha256:g,audit:{vertices:4,triangles:4,skins:0,animationClips:0,changingKeys:false,structuralOnly:true}}}}
 ])assert.equal(evaluateHeroineJob({job:patch,modelSha256:g}).sourceChainMatched,false);
 assert.equal(evaluateHeroineJob({job:validJob(),modelSha256:'d'.repeat(64)}).sourceChainMatched,false);
 assert.equal(evaluateHeroineJob({job:validJob(),modelSha256:g,assetName:'model.glb'}).sourceChainMatched,false);
});
test('3.7 UI displays source-image status and linked model evidence without claiming completion',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),
  app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 for(const id of ['heroine-source-status','heroine-source-preview','heroine-glb-status','heroine-evidence-downloads'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(app,/inspectHeroineImage\(/);assert.match(app,/evaluateHeroineJob\(/);
 assert.match(app,/sourceChainMatched/);assert.match(app,/saveHeroineEvidence\(/);
});
