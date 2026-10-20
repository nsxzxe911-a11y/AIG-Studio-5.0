/** AIG FastModel 4.6 — source-bound cross-pose 2D normalisation and
 * 3 separate true 3D technical mesh components: head / neck / ponytail.
 * AIG authored geometry; zero cloud / credits. Anatomy, unseen back, hair
 * strands and actual rig remain inferred and NOT production-approved.
 */
import {AIG45_SCHEMA,AIG45_POSES} from './aig-calibration-4-5.mjs';
export const AIG46_SCHEMA='AIG_FASTMODEL_4_6_PART_MESH_NORMALIZED_DRAFT';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const bound=(v,min,max)=>finite(v)&&v>=min&&v<=max;
const median=x=>{const a=[...x].sort((a,b)=>a-b);const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2;};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const vecSub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
const normalize=v=>{const n=norm(v);if(n<1e-8)throw Error('AIG46_DEGENERATE_VECTOR');return v.map(a=>a/n);};
function accepted(cal){
 if(cal?.schema!==AIG45_SCHEMA||!AIG45_POSES.some(p=>p.id===cal.assetId&&p.sha256===cal.originalSourceSHA256)||
  !cal.input2DLandmarks||!bound(cal.ratios?.apparentHeadHeightOverBody,.045,.27)||
  !bound(cal.ratios?.apparentShoulderWidthOverBody,.07,.48)||
  !bound(cal.ratios?.apparentHipWidthOverBody,.07,.56))
  throw Error('AIG46_4_5_SOURCE_AND_LANDMARK_QA_REQUIRED');
 const m=cal.input2DLandmarks;
 if(!['headTop','chin','leftShoulder','rightShoulder','leftHip','rightHip','leftAnkle','rightAnkle']
  .every(k=>bound(m[k]?.x,0,1)&&bound(m[k]?.y,0,1)))
  throw Error('AIG46_2D_POINTS_MISSING');
 const ankle=mid(m.leftAnkle,m.rightAnkle),sh=mid(m.leftShoulder,m.rightShoulder);
 const height=ankle.y-m.headTop.y;
 if(height<.36||height>.97||sh.y>=ankle.y)throw Error('AIG46_BODY_HEIGHT_INVALID');
 return {cal,m,ankle,sh,height};
}
export function normalizePoseSet(calibrations){
 if(!Array.isArray(calibrations)||!calibrations.length||calibrations.length>4)
  throw Error('AIG46_POSE_SET_COUNT');
 const used=new Set();
 const rows=calibrations.map(c=>{
  const r=accepted(c);
  if(used.has(c.assetId))throw Error('AIG46_DUPLICATE_SOURCE');used.add(c.assetId);
  const point=k=>({x:(r.m[k].x-r.sh.x)/r.height,
                    y:(r.ankle.y-r.m[k].y)/r.height});
  const points=Object.fromEntries(Object.keys(r.m).map(k=>[k,point(k)]));
  return {assetId:c.assetId,sourceSHA256:c.originalSourceSHA256,
   bodyHeightImageFraction:r.height,landmarksCanonical2D:points,
   measured:{
    headHeight:distance(r.m.headTop,r.m.chin)/r.height,
    shoulderWidth:distance(r.m.leftShoulder,r.m.rightShoulder)/r.height,
    hipWidth:distance(r.m.leftHip,r.m.rightHip)/r.height},
   evidence:'MANUAL_2D_POINTS_ONLY'};
 });
 const ratios={};
 for(const key of ['headHeight','shoulderWidth','hipWidth']){
  const array=rows.map(r=>r.measured[key]);const center=median(array);
  ratios[key]=center;
  // Flag camera/pose spread, do not silently average diverging photos.
  if(array.some(v=>Math.abs(v-center)>Math.max(.07,center*.28)))
   throw Error('AIG46_POSE_CAMERA_SCALE_OUTLIER_REVIEW');
 }
 return {schema:AIG46_SCHEMA,assetSetId:'HEROINE_WHITE_STRAPLESS_TWO_PIECE_PONYTAIL_4POSE_20261021',
  poses:rows,medianRatios:ratios,sourceSHA256:rows.map(r=>r.sourceSHA256),
  sameCameraAngleNotVerified:true,unknownBackSurfaceInferred:true,
  full3DFromPhotosVerified:false,units:'NORMALIZED_APPARENT_BODY_HEIGHT',
  noCreditsSpent:true,releaseAllowed:false};
}
function createMesh(name,vertices,indices,evidence){
 if(!Array.isArray(vertices)||!Array.isArray(indices)||vertices.length%3||indices.length%3||
  vertices.length<12||indices.length<12||!vertices.every(finite)||
  !indices.every(i=>Number.isInteger(i)&&i>=0&&i<vertices.length/3))
  throw Error('AIG46_INVALID_TRIANGULATION_'+name);
 return {name,positions:new Float32Array(vertices),indices:new Uint16Array(indices),
  sourceEvidence:evidence,partIsIndependentlyEditable:true,skinned:false,
  uvMapped:false,approvedVisualIdentity:false};
}
function ellipsoid(name,c,r,rings=12,sides=16){
 const v=[],ix=[];
 for(let i=1;i<rings;i++){
  const phi=Math.PI*i/rings;
  for(let j=0;j<sides;j++){
   const theta=2*Math.PI*j/sides;
   v.push(c[0]+r[0]*Math.sin(phi)*Math.cos(theta),
          c[1]+r[1]*Math.cos(phi),
          c[2]+r[2]*Math.sin(phi)*Math.sin(theta));
  }
 }
 const top=v.length/3;v.push(c[0],c[1]+r[1],c[2]);
 const bottom=v.length/3;v.push(c[0],c[1]-r[1],c[2]);
 for(let i=0;i<rings-2;i++)for(let j=0;j<sides;j++){
  const a=i*sides+j,b=i*sides+(j+1)%sides;
  const d=(i+1)*sides+j,e=(i+1)*sides+(j+1)%sides;
  ix.push(a,b,d,b,e,d);
 }
 for(let j=0;j<sides;j++){
  ix.push(top,j,(j+1)%sides);
  const last=(rings-2)*sides;
  ix.push(bottom,last+(j+1)%sides,last+j);
 }
 return createMesh(name,v,ix,'INFERRED_PARAMETERIZED_ELLIPSOID');
}
function cappedTube(name,path,radii,sides=12){
 const v=[],ix=[];
 if(path.length<2||path.length!==radii.length)throw Error('AIG46_TUBE_INPUT_INVALID');
 for(let i=0;i<path.length;i++){
  const tangent=normalize(vecSub(path[Math.min(i+1,path.length-1)],
    path[Math.max(i-1,0)]));
  const base=Math.abs(tangent[1])<.95?[0,1,0]:[1,0,0];
  const u=normalize(cross(tangent,base)),w=cross(tangent,u);
  for(let j=0;j<sides;j++){
   const t=j*2*Math.PI/sides,cos=Math.cos(t),sin=Math.sin(t);
   v.push(...path[i].map((p,k)=>p+radii[i]*(u[k]*cos+w[k]*sin)));
  }
 }
 for(let i=0;i<path.length-1;i++)for(let j=0;j<sides;j++){
  const a=i*sides+j,b=i*sides+(j+1)%sides,
   d=(i+1)*sides+j,e=(i+1)*sides+(j+1)%sides;
  ix.push(a,d,b,b,d,e);
 }
 const first=v.length/3;v.push(...path[0]);
 const last=v.length/3;v.push(...path[path.length-1]);
 for(let j=0;j<sides;j++){
  ix.push(first,j,(j+1)%sides);
  const n=(path.length-1)*sides;ix.push(last,n+(j+1)%sides,n+j);
 }
 return createMesh(name,v,ix,'INFERRED_CAPSULE_TUBE_WITH_CAPS');
}
export function meshTopology(mesh){
 const counts=new Map(),positions=mesh.positions,index=mesh.indices;
 let invalid=0,volume=0;
 for(let i=0;i<index.length;i+=3){
  const a=index[i],b=index[i+1],c=index[i+2];
  if(a===b||b===c||a===c){invalid++;continue;}
  for(const [u,v] of [[a,b],[b,c],[c,a]]){
   const key=Math.min(u,v)+':'+Math.max(u,v);
   counts.set(key,(counts.get(key)||0)+1);
  }
  const p=[a,b,c].map(j=>Array.from(positions.slice(3*j,3*j+3)));
  const cp=cross(vecSub(p[1],p[0]),vecSub(p[2],p[0]));
  if(norm(cp)<1e-9)invalid++;
  volume+=(p[0][0]*cp[0]+p[0][1]*cp[1]+p[0][2]*cp[2])/6;
 }
 const unmatched=[...counts.values()].filter(count=>count!==2).length;
 return {part:mesh.name,vertexCount:positions.length/3,triangleCount:index.length/3,
  degenerateTriangles:invalid,nonManifoldEdges:unmatched,closed:invalid===0&&unmatched===0,
  signedVolume:volume,normalOrientationVerified:volume>1e-8};
}
export function buildHeadNeckPonytail(profile,{ponytailSwing=0,ponytailBack=.09}={}){
 if(profile?.schema!==AIG46_SCHEMA||!Array.isArray(profile.poses)||!profile.poses.length||
  !bound(ponytailSwing,-.08,.08)||!bound(ponytailBack,.04,.19))
  throw Error('AIG46_NORMALIZED_PROFILE_REQUIRED');
 const ratio=profile.medianRatios;
 const height=Math.max(.07,Math.min(.16,ratio.headHeight));
 // Head, neck, ponytail have independent *closed* surfaces; overlap of two
 // separate shells is NOT welded or skin-deformation approval.
 const headRadiusY=height*.53,headRadiusX=Math.min(.13,Math.max(.046,height*.55));
 const center=[0,.38,0],headR=[headRadiusX,headRadiusY,headRadiusX*.87];
 const neckTop=.38-headRadiusY*.83;
 const neckBottom=neckTop-.072;
 const neck=cappedTube('neck',
   [[0,neckBottom,.003],[0,neckTop,.003]],[.030,.027],16);
 const head=ellipsoid('head',center,headR,14,20);
 const attach=[-headRadiusX*.3,.38+headRadiusY*.35,-headR[2]*.88];
 const back=-ponytailBack-headR[2];
 const ponytailPath=[attach,
  [attach[0]-.025,.36,back],
  [attach[0]-.025+ponytailSwing*.3,.28,back-.025],
  [attach[0]-.035+ponytailSwing,.17,back-.01],
  [attach[0]-.04+ponytailSwing,.06,back+.008]];
 const ponytail=cappedTube('ponytail',ponytailPath,[.025,.04,.034,.024,.007],12);
 const parts=[head,neck,ponytail],qa=parts.map(meshTopology);
 const distanceToCenter=norm(vecSub(attach,center));
 const hairRootNearHead=distanceToCenter<=Math.max(...headR)*1.3;
 const neckPenetrationRisk=ponytailPath.slice(1).some(p=>
  p[1]>=neckBottom&&p[1]<=neckTop&&Math.hypot(p[0],p[2]-.003)<.065);
 return {schema:AIG46_SCHEMA,sourceSHA256:[...profile.sourceSHA256],
  parts,topology:qa,
  headNeckProxyTouchByGeometry:neckTop>=center[1]-headRadiusY,
  ponytailRootNearHeadProxy:hairRootNearHead,
  ponytailNeckProxyIntersectionRisk:neckPenetrationRisk,
  topologyQA:qa.every(q=>q.closed&&q.normalOrientationVerified),
  overallApproval:false,
  separatedSurfacesNotWelded:true,
  realFaceTextureMatchVerified:false,
  actualHairStrandCollisionVerified:false,
  fullBodyTopologyVerified:false,
  photoBackReconstructionVerified:false,
  maxTriangles:qa.reduce((sum,q)=>sum+q.triangleCount,0),
  noCreditsSpent:true,releaseAllowed:false};
}
export function exportOBJ(draft){
 if(!draft||draft.schema!==AIG46_SCHEMA||!draft.topologyQA)throw Error('AIG46_UNVERIFIED_MESH');
 const lines=['# AIG 4.6 ORIGINAL TECHNICAL DRAFT OBJ — NOT PHOTOREAL HUMAN',
  '# Source front images are different poses; rear geometry inferred'];
 let offset=1;
 for(const part of draft.parts){
  lines.push('o AIG46_'+part.name);
  for(let i=0;i<part.positions.length;i+=3)
   lines.push('v '+part.positions[i].toFixed(7)+' '+part.positions[i+1].toFixed(7)+' '+part.positions[i+2].toFixed(7));
  for(let i=0;i<part.indices.length;i+=3)
   lines.push('f '+(offset+part.indices[i])+' '+(offset+part.indices[i+1])+' '+(offset+part.indices[i+2]));
  offset+=part.positions.length/3;
 }
 return lines.join('\n')+'\n';
}
