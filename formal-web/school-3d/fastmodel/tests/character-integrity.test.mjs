import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectHeadNeckGeometry,inspectHairNeckOcclusion,assessAnimationDeviceEvidence} from '../web/character-integrity.mjs';
import fs from 'node:fs';
const fixture=()=>{
 const data=[
  {pos:new Float32Array([0,0,0,1,0,0,0,1,0]),tri:new Uint32Array([0,1,2])},
  {pos:new Float32Array([0,.02,0,1,.02,0,0,-1,0]),tri:new Uint32Array([0,1,2])},
  {pos:new Float32Array([-.1,.3,.1,.9,.3,-.1,.2,-.5,.3]),tri:new Uint32Array([0,1,2])}
 ];
 const accessors=[];
 const meshes=data.map((_,i)=>{
   const v=accessors.length;accessors.push({type:'VEC3',count:3});
   const t=accessors.length;accessors.push({type:'SCALAR',count:3});
   return {primitives:[{attributes:{POSITION:v},indices:t}]};
 });
 return {file:{g:{nodes:[
  {mesh:0,extras:{aigAnatomyPart:'head'}},
  {mesh:1,extras:{aigAnatomyPart:'neck'}},
  {mesh:2,extras:{aigAnatomyPart:'hair'}}
 ],meshes,accessors}},
 reader:(_file,id)=>data[Math.floor(id/2)][id%2?'tri':'pos']};
};
test('actual head and neck mesh boundaries yield measured raw-local closest distance, never fake weld',()=>{
 const {file,reader}=fixture();
 const r=inspectHeadNeckGeometry(file,reader);
 assert.equal(r.measured,true);
 assert.equal(r.status,'MEASURED_NOT_WELD_VERIFIED');
 assert.ok(r.approxClosestBoundaryDistance>0.019&&r.approxClosestBoundaryDistance<0.021);
 assert.ok(r.headBoundaryVertices>=3);
 assert.equal(r.actualSeamFixed,false);
 assert.equal(r.watertightVerified,false);
 assert.equal(r.animatedPoseVerified,false);
 assert.equal(r.units,'GLB_LOCAL_UNITS');
});
test('hair vs neck estimate is a risk flag, NOT proof of occlusion or collision',()=>{
 const {file,reader}=fixture();
 const r=inspectHairNeckOcclusion(file,reader);
 assert.equal(r.status,'PROJECTION_RISK_ONLY');
 assert.equal(r.measured,true);
 assert.ok(r.frontProxy>0);
 assert.equal(r.actualOcclusionApproved,false);
 assert.equal(r.hairCollisionVerified,false);
 assert.equal(r.animatedPoseVerified,false);
 assert.ok(r.requiresViews.includes('moving-animation'));
});
test('missing tag, unsupported node transform and invalid numeric data fail closed',()=>{
 const {file,reader}=fixture();
 delete file.g.nodes[1].extras;
 const a=inspectHeadNeckGeometry(file,reader);
 assert.equal(a.status,'UNVERIFIED');assert.equal(a.measured,false);
 file.g.nodes[1].extras={aigAnatomyPart:'neck'};
 file.g.nodes[0].translation=[0,0,0];
 const b=inspectHeadNeckGeometry(file,reader);
 assert.equal(b.reason,'NODE_TRANSFORM_UNSUPPORTED');
 delete file.g.nodes[0].translation;
 assert.throws(()=>inspectHeadNeckGeometry(file,()=>new Float32Array([NaN,0,0,1,0,0,0,1,0])),/NONFINITE_GEOMETRY/);
});
test('Windows + Android real-device Gate remains blocked without exact evidence',()=>{
 const none=assessAnimationDeviceEvidence();
 assert.equal(none.status,'BLOCKED_MISSING_REAL_DEVICE_EVIDENCE');
 assert.deepEqual(none.missing,['Windows','Android']);
 const pretend={platform:'Windows',source:'BROWSER_RAF_FRAME_DELTA_NOT_GPU_TIME',measuredFps:120,
  p95FrameMs:8,sampleCount:200,actualWidth:3840,actualHeight:2160,thermalC:70,nativeProcessVerified:true};
 assert.equal(assessAnimationDeviceEvidence([pretend]).status,'BLOCKED_MISSING_REAL_DEVICE_EVIDENCE');
 const real={...pretend,source:'REAL_DEVICE_CAPTURE',measuredFps:59,p95FrameMs:17};
 let x=assessAnimationDeviceEvidence([real,{...real,platform:'Android'}]);
 assert.equal(x.status,'BELOW_TARGET');assert.equal(x.accepted[0].pass1080p60,false);
 const target={...real,measuredFps:61,p95FrameMs:16,actualWidth:1920,actualHeight:1080};
 x=assessAnimationDeviceEvidence([target,{...target,platform:'Android'}]);
 assert.equal(x.status,'EVIDENCE_SUFFICIENT_REVIEW_REQUIRED');
 assert.equal(x.ciPassDoesNotCount,true);
});
test('actual HTML main callbacks and standalone packer expose diagnostics without false PASS',()=>{
 const root=new URL('../',import.meta.url);
 const read=p=>fs.readFileSync(new URL(p,root),'utf8');
 const h=read('web/index.html'),m=read('web/main.mjs'),p=read('tools/build_standalone.py');
 for(const id of ['seam-check','hair-check','seam-status','hair-status','native-gate-status'])assert.ok(h.includes('id="'+id+'"'),id);
 for(const token of ['inspectHeadNeckGeometry(f,readAccessor)','inspectHairNeckOcclusion(f,readAccessor)',
   'assessAnimationDeviceEvidence([])','actualSeamFixed:false'])assert.ok((m+read('web/character-integrity.mjs')).includes(token),token);
 assert.ok(p.includes('character-integrity.mjs'));
 assert.ok(p.includes("'\\n'+integrity+'\\n'"));
});
