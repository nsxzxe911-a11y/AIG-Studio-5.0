/** AIG FastModel 5.0 — source-bound full humanoid and shoulder-neck connectivity QA.
 * Reads a separately imported real GLB; never fabricates a body/face or changes the viewer.
 * PASS here means only bounded structural validation, NOT approved heroine appearance.
 */
import {AnimationMixer,Vector3} from 'three';
export const AIG50_SCHEMA='AIG_FASTMODEL_5_0_FULLBODY_SHOULDER_NECK_QA_DRAFT';
const finite=Number.isFinite;
export const AIG50_REQUIRED_BONES=[
 'hips','spine','chest','neck','head','leftUpperArm','rightUpperArm',
 'leftForeArm','rightForeArm','leftUpperLeg','rightUpperLeg',
 'leftLowerLeg','rightLowerLeg','leftFoot','rightFoot'
];
export function aig50BoneRole(name){
 if(typeof name!=='string')return null;
 const s=name.toLowerCase().replace(/^mixamorig\d*:?/,'').replace(/[^a-z0-9]/g,'');
 const side=s.includes('left')?'left':s.includes('right')?'right':'';
 if(side){
  const prefix=side;
  if(/forearm|lowerarm/.test(s))return prefix+'ForeArm';
  if(/upperarm|(?<!fore)arm/.test(s))return prefix+'UpperArm';
  if(/lowerleg|calf|shin/.test(s))return prefix+'LowerLeg';
  if(/upperleg|upleg|thigh/.test(s))return prefix+'UpperLeg';
  if(/foot|ankle/.test(s))return prefix+'Foot';
 }
 if(/hip|pelvis|rootpelvis/.test(s))return 'hips';
 if(/neck/.test(s))return 'neck';
 if(/head/.test(s))return 'head';
 if(/chest|spine2|upperbody/.test(s))return 'chest';
 if(/spine/.test(s))return 'spine';
 return null;
}
function isDescendant(node,ancestor){
 let n=node?.parent;for(let k=0;n&&k<120;k++,n=n.parent)if(n===ancestor)return true;
 return false;
}
function inspectGeometry(mesh,budget){
 const geometry=mesh.geometry;
 const position=geometry?.getAttribute('position'),weight=geometry?.getAttribute('skinWeight'),
  joints=geometry?.getAttribute('skinIndex'),index=geometry?.index;
 if(!position||!weight||!joints||!index)throw Error('AIG50_SKIN_ATTRIBUTES_OR_INDEX_MISSING');
 const n=position.count,triangles=index.count/3;
 if(n<4||n>budget.maxVertices||triangles<1||triangles>budget.maxTriangles)
  throw Error('AIG50_MESH_BUDGET_OR_EMPTY');
 if(weight.count!==n||joints.count!==n||weight.itemSize<4||joints.itemSize<4||index.count%3)
  throw Error('AIG50_SKIN_ATTRIBUTE_DIMENSIONS');
 const skeleton=mesh.skeleton;
 if(!skeleton||!skeleton.bones?.length)throw Error('AIG50_NO_ACTUAL_SKINNED_SKELETON');
 const parent=new Uint32Array(n);for(let i=0;i<n;i++)parent[i]=i;
 const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
 const unite=(a,b)=>{const u=find(a),v=find(b);if(u!==v)parent[v]=u;};
 for(let i=0;i<index.count;i+=3){
  const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
  if(![a,b,c].every(v=>Number.isInteger(v)&&v>=0&&v<n)||a===b||b===c||a===c)
   throw Error('AIG50_INVALID_TRIANGLE_INDEX');
  unite(a,b);unite(b,c);
 }
 const comps=new Map(),coverage=new Map();
 const read4=(attr,i)=>[attr.getX(i),attr.getY(i),attr.getZ(i),attr.getW(i)];
 for(let i=0;i<n;i++){
  const p=[position.getX(i),position.getY(i),position.getZ(i)];
  if(!p.every(finite))throw Error('AIG50_NONFINITE_VERTEX');
  const w=read4(weight,i),j=read4(joints,i),total=w.reduce((a,b)=>a+b,0);
  if(!w.every(x=>finite(x)&&x>=0&&x<=1.00001)||Math.abs(total-1)>1e-3||
     !j.every(k=>Number.isInteger(k)&&k>=0&&k<skeleton.bones.length))
   throw Error('AIG50_INVALID_BONE_WEIGHT_OR_INDEX');
  const root=find(i);
  if(!comps.has(root))comps.set(root,new Map());
  for(let k=0;k<4;k++){
   if(w[k]<.12)continue;
   const role=aig50BoneRole(skeleton.bones[j[k]].name);
   if(!role)continue;
   const comp=comps.get(root);
   comp.set(role,(comp.get(role)||0)+1);
   coverage.set(role,(coverage.get(role)||0)+1);
  }
 }
 const bridgeComponents=[...comps].filter(([,roles])=>
  ['chest','neck','head'].every(key=>(roles.get(key)||0)>=2));
 return {vertexCount:n,triangleCount:triangles,componentCount:comps.size,
  roleCoverage:Object.fromEntries(coverage),
  shoulderToHeadSharedIndexedComponent:bridgeComponents.length>0,
  bridgeComponentVertexSupport:bridgeComponents.map(([id,roles])=>Object.fromEntries(roles))};
}
function snapshot(meshes,budget){
 const vec=new Vector3(),points=[];
 for(const m of meshes){
  const n=m.geometry.getAttribute('position').count;
  if(n>budget.maxVertices)throw Error('AIG50_POSE_VERTEX_BUDGET');
  const out=new Float32Array(n*3);
  for(let i=0;i<n;i++){
   m.getVertexPosition(i,vec).applyMatrix4(m.matrixWorld);
   if(![vec.x,vec.y,vec.z].every(finite))throw Error('AIG50_ANIMATED_NAN_VERTEX');
   out.set([vec.x,vec.y,vec.z],3*i);
  }
  points.push(out);
 }
 return points;
}
export async function auditAIG50FullBody(gltf,{sourceSHA256,maxVertices=20000,maxTriangles=40000,maxClipSamples=3}={}){
 if(!/^[a-f0-9]{64}$/i.test(sourceSHA256||''))throw Error('AIG50_EXACT_SOURCE_SHA_REQUIRED');
 const scene=gltf?.scene,clips=gltf?.animations||[];
 if(!scene?.traverse||!Array.isArray(clips))throw Error('AIG50_REAL_PARSED_GLTF_REQUIRED');
 const budget={maxVertices,maxTriangles};
 if(!Number.isInteger(maxVertices)||maxVertices<100||maxVertices>60000||
    !Number.isInteger(maxTriangles)||maxTriangles<100||maxTriangles>80000)
  throw Error('AIG50_BUDGET_INVALID');
 const meshes=[],allBones=new Set();
 scene.traverse(node=>{if(node.isSkinnedMesh){
  meshes.push(node);for(const bone of node.skeleton?.bones||[])allBones.add(bone);
 }});
 const roles=new Map(),duplicates=[];
 for(const bone of allBones){
  const role=aig50BoneRole(bone.name);
  if(!role)continue;
  if(roles.has(role)&&roles.get(role)!==bone)duplicates.push(role);
  else roles.set(role,bone);
 }
 const missing=AIG50_REQUIRED_BONES.filter(role=>!roles.has(role));
 const topologyProblems=[];
 const ancestorChecks=[['head','neck'],['neck','chest'],['chest','spine'],
 ['spine','hips'],['leftUpperArm','chest'],['rightUpperArm','chest'],
 ['leftUpperLeg','hips'],['rightUpperLeg','hips'],
 ['leftForeArm','leftUpperArm'],['rightForeArm','rightUpperArm'],
 ['leftLowerLeg','leftUpperLeg'],['rightLowerLeg','rightUpperLeg'],
 ['leftFoot','leftLowerLeg'],['rightFoot','rightLowerLeg']];
 for(const [child,parent] of ancestorChecks)
  if(roles.has(child)&&roles.has(parent)&&!isDescendant(roles.get(child),roles.get(parent)))
   topologyProblems.push(child+'-NOT-CHILD-OF-'+parent);
 const data=meshes.map(mesh=>({name:mesh.name,qa:inspectGeometry(mesh,budget)}));
 const bodyBridge=data.some(x=>x.qa.shoulderToHeadSharedIndexedComponent);
 const usedRoles=new Set(data.flatMap(x=>Object.keys(x.qa.roleCoverage)));
 const absentWeights=AIG50_REQUIRED_BONES.filter(r=>!usedRoles.has(r));
 const checksPassed=missing.length===0&&duplicates.length===0&&topologyProblems.length===0&&
  absentWeights.length===0&&bodyBridge;
 const poseReports=[];
 if(checksPassed&&clips.length){
  const mixer=new AnimationMixer(scene);
  const selected=clips.slice(0,maxClipSamples);
  for(const clip of selected){
   if(!finite(clip.duration)||clip.duration<=0||clip.duration>3600)throw Error('AIG50_ANIMATION_DURATION_INVALID');
   mixer.stopAllAction();
   scene.traverse(n=>{if(n.isBone){n.quaternion.identity();}});
   const action=mixer.clipAction(clip);action.reset().play();
   scene.updateMatrixWorld(true);mixer.setTime(0);scene.updateMatrixWorld(true);
   const rest=snapshot(meshes,budget);
   mixer.setTime(clip.duration*.5);scene.updateMatrixWorld(true);
   const mid=snapshot(meshes,budget);
   let changed=0;
   for(let k=0;k<rest.length;k++)for(let i=0;i<rest[k].length;i+=3)
    if(Math.hypot(rest[k][i]-mid[k][i],rest[k][i+1]-mid[k][i+1],
      rest[k][i+2]-mid[k][i+2])>1e-5)changed++;
   poseReports.push({clipName:clip.name,clipDuration:clip.duration,
    sampledSeconds:[0,clip.duration*.5],movedVertices:changed,animationDeformsGeometry:changed>0});
   action.stop();
  }
  mixer.stopAllAction();
 }
 const animationHasMovement=poseReports.some(x=>x.animationDeformsGeometry);
 const structuralGate=checksPassed&&animationHasMovement;
 return {schema:AIG50_SCHEMA,sourceSHA256,skinnedMeshCount:meshes.length,
  boneCount:allBones.size,requiredBoneCount:AIG50_REQUIRED_BONES.length,
  missingBones:missing,duplicateRoles:duplicates,hierarchyProblems:topologyProblems,
  rolesWithoutActualVertexWeights:absentWeights,meshes:data,
  shoulderNeckHeadActualSharedIndexedComponent:bodyBridge,
  skeletonTopologyGate:checksPassed,clipsAvailable:clips.length,
  poseReports,animationHasRealSkinnedVertexMotion:animationHasMovement,
  outcome:structuralGate?'STRUCTURAL_QA_PASS_ONLY':'BLOCKED',
  realHeroineSourceFaceMatched:false,actual45To50GeometryTransferVerified:false,
  hairVsBodyFullTriangleCollisionVerified:false,photoTextureVerified:false,
  realWindowsAndroid60FPSVerified:false,formalCharacterApproved:false,
  releaseAllowed:false};
}
