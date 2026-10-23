/**
 * Real3D 3.9 — deform interchangeable garment geometry from actual 3.1
 * rest-body -> posed-body source vertex displacements. No re-scan, new GLB,
 * 2D billboard, physical cloth simulation, or fabricated 12000 GPU cores.
 */
export const AIG39_GARMENT_POSE_SCHEMA='AIG_REAL3D_3_9_ATTACHED_GARMENT_VERTEX_MOTION';
const fail=s=>{throw Error('AIG39_GARMENT_'+s)};
export function deformAIG39AttachedGarment({
 garmentRest,bodyRest,bodyPosed,sourceVertexIndices
}={}){
 if(!(garmentRest instanceof Float32Array)||
  !(bodyRest instanceof Float32Array)||
  !(bodyPosed instanceof Float32Array)||
  !(sourceVertexIndices instanceof Uint32Array)||
  bodyRest.length!==bodyPosed.length||
  bodyRest.length%3!==0||garmentRest.length%3!==0||
  sourceVertexIndices.length*3!==garmentRest.length)
  fail('ATTACHMENT_AND_BODY_GEOMETRY_REQUIRED');
 const vertexCount=garmentRest.length/3,
  bodyCount=bodyRest.length/3,
  result=new Float32Array(garmentRest.length);
 let moved=0,maxMove=0;
 for(let i=0;i<vertexCount;i++){
  const idx=sourceVertexIndices[i];
  if(idx>=bodyCount)fail('SOURCE_VERTEX_INDEX_OUTSIDE_BODY');
  const a=i*3,b=idx*3;
  let movedLocal=0;
  for(let k=0;k<3;k++){
   const delta=bodyPosed[b+k]-bodyRest[b+k];
   if(!Number.isFinite(delta))fail('NONFINITE_BODY_POSE');
   result[a+k]=garmentRest[a+k]+delta;
   movedLocal+=delta*delta;
  }
  const d=Math.sqrt(movedLocal);
  if(d>1e-7)moved++;
  maxMove=Math.max(maxMove,d);
 }
 return Object.freeze({schema:AIG39_GARMENT_POSE_SCHEMA,
  positions:result,actualGarmentVerticesMoved:moved,
  garmentVertexCount:vertexCount,maxSourceAnchorDisplacement:maxMove,
  referencedRealSourceBodyVertices:true,restGarmentUnchanged:true,
  restBodyUnchanged:true,bodyPosedUnchanged:true,
  clothSelfCollisionVerified:false,garmentSkinWeightsFullRigVerified:false,
  accurateSkirtHemPhysicsVerified:false,
  trueWardrobeFollowsActualRig:moved>0
 });
}
