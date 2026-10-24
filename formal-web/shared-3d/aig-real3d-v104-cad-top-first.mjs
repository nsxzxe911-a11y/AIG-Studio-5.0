/**
 * V104: AI-CAD TOP-FIRST observation; CNC Z-up -> Real3D Y-up.
 * Six views are ON-DEMAND re-projections of ONE actual source indexed-XYZ
 * scene. No six independent fake meshes, no 18-dimensional geometry.
 *
 * IMPORTANT: Without calibrated geometry and height/depth source, a single
 * top image cannot certify an underside, face, human anatomy, or 3D volume.
 */
import {getAIG3DWorldMatrix,transformAIG3DPoint}
 from './aig-real3d-core.mjs';

export const AIG_REAL3D_V104_SCHEMA='AIG_REAL3D_V104_CAD_TOP_FIRST_SIX_FACE_ON_DEMAND_V1';
export const AIG_REAL3D_V104_AXES=Object.freeze({
 cnc:'CNC_RIGHT_HANDED_X_RIGHT_Y_PLAN_Z_UP',
 real3d:'REAL3D_RIGHT_HANDED_X_RIGHT_Y_UP_Z_FRONT',
 // R_x(-90): [Xc,Yc,Zc] -> [Xr,Zc,-Yc], det=+1.
 cncToReal3D:['Xc','Zc','-Yc']
});
export const AIG_REAL3D_V104_FACES=Object.freeze([
 Object.freeze({id:'TOP',normal:[0,1,0],right:[1,0,0],up:[0,0,-1],cncBdeg:null}),
 Object.freeze({id:'FRONT',normal:[0,0,1],right:[1,0,0],up:[0,1,0],cncBdeg:0}),
 Object.freeze({id:'BACK',normal:[0,0,-1],right:[-1,0,0],up:[0,1,0],cncBdeg:180}),
 Object.freeze({id:'LEFT',normal:[-1,0,0],right:[0,0,1],up:[0,1,0],cncBdeg:270}),
 Object.freeze({id:'RIGHT',normal:[1,0,0],right:[0,0,-1],up:[0,1,0],cncBdeg:90}),
 Object.freeze({id:'BOTTOM',normal:[0,-1,0],right:[1,0,0],up:[0,0,1],cncBdeg:null})
]);
const fail=x=>{throw Error('REAL3D_V104_'+x);};
const finite=Number.isFinite;
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const subtract=(a,b)=>a.map((x,i)=>x-b[i]);
const round=x=>Math.round(x*1e6)/1e6;
const checkVec=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const bounds=points=>{
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const p of points)for(let j=0;j<3;j++){
  min[j]=Math.min(min[j],p[j]);max[j]=Math.max(max[j],p[j]);
 }
 return {min,max};
};
function unitFactor(scene){
 if(!['MM','METERS'].includes(scene?.units))fail('EXPLICIT_METRIC_SCENE_UNITS_REQUIRED');
 return scene.units==='METERS'?1000:1;
}
export function convertAIGReal3DCNCToWorld(xyzCNCmm,{sceneUnits='MM'}={}){
 if(!checkVec(xyzCNCmm)||!['MM','METERS'].includes(sceneUnits))
  fail('CAD_AXIS_AND_UNITS_INVALID');
 const scale=sceneUnits==='METERS'?1/1000:1;
 return [xyzCNCmm[0]*scale,xyzCNCmm[2]*scale,-xyzCNCmm[1]*scale];
}
export function convertAIGReal3DWorldToCNC(xyzReal,{sceneUnits='MM'}={}){
 if(!checkVec(xyzReal)||!['MM','METERS'].includes(sceneUnits))
  fail('WORLD_AXIS_AND_UNITS_INVALID');
 const scale=sceneUnits==='METERS'?1000:1;
 return [xyzReal[0]*scale,-xyzReal[2]*scale,xyzReal[1]*scale];
}
export function auditAIGReal3DV104Axes(){
 const faces=AIG_REAL3D_V104_FACES.map(face=>{
  const n=cross(face.right,face.up);
  if(dot(n,face.normal)!==1||
   dot(face.right,face.up)!==0||
   dot(face.normal,face.up)!==0||
   dot(face.right,face.normal)!==0)fail('SIX_FACE_HANDEDNESS_INVALID');
  return {id:face.id,normal:[...face.normal],right:[...face.right],
   up:[...face.up],cncBdeg:face.cncBdeg};
 });
 const ids=new Set(faces.map(x=>x.id));
 if(ids.size!==6)fail('SIX_DISTINCT_FACES_REQUIRED');
 return {schema:'AIG_REAL3D_V104_SIX_FACE_BASIS_QA_V1',
  cncMasterOriginMM:[0,0,0],real3dWorldOrigin:[0,0,0],
  coordinateTransform:AIG_REAL3D_V104_AXES.cncToReal3D,
  worldCoordinateDegreesOfFreedom:3,independentFaceViewCount:6,
  sixViewsEachWithThreeCoordinates:18,
  physicallyEighteenDimensions:false,
  rightHandedBasisPASS:true,faces,releasePASS:false};
}
function sourceScene(scene){
 const factor=unitFactor(scene);
 if(scene.schema!=='AIG_REAL3D_SCENE_V1'||!Array.isArray(scene.nodes)||
  !scene.nodes.length||scene.nodes.length>128)fail('INDEXED_SOURCE_SCENE_REQUIRED');
 const nodes=[],all=[];
 let sourceFaces=0;
 for(const n of scene.nodes){
  if(n.visible===false)continue;
  const m=n.mesh;
  if(!m?.actualXYZTriangles||!Array.isArray(m.positions)||
   m.positions.length!==m.vertexCount*3||
   !Array.isArray(m.indices)||m.indices.length!==m.triangleCount*3||
   !m.positions.every(finite)||m.indices.some(x=>!Number.isInteger(x)||x<0||x>=m.vertexCount))
   fail('ORIGINAL_INDEXED_TRIANGLE_SOURCE_REQUIRED');
  sourceFaces+=m.triangleCount;
  if(sourceFaces>50000||m.vertexCount>120000)
   fail('PREVIEW_BUDGET_USE_ON_DEMAND_LOD_OR_EXPLICIT_SOURCE');
  const worldMatrix=getAIG3DWorldMatrix(scene,n.id),world=[];
  for(let i=0;i<m.positions.length;i+=3){
   const v=transformAIG3DPoint(worldMatrix,m.positions.slice(i,i+3));
   if(!v.every(finite))fail('NONFINITE_WORLD_GEOMETRY');
   world.push(v);all.push(v);
  }
  nodes.push({id:n.id,world,indices:m.indices});
 }
 if(!nodes.length||!sourceFaces)fail('VISIBLE_SOURCE_GEOMETRY_MISSING');
 return {nodes,all,sourceFaces,factor,worldBounds:bounds(all)};
}
function faceCoordinates(point,face,origin){
 const p=subtract(point,origin);
 return [dot(p,face.right),dot(p,face.up),dot(p,face.normal)];
}
function renderDepth(source,face,origin,resolution){
 // Each view reprojects the ACTUAL same XYZ meshes: no copies/remeshing.
 const projected=source.all.map(p=>faceCoordinates(p,face,origin));
 const b=bounds(projected);
 const dx=Math.max(1e-9,b.max[0]-b.min[0]),
  dy=Math.max(1e-9,b.max[1]-b.min[1]),
  buffer=new Float64Array(resolution*resolution).fill(-Infinity),
  faceIds=new Int32Array(resolution*resolution).fill(-1),
  sourceIds=new Array(resolution*resolution).fill(null);
 let edgeOnFaces=0;
 for(const node of source.nodes){
  const transformed=node.world.map(p=>faceCoordinates(p,face,origin));
  for(let k=0;k<node.indices.length;k+=3){
   const a=transformed[node.indices[k]],bb=transformed[node.indices[k+1]],
    c=transformed[node.indices[k+2]];
   const pa=[(a[0]-b.min[0])/dx*resolution,(b.max[1]-a[1])/dy*resolution],
    pb=[(bb[0]-b.min[0])/dx*resolution,(b.max[1]-bb[1])/dy*resolution],
    pc=[(c[0]-b.min[0])/dx*resolution,(b.max[1]-c[1])/dy*resolution];
   const area=(pb[1]-pc[1])*(pa[0]-pc[0])+
    (pc[0]-pb[0])*(pa[1]-pc[1]);
   if(Math.abs(area)<1e-12){edgeOnFaces++;continue;}
   const minX=Math.max(0,Math.floor(Math.min(pa[0],pb[0],pc[0]))),
    maxX=Math.min(resolution-1,Math.ceil(Math.max(pa[0],pb[0],pc[0]))),
    minY=Math.max(0,Math.floor(Math.min(pa[1],pb[1],pc[1]))),
    maxY=Math.min(resolution-1,Math.ceil(Math.max(pa[1],pb[1],pc[1])));
   for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
    const px=x+.5,py=y+.5;
    const wa=((pb[1]-pc[1])*(px-pc[0])+(pc[0]-pb[0])*(py-pc[1]))/area,
     wb=((pc[1]-pa[1])*(px-pc[0])+(pa[0]-pc[0])*(py-pc[1]))/area,
     wc=1-wa-wb;
    if(wa< -1e-9||wb< -1e-9||wc< -1e-9)continue;
    const depth=wa*a[2]+wb*bb[2]+wc*c[2],i=y*resolution+x;
    if(depth>buffer[i]+1e-10){
     buffer[i]=depth;faceIds[i]=k/3;sourceIds[i]=node.id;
    }
   }
  }
 }
 const depthGrid=[],occupiedGrid=[],faceIdGrid=[],hitNodeCounts={};
 let visibleCount=0,minDepth=Infinity,maxDepth=-Infinity;
 for(let i=0;i<buffer.length;i++){
  const hit=Number.isFinite(buffer[i]);
  if(hit){
   visibleCount++;minDepth=Math.min(minDepth,buffer[i]);
   maxDepth=Math.max(maxDepth,buffer[i]);
   hitNodeCounts[sourceIds[i]]=(hitNodeCounts[sourceIds[i]]??0)+1;
  }
  depthGrid.push(hit?round(buffer[i]):null);
  occupiedGrid.push(hit?1:0);
  faceIdGrid.push(faceIds[i]);
 }
 return {faceId:face.id,axes:{normal:[...face.normal],right:[...face.right],up:[...face.up]},
  cncBdeg:face.cncBdeg,resolution,
  sourceXYZPlaneBounds:{min:b.min.map(round),max:b.max.map(round)},
  depthGrid,occupiedGrid,faceIdGrid,sourceNodePixelCounts:hitNodeCounts,
  rasterizedSourceTriangleCount:source.sourceFaces,
  edgeOnSourceTriangles:edgeOnFaces,
  hitPixels:visibleCount,occupancy:visibleCount/(resolution*resolution),
  visibleDepthRange:visibleCount?{min:round(minDepth),max:round(maxDepth)}:null,
  basedOnOneRealXYZScene:true,
  unseenBackIsNotIndependentlyObserved:true,
  releasePASS:false};
}
/**
 * Observed CAD top XY outline only constrains world X/-Z. Height Zc is
 * unknown unless explicitly measured. No automatic prism or fake anatomy.
 */
export function createAIGReal3DTopCADObservation({
 verticesXYmm,imageSha256,sourceVisibility='OBSERVED',
 actualTopPlaneHeightMM=null,originCNCmm=[0,0,0],assetId='CADTop'
}={}){
 if(!Array.isArray(verticesXYmm)||verticesXYmm.length<3||
  verticesXYmm.length>512||
  !verticesXYmm.every(v=>Array.isArray(v)&&v.length===2&&
   v.every(x=>finite(x)&&Math.abs(x)<1e6))||
  !sha(imageSha256)||!['OBSERVED','AI_ESTIMATED'].includes(sourceVisibility)||
  !checkVec(originCNCmm)||typeof assetId!=='string'||assetId.length<2||
  actualTopPlaneHeightMM!==null&&(!finite(actualTopPlaneHeightMM)||
   Math.abs(actualTopPlaneHeightMM)>1e6))
  fail('TOP_CAD_OUTLINE_EVIDENCE_INVALID');
 const min=[Infinity,Infinity],max=[-Infinity,-Infinity];
 for(const p of verticesXYmm)for(let j=0;j<2;j++){
  min[j]=Math.min(min[j],p[j]);max[j]=Math.max(max[j],p[j]);
 }
 const area=verticesXYmm.reduce((sum,p,i)=>{
  const q=verticesXYmm[(i+1)%verticesXYmm.length];
  return sum+p[0]*q[1]-q[0]*p[1];
 },0)*.5;
 if(Math.abs(area)<1e-9)fail('TOP_CAD_OUTLINE_AREA_ZERO');
 return {schema:'AIG_REAL3D_V104_OBSERVED_CAD_XY_TOP_V1',
  assetId,imageSha256,sourceVisibility,originCNCmm:[...originCNCmm],
  verticesXYmm:verticesXYmm.map(v=>[...v]),
  XYBoundsMM:{min,max},signedPolygonAreaMM2:area,
  actualTopPlaneHeightMM,
  actual3DHeightObserved:actualTopPlaneHeightMM!==null&&sourceVisibility==='OBSERVED',
  sourceBottomFaceKnown:false,sideDepthFromSingleCADTopNotProven:true,
  approvedFor3DGeometryGeneration:false,releasePASS:false};
}
export function createAIGReal3DTopFirstInspector({
 scene,sourceGeometrySHA,observedTopCAD=null,masterOriginCNCmm=[0,0,0],
 resolution=64
}={}){
 if(!sha(sourceGeometrySHA)||!checkVec(masterOriginCNCmm)||
  !Number.isInteger(resolution)||resolution<16||resolution>192||
  observedTopCAD!==null&&observedTopCAD.schema!=='AIG_REAL3D_V104_OBSERVED_CAD_XY_TOP_V1')
  fail('TOP_FIRST_SOURCE_SHA_AND_ORIGIN_REQUIRED');
 const source=sourceScene(scene),sourceVersion=scene.revision,
  origin=convertAIGReal3DCNCToWorld(masterOriginCNCmm,{sceneUnits:scene.units}),
  cached=new Map(),count={built:0,cacheHits:0};
 function ensureNotMutated(){
  if(scene.revision!==sourceVersion)fail('SOURCE_REVISION_CHANGED_REBUILD_INSPECTOR');
 }
 function requestFace(id){
  ensureNotMutated();
  const face=AIG_REAL3D_V104_FACES.find(x=>x.id===id);
  if(!face)fail('UNKNOWN_PHYSICAL_SOURCE_FACE');
  if(cached.has(id)){count.cacheHits++;return cached.get(id);}
  const result=renderDepth(source,face,origin,resolution);
  cached.set(id,result);count.built++;
  return result;
 }
 // Only TOP is rasterized eagerly. Other five incur ZERO work until called.
 const top=requestFace('TOP');
 const cnc=bounds(source.all.map(p=>convertAIGReal3DWorldToCNC(p,{sceneUnits:scene.units}))),
  topBound={min:[cnc.min[0]-masterOriginCNCmm[0],cnc.min[1]-masterOriginCNCmm[1]],
   max:[cnc.max[0]-masterOriginCNCmm[0],cnc.max[1]-masterOriginCNCmm[1]]};
 let cadComparison=null;
 if(observedTopCAD){
  const ob=observedTopCAD,bb=ob.XYBoundsMM;
  const min=bb.min.map((v,i)=>v+ob.originCNCmm[i]-masterOriginCNCmm[i]),
   max=bb.max.map((v,i)=>v+ob.originCNCmm[i]-masterOriginCNCmm[i]);
  cadComparison={sourceVisibility:ob.sourceVisibility,
   measuredOutlineBoundingBoxMM:{min,max},
   trueGeometryBoundingBoxMM:topBound,
   absoluteBoxEdgeErrorsMM:[
    Math.abs(min[0]-topBound.min[0]),Math.abs(min[1]-topBound.min[1]),
    Math.abs(max[0]-topBound.max[0]),Math.abs(max[1]-topBound.max[1])
   ].map(round),
   matchingBoundingBoxesDoesNotProveCorrectInsideContour:true,
   observedHeightCertified:ob.actual3DHeightObserved,
   unobservedDepthNotInferred:true,
   independentPhotoSilhouetteSimilarityCertified:false};
 }
 return {schema:AIG_REAL3D_V104_SCHEMA,sourceGeometrySHA,
  coordinateBasis:auditAIGReal3DV104Axes(),
  masterOriginCNCmm:[...masterOriginCNCmm],
  sceneUnitSystem:scene.units,originalSourceSceneRevision:sourceVersion,
  originalTrueTriangleCount:source.sourceFaces,
  originalXYZBoundsInCNCmm:{min:cnc.min.map(round),max:cnc.max.map(round)},
  top,topCADComparison:cadComparison,requestFace,
  audit:()=>({topBuilt:true,actualFacesGenerated:count.built,
   pendingFaces:AIG_REAL3D_V104_FACES.map(x=>x.id).filter(id=>!cached.has(id)),
   cacheHits:count.cacheHits,oneModelSourceForAllFaces:true,
   sixFacesNotSixNewModels:true,sourceXYZNeverModified:true,
   automaticallyGeneratedMissingGeometry:false,
   CADContourOrActualFaceIdentityCertified:false,
   releasePASS:false}),
  fullSixFaceSummary:()=>{
   ensureNotMutated();
   const views=AIG_REAL3D_V104_FACES.map(x=>requestFace(x.id));
   return {schema:'AIG_REAL3D_V104_ON_DEMAND_SIX_FACE_REPORT_V1',
    originalSourceSha256:sourceGeometrySHA,
    originalTriangleCount:source.sourceFaces,
    masterOriginCNCmm:[...masterOriginCNCmm],
    perFace:views.map(v=>({faceId:v.faceId,occupancy:v.occupancy,
     sourceXYZPlaneBounds:v.sourceXYZPlaneBounds,
     visibleDepthRange:v.visibleDepthRange,
     edgeOnTriangles:v.edgeOnSourceTriangles,
     sourceNodes:v.sourceNodePixelCounts})),
    sixTimesThreeProjectionChannels:18,
    realSpatialDimensions:3,
    independentlyObservedFaceCount:observedTopCAD?.sourceVisibility==='OBSERVED'?1:0,
    missingSideAndBottomGroundTruthBlocked:true,
    noFabricatedReverseAnatomy:true,releasePASS:false};
  }};
}
