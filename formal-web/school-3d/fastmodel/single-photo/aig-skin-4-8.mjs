/** AIG FastModel 4.8: actual partial-joint skin + glTF animation on 4.7 technical geometry.
 * Not a scanned face, whole-body rig, exact hair collision, or device FPS evidence.
 */
import {AIG47_SCHEMA,exportAIG47GLB} from './aig-welded-4-7.mjs';
import {meshTopology} from './aig-head-neck-4-6.mjs';
import {AnimationMixer,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export const AIG48_SCHEMA='AIG_FASTMODEL_4_8_SKINNED_PARTIAL_RIG_DRAFT';
const align4=n=>(n+3)&~3;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const y=clamp(x);return y*y*(3-2*y)};
const finite=x=>Number.isFinite(x);
function pivotPositions(d){
 const neck=d.parts[0],hair=d.parts[1];
 const root=[0,neck.neckBottom,0],head=[0,neck.joinY-.027,0];
 const p=hair.positions;
 let hi=0,lo=0;
 for(let i=1;i<p.length/3;i++){
  if(p[i*3+1]>p[hi*3+1])hi=i;
  if(p[i*3+1]<p[lo*3+1])lo=i;
 }
 const hairRoot=[p[hi*3],p[hi*3+1],p[hi*3+2]];
 const hairTip=[p[lo*3],p[lo*3+1],p[lo*3+2]];
 if(hairRoot[1]-hairTip[1]<.05)throw Error('AIG48_HAIR_TOO_SHORT_FOR_SKIN');
 return {root,head,hairRoot,hairTip};
}
function weightsFor(part,pivots){
 const n=part.positions.length/3,joints=new Uint16Array(n*4),weights=new Float32Array(n*4);
 for(let i=0;i<n;i++){
  const y=part.positions[i*3+1];let ids,w;
  if(part.name==='headNeck'){
   const fraction=smooth((y-(pivots.head[1]-.040))/.100);
   ids=[0,1,0,0];w=[1-fraction,fraction,0,0];
  }else if(part.name==='ponytail'){
   const fraction=smooth((pivots.hairRoot[1]-y)/(pivots.hairRoot[1]-pivots.hairTip[1]));
   ids=[2,3,2,2];w=[1-fraction,fraction,0,0];
  }else throw Error('AIG48_PART_UNEXPECTED');
  joints.set(ids,i*4);weights.set(w,i*4);
  if(!w.every(finite)||Math.abs(w.reduce((a,b)=>a+b,0)-1)>1e-5)
   throw Error('AIG48_INVALID_SKIN_WEIGHTS');
 }
 return {joints,weights};
}
function quaternion(axis,angle){
 const s=Math.sin(angle/2),c=Math.cos(angle/2);
 return axis==='X'?[s,0,0,c]:axis==='Y'?[0,s,0,c]:[0,0,s,c];
}
export function buildAIG48Rig(draft){
 if(draft?.schema!==AIG47_SCHEMA||!draft.topologyQA||!draft.headNeckSharedVertexJoin||
    draft.parts?.length!==2||!Array.isArray(draft.sourceSHA256)||!draft.sourceSHA256.length||
    draft.parts.some(p=>!meshTopology(p).closed))throw Error('AIG48_SOURCE_47_BLOCKED');
 const pivots=pivotPositions(draft);
 const skinData=draft.parts.map(p=>weightsFor(p,pivots));
 return {schema:AIG48_SCHEMA,sourceSchema:AIG47_SCHEMA,sourceSHA256:[...draft.sourceSHA256],
  originalDraft:draft,pivots,skinData,boneNames:['neckRoot','headPivot','ponytailRoot','ponytailTip'],
  sourceSharedIndexedSurface:true,skinnedHeadNeck:true,skinnedPonytail:true,
  fullBodySkinningVerified:false,realHeroineFacialGeometryVerified:false,
  exactAnimatedHairCollisionVerified:false,realDevice60FPSVerified:false,
  releaseAllowed:false};
}
function glbPack(rig){
 if(rig?.schema!==AIG48_SCHEMA||rig.sourceSHA256.join('|')!==rig.originalDraft?.sourceSHA256.join('|'))
  throw Error('AIG48_SOURCE_STALE');
 const old=exportAIG47GLB(rig.originalDraft),source=old.bytes,dv=new DataView(source.buffer,source.byteOffset,source.byteLength);
 const jsonLength=dv.getUint32(12,true),oldBinOffset=20+jsonLength;
 const oldBinLength=dv.getUint32(oldBinOffset,true);
 const json=JSON.parse(JSON.stringify(old.json));
 const blocks=[source.slice(oldBinOffset+8,oldBinOffset+8+oldBinLength)];
 let offset=oldBinLength;
 function add(bytes,target){
  const pad=align4(offset)-offset;
  if(pad){blocks.push(new Uint8Array(pad));offset+=pad;}
  const view=json.bufferViews.length;
  json.bufferViews.push({...{buffer:0,byteOffset:offset,byteLength:bytes.byteLength},...(target?{target}:{})});
  blocks.push(new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength));offset+=bytes.byteLength;
  return view;
 }
 function accessor(bytes,componentType,type,count,target){
  const view=add(bytes,target),idx=json.accessors.length;
  json.accessors.push({bufferView:view,componentType,count,type});return idx;
 }
 rig.skinData.forEach((data,k)=>{
  const jointAccessor=accessor(new Uint8Array(data.joints.buffer),5123,'VEC4',data.joints.length/4,34962);
  const weightAccessor=accessor(new Uint8Array(data.weights.buffer),5126,'VEC4',data.weights.length/4,34962);
  json.meshes[k].primitives[0].attributes.JOINTS_0=jointAccessor;
  json.meshes[k].primitives[0].attributes.WEIGHTS_0=weightAccessor;
  json.nodes[k].skin=0;
 });
 const {root,head,hairRoot,hairTip}=rig.pivots;
 const minus=(a,b)=>a.map((v,i)=>v-b[i]);
 json.nodes.push(
  {name:'AIG48_neckRoot',translation:root,children:[3]},
  {name:'AIG48_headPivot',translation:minus(head,root),children:[4]},
  {name:'AIG48_ponytailRoot',translation:minus(hairRoot,head),children:[5]},
  {name:'AIG48_ponytailTip',translation:minus(hairTip,hairRoot)}
 );
 json.scenes[0].nodes.push(2);
 const inverse=new Float32Array(16*4);
 [root,head,hairRoot,hairTip].forEach((p,i)=>{
  const o=i*16;
  inverse[o]=inverse[o+5]=inverse[o+10]=inverse[o+15]=1;
  inverse[o+12]=-p[0];inverse[o+13]=-p[1];inverse[o+14]=-p[2];
 });
 const inverseAcc=accessor(new Uint8Array(inverse.buffer),5126,'MAT4',4);
 json.skins=[{name:'AIG48_partial_skin',inverseBindMatrices:inverseAcc,skeleton:2,joints:[2,3,4,5]}];
 const times=new Float32Array([0,.5,1,1.5,2]);
 const timeAcc=accessor(new Uint8Array(times.buffer),5126,'SCALAR',5);
 json.accessors[timeAcc].min=[0];json.accessors[timeAcc].max=[2];
 const wave=[0,1,0,-1,0];
 const clips=[
  {name:'AIG48_HEAD_YAW',motions:[{bone:3,axis:'Y',max:.42}]},
  {name:'AIG48_HEAD_NOD',motions:[{bone:3,axis:'X',max:.32}]},
  {name:'AIG48_PONYTAIL_SWING',motions:[{bone:5,axis:'Z',max:.48}]},
  {name:'AIG48_COMBINED',motions:[{bone:3,axis:'Y',max:.32},{bone:5,axis:'Z',max:.40}]}
 ];
 json.animations=clips.map(clip=>{
  const samplers=[],channels=[];
  clip.motions.forEach(m=>{
   const q=new Float32Array(wave.flatMap(f=>quaternion(m.axis,m.max*f)));
   const output=accessor(new Uint8Array(q.buffer),5126,'VEC4',wave.length);
   const idx=samplers.push({input:timeAcc,output,interpolation:'LINEAR'})-1;
   channels.push({sampler:idx,target:{node:m.bone,path:'rotation'}});
  });
  return {name:clip.name,samplers,channels};
 });
 json.asset.generator='AIG-FastModel-4.8-original-partial-skinned-technical-rig';
 json.extras={schema:AIG48_SCHEMA,originalSourceSHA256:rig.sourceSHA256,
  headNeckOneSharedIndexSurface:true,rigged:true,partialRigOnly:true,
  realFaceFromPhotoVerified:false,exactAnimatedHairCollisionVerified:false,
  nativeDevice60FPSVerified:false,validForFormalCharacterRelease:false};
 const padded=align4(offset),binary=new Uint8Array(padded);let pointer=0;
 for(const data of blocks){binary.set(data,pointer);pointer+=data.byteLength;}
 json.buffers[0].byteLength=padded;
 const jsonBytes=new TextEncoder().encode(JSON.stringify(json));
 const jlen=align4(jsonBytes.length),total=12+8+jlen+8+padded;
 if(total>8*1024*1024)throw Error('AIG48_GLB_BUDGET');
 const out=new Uint8Array(total),view=new DataView(out.buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,total,true);
 view.setUint32(12,jlen,true);view.setUint32(16,0x4e4f534a,true);
 out.set(jsonBytes,20);out.fill(32,20+jsonBytes.length,20+jlen);
 const h=20+jlen;view.setUint32(h,padded,true);view.setUint32(h+4,0x004e4942,true);out.set(binary,h+8);
 return {bytes:out,json,skinCount:1,animationNames:clips.map(c=>c.name),releaseAllowed:false};
}
export const exportAIG48GLB=glbPack;
export async function createAIG48PoseSampler(output){
 if(!output?.bytes||!output?.json?.skins?.length)throw Error('AIG48_GLB_SKIN_MISSING');
 const buffer=output.bytes.slice().buffer;
 const parsed=await new GLTFLoader().parseAsync(buffer,'');
 const meshes=[];parsed.scene.traverse(n=>{if(n.isSkinnedMesh)meshes.push(n);});
 if(meshes.length!==2||parsed.animations.length!==4||meshes.some(m=>!m.skeleton||!m.geometry.index))
  throw Error('AIG48_REAL_SKIN_LOADER_BLOCKED');
 const mixer=new AnimationMixer(parsed.scene);
 return {
  clipNames:parsed.animations.map(c=>c.name),
  sample(name,seconds){
   if(!finite(seconds)||seconds<0||seconds>2)throw Error('AIG48_TIME_BOUNDS');
   const clip=parsed.animations.find(c=>c.name===name);
   if(!clip)throw Error('AIG48_CLIP_UNKNOWN');
   mixer.stopAllAction();mixer.setTime(0);
   parsed.scene.traverse(n=>{if(n.isBone)n.quaternion.identity();});
   const action=mixer.clipAction(clip);action.reset().play();mixer.setTime(seconds);
   parsed.scene.updateMatrixWorld(true);
   const vector=new Vector3();
   const parts=meshes.map(m=>{
    const geom=m.geometry,n=geom.getAttribute('position').count;
    const positions=new Float32Array(n*3);
    for(let i=0;i<n;i++){
     m.getVertexPosition(i,vector).applyMatrix4(m.matrixWorld);
     if(![vector.x,vector.y,vector.z].every(finite))throw Error('AIG48_NAN_SKIN_POSE');
     positions.set([vector.x,vector.y,vector.z],i*3);
    }
    return {name:m.name.endsWith('headNeck')?'headNeck':'ponytail',positions,indices:geom.index.array};
   });
   action.stop();
   return {clip:name,seconds,parts,realSkinnedMeshSamples:true};
  }
 };
}
const area=(p,a,b,c)=>{
 const A=a*3,B=b*3,C=c*3;
 const ax=p[B]-p[A],ay=p[B+1]-p[A+1],az=p[B+2]-p[A+2];
 const bx=p[C]-p[A],by=p[C+1]-p[A+1],bz=p[C+2]-p[A+2];
 return Math.hypot(ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx)/2;
};
export function auditAIG48Pose(rig,pose){
 if(rig?.schema!==AIG48_SCHEMA||pose?.realSkinnedMeshSamples!==true||pose.parts?.length!==2)
  throw Error('AIG48_POSE_NOT_SAMPLED');
 const findings=[],parts=[];
 for(let part=0;part<2;part++){
  const base=rig.originalDraft.parts[part],posed=pose.parts[part];
  if(base.positions.length!==posed.positions.length||base.indices.length!==posed.indices.length)
   throw Error('AIG48_SKIN_INDEX_CHANGED');
  let collapsed=0,highStretch=0,minAreaRatio=Infinity,maxAreaRatio=0;
  for(let i=0;i<base.indices.length;i+=3){
   const [a,b,c]=base.indices.subarray(i,i+3),initial=area(base.positions,a,b,c),final=area(posed.positions,a,b,c);
   if(initial<1e-10)throw Error('AIG48_SOURCE_DEGENERATE_TRIANGLE');
   const ratio=final/initial;
   minAreaRatio=Math.min(minAreaRatio,ratio);maxAreaRatio=Math.max(maxAreaRatio,ratio);
   if(final<1e-10||ratio<.12)collapsed++;
   if(ratio>3.5)highStretch++;
  }
  parts.push({name:base.name,minAreaRatio,maxAreaRatio,collapsedTriangles:collapsed,highStretchTriangles:highStretch});
  if(collapsed)findings.push('COLLAPSED_TRIANGLE_'+base.name);
  if(highStretch)findings.push('HIGH_AREA_STRETCH_'+base.name);
 }
 return {schema:AIG48_SCHEMA,clip:pose.clip,seconds:pose.seconds,sourceSHA256:[...rig.sourceSHA256],
  parts,findings,topologicalSeamRetained:true,headNeckSharedIndexSurface:true,
  noVisibleTearingCertified:false,exactHairTriangleIntersectionsTested:false,
  realPhotoFaceVerified:false,device60FPSVerified:false,releaseAllowed:false};
}