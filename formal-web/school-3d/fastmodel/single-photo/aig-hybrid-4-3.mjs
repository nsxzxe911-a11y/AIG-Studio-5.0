/** AIG FastModel 4.3: local rig-first analytic limb controller.
 * Pure AIG geometry. No third-party model/inference, no network and zero credits.
 * The joint positions are HYPOTHESES from a 2D silhouette, not verified anatomy.
 * Only the edited body part's low-poly patch is invalidated and regenerated.
 */
import {sdCapsule} from './aig-sdf-4-1.mjs';
export const AIG43_SCHEMA='AIG_FASTMODEL_4_3_HYBRID_NATIVE_RIG_DRAFT';
export const AIG43_PARTS=Object.freeze(['leftArm','rightArm','leftLeg','rightLeg']);
const safeNumber=n=>typeof n==='number'&&Number.isFinite(n);
const bounded=(n,lo,hi)=>safeNumber(n)&&n>=lo&&n<=hi;
const radians=degrees=>degrees*Math.PI/180;
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const endpoint=(a,len,theta)=>add(a,[Math.sin(theta)*len,-Math.cos(theta)*len,0]);
const isHash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
const clone=v=>JSON.parse(JSON.stringify(v));
const frozenMetadata=Object.freeze({inferredUnknownAnatomy:true,sourceLandmarksVerified:false,
 photorealHeroineApproved:false,realSkinWeightsPresent:false,
 downloadedThirdPartyWeights:false,noCreditsSpent:true,releaseAllowed:false});
export function createRig(scaffold){
 if(!isHash(scaffold?.sourceSHA256)||scaffold?.schema!=='AIG_FASTMODEL_NATIVE_4_0_GEOMETRIC_VOLUME_DRAFT'||
 !Array.isArray(scaffold?.proportions?.ratiosByImageHeight)||scaffold.proportions.ratiosByImageHeight.length!==11)
  throw Error('AIG43_SOURCE_BOUND_SCAFFOLD_REQUIRED');
 const bands=scaffold.proportions.ratiosByImageHeight;
 if(!bands.every(p=>bounded(p.widthRatio,0,2)))throw Error('AIG43_BAD_PROPORTIONS');
 const sh=Math.max(.09,Math.min(.25,(bands[2].widthRatio+bands[3].widthRatio)*.29));
 const hip=Math.max(.09,Math.min(.25,bands[5].widthRatio*.32));
 const armLen=Math.max(.085,Math.min(.25,sh*.96));
 const legLen=.18;
 const rig={
  schema:AIG43_SCHEMA,sourceSHA256:scaffold.sourceSHA256,
  referenceScale:'NORMALIZED_FROM_FRONT_2D_SILHOUETTE',
  armUpperLength:armLen*.52,armLowerLength:armLen*.52,
  legUpperLength:legLen*.94,legLowerLength:legLen*.96,
  shoulder:sh,hip,
  angles:{leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},
  metadata:{...frozenMetadata}
 };
 return rig;
}
export function jointPositions(rig){
 if(!rig||rig.schema!==AIG43_SCHEMA||!isHash(rig.sourceSHA256))
  throw Error('AIG43_RIG_INVALID');
 const sh=rig.shoulder,hip=rig.hip,angles=rig.angles;
 const positions={};
 for(const part of AIG43_PARTS){
  const left=part.startsWith('left'),arm=part.endsWith('Arm');
  const side=left?-1:1;
  // Each limb consists of two continuous capsules. Elbow/knee is shared by
  // both segments; animation does not tear the connection apart.
  const root=arm?[side*sh*.95,.18,0]:[side*hip*.45,-.10,0];
  const theta=radians(angles[part]*side);
  const upper=arm?rig.armUpperLength:rig.legUpperLength;
  const lower=arm?rig.armLowerLength:rig.legLowerLength;
  const pivot=endpoint(root,upper,theta);
  const tip=endpoint(pivot,lower,theta);
  positions[part]={root,pivot,tip,confidence:'INFERRED_2D_POSE_ONLY'};
 }
 return positions;
}
export function poseUniforms(rig){
 const joints=jointPositions(rig),arms=[],legs=[];
 for(const p of ['leftArm','rightArm']){arms.push(...joints[p].pivot,...joints[p].tip);}
 for(const p of ['leftLeg','rightLeg']){legs.push(...joints[p].pivot,...joints[p].tip);}
 return {arms:new Float32Array(arms),legs:new Float32Array(legs)};
}
export function limbField(point,rig,part){
 if(!Array.isArray(point)||point.length!==3||!point.every(safeNumber)||!AIG43_PARTS.includes(part))
  throw Error('AIG43_FIELD_ARGUMENTS_INVALID');
 const p=jointPositions(rig)[part],r=part.endsWith('Arm')?Math.max(.025,rig.shoulder*.23):
  Math.max(.032,rig.hip*.32);
 return Math.min(sdCapsule(point,p.root,p.pivot,r),sdCapsule(point,p.pivot,p.tip,r));
}
export class Aig43RigController{
 constructor(rig){
  if(!rig||rig.schema!==AIG43_SCHEMA)throw Error('AIG43_RIG_INVALID');
  this.rig=clone(rig);
  this.revision=0;
  this.partRevisions=Object.fromEntries(AIG43_PARTS.map(p=>[p,0]));
 }
 setAngle(part,degrees){
  if(!AIG43_PARTS.includes(part)||!bounded(degrees,-55,55))
   throw Error('AIG43_JOINT_LIMIT');
  if(this.rig.angles[part]===degrees)return {changed:false,part,revision:this.revision};
  this.rig.angles[part]=degrees;
  this.revision++;
  this.partRevisions[part]++;
  return {changed:true,part,revision:this.revision,partRevision:this.partRevisions[part]};
 }
 reset(part){
  if(!AIG43_PARTS.includes(part))throw Error('AIG43_PART_INVALID');
  return this.setAngle(part,0);
 }
 state(){return {...clone(this.rig),revision:this.revision,
  partRevisions:{...this.partRevisions}};}
}
function patchFor(a,b,r,sides=8){
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
 const length=Math.hypot(dx,dy,dz);
 if(length<1e-6)throw Error('AIG43_DEGENERATE_SEGMENT');
 const axis=[dx/length,dy/length,dz/length];
 const seed=Math.abs(axis[1])<.95?[0,1,0]:[1,0,0];
 const cross=(v,w)=>[v[1]*w[2]-v[2]*w[1],v[2]*w[0]-v[0]*w[2],v[0]*w[1]-v[1]*w[0]];
 const normal=cross(axis,seed),mag=Math.hypot(...normal);
 const u=normal.map(x=>x/mag),v=cross(axis,u);
 const vertices=[],triangles=[];
 for(const origin of [a,b])for(let j=0;j<sides;j++){
  const theta=j*2*Math.PI/sides;
  vertices.push(...origin.map((x,i)=>x+r*(u[i]*Math.cos(theta)+v[i]*Math.sin(theta))));
 }
 for(let j=0;j<sides;j++){
  const next=(j+1)%sides;
  triangles.push(j,next,j+sides,next,next+sides,j+sides);
 }
 // Capped frustum preview patch (not the articulated final skin).
 for(let j=1;j<sides-1;j++){
  triangles.push(0,j+1,j);
  triangles.push(sides,sides+j,sides+j+1);
 }
 return {vertices,triangles};
}
export function makeLimbPatch(rig,part){
 if(!AIG43_PARTS.includes(part))throw Error('AIG43_PART_INVALID');
 const p=jointPositions(rig)[part],r=part.endsWith('Arm')?
  Math.max(.025,rig.shoulder*.23):Math.max(.032,rig.hip*.32);
 const a=patchFor(p.root,p.pivot,r),b=patchFor(p.pivot,p.tip,r);
 const offset=a.vertices.length/3;
 return {part,sourceSHA256:rig.sourceSHA256,
  vertices:new Float32Array([...a.vertices,...b.vertices]),
  indices:new Uint16Array([...a.triangles,...b.triangles.map(x=>x+offset)]),
  isTechnicalPatch:true,skinned:false,photorealApproved:false};
}
export class Aig43PatchCache{
 constructor({maxEntries=8}={}){
  if(!Number.isInteger(maxEntries)||maxEntries<4||maxEntries>128)throw Error('AIG43_CACHE_LIMIT');
  this.maxEntries=maxEntries;this.entries=new Map();this.hits=0;this.misses=0;
  this.lastSourceSHA=null;
 }
 get(controller,part){
  if(!AIG43_PARTS.includes(part))throw Error('AIG43_PART_INVALID');
  const rig=controller?.rig;
  if(!isHash(rig?.sourceSHA256))throw Error('AIG43_SOURCE_UNVERIFIED');
  if(this.lastSourceSHA!==rig.sourceSHA256){
   this.entries.clear();this.lastSourceSHA=rig.sourceSHA256;
  }
  const key=rig.sourceSHA256+'|'+part+'|'+controller.partRevisions[part];
  if(this.entries.has(key)){
   const value=this.entries.get(key);this.entries.delete(key);this.entries.set(key,value);
   this.hits++;return {mesh:value,cacheHit:true};
  }
  // Only edited part revision gets new geometry. Other part cache keys stay stable.
  for(const old of this.entries.keys())if(old.startsWith(rig.sourceSHA256+'|'+part+'|'))
   this.entries.delete(old);
  const mesh=makeLimbPatch(rig,part);
  this.entries.set(key,mesh);this.misses++;
  while(this.entries.size>this.maxEntries)this.entries.delete(this.entries.keys().next().value);
  return {mesh,cacheHit:false};
 }
 invalidateAll(){this.entries.clear();this.lastSourceSHA=null;}
 report(){return {schema:AIG43_SCHEMA,entries:this.entries.size,hits:this.hits,
  misses:this.misses,sourceSHA256:this.lastSourceSHA,
  cacheDoesNotProveFPS:true,heroineMeshApproved:false,noCreditsSpent:true};}
}
