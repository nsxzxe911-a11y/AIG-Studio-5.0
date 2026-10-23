import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIG29ContinuousSurface,inspectAIG29FiveAxisSurface}
 from '../aig-continuous-surface-scan-2-9.mjs';
const sourceSHA='sha256:'+'a'.repeat(64);
function visibleFigure(){
 const width=256,height=384,labels=new Uint8Array(width*height),
 pixels=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,k=i*4;
  let label=0,colour=[14,18,26];
  const xc=128;
  const head=y>10&&y<88&&Math.abs(x-xc)<27;
  const neck=y>=88&&y<114&&Math.abs(x-xc)<12;
  const torso=y>=114&&y<235&&Math.abs(x-xc)<(y<185?55:40);
  const leftLeg=y>=235&&y<378&&Math.abs(x-107)<16;
  const rightLeg=y>=235&&y<378&&Math.abs(x-149)<16;
  const arm=(y>=125&&y<235)&&
   (Math.abs(x-58)<10||Math.abs(x-198)<10);
  if(head){label=2;colour=[191,140,115]}
  else if(neck){label=4;colour=[185,132,109]}
  else if(torso){label=14;colour=[42,69,138]}
  else if(leftLeg||rightLeg){label=11;colour=[68,87,110]}
  else if(arm){label=6;colour=[182,133,102]}
  labels[i]=label;pixels.set([...colour,255],k);
 }
 return {width,height,labels,pixels,sourceSha256:sourceSHA};
}
test('2.9 full-body visible mask -> continuous actual curved indexed 3D triangles, not cubes',()=>{
 const input=visibleFigure(),before=input.pixels.slice(),
  report=buildAIG29ContinuousSurface(input);
 assert.equal(report.sourceSha256,sourceSHA);
 assert.ok(report.surfaces.length>=4);
 assert.ok(report.continuousTriangleCount>10000);
 assert.equal(report.noFakeBillboardsOrVoxelCubes,true);
 assert.equal(report.measured3DScale,false);
 assert.equal(report.measuredDepth,false);
 assert.equal(report.releaseAllowed,false);
 for(const s of report.surfaces){
  assert.equal(s.positions.length,s.vertexCount*3);
  assert.equal(s.normals.length,s.positions.length);
  assert.equal(s.indices.length,s.triangleCount*3);
  assert.ok(s.radialSegments>=32);
  assert.ok(s.ringCount>=6);
  assert.equal(s.degeneracyCount,0);
  assert.ok(s.indices.every(v=>v<s.vertexCount));
  assert.ok(s.normals.every(Number.isFinite));
  const ring=4*Math.floor(s.radialSegments/4);
  const k=ring*3;
  assert.ok(Math.hypot(s.normals[k],s.normals[k+1],s.normals[k+2])>.90);
  assert.equal(s.depthProvenance,
   'PRIOR_INFERRED_ELLIPTIC_SECTION_NOT_PHOTOGRAPHIC_DEPTH');
 }
 assert.deepEqual(input.pixels,before,'source photo must NEVER be mutated');
});
test('2.9 CNC five-axis-inspired virtual normal probe reads actual XYZ and outward normals',()=>{
 const report=buildAIG29ContinuousSurface(visibleFigure(),{
  radialSegments:48,sliceStep:4
 });
 const scan=inspectAIG29FiveAxisSurface(report,{perSurfaceSamples:80,standoff:.08});
 assert.ok(scan.sampleCount>=80);
 assert.ok(scan.uniqueSurfaceNormalOrientationBins>12);
 assert.equal(scan.actualHardwareScanPerformed,false);
 assert.equal(scan.physicalCNCMachineCommandEmitted,false);
 assert.equal(scan.calibratedRealWorldDepthAvailable,false);
 assert.equal(scan.sourceSha256,sourceSHA);
 for(const point of scan.probeSamples){
  assert.ok(Number.isFinite(point.axisAdeg));
  assert.ok(Number.isFinite(point.axisBdeg));
  const d=point.probeXYZ.map((x,i)=>x-point.onGeneratedSurfaceXYZ[i]);
  assert.ok(Math.abs(Math.hypot(...d)-point.standoff)<1e-5);
 }
});
test('2.9 unknown/fake class, insufficient actual silhouette, guessed real-world mm rejected',()=>{
 const input=visibleFigure(),broken=new Uint8Array(input.labels);
 broken.fill(0);
 assert.throws(()=>buildAIG29ContinuousSurface({...input,labels:broken}),
  /SOURCE_HAS_NO_USABLE_HUMAN_OR_ENVIRONMENT_CLASSES/);
 assert.throws(()=>buildAIG29ContinuousSurface({...input,
  sourceSha256:'sha256:guessed'}),/SOURCE_BOUND_PIXELS_AND_RESOLUTION_REQUIRED/);
 assert.throws(()=>buildAIG29ContinuousSurface({...input,
  bodyHeightUnits:1800}),/SOURCE_BOUND_PIXELS_AND_RESOLUTION_REQUIRED/);
 assert.throws(()=>buildAIG29ContinuousSurface({...input,
  depthRatio:5}),/SOURCE_BOUND_PIXELS_AND_RESOLUTION_REQUIRED/);
 assert.throws(()=>buildAIG29ContinuousSurface({...input,
  radialSegments:9}),/SOURCE_BOUND_PIXELS_AND_RESOLUTION_REQUIRED/);
});
