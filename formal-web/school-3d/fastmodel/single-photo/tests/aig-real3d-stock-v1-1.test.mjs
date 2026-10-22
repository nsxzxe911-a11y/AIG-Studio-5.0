import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIGVoxelStock,createAIGCylindricalCutter,
 applyAIGFeedCut,auditAIGVoxelStock,meshAIGVoxelStock}
 from '../../../../shared-3d/aig-real3d-stock-removal-1-1.mjs';
import {createAIG3DScene,addAIG3DNode,auditAIG3DScene}
 from '../../../../shared-3d/aig-real3d-core.mjs';

const cfg={originMm:[-6,-4,0],sizeMm:[12,8,6],voxelMm:.5};
const cutter=createAIGCylindricalCutter({diameterMm:2,fluteLengthMm:4});
const source='VERIFIED_UNIT_TEST_FIXTURE';
const feed={from:[-5,0,2],to:[5,0,2],motion:'G1',source};

test('v1.1 G1 changes actual 3D occupied voxels and numerical removed mm3',()=>{
 const stock=createAIGVoxelStock(cfg);
 const report=applyAIGFeedCut(stock,cutter,feed);
 assert.equal(stock.totalCells,4608);
 assert.equal(report.removedCells,736);
 assert.equal(report.removedMm3,92);
 assert.equal(stock.materialRemovedMm3,92);
 assert.equal(report.true3DOccupancyChanged,true);
 const audit=auditAIGVoxelStock(stock);
 assert.equal(audit.originalMm3,576);
 assert.equal(audit.remainingMm3,484);
 assert.equal(audit.remainingMm3+audit.removedMm3,audit.originalMm3);
 assert.equal(audit.continuousPhysicalSurfacePrecisionVerified,false);
 assert.equal(audit.actualMachineAndPostSafetyVerified,false);
});
test('v1.1 G0 rapid never removes stock and does not advance revision',()=>{
 const stock=createAIGVoxelStock(cfg);
 const rapid=applyAIGFeedCut(stock,cutter,{...feed,motion:'G0'});
 assert.equal(rapid.removedCells,0);
 assert.equal(stock.removedCells,0);
 assert.equal(stock.revision,0);
 assert.equal(rapid.safeRapidDoesNotRemoveStock,true);
});
test('v1.1 replayed same feed removes zero additional voxels',()=>{
 const stock=createAIGVoxelStock(cfg);
 applyAIGFeedCut(stock,cutter,feed);
 const second=applyAIGFeedCut(stock,cutter,feed);
 assert.equal(second.removedMm3,0);
 assert.equal(second.alreadyVacant,736);
 assert.equal(stock.materialRemovedMm3,92);
 assert.equal(stock.revision,2);
});
test('v1.1 free-air feeds do not remove volume',()=>{
 const stock=createAIGVoxelStock(cfg);
 const result=applyAIGFeedCut(stock,cutter,{
  from:[-3,0,12],to:[3,0,12],motion:'G1',source
 });
 assert.equal(result.removedCells,0);
 assert.equal(auditAIGVoxelStock(stock).remainingMm3,576);
});
test('v1.1 diagonal feed uses true continuous swept XY radius, no fake G0 volume',()=>{
 const stock=createAIGVoxelStock(cfg);
 const result=applyAIGFeedCut(stock,cutter,{
  from:[-5,-3,0],to:[5,3,0],motion:'G1',source
 });
 assert.ok(result.removedCells>100);
 const mesh=meshAIGVoxelStock(stock);
 assert.ok(mesh.quadCount>0);
 assert.equal(mesh.triangleCount,mesh.quadCount*2);
 assert.equal(mesh.mesh.positions.length,mesh.mesh.normals.length);
});
test('v1.1 regenerated exposed XYZ topology actually changes after removal',()=>{
 const stock=createAIGVoxelStock(cfg);
 const before=meshAIGVoxelStock(stock),beforeReport=auditAIGVoxelStock(stock);
 applyAIGFeedCut(stock,cutter,feed);
 const after=meshAIGVoxelStock(stock);
 assert.ok(after.mesh.vertexCount>0);
 assert.notDeepEqual(before.mesh.positions,after.mesh.positions);
 assert.notEqual(before.quadCount,after.quadCount);
 assert.equal(after.triangleCount,4224);
 assert.equal(beforeReport.removedMm3,0);
 const sc=createAIG3DScene({id:'test-stock',consumer:'AIG-II',units:'MM',source:'NUMERIC_UNIT_TEST'});
 addAIG3DNode(sc,{id:'stock',kind:'stock',mesh:after.mesh,
  material:{baseColor:[.7,.55,.32,1]},source:'VOXEL_CALCULATED'});
 const check=auditAIG3DScene(sc);
 assert.equal(check.triangleCount,4224);
 assert.equal(check.verifiedNCFeedOrStockRemoval,false,
  'Renderer scene Gate requires separate real NC process verification');
});
test('v1.1 mesh triangles have winding matching outward normals',()=>{
 const stock=createAIGVoxelStock({originMm:[0,0,0],sizeMm:[1,1,1],voxelMm:1});
 const {mesh}=meshAIGVoxelStock(stock);
 assert.equal(mesh.triangleCount,12);
 for(let i=0;i<mesh.indices.length;i+=3){
  const [p0,p1,p2]=mesh.indices.slice(i,i+3).map(n=>mesh.positions.slice(n*3,n*3+3)),
   u=p1.map((x,j)=>x-p0[j]),v=p2.map((x,j)=>x-p0[j]),
   normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],
   given=mesh.normals.slice(mesh.indices[i]*3,mesh.indices[i]*3+3);
  assert.ok(normal.reduce((s,x,j)=>s+x*given[j],0)>0);
 }
});
test('v1.1 cutter and voxel budgets fail closed on invalid or absurd input',()=>{
 assert.throws(()=>createAIGVoxelStock({voxelMm:.001}),/DIMENSIONS_OR_MM_INVALID/);
 assert.throws(()=>createAIGVoxelStock({sizeMm:[100,100,100],voxelMm:.5}),/MEMORY_BUDGET_BLOCKED|DIMENSIONS/);
 assert.throws(()=>createAIGVoxelStock({sizeMm:[9.7,6,8],voxelMm:.5}),/INTEGER_VOXEL_CELLS/);
 assert.throws(()=>createAIGCylindricalCutter({diameterMm:0,fluteLengthMm:5}),/TOOL_GEOMETRY_INVALID/);
 const stock=createAIGVoxelStock(cfg);
 assert.throws(()=>applyAIGFeedCut(stock,cutter,{...feed,motion:'G2'}),/CUT_COMMAND_INVALID/);
 assert.throws(()=>applyAIGFeedCut(stock,cutter,{...feed,to:[0,Infinity,0]}),/CUT_COMMAND_INVALID/);
 assert.throws(()=>meshAIGVoxelStock(stock,{maxFaces:10}),/SURFACE_TRIANGLE_BUDGET_BLOCKED/);
});
test('v1.1 stock material accounting detects malformed occupancy evidence',()=>{
 const s=createAIGVoxelStock(cfg);s.occupancy[0]=0;
 assert.throws(()=>auditAIGVoxelStock(s),/REMOVED_VOLUME_DIGEST_INVALID/);
});
