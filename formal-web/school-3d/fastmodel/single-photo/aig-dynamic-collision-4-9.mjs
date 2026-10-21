/** FastModel 4.9 — actual posed triangle/triangle contact-risk audit.
 * SAT narrow phase of two skinned technical GLB meshes. This is sampled
 * surface intersection QA, NOT strand physics, human skin or continuous-time proof.
 */
import {AnimationMixer,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AIG48_SCHEMA,exportAIG48GLB} from './aig-skin-motion-4-8.mjs';

export const AIG49_SCHEMA='AIG_FASTMODEL_4_9_POSED_SURFACE_TRIANGLE_QA_DRAFT';
const isFiniteNumber=n=>typeof n==='number'&&Number.isFinite(n);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=a=>Math.hypot(...a);
const triEdges=t=>[sub(t[1],t[0]),sub(t[2],t[1]),sub(t[0],t[2])];
const bounds=t=>({
 min:[0,1,2].map(k=>Math.min(t[0][k],t[1][k],t[2][k])),
 max:[0,1,2].map(k=>Math.max(t[0][k],t[1][k],t[2][k]))
});
const boxTouches=(a,b,e)=>[0,1,2].every(k=>a.max[k]+e>=b.min[k]&&b.max[k]+e>=a.min[k]);
const validTriangle=t=>Array.isArray(t)&&t.length===3&&t.every(p=>Array.isArray(p)&&p.length===3&&p.every(isFiniteNumber));
function project(t,axis){
 let low=Infinity,high=-Infinity;
 for(const p of t){const d=dot(p,axis);low=Math.min(low,d);high=Math.max(high,d);}
 return [low,high];
}
/** True if two nondegenerate closed triangle surfaces touch or intersect.
 * Separation axes include normals, edge-edge cross axes and coplanar in-plane
 * edge normals; inclusive epsilon is explicitly only a contact tolerance.
 */
export function triangleSurfaceContact(a,b,{epsilon=1e-8}={}){
 if(!validTriangle(a)||!validTriangle(b)||!isFiniteNumber(epsilon)||epsilon<0||epsilon>.01)
  throw Error('AIG49_TRIANGLE_INPUT_INVALID');
 const ea=triEdges(a),eb=triEdges(b),na=cross(ea[0],ea[1]),nb=cross(eb[0],eb[1]);
 if(length(na)<1e-12||length(nb)<1e-12)throw Error('AIG49_DEGENERATE_TRIANGLE');
 if(!boxTouches(bounds(a),bounds(b),epsilon))return false;
 const axes=[na,nb];
 for(const x of ea)for(const y of eb)axes.push(cross(x,y));
 // Zero-thickness, coplanar triangles also need in-plane edge normals.
 if(length(cross(na,nb))<=1e-8*length(na)*length(nb)){
  for(const edge of [...ea,...eb])axes.push(cross(na,edge));
 }
 for(const axis of axes){
  const n=length(axis);if(n<1e-12)continue;
  const [al,ah]=project(a,axis),[bl,bh]=project(b,axis);
  if(ah+epsilon*n<bl||bh+epsilon*n<al)return false;
 }
 return true;
}
function posedTriangleData(mesh){
 const positions=[],point=new Vector3(),pos=mesh.geometry.getAttribute('position');
 const ix=mesh.geometry.index;
 if(!pos||!ix||ix.count%3!==0)throw Error('AIG49_INDEXED_SKIN_REQUIRED');
 for(let i=0;i<pos.count;i++){
  mesh.getVertexPosition(i,point);point.applyMatrix4(mesh.matrixWorld);
  const p=[point.x,point.y,point.z];
  if(!p.every(isFiniteNumber))throw Error('AIG49_POSED_VERTEX_NAN');
  positions.push(p);
 }
 const triangles=[];
 for(let i=0;i<ix.count;i+=3){
  const indices=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];
  const t=indices.map(k=>positions[k]);
  if(!validTriangle(t))throw Error('AIG49_FACE_INVALID');
  const e=triEdges(t);
  if(length(cross(e[0],e[1]))<1e-12)throw Error('AIG49_COLLAPSED_FACE');
  triangles.push({vertices:t,box:bounds(t),face:i/3});
 }
 return {triangles,vertices:pos.count};
}
export function auditSurfacePair(head,tail,{epsilon=1e-7,pairBudget=250000,maxExamples=8}={}){
 if(!Array.isArray(head)||!Array.isArray(tail)||!Number.isInteger(pairBudget)||pairBudget<1||
    !Number.isInteger(maxExamples)||maxExamples<0||!isFiniteNumber(epsilon)||epsilon<0||epsilon>.01)
  throw Error('AIG49_PAIR_BUDGET_INVALID');
 if(head.length*tail.length>pairBudget)throw Error('AIG49_PAIR_BUDGET_EXCEEDED');
 let candidates=0,contacts=0,checkedPairs=0;
 const examples=[];
 for(let i=0;i<head.length;i++){
  const a=head[i],va=a.vertices||a,ab=a.box||bounds(va);
  for(let j=0;j<tail.length;j++){
   checkedPairs++;
   const b=tail[j],vb=b.vertices||b,bb=b.box||bounds(vb);
   if(!boxTouches(ab,bb,epsilon))continue;
   candidates++;
   if(triangleSurfaceContact(va,vb,{epsilon})){
    contacts++;
    if(examples.length<maxExamples)examples.push({headFace:a.face??i,tailFace:b.face??j});
   }
  }
 }
 return {testedFacePairs:checkedPairs,broadPhaseCandidates:candidates,
  confirmedSurfaceContactPairs:contacts,examples,
  sampledSurfaceIntersectionFree:contacts===0};
}
/** Fully fail closed when a geometry budget or GLB source validation fails.
 * Complete 15-frame sampling, exact surface contact tests at those instants;
 * unseen intermediate times, alpha hair strands and self-intersections not tested.
 */
export async function auditAIG49DynamicContacts(draft,{sampleTimes=[0,.5,1,1.5,2],
 pairBudget=250000,totalBudget=2000000,epsilon=1e-7}={}){
 if(draft?.schema!==AIG48_SCHEMA||!Array.isArray(draft.sourceSHA256)||!draft.sourceSHA256.length)
  throw Error('AIG49_VERIFIED_4_8_RIG_REQUIRED');
 if(!Array.isArray(sampleTimes)||sampleTimes.length!==5||
    sampleTimes.some((t,i)=>!isFiniteNumber(t)||t<0||t>2||(i&&t<=sampleTimes[i-1]))||
    !Number.isInteger(totalBudget)||totalBudget<1)
  throw Error('AIG49_FRAME_BUDGET_INVALID');
 const glb=exportAIG48GLB(draft);
 const loaded=await new GLTFLoader().parseAsync(glb.bytes.buffer,'');
 const meshes=[];loaded.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
 const head=meshes.find(o=>o.name==='AIG48_headNeck');
 const hair=meshes.find(o=>o.name==='AIG48_ponytail');
 if(!head||!hair||meshes.length!==2||loaded.animations.length!==3)
  throw Error('AIG49_EXPECTED_SKINNED_COMPONENTS_MISSING');
 const mixer=new AnimationMixer(loaded.scene);
 const summary=[];let totalPairs=0,totalContacts=0,totalCandidates=0;
 for(const clip of loaded.animations){
  mixer.stopAllAction();mixer.uncacheRoot(loaded.scene);
  const action=mixer.clipAction(clip);action.play();
  const frames=[];
  for(const seconds of sampleTimes){
   mixer.setTime(seconds);
   loaded.scene.updateMatrixWorld(true);
   for(const m of meshes)m.skeleton.update();
   const h=posedTriangleData(head),p=posedTriangleData(hair);
   const result=auditSurfacePair(h.triangles,p.triangles,{pairBudget,epsilon});
   totalPairs+=result.testedFacePairs;totalCandidates+=result.broadPhaseCandidates;
   totalContacts+=result.confirmedSurfaceContactPairs;
   if(totalPairs>totalBudget)throw Error('AIG49_TOTAL_PAIR_BUDGET_EXCEEDED');
   frames.push({seconds,headTriangles:h.triangles.length,
    ponytailTriangles:p.triangles.length,...result});
  }
  action.stop();
  summary.push({clip:clip.name,frames,posesChecked:frames.length,
   confirmedSurfaceContactPairs:frames.reduce((n,f)=>n+f.confirmedSurfaceContactPairs,0)});
 }
 return {schema:AIG49_SCHEMA,sourceSHA256:[...draft.sourceSHA256],
  glbSource:'AIG48_TECHNICAL_SKINNED_GLB',glbByteLength:glb.bytes.length,
  auditedClips:summary,posesChecked:summary.reduce((sum,c)=>sum+c.posesChecked,0),
  testedFacePairs:totalPairs,broadPhaseCandidates:totalCandidates,
  confirmedSurfaceContactPairs:totalContacts,
  sampledSurfaceIntersectionFree:totalContacts===0,
  exactTriangleTriangleAtSampleTimes:true,
  physicallySimulatedHair:false,continuousTimeCollisionFreeProven:false,
  hairRootSelfIntersectionVerified:false,realPhotoIdentityVerified:false,
  fullBodySkinVerified:false,nativeAndroidWindowsFpsVerified:false,
  formalCharacterReleaseAllowed:false};
}
