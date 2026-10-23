/**
 * AIG Real3D Scan-Native candidate: imports actual local OBJ vertex/face data.
 * No generated mannequin, SDF, metaballs, topology subdivision or CDN.
 *
 * An OBJ filename is NOT proof that it originated from a human scan.
 * This module never grants human appearance approval or a release PASS.
 */
import {createAIG3DMesh,createAIG3DScene,addAIG3DNode}
 from './aig-real3d-core.mjs';
export const AIG_SCAN_NATIVE_SCHEMA='AIG_REAL3D_SCAN_NATIVE_SOURCE_MESH_V1';
const error=s=>{throw Error('AIG_SCAN_NATIVE_'+s);};
const finite=Number.isFinite;
const REQUIRED_LANDMARKS=Object.freeze([
 'headTop','chin','noseTip','neckBase','leftShoulder','rightShoulder',
 'leftElbow','rightElbow','leftWrist','rightWrist',
 'leftThumbTip','rightThumbTip','leftIndexTip','rightIndexTip',
 'pelvis','leftKnee','rightKnee','leftHeel','rightHeel',
 'leftToe','rightToe'
]);
function indexOfOBJ(value,count){
 const n=Number(value);
 if(!Number.isInteger(n)||n===0||Math.abs(n)>count)error('BAD_FACE_INDEX');
 const k=n>0?n-1:count+n;
 if(k<0||k>=count)error('BAD_FACE_INDEX');
 return k;
}
function normalize(a){
 const h=Math.hypot(...a)||1;
 return a.map(x=>x/h);
}
function cross(a,b){return [
 a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],
 a[0]*b[1]-a[1]*b[0]
];}
export function parseAIGScanNativeOBJ(text){
 if(typeof text!=='string'||text.length<30||text.length>14000000)
  error('SOURCE_TEXT_SIZE');
 const original=[],indices=[];
 const lines=text.split(/\r?\n/);
 if(lines.length>700000)error('SOURCE_LINE_BUDGET');
 for(const line of lines){
  const trimmed=line.trim();
  if(!trimmed||trimmed.startsWith('#'))continue;
  const parts=trimmed.split(/\s+/);
  if(parts[0]==='v'){
   if(parts.length<4||parts.length>5)error('VERTEX_FORMAT');
   const v=parts.slice(1,4).map(Number);
   if(!v.every(x=>finite(x)&&Math.abs(x)<=1000000))
    error('NONFINITE_VERTEX');
   original.push(v);
   if(original.length>110000)error('VERTEX_BUDGET');
  }else if(parts[0]==='f'){
   if(parts.length<4||parts.length>65)error('FACE_FORMAT');
   const ids=parts.slice(1).map(t=>{
    const first=t.split('/')[0];
    if(!/^-?\d+$/.test(first))error('BAD_FACE_INDEX');
    return indexOfOBJ(first,original.length);
   });
   if(new Set(ids).size!==ids.length)error('DUPLICATE_FACE_VERTEX');
   for(let i=1;i<ids.length-1;i++)indices.push(ids[0],ids[i],ids[i+1]);
   if(indices.length>180000*3)error('TRIANGLE_BUDGET');
  }
  // vt/vn/o/g/s/mtllib/usemtl are ignored; NO external asset fetching.
 }
 if(original.length<4||indices.length<12)error('SOURCE_EMPTY_OR_UNDERTRIANGULATED');
 return {original,indices};
}
function boundsOf(vertices){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const v of vertices)for(let a=0;a<3;a++){
  min[a]=Math.min(min[a],v[a]);max[a]=Math.max(max[a],v[a]);
 }
 return {min,max,span:max.map((v,i)=>v-min[i])};
}
function sourceToWorld(p,raw,scale,upAxis){
 const v=upAxis==='Z'?[p[0],p[2],-p[1]]:p;
 return [(v[0]-(raw.min[0]+raw.max[0])/2)*scale,
         (v[1]-raw.min[1])*scale,
         (v[2]-(raw.min[2]+raw.max[2])/2)*scale];
}
function topology(vertexCount,indices){
 const parent=Array.from({length:vertexCount},(_,i)=>i);
 const used=new Set(),edges=new Map();
 function root(i){
  while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}
  return i;
 }
 for(let i=0;i<indices.length;i+=3){
  const [a,b,c]=indices.slice(i,i+3);
  used.add(a);used.add(b);used.add(c);
  const ra=root(a),rb=root(b),rc=root(c);
  parent[rb]=ra;parent[rc]=ra;
  for(const [u,v]of[[a,b],[b,c],[c,a]]){
   const key=Math.min(u,v)+':'+Math.max(u,v);
   edges.set(key,(edges.get(key)||0)+1);
  }
 }
 const count=[...edges.values()];
 return {connectedComponents:new Set([...used].map(root)).size,
  openEdges:count.filter(n=>n===1).length,
  nonManifoldEdges:count.filter(n=>n!==2).length,
  unusedVertices:vertexCount-used.size};
}
function landmarkAudit(landmarks,raw,scale,upAxis,positions,height){
 if(!landmarks)return {provided:false,complete:false,
  required:REQUIRED_LANDMARKS,errors:['ANATOMICAL_LANDMARKS_MISSING']};
 const errors=[];
 const keys=Object.keys(landmarks);
 const sampled={};
 for(const k of REQUIRED_LANDMARKS){
  const v=landmarks[k];
  if(!Array.isArray(v)||v.length!==3||
     !v.every(x=>finite(x)&&Math.abs(x)<1e6)){
   errors.push('MISSING_OR_INVALID_'+k);continue;
  }
  sampled[k]=sourceToWorld(v,raw,scale,upAxis);
  const p=sampled[k],limit=height*.045;
  let nearest=Infinity;
  for(let i=0;i<positions.length;i+=3){
   const dx=p[0]-positions[i],dy=p[1]-positions[i+1],
    dz=p[2]-positions[i+2],d=dx*dx+dy*dy+dz*dz;
   if(d<nearest)nearest=d;
  }
  if(Math.sqrt(nearest)>limit)errors.push('NOT_ON_MESH_'+k);
 }
 if(sampled.headTop&&sampled.chin&&sampled.neckBase){
  if(!(sampled.headTop[1]>sampled.chin[1]&&
       sampled.chin[1]>sampled.neckBase[1]))
   errors.push('HEAD_LANDMARK_ORDER');
 }
 for(const name of ['Shoulder','Wrist','ThumbTip','IndexTip','Knee','Heel','Toe']){
  const l=sampled['left'+name],r=sampled['right'+name];
  if(l&&r&&!(l[0]<r[0]))errors.push('LEFT_RIGHT_'+name);
 }
 if(sampled.leftHeel&&sampled.leftKnee&&
    sampled.leftHeel[1]>=sampled.leftKnee[1])
  errors.push('LEFT_LEG_ORDER');
 if(sampled.rightHeel&&sampled.rightKnee&&
    sampled.rightHeel[1]>=sampled.rightKnee[1])
  errors.push('RIGHT_LEG_ORDER');
 return {provided:true,complete:errors.length===0,
  suppliedKeys:keys.length,required:REQUIRED_LANDMARKS,errors};
}
export function buildAIGReal3DScanNative({
 objText,heightMm,upAxis='Y',landmarks=null,sourceName='local-upload.obj',
 sourceSha256='UNHASHED_UNVERIFIED'
}={}){
 if(!Number.isInteger(heightMm)||heightMm<900||heightMm>2200)
  error('MEASURED_HEIGHT_REQUIRED_MM');
 if(!['Y','Z'].includes(upAxis))error('UP_AXIS');
 if(typeof sourceName!=='string'||!sourceName.toLowerCase().endsWith('.obj')||
    sourceName.length>180)error('LOCAL_OBJ_ONLY');
 if(typeof sourceSha256!=='string'||sourceSha256.length>90)
  error('SHA_FORMAT');
 const {original,indices}=parseAIGScanNativeOBJ(objText);
 const rotated=original.map(v=>upAxis==='Z'?[v[0],v[2],-v[1]]:v);
 const raw=boundsOf(rotated),height=heightMm/1000;
 if(raw.span[1]<1e-8)error('ZERO_SOURCE_HEIGHT');
 const scale=height/raw.span[1],positions=[];
 for(const p of original)
  positions.push(...sourceToWorld(p,raw,scale,upAxis));
 const b=boundsOf(positions.reduce((arr,_,i)=>{
  if(i%3===0)arr.push(positions.slice(i,i+3));return arr;
 },[]));
 const widthRatio=b.span[0]/height,depthRatio=b.span[2]/height;
 let degenerates=0;
 const sums=new Float64Array(positions.length);
 for(let i=0;i<indices.length;i+=3){
  const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
  const v=[positions[b]-positions[a],positions[b+1]-positions[a+1],
   positions[b+2]-positions[a+2]];
  const w=[positions[c]-positions[a],positions[c+1]-positions[a+1],
   positions[c+2]-positions[a+2]];
  const n=cross(v,w);
  if(Math.hypot(...n)<1e-11){degenerates++;continue;}
  for(const off of [a,b,c])for(let k=0;k<3;k++)sums[off+k]+=n[k];
 }
 const normals=[];
 for(let i=0;i<sums.length;i+=3)
  normals.push(...normalize([sums[i],sums[i+1],sums[i+2]]));
 const t=topology(original.length,indices);
 const land=landmarkAudit(landmarks,raw,scale,upAxis,positions,height);
 const errors=[];
 if(t.connectedComponents!==1)errors.push('MULTIPLE_BODY_COMPONENTS');
 if(t.nonManifoldEdges)errors.push('OPEN_OR_NONMANIFOLD_BODY_MESH');
 if(t.unusedVertices)errors.push('UNUSED_VERTICES');
 if(degenerates)errors.push('DEGENERATE_TRIANGLES');
 if(indices.length/3<2000)errors.push('INSUFFICIENT_HUMAN_DETAIL');
 if(widthRatio<.22||widthRatio>.86)errors.push('IMPLAUSIBLE_HEIGHT_WIDTH_ENVELOPE');
 if(depthRatio<.08||depthRatio>.55)errors.push('IMPLAUSIBLE_HEIGHT_DEPTH_ENVELOPE');
 const geometryPASS=errors.length===0;
 const mesh=createAIG3DMesh({positions,normals,indices,
  provenance:'LOCAL_OBJ_SOURCE_SHA_'+sourceSha256.slice(0,64)});
 const scene=createAIG3DScene({id:'scanNativeCandidate',consumer:'FastModel',
  units:'METERS',source:'LOCAL_USER_OBJ_NOT_AUTHENTICATED_HUMAN_SCAN'});
 addAIG3DNode(scene,{id:'sourceNativeBody',mesh,kind:'character',
  material:{baseColor:[.79,.66,.57,1],roughness:.87,doubleSided:true,metallic:0},
  source:'RAW_OBJ_VERTEX_FACE_GEOMETRY_NON_RELEASE'});
 const evidence={schema:AIG_SCAN_NATIVE_SCHEMA,sourceName,sourceSha256,
  sourceFormat:'OBJ_LOCAL_NO_NETWORK',
  sourceNotProvenHumanScan:true,sourceCoordinatesConvertedToMeters:true,
  measuredHeightMm:heightMm,upAxis,
  actualVertices:original.length,actualTriangles:indices.length/3,
  ...t,degenerateTriangles:degenerates,
  widthToHeight:+widthRatio.toFixed(5),depthToHeight:+depthRatio.toFixed(5),
  landmarkAudit:land,geometryPASS,
  geometricErrors:errors,authenticityVerified:false,
  sourcePhotoSimilarityVerified:false,faceHandsFeetVisuallyApproved:false,
  skeletonSkinningVerified:false,stage1ReleasePASS:false};
 return {scene,evidence,releasePASS:false};
}
