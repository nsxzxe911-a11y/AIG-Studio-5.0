import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIG45_POSES,recognizePose,auditMarks} from '../aig-calibration-4-5.mjs';
import {normalizePoseSet,meshTopology} from '../aig-head-neck-4-6.mjs';
import {buildAIG47Draft,exportAIG47GLB} from '../aig-welded-4-7.mjs';
import {AIG48_SCHEMA,buildAIG48Rig,exportAIG48GLB,createAIG48PoseSampler,auditAIG48Pose} from '../aig-skin-4-8.mjs';

const marks={headTop:{x:.5,y:.07},chin:{x:.5,y:.17},
 leftShoulder:{x:.39,y:.25},rightShoulder:{x:.61,y:.25},
 leftHip:{x:.42,y:.53},rightHip:{x:.58,y:.53},
 leftAnkle:{x:.44,y:.90},rightAnkle:{x:.56,y:.90}};
function fixture(){
 const a=AIG45_POSES[0],c=auditMarks(recognizePose({sha256:a.sha256,width:a.width,height:a.height}),marks);
 return buildAIG47Draft(normalizePoseSet([c]));
}
function diff(p,q){return p.reduce((sum,x,i)=>sum+Math.abs(x-q[i]),0);}

test('4.8 preserves source SHA, true shared-index 4.7 geometry and original non-animated technical GLB',()=>{
 const d=fixture(),before=exportAIG47GLB(d).bytes.slice();
 const rig=buildAIG48Rig(d),glb=exportAIG48GLB(rig);
 assert.equal(rig.schema,AIG48_SCHEMA);
 assert.deepEqual(rig.sourceSHA256,[AIG45_POSES[0].sha256]);
 assert.equal(meshTopology(d.parts[0]).closed,true);
 assert.deepEqual(exportAIG47GLB(d).bytes,before);
 assert.equal(glb.json.skins.length,1);
 assert.equal(glb.json.animations.length,4);
 assert.equal(glb.json.nodes.length,6);
 assert.equal(glb.json.skins[0].joints.length,4);
 assert.equal(glb.json.extras.partialRigOnly,true);
 assert.equal(glb.json.extras.validForFormalCharacterRelease,false);
 assert.equal(rig.releaseAllowed,false);
 assert.equal(glb.releaseAllowed,false);
 for(const [k,data] of rig.skinData.entries()){
  const vert=d.parts[k].positions.length/3;
  assert.equal(data.joints.length,vert*4);
  assert.equal(data.weights.length,vert*4);
  for(let i=0;i<vert;i++)assert.ok(Math.abs(data.weights.slice(4*i,4*i+4).reduce((a,b)=>a+b,0)-1)<1e-5);
  const attrs=glb.json.meshes[k].primitives[0].attributes;
  assert.ok(Number.isInteger(attrs.JOINTS_0));
  assert.ok(Number.isInteger(attrs.WEIGHTS_0));
 }
 assert.throws(()=>buildAIG48Rig({schema:'fake'}),/SOURCE_47_BLOCKED/);
 assert.throws(()=>exportAIG48GLB({...rig,sourceSHA256:['changed']}),/SOURCE_STALE/);
});

test('real GLTFLoader reloads 4.8 GLB as 2 SkinnedMeshes with 4 genuine rotation animation clips',async()=>{
 const glb=exportAIG48GLB(buildAIG48Rig(fixture()));
 const sampler=await createAIG48PoseSampler(glb);
 assert.deepEqual(sampler.clipNames,[
  'AIG48_HEAD_YAW','AIG48_HEAD_NOD','AIG48_PONYTAIL_SWING','AIG48_COMBINED'
 ]);
 const rest=sampler.sample('AIG48_HEAD_YAW',0);
 const yaw=sampler.sample('AIG48_HEAD_YAW',.5);
 const nod=sampler.sample('AIG48_HEAD_NOD',.5);
 const pony=sampler.sample('AIG48_PONYTAIL_SWING',.5);
 const combined=sampler.sample('AIG48_COMBINED',.5);
 assert.equal(rest.realSkinnedMeshSamples,true);
 assert.ok(diff(rest.parts[0].positions,yaw.parts[0].positions)>.01,'head visibly rotates from the skinned geometry');
 assert.ok(diff(rest.parts[0].positions,nod.parts[0].positions)>.01,'head nod deforms real skinned geometry');
 assert.ok(diff(rest.parts[1].positions,pony.parts[1].positions)>.01,'tail swings via skinned bone');
 assert.ok(diff(rest.parts[1].positions,combined.parts[1].positions)>.01,'combined clip has real tail motion');
 assert.ok(diff(rest.parts[0].positions,pony.parts[0].positions)<1e-4,'tail-only clip does not move head');
 assert.throws(()=>sampler.sample('MISSING',.5),/CLIP_UNKNOWN/);
 assert.throws(()=>sampler.sample('AIG48_HEAD_NOD',3),/TIME_BOUNDS/);
});

test('pose-by-pose triangle deformation audit consumes real loaded skinned vertex positions, not a fake PASS',async()=>{
 const d=fixture(),rig=buildAIG48Rig(d),glb=exportAIG48GLB(rig),sampler=await createAIG48PoseSampler(glb);
 for(const clip of sampler.clipNames){
  for(const t of [0,.5,1,1.5,2]){
   const sample=sampler.sample(clip,t),report=auditAIG48Pose(rig,sample);
   assert.equal(report.parts.length,2);
   assert.deepEqual(report.sourceSHA256,rig.sourceSHA256);
   assert.equal(report.headNeckSharedIndexSurface,true);
   assert.equal(report.noVisibleTearingCertified,false);
   assert.equal(report.exactHairTriangleIntersectionsTested,false);
   assert.equal(report.device60FPSVerified,false);
   assert.equal(report.releaseAllowed,false);
   assert.ok(report.parts.every(p=>Number.isFinite(p.minAreaRatio)&&Number.isFinite(p.maxAreaRatio)));
  }
 }
 assert.throws(()=>auditAIG48Pose(rig,{parts:[]}),/POSE_NOT_SAMPLED/);
});

test('4.8 technical legacy rig tests coexist; LIVE UI invokes the verified 4.8 motion path and retains earlier AV',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 for(const id of ['aig48-build','aig48-download','aig48-evidence','aig48-status'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(app.includes('buildAIG48Draft(source)'),'real 4.8 GLB skin source');
 assert.ok(app.includes('exportAIG48GLB(aig48Draft)'),'real 4.8 GLB download action');
 assert.ok(app.includes('auditAIG48Poses(rig)'),'GLB skin pose sampler callback');
 assert.ok(app.includes('function aig48Reset('),'SHA stale result invalidation');
 assert.ok(app.includes('aig47Draft||aig46Draft'),'existing prior geometry preview');
 assert.ok(app.includes('new MovieWorkspace('),'recording workspace preserved');
 assert.ok(app.includes('exportAIG47GLB(aig47Draft)'),'4.7 preserved');
 assert.ok(app.includes('generateVoiceBatch('),'original voice pipeline preserved');
});
