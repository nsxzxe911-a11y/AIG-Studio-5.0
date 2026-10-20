import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {REVIEW_DIRECTIONS,REVIEW_POSE_FRACTIONS,reviewCameraPose,reviewPoseTime,reviewEvidenceManifest}
 from '../heroine-review.mjs';
const bounds=()=>new THREE.Box3(new THREE.Vector3(-.5,-1,-.25),new THREE.Vector3(.5,1,.25));
test('real four camera directions are geometry-relative and yield different positions',()=>{
 const b=bounds();
 assert.equal(REVIEW_DIRECTIONS.length,4);
 const keys=new Set(REVIEW_DIRECTIONS.map(d=>d.key));assert.equal(keys.size,4);
 const points=REVIEW_DIRECTIONS.map(d=>reviewCameraPose(b,d.key));
 assert.equal(points.length,4);
 assert.ok(points[0].position.z>points[0].target.z);
 assert.ok(points[1].position.x>points[1].target.x);
 assert.ok(points[2].position.z<points[2].target.z);
 assert.ok(points[3].position.x<points[3].target.x);
 assert.ok(points.every(x=>x.near>0&&x.far>x.near));
 assert.deepEqual(b.min.toArray(),[-.5,-1,-.25]); // source box never rewritten
 assert.throws(()=>reviewCameraPose(b,'fake-front'),/REVIEW_ANGLE_INVALID/);
 assert.throws(()=>reviewCameraPose(new THREE.Box3(),'positive-z'),/REVIEW_BOUNDS_REQUIRED/);
});
test('poses are real clip fractions, and no animation remains explicitly static',()=>{
 assert.deepEqual([...REVIEW_POSE_FRACTIONS],[0,.25,.5,.75]);
 const c=new THREE.AnimationClip('walk',2,[]);
 assert.deepEqual(reviewPoseTime(c,.5),{timeSeconds:1,animated:true});
 assert.deepEqual(reviewPoseTime(null,.5),{timeSeconds:0,animated:false});
 assert.equal(reviewPoseTime(c,.75).timeSeconds,1.5);
 assert.throws(()=>reviewPoseTime(c,.333),/REVIEW_FRACTION_INVALID/);
 assert.throws(()=>reviewPoseTime({duration:-5},.25),/REVIEW_CLIP_DURATION_INVALID/);
});
test('complete four angle screenshot evidence cannot self-approve a synthetic or unverified heroine',()=>{
 const sha='c'.repeat(64);
 const views=REVIEW_DIRECTIONS.map(({key})=>({key}));
 const m=reviewEvidenceManifest({sourceSha256:sha,clipName:'fight',timeSeconds:.75,views,
   audit:{coincidentTrianglePairs:2,skinningVertexIssues:1,checkedTriangles:2400,incomplete:true}});
 assert.equal(m.allFourViewsCaptured,true);
 assert.equal(m.sourceSha256,sha);
 assert.equal(m.sampledTriangleOverlapCount,2);
 assert.equal(m.sampledWeightIssues,1);
 assert.equal(m.scanIncomplete,true);
 assert.equal(m.approvedHeroineSourceVerified,false);
 assert.equal(m.visualHumanReviewPassed,false);
 assert.equal(m.exactHeadNeckWeldProven,false);
 assert.equal(m.hairPenetrationFreeProven,false);
 assert.equal(m.nativeWindowsAndroidFps60Verified,false);
 assert.equal(m.acceptance,'BLOCKED_REAL_HEROINE_AND_MANUAL_VISUAL_QA');
 const missing=reviewEvidenceManifest({sourceSha256:sha,views:views.slice(0,3)});
 assert.equal(missing.allFourViewsCaptured,false);
 assert.throws(()=>reviewEvidenceManifest({sourceSha256:'not-a-SHA',views}),/REVIEW_SHA_REQUIRED/);
 assert.throws(()=>reviewEvidenceManifest({sourceSha256:sha,timeSeconds:-1,views}),/REVIEW_TIME_INVALID/);
});
test('real Three.js viewer and functional screenshot callbacks preserve camera, animation and source GLB',()=>{
 const root=new URL('../',import.meta.url),get=x=>fs.readFileSync(new URL(x,root),'utf8');
 const html=get('index.html'),app=get('app.mjs'),viewer=get('viewer.mjs'),build=get('build.mjs');
 for(const id of ['review-pose','review-capture','review-status','review-image','review-downloads',
   'skin-check','local-glb'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(app.includes("view.captureHeroineReview({fraction})"));
 assert.ok(app.includes("sha256Bytes(bytes)"));
 assert.ok(app.includes("sourceSha256:sourceSha"));
 assert.ok(app.includes("new Blob([JSON.stringify(manifest,null,2)]"));
 assert.ok(app.includes("URL.revokeObjectURL(url)"));
 assert.ok(viewer.includes("this.animation.mixer.setTime(timeSeconds)"));
 assert.ok(viewer.includes("this.animation.mixer.setTime(previousTime)"));
 assert.ok(viewer.includes("this.camera.position.copy(previousCamera.position)"));
 assert.ok(viewer.includes("this.controls.target.copy(previousControls.target)"));
 assert.ok(viewer.includes("paint.drawImage(this.renderer.domElement,x,y,tileW,tileH)"));
 assert.ok(viewer.includes("contact.toBlob("));
 assert.ok(viewer.includes("inspectSkinPose(this.model,"));
 assert.ok(build.includes("entryPoints:['app.mjs']")); // bundled so external source import not needed
});
