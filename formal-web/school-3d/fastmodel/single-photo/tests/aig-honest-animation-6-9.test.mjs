import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planAIG65AutoAnimation,sampleAIG65FlatMotion} from '../aig-auto-animation-6-5.mjs';
const sha='ab'.repeat(32);
test('real 3D cannot silently become a fake walking image when GLB clips are missing',()=>{
 const r=planAIG65AutoAnimation({
  storyText:'女主角在校園走路',hasImage:true,imageSHA256:sha,
  hasGLB:false,clips:[],requestedMode:'3D',durationSeconds:8});
 assert.equal(r.ready,false);
 assert.equal(r.selectedMode,'3D');
 assert.deepEqual(r.blockers,['VERIFIED_REAL_GLB_CLIPS_REQUIRED']);
});
test('AUTO photo is explicitly camera motion and does not imply moving human joints',()=>{
 const r=planAIG65AutoAnimation({
  storyText:'女主角在校園走路',hasImage:true,imageSHA256:sha,
  hasGLB:false,clips:[],requestedMode:'AUTO',durationSeconds:8});
 assert.equal(r.ready,true);
 assert.equal(r.selectedMode,'2.5D');
 assert.equal(r.timeline[0].photoHasArticulatedLimbs,false);
 assert.equal(r.timeline[0].armsAndLegsActuallyAnimated,false);
 const a=sampleAIG65FlatMotion(r,.1),b=sampleAIG65FlatMotion(r,1.4);
 assert.notDeepEqual(a.transform,b.transform);
});
test('live visible controls explicitly separate photo camera moves and true 3D clips',()=>{
 const read=n=>fs.readFileSync(new URL('../'+n,import.meta.url),'utf8');
 const html=read('index.html'),app=read('app.mjs'),movie=read('aig-canvas-movie-6-5.mjs');
 for(const id of ['aig695-need-real-3d','aig695-switch-auto',
  'aig695-import-glb','aig695-real-motion-info']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.ok(app.includes("reason.includes('VERIFIED_REAL_GLB_CLIPS_REQUIRED')"));
 assert.ok(app.includes("'aig695-switch-auto').addEventListener('click'"));
 assert.ok(app.includes("'aig695-import-glb').addEventListener('click'"));
 assert.ok(app.includes("'aig65-mode').value='AUTO'"));
 assert.ok(movie.includes('照片運鏡（非真'));
 assert.ok(movie.includes('actualHumanJointPositionsComputed:false'));
 assert.ok(movie.includes('stillPhotoMotionCannotBeCalledRealWalk'));
});
