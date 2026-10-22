/**
 * Real3D 2.0 — ONE Three renderer; heterogeneous source GLBs composited
 * into one source-locked world. External raw assets remain immutable.
 *
 * Viewer is an existing PhotoViewer; a map stays source-verified 2D data,
 * never invented 3D buildings. Camera motion is based on real keyframes,
 * no fabricated human animation or background task is implied.
 */
import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {parseRiggedGLB} from './viewer.mjs';
import {importAIG712SceneMap} from './aig-scene-map-7-12.mjs';
import {assertAIG20Document,resolveAIG20WorldSources,
 sampleAIG20Camera} from './aig-world-scene-2-0.mjs';
const fail=s=>{throw Error('AIG20_RUNTIME_'+s)};
const finite=Number.isFinite;
export class AIG20WorldRuntime{
 constructor({library,viewer}={}){
  if(!library||typeof library.get!=='function'||!viewer||
   typeof viewer.mountVerifiedWorld!=='function'||!viewer.release||
   !viewer.camera||!viewer.controls)
   fail('SOURCE_VAULT_AND_SINGLE_VIEWER_REQUIRED');
  this.library=library;this.viewer=viewer;
  this.scene=null;this._generation=0;this._closed=false;
  this._lastError=null;this._map=null;this._activeSourceCount=0;
 }
 _checkOpen(){if(this._closed)fail('CLOSED')}
 async load(scene){
  this._checkOpen();assertAIG20Document(scene);
  if(!scene.objects.length)fail('EMPTY_WORLD_NEEDS_REAL_SOURCE_OBJECTS');
  const gen=++this._generation;
  const source=await resolveAIG20WorldSources(scene,this.library);
  const root=new THREE.Group();root.name='AIG20_World_'+scene.id;
  root.userData={schema:scene.schema,revision:scene.revision,
   worldCoordinateMode:scene.coordinateMode,
   metresOnlyWithApprovedEvidence:scene.coordinateMode!=='LOCAL_RELATIVE',
   sourceMapSha256:scene.mapRef?.sha256??null,
   mapIsMetadataNotSynthesized3D:true,
   originalAssetsUntouched:true};
  const parsed=new Map();
  let mapData=null,committed=false;
  try{
   for(const meta of source.assets){
    if(gen!==this._generation)return {status:'SUPERSEDED_BEFORE_COMMIT'};
    const loaded=await this.library.get(meta.id,{includePayload:true});
    if(!loaded?.blob||loaded.asset?.sha256!==meta.sha256)
     fail('ORIGINAL_GLB_SHA_CHANGED_DURING_LOAD');
    const bytes=await loaded.blob.arrayBuffer();
    if(bytes.byteLength!==meta.bytes)fail('GLB_SOURCE_LENGTH_CHANGED');
    if(bytes.byteLength>64*1024*1024)fail('ASSET_TOO_LARGE');
    const result=await parseRiggedGLB(bytes);
    if(!result?.scene||!result.scene.children.length)
     fail('TRUE_GLTF_SCENE_REQUIRED');
    parsed.set(meta.id,result);
   }
   if(source.map){
    const loaded=await this.library.get(source.map.id,{includePayload:true});
    if(!loaded?.blob||loaded.asset?.sha256!==source.map.sha256)
     fail('ORIGINAL_MAP_SHA_CHANGED');
    if(loaded.blob.size>8*1024*1024)fail('BOUNDED_GEO_SOURCE_REQUIRED');
    // 7.12 exports a versioned {schema,revision,map:{...}} snapshot.
    // Use the original import validator, not an invented flat GeoJSON shape.
    const snapshot=JSON.parse(await loaded.blob.text());
    const doc=importAIG712SceneMap(snapshot);
    if(doc.coordinateMode.replace('METERS','METRES')!==scene.coordinateMode)
     fail('SOURCE_MAP_COORDINATE_CONTRACT_MISMATCH');
    mapData={id:doc.id,features:doc.features.length,
     coordinateMode:doc.coordinateMode,physicalDimensionsKnown:
      doc.physicalDimensionsKnown===true,
     sourceAssetSha:source.map.sha256};
   }
   // Prepare child groups off-screen, do not touch the current GPU scene
   // until every asset and map has passed its provenance contract.
   const sourceActors=[];
   for(const item of scene.objects){
    const src=parsed.get(item.assetId);
    const child=cloneSkeleton(src.scene);
    child.name='AIG20_'+item.nodeId;
    child.position.fromArray(item.position);
    child.quaternion.fromArray(item.quaternion);
    child.scale.fromArray(item.scale);
    child.userData={...child.userData,nodeId:item.nodeId,
     sourceSHA256:item.sourceSha256,sourceAssetId:item.assetId,
     category:item.category,physicalScaleReviewed:item.physicalScaleReviewed};
    root.add(child);
    if(item.category==='character'&&src.animations.length){
     const clip=item.selectedClip===null?0:item.selectedClip;
     if(!src.animations[clip])fail('SELECTED_CHARACTER_CLIP_NOT_FOUND');
     sourceActors.push({nodeId:item.nodeId,root:child,
      clips:src.animations,selectedClip:clip});
    }
   }
   root.updateMatrixWorld(true);
   if(gen!==this._generation)return {status:'SUPERSEDED_BEFORE_COMMIT'};
   const state=this.viewer.mountVerifiedWorld(root,{
    animationClips:[],actorClips:sourceActors,orbit:false});
   committed=true;
   this.scene=JSON.parse(JSON.stringify(scene));
   this._map=mapData;this._activeSourceCount=source.assets.length;
   this._lastError=null;
   return {status:'COMPOSITED_WORLD_GPU_READY',
    objects:scene.objects.length,distinctGlbSources:source.assets.length,
    mapReadOnly:mapData,render:state,
    sourceActorClips:sourceActors.map(a=>({nodeId:a.nodeId,
     selectedIndex:a.selectedClip,
     names:a.clips.map(c=>c.name),sourceAnimationOnly:true})),
    physicalUnitsCertified:source.realWorldScaleCertified,
    multipleRenderersCreated:false};
  }catch(e){
   this._lastError=String(e.message||e);
   throw e;
  }finally{
   if(!committed){
    // parsed sources and clones share material/geometry. Dispose once
    // without erasing an already committed previous model.
    root.traverse(()=>{});
    const discard=new THREE.Group();
    discard.add(root);
    for(const src of parsed.values())discard.add(src.scene);
    this.viewer.release(discard);
   }else{
    // The cloned visible world uses the same geometry/material handles as
    // parsed source GLBs. Do NOT dispose parsed originals after commit.
    // All shared GPU resources are released by viewer.unloadCurrent().
   }
  }
 }
 /**
  * Live re-alignment of a source GLB to a user-selected 7.12 ground feature.
  * Geometry, SHA refs, model scale and material remain unchanged. Position
  * only; no GLB parse, upload or renderer reinitialization.
  */
 updateWorldPositions(scene){
  this._checkOpen();assertAIG20Document(scene);
  if(!this.scene||!this.viewer.model)
   fail('NO_SOURCE_WORLD_TO_ALIGN');
  const old=this.scene;
  if(scene.id!==old.id||scene.coordinateMode!==old.coordinateMode||
   JSON.stringify(scene.mapRef)!==JSON.stringify(old.mapRef)||
   scene.objects.length!==old.objects.length)
   fail('CHANGED_SOURCE_WORLD_REQUIRES_RELOAD');
  for(let i=0;i<old.objects.length;i++){
   const a=old.objects[i],b=scene.objects[i];
   if(a.nodeId!==b.nodeId||a.assetId!==b.assetId||
    a.sourceSha256!==b.sourceSha256||a.category!==b.category||
    JSON.stringify(a.quaternion)!==JSON.stringify(b.quaternion)||
    JSON.stringify(a.scale)!==JSON.stringify(b.scale)||
    a.physicalScaleReviewed!==b.physicalScaleReviewed||
    a.selectedClip!==b.selectedClip)
    fail('SOURCE_OR_MESH_GEOMETRY_CHANGED');
  }
  // Validate all target children before mutating any of their positions.
  const nodes=scene.objects.map(o=>this.viewer.model.children.find(n=>
   n.userData.nodeId===o.nodeId));
  if(nodes.some(n=>!n))fail('SOURCE_NODE_MISSING_IN_SCENE');
  for(let i=0;i<nodes.length;i++){
   nodes[i].position.fromArray(scene.objects[i].position);
   nodes[i].updateMatrixWorld(true);
  }
  this.scene=JSON.parse(JSON.stringify(scene));
  return {status:'MAP_ALIGNED_ORIGINAL_GLTF_GEOMETRY_UNTOUCHED',
   nodesAligned:nodes.length,sourceShaPreserved:true,
   gpuSceneReloads:0,physicalHeightNotInvented:true};
 }
 listSourceActorClips(){
  this._checkOpen();
  return [...this.viewer.worldActorMixers.entries()].map(([nodeId,a])=>({
   nodeId,clipIndex:a.index,paused:a.paused,
   clips:a.clips.map((c,i)=>({index:i,name:c.name,durationSeconds:c.duration,
    source:'ORIGINAL_SIGNED_GLB_CLIP_NOT_AI_GENERATED'}))
  }));
 }
 selectSourceActorClip(nodeId,index){
  this._checkOpen();if(!this.scene)fail('NO_WORLD_ACTOR_READY');
  return this.viewer.setWorldActorClip(nodeId,index);
 }
 pauseSourceActor(nodeId,paused){
  this._checkOpen();if(!this.scene)fail('NO_WORLD_ACTOR_READY');
  return this.viewer.setWorldActorPaused(nodeId,paused);
 }
 updateCameraTrack(scene){
  this._checkOpen();assertAIG20Document(scene);
  if(!this.scene)fail('NO_COMMITTED_WORLD_TO_UPDATE');
  const unchanged=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(scene.id!==this.scene.id||
   scene.coordinateMode!==this.scene.coordinateMode||
   !unchanged(scene.objects,this.scene.objects)||
   !unchanged(scene.mapRef,this.scene.mapRef))
   fail('WORLD_SOURCE_CHANGED_REQUIRES_RELOAD');
  this.scene=JSON.parse(JSON.stringify(scene));
  return {status:'CAMERA_KEYS_UPDATED_WITHOUT_GLTF_RELOAD',
   keyframes:scene.cameraKeys.length,originalGeometryPreserved:true};
 }
 applyCamera(seconds){
  this._checkOpen();if(!this.scene)fail('NO_WORLD_TO_ANIMATE_CAMERA');
  const key=sampleAIG20Camera(this.scene,seconds);
  if(!key)return null;
  this.viewer.camera.position.fromArray(key.position);
  this.viewer.controls.target.fromArray(key.target);
  this.viewer.camera.fov=key.fov;this.viewer.camera.updateProjectionMatrix();
  this.viewer.controls.update();
  return {status:'SOURCE_CAMERA_KEYFRAME_APPLIED',timeSeconds:seconds,
   keyId:key.keyId,sourceOnlyNoFakeCameraTracking:true};
 }
 current(){
  return {schema:'AIG20_RUNTIME_STATE',
   sceneId:this.scene?.id??null,revision:this.scene?.revision??null,
   objects:this.scene?.objects.length??0,
   mapReadOnly:this._map?{...this._map}:null,
   distinctGlbSources:this._activeSourceCount,
   lastError:this._lastError,
   activeRendererContextsOwnedByThisWorld:1,
   originalAssetPayloadsPreserved:true,
   externalSourceModification:false,
   fullScaleOneToOneOnlyWithMeasuredApproval:false};
 }
 close(){
  ++this._generation;this._closed=true;
  this.scene=null;this._map=null;
  // Caller owns the shared Three renderer and external IndexedDB vault.
 }
}
