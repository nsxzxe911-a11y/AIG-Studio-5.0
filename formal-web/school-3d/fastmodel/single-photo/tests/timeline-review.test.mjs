import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TIMELINE_FRACTIONS,TIMELINE_VIEW_KEYS,validateTimelineSamples,timelineEvidenceManifest,composeTimelineImage} from '../timeline-review.mjs';
const sha='e'.repeat(64);
function goodSamples(){
 return TIMELINE_FRACTIONS.map(fraction=>({
  fraction,timeSeconds:fraction*4,clipName:'Fight Move A',
  image:new Blob(['mock pixels'],{type:'image/png'}),
  views:TIMELINE_VIEW_KEYS.map(key=>({key,poseTimeSeconds:fraction*4})),
  audit:{checkedTriangles:700,coincidentTrianglePairs:fraction===.5?2:0,
   degenerateTriangles:0,skinningVertexIssues:0,anatomyTagsAvailable:true,
   hairNeckBoxOverlap:fraction===.75,incomplete:false}
 }));
}
test('16 frames must be 4 selected real GLB times × four exact world-axis views',()=>{
 assert.deepEqual([...TIMELINE_FRACTIONS],[0,.25,.5,.75]);
 assert.deepEqual([...TIMELINE_VIEW_KEYS],['positive-z','positive-x','negative-z','negative-x']);
 const report=timelineEvidenceManifest({sourceSha256:sha,clipName:'Fight Move A',samples:goodSamples()});
 assert.equal(report.schema,'AIG_FASTMODEL_3_0_REAL_ANIMATED_16_FRAME_QA');
 assert.equal(report.sampleCount,4);assert.equal(report.viewCount,16);
 assert.equal(report.rows[2].duplicateSurfacePairs,2);
 assert.equal(report.rows[3].possibleHairNeckOverlap,true);
 assert.equal(report.visualHumanReviewPassed,false);
 assert.equal(report.approvedFightChoreographyPresent,false);
 assert.equal(report.approvedHeroineGLBConfirmed,false);
 assert.equal(report.nativeGpu60FPSVerified,false);
 assert.equal(report.acceptance,'BLOCKED_PENDING_REAL_HEROINE_VISUAL_AND_DEVICE_TEST');
});
test('cannot fabricate clips, synthetic QA or substitute still-frame screenshots',()=>{
 const good=goodSamples();
 assert.throws(()=>timelineEvidenceManifest({sourceSha256:sha,clipName:null,samples:good}),/TIMELINE_ACTION_REQUIRED/);
 assert.throws(()=>timelineEvidenceManifest({sourceSha256:'bad',clipName:'walk',samples:good}),/TIMELINE_SOURCE_SHA_REQUIRED/);
 assert.throws(()=>validateTimelineSamples(good.slice(0,3),{sourceSha256:sha,clipName:'Fight Move A'}),/TIMELINE_FOUR_POSES_REQUIRED/);
 const broken=goodSamples();broken[2].views=broken[2].views.slice(0,3);
 assert.throws(()=>validateTimelineSamples(broken,{sourceSha256:sha,clipName:'Fight Move A'}),/TIMELINE_REAL_POSE_EVIDENCE_INVALID/);
 broken[2]=goodSamples()[2];broken[2].image=new Blob(['not image'],{type:'text/plain'});
 assert.throws(()=>validateTimelineSamples(broken,{sourceSha256:sha,clipName:'Fight Move A'}),/TIMELINE_REAL_POSE_EVIDENCE_INVALID/);
 const switched=goodSamples();switched[3].clipName='wrong';
 assert.throws(()=>timelineEvidenceManifest({sourceSha256:sha,clipName:'Fight Move A',samples:switched}),/TIMELINE_CLIP_CHANGED/);
});
test('PNG contact sheet renders EXACTLY 16 image-backed cells, closes image resources',async()=>{
 const samples=goodSamples(),calls=[],closed=[];
 const context={drawImage(...args){calls.push(args);},fillRect(){},fillText(){},
  set fillStyle(v){},set font(v){}};
 const canvas={width:0,height:0,getContext:()=>context,toBlob(fn,type){fn(new Blob(['png'],{type}));}};
 const result=await composeTimelineImage(samples,{
  imageDecoder:async(blob)=>({width:960,height:720,close(){closed.push(blob);}}),
  canvasFactory:()=>canvas
 });
 assert.equal(result.frames,16);
 assert.equal(result.width,1680);assert.equal(result.height,1200);
 assert.equal(result.image.type,'image/png');
 assert.equal(calls.length,16);
 assert.equal(closed.length,4);
 assert.deepEqual(calls[0].slice(1,5),[0,0,480,360]);
 assert.deepEqual(calls[3].slice(1,5),[480,360,480,360]);
 assert.equal(calls[4][6],300); // row 1 y
 assert.equal(result.actualSourceFrames,true);
});
test('real viewer timeline pipeline uses chosen clip, true mixer pose, restores playback and refuses GLB reload',()=>{
 const root=new URL('../',import.meta.url);
 const get=name=>fs.readFileSync(new URL(name,root),'utf8');
 const viewer=get('viewer.mjs'),app=get('app.mjs'),html=get('index.html');
 for(const id of ['timeline-capture','timeline-status','timeline-image','timeline-downloads'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('沒有打鬥動畫就不會造假'));
 assert.ok(app.includes('view.captureTimelineReview({onProgress:'));
 assert.ok(app.includes('timelineEvidenceManifest({sourceSha256:sourceSha'));
 assert.ok(app.includes('JSON.stringify(manifest,null,2)'));
 assert.ok(app.includes('clearTimelineEvidence();'));
 assert.ok(app.includes("if(view?.reviewBusy)"));
 assert.ok(app.includes("clearReviewEvidence();clearTimelineEvidence();"));
 assert.ok(app.includes("舊的四方向與 16 格圖片失效"));

 assert.ok(app.includes("!sourceSha||!clips.length"));
 assert.ok(viewer.includes('if(!clip)throw Error('+"'TIMELINE_REAL_ACTION_MISSING'"+')'));
 assert.ok(viewer.includes('const currentModel=this.model'));
 assert.ok(viewer.includes('this.animation.paused=true;'));
 assert.ok(viewer.includes('this.animation.mixer.setTime(previousTime)'));
 assert.ok(viewer.includes('this.skinProbe=previousProbe'));
 assert.ok(viewer.includes('const result=await this.captureHeroineReview({fraction})'));
 assert.ok(viewer.includes('if(this.reviewBusy)throw Error('+"'TIMELINE_REVIEW_IN_PROGRESS'"+')'));
});
