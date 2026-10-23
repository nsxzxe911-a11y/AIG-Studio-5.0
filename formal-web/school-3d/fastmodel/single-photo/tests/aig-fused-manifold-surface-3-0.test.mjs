import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIG29ContinuousSurface}
 from '../aig-continuous-surface-scan-2-9.mjs';
import {buildAIG30FusedSDF,auditAIG30ClosedManifold,
 inspectAIG30FusedFiveAxisSurface,AIG30_SCHEMA}
 from '../aig-fused-manifold-surface-3-0.mjs';
function fullFigure(){
 const width=256,height=384,pixels=new Uint8ClampedArray(width*height*4),
 labels=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let cls=0;
  if(y>9&&y<85&&Math.abs(x-128)<26)cls=2;
  else if(y>=85&&y<112&&Math.abs(x-128)<12)cls=4;
  else if(y>=112&&y<239&&Math.abs(x-128)<(y<190?53:37))cls=14;
  else if(y>=239&&y<376&&Math.abs(x-108)<15)cls=10;
  else if(y>=239&&y<376&&Math.abs(x-148)<15)cls=11;
  else if(y>=126&&y<225&&Math.abs(x-61)<11)cls=6;
  else if(y>=126&&y<225&&Math.abs(x-195)<11)cls=7;
  const i=y*width+x,k=i*4;
  labels[i]=cls;
  const col=cls===2||cls===4?[199,148,120]:cls===14?[39,72,125]:
   cls===10||cls===11?[54,76,104]:cls?[180,131,101]:[16,23,31];
  pixels.set([...col,255],k);
 }
 return {width,height,pixels,labels,
  sourceSha256:'sha256:'+'a'.repeat(64)};
}
function sourceShell(){
 return buildAIG29ContinuousSurface({...fullFigure(),
  radialSegments:32,sliceStep:6});
}
test('3.0 actually merges separate head/neck/torso/arms/legs into ONE indexed manifold shell',()=>{
 const original=fullFigure(),copy=original.pixels.slice();
 const separate=sourceShell();
 assert.ok(separate.surfaces.length>=5);
 const fused=buildAIG30FusedSDF(separate,{resolution:84,blend:.075});
 assert.equal(fused.schema,AIG30_SCHEMA);
 assert.equal(fused.surfaces.length,1);
 assert.equal(fused.fusedOnePieceMesh.trueOnePieceIndexedGeometry,true);
 assert.equal(fused.manifoldAudit.closedManifold,true);
 assert.equal(fused.manifoldAudit.singleConnectedComponent,true);
 assert.equal(fused.manifoldAudit.boundaryOrNonManifoldEdgeCount,0);
 assert.equal(fused.manifoldAudit.degenerateTriangleCount,0);
 assert.equal(fused.manifoldAudit.nonFiniteCoordinateCount,0);
 assert.equal(fused.manifoldAudit.positiveOutwardVolume,true);
 assert.ok(fused.manifoldAudit.signedEnclosedVolume>.01);
 assert.ok(fused.continuousTriangleCount>12000);
 assert.ok(fused.continuousVertexCount>5000);
 assert.equal(fused.fusedOnePieceMesh.vertexSourceLabelIds.length,
  fused.continuousVertexCount);
 assert.equal(fused.fusedOnePieceMesh.normals.length,
  fused.fusedOnePieceMesh.positions.length);
 assert.equal(fused.measured3DScale,false);
 assert.equal(fused.measuredDepth,false);
 assert.equal(fused.originalGLBPreserved,true);
 assert.equal(fused.releaseAllowed,false);
 assert.deepEqual(original.pixels,copy,'never modify original RGBA source');
 const scan=inspectAIG30FusedFiveAxisSurface(fused,{
  perSurfaceSamples:96,standoff:.08});
 assert.equal(scan.actualOnePieceManifoldInspected,true);
 assert.ok(scan.sampleCount>=90);
 assert.ok(scan.uniqueSurfaceNormalOrientationBins>10);
 assert.equal(scan.rawSensorEchoCount,0);
 assert.equal(scan.physicalCNC5AxisCommandsEmitted,0);
});
test('3.0 rejects disconnected bogus meshes rather than claiming print-ready',()=>{
 const original=sourceShell();
 assert.throws(()=>buildAIG30FusedSDF(original,{resolution:12}),
  /BOUNDED_SDF_REQUIRED/);
 assert.throws(()=>buildAIG30FusedSDF(original,{resolution:180}),
  /BOUNDED_SDF_REQUIRED/);
 assert.throws(()=>buildAIG30FusedSDF(original,{blend:0}),
  /BOUNDED_SDF_REQUIRED/);
 assert.throws(()=>buildAIG30FusedSDF({...original,surfaces:[]}),
  /BOUNDED_SDF_REQUIRED/);
 const fake={
  positions:new Float32Array([0,0,0,1,0,0,0,1,0]),
  indices:new Uint32Array([0,1,2])
 };
 const audit=auditAIG30ClosedManifold(fake.positions,fake.indices);
 assert.equal(audit.closedManifold,false);
 assert.equal(audit.boundaryOrNonManifoldEdgeCount,3);
 assert.equal(audit.printablePhysicalScaleCertified,false);
});
