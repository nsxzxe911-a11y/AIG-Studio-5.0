import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIG45_POSES,recognizePose,auditMarks} from '../aig-calibration-4-5.mjs';
import {AIG46_SCHEMA,normalizePoseSet,buildHeadNeckPonytail,meshTopology,exportOBJ} from '../aig-head-neck-4-6.mjs';
const marks={
 headTop:{x:.5,y:.07},chin:{x:.5,y:.17},
 leftShoulder:{x:.39,y:.25},rightShoulder:{x:.61,y:.25},
 leftHip:{x:.42,y:.53},rightHip:{x:.58,y:.53},
 leftAnkle:{x:.44,y:.9},rightAnkle:{x:.56,y:.9}
};
const audit=(p,override=marks)=>auditMarks(
 recognizePose({sha256:p.sha256,width:p.width,height:p.height}),override);
const one=()=>normalizePoseSet([audit(AIG45_POSES[0])]);
test('4.6 canonical ratios are source SHA-bound normalized 2D camera projections, not imaginary side/backs',()=>{
 const p=one();
 assert.equal(p.schema,AIG46_SCHEMA);
 assert.equal(p.poses[0].sourceSHA256,AIG45_POSES[0].sha256);
 assert.ok(p.poses[0].landmarksCanonical2D.headTop.y>p.poses[0].landmarksCanonical2D.chin.y);
 assert.ok(p.medianRatios.headHeight>.045&&p.medianRatios.headHeight<.27);
 assert.equal(p.sameCameraAngleNotVerified,true);
 assert.equal(p.unknownBackSurfaceInferred,true);
 assert.equal(p.full3DFromPhotosVerified,false);
 assert.equal(p.noCreditsSpent,true);
 assert.equal(p.releaseAllowed,false);
 assert.throws(()=>normalizePoseSet([]),/POSE_SET_COUNT/);
 assert.throws(()=>normalizePoseSet([audit(AIG45_POSES[0]),audit(AIG45_POSES[0])]),/DUPLICATE_SOURCE/);
 assert.throws(()=>normalizePoseSet([{schema:'fake'}]),/SOURCE_AND_LANDMARK_QA_REQUIRED/);
});
test('source-normalised four poses retain SHA IDs, flag impossible camera/body ratio drift',()=>{
 const reports=AIG45_POSES.map(p=>audit(p));
 const p=normalizePoseSet(reports);
 assert.equal(p.poses.length,4);
 assert.equal(new Set(p.sourceSHA256).size,4);
 assert.equal(p.assetSetId,'HEROINE_WHITE_STRAPLESS_TWO_PIECE_PONYTAIL_4POSE_20261021');
 const far={...marks,leftShoulder:{x:.31,y:.25},rightShoulder:{x:.69,y:.25}};
 assert.throws(()=>normalizePoseSet([reports[0],audit(AIG45_POSES[1],far)]),
  /POSE_CAMERA_SCALE_OUTLIER_REVIEW/);
});
test('three fully triangulated parts head neck ponytail: watertight outward signed volume',()=>{
 const p=one(),result=buildHeadNeckPonytail(p);
 assert.equal(result.schema,AIG46_SCHEMA);
 assert.deepEqual(result.parts.map(m=>m.name),['head','neck','ponytail']);
 assert.equal(result.topologyQA,true);
 assert.ok(result.maxTriangles>300);
 assert.equal(result.headNeckProxyTouchByGeometry,true);
 assert.equal(result.ponytailRootNearHeadProxy,true);
 assert.equal(result.separatedSurfacesNotWelded,true);
 assert.equal(result.realFaceTextureMatchVerified,false);
 assert.equal(result.actualHairStrandCollisionVerified,false);
 assert.equal(result.fullBodyTopologyVerified,false);
 assert.equal(result.photoBackReconstructionVerified,false);
 assert.equal(result.noCreditsSpent,true);
 assert.equal(result.releaseAllowed,false);
 for(const part of result.parts){
  const a=meshTopology(part);
  assert.equal(a.closed,true,part.name+' should have fully sealed independent topology');
  assert.equal(a.normalOrientationVerified,true,part.name+' winding and signed volume');
  assert.equal(a.orientationConflicts,0);
  assert.equal(a.nonManifoldEdges,0);
  assert.equal(a.degenerateTriangles,0);
  assert.ok(a.signedVolume>0,part.name+' volume');
  assert.ok(part.positions instanceof Float32Array);
  assert.ok(part.indices instanceof Uint16Array);
  assert.equal(part.skinned,false);
  assert.equal(part.uvMapped,false);
 }
});
test('ponytail swing and rear position change ONLY ponytail geometry; head/neck stay equal',()=>{
 const p=one(),a=buildHeadNeckPonytail(p,{ponytailSwing:-.06,ponytailBack:.05}),
 b=buildHeadNeckPonytail(p,{ponytailSwing:.07,ponytailBack:.18});
 assert.deepEqual([...a.parts[0].positions],[...b.parts[0].positions]);
 assert.deepEqual([...a.parts[1].positions],[...b.parts[1].positions]);
 assert.notDeepEqual([...a.parts[2].positions],[...b.parts[2].positions]);
 assert.equal(a.topologyQA,true);
 assert.equal(b.topologyQA,true);
 assert.throws(()=>buildHeadNeckPonytail(p,{ponytailSwing:.5}),/NORMALIZED_PROFILE_REQUIRED/);
 assert.throws(()=>buildHeadNeckPonytail(p,{ponytailBack:-.02}),/NORMALIZED_PROFILE_REQUIRED/);
});
test('real 3D OBJ has 3 separate source-inferred geometry parts and actual face data',()=>{
 const result=buildHeadNeckPonytail(one()),obj=exportOBJ(result);
 assert.match(obj,/o AIG46_head/);
 assert.match(obj,/o AIG46_neck/);
 assert.match(obj,/o AIG46_ponytail/);
 const vertices=obj.split('\n').filter(x=>x.startsWith('v '));
 const triangles=obj.split('\n').filter(x=>x.startsWith('f '));
 assert.equal(vertices.length,result.topology.reduce((s,p)=>s+p.vertexCount,0));
 assert.equal(triangles.length,result.maxTriangles);
 assert.ok(vertices.every(v=>v.split(' ').length===4));
 assert.ok(triangles.every(v=>v.split(' ').length===4));
 assert.throws(()=>exportOBJ({schema:AIG46_SCHEMA,topologyQA:false}),/UNVERIFIED_MESH/);
});
test('4.6 RGB actions perform verified calibration->OBJ instead of a fake upload or external API',()=>{
 const get=x=>fs.readFileSync(new URL(x,import.meta.url),'utf8');
 const html=get('../index.html'),app=get('../app.mjs'),core=get('../aig-head-neck-4-6.mjs');
 for(const id of ['aig46-build','aig46-swing','aig46-swing-value','aig46-back',
  'aig46-back-value','aig46-yaw','aig46-yaw-value','aig46-canvas','aig46-downloads','aig46-status'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(app,/normalizePoseSet\(\[\.\.\.aig45Accepted\.values\(\)\]\)/);
 assert.match(app,/buildHeadNeckPonytail\(aig46Profile/);
 assert.match(app,/exportOBJ\(aig46Draft\)/);
 assert.match(app,/aig46Reset\(\)/);
 assert.match(app,/aig46-build'\)\.addEventListener\('click'/);
 assert.match(app,/AIG-4\.6-head-neck-ponytail-TECHNICAL-DRAFT\.obj/);
 assert.doesNotMatch(core,/MeshyClient|StableFast3D|fetch\(|subprocess\.run\(|https:\/\//);
});
