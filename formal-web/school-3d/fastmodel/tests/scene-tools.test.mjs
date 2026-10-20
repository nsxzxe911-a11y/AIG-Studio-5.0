import test from 'node:test';
import assert from 'node:assert/strict';
import {SCAN_KINDS,LIGHT_PRESETS,scanGeometry,limitAngle,supportPoints,projectGuide,paintScaffold} from '../web/scene-tools.mjs';
test('scene categories are labels, not fabricated semantic recognition',()=>{
 assert.deepEqual(SCAN_KINDS,['person','animal','plant','tree','water','sky','environment']);
 assert.equal(LIGHT_PRESETS.sky.background.length,3);
});
test('bounded real accessor sampling reports geometry and no semantic AI',()=>{
 const file={g:{accessors:[{type:'VEC3',count:4},{count:6}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],materials:[{}],animations:[]}};
 const read=()=>new Float32Array([0,0,0,1,1,1,2,-1,3,3,2,1]);
 const r=scanGeometry(file,read,{kind:'tree',maxSamples:2});
 assert.equal(r.source,'LOADED_GLB_VERTEX_SAMPLING');assert.equal(r.semanticsRecognized,false);
 assert.equal(r.samples,2);assert.equal(r.sampleStride,2);assert.equal(r.triangles,2);
 assert.deepEqual(r.sampledExtent,[2,1,3]);assert.equal(r.approximateBounds,true);
 assert.throws(()=>scanGeometry(file,read,{kind:'fake'}));
 assert.throws(()=>scanGeometry(file,read,{maxSamples:100001}));
});
test('invalid vertices cannot promote false measurements',()=>{
 const f={g:{accessors:[{type:'VEC3',count:1}],meshes:[{primitives:[{attributes:{POSITION:0}}]}]}};
 assert.throws(()=>scanGeometry(f,()=>new Float32Array([NaN,0,0])));
});
test('virtual dashed scaffold clamps angles without touching mesh',()=>{
 assert.equal(limitAngle(120,45),45);assert.equal(limitAngle(-95,60),-60);
 assert.throws(()=>limitAngle(Infinity,60));assert.throws(()=>limitAngle(0,300));
 const b={min:[-1,0,-1],max:[1,2,1]};
 const original=JSON.stringify(b),p=supportPoints(b,{yaw:120,pitch:-90,limit:45});
 assert.equal(p.yaw,45);assert.equal(p.pitch,-45);assert.equal(p.referenceOnly,true);
 assert.equal(JSON.stringify(b),original);
 const xy=projectGuide(p.anchor,{center:[0,1,0],angle:0,zoom:1,zoomFactor:1,width:1920,height:1080},600,340);
 assert.equal(xy.length,2);assert.ok(xy.every(Number.isFinite));
 assert.equal(paintScaffold(null,null),null);
});
