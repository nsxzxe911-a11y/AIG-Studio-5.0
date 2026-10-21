import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Scene,Bone,Skeleton,SkinnedMesh,Mesh,BufferGeometry,Float32BufferAttribute,
 Uint16BufferAttribute,MeshBasicMaterial,AnimationClip,QuaternionKeyframeTrack} from 'three';
import {AIG50_REQUIRED_BONES,auditAIG50FullBody} from '../aig-fullbody-5-0.mjs';
import {AIG51_SCHEMA,AIG51_REQUIRED_SEAMS,auditAIG51PosedSeamsAndHair,
 intersectMeshTriangles} from '../aig-seam-contact-5-1.mjs';
const sha='b'.repeat(64);
function make({hairNear=false,withHair=true}={}){
 const names=AIG50_REQUIRED_BONES,by={};
 for(const name of names){const b=new Bone();b.name=name;by[name]=b;}
 const children=(p,...kids)=>kids.forEach(k=>by[p].add(by[k]));
 children('hips','spine','leftUpperLeg','rightUpperLeg');
 children('spine','chest');children('chest','neck','leftUpperArm','rightUpperArm');
 children('neck','head');children('leftUpperArm','leftForeArm');
 children('rightUpperArm','rightForeArm');
 children('leftUpperLeg','leftLowerLeg');children('rightUpperLeg','rightLowerLeg');
 children('leftLowerLeg','leftFoot');children('rightLowerLeg','rightFoot');
 const scene=new Scene();scene.add(by.hips);
 const rows=names.length,width=8,p=[],weights=[],joints=[],ids=[];
 for(let r=0;r<rows;r++)for(let c=0;c<width;c++){
  p.push((c-width/2)*.06,r*.15,((c%2)*.05));
  weights.push(1,0,0,0);joints.push(r,0,0,0);
 }
 for(let r=0;r<rows-1;r++)for(let c=0;c<width-1;c++){
  const a=r*width+c,b=a+1,d=a+width,e=d+1;ids.push(a,d,b,b,d,e);
 }
 // Actual chest/shoulder indexed bridges, not mere identically located vertices.
 for(const shoulder of ['leftUpperArm','rightUpperArm']){
  const r=names.indexOf(shoulder),chest=names.indexOf('chest');
  ids.push(chest*width,r*width,chest*width+1);
 }
 const geo=new BufferGeometry();
 geo.setAttribute('position',new Float32BufferAttribute(p,3));
 geo.setAttribute('skinIndex',new Uint16BufferAttribute(joints,4));
 geo.setAttribute('skinWeight',new Float32BufferAttribute(weights,4));
 geo.setIndex(ids);
 const body=new SkinnedMesh(geo,new MeshBasicMaterial());body.name='connected_REAL_SKINNED_HUMANOID_SYNTHETIC';
 scene.add(body);scene.updateMatrixWorld(true);body.bind(new Skeleton(names.map(n=>by[n])));
 const hairPos=hairNear?
  // Triangle matches one real body face at current rest pose.
  [p[0],p[1],p[2],p[width*3],p[width*3+1],p[width*3+2],p[3],p[4],p[5]]:
  [8,0,0,8,.2,0,8,.1,.2];
 const hg=new BufferGeometry();
 hg.setAttribute('position',new Float32BufferAttribute(hairPos,3));hg.setIndex([0,1,2]);
 const hair=new Mesh(hg,new MeshBasicMaterial());hair.name='GirlPonytail';
 if(withHair)scene.add(hair);
 scene.updateMatrixWorld(true);
 const motion=new AnimationClip('real_synthetic_neck_yaw',1,[
  new QuaternionKeyframeTrack('neck.quaternion',[0,.5,1],
   [0,0,0,1,0,Math.sin(.1),0,Math.cos(.1),0,0,0,1])]);
 return {scene,animations:[motion],body,hair};
}
test('5.1 true synthetic GLB skin samples 5 poses, four actual sewn seam regions and hair far from body',async()=>{
 const gltf=make(),v50=await auditAIG50FullBody(gltf,{sourceSHA256:sha});
 assert.equal(v50.outcome,'STRUCTURAL_QA_PASS_ONLY');
 const result=await auditAIG51PosedSeamsAndHair(gltf,{sourceSHA256:sha,aig50Report:v50});
 assert.equal(result.schema,AIG51_SCHEMA);
 assert.equal(result.outcome,'POSED_GEOMETRY_QA_PASS_ONLY');
 assert.equal(result.posesChecked,5);
 assert.equal(result.headHairMeshes.length,1);
 assert.equal(result.confirmedBodyHairContacts,0);
 assert.equal(result.sampledShoulderNeckSeamsInRange,true);
 for(const seam of AIG51_REQUIRED_SEAMS)assert.ok(result.seamFaceCounts[seam]>0,seam);
 assert.equal(result.releaseAllowed,false);
 assert.equal(result.actualAndroidWindowsFpsVerified,false);
 assert.equal(result.continuousTimeCollisionFreeProven,false);
});
test('5.1 true triangle SAT blocks colliding hair and never claims safe physical strand motion',async()=>{
 const gltf=make({hairNear:true}),v50=await auditAIG50FullBody(gltf,{sourceSHA256:sha});
 const r=await auditAIG51PosedSeamsAndHair(gltf,{sourceSHA256:sha,aig50Report:v50});
 assert.equal(r.outcome,'BLOCKED');
 assert.ok(r.confirmedBodyHairContacts>0);
});
test('5.1 no hidden source bypass: verified SHA, real identified hair, finite budgets required',async()=>{
 const g=make(),v50=await auditAIG50FullBody(g,{sourceSHA256:sha});
 await assert.rejects(auditAIG51PosedSeamsAndHair(g,{sourceSHA256:'a'.repeat(64),aig50Report:v50}),/VERIFIED_5_0_SOURCE/);
 await assert.rejects(auditAIG51PosedSeamsAndHair(g,{sourceSHA256:sha,aig50Report:{...v50,outcome:'BLOCKED'}}),/VERIFIED_5_0_SOURCE/);
 const noHair=make({withHair:false});
 await assert.rejects(auditAIG51PosedSeamsAndHair(noHair,{sourceSHA256:sha,aig50Report:v50}),/HAIR_MESH_NOT_IDENTIFIED/);
 await assert.rejects(auditAIG51PosedSeamsAndHair(g,{sourceSHA256:sha,aig50Report:v50,sampleFractions:[0,.1,.2,1]}),/SAMPLING_OR_BUDGET/);
});
test('5.1 broad phase refuses budget overflow instead of false negative',()=>{
 const t=verts=>({vertices:verts,box:{
  min:[0,1,2].map(k=>Math.min(...verts.map(p=>p[k]))),
  max:[0,1,2].map(k=>Math.max(...verts.map(p=>p[k])))},face:0});
 const a=t([[0,0,0],[1,0,0],[0,1,0]]);
 assert.throws(()=>intersectMeshTriangles([a],[a],{maxPairTests:0}),/BROADPHASE_BUDGET/);
 const hit=intersectMeshTriangles([a],[a]);
 assert.ok(hit.confirmedSurfaceContactPairs>0);
});
test('5.1 RGB has unique real button IDs, isolated GLB source callback, original voice/AV untouched',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 for(const id of ['aig51-run','aig51-report','aig51-status']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.ok(app.includes('auditAIG51PosedSeamsAndHair(source,'));
 assert.ok(app.includes('aig50Report:aig50Report'));
 assert.ok(app.includes("$('aig51-run').addEventListener('click'"));
 assert.ok(app.includes("$('aig51-report').addEventListener('click'"));
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('generateVoiceBatch('));
 assert.ok(app.includes("$('aig49-audit').addEventListener('click'"));
 assert.ok(app.includes('parseRiggedGLB(bytes)'));
});
