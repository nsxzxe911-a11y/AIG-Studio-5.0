/**
 * V107 Third project (FastModel / Real3D) independent virtual XYZ/A/B
 * drawing stage. NOT the CNC production 5AX kinematics or Fanuc NC.
 *
 * Top XYZ shifts the OBSERVATION stage. Bottom A tilts the object around
 * source-local CNC X (Real3D X). B is a CHILD mounted on A and rotates
 * around the A-local CNC Z (Real3D Y): T(pivot) * Rx(A) * Ry(B) * T(-pivot).
 *
 * Foot -> Head uses ORIGINAL SOURCE world-height (Y-up) to avoid bogus
 * slicing when the A/B table rotates. GPU discard keeps original triangles
 * and UV untouched. No procedural replacement anatomy.
 */
import {getAIG3DWorldMatrix,transformAIG3DPoint,multiplyAIG3DMatrix}
 from './aig-real3d-core.mjs';
import {convertAIGReal3DCNCToWorld}
 from './aig-real3d-v104-cad-top-first.mjs';
export const AIG_REAL3D_V107_SCHEMA='AIG_REAL3D_V107_FASTMODEL_VIRTUAL_XYZ_AB_SOURCE_SLICING_V1';
const fail=x=>{throw Error('REAL3D_V107_'+x);};
const finite=Number.isFinite,round=x=>Math.round(x*1e6)/1e6;
const validSha=x=>typeof x==='string'&&/^[0-9a-f]{64}$/i.test(x);
const idMat=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function translation(v){const m=idMat();for(let i=0;i<3;i++)m[12+i]=v[i];return m;}
function rotateX(deg){
 const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return [1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1];
}
function rotateY(deg){
 const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return [c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1];
}
const mmToWorld=(mm,units)=>convertAIGReal3DCNCToWorld(mm,{sceneUnits:units});
export function auditAIGReal3DV107Source(scene,sourceGLBSha256){
 if(scene?.schema!=='AIG_REAL3D_SCENE_V1'||!['METERS','MM'].includes(scene.units)||
  !validSha(sourceGLBSha256)||!Array.isArray(scene.nodes)||
  !scene.nodes.length||scene.nodes.length>128)
  fail('REAL_GLTF_SOURCE_SHA_OR_UNITS_REQUIRED');
 const all=[];let triangles=0,nodes=0;
 for(const node of scene.nodes)if(node.visible!==false){
  const m=node.mesh;
  if(!m?.actualXYZTriangles||!Array.isArray(m.positions)||
   m.positions.length!==m.vertexCount*3||
   !Array.isArray(m.indices)||m.indices.length!==m.triangleCount*3||
   !m.positions.every(finite)||
   m.indices.some(x=>!Number.isInteger(x)||x<0||x>=m.vertexCount))
   fail('ACTUAL_SOURCE_INDEXED_XYZ_REQUIRED');
  triangles+=m.triangleCount;nodes++;
  if(triangles>200000)fail('SOURCE_TRIANGLE_MEMORY_BUDGET');
  const matrix=getAIG3DWorldMatrix(scene,node.id);
  for(let i=0;i<m.positions.length;i+=3){
   const point=transformAIG3DPoint(matrix,m.positions.slice(i,i+3));
   if(!point.every(finite))fail('REAL_SOURCE_WORLD_VERTEX_INVALID');
   all.push(point);
  }
 }
 if(!nodes||!all.length)fail('VISIBLE_SOURCE_MESH_REQUIRED');
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const point of all)for(let axis=0;axis<3;axis++){
  min[axis]=Math.min(min[axis],point[axis]);
  max[axis]=Math.max(max[axis],point[axis]);
 }
 if(max[1]-min[1]<1e-8)fail('SOURCE_HEIGHT_ZERO_CANNOT_SLICE');
 const pivot=min.map((v,i)=>(v+max[i])/2);
 return {schema:'AIG_REAL3D_V107_SOURCE_RIG_CONTRACT_V1',
  sourceGLBSha256,sourceSceneRevision:scene.revision,units:scene.units,
  trueIndexedSourceTriangles:triangles,visibleSourceNodes:nodes,
  worldBounds:{min,max},originalPivotWorld:pivot,
  originalHeightMinY:min[1],originalHeightMaxY:max[1],
  meshXYZUvsNormalsNeverAltered:true,
  independentSourceFrontBackPhotoNotClaimed:true,
  releasePASS:false};
}
export function planAIGReal3DV107FiveAxis({
 scene,sourceGLBSha256,topXYZCNCmm=[0,0,0],aTiltDeg=0,
 bTurnDeg=0,footHeadProgress=1,sourceAudit=null
}={}){
 const audit=sourceAudit??auditAIGReal3DV107Source(scene,sourceGLBSha256);
 if(audit.sourceGLBSha256!==sourceGLBSha256||
  audit.sourceSceneRevision!==scene?.revision||
  audit.units!==scene.units||
  !Array.isArray(topXYZCNCmm)||topXYZCNCmm.length!==3||
  !topXYZCNCmm.every(x=>finite(x)&&Math.abs(x)<=50000)||
  !finite(aTiltDeg)||aTiltDeg< -180||aTiltDeg>180||
  !finite(bTurnDeg)||bTurnDeg<0||bTurnDeg>360||
  !finite(footHeadProgress)||footHeadProgress<0||footHeadProgress>1)
  fail('VIRTUAL_AXIS_LIMIT_OR_SOURCE_REVISION_INVALID');
 const pivot=audit.originalPivotWorld;
 const A=rotateX(aTiltDeg),B=rotateY(bTurnDeg);
 const table=multiplyAIG3DMatrix(
  translation(pivot),multiplyAIG3DMatrix(
   A,multiplyAIG3DMatrix(B,translation(pivot.map(x=>-x)))));
 const cameraShift=mmToWorld(topXYZCNCmm,audit.units);
 const clipY=audit.originalHeightMinY+
  (audit.originalHeightMaxY-audit.originalHeightMinY)*footHeadProgress;
 // Relative viewing vector calculated from local AB chain, not global yaw.
 const bAxisDirection=transformAIG3DPoint(A,[0,1,0]);
 const bAxisOrigin=transformAIG3DPoint(A,[0,0,0]);
 const actualLocalBAxis=bAxisDirection.map((v,i)=>round(v-bAxisOrigin[i]));
 const stageDescription={
  topXYZ:{axes:['X','Y','Z'],mm:[...topXYZCNCmm],
   independentCameraTranslationWorld:cameraShift,
   drivesToolOrFanucCNC:false},
  bottomA:{localCNCPhysicalAxis:'X',real3dAxis:'X',
   aTiltDeg,softwarePreviewLimitsDeg:[-180,180],
   physicalHardwareLimitIndependentlyCertified:false},
  childB:{mountedOn:'A',localCNCPhysicalAxis:'Z',
   real3dBeforeA:'Y',turnDeg:bTurnDeg,
   fullVirtualCircleDeg:360,axisInWorldAfterATilt:actualLocalBAxis,
   trueMachineRotaryLimitsCertified:false}
 };
 return {schema:AIG_REAL3D_V107_SCHEMA,
  sourceGLBSha256,sceneRevision:scene.revision,
  modelStageMatrix:table,viewShiftWorld:cameraShift,
  topXYZCNCmm:[...topXYZCNCmm],aTiltDeg,bTurnDeg,
  rendererModelPoseSource:'ONE_REAL_INDEXED_XYZ_GLB',
  jointHierarchy:'INDEPENDENT_TOP_XYZ_VIEW_AND_BOTTOM_A_PARENT_OF_B',
  childBActualAxis:actualLocalBAxis,
  sourceGeometryUnmodified:true,sourceMaterialsAndUVUnmodified:true,
  allOriginalIndexedFacesStillUploaded:true,
  clipSourceSceneRequired:true,clipSourceYMin:audit.originalHeightMinY,
  clipSourceYMax:clipY,progress:footHeadProgress,
  footToHeadSliceWorldY:clipY,originalModelHeightWorld:[
   audit.originalHeightMinY,audit.originalHeightMaxY],
  actual3DNewGeometryGenerated:false,
  originalObservedOrEstimatedRegionsNotReclassified:true,
  virtualPoseDoesNotCertifyCNCMachineCollisionSafety:true,
  independentlyScannedBacksideUnknown:true,
  actualAIReconstructionWeightsUsed:false,
  stageDescription,releasePASS:false};
}
export function createAIGReal3DV107IncrementalStage({
 scene,sourceGLBSha256,steps=20
}={}){
 const audit=auditAIGReal3DV107Source(scene,sourceGLBSha256);
 if(!Number.isInteger(steps)||steps<2||steps>1000)
  fail('INCREMENTAL_STAGE_STEP_BUDGET');
 let current=0,cancelled=false;
 const slice=(n,axes={})=>{
  if(scene.revision!==audit.sourceSceneRevision)
   fail('SOURCE_CHANGED_RESTART_PROGRESSIVE_DRAW');
  return planAIGReal3DV107FiveAxis({
   scene,sourceGLBSha256,sourceAudit:audit,
   ...axes,footHeadProgress:n/steps});
 };
 return {
  schema:'AIG_REAL3D_V107_INCREMENTAL_FOOT_HEAD_STAGES_V1',
  steps,sourceGLBSha256,
  current:()=>current,
  cancelled:()=>cancelled,
  reset:()=>{current=0;cancelled=false;return slice(0);},
  cancel:()=>{cancelled=true;return {
   status:'FOOT_HEAD_DRAW_CANCELLED',lastCompletedStep:current,
   originalSourceUnmodified:true};},
  resume:()=>{cancelled=false;return slice(current);},
  step:(axes={})=>{
   if(cancelled)return {status:'BLOCK_CANCELLED_MUST_RESUME',
    lastCompletedStep:current,sourceUnmodified:true};
   current=Math.min(steps,current+1);
   return {status:current===steps?'FOOT_HEAD_REVEAL_COMPLETE':
    'FOOT_HEAD_REVEAL_IN_PROGRESS',step:current,
    ...slice(current,axes)};
  },
  jump:(progress,axes={})=>{
   if(!finite(progress)||progress<0||progress>1)
    fail('PROGRESS_OUT_OF_RANGE');
   current=Math.round(progress*steps);
   cancelled=false;
   return {status:'FOOT_HEAD_PREVIEW_JUMP',step:current,
    ...slice(current,axes)};
  },
  sourceAudit:audit};
}
