/**
 * Geometry-first Real3D diagnosis. Computes ORIGINAL transformed XYZ AABB,
 * not inferred weight, sex, likeness, fatness or anatomical approval.
 * It deliberately DOES NOT smooth, subdivide, morph, or synthesize a human.
 */
import {getAIG3DWorldMatrix} from './aig-real3d-core.mjs';
export const AIG_INSPECTION_FRAME_SCHEMA='AIG_REAL3D_FRAME_GEOMETRY_FIRST_V1';
const number=x=>typeof x==='number'&&Number.isFinite(x);
const positive=n=>number(n)&&n>0;
const xform=(m,p)=>[
 m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
 m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],
 m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]
];
export function auditAIG3DSourceSilhouette(scene){
 if(!scene||scene.schema!=='AIG_REAL3D_SCENE_V1'||!Array.isArray(scene.nodes))
  throw Error('FRAME_SCENE_INVALID');
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 let vertices=0,triangles=0;
 for(const node of scene.nodes){
  if(!node.visible)continue;
  const xyz=node.mesh?.positions,inds=node.mesh?.indices;
  if(!Array.isArray(xyz)||xyz.length%3||!Array.isArray(inds))
   throw Error('FRAME_SCENE_MESH_INVALID');
  const world=getAIG3DWorldMatrix(scene,node.id);
  for(let i=0;i<xyz.length;i+=3){
   const p=xform(world,xyz.slice(i,i+3));
   for(let k=0;k<3;k++){
    if(!number(p[k]))throw Error('FRAME_NONFINITE');
    lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);
   }
   vertices++;
  }
  triangles+=inds.length/3;
 }
 const spread=hi.map((x,i)=>x-lo[i]);
 if(!positive(spread[1])||!positive(spread[0])||!positive(spread[2]))
  throw Error('FRAME_ZERO_AXIS_BOUNDS');
 return {
  schema:AIG_INSPECTION_FRAME_SCHEMA,
  sourceSceneId:scene.id,
  sourceVertices:vertices,sourceTriangles:triangles,
  min:lo,max:hi,
  boundingMeters:{widthX:spread[0],heightY:spread[1],depthZ:spread[2]},
  frontProjectedWidthHeightRatio:spread[0]/spread[1],
  sideProjectedDepthHeightRatio:spread[2]/spread[1],
  useOrthographicForProportionReview:true,
  theseAreBoundingBoxRatiosNotAnthropometricMeasurements:true,
  meshAltered:false,postProcessBloomApplied:false,
  anatomicalVisualApproval:false,
  sourceAuthenticityVerified:false,
  strictReleaseGate:'BLOCK_PENDING_REAL_HUMAN_SOURCE_AND_VISUAL_REVIEW'
 };
}
export function validateAIGInspectionCapturePlan({
 heightMeters,angle='front',mode='SILHOUETTE'
}={}){
 if(!positive(heightMeters)||heightMeters<.05||heightMeters>20)
  throw Error('FRAME_HEIGHT_RANGE');
 if(!['front','side','back','threeQuarter'].includes(angle))
  throw Error('FRAME_CAMERA_ANGLE');
 if(!['LIT','SILHOUETTE','NORMALS','ALBEDO'].includes(mode))
  throw Error('FRAME_INSPECTION_MODE');
 return {
  mode,angle,camera:{
   projection:'orthographic',
   yaw:{front:Math.PI,side:Math.PI/2,back:0,threeQuarter:Math.PI*1.25}[angle],
   pitch:0,distance:4,
   focus:[0,heightMeters/2,0],
   orthoSpan:heightMeters*1.17,near:.01,far:20000,
   fovDeg:40
  },
  geometryFirst:true,disableBloom:true,
  stableCameraAndSourceRequired:true,
  perspectiveDistortionDisabled:true
 };
}
