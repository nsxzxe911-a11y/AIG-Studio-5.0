import test from 'node:test';
import assert from 'node:assert/strict';
import {loadAIGReal3DOriginalOBJStructure}
 from '../aig-real3d-v94-obj-structure-intake.mjs';
import {auditAIGReal3DOriginalStructure}
 from '../aig-real3d-v94-source-structure-audit.mjs';
const sha='a'.repeat(64);
const source=[
 '# original group-labeled source, not a scan',
 'v -1 -1 -1','v 1 -1 -1','v 1 1 -1','v -1 1 -1',
 'v -1 -1 1','v 1 -1 1','v 1 1 1','v -1 1 1',
 'g OriginalHull',
 'f 1 3 2','f 1 4 3','f 5 6 7','f 5 7 8',
 'f 1 2 6','f 1 6 5','f 4 8 7','f 4 7 3',
 'f 2 3 7','f 2 7 6','f 1 5 8','f 1 8 4'
].join('\n');
test('V94 raw OBJ g source retains 12 truly indexed faces and full raw group provenance',()=>{
 const sourceData=loadAIGReal3DOriginalOBJStructure({
  objText:source,sourceSha256:sha,verifiedFileSha256:sha
 });
 assert.equal(sourceData.originalTriangleCount,12);
 assert.equal(sourceData.displayedTriangleCount,12);
 assert.equal(sourceData.scene.nodes[0].mesh.vertexCount,8);
 assert.equal(sourceData.groups[0].groupLabel,'OriginalHull');
 assert.equal(sourceData.scene.nodes[0].sourceGlobalVertexIds.length,8);
 assert.equal(sourceData.sourceUVCoordinatesLoaded,false);
 assert.equal(sourceData.independentlyValidatedGeometryOrAuthorship,false);
 const report=auditAIGReal3DOriginalStructure({
  scene:sourceData.scene,sourceSha256:sha,
  parts:sourceData.parts.map(p=>({...p,closedSurfaceRequired:true}))
 });
 assert.equal(report.sourceTopologyGatePASS,true);
 assert.equal(report.parts[0].geometry.openSourceIndexedEdges,0);
 assert.equal(report.parts[0].geometry.rawIndexedTriangles,12);
});
test('V94 source native grouped OBJ preserves all group triangle counts and never infers source roles',()=>{
 const original=source.replace('g OriginalHull','o HullPiece');
 const parts=original+'\ng Wing\nf 1 2 3\nf 1 3 4\n';
 const r=loadAIGReal3DOriginalOBJStructure({
  objText:parts,sourceSha256:sha,verifiedFileSha256:sha
 });
 assert.equal(r.groups.length,2);
 assert.equal(r.originalTriangleCount,14);
 assert.equal(r.displayedTriangleCount,14);
 assert.equal(r.parts[0].role,'OTHER');
 assert.equal(r.parts[1].role,'OTHER');
 const a=auditAIGReal3DOriginalStructure({
  scene:r.scene,sourceSha256:sha,parts:r.parts});
 assert.equal(a.originalTriangleCount,14);
 assert.equal(a.originalTrianglesAdded,0);
});
test('V94 original OBJ refuses wrong SHA, invalid source coordinate and missing genuine faces',()=>{
 assert.throws(()=>loadAIGReal3DOriginalOBJStructure({
  objText:source,sourceSha256:sha,verifiedFileSha256:'b'.repeat(64)
 }),/RAW_FILE_BYTES_SHA_UNITS_REQUIRED/);
 assert.throws(()=>loadAIGReal3DOriginalOBJStructure({
  objText:source.replace('v 1 1 1','v Infinity 1 1'),
  sourceSha256:sha,verifiedFileSha256:sha
 }),/SOURCE_VERTEX_NONFINITE_OR_OUT_OF_RANGE/);
 assert.throws(()=>loadAIGReal3DOriginalOBJStructure({
  objText:source.replace('f 1 3 2','f 1 1 2'),
  sourceSha256:sha,verifiedFileSha256:sha
 }),/DUPLICATED_SOURCE_FACE_VERTEX/);
 assert.throws(()=>loadAIGReal3DOriginalOBJStructure({
  objText:source.replace('f 1 3 2','f 0 3 2'),
  sourceSha256:sha,verifiedFileSha256:sha
 }),/SOURCE_VERTEX_REFERENCE_OUT_OF_RANGE/);
});
test('V94 original OBJ grouped unobserved backside cannot be auto generated',()=>{
 const open=source.split('\n').slice(0,10).join('\n')+
  '\ng VisibleOnly\nf 1 3 2\nf 1 4 3\n';
 const r=loadAIGReal3DOriginalOBJStructure({
  objText:open,sourceSha256:sha,verifiedFileSha256:sha
 });
 assert.equal(r.originalTriangleCount,2);
 const a=auditAIGReal3DOriginalStructure({
  scene:r.scene,sourceSha256:sha,
  parts:r.parts.map(x=>({...x,closedSurfaceRequired:true}))});
 assert.equal(a.sourceTopologyGatePASS,false);
 assert.equal(a.parts[0].geometry.indexedTopologyWatertight,false);
 assert.equal(r.missingSourceBackNeverInvented,true);
});
