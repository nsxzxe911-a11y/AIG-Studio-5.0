import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Scene,Bone,Skeleton,SkinnedMesh,BufferGeometry,Float32BufferAttribute,Uint16BufferAttribute,MeshBasicMaterial,AnimationClip,QuaternionKeyframeTrack} from 'three';
import {aig50BoneRole,AIG50_REQUIRED_BONES,auditAIG50FullBody,AIG50_SCHEMA} from '../aig-fullbody-5-0.mjs';
const sha='a'.repeat(64);
function model(){
 const names=AIG50_REQUIRED_BONES;
 const all=Object.fromEntries(names.map(k=>{const b=new Bone();b.name=k;return [k,b];}));
 const attach=(parent,children)=>children.forEach(n=>all[parent].add(all[n]));
 attach('hips',['spine','leftUpperLeg','rightUpperLeg']);
 attach('spine',['chest']);
 attach('chest',['neck','leftUpperArm','rightUpperArm']);
 attach('neck',['head']);
 attach('leftUpperArm',['leftForeArm']);
 attach('rightUpperArm',['rightForeArm']);
 attach('leftUpperLeg',['leftLowerLeg']);
 attach('rightUpperLeg',['rightLowerLeg']);
 attach('leftLowerLeg',['leftFoot']);
 attach('rightLowerLeg',['rightFoot']);
 const bones=names.map(n=>all[n]),scene=new Scene();
 scene.add(all.hips);
 const coords=[],joints=[],weights=[],indices=[],width=8,rows=names.length;
 for(let r=0;r<rows;r++)for(let c=0;c<width;c++){
  coords.push((c-width/2)*.05,r*.09,((c%2)*.04));
  joints.push(r,0,0,0);weights.push(1,0,0,0);
 }
 for(let r=0;r<rows-1;r++)for(let c=0;c<width-1;c++){
  const a=r*width+c,b=a+1,d=a+width,e=d+1;
  indices.push(a,d,b,b,d,e);
 }
 const geo=new BufferGeometry();
 geo.setAttribute('position',new Float32BufferAttribute(coords,3));
 geo.setAttribute('skinIndex',new Uint16BufferAttribute(joints,4));
 geo.setAttribute('skinWeight',new Float32BufferAttribute(weights,4));
 geo.setIndex(indices);
 const mesh=new SkinnedMesh(geo,new MeshBasicMaterial());
 mesh.name='Synthetic QA fullbody connected skin (NOT HUMAN)';
 scene.add(mesh);scene.updateMatrixWorld(true);
 mesh.bind(new Skeleton(bones));scene.updateMatrixWorld(true);
 const clip=new AnimationClip('AIG50_SYNTHETIC_NECK_TEST',1,[
  new QuaternionKeyframeTrack('neck.quaternion',[0,.5,1],
   [0,0,0,1,0,Math.sin(.18),0,Math.cos(.18),0,0,0,1])
 ]);
 return {scene,animations:[clip],mesh,bones};
}
test('AIG 5.0 role aliases are explicit, never infer invisible anatomy from unlabeled objects',()=>{
 assert.equal(aig50BoneRole('mixamorig:LeftForeArm'),'leftForeArm');
 assert.equal(aig50BoneRole('LeftUpLeg'),'leftUpperLeg');
 assert.equal(aig50BoneRole('rightShin'),'rightLowerLeg');
 assert.equal(aig50BoneRole('Neck'),'neck');
 assert.equal(aig50BoneRole('NoKnownPart'),null);
});
test('actual synthetic Three SkinnedMesh full-body hierarchy is validated by indexed skin vertex components',async()=>{
 const gltf=model();
 const report=await auditAIG50FullBody(gltf,{sourceSHA256:sha});
 assert.equal(report.schema,AIG50_SCHEMA);
 assert.equal(report.sourceSHA256,sha);
 assert.equal(report.skinnedMeshCount,1);
 assert.equal(report.boneCount,15);
 assert.deepEqual(report.missingBones,[]);
 assert.deepEqual(report.rolesWithoutActualVertexWeights,[]);
 assert.equal(report.shoulderNeckHeadActualSharedIndexedComponent,true);
 assert.equal(report.skeletonTopologyGate,true);
 assert.equal(report.poseReports.length,1);
 assert.equal(report.poseReports[0].animationDeformsGeometry,true);
 assert.ok(report.poseReports[0].movedVertices>0);
 assert.equal(report.outcome,'STRUCTURAL_QA_PASS_ONLY');
 assert.equal(report.realHeroineSourceFaceMatched,false);
 assert.equal(report.hairVsBodyFullTriangleCollisionVerified,false);
 assert.equal(report.formalCharacterApproved,false);
 assert.equal(report.releaseAllowed,false);
});
test('not-full-body, hierarchy mismatch, source mismatch and corrupt weights BLOCK without fabricating a human',async()=>{
 assert.rejects(auditAIG50FullBody(model(),{sourceSHA256:'wrong'}),/EXACT_SOURCE_SHA_REQUIRED/);
 const a=model();a.scene.remove(a.mesh);
 const noMesh=await auditAIG50FullBody(a,{sourceSHA256:sha});
 assert.equal(noMesh.outcome,'BLOCKED');
 const b=model();b.mesh.skeleton.bones[4].name='unknownBoneName';
 const missing=await auditAIG50FullBody(b,{sourceSHA256:sha});
 assert.equal(missing.outcome,'BLOCKED');
 assert.ok(missing.missingBones.includes('head'));
 const c=model();c.mesh.geometry.getAttribute('skinWeight').setX(0,.1);
 await assert.rejects(auditAIG50FullBody(c,{sourceSHA256:sha}),/INVALID_BONE_WEIGHT_OR_INDEX/);
 const d=model();d.scene.add(d.bones[4]);
 const badHierarchy=await auditAIG50FullBody(d,{sourceSHA256:sha});
 assert.equal(badHierarchy.outcome,'BLOCKED');
 assert.ok(badHierarchy.hierarchyProblems.some(x=>x.startsWith('head-')));
});
test('AIG 5.0 workbench accepts real local GLB, uses strict GLTFLoader and export, preserves 4.9 and AV',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 for(const id of ['aig50-input','aig50-run','aig50-report','aig50-status']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.ok(app.includes('parseRiggedGLB(bytes)'));
 assert.ok(app.includes('auditAIG50FullBody(parsed,'));
 assert.ok(app.includes('sourceSHA256:sha'));
 assert.ok(app.includes("$('aig50-run').addEventListener('click'"));
 assert.ok(app.includes("$('aig49-audit').addEventListener('click'"));
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('generateVoiceBatch('));
 assert.ok(!html.includes('id="aig50-fake-body"'));
});
