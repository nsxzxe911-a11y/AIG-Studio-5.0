/**
 * AIG FastModel Real3D 2.1
 * Align a SOURCE-VERIFIED 7.12 map feature XY to a user-chosen existing 3D
 * object's ground-plane XZ without fabricating building height, survey
 * precision, GPS, mesh geometry or character rig.
 */
import {assertAIG20Document} from './aig-world-scene-2-0.mjs';
import {importAIG712SceneMap} from './aig-scene-map-7-12.mjs';
export const AIG21_ALIGN_SCHEMA='AIG_FASTMODEL_REAL3D_2_1_SOURCE_MAP_GROUND_ALIGNMENT';
const fail=s=>{throw Error('AIG21_'+s)};
const finite=Number.isFinite;
const validXY=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
function positions(geom){
 if(!geom)return fail('MISSING_GEO_FEATURE');
 const pts=geom.type==='Polygon'?geom.coordinates?.[0]:
  geom.type==='Point'?[geom.coordinates]:geom.coordinates;
 if(!['Point','Polygon','LineString'].includes(geom.type)||
  !Array.isArray(pts)||pts.length<1||pts.length>2048||
  !pts.every(validXY))fail('GEO_FEATURE_GEOMETRY_INVALID');
 return pts;
}
export function listAIG21MapAnchors(snapshot){
 const map=importAIG712SceneMap(snapshot);
 return {schema:AIG21_ALIGN_SCHEMA,mapId:map.id,
  coordinateMode:map.coordinateMode,
  anchors:map.features.map(f=>{
   const pts=positions(f.geometry);
   // For a ground-footprint, use the centre of its XY bounding extent.
   // Polygon centroid can lie outside a concave polygon; a selectable
   // bounding centre is an ALIGNMENT CANDIDATE, not verified entrance.
   const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
   return {featureId:f.id,category:f.category,name:f.name,
    mapXY:[(Math.min(...xs)+Math.max(...xs))/2,
     (Math.min(...ys)+Math.max(...ys))/2],
    positionMethod:f.geometry.type==='Point'?
     'OBSERVED_SOURCE_POINT':'BOUNDS_CENTRE_CANDIDATE_NOT_ENTRANCE',
    sourceCoordinateMode:map.coordinateMode,
    measuredHeightM:f.measuredHeightM??null,
    automatic3DHeightGenerated:false};
  })
 };
}
export function alignAIG21ObjectToMap(scene,snapshot,{
 nodeId,featureId,groundY=null,offsetXZ=[0,0]
}={}){
 assertAIG20Document(scene);
 if(!scene.mapRef)fail('WORLD_MAP_REFERENCE_REQUIRED');
 const map=listAIG21MapAnchors(snapshot);
 if(map.coordinateMode.replace('METERS','METRES')!==scene.coordinateMode)
  fail('MAP_AND_WORLD_COORDINATE_MODE_MISMATCH');
 const object=scene.objects.find(o=>o.nodeId===nodeId);
 const feature=map.anchors.find(f=>f.featureId===featureId);
 if(!object||!feature)fail('OBJECT_OR_SOURCE_FEATURE_NOT_FOUND');
 if(!validXY(offsetXZ)||offsetXZ.some(v=>Math.abs(v)>10000))
  fail('HORIZONTAL_OFFSET_INVALID');
 if(groundY!==null&&(!finite(groundY)||Math.abs(groundY)>10000))
  fail('GROUND_HEIGHT_INVALID');
 const next=JSON.parse(JSON.stringify(scene));
 const target=next.objects.find(o=>o.nodeId===nodeId);
 const [x,z]=feature.mapXY;
 const newX=x+offsetXZ[0],newZ=z+offsetXZ[1];
 if(Math.abs(newX)>10000||Math.abs(newZ)>10000)
  fail('MAP_OUTSIDE_SCENE_BOUNDARY');
 // Scene: x = map X, z = map Y. Vertical 3D y is intentionally preserved.
 target.position=[newX,groundY??object.position[1],newZ];
 target.mapPlacement={
  schema:AIG21_ALIGN_SCHEMA,featureId,sourceMapId:map.mapId,
  sourceMapSHA256:scene.mapRef.sha256,featureCategory:feature.category,
  groundPlaneAxes:'MAP_XY_TO_SCENE_XZ',
  origin:'MAP_SOURCE_POSITION_USER_SELECTED',
  sourcePositionMethod:feature.positionMethod,
  yIsIndependentUserPlacedNotInferredHeight:true,
  buildingFootprintNotExtruded:true,physicalScaleNotInvented:true
 };
 next.revision++;
 return next;
}
export function assertAIG21AlignmentProvenance(scene,snapshot){
 assertAIG20Document(scene);
 const map=listAIG21MapAnchors(snapshot);
 for(const object of scene.objects){
  const a=object.mapPlacement;
  if(!a)continue;
  if(a.schema!==AIG21_ALIGN_SCHEMA||
   !scene.mapRef||a.sourceMapSHA256!==scene.mapRef.sha256||
   a.sourceMapId!==map.mapId||
   !map.anchors.some(f=>f.featureId===a.featureId)||
   a.groundPlaneAxes!=='MAP_XY_TO_SCENE_XZ'||
   a.buildingFootprintNotExtruded!==true)
   fail('MAP_ANCHOR_PROVENANCE_NOT_TRUSTED');
 }
 return true;
}
