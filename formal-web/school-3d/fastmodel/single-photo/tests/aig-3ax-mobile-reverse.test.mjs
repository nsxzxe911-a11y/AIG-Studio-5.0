import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateAIG3AXMobileMap,sourceRegionToNormalized,
 mapPointerIntoSourceViewport,buildAIG3AXCADPlaneCalibration,
 projectAIG3AXPixelToCADXY} from '../../../../3ax-mobile-reverse-core.mjs';
const manifest=JSON.parse(await readFile(new URL('../../../../3ax-mobile-reverse-map.json',import.meta.url),'utf8'));
test('approved mobile 3AX source maps 47 independent ROI regions with exact stable Button/Command IDs',()=>{
 const p=validateAIG3AXMobileMap(manifest);
 assert.equal(p.ok,true);assert.equal(p.regionCount,47);
 assert.equal(p.machineWriteAllowed,false);assert.equal(p.real3DMachineCertified,false);
 assert.equal(manifest.viewport.sourcePixels[2],568);
 assert.deepEqual(sourceRegionToNormalized([84,202,568,820]).map(n=>+n.toFixed(6)),
  [+(84/864).toFixed(6),+(202/1536).toFixed(6),+(568/864).toFixed(6),+(820/1536).toFixed(6)]);
 for(const r of manifest.regions)if(!r.enabled)
  assert.ok(r.commandId.startsWith('BLOCK.'));
});
test('forged source or unlocked JOG and stale normalized position block the map',()=>{
 const clone=()=>JSON.parse(JSON.stringify(manifest));
 const wrong=clone();wrong.source.sha256='0'.repeat(64);
 assert.throws(()=>validateAIG3AXMobileMap(wrong),/UNAPPROVED/);
 const jogging=clone();jogging.regions.find(r=>r.id==='JOG').enabled=true;
 assert.throws(()=>validateAIG3AXMobileMap(jogging),/DANGEROUS/);
 const mismatch=clone();mismatch.regions.find(r=>r.id==='CAM_TOP').normalized[0]=.95;
 assert.throws(()=>validateAIG3AXMobileMap(mismatch),/NORMALIZED/);
 const emergency=clone();emergency.regions.find(r=>r.id==='EMERGENCY_STOP').commandId='MACHINE.EMERGENCY.STOP';
 assert.throws(()=>validateAIG3AXMobileMap(emergency),/MACHINE_STOP/);
});
test('display pointer uses only relative authority viewport pixels, not fake physical XYZ',()=>{
 const p=mapPointerIntoSourceViewport({
  clientX:50+284,clientY:20+410,left:50,top:20,width:568,height:820},manifest);
 assert.deepEqual(p.imagePixel,[368,612]);
 assert.deepEqual(p.normalizedViewport,[.5,.5]);
 assert.equal(p.physicalXyzVerified,false);assert.equal(p.derivedMachineCoords,null);
 assert.equal(mapPointerIntoSourceViewport({clientX:0,clientY:0,left:50,top:20,width:568,height:820},manifest),null);
});
test('CAD plane reverse calibration accepts 4 truly known coplanar corners, never silently creates Z',()=>{
 const anchor=[
  {imagePixel:[100,250],cadMm:[-50,20]},
  {imagePixel:[600,250],cadMm:[50,20]},
  {imagePixel:[600,800],cadMm:[50,130]},
  {imagePixel:[100,800],cadMm:[-50,130]}
 ];
 const cal=buildAIG3AXCADPlaneCalibration(anchor);
 assert.equal(cal.schema,'AIG_3AX_CALIBRATED_COPLANAR_XY_V1');
 assert.equal(cal.useForCNCPostOrToolpath,false);
 assert.equal(cal.depthAndZNeverInferred,true);
 const point=projectAIG3AXPixelToCADXY(cal,[350,525]);
 assert.ok(Math.abs(point.xMm)<.00001);
 assert.ok(Math.abs(point.yMm-75)<.00001);
 assert.equal(point.zMm,null);assert.equal(point.noCNCWrite,true);
});
test('unknown CAD origin, fewer than four anchors, collinear screen geometry fail closed',()=>{
 assert.throws(()=>buildAIG3AXCADPlaneCalibration([]),/MINIMUM_4/);
 const c=[
  {imagePixel:[120,320],cadMm:[0,0]},
  {imagePixel:[220,420],cadMm:[10,10]},
  {imagePixel:[320,520],cadMm:[20,20]},
  {imagePixel:[420,620],cadMm:[30,30]}
 ];
 assert.throws(()=>buildAIG3AXCADPlaneCalibration(c),/DEGENERATE/);
 assert.throws(()=>projectAIG3AXPixelToCADXY(null,[250,300]),/NOT_CALIBRATED/);
});
