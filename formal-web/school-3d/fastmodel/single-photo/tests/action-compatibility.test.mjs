import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {ACTION_BRIDGE_VERSION,inspectExternalAction,copyCompatibleClips} from '../action-compatibility.mjs';
import {AnimationController} from '../viewer.mjs';
import {timelineEvidenceManifest,TIMELINE_FRACTIONS,TIMELINE_VIEW_KEYS} from '../timeline-review.mjs';
function rig(){
 const root=new THREE.Group(),mesh=new THREE.SkinnedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());
 mesh.name='body';
 const hip=new THREE.Bone();hip.name='Hip';
 const neck=new THREE.Bone();neck.name='Neck';
 mesh.add(hip);hip.add(neck);
 root.add(mesh);
 mesh.updateMatrixWorld(true);
 mesh.bind(new THREE.Skeleton([hip,neck]));
 return {root,mesh,hip,neck};
}
function action(){
 return new THREE.AnimationClip('Punch',1,[
  new THREE.VectorKeyframeTrack('Hip.position',[0,1],[0,0,0, .1,0,0]),
  new THREE.QuaternionKeyframeTrack('Neck.quaternion',[0,1],[0,0,0,1, 0,0,.05,.998749])
 ]);
}
test('real exact-bind source and target rig accepts ONLY animation clip tracks, not extra character mesh',()=>{
 const target=rig(),source=rig(),clip=action(),oldNames=target.root.children.length;
 const report=inspectExternalAction(target.root,source.root,[clip]);
 assert.equal(report.version,ACTION_BRIDGE_VERSION);
 assert.equal(report.status,'MATCHED_EXACT_BIND_RIG_SOURCE_REVIEW_ONLY');
 assert.equal(report.boneCount,2);assert.equal(report.clipCount,1);
 assert.equal(report.totalTracks,2);
 assert.equal(report.originalCharacterMeshModified,false);
 assert.equal(target.root.children.length,oldNames);
 const copied=copyCompatibleClips([clip]);
 assert.equal(copied.length,1);assert.notStrictEqual(copied[0],clip);
 assert.match(copied[0].name,/外部動作/);
 const ctl=new AnimationController(target.root,[]);
 ctl.clips.push(...copied);ctl.select(0);ctl.update(.5);
 assert.ok(target.hip.position.x>.03,'animated actual target bone with identical rig');
 assert.equal(target.root.children.length,oldNames,'never imported external source mesh to scene');
 assert.equal(report.realCombatChoreographyVerified,false);
});
test('different hierarchy, bind inverse or skeleton bone names rejects instead of guessed retargeting',()=>{
 const target=rig(),source=rig(),clip=action();
 source.neck.name='Head';assert.throws(
  ()=>inspectExternalAction(target.root,source.root,[clip]),/ACTION_RIG_BONE_NAME_MISMATCH/);
 source.neck.name='Neck';
 source.mesh.skeleton.boneInverses[1].elements[12]=.08;
 assert.throws(()=>inspectExternalAction(target.root,source.root,[clip]),/ACTION_RIG_BIND_POSE_MISMATCH/);
 source.mesh.skeleton.boneInverses[1].elements[12]=0;
 source.neck.removeFromParent();source.mesh.add(source.neck);
 assert.throws(()=>inspectExternalAction(target.root,source.root,[clip]),/ACTION_RIG_HIERARCHY_MISMATCH/);
});
test('non bone root-motion or unrelated morph clips must not animate the model',()=>{
 const target=rig(),source=rig();
 const wrong=new THREE.AnimationClip('Fake punch',1,[
  new THREE.VectorKeyframeTrack('body.position',[0,1],[0,0,0,1,0,0])
 ]);
 assert.throws(()=>inspectExternalAction(target.root,source.root,[wrong]),/ACTION_TRACK_BONE_NOT_BOUND/);
 const morph=new THREE.AnimationClip('morph',1,[
  new THREE.NumberKeyframeTrack('Hip.morphTargetInfluences[0]',[0,1],[0,1])
 ]);
 assert.throws(()=>inspectExternalAction(target.root,source.root,[morph]),/ACTION_TRACK_TARGET_UNSUPPORTED/);
 const missing=new THREE.AnimationClip('no source tracks',1,[]);
 assert.throws(()=>inspectExternalAction(target.root,source.root,[missing]),/ACTION_EMPTY_CLIP/);
 assert.throws(()=>inspectExternalAction(target.root,source.root,[]),/ACTION_SOURCE_NO_CLIPS/);
});
test('duplicate bones, malformed action tracks or clips fail closed without wiping target',()=>{
 const a=rig(),b=rig(),track=action();
 const duplicate=new THREE.Bone();duplicate.name='Neck';b.mesh.add(duplicate);
 assert.throws(()=>inspectExternalAction(a.root,b.root,[track]),/ACTION_RIG_DUPLICATE_NODE_NAME/);
 b.mesh.remove(duplicate);
 const badTrack=new THREE.AnimationClip('bad',1,[new THREE.VectorKeyframeTrack('Unknown.position',[0,1],[0,0,0,1,0,0])]);
 assert.throws(()=>inspectExternalAction(a.root,b.root,[badTrack]),/ACTION_TRACK_BONE_NOT_BOUND/);
 assert.throws(()=>inspectExternalAction(a.root,b.root,[track],{bindTolerance:1}),/ACTION_BIND_TOLERANCE_INVALID/);
 assert.equal(a.root.children.length,1);
});
test('external action SHA is distinct from heroine mesh SHA in 16-frame evidence and never auto-approves a fight',()=>{
 const clip='Punch',sourceSha='a'.repeat(64),actionSha='b'.repeat(64);
 const samples=TIMELINE_FRACTIONS.map(fraction=>({fraction,clipName:clip,timeSeconds:fraction,
  image:new Blob(['data'],{type:'image/png'}),
  views:TIMELINE_VIEW_KEYS.map(key=>({key})),
  audit:{checkedTriangles:4,coincidentTrianglePairs:0,degenerateTriangles:0,
   skinningVertexIssues:0,hairNeckBoxOverlap:null,anatomyTagsAvailable:false,incomplete:false}}));
 const r=timelineEvidenceManifest({sourceSha256:sourceSha,actionSha256:actionSha,clipName:clip,samples});
 assert.equal(r.sourceSha256,sourceSha);assert.equal(r.actionSha256,actionSha);
 assert.equal(r.externalActionGLBUsed,true);
 assert.equal(r.approvedFightChoreographyPresent,false);
 assert.equal(r.visualHumanReviewPassed,false);
 assert.throws(()=>timelineEvidenceManifest({sourceSha256:sourceSha,actionSha256:'bad',clipName:clip,samples}),/TIMELINE_ACTION_SHA_INVALID/);
});
test('3.1 real action source GLB upload, selected clip callback and provenance UI are actually wired',()=>{
 const root=new URL('../',import.meta.url),get=x=>fs.readFileSync(new URL(x,root),'utf8');
 const html=get('index.html'),app=get('app.mjs'),viewer=get('viewer.mjs');
 assert.ok(html.includes('id="action-glb"'));assert.ok(html.includes('id="action-import-status"'));
 assert.ok(app.includes("view.importExternalAction(buffer)"));
 assert.ok(app.includes("const buffer=await f.arrayBuffer(),actionSha=await sha256Bytes(buffer)"));
 assert.ok(app.includes('actionShaByClipIndex.set('));
 assert.ok(app.includes('actionSha256:actionShaByClipIndex.get(view.animation.index)||sourceSha'));
 assert.ok(app.includes("importedActionHashes.clear();actionShaByClipIndex.clear()"));
 assert.ok(viewer.includes('inspectExternalAction(currentModel,file.scene,file.animations)'));
 assert.ok(viewer.includes('const copied=copyCompatibleClips(file.animations)'));
 assert.ok(viewer.includes('this.release(file.scene)'));
 assert.ok(!viewer.includes('this.scene.add(file.scene); // external action'));
});
