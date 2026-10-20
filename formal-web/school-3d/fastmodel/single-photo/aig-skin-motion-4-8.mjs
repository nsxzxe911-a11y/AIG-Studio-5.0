/** FastModel 4.8 — SHA-bound technical skeletal skinning and real glTF motion.
 * Uses only the verified 4.7 shared-index geometry. This is NOT a scanned
 * actress, physically simulated hair, full-body avatar or native FPS proof.
 */
import {AIG47_SCHEMA,exportAIG47GLB} from './aig-welded-4-7.mjs';
import {meshTopology} from './aig-head-neck-4-6.mjs';
import {AnimationMixer,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const AIG48_SCHEMA='AIG_FASTMODEL_4_8_SKINNED_POSE_TECHNICAL_DRAFT';
const align4=n=>(n+3)&~3;
const clamp=x=>Math.max(0,Math.min(1,x));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const qaxis=(axis,degree)=>{
 const a=degree*Math.PI/360,s=Math.sin(a),c=Math.cos(a);
 return axis==='X'?[s,0,0,c]:axis==='Y'?[0,s,0,c]:[0,0,s,c];
};
const mix=(a,b,t)=>[a*(1-t),b*t];
function weightsFor(part,joints){
 const length=part.positions.length/3;
 const indices=new Uint8Array(length*4),weights=new Float32Array(length*4);
 const [root,neck,head,pony,tip]=joints;
 const rootToNeckLow=neck[1]-.03,rootToNeckHigh=neck[1]+.012;
 const neckToHeadLow=head[1]-.025,neckToHeadHigh=head[1]+.035;
 const ponySpan=Math.max(.03,pony[1]-tip[1]);
 for(let i=0;i<length;i++){
  const y=part.positions[i*3+1];
  let pairs;
  if(part.name==='headNeck'){
   if(y<rootToNeckHigh){
    const t=clamp((y-rootToNeckLow)/(rootToNeckHigh-rootToNeckLow));
    pairs=[[0,1-t],[1,t]];
   }else{
    const t=clamp((y-neckToHeadLow)/(neckToHeadHigh-neckToHeadLow));
    pairs=[[1,1-t],[2,t]];
   }
  }else{
   const t=.88*clamp((pony[1]-y)/ponySpan);
   pairs=[[3,1-t],[4,t]];
  }
  for(let k=0;k<2;k++){
   indices[4*i+k]=pairs[k][0];
   weights[4*i+k]=pairs[k][1];
  }
  if(!finite(weights[4*i])||!finite(weights[4*i+1])||
     Math.abs(weights[4*i]+weights[4*i+1]-1)>1e-6)throw Error('AIG48_SKIN_WEIGHT_INVALID');
 }
 return {joints:indices,weights};
}
export function buildAIG48Draft(source){
 if(source?.schema!==AIG47_SCHEMA||!source.topologyQA||!source.headNeckSharedVertexJoin||
    !Array.isArray(source.sourceSHA256)||!source.sourceSHA256.length||
    source.parts?.length!==2||source.parts[0].name!=='headNeck'||
    source.parts[1].name!=='ponytail'||!source.parts.every(x=>meshTopology(x).closed))
   throw Error('AIG48_4_7_WATERTIGHT_SHA_SOURCE_REQUIRED');
 const n=source.parts[0],tail=source.parts[1];
 const top=n.positions.reduce((a,v,i)=>i%3===1?Math.max(a,v):a,-Infinity);
 const neckY=n.joinY-.045,headY=n.joinY+.014;
 const attach=[...tail.positions.slice(tail.positions.length-6,tail.positions.length-3)];
 const tailEnd=[...tail.positions.slice(tail.positions.length-3)];
 if(![top,neckY,headY,...attach,...tailEnd].every(finite)||
    attach[1]<=tailEnd[1]||headY>=top||neckY<=n.neckBottom)
  throw Error('AIG48_BONE_ANCHORS_INVALID');
 // Index order is deliberately stable and matches glTF skin.joints.
 const points=[[0,0,0],[0,neckY,0],[0,headY,0],attach,tailEnd];
 const parents=[-1,0,1,2,3];
 const boneNames=['AIG48_Root','AIG48_Neck','AIG48_Head','AIG48_PonytailRoot','AIG48_PonytailTip'];
 const skins=source.parts.map(p=>weightsFor(p,points));
 return {schema:AIG48_SCHEMA,sourceSHA256:[...source.sourceSHA256],parts:source.parts,
  sourceTopology:source.topology,sourceHairClearance:source.hairClearance,
  joins:source.headNeckJoinRingVertices,points,parents,boneNames,skins,
  topologyRetained:true,realGlbSkinning:true,animationNames:['AIG48_TURN_HEAD','AIG48_NOD_HEAD','AIG48_SWING_PONYTAIL'],
  faceIdentityVerified:false,fullBodyRig:false,perStrandCollisionVerified:false,
  deviceFpsVerified:false,releaseAllowed:false};
}
export function exportAIG48GLB(draft){
 if(draft?.schema!==AIG48_SCHEMA||!draft.topologyRetained||!draft.realGlbSkinning||
    draft.parts?.length!==2||draft.skins?.length!==2||
    !draft.parts.every(p=>meshTopology(p).closed))
  throw Error('AIG48_UNVERIFIED_SKIN_DRAFT');
 const prior=exportAIG47GLB({
  schema:AIG47_SCHEMA,topologyQA:true,headNeckSharedVertexJoin:true,
  parts:draft.parts,sourceSHA256:draft.sourceSHA256
 });
 const payload=prior.bytes,dv=new DataView(payload.buffer,payload.byteOffset,payload.byteLength);
 const jsonLength=dv.getUint32(12,true),offset=20+jsonLength;
 const gltf=JSON.parse(new TextDecoder().decode(payload.subarray(20,offset)));
 const initialLength=dv.getUint32(offset,true);
 const original=payload.slice(offset+8,offset+8+initialLength);
 const segments=[{offset:0,bytes:original}];let cursor=original.length;
 const append=(typed,target,componentType,type,count)=>{
  const bytes=new Uint8Array(typed.buffer,typed.byteOffset,typed.byteLength);
  cursor=align4(cursor);const at=cursor;
  segments.push({offset:at,bytes});cursor+=bytes.byteLength;
  const view={buffer:0,byteOffset:at,byteLength:bytes.byteLength};
  if(target)view.target=target;
  gltf.bufferViews.push(view);
  gltf.accessors.push({bufferView:gltf.bufferViews.length-1,componentType,count,type});
  return gltf.accessors.length-1;
 };
 draft.skins.forEach((skin,i)=>{
  const count=draft.parts[i].positions.length/3;
  if(skin.joints.length!==count*4||skin.weights.length!==count*4)
    throw Error('AIG48_SKIN_ARRAY_LENGTH');
  gltf.meshes[i].primitives[0].attributes.JOINTS_0=
    append(skin.joints,34962,5121,'VEC4',count);
  gltf.meshes[i].primitives[0].attributes.WEIGHTS_0=
    append(skin.weights,34962,5126,'VEC4',count);
  gltf.nodes[i].skin=0;
  gltf.nodes[i].name='AIG48_'+draft.parts[i].name;
 });
 const inverses=new Float32Array(draft.points.length*16);
 draft.points.forEach((p,i)=>{
  const k=i*16;inverses[k]=1;inverses[k+5]=1;inverses[k+10]=1;inverses[k+15]=1;
  inverses[k+12]=-p[0];inverses[k+13]=-p[1];inverses[k+14]=-p[2];
 });
 const ibm=append(inverses,null,5126,'MAT4',draft.points.length);
 const start=2;
 draft.points.forEach((p,i)=>{
  const parent=draft.parents[i],base=parent<0?[0,0,0]:draft.points[parent];
  gltf.nodes.push({name:draft.boneNames[i],
   translation:p.map((v,k)=>v-base[k]),
   ...(i<4?{children:[start+i+1]}:{})});
 });
 gltf.skins=[{name:'AIG48_TECHNICAL_HEAD_NECK_TAIL',joints:[2,3,4,5,6],
   skeleton:2,inverseBindMatrices:ibm}];
 gltf.scenes[0].nodes.push(2);
 const times=new Float32Array([0,.5,1,1.5,2]);
 const timeAccessor=append(times,null,5126,'SCALAR',times.length);
 const rotations=(node,axis,degrees)=>{
  const rotations=new Float32Array(degrees.flatMap(a=>qaxis(axis,a)));
  return {node,output:append(rotations,null,5126,'VEC4',degrees.length)};
 };
 const clips=[
  {name:'AIG48_TURN_HEAD',channels:[
   rotations(3,'Y',[0,12,0,-12,0]),rotations(4,'Y',[0,18,0,-18,0])]},
  {name:'AIG48_NOD_HEAD',channels:[
   rotations(4,'X',[0,-20,0,10,0])]},
  {name:'AIG48_SWING_PONYTAIL',channels:[
   rotations(5,'Z',[0,5,0,-5,0]),rotations(6,'Z',[0,24,0,-19,0])]}
 ];
 gltf.animations=clips.map(clip=>({
  name:clip.name,
  samplers:clip.channels.map(ch=>({input:timeAccessor,output:ch.output,interpolation:'LINEAR'})),
  channels:clip.channels.map((ch,i)=>({sampler:i,target:{node:ch.node,path:'rotation'}}))
 }));
 gltf.asset.generator='AIG-4.8-original-local-technical-skeletal-motion';
 gltf.extras={schema:AIG48_SCHEMA,originalSourceSHA256:[...draft.sourceSHA256],
  sharedHeadNeckSourcePreserved:true,technicalSkinnedMeshCount:2,
  animationClipNames:draft.animationNames,actualPhotoFaceMatchVerified:false,
  exactHairCollisionVerified:false,fullBodyRigVerified:false,
  nativeAndroidWindows60FPSVerified:false,validForFormalCharacterRelease:false};
 const bin=new Uint8Array(align4(cursor));
 for(const {offset:at,bytes} of segments)bin.set(bytes,at);
 gltf.buffers=[{byteLength:bin.length}];
 const raw=new TextEncoder().encode(JSON.stringify(gltf)),jlen=align4(raw.byteLength);
 const size=12+8+jlen+8+bin.length;
 if(size>8*1024*1024)throw Error('AIG48_GLTF_SIZE_BUDGET');
 const result=new Uint8Array(size),header=new DataView(result.buffer);
 header.setUint32(0,0x46546c67,true);header.setUint32(4,2,true);
 header.setUint32(8,size,true);header.setUint32(12,jlen,true);
 header.setUint32(16,0x4e4f534a,true);result.set(raw,20);
 result.fill(0x20,20+raw.length,20+jlen);
 const b=20+jlen;header.setUint32(b,bin.length,true);
 header.setUint32(b+4,0x004e4942,true);result.set(bin,b+8);
 return {bytes:result,container:'glb',sourceSHA256:[...draft.sourceSHA256],
  skinnedMeshCount:2,animationClips:3,releaseAllowed:false};
}
/** CPU-side sampled skinned-vertex evidence, independent of raster GPU/FPS. */
export async function auditAIG48Poses(draft){
 const glb=exportAIG48GLB(draft);
 const parsed=await new GLTFLoader().parseAsync(glb.bytes.buffer,'');
 const meshes=[];parsed.scene.traverse(x=>{if(x.isSkinnedMesh)meshes.push(x);});
 if(meshes.length!==2||parsed.animations.length!==3)
  throw Error('AIG48_GLTF_SKIN_OR_CLIPS_MISSING');
 const snapshots=[],temp=new Vector3(),mixer=new AnimationMixer(parsed.scene);
 let minArea=Infinity;
 for(const clip of parsed.animations){
  mixer.stopAllAction();mixer.uncacheRoot(parsed.scene);
  const action=mixer.clipAction(clip);action.play();
  const frames=[];
  for(const t of [0,.5,1,1.5,2]){
   mixer.setTime(t);parsed.scene.updateMatrixWorld(true);
   meshes.forEach(m=>m.skeleton.update());
   const vertices=meshes.map(mesh=>{
    const v=[],pos=mesh.geometry.getAttribute('position');
    for(let i=0;i<pos.count;i++){
     mesh.getVertexPosition(i,temp);
     if(![temp.x,temp.y,temp.z].every(finite))throw Error('AIG48_DEFORMATION_NAN');
     v.push([temp.x,temp.y,temp.z]);
    }
    const ix=mesh.geometry.index;
    for(let i=0;i<ix.count;i+=3){
     const a=v[ix.getX(i)],b=v[ix.getX(i+1)],c=v[ix.getX(i+2)];
     const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];
     const w=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
     const area=.5*Math.hypot(u[1]*w[2]-u[2]*w[1],
      u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]);
     minArea=Math.min(minArea,area);
    }
    return v;
   });
   frames.push({time:t,vertices});
  }
  const rest=frames[0].vertices,movement=frames.reduce((max,frame)=>
   Math.max(max,...frame.vertices.map((list,k)=>
    list.reduce((m,p,i)=>Math.max(m,Math.hypot(...p.map((x,j)=>x-rest[k][i][j]))),0))),0);
  snapshots.push({clip:clip.name,frameCount:frames.length,maxVertexDisplacement:movement,
   actualSkinnedVertices:frames[0].vertices.map(v=>v.length)});
  action.stop();
 }
 if(!(minArea>1e-10)||snapshots.some(s=>s.maxVertexDisplacement<=.00001))
  throw Error('AIG48_POSE_DEFORMATION_GATE_BLOCKED');
 return {schema:AIG48_SCHEMA,sourceSHA256:[...draft.sourceSHA256],
  actualThreeJsSkinnedMeshes:meshes.length,glbRoundtrip:true,
  sampledClips:snapshots,minSampledTriangleArea:minArea,
  sharedIndexedHeadNeckTopologyUnchanged:true,allSampledPositionsFinite:true,
  observedFullBodySkin:false,exactHairMeshIntersectionVerified:false,
  visualFaceMatchVerified:false,native60FpsVerified:false,releaseAllowed:false};
}
