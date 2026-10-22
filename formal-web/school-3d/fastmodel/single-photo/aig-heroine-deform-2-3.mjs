/**
 * AIG FastModel Real3D 2.3 — ACTUAL skinned-mesh influence data computed
 * from the reviewed 7.15 front surface and THREE user-placed 2D joints.
 * Each source hair/face/neck/garment mesh keeps original RGB and topology.
 *
 * No hallucinated back surface, real-world millimetres, autolearned weights,
 * realistic human anatomy, invisible limbs or physical cloth simulation.
 */
import {AIG715_SCHEMA} from './aig-heroine-candidate-7-15.mjs';
export const AIG23_SCHEMA='AIG_REAL3D_2_3_REVIEWED_FRONT_SURFACE_SKIN_DRAFT';
const fail=s=>{throw Error('AIG23_'+s)};
const OK=/^sha256:[a-f0-9]{64}$/;
const BONES=['chest','neck','head'];
const regionAnchors={
 HAIR:['head','neck'],FACE:['head','neck'],NECK:['neck','chest'],
 SKIN:['neck','chest'],JACKET:['chest','neck'],SHIRT:['chest','neck'],
 SKIRT:['chest','neck'],BAG:['chest','neck'],ACCESSORY:['head','chest']
};
const xyz=j=>[j.x-.5,.5-j.y,0];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function buildAIG23DeformationPlan(candidate,{headAngleDegrees=14,
 requireConfirmed=false}={}){
 if(candidate?.schema!==AIG715_SCHEMA||
  !OK.test(candidate.sourceDigest||'')||
  !Array.isArray(candidate.skeletonCandidate)||
  !candidate.geometryGroups||!Number.isFinite(headAngleDegrees)||
  Math.abs(headAngleDegrees)>22)
  fail('REVIEWED_SOURCE_DIGEST_AND_BOUNDED_ACTION_REQUIRED');
 const joints=new Map(candidate.skeletonCandidate.map(j=>[j.name,j]));
 for(const name of BONES){
  const j=joints.get(name);
  if(!j||requireConfirmed&&!j.confirmed||!Number.isFinite(j.x)||!Number.isFinite(j.y)||
   j.x<0||j.x>1||j.y<0||j.y>1)
   fail('HEAD_NECK_CHEST_USER_CONFIRMED_JOINTS_REQUIRED');
 }
 // Need a useful, anatomically ordered joint chain. Reject zero segments
 // and impossible upside-down assignments instead of quietly bending mesh.
 const chest=xyz(joints.get('chest')),neck=xyz(joints.get('neck')),
  head=xyz(joints.get('head'));
 if(!(chest[1]+.02<neck[1]&&neck[1]+.02<head[1])||
  distance(chest,neck)<.025||distance(neck,head)<.025)
  fail('HEAD_NECK_CHEST_AXIS_NOT_ANATOMICALLY_ORDERED');
 const groups={},boneLocations=[chest,neck,head];
 let meshes=0,vertexCount=0,originalTriangles=0;
 for(const [name,mesh] of Object.entries(candidate.geometryGroups)){
  if(!regionAnchors[name]||!mesh?.triangles)continue;
  const n=mesh.positions?.length/3;
  if(!Number.isSafeInteger(n)||n<3||n>900000||
   mesh.uv?.length!==n*2||mesh.rgb?.length!==n*3||
   mesh.confidence?.length!==n||mesh.triangles*3!==n)
   fail('SOURCE_TOPOLOGY_OR_VERTEX_COLOR_MISMATCH');
  const choices=regionAnchors[name],
   first=BONES.indexOf(choices[0]),second=BONES.indexOf(choices[1]);
  if(first<0||second<0)fail('UNMAPPED_SOURCE_MASK_PART');
  const indices=new Uint16Array(n*4),weights=new Float32Array(n*4);
  for(let i=0;i<n;i++){
   const base=i*3,p=[mesh.positions[base],mesh.positions[base+1]];
   if(!p.every(Number.isFinite)||!Number.isFinite(mesh.positions[base+2]))
    fail('NONFINITE_SOURCE_GEOMETRY');
   const a=boneLocations[first],b=boneLocations[second];
   // Bounded inverse-distance TWO-BONE blend on existing visible source
   // vertices. This is a geometric draft, not estimated anatomy ML.
   const wa=1/Math.max(.025,distance(p,a)),wb=1/Math.max(.025,distance(p,b));
   let primary=wa/(wa+wb);
   if(name==='FACE'||name==='HAIR')primary=Math.max(.72,primary);
   if(name==='SHIRT'||name==='JACKET')primary=Math.max(.76,primary);
   const ofs=i*4;
   indices[ofs]=first;indices[ofs+1]=second;
   weights[ofs]=primary;weights[ofs+1]=1-primary;
   if(Math.abs(weights[ofs]+weights[ofs+1]-1)>1e-5)
    fail('WEIGHTS_NOT_NORMALIZED');
  }
  groups[name]={skinIndex:indices,skinWeight:weights,
   vertexCount:n,triangles:mesh.triangles,maskPart:name,
   preserveOriginalRGB:true,sourceCategory:mesh.category,
   physicalThicknessKnown:false};
  meshes++;vertexCount+=n;originalTriangles+=mesh.triangles;
 }
 if(!meshes||!groups.HAIR&&!groups.FACE&&!groups.NECK)
  fail('VISIBLE_HEAD_NECK_FACE_GEOMETRY_REQUIRED');
 if(vertexCount>900000)fail('MAX_SKIN_VERTEX_BUDGET');
 return Object.freeze({
  schema:AIG23_SCHEMA,sourceDigest:candidate.sourceDigest,
  sourceSchema:candidate.schema,joints:BONES.map((name,i)=>({
   name,worldXY:boneLocations[i].slice(0,2),
   position:boneLocations[i],
   parent:i===0?null:BONES[i-1],
   userConfirmed:Boolean(joints.get(name)?.confirmed),depthMM:null
  })),groups,
  meshes,vertexCount,triangles:originalTriangles,
  requestedHeadAngleDegrees:headAngleDegrees,
  reviewRequired:BONES.filter(name=>!joints.get(name)?.confirmed),
  autoInitialisedFrom7_15DraftJointHints:true,
  originalGeometryColorPreserved:true,
  onlyObservedFrontSurface:true,
  geometryUnits:'SINGLE_IMAGE_RELATIVE_NOT_MM',
  measuredStereoDataRemainsSeparate:true,
  actualSkinnedMeshVerticesWillDeform:true,
  rigAndWeightsAreUserGuidedEstimatesNotAnatomyProof:true,
  noAutomaticHumanWalkOrJump:true,
  originalSourceUnmodified:true
 });
}
export function verifyAIG23Plan(plan,candidate){
 if(plan?.schema!==AIG23_SCHEMA||plan.sourceDigest!==candidate?.sourceDigest)
  fail('SOURCE_DIGEST_CHANGED');
 const fresh=buildAIG23DeformationPlan(candidate,{
  headAngleDegrees:plan.requestedHeadAngleDegrees});
 if(plan.meshes!==fresh.meshes||plan.vertexCount!==fresh.vertexCount||
  plan.triangles!==fresh.triangles||
  JSON.stringify(plan.joints)!==JSON.stringify(fresh.joints))
  fail('RIG_CANDIDATE_CHANGED_REBUILD_REQUIRED');
 return true;
}
