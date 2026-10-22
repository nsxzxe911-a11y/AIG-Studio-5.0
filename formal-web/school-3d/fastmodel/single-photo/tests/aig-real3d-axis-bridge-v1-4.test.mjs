import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAIG3DScene,createAIG3DBox,addAIG3DNode,updateAIG3DNodeTransform
} from '../../../../shared-3d/aig-real3d-core.mjs';
import {parseAIG12NCWorkingCopy} from '../../../../shared-3d/aig-real3d-nc-preview-1-2.mjs';
import {createAIG13SingleBlockReplay,advanceAIG13SingleBlockReplay,
  auditAIG13SingleBlockReplay} from '../../../../shared-3d/aig-real3d-step-replay-1-3.mjs';
import {bindAIG14ThreeAxisReplay,cncXYZToAIGVisual,AIG14_BRIDGE_SCHEMA}
 from '../../../../shared-3d/aig-real3d-axis-bridge-1-4.mjs';

const source=['G21 G90 G54','S2300 M3','G0 X-6 Y0 Z10',
  'G1 Z1 F150','G1 X6 Y0 Z1','G0 Z10','M5','M30'].join('\n');
const config={stockOriginMm:[-8,-5,-2],stockSizeMm:[16,10,5],
  voxelMm:.5,cutterDiameterMm:2,fluteLengthMm:6,maxFaces:42000};
const manifest={axisPage:'3AX',sourceId:'MODEL_RIG_SOURCE_EXACT_REFERENCE',
  sourceSha256:'f'.repeat(64),geometryFrame:'REAL3D_VIEW_X_Z_NEG_Y',units:'MM'};
function rig(){
 const r=createAIG3DScene({id:'asset-rig',consumer:'AIG-Studio-5.0',
  units:'MM',source:'SOURCE_BOUND_GEOMETRY_TEST_NOT_AUTHORITY_VERIFIED'});
 const mesh=createAIG3DBox([3,2,1],'SHAPE_FOR_ADAPTER_UNIT_TEST_NOT_PRODUCTION_ASSET');
 addAIG3DNode(r,{id:'machine',mesh,kind:'machine',source:'TEST_SCENE_ACTUAL_XYZ_TRIANGLES'});
 addAIG3DNode(r,{id:'tool',mesh,kind:'tool',source:'TEST_SCENE_ACTUAL_XYZ_TRIANGLES'});
 return r;
}
function context(){
 const replay=createAIG13SingleBlockReplay(parseAIG12NCWorkingCopy(source),config),
  rigScene=rig(),tip=auditAIG13SingleBlockReplay(replay).toolpathPositionMm;
 return {axisPage:'3AX',replay,sourceText:source,rigScene,rigRevision:rigScene.revision,
  rigManifest:manifest,axisState:{X:tip[0],Y:tip[1],Z:tip[2]}};
}
test('1.4 CNC mm XYZ maps correctly into scene [X,Z,-Y] without reflections',()=>{
 assert.deepEqual(cncXYZToAIGVisual([10,20,30]),[10,30,-20]);
 assert.deepEqual(cncXYZToAIGVisual([-6,0,10]),[-6,10,-0]);
 assert.throws(()=>cncXYZToAIGVisual([Infinity,0,0]),/VECTOR_INVALID/);
});
test('1.4 binds actual 1.3 voxel boundary and source NC path, never demos a cutting volume',()=>{
 const c=context(),snapshot=JSON.stringify(c.rigScene);
 advanceAIG13SingleBlockReplay(c.replay);
 const a=auditAIG13SingleBlockReplay(c.replay);
 c.axisState={X:a.toolpathPositionMm[0],Y:a.toolpathPositionMm[1],Z:a.toolpathPositionMm[2]};
 const view=bindAIG14ThreeAxisReplay(c);
 assert.equal(view.schema,AIG14_BRIDGE_SCHEMA);
 assert.ok(view.proof.removedMm3>0);
 assert.equal(view.proof.removedMm3,a.cumulativeRemovedMm3);
 assert.equal(view.proof.voxelMm,.5);
 assert.ok(view.proof.stockTriangleCount>0);
 assert.equal(view.scene.nodes.filter(n=>n.kind==='stock').length,1);
 assert.equal(view.scene.overlays[0].segments.length,c.replay.source.segments.length);
 assert.equal(view.scene.overlays[0].segments[0].to[1],1);
 const tool=view.scene.nodes.find(n=>n.id==='tool');
 assert.deepEqual(tool.transform.position,cncXYZToAIGVisual(a.toolpathPositionMm));
 assert.equal(view.proof.authenticMachineVisualCertified,false);
 assert.equal(view.proof.authorityAssetHashExternallyVerified,false);
 assert.equal(view.proof.machineOutputEnabled,false);
 assert.equal(view.proof.continuous0001MmSurfaceAccuracyVerified,false);
 assert.equal(JSON.stringify(c.rigScene),snapshot,'must not mutate genuine Runtime rig scene');
});
test('1.4 binds full numerical 54 mm^3 result, requires fresh live XYZ',()=>{
 const c=context();
 for(let i=0;i<3;i++)advanceAIG13SingleBlockReplay(c.replay);
 const a=auditAIG13SingleBlockReplay(c.replay);
 assert.equal(a.cumulativeRemovedMm3,54);
 c.axisState={X:a.toolpathPositionMm[0],Y:a.toolpathPositionMm[1],Z:a.toolpathPositionMm[2]};
 const r=bindAIG14ThreeAxisReplay(c);
 assert.equal(r.proof.blockIndex,3);
 assert.equal(r.proof.removedMm3,54);
 const oldVolume=a.cumulativeRemovedMm3;
 assert.equal(auditAIG13SingleBlockReplay(c.replay).cumulativeRemovedMm3,oldVolume,
  'view must never advance toolpath or alter numerical stock');
});
test('1.4 never infers A/B/C rotary kinematics or silently downgrades to 3AX',()=>{
 const c=context();
 for(const axisPage of ['4AX','5AX','6AX'])
  assert.throws(()=>bindAIG14ThreeAxisReplay({...c,axisPage}),
   /MULTIAXIS_KINEMATICS_NOT_VERIFIED/);
 assert.throws(()=>bindAIG14ThreeAxisReplay({...c,axisPage:'7AX'}),/UNKNOWN_AXIS/);
});
test('1.4 stale source, unauthorized rig, mismatched axes and manifest are BLOCKED',()=>{
 const c=context();
 assert.throws(()=>bindAIG14ThreeAxisReplay({...c,sourceText:source+'\n'}),/STALE_OR_UNTRUSTED/);
 assert.throws(()=>bindAIG14ThreeAxisReplay({...c,
   axisState:{...c.axisState,X:c.axisState.X+1}}),/AXIS_REPLAY_POSITION_MISMATCH/);
 assert.throws(()=>bindAIG14ThreeAxisReplay({...c,
   axisState:{...c.axisState,A:20}}),/SOURCE_AXIS_STATE_INVALID/);
 assert.throws(()=>bindAIG14ThreeAxisReplay({...c,
   rigManifest:{...manifest,sourceSha256:'not-a-sha'}}),/MANIFEST_REQUIRED/);
 assert.throws(()=>bindAIG14ThreeAxisReplay({...c,
   rigManifest:{...manifest,geometryFrame:'CNC_XYZ'}}),/MANIFEST_REQUIRED/);
 updateAIG3DNodeTransform(c.rigScene,'machine',{position:[1,0,0]});
 assert.throws(()=>bindAIG14ThreeAxisReplay(c),/NOT_SOURCE_LOCKED/);
});
test('1.4 demos, missing real tool, and uncalibrated rotation may not masquerade as rig',()=>{
 const c=context();
 c.rigScene.nodes[0].source='PROCEDURAL_DEMO_MACHINE';
 assert.throws(()=>bindAIG14ThreeAxisReplay(c),/NOT_SOURCE_LOCKED/);
 const d=context();
 d.rigScene.nodes.find(n=>n.kind==='tool').transform.rotationDeg=[0,15,0];
 assert.throws(()=>bindAIG14ThreeAxisReplay(d),/ORIENTATION_NEEDS_CALIBRATED/);
 const e=context();
 e.rigScene.nodes.pop();
 assert.throws(()=>bindAIG14ThreeAxisReplay(e),/NOT_SOURCE_LOCKED/);
});
