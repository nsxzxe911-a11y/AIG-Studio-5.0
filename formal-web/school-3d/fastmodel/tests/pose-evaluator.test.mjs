import test from 'node:test';
import assert from 'node:assert/strict';
import {createPoseEvaluator} from '../web/pose-evaluator.mjs';
const close=(a,b,eps=1e-5)=>assert.ok(Math.abs(a-b)<eps,String(a)+' != '+String(b));
test('hierarchical two-bone LINEAR quaternion pose has correct world positions and reuses same arrays',()=>{
 const nodes=[{translation:[1,2,3],children:[1]},{translation:[0,1,0]}];
 const s=Math.SQRT1_2;
 const e=createPoseEvaluator(nodes,[{node:0,times:new Float32Array([0,1]),values:new Float32Array([0,0,0,1,0,0,s,s])}]);
 assert.equal(e.topologyCached,true);
 const a=e.evaluate(.5),root=a[0],child=a[1];const sameChild=a[1];
 close(root[12],1);close(root[13],2);close(root[14],3);
 close(child[12],1-Math.sin(Math.PI/4),2e-5);
 close(child[13],2+Math.cos(Math.PI/4),2e-5);
 const b=e.evaluate(.7);
 assert.strictEqual(b[1],sameChild);
 close(b[0][12],1);
 const rest=e.evaluate(0,false);
 close(rest[1][12],1);close(rest[1][13],3);
 const again=e.evaluate(.5,true);
 close(again[1][12],1-Math.sin(Math.PI/4),2e-5);
});
test('quaternion shortest arc, repeat time, and fallback for unanimated nodes',()=>{
 const nodes=[{children:[1]},{translation:[0,2,0]}];
 const e=createPoseEvaluator(nodes,[{node:0,times:[0,2],values:[0,0,0,1,0,0,0,-1]}]);
 const a=e.evaluate(1);close(a[0][0],1);close(a[1][13],2);
 const b=e.evaluate(3);close(b[0][0],1);close(b[1][13],2);
 const c=e.evaluate(2);close(c[0][0],1);
});
test('invalid/cyclic/multi-parent GLB pose is rejected before scene teardown',()=>{
 assert.throws(()=>createPoseEvaluator([{children:[1]},{children:[0]}]),/POSE_CYCLE/);
 assert.throws(()=>createPoseEvaluator([{children:[2]},{children:[2]},{}]),/POSE_PARENT_INVALID/);
 assert.throws(()=>createPoseEvaluator([{children:[3]}]),/POSE_PARENT_INVALID/);
 assert.throws(()=>createPoseEvaluator([{}],[{node:0,times:[1,0],values:Array(8).fill(0)}]),/POSE_TRACK_TIME/);
 assert.throws(()=>createPoseEvaluator([{}],[{node:0,times:[0,1],values:[0,0,0,1]}]),/POSE_TRACK_KEYS/);
 assert.throws(()=>createPoseEvaluator([{}],[{node:0,times:[0,1],values:[0,0,0,1,0,NaN,0,1]}]),/POSE_TRACK_QUAT/);
});
test('renderer actually connects pose engine, cached GPU joint buffers, and preserves existing policies',async()=>{
 const fs=await import('node:fs');
 const r=fs.readFileSync(new URL('../web/renderer.mjs',import.meta.url),'utf8');
 const p=fs.readFileSync(new URL('../tools/build_standalone.py',import.meta.url),'utf8');
 assert.match(r,/createPoseEvaluator\(nextFile.g.nodes,nextTracks\)/);
 assert.match(r,/this\.poseEvaluator\.evaluate/);
 assert.match(r,/this\.boneMatrixScratch/);
 assert.match(r,/auditAnatomyMetadata\(nextFile\)/);
 assert.match(p,/pose-evaluator\.mjs/);
 assert.match(p,/anatomy-guard\.mjs/);
 assert.match(r,/assertRasterOnly\(GRAPHICS_POLICY\)/);
});
