/**
 * FastModel Real3D 1.8 — reversible static GLB GPU instancing.
 *
 * This batches repeated *identical reference* BufferGeometry+Material
 * primitives into actual THREE.InstancedMesh draw calls. A mesh will NEVER
 * be batched if it is skinned, morphed, named by an animation track, has
 * an animated ancestor, contains an unsupported material, has a negative
 * determinant, or differs in rendering behavior from its peers.
 *
 * No source geometry, vertices, bones, GLB bytes, animation clip, camera,
 * NC data or world-coordinate model source is overwritten. Disabling
 * restores every original mesh's visibility and disposes only instance
 * containers (shared geometry/material are owned by the GLB itself).
 */
import * as THREE from 'three';
export const AIG18_SCHEMA='AIG_FASTMODEL_REAL3D_1_8_STATIC_GPU_INSTANCING';
const MAX_MESHES=100000,MAX_INSTANCES=65535;
const unsafeMaterial=mat=>!mat||Array.isArray(mat)||mat.transparent||
 !!mat.alphaTest||mat.depthWrite===false||mat.visible===false||
 !('isMeshStandardMaterial' in mat||'isMeshBasicMaterial' in mat)||
 !(mat.isMeshStandardMaterial||mat.isMeshBasicMaterial)||
 typeof mat.onBeforeCompile==='function'&&mat.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile;
const noMorph=geo=>!geo?.morphAttributes||
 Object.values(geo.morphAttributes).every(v=>!v?.length);
const animatedNodes=(clips=[])=>{
 const names=new Set();
 for(const clip of clips){
  for(const track of (clip?.tracks||[])){
   if(typeof track?.name!=='string')return null;
   // GLTFLoader resolves bindings such as "Node.quaternion",
   // "Node.position", "Node.scale" and object paths.
   const name=track.name.split('.')[0];
   if(!name||name.includes('/'))return null; // ambiguous bindings: fail closed
   names.add(name);
  }
 }
 return names;
};
function staticSafe(node,root,names,animatedScene){
 if(!node?.isMesh||node.isSkinnedMesh||node.isInstancedMesh||
  node.isBatchedMesh||node.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender||
  !node.geometry?.isBufferGeometry||!node.geometry.attributes?.position||
  !node.material||unsafeMaterial(node.material)||!noMorph(node.geometry)||
  node.morphTargetInfluences?.length||node.geometry.attributes.skinIndex||
  node.userData?.aigDoNotInstance||node.userData?.aigDynamicGeometry||
  node.userData?.aigCollisionAuthority||node.matrixAutoUpdate===false&&
  node.matrix?.determinant?.()===0)return false;
 // Runtime source protection: with any clip, only explicit static
 // environment authoring flags can be batched. No arbitrary hero faces,
 // hair, accessory or rig-linked object is made into instances.
 if(animatedScene&&node.userData?.aigStaticInstanceSafe!==true)return false;
 for(let p=node;p;p=p.parent){
  if(!p.visible||p.userData?.aigDoNotInstance||
   p.userData?.aigDynamicGeometry||p.userData?.aigCollisionAuthority||
   names?.has(p.name)||names?.has(p.uuid))return false;
  if(p===root)return true;
 }
 return false;
}
const renderKey=n=>[
 n.castShadow?'cast':'no-cast',n.receiveShadow?'receive':'no-receive',
 n.layers.mask,n.renderOrder,n.frustumCulled?'frustum':'no-frustum',
 n.material.side,n.material.depthTest,n.material.depthWrite,
 n.material.blending
].join('|');

export function prepareAIG18StaticInstancing(root,clips=[],{
 minInstances=3,maxInstancesPerGroup=2048,maxTotalInstances=16384
}={}){
 if(!root?.isObject3D||!Array.isArray(clips)||
  !Number.isInteger(minInstances)||minInstances<2||minInstances>64||
  !Number.isInteger(maxInstancesPerGroup)||maxInstancesPerGroup<minInstances||
  maxInstancesPerGroup>MAX_INSTANCES||
  !Number.isInteger(maxTotalInstances)||maxTotalInstances<minInstances||
  maxTotalInstances>MAX_MESHES)
  throw Error('AIG18_STATIC_INSTANCE_OPTIONS_INVALID');
 const names=animatedNodes(clips);
 if(!names)throw Error('AIG18_AMBIGUOUS_ANIMATION_TRACK_BLOCKED');
 const groups=new Map();
 const identities=new WeakMap();let nextId=1;
 const id=obj=>{let v=identities.get(obj);
  if(!v){v=nextId++;identities.set(obj,v);}return v;};
 let inspected=0,eligible=0;
 root.updateWorldMatrix(true,true);
 const rootInverse=root.matrixWorld.clone().invert();
 root.traverse(node=>{
  inspected++;
  if(inspected>MAX_MESHES)throw Error('AIG18_TOO_MANY_SCENE_NODES');
  if(!staticSafe(node,root,names,clips.length>0))return;
  const transform=new THREE.Matrix4().multiplyMatrices(rootInverse,node.matrixWorld);
  // THREE.InstancedMesh cannot render negative determinant transforms.
  if(!Number.isFinite(transform.determinant())||transform.determinant()<=1e-10)return;
  eligible++;
  const key=id(node.geometry)+':'+id(node.material)+':'+renderKey(node);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push({node,transform});
 });
 const batches=[],accepted=[];
 let savedDrawCalls=0;
 for(const items of groups.values()){
  for(let start=0;start<items.length;start+=maxInstancesPerGroup){
   const piece=items.slice(start,start+maxInstancesPerGroup);
   if(piece.length<minInstances||accepted.length+piece.length>maxTotalInstances)
    continue;
   batches.push(piece);accepted.push(...piece);
   savedDrawCalls+=piece.length-1;
  }
 }
 return Object.freeze({
  schema:AIG18_SCHEMA,
  nodeCountInspected:inspected,
  eligibleStaticMeshes:eligible,
  groupedStaticMeshes:accepted.length,
  instanceDrawGroups:batches.length,
  theoreticalDrawCallsSaved:savedDrawCalls,
  sourcesWithAnimationClip:clips.length,
  planningOnly:true,active:false,
  noSourceMutation:true,noRigOrMorphChanges:true,
  _groups:batches,_root:root
 });
}
export function activateAIG18StaticInstancing(plan){
 if(plan?.schema!==AIG18_SCHEMA||!plan.planningOnly||
  !plan._root?.isObject3D||!Array.isArray(plan._groups))
  throw Error('AIG18_PLAN_FROM_CURRENT_LOADED_GLB_REQUIRED');
 const root=plan._root,created=[],source=[];
 try{
  // Commit is transactional: all instances are constructed with the
  // exact current GLB local->root transforms before originals are hidden.
  for(const group of plan._groups){
   const first=group[0].node;
   const instance=new THREE.InstancedMesh(first.geometry,first.material,group.length);
   instance.name='AIG18_Static_GPU_Instances_Not_Source_GLTF';
   instance.castShadow=first.castShadow;
   instance.receiveShadow=first.receiveShadow;
   instance.layers.mask=first.layers.mask;
   instance.renderOrder=first.renderOrder;
   instance.frustumCulled=false; // no false disappearing object bounds
   instance.userData.aigRuntimeDerivedInstance=true;
   for(let i=0;i<group.length;i++)instance.setMatrixAt(i,group[i].transform);
   instance.instanceMatrix.needsUpdate=true;
   root.add(instance);created.push(instance);
  }
  for(const group of plan._groups)for(const item of group){
   source.push({node:item.node,wasVisible:item.node.visible});
   item.node.visible=false;
  }
 }catch(error){
  for(const entry of source)entry.node.visible=entry.wasVisible;
  for(const instance of created){root.remove(instance);instance.dispose();}
  throw error;
 }
 let active=true;
 const restore=()=>{
  if(!active)return false;
  active=false;
  for(const entry of source)entry.node.visible=entry.wasVisible;
  for(const instance of created){root.remove(instance);instance.dispose();}
  return true;
 };
 const report=()=>Object.freeze({
  schema:AIG18_SCHEMA,active,groupedStaticMeshes:source.length,
  instanceDrawGroups:created.length,
  theoreticalDrawCallsSaved:plan.theoreticalDrawCallsSaved,
  sourceTrianglesUntouched:true,
  originalVisibleMeshesReversible:true,
  skipAnimatedAndSkinnedGeometry:true,
  geometriesDisposedByOptimizer:false,
  realFpsUpliftMeasured:false,nativeGpuFpsVerified:false
 });
 return Object.freeze({restore,report});
}
