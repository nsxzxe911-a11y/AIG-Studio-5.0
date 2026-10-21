/** FastModel 5.1: real pose-sampled shoulder/neck seam + hair/body triangle contact QA.
 * Read-only against a separately parsed source GLB; no auto model editing.
 * Reports conservative sampled geometry; no continuous collision/strand physics claim.
 */
import {AnimationMixer,Vector3} from 'three';
import {aig50BoneRole} from './aig-fullbody-5-0.mjs';
import {triangleSurfaceContact} from './aig-dynamic-collision-4-9.mjs';

export const AIG51_SCHEMA='AIG_FASTMODEL_5_1_POSED_SEAM_HAIR_BODY_QA_DRAFT';
export const AIG51_REQUIRED_SEAMS=['chest:neck','head:neck','chest:leftUpperArm','chest:rightUpperArm'];
const finite=Number.isFinite;
const vsub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const area=t=>{const a=vsub(t[1],t[0]),b=vsub(t[2],t[0]);return Math.hypot(...cross(a,b))*.5;};
const bounds=t=>({min:[0,1,2].map(k=>Math.min(...t.map(p=>p[k]))),
 max:[0,1,2].map(k=>Math.max(...t.map(p=>p[k])))});
const overlap=(a,b,e)=>[0,1,2].every(k=>a.min[k]<=b.max[k]+e&&b.min[k]<=a.max[k]+e);
const key=(a,b)=>[a,b].sort().join(':');
function meshPositions(mesh,maxVertices){
 const pos=mesh.geometry?.getAttribute('position');
 if(!pos||pos.count<3||pos.count>maxVertices)throw Error('AIG51_VERTEX_BUDGET_OR_MISSING');
 const out=[],v=new Vector3();
 for(let i=0;i<pos.count;i++){
  if(mesh.isSkinnedMesh)mesh.getVertexPosition(i,v);
  else v.fromBufferAttribute(pos,i);
  v.applyMatrix4(mesh.matrixWorld);
  const p=[v.x,v.y,v.z];
  if(!p.every(finite))throw Error('AIG51_POSED_VERTEX_NONFINITE');
  out.push(p);
 }
 return out;
}
function meshTriangles(mesh,positions,maxTriangles){
 const index=mesh.geometry?.index;
 if(!index||index.count%3||index.count/3>maxTriangles)throw Error('AIG51_INDEXED_TRIANGLE_BUDGET');
 const out=[];
 for(let i=0;i<index.count;i+=3){
  const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
  if(!ids.every(k=>Number.isInteger(k)&&k>=0&&k<positions.length)||
    new Set(ids).size!==3)throw Error('AIG51_TRIANGLE_INDEX_INVALID');
  const t=ids.map(k=>positions[k]);
  const a=area(t);
  if(!finite(a)||a<1e-12)throw Error('AIG51_COLLAPSED_TRIANGLE');
  out.push({ids,vertices:t,box:bounds(t),area:a,face:i/3});
 }
 return out;
}
function faceSeamIndices(body){
 const n=body.geometry.getAttribute('position').count,skin=body.geometry.getAttribute('skinIndex'),
  weight=body.geometry.getAttribute('skinWeight'),bones=body.skeleton?.bones;
 if(!skin||!weight||!bones||skin.count!==n||weight.count!==n)throw Error('AIG51_REAL_WEIGHTED_BODY_REQUIRED');
 const perVertex=[];
 for(let i=0;i<n;i++){
  const j=[skin.getX(i),skin.getY(i),skin.getZ(i),skin.getW(i)];
  const w=[weight.getX(i),weight.getY(i),weight.getZ(i),weight.getW(i)];
  if(!j.every(k=>Number.isInteger(k)&&k>=0&&k<bones.length)||
     !w.every(v=>finite(v)&&v>=0&&v<=1.00001)||
     Math.abs(w.reduce((a,b)=>a+b,0)-1)>1e-3)throw Error('AIG51_INVALID_SKIN');
  const roles=new Set();
  for(let k=0;k<4;k++)if(w[k]>=.12){
   const role=aig50BoneRole(bones[j[k]].name);
   if(role)roles.add(role);
  }
  perVertex.push(roles);
 }
 const groups=Object.fromEntries(AIG51_REQUIRED_SEAMS.map(s=>[s,[]]));
 const idx=body.geometry.index;
 for(let i=0;i<idx.count;i+=3){
  const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];
  const roles=new Set(ids.flatMap(k=>[...perVertex[k]]));
  for(const s of AIG51_REQUIRED_SEAMS){
   const [a,b]=s.split(':');
   if(roles.has(a)&&roles.has(b))groups[s].push(i/3);
  }
 }
 return groups;
}
/** Bounded spatial hash over body triangle boxes. Reject truncation instead of falsely passing. */
export function intersectMeshTriangles(body,hair,{epsilon=1e-7,maxPairTests=150000,maxCellEntries=200000}={}){
 if(![epsilon,maxPairTests,maxCellEntries].every(finite)||epsilon<0||epsilon>.01||
   !Number.isInteger(maxPairTests)||maxPairTests<1||
   !Number.isInteger(maxCellEntries)||maxCellEntries<1)
  throw Error('AIG51_BROADPHASE_BUDGET_INVALID');
 const all=[...body,...hair];
 if(!all.length)throw Error('AIG51_EMPTY_TRIANGLES');
 const min=[0,1,2].map(k=>Math.min(...all.map(t=>t.box.min[k])));
 const max=[0,1,2].map(k=>Math.max(...all.map(t=>t.box.max[k])));
 const div=max.map((x,k)=>Math.max((x-min[k])/16,epsilon*4,1e-7));
 const voxel=(v,k)=>Math.max(0,Math.min(15,Math.floor((v-min[k])/div[k])));
 function cells(box){
  const x0=voxel(box.min[0]-epsilon,0),x1=voxel(box.max[0]+epsilon,0);
  const y0=voxel(box.min[1]-epsilon,1),y1=voxel(box.max[1]+epsilon,1);
  const z0=voxel(box.min[2]-epsilon,2),z1=voxel(box.max[2]+epsilon,2);
  const keys=[];
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)
   keys.push(x*256+y*16+z);
  return keys;
 }
 const grid=new Map();let entries=0;
 for(let i=0;i<body.length;i++){
  for(const cell of cells(body[i].box)){
   if(++entries>maxCellEntries)throw Error('AIG51_GRID_BUDGET_EXCEEDED');
   if(!grid.has(cell))grid.set(cell,[]);
   grid.get(cell).push(i);
  }
 }
 let pairTests=0,contacts=0,candidates=0;
 const examples=[];
 for(let h=0;h<hair.length;h++){
  const seen=new Set();
  for(const cell of cells(hair[h].box))for(const i of grid.get(cell)||[])seen.add(i);
  for(const i of seen){
   if(!overlap(body[i].box,hair[h].box,epsilon))continue;
   candidates++;
   if(++pairTests>maxPairTests)throw Error('AIG51_PAIR_BUDGET_EXCEEDED');
   if(triangleSurfaceContact(body[i].vertices,hair[h].vertices,{epsilon})){
    contacts++;
    if(examples.length<8)examples.push({bodyFace:body[i].face,hairFace:hair[h].face});
   }
  }
 }
 return {broadPhaseCandidates:candidates,exactTrianglePairs:pairTests,
  confirmedSurfaceContactPairs:contacts,examples,sampledIntersectionFree:contacts===0};
}
export async function auditAIG51PosedSeamsAndHair(gltf,{
 sourceSHA256,aig50Report,maxVertices=16000,maxTriangles=18000,maxHairMeshes=4,
 maxClips=3,sampleFractions=[0,.25,.5,.75,1],epsilon=1e-7
}={}){
 if(!/^[0-9a-f]{64}$/i.test(sourceSHA256||'')||aig50Report?.sourceSHA256!==sourceSHA256||
    aig50Report?.outcome!=='STRUCTURAL_QA_PASS_ONLY')
  throw Error('AIG51_VERIFIED_5_0_SOURCE_REQUIRED');
 if(!gltf?.scene?.traverse||!Array.isArray(gltf.animations)||!gltf.animations.length||
    !Number.isInteger(maxVertices)||maxVertices<100||maxVertices>40000||
    !Number.isInteger(maxTriangles)||maxTriangles<100||maxTriangles>40000||
    !Number.isInteger(maxClips)||maxClips<1||maxClips>8||
    !Array.isArray(sampleFractions)||sampleFractions.length!==5||
    sampleFractions.some((x,i)=>!finite(x)||x<0||x>1||(i&&x<=sampleFractions[i-1])))
  throw Error('AIG51_SAMPLING_OR_BUDGET_INVALID');
 const bodyMeshes=[],hairMeshes=[];
 gltf.scene.traverse(n=>{
  if(!n.isMesh)return;
  if(/ponytail|hair|braid|髮|马尾|馬尾/i.test(n.name||''))hairMeshes.push(n);
  else if(n.isSkinnedMesh)bodyMeshes.push(n);
 });
 if(hairMeshes.length<1||hairMeshes.length>maxHairMeshes)throw Error('AIG51_HAIR_MESH_NOT_IDENTIFIED');
 const named=new Set(aig50Report.meshes?.filter(m=>m.qa?.shoulderToHeadSharedIndexedComponent)
  .map(m=>m.name));
 const bodies=bodyMeshes.filter(m=>named.has(m.name)&&m.geometry?.index);
 if(bodies.length!==1)throw Error('AIG51_AMBIGUOUS_OR_MISSING_CONNECTED_BODY');
 const body=bodies[0],groups=faceSeamIndices(body);
 const missing=AIG51_REQUIRED_SEAMS.filter(k=>groups[k].length===0);
 if(missing.length)throw Error('AIG51_MISSING_WEIGHTED_SEAM_'+missing.join('_'));
 const mixer=new AnimationMixer(gltf.scene),summary=[];
 let totalContacts=0,totalPairs=0,maxAreaRatio=0,minAreaRatio=Infinity;
 const allMeshes=[body,...hairMeshes];
 try{
  for(const clip of gltf.animations.slice(0,maxClips)){
   if(!finite(clip.duration)||clip.duration<=0||clip.duration>600)throw Error('AIG51_CLIP_DURATION_INVALID');
   mixer.stopAllAction();
   const action=mixer.clipAction(clip);action.reset().play();
   const poses=[];let baseline=null;
   for(const frac of sampleFractions){
    mixer.setTime(clip.duration*frac);
    gltf.scene.updateMatrixWorld(true);
    for(const m of allMeshes)if(m.isSkinnedMesh)m.skeleton.update();
    const positions=meshPositions(body,maxVertices);
    const faces=meshTriangles(body,positions,maxTriangles);
    const hairFaces=hairMeshes.flatMap(m=>meshTriangles(m,meshPositions(m,maxVertices),maxTriangles));
    if(hairFaces.length>maxTriangles)throw Error('AIG51_TOTAL_HAIR_TRIANGLE_BUDGET');
    if(!baseline)baseline=faces.map(t=>t.area);
    const result=intersectMeshTriangles(faces,hairFaces,{epsilon});
    let collapsed=0,stretched=0,lo=Infinity,hi=0;
    const seams={};
    for(const [key,indices] of Object.entries(groups)){
     let localCollapsed=0,localStretched=0;
     for(const i of indices){
      const ratio=faces[i].area/baseline[i];
      if(!finite(ratio)||ratio<.2){localCollapsed++;collapsed++;}
      if(ratio>5){localStretched++;stretched++;}
      lo=Math.min(lo,ratio);hi=Math.max(hi,ratio);
     }
     seams[key]={sampledTriangles:indices.length,collapsed:localCollapsed,overstretched:localStretched};
    }
    minAreaRatio=Math.min(minAreaRatio,lo);maxAreaRatio=Math.max(maxAreaRatio,hi);
    totalContacts+=result.confirmedSurfaceContactPairs;totalPairs+=result.exactTrianglePairs;
    poses.push({timeSeconds:clip.duration*frac,fraction:frac,seams,
     minAreaRatio:lo,maxAreaRatio:hi,collapsedSeamFaces:collapsed,
     overstretchedSeamFaces:stretched,...result});
   }
   action.stop();
   summary.push({clip:clip.name,poses});
  }
 }finally{mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);}
 const allPoses=summary.flatMap(x=>x.poses);
 const badSeams=allPoses.some(x=>x.collapsedSeamFaces||x.overstretchedSeamFaces);
 const passed=allPoses.length===Math.min(gltf.animations.length,maxClips)*5&&
  !badSeams&&totalContacts===0;
 return {schema:AIG51_SCHEMA,sourceSHA256,upstreamAIG50Outcome:aig50Report.outcome,
  bodyMesh:body.name,headHairMeshes:hairMeshes.map(x=>x.name),
  requiredSeams:AIG51_REQUIRED_SEAMS,seamFaceCounts:Object.fromEntries(
   Object.entries(groups).map(([k,v])=>[k,v.length])),
  clips:summary,posesChecked:allPoses.length,totalExactTrianglePairs:totalPairs,
  confirmedBodyHairContacts:totalContacts,minAreaRatio,maxAreaRatio,
  sampledShoulderNeckSeamsInRange:!badSeams,sampledBodyHairIntersectionFree:totalContacts===0,
  outcome:passed?'POSED_GEOMETRY_QA_PASS_ONLY':'BLOCKED',
  continuousTimeCollisionFreeProven:false,hairAlphaOrStrandPhysicsVerified:false,
  sourceIdentityPhotoMatched:false,formalHeroineApproved:false,
  actualAndroidWindowsFpsVerified:false,releaseAllowed:false};
}
