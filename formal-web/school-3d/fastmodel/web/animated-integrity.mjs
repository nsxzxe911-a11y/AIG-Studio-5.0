/** FastModel 2.0: evaluate real GLB LINEAR rotation poses on CPU, no fake mesh approval.
 * All numeric gaps are SAMPLE-POINT proxies, NOT watertight/triangle collision proof.
 * No geometry or original GLB is changed.
 */
import {createPoseEvaluator} from './pose-evaluator.mjs';
export const ANIMATED_QA_VERSION='FASTMOTION_2_0_POSED_POINTS_NON_AUTHORITATIVE';
const blocked=(reason)=>({status:'BLOCKED',reason,source:ANIMATED_QA_VERSION,actualSeamFixed:false,
 animatedCollisionProved:false,actualVisualApproval:false,realDeviceTest:false});
const ident=()=>Float32Array.of(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1);
const mul=(a,b)=>{const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){
 let t=0;for(let k=0;k<4;k++)t+=a[k*4+r]*b[c*4+k];out[c*4+r]=t;
 }return out;};
const mapped=(m,p)=>[
 m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
 m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],
 m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]
];
function gather(file,reader,role,budget){
 const g=file.g,nodes=g.nodes.map((node,index)=>({node,index})).filter(x=>x.node.mesh!==undefined&&x.node.extras?.aigAnatomyPart===role);
 if(!nodes.length)return {error:'NO_EXPLICIT_'+role.toUpperCase()+'_MESH'};
 if(nodes.length>4)return {error:'TOO_MANY_'+role.toUpperCase()+'_NODES'};
 const vertices=[];
 for(const {node,index} of nodes){
  if(node.matrix||node.translation||node.rotation||node.scale||
    g.nodes.some(x=>(x.children||[]).includes(index)))return {error:'MESH_NODE_TRANSFORM_OR_PARENT_UNSUPPORTED'};
  if(!Number.isInteger(node.skin)||!g.skins?.[node.skin])return {error:'MESH_SKIN_MISSING'};
  const mesh=g.meshes[node.mesh];
  if(!mesh?.primitives?.length||mesh.primitives.length>6||mesh.weights?.length)return {error:'UNSUPPORTED_ROLE_MESH'};
  for(const p of mesh.primitives){
   if((p.mode??4)!==4||p.targets?.length||p.attributes?.POSITION===undefined||
      p.attributes.JOINTS_0===undefined||p.attributes.WEIGHTS_0===undefined)return {error:'REQUIRES_SKINNED_TRIANGLES_NO_MORPHS'};
   const acc=g.accessors[p.attributes.POSITION];
   if(!acc||acc.type!=='VEC3'||acc.count>budget*8)return {error:'VERTEX_ACCESSOR_BUDGET'};
   const pos=reader(file,p.attributes.POSITION),joints=reader(file,p.attributes.JOINTS_0),weights=reader(file,p.attributes.WEIGHTS_0);
   if(pos.length!==acc.count*3||joints.length!==acc.count*4||weights.length!==acc.count*4)return {error:'SKIN_ATTRIBUTE_LENGTH_MISMATCH'};
   const stride=Math.max(1,Math.ceil(acc.count/Math.max(1,Math.floor(budget/(nodes.length*mesh.primitives.length)))));
   for(let i=0;i<acc.count;i+=stride){
    if(vertices.length>=budget)return {error:'ROLE_VERTEX_BUDGET'};
    const p3=[...pos.subarray(i*3,i*3+3)],j4=[...joints.subarray(i*4,i*4+4)],w4=[...weights.subarray(i*4,i*4+4)];
    if([...p3,...j4,...w4].some(n=>!Number.isFinite(n))||
      j4.some(n=>!Number.isInteger(n)||n<0||n>=g.skins[node.skin].joints.length)||
      w4.some(n=>n<0)||Math.abs(w4.reduce((a,b)=>a+b,0)-1)>0.025)return {error:'INVALID_SKIN_VERTEX'};
    vertices.push({p:p3,j:j4,w:w4,skin:node.skin});
   }
  }
 }
 return {vertices,role,error:null};
}
function tracks(file,reader){
 const arr=[];let duration=0;
 for(const animation of file.g.animations||[]){
  for(const channel of animation.channels||[]){
   if(channel.target?.path!=='rotation')throw Error('UNSUPPORTED_ANIMATION_CHANNEL');
   const sampler=animation.samplers?.[channel.sampler];
   if(!sampler||sampler.interpolation&&sampler.interpolation!=='LINEAR')throw Error('UNSUPPORTED_ANIMATION_INTERPOLATION');
   const times=reader(file,sampler.input),values=reader(file,sampler.output);
   if(!times.length||!Number.isFinite(times[times.length-1]))throw Error('BAD_ANIMATION_DURATION');
   duration=Math.max(duration,times[times.length-1]);
   arr.push({node:channel.target.node,times,values});
  }
 }
 return {arr,duration};
}
function bounds(points){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const p of points)for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],p[j]);hi[j]=Math.max(hi[j],p[j]);}
 return {lo,hi};
}
function overlap(a,b,axis){return Math.max(0,Math.min(a.hi[axis],b.hi[axis])-Math.max(a.lo[axis],b.lo[axis]));}
function nearest(a,b,maxPairs){
 const pairs=a.length*b.length,stride=Math.max(1,Math.ceil(pairs/maxPairs));let best=Infinity,attempts=0;
 for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
  if((i*b.length+j)%stride!==0)continue;
  const p=a[i],q=b[j],d=Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);
  best=Math.min(best,d);attempts++;
 }
 return {distance:best,attempts,subsampled:stride>1};
}
export function inspectAnimatedIntegrity(file,reader,{frames=25,maxVerticesPerRole=480,maxPairsPerFrame=25000}={}){
 if(!file?.g?.nodes||!file.g.skins||typeof reader!=='function')return blocked('MISSING_REAL_SKINNED_GLB');
 if(!Number.isInteger(frames)||frames<3||frames>61||
    !Number.isInteger(maxVerticesPerRole)||maxVerticesPerRole<32||maxVerticesPerRole>1500||
    !Number.isInteger(maxPairsPerFrame)||maxPairsPerFrame<100||maxPairsPerFrame>100000)throw Error('ANIMATION_AUDIT_BUDGET');
 let source;
 try{source=tracks(file,reader);}catch(e){return blocked(e.message);}
 if(!source.arr.length||source.duration<=0||source.duration>120)return blocked('NO_SUPPORTED_ROTATION_ANIMATION');
 const roles={};
 for(const role of ['head','neck','hair']){
  const r=gather(file,reader,role,maxVerticesPerRole);
  if(r.error)return blocked(r.error);
  roles[role]=r.vertices;
 }
 const g=file.g,inverse=[];
 try{
  for(let si=0;si<g.skins.length;si++){
   const skin=g.skins[si];
   if(!skin?.joints?.length||skin.joints.length>256)throw Error('SKIN_BONE_COUNT_BUDGET');
   const matrices=skin.inverseBindMatrices===undefined?null:reader(file,skin.inverseBindMatrices);
   if(matrices&&matrices.length!==skin.joints.length*16)throw Error('SKIN_INVERSE_BIND_LENGTH');
   inverse.push(skin.joints.map((_,j)=>matrices?Float32Array.from(matrices.slice(j*16,(j+1)*16)):ident()));
  }
 }catch(e){return blocked(e.message);}
 let evaluator;
 try{evaluator=createPoseEvaluator(g.nodes,source.arr);}catch(e){return blocked('POSE_EVALUATOR_'+e.message);}
 const readings=[];let motion=0,lastHair=null;
 for(let step=0;step<frames;step++){
  const seconds=(step/frames)*source.duration;
  const world=evaluator.evaluate(seconds,true);
  const jointMatrices=g.skins.map((skin,si)=>skin.joints.map((node,j)=>mul(world[node],inverse[si][j])));
  function deform(v){
   const out=[0,0,0],joints=jointMatrices[v.skin];
   for(let k=0;k<4;k++){
    if(!v.w[k])continue;
    const p=mapped(joints[v.j[k]],v.p);
    for(let i=0;i<3;i++)out[i]+=v.w[k]*p[i];
   }
   if(out.some(x=>!Number.isFinite(x)))throw Error('POSE_DEFORMATION_NONFINITE');
   return out;
  }
  const head=roles.head.map(deform),neck=roles.neck.map(deform),hair=roles.hair.map(deform);
  if(lastHair)motion=Math.max(motion,Math.hypot(hair[0][0]-lastHair[0],hair[0][1]-lastHair[1],hair[0][2]-lastHair[2]));
  lastHair=hair[0];
  const h=bounds(hair),n=bounds(neck),nearestHeadNeck=nearest(head,neck,maxPairsPerFrame),
   nearestHairNeck=nearest(hair,neck,maxPairsPerFrame);
  const front=overlap(h,n,0)*overlap(h,n,1),side=overlap(h,n,2)*overlap(h,n,1);
  readings.push({frame:step,timeSec:+seconds.toFixed(5),
   headNeckNearestSample:+nearestHeadNeck.distance.toFixed(6),
   hairNeckNearestSample:+nearestHairNeck.distance.toFixed(6),
   frontBoxAreaOverlap:+front.toFixed(6),sideBoxAreaOverlap:+side.toFixed(6),
   geometrySamplingOnly:true});
 }
 const maxGap=Math.max(...readings.map(x=>x.headNeckNearestSample)),
   minHair=Math.min(...readings.map(x=>x.hairNeckNearestSample)),
   hairOverlapFrames=readings.filter(x=>x.frontBoxAreaOverlap>0||x.sideBoxAreaOverlap>0).map(x=>x.frame);
 return {status:'POSED_SAMPLE_RISK_REVIEW_REQUIRED',source:ANIMATED_QA_VERSION,
   sampledFrames:frames,clipDurationSec:source.duration,skinMatricesComputed:true,
   movementObserved:motion>1e-6,headNeckMaxNearestSample:maxGap,
   hairNeckMinNearestSample:minHair,hairOverlapFrames,readings,
   sourceVertexSampled:{head:roles.head.length,neck:roles.neck.length,hair:roles.hair.length},
   units:'GLB_MODEL_UNITS',actualSeamFixed:false,animatedCollisionProved:false,
   exactTrianglePenetrationTested:false,actualVisualApproval:false,realDeviceTest:false,
   warning:'Posed nearest vertex and AABB overlap are approximations, not topological weld, camera depth, skin penetration, real user-approved protagonist or FPS evidence.'};
}
