import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG712SceneMap,addAIG712SceneFeature,
 exportAIG712SceneMap} from '../aig-scene-map-7-12.mjs';
import {createAIG20WorldScene,addAIG20WorldObject} from '../aig-world-scene-2-0.mjs';
import {listAIG21MapAnchors,alignAIG21ObjectToMap,
 assertAIG21AlignmentProvenance,AIG21_ALIGN_SCHEMA}
 from '../aig-map-model-alignment-2-1.mjs';
const sha='sha256:'+'a'.repeat(64);
function fixture(){
 const original=createAIG712SceneMap({id:'campus'});
 addAIG712SceneFeature(original,{id:'school',name:'school',
  category:'building',geometry:{type:'Polygon',coordinates:[[
   [10,20],[30,20],[30,40],[10,40],[10,20]
  ]]}});
 addAIG712SceneFeature(original,{id:'tree',name:'tree',
  category:'tree',geometry:{type:'Point',coordinates:[12,26]}});
 const snapshot=exportAIG712SceneMap(original);
 let world=createAIG20WorldScene({id:'campus',
  mapRef:{assetId:'map',sha256:sha,coordinateMode:'LOCAL_RELATIVE'}});
 world=addAIG20WorldObject(world,{nodeId:'building',assetId:'glb',
  sourceSha256:sha,category:'building',
  position:[0,5,0],scale:[2,2,2]});
 return {snapshot,world};
}
test('2.1 map source bounds centre aligns true GLB XZ only, not height',()=>{
 const {snapshot,world}=fixture(),anchors=listAIG21MapAnchors(snapshot);
 assert.equal(anchors.schema,AIG21_ALIGN_SCHEMA);
 const school=anchors.anchors.find(x=>x.featureId==='school');
 assert.deepEqual(school.mapXY,[20,30]);
 assert.equal(school.positionMethod,'BOUNDS_CENTRE_CANDIDATE_NOT_ENTRANCE');
 const tree=anchors.anchors.find(x=>x.featureId==='tree');
 assert.deepEqual(tree.mapXY,[12,26]);
 const after=alignAIG21ObjectToMap(world,snapshot,{
  nodeId:'building',featureId:'school',offsetXZ:[2,-1]
 });
 assert.deepEqual(after.objects[0].position,[22,5,29]);
 assert.deepEqual(after.objects[0].scale,[2,2,2]);
 assert.equal(after.objects[0].sourceSha256,sha);
 assert.deepEqual(world.objects[0].position,[0,5,0],'non-mutating source doc');
 assert.equal(after.objects[0].mapPlacement.sourceMapSHA256,sha);
 assert.equal(after.objects[0].mapPlacement.physicalScaleNotInvented,true);
 assert.equal(after.objects[0].mapPlacement.buildingFootprintNotExtruded,true);
 assert.equal(assertAIG21AlignmentProvenance(after,snapshot),true);
});
test('2.1 rejects fake map provenance and geometry edits while preserving original',()=>{
 const {snapshot,world}=fixture();
 assert.throws(()=>alignAIG21ObjectToMap(world,snapshot,{
  nodeId:'building',featureId:'missing'}),/OBJECT_OR_SOURCE_FEATURE_NOT_FOUND/);
 assert.throws(()=>alignAIG21ObjectToMap(world,snapshot,{
  nodeId:'building',featureId:'school',offsetXZ:[Infinity,0]}),
  /HORIZONTAL_OFFSET_INVALID/);
 const changed={...world,mapRef:{...world.mapRef,sha256:'sha256:'+'b'.repeat(64)}};
 const after=alignAIG21ObjectToMap(world,snapshot,{
  nodeId:'building',featureId:'tree'});
 assert.throws(()=>assertAIG21AlignmentProvenance({
  ...after,mapRef:changed.mapRef},snapshot),/MAP_ANCHOR_PROVENANCE_NOT_TRUSTED/);
 const altered=JSON.parse(JSON.stringify(snapshot));
 altered.map.features[0].geometry.coordinates[0][0]=[NaN,20];
 assert.throws(()=>alignAIG21ObjectToMap(world,altered,{
  nodeId:'building',featureId:'school'}),/AIG712_/);
});
test('2.1 never upgrades relative cartoon map/model to metre-accurate true scan',()=>{
 const {world,snapshot}=fixture();
 const updated=alignAIG21ObjectToMap(world,snapshot,{
  nodeId:'building',featureId:'school'});
 assert.equal(updated.coordinateMode,'LOCAL_RELATIVE');
 assert.equal(updated.workingUnits,'UNSCALED_SCENE_UNITS');
 assert.equal(updated.objects[0].physicalScaleReviewed,false);
 assert.equal(updated.originalAssetFilesModified,false);
 assert.equal(updated.objects[0].mapPlacement.yIsIndependentUserPlacedNotInferredHeight,true);
});
