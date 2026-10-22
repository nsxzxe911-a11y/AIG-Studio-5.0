import test from 'node:test';
import assert from 'node:assert/strict';
import {
 AIG712_SCENE_MAP_SCHEMA,createAIG712SceneMap,addAIG712SceneFeature,
 summarizeAIG712SceneMap,compareAIG712SceneFeaturePercent,
 importAIG712GeoJSON,exportAIG712SceneMap,importAIG712SceneMap
} from '../aig-scene-map-7-12.mjs';

const box=(x,y,w,h)=>({type:'Polygon',coordinates:[[
 [x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]
]]});
test('7.12 map builds real layers without guessing physical sizes of buildings/trees/roads',()=>{
 const m=createAIG712SceneMap({id:'offline-scene',sourceLabel:'VIDEO_VIEW_1'});
 assert.equal(m.schema,AIG712_SCENE_MAP_SCHEMA);
 addAIG712SceneFeature(m,{id:'building_1',category:'building',name:'校園建物',geometry:box(5,5,40,60)});
 addAIG712SceneFeature(m,{id:'tree_1',category:'tree',name:'樹木 A',geometry:{type:'Point',coordinates:[58,12]}});
 addAIG712SceneFeature(m,{id:'road_1',category:'road',name:'學校道路',geometry:{type:'LineString',coordinates:[[0,80],[120,80],[130,90]]}});
 addAIG712SceneFeature(m,{id:'field_1',category:'sports_facility',name:'球場',geometry:box(62,30,35,24)});
 const s=summarizeAIG712SceneMap(m);
 assert.equal(s.features,4);
 assert.deepEqual(new Set(s.categories),new Set(['building','tree','road','sports_facility']));
 assert.equal(s.coordinateMode,'LOCAL_RELATIVE');
 assert.equal(s.inferredBuildingHeight,false);
 assert.equal(s.verifiedPersonScaleFromStreetMap,false);
 assert.equal(s.automaticallyGeolocatedFromPhoto,false);
 assert.equal(m.features.find(x=>x.id==='tree_1').measuredHeightM,null);
});
test('7.12 map computes class-independent exact percent footprint without claiming inferred millimetres',()=>{
 const m=createAIG712SceneMap({sourceLabel:'synthetic scene'});
 addAIG712SceneFeature(m,{id:'building',category:'building',name:'B',geometry:box(0,0,100,40)});
 addAIG712SceneFeature(m,{id:'sports',category:'sports_facility',name:'S',geometry:box(0,0,25,10)});
 const x=compareAIG712SceneFeaturePercent(m,{referenceId:'building',targetId:'sports',axis:'width'});
 assert.equal(x.apparentPercent,25);
 assert.equal(x.metricMapUnits,false);
 assert.equal(x.photoPerspectiveCorrectionPerformed,false);
 const y=compareAIG712SceneFeaturePercent(m,{referenceId:'building',targetId:'sports',axis:'area'});
 assert.equal(y.apparentPercent,6.25);
});
test('7.12 import local WGS84 GeoJSON from user supplied geodata, keep source attribution and 5km limits',()=>{
 const geo={type:'FeatureCollection',features:[
  {type:'Feature',properties:{category:'building',name:'Office'},
   geometry:{type:'Polygon',coordinates:[[
    [121.5,25.03],[121.5001,25.03],[121.5001,25.0301],[121.5,25.0301],[121.5,25.03]
   ]]}},
  {type:'Feature',properties:{category:'tree',name:'Park Tree'},
   geometry:{type:'Point',coordinates:[121.5002,25.0302]}},
  {type:'Feature',properties:{category:'road',name:'Local Road'},
   geometry:{type:'LineString',coordinates:[[121.5,25.0299],[121.5004,25.0299]]}}
 ]};
 const m=importAIG712GeoJSON(geo,{mapId:'taipei_sample',
  sourceLabel:'USER_SUPPLIED_TEST_GEOJSON'});
 assert.equal(m.features.length,3);
 assert.equal(m.coordinateMode,'WGS84_APPROX_LOCAL_METERS');
 assert.equal(m.features[0].metricGeometry,true);
 assert.equal(m.features[0].metricAccuracy,'APPROX_LOCAL_TANGENT_NOT_SURVEY');
 assert.ok(m.features[0].relativeArea>100);
 assert.equal(m.geoOrigin.lon,121.5);
 assert.equal(m.geoOrigin.lat,25.03);
 const restored=importAIG712SceneMap(exportAIG712SceneMap(m));
 assert.equal(restored.features.length,3);
 assert.equal(restored.geoOrigin.lon,m.geoOrigin.lon);
 const far=structuredClone(geo);
 far.features[1].geometry.coordinates=[122,25.1];
 assert.throws(()=>importAIG712GeoJSON(far,{sourceLabel:'bad'}),/FIVE_KILOMETRE/);
});
test('7.12 user measured local geometry and explicit reviewed building height remain separate',()=>{
 const m=createAIG712SceneMap({coordinateMode:'MEASURED_LOCAL_METERS',
  metresPerUnit:1,scaleReviewed:true,sourceLabel:'site-survey'});
 addAIG712SceneFeature(m,{id:'house',category:'house',name:'House',
  measuredHeightM:7.2,heightReviewed:true,geometry:box(0,0,10,8)});
 assert.equal(m.features[0].measuredHeightM,7.2);
 assert.equal(m.features[0].relativeArea,80);
 assert.equal(m.features[0].metricGeometry,true);
 assert.equal(m.worldCADMmFromThisMapVerified,false);
 assert.throws(()=>addAIG712SceneFeature(m,{id:'tree',category:'tree',name:'Tree',
  measuredHeightM:8,geometry:{type:'Point',coordinates:[12,12]}}),/HEIGHT_INVALID/);
});
test('7.12 malformed polygon and invented metre/GPS scale fail closed',()=>{
 assert.throws(()=>createAIG712SceneMap({coordinateMode:'MEASURED_LOCAL_METERS',
  metresPerUnit:1,sourceLabel:'unknown'}),/PHYSICAL_SCALE/);
 assert.throws(()=>createAIG712SceneMap({coordinateMode:'LOCAL_RELATIVE',
  metresPerUnit:1}),/PHYSICAL_SCALE/);
 const m=createAIG712SceneMap();
 assert.throws(()=>addAIG712SceneFeature(m,{id:'x',name:'Not closed',
  geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1]]]}}),/MUST_CLOSE/);
 assert.throws(()=>addAIG712SceneFeature(m,{id:'x',name:'hole',
  geometry:{type:'Polygon',coordinates:[
  [[0,0],[2,0],[2,2],[0,0]],
  [[.5,.5],[.6,.5],[.5,.6],[.5,.5]]
  ]}}),/HOLES_OR_TOPOLOGY/);
 assert.throws(()=>addAIG712SceneFeature(m,{id:'x',name:'bad category',
  category:'spaceship',geometry:{type:'Point',coordinates:[0,0]}}),/FEATURE_ID_CATEGORY/);
 assert.throws(()=>importAIG712SceneMap({schema:'fake',revision:1,map:{features:[]}}),/SCENE_MAP_JSON_INVALID/);
});
