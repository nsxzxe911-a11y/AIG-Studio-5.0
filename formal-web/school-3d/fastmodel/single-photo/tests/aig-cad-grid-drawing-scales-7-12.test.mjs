import test from 'node:test';
import assert from 'node:assert/strict';
import {
 AIG712_CAD_DRAWING_SCALE_SCHEMA,AIG712_CAD_DRAWING_SCALES,
 createAIG712CADGrid,createAIG712CADDrawingScale,
 projectAIG712CADCoordinatesForDrawing,recoverAIG712CADWorldFromDrawing
} from '../aig-cad-grid-scale-7-12.mjs';

const grid=createAIG712CADGrid({
 cellMm:35,physicalReferenceReviewed:true,matchedSourceReviewed:true
});
test('7.12 supports exact drawing ratios 1:2, 1:4 and 1:10 without changing source geometry',()=>{
 const cases=[[2,17.5,35,17.5,30],[4,8.75,17.5,8.75,15],[10,3.5,7,3.5,6]];
 assert.deepEqual(AIG712_CAD_DRAWING_SCALES.map(s=>s.denominator),[1,2,4,10]);
 for(const [denom,cell,X,Y,Z] of cases){
  const scale=createAIG712CADDrawingScale(grid,{denominator:denom});
  assert.equal(scale.schema,AIG712_CAD_DRAWING_SCALE_SCHEMA);
  assert.equal(scale.physicalCellMm,35);
  assert.equal(scale.drawingCellMm,cell);
  assert.equal(scale.label,'1:'+denom);
  const p=projectAIG712CADCoordinatesForDrawing(scale,{xMm:70,yMm:35,zMm:60});
  assert.equal(p.plotMm.x,X);assert.equal(p.plotMm.y,Y);assert.equal(p.plotMm.z,Z);
  assert.deepEqual(p.actualMm,{x:70,y:35,z:60});
  assert.equal(p.dimensionLabelMm.x,70,'CAD true dimensions must remain original');
  const back=recoverAIG712CADWorldFromDrawing(scale,p.plotMm);
  assert.ok(Math.abs(back.xMm-70)<1e-9);
  assert.ok(Math.abs(back.yMm-35)<1e-9);
  assert.ok(Math.abs(back.zMm-60)<1e-9);
  assert.equal(p.worldMmUnmodified,true);
 }
 assert.equal(grid.cellMm,35,'never mutate physical reference grid');
});
test('7.12 CAD plot origin and negative XYZ support scale without changing physical point',()=>{
 const c=createAIG712CADGrid({cellMm:10,originXmm:100,originYmm:200,
  physicalReferenceReviewed:true,matchedSourceReviewed:true});
 const s=createAIG712CADDrawingScale(c,{denominator:4});
 const r=projectAIG712CADCoordinatesForDrawing(s,{xMm:80,yMm:220,zMm:-12});
 assert.deepEqual(r.plotMm,{x:-5,y:5,z:-3});
 assert.deepEqual(recoverAIG712CADWorldFromDrawing(s,r.plotMm),{
  xMm:80,yMm:220,zMm:-12,usedDrawingOnly:true
 });
});
test('7.12 1:2 1:4 1:10 must never be inferred from virtual or unapproved grid',()=>{
 assert.throws(()=>createAIG712CADDrawingScale({schema:grid.schema,cellMm:35},
  {denominator:2}),/PHYSICAL_GRID/);
 for(const d of [0,3,5,8,20,2.5,NaN,Infinity])
  assert.throws(()=>createAIG712CADDrawingScale(grid,{denominator:d}),/PHYSICAL_GRID/);
 assert.throws(()=>projectAIG712CADCoordinatesForDrawing({},{
  xMm:70,yMm:35,zMm:60}),/DRAWING_POINT_INVALID/);
 assert.throws(()=>recoverAIG712CADWorldFromDrawing({},{
  x:35,y:7,z:3}),/SCALED_COORDINATE_INVALID/);
});
test('7.12 measured 0.001 mm coordinate remains roundtrip-stable in small scales',()=>{
 const p={xMm:123.456,yMm:-0.001,zMm:0.003};
 for(const denominator of [2,4,10]){
  const s=createAIG712CADDrawingScale(grid,{denominator});
  const d=projectAIG712CADCoordinatesForDrawing(s,p);
  const restored=recoverAIG712CADWorldFromDrawing(s,d.plotMm);
  for(const axis of ['x','y','z'])
   assert.ok(Math.abs(restored[axis+'Mm']-p[axis+'Mm'])<1e-10);
  assert.equal(s.precisionMm,.001);
 }
});
