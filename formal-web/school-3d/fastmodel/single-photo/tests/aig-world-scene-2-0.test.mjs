import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG20_SCHEMA,createAIG20WorldScene,addAIG20WorldObject,
 addAIG20CameraKey,sampleAIG20Camera,assertAIG20Document,
 resolveAIG20WorldSources} from '../aig-world-scene-2-0.mjs';
const sha=s=>'sha256:'+s.repeat(64);
function refs(){
 const models=[
  {id:'heroine',title:'approved-source-reference',category:'character',
   sha256:sha('a'),mime:'model/gltf-binary',
   modelAccuracy:'ESTIMATED',coordinateUnits:'RELATIVE',
   reviewStatus:'unreviewed'},
  {id:'building',title:'campus-building',category:'building',
   sha256:sha('b'),mime:'model/gltf-binary',
   modelAccuracy:'NOT_VERIFIED',coordinateUnits:'UNKNOWN',
   reviewStatus:'unreviewed'},
  {id:'map',title:'source-map',category:'map',
   sha256:sha('c'),mime:'application/json',
   reviewStatus:'unreviewed'}
 ];
 return {models,library:{async get(id){return models.find(x=>x.id===id)||null}}};
}
test('2.0 preserves independent original references with same world axis and no fake 1:1',async()=>{
 const {library}=refs();
 const first=createAIG20WorldScene({id:'campus',title:'女主角於校園',
  mapRef:{assetId:'map',sha256:sha('c'),coordinateMode:'LOCAL_RELATIVE'}});
 const withHero=addAIG20WorldObject(first,{
  nodeId:'actor-1',assetId:'heroine',sourceSha256:sha('a'),
  category:'character',position:[1,0,2]});
 const next=addAIG20WorldObject(withHero,{
  nodeId:'school-1',assetId:'building',sourceSha256:sha('b'),
  category:'building',position:[6,0,-2],scale:[2,2,2]});
 assert.equal(first.objects.length,0);
 assert.equal(withHero.objects.length,1);
 assert.equal(next.objects.length,2);
 assert.equal(next.schema,AIG20_SCHEMA);
 assert.equal(next.workingUnits,'UNSCALED_SCENE_UNITS');
 assert.equal(next.originalAssetFilesModified,false);
 assert.equal(next.estimatedGeometryConvertedToMeasured,false);
 assert.equal(assertAIG20Document(next),true);
 const proof=await resolveAIG20WorldSources(next,library);
 assert.equal(proof.assets.length,2);
 assert.equal(proof.map.id,'map');
 assert.equal(proof.realWorldScaleCertified,false);
 assert.deepEqual(next.objects[1].position,[6,0,-2]);
});
test('2.0 prevents map/source SHA swap, invalid coordinates and silent metric elevation',async()=>{
 const {library,models}=refs();
 const scene=createAIG20WorldScene({id:'test'});
 assert.throws(()=>addAIG20WorldObject(scene,{
  nodeId:'a',assetId:'heroine',sourceSha256:sha('a'),
  category:'character',scale:[0,1,1]}),/OBJECT_SOURCE_OR_TRANSFORM_INVALID/);
 assert.throws(()=>addAIG20WorldObject(scene,{
  nodeId:'a',assetId:'heroine',sourceSha256:sha('a'),
  category:'character',quaternion:[1,1,1,1]}),/OBJECT_SOURCE_OR_TRANSFORM_INVALID/);
 const first=addAIG20WorldObject(scene,{
  nodeId:'a',assetId:'heroine',sourceSha256:sha('a'),
  category:'character'});
 assert.throws(()=>addAIG20WorldObject(first,{
  nodeId:'a',assetId:'building',sourceSha256:sha('b'),
  category:'building'}),/OBJECT_SOURCE_OR_TRANSFORM_INVALID/);
 models[0].sha256=sha('d');
 await assert.rejects(()=>resolveAIG20WorldSources(first,library),
  /GLB_ASSET_SHA_CATEGORY_OR_MEDIA_CHANGED/);
 assert.throws(()=>createAIG20WorldScene({
  mapRef:{assetId:'map',sha256:sha('c'),
   coordinateMode:'MEASURED_LOCAL_METRES'}
 }),/MAP_PROVENANCE_OR_COORDINATE_MODE_MISMATCH/);
});
test('2.0 metric world requires reviewed metre-scale assets, relative model blocked',async()=>{
 const x=refs(),doc=createAIG20WorldScene({
  id:'measured',coordinateMode:'MEASURED_LOCAL_METRES'});
 assert.throws(()=>addAIG20WorldObject(doc,{
  nodeId:'a',assetId:'heroine',sourceSha256:sha('a'),
  category:'character'}),/METRIC_OBJECT_SCALE_REQUIRES_REVIEW/);
 const world=addAIG20WorldObject(doc,{
  nodeId:'a',assetId:'heroine',sourceSha256:sha('a'),
  category:'character',physicalScaleReviewed:true});
 await assert.rejects(()=>resolveAIG20WorldSources(world,x.library),
  /METRIC_SCALE_MUST_BE_APPROVED_SOURCE_WITH_METRE_UNITS/);
 x.models[0].reviewStatus='approved';
 x.models[0].modelAccuracy='CALIBRATED_MEASURED';
 x.models[0].coordinateUnits='METRES';
 const proof=await resolveAIG20WorldSources(world,x.library);
 assert.equal(proof.realWorldScaleCertified,true);
});
test('2.0 real camera keys interpolate and hard cut without inventing animation',()=>{
 let s=createAIG20WorldScene({id:'campus'});
 s=addAIG20CameraKey(s,{keyId:'start',timeSeconds:0,
  position:[0,2,8],target:[0,0,0],fov:40});
 s=addAIG20CameraKey(s,{keyId:'mid',timeSeconds:4,
  position:[4,2,8],target:[4,0,0],fov:50,easing:'LINEAR'});
 let halfway=sampleAIG20Camera(s,2);
 assert.deepEqual(halfway.position,[2,2,8]);
 assert.equal(halfway.fov,45);
 s=addAIG20CameraKey(s,{keyId:'end',timeSeconds:8,
  position:[6,2,5],target:[6,0,0],fov:42,easing:'CUT'});
 assert.deepEqual(sampleAIG20Camera(s,7).position,[4,2,8]);
 assert.deepEqual(sampleAIG20Camera(s,8).position,[6,2,5]);
 assert.throws(()=>addAIG20CameraKey(s,{keyId:'duplicate',timeSeconds:8,
  position:[0,2,8],target:[0,0,0]}),/WORLD_CAMERA_TRACK_INVALID/);
 const tampered={...s,objects:[],cameraKeys:[
  {...s.cameraKeys[0],fov:0}]};
 assert.throws(()=>assertAIG20Document(tampered),/WORLD_CAMERA_TRACK_INVALID/);
});
