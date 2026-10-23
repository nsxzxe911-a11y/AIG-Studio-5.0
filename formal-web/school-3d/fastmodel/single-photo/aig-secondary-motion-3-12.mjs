/**
 * Real3D 3.12 — deterministic secondary movement for independently
 * attached real skirt/hairstyle 3D vertices. Lightweight spring/damping
 * after the 3.1 body pose, before 3.11 collision projection.
 *
 * Constraints:
 * - GPU remains the original ONE renderer (this module is CPU Float32).
 * - Position and velocity are bounded, not arbitrary ever-growing forces.
 * - Root vertices are pinned to the actual 3.9 body attachment target.
 * - A neutral/rest pose restores original geometry with zero velocity.
 * - No claim of FEM cloth, strand-level hair or full self collision.
 */
export const AIG312_SCHEMA='AIG_REAL3D_3_12_FIXED_STEP_SECONDARY_HAIR_SKIRT';
const fail=s=>{throw Error('AIG312_'+s)};
const MAX_DT=1/24;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const checkPositions=(p)=>p instanceof Float32Array&&
 p.length>8&&p.length%3===0&&p.every(Number.isFinite);
export function createAIG312SecondaryMotion({
 restPositions,bodyHeightUnits,kind='hair'
}={}){
 if(!checkPositions(restPositions)||!['hair','skirt'].includes(kind)||
  !Number.isFinite(bodyHeightUnits)||bodyHeightUnits<=0)
  fail('VALID_REST_GEOMETRY_REQUIRED');
 const rest=new Float32Array(restPositions),
  state=new Float32Array(rest),vel=new Float32Array(rest.length);
 let minY=Infinity,maxY=-Infinity;
 for(let i=1;i<rest.length;i+=3){
  minY=Math.min(minY,rest[i]);maxY=Math.max(maxY,rest[i]);
 }
 if(maxY-minY<1e-6)fail('SECONDARY_LAYER_HAS_NO_VERTICAL_SPAN');
 const height=maxY-minY;
 const weights=new Float32Array(rest.length/3);
 let pinned=0;
 for(let i=0;i<weights.length;i++){
  const t=clamp((maxY-rest[i*3+1])/height,0,1);
  // Top/root band follows the actual head/waist pose exactly.
  weights[i]=t<.13?0:Math.pow((t-.13)/.87,1.25);
  if(weights[i]===0)pinned++;
 }
 const maxDeparture=bodyHeightUnits*(kind==='hair'?.052:.032);
 const stiffness=kind==='hair'?105:80;
 const damping=kind==='hair'?17:20;
 let frames=0,lastMoved=0,largest=0;
 const reset=()=>{
  state.set(rest);vel.fill(0);frames=0;lastMoved=0;largest=0;
  return new Float32Array(state);
 };
 const step=({targetPositions,deltaSeconds=1/60,
  restoreRest=false}={})=>{
  if(!checkPositions(targetPositions)||
   targetPositions.length!==rest.length||
   !Number.isFinite(deltaSeconds)||deltaSeconds<=0||
   deltaSeconds>.25)fail('INVALID_STEP_TARGET_OR_DELTA');
  if(restoreRest){
   const positions=reset();
   return Object.freeze({schema:AIG312_SCHEMA,kind,positions,
    framesSimulated:0,changedVertices:0,actualMaxLagUnits:0,
    allRootVerticesPinned:true,stableRestPoseReturned:true,
    sourceAndTargetUnmodified:true,secondaryMovementActive:false,
    fullHairOrClothPhysicsCertified:false});
  }
  // Clamped catch-up: avoid a huge timestep after tab suspend/resume.
  const dt=Math.min(deltaSeconds,MAX_DT);
  const substeps=Math.max(1,Math.min(5,Math.ceil(dt/(1/120))));
  const h=dt/substeps,attenuation=Math.exp(-damping*h);
  const count=weights.length;
  let moved=0,lag=0;
  for(let sub=0;sub<substeps;sub++){
   for(let i=0;i<count;i++){
    const a=i*3,weight=weights[i];
    if(weight===0){
     for(let axis=0;axis<3;axis++){
      state[a+axis]=targetPositions[a+axis];
      vel[a+axis]=0;
     }
     continue;
    }
    const diff=[0,0,0];
    for(let axis=0;axis<3;axis++){
     // A small persistent gravity bias plus pose inertia. No wind/cloth
     // animation is faked when there is no actual body pose movement.
     const gravity=axis===1?bodyHeightUnits*.0035*weight:0;
     const target=targetPositions[a+axis]-gravity;
     vel[a+axis]=(vel[a+axis]+(target-state[a+axis])*stiffness*h)*
      attenuation;
     state[a+axis]+=vel[a+axis]*h;
     diff[axis]=state[a+axis]-targetPositions[a+axis];
    }
    const dis=Math.hypot(...diff);
    const cap=maxDeparture*weight;
    if(dis>cap){
     const factor=cap/dis;
     for(let axis=0;axis<3;axis++){
      state[a+axis]=targetPositions[a+axis]+diff[axis]*factor;
      vel[a+axis]*=.35;
     }
    }
   }
  }
  for(let i=0;i<count;i++){
   const a=i*3,d=Math.hypot(
    state[a]-targetPositions[a],
    state[a+1]-targetPositions[a+1],
    state[a+2]-targetPositions[a+2]);
   if(d>bodyHeightUnits*.00001)moved++;
   lag=Math.max(lag,d);
  }
  frames++;lastMoved=moved;largest=lag;
  return Object.freeze({schema:AIG312_SCHEMA,kind,
   positions:new Float32Array(state),framesSimulated:frames,
   changedVertices:moved,actualMaxLagUnits:lag,
   maxAllowedLagUnits:maxDeparture,
   truePinnedRootVertices:pinned,
   sourceAndTargetUnmodified:true,
   stableRestPoseReturned:false,secondaryMovementActive:moved>0,
   physicalClothSelfCollisionCertified:false,
   fullHairOrClothPhysicsCertified:false});
 };
 return Object.freeze({
  schema:AIG312_SCHEMA,kind,restVertexCount:weights.length,
  pinnedRootCount:pinned,step,reset,
  snapshot:()=>Object.freeze({framesSimulated:frames,
   lastChangedVertices:lastMoved,lastMaxLagUnits:largest,
   sourceRestGeometryUnmodified:true})
 });
}
