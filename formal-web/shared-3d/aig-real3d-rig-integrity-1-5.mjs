/**
 * AIG Real3D 1.5 - deterministic source-rig XYZ geometry integrity.
 * Browser + Node >=22, no CDN. Verifies exact scene content as received
 * before the 1.4 readonly 3AX adapter binds its numerical NC replay.
 *
 * SHA-256 proves bytes of this canonical SceneGraph representation match an
 * independently supplied expected digest. It does NOT prove the source
 * GLB/image bytes, user visual approval, kinematics, machine safety or CNC use.
 */
import {AIG_REAL3D_SCHEMA,auditAIG3DScene} from './aig-real3d-core.mjs';
import {bindAIG14ThreeAxisReplay} from './aig-real3d-axis-bridge-1-4.mjs';

export const AIG15_INTEGRITY_SCHEMA='AIG_REAL3D_1_5_CANONICAL_RIG_SHA256';
const HEX64=/^[a-f0-9]{64}$/;
function canonicalRig(scene){
  if(scene?.schema!==AIG_REAL3D_SCHEMA||scene.units!=='MM'||
    !Array.isArray(scene.nodes)||scene.nodes.length<2||scene.nodes.length>100||
    !Array.isArray(scene.overlays)||scene.overlays.length!==0||
    !Number.isInteger(scene.revision)||scene.revision<1)
    throw Error('AIG15_RIG_CONTENT_INVALID');
  const a=auditAIG3DScene(scene);
  if(a.triangleCount<2)throw Error('AIG15_RIG_MESH_MISSING');
  const nodes=scene.nodes.map(n=>({
    id:n.id,parentId:n.parentId,kind:n.kind,source:n.source,
    visible:n.visible,
    transform:{position:n.transform.position,rotationDeg:n.transform.rotationDeg,
      scale:n.transform.scale},
    material:{baseColor:n.material.baseColor,metallic:n.material.metallic,
      roughness:n.material.roughness,emissive:n.material.emissive,
      doubleSided:n.material.doubleSided,lightingModel:n.material.lightingModel},
    mesh:{provenance:n.mesh.provenance,positions:n.mesh.positions,
      normals:n.mesh.normals,indices:n.mesh.indices}
  })).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const record={schema:AIG15_INTEGRITY_SCHEMA,sceneSchema:scene.schema,
    id:scene.id,consumer:scene.consumer,units:scene.units,
    source:scene.source,revision:scene.revision,nodes};
  const json=JSON.stringify(record,(_k,v)=>{
    if(typeof v==='number'&&!Number.isFinite(v))
      throw Error('AIG15_NONFINITE_GEOMETRY_BLOCKED');
    return v;
  });
  if(!json||json.length>25000000)throw Error('AIG15_RIG_DIGEST_MEMORY_BUDGET');
  return json;
}
export async function calculateAIG15RigDigest(scene){
  const json=canonicalRig(scene);
  if(typeof crypto==='undefined'||!crypto.subtle?.digest||
    typeof TextEncoder==='undefined')
    throw Error('AIG15_CRYPTO_SUBTLE_UNAVAILABLE_BLOCKED');
  const bytes=new TextEncoder().encode(json);
  const raw=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(raw)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function verifyAIG15RigDigest(scene,expectedGeometrySha256){
  if(typeof expectedGeometrySha256!=='string'||!HEX64.test(expectedGeometrySha256))
    throw Error('AIG15_EXPECTED_DIGEST_INVALID');
  const measured=await calculateAIG15RigDigest(scene);
  if(measured!==expectedGeometrySha256)
    throw Error('AIG15_RIG_GEOMETRY_SHA256_MISMATCH_BLOCKED');
  return {schema:AIG15_INTEGRITY_SCHEMA,
    geometrySha256:measured,match:true,
    sourceAssetBytesHashed:false,authorityApproved:false,
    machineModelAndToolCollisionCertified:false};
}
/**
 * Exact content gate before read-only numeric 3AX binding.
 * rigManifest.geometrySha256 MUST come from an independently recorded rig
 * manifest. Never create the expected hash from the candidate during
 * production verification (that would only bless any changed geometry).
 *
 * This does not replace AIG-II or Studio runtime/core.
 */
export async function bindAIG15IntegrityGated3AXReplay(options={}){
  const {rigScene,rigManifest}=options;
  if(!rigManifest||rigManifest.geometryDigestSchema!==AIG15_INTEGRITY_SCHEMA)
    throw Error('AIG15_EXPECTED_GEOMETRY_MANIFEST_REQUIRED');
  const integrity=await verifyAIG15RigDigest(rigScene,rigManifest.geometrySha256);
  const bound=bindAIG14ThreeAxisReplay(options);
  return {...bound,integrity,proof:{...bound.proof,
    sourceRigGeometrySha256Measured:integrity.geometrySha256,
    sourceRigGeometrySha256Matched:true,
    originalGlbFileSha256Measured:false,
    sourceRigVisualAuthorityApproved:false,
    authenticMachineVisualCertified:false,
    machineOutputEnabled:false}};
}
