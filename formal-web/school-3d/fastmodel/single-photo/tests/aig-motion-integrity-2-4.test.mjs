import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectAIG24Volume,compareAIG24RelativeGeometry}
 from '../aig-motion-integrity-2-4.mjs';
const point=(x,y,z)=>[x,y,z];
const tetra=[point(0,0,0),point(2,0,0),
 point(0,2,0),point(0,0,1.5),point(1,1,1)];
test('2.4 nonplanarity rejects a tilted photo card while accepting true volume',()=>{
 const flat=[point(0,0,0),point(2,0,1),point(0,2,0),
  point(2,2,1),point(1,1,.5)];
 assert.equal(inspectAIG24Volume(flat).hasNonPlanarGeometry,false);
 assert.equal(inspectAIG24Volume(tetra).hasNonPlanarGeometry,true);
});
test('2.4 a whole image moving or rotating never counts as articulating',()=>{
 const move=tetra.map(p=>p.map((x,k)=>x+[5,-2,8][k]));
 const rotate=tetra.map(([x,y,z])=>[-y,x,z]);
 assert.equal(compareAIG24RelativeGeometry(tetra,move).changedPairs,0);
 assert.equal(compareAIG24RelativeGeometry(tetra,rotate).changedPairs,0);
 assert.equal(compareAIG24RelativeGeometry(tetra,rotate).internalVertexDeformation,false);
});
test('2.4 independent internal relative 3D vertex deformation is observable',()=>{
 const changed=tetra.map(p=>p.slice());
 changed[3][0]+=.45;changed[3][2]+=.5;
 const report=compareAIG24RelativeGeometry(tetra,changed);
 assert.ok(report.changedPairs>=2);
 assert.equal(report.internalVertexDeformation,true);
});
test('2.4 malformed vertex data fails closed, not image motion',()=>{
 assert.throws(()=>inspectAIG24Volume([[0,0,0]]),/AIG24_MOTION_/);
 assert.throws(()=>compareAIG24RelativeGeometry(tetra,[[0,0,0]]),
  /AIG24_MOTION_/);
});
