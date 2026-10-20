import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createImplicitScene,AigImplicitRenderer,AIG41_FRAGMENT} from '../aig-sdf-4-1.mjs';
import {appearanceFor,auditHairNeck,Aig44TimingEvidence,AIG44_SCHEMA} from '../aig-qa-4-4.mjs';
const scaffold={schema:'AIG_FASTMODEL_NATIVE_4_0_GEOMETRIC_VOLUME_DRAFT',
 sourceSHA256:'b'.repeat(64),proportions:{ratiosByImageHeight:Array.from({length:11},(_,i)=>({
 atHeight:i/10,widthRatio:[.18,.22,.28,.32,.30,.28,.33,.42,.30,.13,.10][i],
 centerRatio:.5}))}};
const scene=()=>createImplicitScene(scaffold);
test('source-bound SDF neck center remains contiguous and hair collision proxy changes with clearance',()=>{
 const s=scene();
 const a=auditHairNeck(s,{hairBackOffset:0});
 const b=auditHairNeck(s,{hairBackOffset:.08});
 assert.equal(a.schema,AIG44_SCHEMA);
 assert.equal(a.sourceSHA256,scaffold.sourceSHA256);
 assert.equal(a.technicalNeckSdfContinuous,true);
 assert.equal(a.proxyClearanceWithinSafetyMargin,true);
 assert.ok(a.minHairNeckSignedDistance<b.minHairNeckSignedDistance);
 assert.equal(b.proxyClearanceWithinSafetyMargin,false);
 for(const x of [a,b]){
  assert.equal(x.actualStrandTriangleCollisionVerified,false);
  assert.equal(x.realSkinSeamVerified,false);
  assert.equal(x.formalReleaseAllowed,false);
  assert.equal(x.noCreditsSpent,true);
  assert.equal(x.samples,12);
 }
 assert.throws(()=>auditHairNeck(s,{hairBackOffset:.2}),/SOURCE_OR_OFFSETS_INVALID/);
 assert.throws(()=>auditHairNeck({},{}),/SOURCE_OR_OFFSETS_INVALID/);
});
test('material palettes have isolated RGB channels and cannot claim real UV textures',()=>{
 const a=appearanceFor('natural',.05),b=appearanceFor('warm',.05);
 assert.notDeepEqual(a.dressColor,b.dressColor);
 assert.notDeepEqual(a.hairColor,b.hairColor);
 assert.equal(a.materialIsPreviewColorOnly,true);
 assert.equal(a.verifiedTextureUV,false);
 assert.equal(a.realHairStrandsVerified,false);
 assert.equal(a.creditsSpent,0);
 assert.equal(a.releaseAllowed,false);
 a.skinColor[0]=.01;
 assert.notEqual(appearanceFor('natural').skinColor[0],.01);
 assert.throws(()=>appearanceFor('unknown',0),/APPEARANCE_INVALID/);
 assert.throws(()=>appearanceFor('night',NaN),/APPEARANCE_INVALID/);
 assert.throws(()=>appearanceFor('night',.5),/APPEARANCE_INVALID/);
});
test('bounded GPU and JS timing evidence rejects invalid/disjoint samples, never implies FPS',()=>{
 const stats=new Aig44TimingEvidence({capacity:16});
 for(let i=0;i<20;i++)stats.record({jsSubmitMs:i+1,
  gpuSample:{source:'EXT_disjoint_timer_query_webgl2',disjoint:false,gpuMs:i/2}});
 stats.record({jsSubmitMs:Infinity,gpuSample:{source:'EXT_disjoint_timer_query_webgl2',disjoint:true,gpuMs:2}});
 stats.record({jsSubmitMs:-2,gpuSample:{source:'OTHER_TIMER',disjoint:false,gpuMs:9}});
 const report=stats.summary();
 assert.equal(report.jsSubmission.count,16);
 assert.equal(report.gpuQueries.count,16);
 assert.equal(report.invalidGpuSamples,2);
 assert.equal(report.jsSubmission.p50Ms,12);
 assert.equal(report.jsSubmission.p95Ms,20);
 assert.equal(report.gpuQueries.p50Ms,5.5);
 assert.equal(report.presentationFpsVerified,false);
 assert.equal(report.androidHardwareTested,false);
 assert.equal(report.windowsHardwareTested,false);
 assert.equal(report.releaseAllowed,false);
 stats.reset();
 assert.equal(stats.summary().gpuTimingReal,false);
 assert.equal(stats.summary().jsSubmission.count,0);
 assert.throws(()=>new Aig44TimingEvidence({capacity:0}),/CAPACITY_INVALID/);
});
test('4.4 shader material and hair offsets update existing GPU buffers without remeshing',()=>{
 const calls=[];const gl={
  VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,
  ARRAY_BUFFER:5,STATIC_DRAW:6,FLOAT:7,TRIANGLE_STRIP:8,
  createShader:()=>({}),shaderSource:()=>{},compileShader:()=>{},
  getShaderParameter:()=>true,getShaderInfoLog:()=>'',deleteShader:()=>{},
  createProgram:()=>({}),attachShader:()=>{},linkProgram:()=>{},
  getProgramParameter:()=>true,getProgramInfoLog:()=>'',createBuffer:()=>{calls.push('buffer');return {};},
  bindBuffer:()=>{},bufferData:()=>calls.push('upload'),getAttribLocation:()=>0,
  getUniformLocation:(p,name)=>name,viewport:()=>{},useProgram:()=>{},
  enableVertexAttribArray:()=>{},vertexAttribPointer:()=>{},
  uniform2f:()=>{},uniform1f:(name,value)=>calls.push({name,value}),
  uniform4f:()=>{},uniform3fv:(name,data)=>calls.push({name,rgb:[...data]}),
  drawArrays:()=>calls.push('draw'),deleteBuffer:()=>{},deleteProgram:()=>{}
 };
 const canvas={clientWidth:640,clientHeight:480,width:0,height:0,
  getContext:name=>name==='webgl2'?gl:null};
 const renderer=new AigImplicitRenderer(canvas,scene(),{pixelScale:.5,maxSteps:36});
 renderer.setAppearance(appearanceFor('natural',.01));renderer.draw(0);
 renderer.setAppearance(appearanceFor('warm',.08));renderer.draw(Math.PI/3);
 const offsets=calls.filter(x=>typeof x==='object'&&x.name==='uHairBackOffset').map(x=>x.value);
 assert.deepEqual(offsets,[.01,.08]);
 assert.equal(calls.filter(x=>x==='buffer').length,1);
 assert.equal(calls.filter(x=>x==='upload').length,1);
 assert.equal(calls.filter(x=>x==='draw').length,2);
 const dress=calls.filter(x=>typeof x==='object'&&x.name==='uDressColor');
 assert.equal(dress.length,2);
 assert.notDeepEqual(dress[0].rgb,dress[1].rgb);
 assert.match(AIG41_FRAGMENT,/uHairBackOffset/);
 assert.match(AIG41_FRAGMENT,/uDressColor/);
 assert.throws(()=>renderer.setAppearance({...appearanceFor('natural'),hairBackOffset:.9}),
  /APPEARANCE_INVALID/);
 renderer.dispose();
});
test('RGB UI QA buttons have genuine callback, safe evidence, no API inference',()=>{
 const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
 const app=read('../app.mjs'),html=read('../index.html'),backend=read('../server.py');
 for(const id of ['aig44-hair','aig44-hair-value','aig44-palette','aig44-check',
  'aig44-evidence','aig44-status'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(app,/aig44LastAudit=auditHairNeck/);
 assert.match(app,/aig41Renderer\.setAppearance\(aig44Appearance\)/);
 assert.match(app,/aig44Timing\?\.record/);
 assert.match(app,/AIG-4\.4-Hair-Neck-GPU-DRAFT-NOT-APPROVED\.json/);
 assert.match(app,/aig44Timing=null/);
 assert.match(backend,/allow_paid_3d=False/);
 assert.match(backend,/ZERO_CREDITS_REMOTE_3D_BLOCKED/);
 assert.doesNotMatch(read('../aig-qa-4-4.mjs'),/fetch\(|MeshyClient|StableFast3D|subprocess\.run/);
});
