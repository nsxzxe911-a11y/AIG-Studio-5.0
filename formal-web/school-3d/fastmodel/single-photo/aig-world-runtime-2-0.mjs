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
    const doc=JSON.parse(await loaded.blob.text());
    if(doc.schema!=='AIG_FASTMODEL_7_12_SOURCE_SCENE_MAP_DATA'||
     doc.coordinateMode!==scene.coordinateMode||!Array.isArray(doc.features)||
     doc.features.length>256)
     fail('SOURCE_MAP_COORDINATE_CONTRACT_MISMATCH');
    mapData={id:doc.id,features:doc.features.length,
     coordinateMode:doc.coordinateMode,physicalDimensionsKnown:
      doc.physicalDimensionsKnown===true,
     sourceAssetSha:source.map.sha256};
   }
   // Prepare child groups off-screen, do not touch the current GPU scene
   // until every asset and map has passed its provenance contract.
   let animate=null;
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
    if(item.category==='character'&&!animate&&src.animations.length){
     const clip=item.selectedClip===null?0:item.selectedClip;
     if(!src.animations[clip])fail('SELECTED_CHARACTER_CLIP_NOT_FOUND');
     // Only ONE actor's verified source GLB clip is active in 2.0.
     // This does not synthesize walking/running from text.
     animate=src.animations[clip];
    }
   }
   root.updateMatrixWorld(true);
   if(gen!==this._generation)return {status:'SUPERSEDED_BEFORE_COMMIT'};
   const state=this.viewer.mountVerifiedWorld(root,{
    animationClips:animate?[animate]:[],orbit:false});
   committed=true;
   this.scene=JSON.parse(JSON.stringify(scene));
   this._map=mapData;this._activeSourceCount=source.assets.length;
   this._lastError=null;
   return {status:'COMPOSITED_WORLD_GPU_READY',
    objects:scene.objects.length,distinctGlbSources:source.assets.length,
    mapReadOnly:mapData,render:state,
    clipPlaying:animate?.name??null,
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
