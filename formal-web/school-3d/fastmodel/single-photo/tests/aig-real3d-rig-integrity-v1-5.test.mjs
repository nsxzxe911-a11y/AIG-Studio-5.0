import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DBox,addAIG3DNode}
 from '../../../../shared-3d/aig-real3d-core.mjs';
import {parseAIG12NCWorkingCopy}
 from '../../../../shared-3d/aig-real3d-nc-preview-1-2.mjs';
import {createAIG13SingleBlockReplay,advanceAIG13SingleBlockReplay,
 auditAIG13SingleBlockReplay}
 from '../../../../shared-3d/aig-real3d-step-replay-1-3.mjs';
import {AIG15_INTEGRITY_SCHEMA,calculateAIG15RigDigest,
 verifyAIG15RigDigest,bindAIG15IntegrityGated3AXReplay}
 from '../../../../shared-3d/aig-real3d-rig-integrity-1-5.mjs';

const nc=['G21 G90 G54','S2300 M3','G0 X-6 Y0 Z10',
 'G1 Z1 F150','G1 X6 Y0 Z1','G0 Z10','M5','M30'].join('\n');
const config={stockOriginMm:[-8,-5,-2],stockSizeMm:[16,10,5],
 voxelMm:.5,cutterDiameterMm:2,fluteLengthMm:6,maxFaces:42000};
function rig(){
 const s=createAIG3DScene({id:'locked-3ax-rig',
  consumer:'AIG-Studio-5.0',units:'MM',source:'TEST_SCENE_SOURCE_NOT_FINAL_AUTHORITY'});
 const mesh=createAIG3DBox([4,2,3],'TEST_GEOMETRY_NOT_USER_APPROVED');
 addAIG3DNode(s,{id:'machine',kind:'machine',mesh,source:'GEOMETRY_SOURCE_UNIT_TEST'});
 addAIG3DNode(s,{id:'tool',kind:'tool',mesh,source:'GEOMETRY_SOURCE_UNIT_TEST'});
 return s;
}
async function context(){
 const rigScene=rig();
 const sha=await calculateAIG15RigDigest(rigScene);
 const replay=createAIG13SingleBlockReplay(parseAIG12NCWorkingCopy(nc),config);
 const audit=auditAIG13SingleBlockReplay(replay);
 const axisState={X:audit.toolpathPositionMm[0],Y:audit.toolpathPositionMm[1],
  Z:audit.toolpathPositionMm[2]};
 return {axisPage:'3AX',sourceText:nc,rigScene,rigRevision:rigScene.revision,
  replay,axisState,rigManifest:{axisPage:'3AX',sourceId:'TEST_RIG_SOURCE_NOT_APPROVED',
    sourceSha256:'b'.repeat(64),geometryFrame:'REAL3D_VIEW_X_Z_NEG_Y',
    units:'MM',geometryDigestSchema:AIG15_INTEGRITY_SCHEMA,
    geometrySha256:sha}};
}
test('v1.5 deterministically hashes all XYZ mesh, material and joint transforms',async()=>{
 const r=rig(),digest=await calculateAIG15RigDigest(r);
 assert.match(digest,/^[0-9a-f]{64}$/);
 assert.equal(await calculateAIG15RigDigest(r),digest);
 const verified=await verifyAIG15RigDigest(r,digest);
 assert.equal(verified.match,true);
 assert.equal(verified.sourceAssetBytesHashed,false);
 assert.equal(verified.authorityApproved,false);
 r.nodes.reverse();
 assert.equal(await calculateAIG15RigDigest(r),digest,
  'node array order is nonsemantic and normalized');
});
test('v1.5 rejects silent geometry, material and source edits without revision bump',async()=>{
 const r=rig(),old=await calculateAIG15RigDigest(r);
 r.nodes[0].mesh.positions[0]+=.1;
 await assert.rejects(()=>verifyAIG15RigDigest(r,old),/SHA256_MISMATCH/);
 const m=rig(),sha=await calculateAIG15RigDigest(m);
 m.nodes[0].material.baseColor[0]=.9;
 await assert.rejects(()=>verifyAIG15RigDigest(m,sha),/SHA256_MISMATCH/);
 const s=rig(),srcHash=await calculateAIG15RigDigest(s);
 s.nodes[1].source='ALTERED_SOURCE_ID';
 await assert.rejects(()=>verifyAIG15RigDigest(s,srcHash),/SHA256_MISMATCH/);
});
test('v1.5 rejects unbounded/invalid manifests and preview source forgery',async()=>{
 const c=await context();
 await assert.rejects(()=>bindAIG15IntegrityGated3AXReplay({...c,
  rigManifest:{...c.rigManifest,geometrySha256:'0'.repeat(64)}}),/SHA256_MISMATCH/);
 await assert.rejects(()=>bindAIG15IntegrityGated3AXReplay({...c,
  rigManifest:{...c.rigManifest,geometrySha256:'NOT_AN_ACTUAL_SHA'}}),/EXPECTED_DIGEST_INVALID/);
 await assert.rejects(()=>bindAIG15IntegrityGated3AXReplay({...c,
  rigManifest:{...c.rigManifest,geometryDigestSchema:'OLD_UNVERIFIED'}}),
  /EXPECTED_GEOMETRY_MANIFEST_REQUIRED/);
 await assert.rejects(()=>bindAIG15IntegrityGated3AXReplay({...c,
  sourceText:c.sourceText+'\n'}),/STALE_OR_UNTRUSTED/);
 await assert.rejects(()=>bindAIG15IntegrityGated3AXReplay({...c,axisPage:'5AX'}),
  /MULTIAXIS_KINEMATICS_NOT_VERIFIED/);
});
test('v1.5 preserves real 1.3 numerical removed 54mm3 with no rig mutation / machine output',async()=>{
 const c=await context();
 for(let i=0;i<3;i++)advanceAIG13SingleBlockReplay(c.replay);
 const audit=auditAIG13SingleBlockReplay(c.replay);
 assert.equal(audit.cumulativeRemovedMm3,54);
 c.axisState={X:audit.toolpathPositionMm[0],Y:audit.toolpathPositionMm[1],
  Z:audit.toolpathPositionMm[2]};
 const orig=JSON.stringify(c.rigScene);
 const v=await bindAIG15IntegrityGated3AXReplay(c);
 assert.equal(v.proof.removedMm3,54);
 assert.equal(v.proof.sourceRigGeometrySha256Matched,true);
 assert.equal(v.proof.originalGlbFileSha256Measured,false);
 assert.equal(v.proof.sourceRigVisualAuthorityApproved,false);
 assert.equal(v.proof.machineOutputEnabled,false);
 assert.equal(v.proof.continuous0001MmSurfaceAccuracyVerified,false);
 assert.equal(v.integrity.schema,AIG15_INTEGRITY_SCHEMA);
 assert.equal(JSON.stringify(c.rigScene),orig);
 assert.equal(auditAIG13SingleBlockReplay(c.replay).cumulativeRemovedMm3,54);
});
test('v1.5 numeric transform mutations cannot be silently treated as an exact source',async()=>{
 const c=await context();
 c.rigScene.nodes.find(n=>n.id==='tool').transform.position[1]=1;
 await assert.rejects(()=>bindAIG15IntegrityGated3AXReplay(c),/SHA256_MISMATCH/);
 const d=await context();
 d.rigScene.nodes.find(n=>n.id==='machine').mesh.indices[0]=-1;
 await assert.rejects(()=>bindAIG15IntegrityGated3AXReplay(d),/SHA256_MISMATCH|RIG_CONTENT_INVALID|MESH/);
});
