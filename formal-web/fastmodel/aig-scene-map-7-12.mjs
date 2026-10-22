/**
 * FastModel 7.12 source-provenance SCENE MAP / MAP DATA LAYER.
 *
 * Houses, buildings, trees, roads, fields, water and vehicles are observed
 * 2D geometries with recorded provenance. Source scenes can be RELATIVE,
 * ground-measured local coordinates, or user supplied WGS84 GeoJSON. Never
 * invent true sizes from object classes (trees vary, road width varies).
 *
 * WGS84 local tangent-plane approximation is appropriate to short scenes
 * only (<= 5 km); GIS approximations are not survey/cadastral/mm precision.
 * Geometry and map provenance are kept independent of video camera-pose data.
 */
export const AIG712_SCENE_MAP_SCHEMA='AIG_FASTMODEL_7_12_SOURCE_SCENE_MAP_DATA';
export const AIG712_SCENE_MAP_CATEGORIES=Object.freeze([
 'building','house','tree','road','sports_facility','water','vehicle','landmark','other'
]);
const finite=Number.isFinite, R=6378137,rad=Math.PI/180;
const validID=s=>typeof s==='string'&&s.length>0&&s.length<=96&&/^[A-Za-z0-9_-]+$/.test(s);
const allowedGeometry=Object.freeze({Point:1,LineString:2,Polygon:3});
function xy(p){
 if(!Array.isArray(p)||p.length<2||!finite(p[0])||!finite(p[1])||
 Math.abs(p[0])>1e9||Math.abs(p[1])>1e9)
  throw Error('AIG712_MAP_COORDINATES_INVALID');
 return [p[0],p[1]];
}
function normalizeGeom(geometry){
 if(!geometry||!allowedGeometry[geometry.type])throw Error('AIG712_MAP_GEOMETRY_NOT_SUPPORTED');
 const type=geometry.type;
 if(type==='Point')return {type,coordinates:xy(geometry.coordinates)};
 if(type==='LineString'){
  if(!Array.isArray(geometry.coordinates)||geometry.coordinates.length<2||
  geometry.coordinates.length>2048)throw Error('AIG712_MAP_LINE_INVALID');
  return {type,coordinates:geometry.coordinates.map(xy)};
 }
 if(!Array.isArray(geometry.coordinates)||geometry.coordinates.length!==1||
  !Array.isArray(geometry.coordinates[0])||
  geometry.coordinates[0].length<4||geometry.coordinates[0].length>2048)
  throw Error('AIG712_MAP_POLYGON_HOLES_OR_TOPOLOGY_NOT_SUPPORTED');
 const points=geometry.coordinates[0].map(xy);
 if(Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])>1e-6)
  throw Error('AIG712_MAP_POLYGON_MUST_CLOSE');
 let area=0;for(let i=0;i<points.length-1;i++){
  area+=points[i][0]*points[i+1][1]-points[i+1][0]*points[i][1];
 }
 if(Math.abs(area)<1e-8)throw Error('AIG712_MAP_DEGENERATE_POLYGON');
 return {type,coordinates:[points]};
}
function points(geometry){
 return geometry.type==='Point'?[geometry.coordinates]:
  geometry.type==='Polygon'?geometry.coordinates[0]:geometry.coordinates;
}
function bounds(geometry){
 const p=points(geometry);return {
  minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),
  minY:Math.min(...p.map(v=>v[1])),maxY:Math.max(...p.map(v=>v[1]))
 };
}
function distance(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1]);}
function length(geometry){
 const p=points(geometry);if(geometry.type==='Point')return 0;
 let total=0;for(let i=1;i<p.length;i++)total+=distance(p[i],p[i-1]);
 return total;
}
function area(geometry){
 if(geometry.type!=='Polygon')return 0;
 const p=geometry.coordinates[0];let s=0;
 for(let i=0;i<p.length-1;i++)s+=p[i][0]*p[i+1][1]-p[i+1][0]*p[i][1];
 return Math.abs(s)/2;
}
function geoAnchor(v){
 if(!v||!finite(v.lon)||!finite(v.lat)||Math.abs(v.lon)>180||Math.abs(v.lat)>85)
  throw Error('AIG712_MAP_GEO_ANCHOR_INVALID');
 return {lon:v.lon,lat:v.lat};
}
function lonLatToLocal(v,origin){
 const lon=v[0],lat=v[1];
 if(Math.abs(lon)>180||Math.abs(lat)>85)
  throw Error('AIG712_MAP_WGS84_COORDINATES_INVALID');
 const x=R*(lon-origin.lon)*rad*Math.cos(origin.lat*rad),
  y=R*(lat-origin.lat)*rad;
 if(Math.hypot(x,y)>5000)throw Error('AIG712_MAP_OUTSIDE_FIVE_KILOMETRE_LOCAL_PROJECTION');
 return [x,y];
}
export function createAIG712SceneMap({
 id='scene',coordinateMode='LOCAL_RELATIVE',
 metresPerUnit=null,scaleReviewed=false,
 geoOrigin=null,sourceLabel='LOCAL_USER_INPUT',
 sourceRights='USER_PROVIDED'
}={}){
 if(!validID(id)||
 !['LOCAL_RELATIVE','MEASURED_LOCAL_METERS','WGS84_APPROX_LOCAL_METERS'].includes(coordinateMode)||
 typeof sourceLabel!=='string'||!sourceLabel.trim()||sourceLabel.length>160||
 typeof sourceRights!=='string'||!sourceRights.trim()||sourceRights.length>160)
  throw Error('AIG712_MAP_SOURCE_INVALID');
 if(coordinateMode==='LOCAL_RELATIVE'&&(metresPerUnit!==null||geoOrigin!==null)||
 coordinateMode==='MEASURED_LOCAL_METERS'&&(!scaleReviewed||metresPerUnit!==1||geoOrigin!==null)||
 coordinateMode==='WGS84_APPROX_LOCAL_METERS'&&(!geoOrigin||!scaleReviewed||metresPerUnit!==1))
  throw Error('AIG712_MAP_PHYSICAL_SCALE_NOT_PROVEN');
 return {schema:AIG712_SCENE_MAP_SCHEMA,id,coordinateMode,
  metresPerUnit:coordinateMode==='LOCAL_RELATIVE'?null:1,
  sourceLabel,sourceRights,geoOrigin:geoOrigin?geoAnchor(geoOrigin):null,
  isSurveyAccurate:false,features:[],revision:0,
  physicalDimensionsKnown:coordinateMode!=='LOCAL_RELATIVE',
  worldCADMmFromThisMapVerified:false};
}
export function addAIG712SceneFeature(map,{
 id,category='other',name,geometry,
 sourceFrameId=null,
 measuredHeightM=null,heightReviewed=false
}={}){
 if(map?.schema!==AIG712_SCENE_MAP_SCHEMA||map.features.length>=256||
 !validID(id)||map.features.some(f=>f.id===id)||
 !AIG712_SCENE_MAP_CATEGORIES.includes(category)||
 typeof name!=='string'||!name.trim()||name.length>128||
 sourceFrameId!==null&&(typeof sourceFrameId!=='string'||sourceFrameId.length>120)||
 measuredHeightM!==null&&(!finite(measuredHeightM)||measuredHeightM<=0||measuredHeightM>20000)||
 measuredHeightM!==null&&!heightReviewed)
  throw Error('AIG712_MAP_FEATURE_ID_CATEGORY_OR_HEIGHT_INVALID');
 const g=normalizeGeom(geometry),b=bounds(g);
 const feature={
  id,category,name,geometry:g,sourceFrameId,
  measuredHeightM,heightReviewed:measuredHeightM!==null&&heightReviewed,
  bounds:b,pointCount:points(g).length,relativeLength:length(g),
  relativeArea:area(g),
  metricGeometry:map.physicalDimensionsKnown,
  metricAccuracy:map.coordinateMode==='WGS84_APPROX_LOCAL_METERS'?
   'APPROX_LOCAL_TANGENT_NOT_SURVEY':map.physicalDimensionsKnown?'USER_MEASURED':'UNKNOWN_RELATIVE',
  classHasNoDefaultPhysicalSize:true
 };
 map.features.push(feature);map.revision++;
 return {id,category,revision:map.revision};
}
export function summarizeAIG712SceneMap(map){
 if(map?.schema!==AIG712_SCENE_MAP_SCHEMA)throw Error('AIG712_MAP_INVALID');
 const all=map.features.flatMap(f=>points(f.geometry));
 const extent=all.length?{
  minX:Math.min(...all.map(p=>p[0])),maxX:Math.max(...all.map(p=>p[0])),
  minY:Math.min(...all.map(p=>p[1])),maxY:Math.max(...all.map(p=>p[1]))
 }:null;
 return {schema:map.schema,id:map.id,revision:map.revision,
  categories:[...new Set(map.features.map(f=>f.category))],
  features:map.features.length,extent,
  coordinateMode:map.coordinateMode,units:
   map.physicalDimensionsKnown?'METRES_APPROX_OR_MEASURED':'UNSCALED_SCENE_UNITS',
  sourceLabel:map.sourceLabel,sourceRights:map.sourceRights,
  realGPSOrigin:map.geoOrigin,
  automaticallyGeolocatedFromPhoto:false,
  inferredBuildingHeight:false,
  verifiedPersonScaleFromStreetMap:false,
  dense3DWorldReconstructed:false};
}
export function compareAIG712SceneFeaturePercent(map,{referenceId,targetId,axis='width'}={}){
 if(map?.schema!==AIG712_SCENE_MAP_SCHEMA||
 !['width','height','length','area'].includes(axis))
  throw Error('AIG712_MAP_COMPARISON_INVALID');
 const ref=map.features.find(f=>f.id===referenceId),
  target=map.features.find(f=>f.id===targetId);
 if(!ref||!target||ref.id===target.id)
  throw Error('AIG712_MAP_FEATURE_REFERENCE_NOT_FOUND');
 function measure(f){
  if(axis==='width')return f.bounds.maxX-f.bounds.minX;
  if(axis==='height')return f.bounds.maxY-f.bounds.minY;
  if(axis==='length')return f.relativeLength;
  return f.relativeArea;
 }
 const a=measure(ref),b=measure(target);
 if(a<=1e-9||b<0)throw Error('AIG712_MAP_INCOMPATIBLE_MEASUREMENTS');
 return {schema:AIG712_SCENE_MAP_SCHEMA,referenceId,targetId,axis,
  apparentPercent:b/a*100,referenceLength:a,targetLength:b,
  metricMapUnits:map.physicalDimensionsKnown,
  sourceProvenance:map.sourceLabel,
  metricFromRelativeOnly:false,
  photoPerspectiveCorrectionPerformed:false,
  classBasedPhysicalSizeAssumption:false};
}
export function importAIG712GeoJSON(json,{
 mapId='imported_map',sourceLabel,sourceRights='USER_SUPPLIED_GEODATA',
 anchor=null,maxFeatures=128
}={}){
 if(!json||json.type!=='FeatureCollection'||!Array.isArray(json.features)||
 json.features.length<1||json.features.length>maxFeatures||maxFeatures>256||
 typeof sourceLabel!=='string'||!sourceLabel.trim())
  throw Error('AIG712_GEOJSON_FEATURE_COLLECTION_OR_SOURCE_REQUIRED');
 function firstGeo(g){
  let x=g.coordinates;while(Array.isArray(x)&&Array.isArray(x[0]))x=x[0];
  return xy(x);
 }
 const sourceAnchor=anchor?geoAnchor(anchor):
  geoAnchor({lon:firstGeo(json.features[0].geometry)[0],
   lat:firstGeo(json.features[0].geometry)[1]});
 const map=createAIG712SceneMap({id:mapId,coordinateMode:'WGS84_APPROX_LOCAL_METERS',
  metresPerUnit:1,scaleReviewed:true,geoOrigin:sourceAnchor,sourceLabel,sourceRights});
 for(let i=0;i<json.features.length;i++){
  const f=json.features[i],g=normalizeGeom(f.geometry);
  function transform(p){return lonLatToLocal(p,sourceAnchor);}
  const coords=g.type==='Point'?transform(g.coordinates):
   g.type==='LineString'?g.coordinates.map(transform):[g.coordinates[0].map(transform)];
  const ct=String(f.properties?.category??f.properties?.type??'other').toLowerCase();
  const category=AIG712_SCENE_MAP_CATEGORIES.includes(ct)?ct:'other';
  const name=String(f.properties?.name??category+'-'+(i+1)).slice(0,128);
  addAIG712SceneFeature(map,{
   id:'geo_'+(i+1),category,name,geometry:{type:g.type,coordinates:coords}
  });
 }
 return map;
}
export function exportAIG712SceneMap(map){
 summarizeAIG712SceneMap(map);
 return {schema:map.schema,revision:1,map:{
  id:map.id,coordinateMode:map.coordinateMode,
  metresPerUnit:map.metresPerUnit,
  sourceLabel:map.sourceLabel,sourceRights:map.sourceRights,
  geoOrigin:map.geoOrigin,
  features:map.features.map(f=>({id:f.id,category:f.category,name:f.name,
   geometry:f.geometry,sourceFrameId:f.sourceFrameId,
   measuredHeightM:f.measuredHeightM,heightReviewed:f.heightReviewed}))
 },originalPhotosOrVideosIncluded:false,actual3DMeshCreated:false};
}
export function importAIG712SceneMap(snapshot){
 if(snapshot?.schema!==AIG712_SCENE_MAP_SCHEMA||snapshot.revision!==1||
 !snapshot.map||!Array.isArray(snapshot.map.features)||
 snapshot.map.features.length>256)
  throw Error('AIG712_SCENE_MAP_JSON_INVALID');
 const m=snapshot.map,out=createAIG712SceneMap({
  id:m.id,coordinateMode:m.coordinateMode,metresPerUnit:m.metresPerUnit,
  scaleReviewed:m.coordinateMode!=='LOCAL_RELATIVE',
  geoOrigin:m.geoOrigin,sourceLabel:m.sourceLabel,sourceRights:m.sourceRights
 });
 for(const feature of m.features)addAIG712SceneFeature(out,feature);
 return out;
}
