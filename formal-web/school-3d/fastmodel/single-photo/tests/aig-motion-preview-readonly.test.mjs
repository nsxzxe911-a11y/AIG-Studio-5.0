import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {AIG_MOTION_SCHEMA,parseAigReadOnlyMotionPreview,
 sampleAigReadOnlyMotionFrame,drawAigReadOnlyMotionFrame}
 from '../aig-motion-preview-readonly.mjs';

const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/aig-readonly-motion-3ax.json',import.meta.url),'utf8'));
const digest=data=>createHash('sha256').update(data,'utf8').digest('hex');
const withData=(p,data)=>({...p,data,sha256:digest(data)});
test('CNC/animation exchange validates exact cross-Kotlin golden hash and true timed tool motion',async()=>{
 assert.equal(fixture.sha256,'371e8f78e51a412294300e7f832fd0c315041ee69d8d66723fde8541d276f99e');
 assert.equal(digest(fixture.data),fixture.sha256);
 const p=await parseAigReadOnlyMotionPreview(fixture);
 assert.equal(p.schema,AIG_MOTION_SCHEMA);
 assert.equal(p.axisMode,'3AX');
 assert.equal(p.frames.length,4);
 assert.equal(p.durationSeconds,1.4);
 assert.equal(p.previewOnly,true);
 assert.equal(p.machineExecutionAllowed,false);
 assert.equal(p.actualHumanAnimation,false);
 assert.equal(p.actualCncKinematicsVerified,false);
 assert.equal(p.materialRemovalVerified,false);
 assert.deepEqual(p.frames.map(x=>x.rapid),[true,false,false,true]);
 const mid=sampleAigReadOnlyMotionFrame(p,.8);
 assert.ok(Math.abs(mid.x-10)<1e-8);
 assert.equal(mid.y,0);assert.equal(mid.z,-2);assert.equal(mid.rapid,false);
 const last=sampleAigReadOnlyMotionFrame(p,999);
 assert.equal(last.z,8);assert.equal(last.rapid,true);
});
test('modified source, fake machine permission, injected C axis, all-G0 and bad time never pass',async()=>{
 await assert.rejects(parseAigReadOnlyMotionPreview({
  ...fixture,data:fixture.data.replace('20.000','21.000')
 }),/TAMPERED_SHA256/);
 await assert.rejects(parseAigReadOnlyMotionPreview({
  ...fixture,machineExecutionAllowed:true
 }),/NOT_SAFE_READONLY_SCHEMA/);
 await assert.rejects(parseAigReadOnlyMotionPreview({
  ...fixture,humanRiggedAnimation:true
 }),/NOT_SAFE_READONLY_SCHEMA/);
 const rows=fixture.data.split('\n');
 let c=rows[2].split(',');c[6]='45.000';rows[2]=c.join(',');
 const sixAxis=withData({...fixture,axisMode:'6AX'},rows.join('\n'));
 await assert.rejects(parseAigReadOnlyMotionPreview({...sixAxis,axisMode:'5AX'}),/UNSAFE_FRAME/);
 await assert.rejects(parseAigReadOnlyMotionPreview({...sixAxis,axisMode:'3AX'}),/UNSAFE_FRAME/);
 const preview6=await parseAigReadOnlyMotionPreview(sixAxis);
 assert.equal(preview6.frames[1].c,45);
 assert.equal(sampleAigReadOnlyMotionFrame(preview6,.2).c,0,
  'unverified C-axis rotation must not be interpolated into fake continuous kinematics');
 assert.equal(sampleAigReadOnlyMotionFrame(preview6,.4).c,45,
  'measured posture is visible only at its actual sampled waypoint');
 assert.equal(preview6.machineExecutionAllowed,false,'C-axis preview is not verified machining');
 const allRapid=withData(fixture,fixture.data.replace(/,0(?=\n|$)/g,',1'));
 await assert.rejects(parseAigReadOnlyMotionPreview(allRapid),/EMPTY_MOVEMENT_OR_CUT/);
 const duplicateTimes=fixture.data.split('\n');
 duplicateTimes[2]=duplicateTimes[2].replace('0.4000','0.0000');
 await assert.rejects(parseAigReadOnlyMotionPreview(
  withData(fixture,duplicateTimes.join('\n'))),/UNSAFE_FRAME_OR_TIME/);
 const wrongCount={...fixture,pointCount:3};
 await assert.rejects(parseAigReadOnlyMotionPreview(wrongCount),/HEADER_OR_COUNT/);
 await assert.rejects(parseAigReadOnlyMotionPreview('{invalid json'));
});
test('actual Canvas topographic projection draws visible G0/G1 segments and animated tool',async()=>{
 const preview=await parseAigReadOnlyMotionPreview(fixture);
 const calls=[];
 const ctx={canvas:{width:640,height:360},
  fillRect:()=>calls.push('clear'),
  beginPath:()=>calls.push('path'),
  moveTo:()=>calls.push('move'),lineTo:()=>calls.push('line'),
  stroke:()=>calls.push('stroke'),arc:()=>calls.push('tool'),
  fill:()=>calls.push('fill'),fillText:()=>calls.push('text')};
 const result=drawAigReadOnlyMotionFrame(ctx,preview,.8);
 assert.equal(result.actualToolCenterAnimated,true);
 assert.equal(result.machineExecutionAllowed,false);
 assert.equal(result.materialRemovalVerified,false);
 assert.ok(calls.filter(c=>c==='stroke').length>=3);
 assert.ok(calls.includes('tool')&&calls.includes('text'));
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const shell=fs.readFileSync(new URL('../aig-unified-shell-6-9.mjs',import.meta.url),'utf8');
 assert.ok(shell.includes('initAigReadOnlyMotionControls(doc,panels.model)'));
 assert.ok(html.includes('#aig-cnc-motion-canvas'));
 assert.ok(!shell.includes('cloneNode('));
});
