/**
 * Real3D 1.4: READ-ONLY 3AX NC replay -> actual 3D SceneGraph binding.
 * Reuses verified v1.3 voxel boundary, never invents CNC motion or cuts.
 * Scene convention is [X, Z, -Y] from CNC [X,Y,Z] (mm), an orthonormal
 * right-handed coordinate change. Rig model geometry must ALREADY be authored
 * in this visual convention. No auto-kinematics for A/B/C.
 *
 * Source SHA is a declared manifest reference; this adapter does not compute
 * cryptographic asset hashes or certify an actual Authority rig.
 * No production machine authority and no CNC commands.
 */
import {
  AIG_REAL3D_SCHEMA,createAIG3DScene,createAIG3DMesh,addAIG3DNode,
  addAIG3DToolpathOverlay,auditAIG3DScene
} from './aig-real3d-core.mjs';
import {
  AIG13_REPLAY_SCHEMA,auditAIG13SingleBlockReplay,currentAIG13ReplayBoundary
} from './aig-real3d-step-replay-1-3.mjs';
import {parseAIG12NCWorkingCopy} from './aig-real3d-nc-preview-1-2.mjs';

export const AIG14_BRIDGE_SCHEMA='AIG_REAL3D_V1_4_READ_ONLY_3AX_NC_TO_SCENE';
const validDigest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const goodVec=a=>Array.isArray(a)&&a.length===3&&a.every(x=>Number.isFinite(x)&&Math.abs(x)<=1e6);
export const cncXYZToAIGVisual=v=>{
  if(!goodVec(v))throw Error('AIG14_CNC_VECTOR_INVALID');
  return [v[0],v[2],-v[1]];
};
function convertMesh(mesh){
  if(!mesh||mesh.actualXYZTriangles!==true||
    !Array.isArray(mesh.positions)||!Array.isArray(mesh.normals)||
    !Array.isArray(mesh.indices)||!Array.isArray(mesh.bounds?.min))
    throw Error('AIG14_NUMERICAL_STOCK_MESH_MISSING');
  const map=a=>{
    const out=[];
    for(let i=0;i<a.length;i+=3)out.push(...cncXYZToAIGVisual(a.slice(i,i+3)));
    return out;
  };
  return createAIG3DMesh({positions:map(mesh.positions),normals:map(mesh.normals),
    indices:[...mesh.indices],provenance:'NUMERIC_REPLAY_1_3_CNC_XYZ_TO_VIEW_X_Z_NEG_Y'});
}
function forbiddenFake(n){
  const src=String(n.source)+' '+String(n.mesh?.provenance);
  return /DEMO|FAKE|UNVERIFIED|PROCEDURAL|PLACEHOLDER/i.test(src);
}
function checkRig(rig,rigRevision){
  if(rig?.schema!==AIG_REAL3D_SCHEMA||rig.units!=='MM'||
    !['AIG-II','AIG-Studio-5.0'].includes(rig.consumer)||
    !Number.isInteger(rigRevision)||rig.revision!==rigRevision||
    rig.nodes.length<2||rig.nodes.length>100||
    rig.nodes.some(n=>n.parentId!==null||!n.mesh?.actualXYZTriangles||forbiddenFake(n)))
    throw Error('AIG14_RIG_NOT_SOURCE_LOCKED_OR_UNSUPPORTED_HIERARCHY');
  const machine=rig.nodes.filter(n=>n.kind==='machine');
  const tools=rig.nodes.filter(n=>n.kind==='tool');
  if(machine.length<1||tools.length!==1||rig.nodes.some(n=>n.kind==='stock'))
    throw Error('AIG14_REAL_MACHINE_AND_EXACTLY_ONE_TOOL_REQUIRED');
  const tool=tools[0];
  const t=tool.transform;
  if(t.rotationDeg.some(x=>x!==0)||t.scale.some(x=>x!==1))
    throw Error('AIG14_TOOL_ORIENTATION_NEEDS_CALIBRATED_KINEMATICS');
  return tool;
}
/**
 * Fail-closed visual adapter:
 *  - NC source must byte-match the replay source AND re-parse identically.
 *  - X/Y/Z readout must equal current NC tip at this block.
 *  - A/B/C are rejected until an independent approved kinematic solver exists.
 *  - No rig writes; work stock reuses actual replay occupancy boundary.
 *  - Geometry provenance references are declared, not cryptographically certified.
 */
export function bindAIG14ThreeAxisReplay({
  axisPage='3AX',replay,sourceText,rigScene,rigRevision,
  rigManifest,axisState,toolTipLocalVisualMm=[0,0,0]
}={}){
  if(!['3AX','4AX','5AX','6AX'].includes(axisPage))
    throw Error('AIG14_UNKNOWN_AXIS_PAGE');
  if(axisPage!=='3AX')
    throw Error('AIG14_MULTIAXIS_KINEMATICS_NOT_VERIFIED_BLOCKED');
  if(replay?.schema!==AIG13_REPLAY_SCHEMA||
    replay.readOnly!==true||replay.sendCNCCommands!==false||
    typeof sourceText!=='string'||sourceText!==replay.source?.rawSourcePreserved)
    throw Error('AIG14_STALE_OR_UNTRUSTED_NC_SOURCE');
  const fresh=parseAIG12NCWorkingCopy(sourceText,{maxSegments:1000});
  if(JSON.stringify(fresh.segments)!==JSON.stringify(replay.source.segments))
    throw Error('AIG14_REPARSED_NC_SEGMENTS_MISMATCH');
  const tool=checkRig(rigScene,rigRevision);
  if(rigManifest?.axisPage!==axisPage||
    typeof rigManifest.sourceId!=='string'||rigManifest.sourceId.length<5||
    !validDigest(rigManifest.sourceSha256)||
    rigManifest.geometryFrame!=='REAL3D_VIEW_X_Z_NEG_Y'||
    rigManifest.units!=='MM')
    throw Error('AIG14_EXACT_RIG_SOURCE_MANIFEST_REQUIRED');
  if(!goodVec(toolTipLocalVisualMm)||
    !axisState||Object.keys(axisState).sort().join(',')!=='X,Y,Z'||
    !['X','Y','Z'].every(k=>Number.isFinite(axisState[k])&&Math.abs(axisState[k])<=100000))
    throw Error('AIG14_SOURCE_AXIS_STATE_INVALID');
  const audit=auditAIG13SingleBlockReplay(replay),tip=audit.toolpathPositionMm;
  if(!goodVec(tip)||Math.abs(axisState.X-tip[0])>1e-9||
    Math.abs(axisState.Y-tip[1])>1e-9||
    Math.abs(axisState.Z-tip[2])>1e-9)
    throw Error('AIG14_AXIS_REPLAY_POSITION_MISMATCH');
  const boundary=currentAIG13ReplayBoundary(replay);
  if(!boundary.hasActualIndexedXYZ||!boundary.mesh)
    throw Error('AIG14_NUMERICAL_STOCK_MESH_MISSING');
  const scene=createAIG3DScene({id:'aig14-3ax-source-bound-view',
    consumer:rigScene.consumer,units:'MM',
    source:'NC_SOURCE_REPARSED_AND_RIG_MANIFEST_DECLARED_VIEW_ONLY'});
  for(const n of rigScene.nodes){
    const local={...n.transform,position:[...n.transform.position],
      rotationDeg:[...n.transform.rotationDeg],scale:[...n.transform.scale]};
    if(n.id===tool.id){
      const viewTip=cncXYZToAIGVisual(tip);
      local.position=viewTip.map((x,i)=>x-toolTipLocalVisualMm[i]);
    }
    addAIG3DNode(scene,{id:n.id,parentId:null,mesh:n.mesh,kind:n.kind,
      transform:local,material:n.material,visible:n.visible,source:n.source});
  }
  addAIG3DNode(scene,{id:'aig14_numeric_stock',kind:'stock',
    mesh:convertMesh(boundary.mesh),
    source:'ACTUAL_V1_3_VOXEL_OCCUPANCY_BOUNDARY_IN_MM',
    material:{baseColor:[.66,.69,.74,1],metallic:.20,roughness:.58}});
  addAIG3DToolpathOverlay(scene,{id:'aig14_nc_path',
    segments:replay.source.segments.map(s=>({
      motion:s.motion,from:cncXYZToAIGVisual(s.from),
      to:cncXYZToAIGVisual(s.to)})),
    units:'MM',source:'REPARSED_NC_LIMITED_G0_G1_VISUAL_ONLY'});
  const sceneAudit=auditAIG3DScene(scene);
  return {schema:AIG14_BRIDGE_SCHEMA,axisPage,scene,
    proof:{sourceLine:audit.lastSourceLine,blockIndex:audit.blockIndex,
      removedMm3:audit.cumulativeRemovedMm3,voxelMm:audit.voxelMm,
      stockTriangleCount:boundary.triangleCount,
      boundSceneTriangles:sceneAudit.triangleCount,
      rigSourceId:rigManifest.sourceId,
      rigSourceSha256Declared:rigManifest.sourceSha256,
      rigRevision,cncTipMm:[...tip],
      visualTip:cncXYZToAIGVisual(tip),
      machineAndToolMeshesPresent:true,
      ncRawSourceReparsed:true,ncAxesMatch:true,
      geometryIsRealXYZ:true,stockOccupancyIsNumerical:true,
      authorityAssetHashExternallyVerified:false,
      authenticMachineVisualCertified:false,
      realMachineAxisKinematicsVerified:false,
      noExternalMachineCommands:true,
      machineOutputEnabled:false,
      continuous0001MmSurfaceAccuracyVerified:false}};
}
