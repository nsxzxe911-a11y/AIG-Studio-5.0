/**
 * V105 CNC original metric adapter: V96 native 4K source auditor expects
 * physical METERS, while real CNC models are naturally stored in MM.
 * Convert ROOT transforms into an immutable equivalent metric viewport
 * only, NEVER rescale/rewrite the user's original GLB meshes or source SHA.
 */
export const AIG_REAL3D_V105_METRIC_SCHEMA='AIG_REAL3D_V105_CNC_MM_TO_4K_METERS_WORKING_SCENE_V1';
const fail=x=>{throw Error('REAL3D_V105_METRIC_'+x);};
export function createAIGReal3DMetric4KWorkingScene(scene){
 if(scene?.schema!=='AIG_REAL3D_SCENE_V1'||!['MM','METERS'].includes(scene.units)||
  !Array.isArray(scene.nodes)||scene.nodes.length<1||scene.nodes.length>128)
  fail('REAL_SOURCE_SCENE_REQUIRED');
 if(scene.units==='METERS')return {schema:AIG_REAL3D_V105_METRIC_SCHEMA,
  scene,scaleApplied:1,originalMeshDataNeverModified:true,
  actualPhysicalWorldScalePreserved:true,
  releasePASS:false};
 const copy={...scene,units:'METERS',nodes:scene.nodes.map(node=>{
  if(!node.mesh?.actualXYZTriangles||!node.transform||
   !Array.isArray(node.transform.position)||!Array.isArray(node.transform.scale))
   fail('REAL_TRIANGLES_AND_TRANSFORMS_REQUIRED');
  const root=node.parentId===null;
  return {...node,mesh:node.mesh,
   transform:{...node.transform,
    position:node.transform.position.map(v=>root?v*.001:v),
    rotationDeg:[...node.transform.rotationDeg],
    scale:node.transform.scale.map(v=>root?v*.001:v)}
  };
 })};
 return {schema:AIG_REAL3D_V105_METRIC_SCHEMA,scene:copy,
  scaleApplied:.001,
  originalMeshDataNeverModified:true,
  originalMMSourceSceneNotMutated:true,
  trueSourceIndexedTriangleCountsPreserved:true,
  actualPhysicalWorldScalePreserved:true,
  releasePASS:false};
}
export function createAIGReal3DMetric4KCamera(camera,{sceneUnits='MM'}={}){
 if(!camera||!['MM','METERS'].includes(sceneUnits)||
  !Array.isArray(camera.focus)||camera.focus.length!==3||
  !camera.focus.every(Number.isFinite)||!
  [camera.orthoSpan,camera.distance,camera.fovDeg,camera.yaw,camera.pitch]
   .every(Number.isFinite))
  fail('SOURCE_CAMERA_REQUIRED');
 const scale=sceneUnits==='MM'?.001:1;
 return {...camera,focus:camera.focus.map(v=>v*scale),
  orthoSpan:camera.orthoSpan*scale,distance:camera.distance*scale};
}
