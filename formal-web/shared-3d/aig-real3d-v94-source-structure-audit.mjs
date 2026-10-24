/**
 * Real3D V94 | high-precision SOURCE geometry and part hierarchy inspector.
 * Never creates, subdivides, smooths, or hallucinates an original triangle.
 * Raw indexed topology is authoritative: splitting vertices at UV seams
 * produces BOUNDARY edges until a separately verified original welded source
 * proves closure. Coincident positions alone do NOT certify watertightness.
 */
import {getAIG3DWorldMatrix,transformAIG3DPoint}
 from './aig-real3d-core.mjs';
export const AIG_REAL3D_V94_STRUCTURE_SCHEMA=
 'AIG_REAL3D_V94_ORIGINAL_SOURCE_STRUCTURE_AUDIT_V1';
export const AIG_REAL3D_V94_PART_ROLES=Object.freeze([
 'SHELL','ARMOR','WINDOW','ENGINE','MECHANISM','SKIN','HAIR','GARMENT',
 'FEATHER','FUR','FIN','ENVIRONMENT','OTHER']);
const err=x=>{throw Error('REAL3D_V94_STRUCTURE_'+x);};
const finite=Number.isFinite,vec=a=>Array.isArray(a)&&a.length===3&&a.every(finite);
const SHA=/^[a-f0-9]{64}$/i;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const mag=a=>Math.hypot(...a);
const point=(a,i)=>a.slice(i*3,i*3+3);
const minmax=(verts)=>{
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<verts.length;i+=3)for(let k=0;k<3;k++){
  lo[k]=Math.min(lo[k],verts[i+k]);hi[k]=Math.max(hi[k],verts[i+k]);
 }
 return {min:lo,max:hi};
};
const round=n=>Math.round(n*1e8)/1e8;
function topologyOf(mesh,world,creaseDeg,degenerateAreaM2){
 const m=mesh,faceCount=m.triangleCount,edgeMap=new Map(),
  triangles=[],vertexSet=new Set(),bounds=minmax(world);
 const parent=Array.from({length:faceCount},(_,i)=>i);
 const root=i=>{let x=i;while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
 const unite=(a,b)=>{const x=root(a),y=root(b);if(x!==y)parent[y]=x;};
 let signedVolume=0,badNormals=0,degenerate=0,faceArea=0,
  zeroLengthEdges=0,reversedNormalFaces=0;
 for(let f=0;f<faceCount;f++){
  const ids=m.indices.slice(3*f,3*f+3);
  if(ids.length!==3||new Set(ids).size!==3)err('DEGENERATE_FACE_SOURCE_INDICES');
  const [a,b,c]=ids.map(id=>point(world,id));
  const d1=sub(b,a),d2=sub(c,a),n=cross(d1,d2),length=mag(n),
   area=length/2,unit=length>0?n.map(x=>x/length):[0,0,0];
  if(area<=degenerateAreaM2)degenerate++;
  faceArea+=area;
  signedVolume+=dot(a,cross(b,c))/6;
  let dotAvg=0;
  for(const idx of ids){
   if(!Number.isInteger(idx)||idx<0||idx>=m.vertexCount)
    err('FACE_REFERENCES_UNKNOWN_VERTEX');
   vertexSet.add(idx);
   const srcNormal=point(m.normals,idx);
   const nlen=mag(srcNormal);
   if(nlen<1e-8||nlen>1.1)badNormals++;
   else dotAvg+=dot(srcNormal,unit)/nlen;
  }
  if(dotAvg<-.5)reversedNormalFaces++;
  triangles.push({id:f,index:ids,normal:unit,areaM2:area});
  for(let k=0;k<3;k++){
   const u=ids[k],v=ids[(k+1)%3],
    lo=Math.min(u,v),hi=Math.max(u,v),
    key=lo+':'+hi,direction=u===lo?1:-1;
   if(mag(sub(point(world,u),point(world,v)))<1e-10)zeroLengthEdges++;
   const e=edgeMap.get(key)||{faces:[],dirs:[]};
   e.faces.push(f);e.dirs.push(direction);edgeMap.set(key,e);
  }
 }
 let boundary=0,nonManifold=0,oppositeOrientation=0,
  hard=0,soft=0,candidateOpenEdgeLengthM=0;
 for(const [key,e] of edgeMap){
  if(e.faces.length===1){
   boundary++;const [i,j]=key.split(':').map(Number);
   candidateOpenEdgeLengthM+=mag(sub(point(world,i),point(world,j)));
  }else if(e.faces.length===2){
   unite(e.faces[0],e.faces[1]);
   if(e.dirs[0]===e.dirs[1])oppositeOrientation++;
   const cosine=Math.max(-1,Math.min(1,
    dot(triangles[e.faces[0]].normal,triangles[e.faces[1]].normal)));
   const deg=Math.acos(cosine)*180/Math.PI;
   if(deg>=creaseDeg)hard++;else soft++;
  }else nonManifold++;
 }
 const islands=new Set(triangles.map(t=>root(t.id))).size;
 const watertightBySourceIndices=boundary===0&&nonManifold===0&&
  oppositeOrientation===0&&degenerate===0&&islands===1;
 return {rawIndexedTriangles:faceCount,rawIndexedVertices:m.vertexCount,
  referencedVertices:vertexSet.size,unreferencedVertices:m.vertexCount-vertexSet.size,
  boundsMeters:bounds,dimensionsMeters:bounds.max.map((v,i)=>round(v-bounds.min[i])),
  surfaceAreaM2:round(faceArea),signedVolumeM3:watertightBySourceIndices?
   round(signedVolume):null,
  openSourceIndexedEdges:boundary,nonManifoldSourceEdges:nonManifold,
  adjacentFaceOrientationConflicts:oppositeOrientation,
  degenerateFaces:degenerate,zeroLengthEdges,
  invalidOrNonUnitVertexNormals:badNormals,
  sourceNormalsFacingOppositeTriangle:reversedNormalFaces,
  sourceConnectedFaceIslands:islands,
  candidateOpenEdgeLengthMeters:round(candidateOpenEdgeLengthM),
  sourceHardEdges:hard,sourceSmoothEdges:soft,
  indexedTopologyWatertight:watertightBySourceIndices,
  derivedCandidateGeometryOnly:false,
  sourceGeometryTrianglesAdded:0,sourceGeometryTrianglesRemoved:0};
}
export function auditAIGReal3DOriginalStructure({
 scene,sourceSha256,parts,observations=[],creaseAngleDeg=38,
 degenerateAreaThresholdM2=1e-12,requireFullCoverage=true
}={}){
 if(scene?.schema!=='AIG_REAL3D_SCENE_V1'||!SHA.test(sourceSha256??'')||
  !['METERS','MM'].includes(scene.units)||
  !Array.isArray(scene.nodes)||!scene.nodes.length||scene.nodes.length>64||
  !Array.isArray(parts)||!parts.length||parts.length>64||
  !Array.isArray(observations)||observations.length>2000||
  !finite(creaseAngleDeg)||creaseAngleDeg<1||creaseAngleDeg>179||
  !finite(degenerateAreaThresholdM2)||degenerateAreaThresholdM2<0||
  degenerateAreaThresholdM2>1e-4||typeof requireFullCoverage!=='boolean')
  err('SCENE_SHA_PARTS_BUDGET_INVALID');
 const nodeById=new Map(scene.nodes.map(n=>[n.id,n]));
 if(nodeById.size!==scene.nodes.length)err('DUPLICATE_SOURCE_NODE_IDS');
 const scale=scene.units==='MM'?.001:1,
  used=new Set(),ids=new Set();
 const reports=parts.map(p=>{
  if(typeof p?.id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,47}$/.test(p.id)||
   ids.has(p.id)||!nodeById.has(p.nodeId)||used.has(p.nodeId)||
   !AIG_REAL3D_V94_PART_ROLES.includes(p.role)||
   typeof p.parentPartId!=='string'&&p.parentPartId!==null||
   p.parentPartId&& !ids.has(p.parentPartId)||
   typeof p.closedSurfaceRequired!=='boolean')
   err('PART_HIERARCHY_OR_SOURCE_NODE_INVALID');
  ids.add(p.id);used.add(p.nodeId);
  const mesh=nodeById.get(p.nodeId).mesh;
  if(!mesh?.actualXYZTriangles||mesh.triangleCount<1||
   !Array.isArray(mesh.positions)||!Array.isArray(mesh.normals)||
   !Array.isArray(mesh.indices)||mesh.positions.length!==mesh.vertexCount*3||
   mesh.normals.length!==mesh.positions.length||
   mesh.indices.length!==mesh.triangleCount*3||
   mesh.positions.some(x=>!finite(x))||mesh.normals.some(x=>!finite(x)))
   err('NOT_ORIGINAL_INDEXED_XYZ_SOURCE');
  const matrix=getAIG3DWorldMatrix(scene,p.nodeId);
  const world=[];
  for(let v=0;v<mesh.vertexCount;v++)
   world.push(...transformAIG3DPoint(matrix,point(mesh.positions,v)).map(x=>x*scale));
  const geometry=topologyOf(mesh,world,creaseAngleDeg,degenerateAreaThresholdM2);
  const pass=!geometry.degenerateFaces&&!geometry.nonManifoldSourceEdges&&
   !geometry.adjacentFaceOrientationConflicts&&
   !geometry.unreferencedVertices&&
   (!p.closedSurfaceRequired||geometry.indexedTopologyWatertight);
  return {partId:p.id,sourceNodeId:p.nodeId,parentPartId:p.parentPartId,role:p.role,
   originalSourceProvenance:mesh.provenance,
   closedSurfaceRequired:p.closedSurfaceRequired,
   geometry,sourceTopologyPASS:pass,
   independentlyVerifiedThickness:false,
   geometryQualityNeedsHumanReview:geometry.invalidOrNonUnitVertexNormals>0||
    geometry.sourceNormalsFacingOppositeTriangle>0};
 });
 if(requireFullCoverage&&used.size!==scene.nodes.length)
  err('UNDECLARED_SOURCE_GEOMETRY_COMPONENTS');
 const observationsReport=observations.map((o,i)=>{
  if(!['DIMENSION','THICKNESS','POINT_3D'].includes(o?.kind)||
   typeof o.partId!=='string'||!ids.has(o.partId)||
   !finite(o.toleranceMm)||o.toleranceMm<=0||o.toleranceMm>100||
   !SHA.test(o.evidenceSha256??''))
   err('REFERENCE_MEASUREMENT_INVALID_'+i);
  const p=reports.find(x=>x.partId===o.partId),
   source=scene.nodes.find(n=>n.id===p.sourceNodeId),
   mesh=source.mesh,world=getAIG3DWorldMatrix(scene,p.sourceNodeId);
  let measuredMm=0,predictedMm=0;
  if(o.kind==='DIMENSION'){
   if(![0,1,2].includes(o.axis)||!finite(o.measuredMm)||o.measuredMm<=0)
    err('DIMENSION_OBSERVATION_INVALID');
   predictedMm=p.geometry.dimensionsMeters[o.axis]*1000;
   measuredMm=o.measuredMm;
  }else{
   if(!Array.isArray(o.sourceVertexIds)||
    o.sourceVertexIds.length!==(o.kind==='THICKNESS'?2:1)||
    o.sourceVertexIds.some(v=>!Number.isInteger(v)||v<0||v>=mesh.vertexCount))
    err('MEASUREMENT_ORIGINAL_VERTICES_INVALID');
   const pts=o.sourceVertexIds.map(v=>
    transformAIG3DPoint(world,point(mesh.positions,v)).map(x=>x*scale));
   if(o.kind==='THICKNESS'){
    if(o.sourceVertexIds[0]===o.sourceVertexIds[1]||
     !finite(o.measuredMm)||o.measuredMm<=0)
     err('THICKNESS_POINT_PAIR_INVALID');
    predictedMm=mag(sub(pts[0],pts[1]))*1000;
    measuredMm=o.measuredMm;
   }else{
    if(!vec(o.measuredXYZMeters))err('POINT_3D_REFERENCE_INVALID');
    predictedMm=mag(sub(pts[0],o.measuredXYZMeters))*1000;
    measuredMm=0;
   }
  }
  const errorMm=round(Math.abs(predictedMm-measuredMm));
  return {kind:o.kind,partId:o.partId,sourceEvidenceSHA:o.evidenceSha256,
   predictedMm:round(predictedMm),referenceMm:round(measuredMm),
   residualMm:errorMm,toleranceMm:o.toleranceMm,
   comparisonPASS:errorMm<=o.toleranceMm,
   sourceObservationIndependentlyAuthenticated:false};
 });
 const rawTriangles=scene.nodes.reduce((s,n)=>s+n.mesh.triangleCount,0);
 return {schema:AIG_REAL3D_V94_STRUCTURE_SCHEMA,sourceSha256,
  sceneId:scene.id,units:'METERS',partCount:reports.length,
  originalTriangleCount:rawTriangles,
  auditedTriangleCount:reports.reduce((s,p)=>s+p.geometry.rawIndexedTriangles,0),
  originalTrianglesAdded:0,originalTrianglesRemoved:0,originalMeshesImmutable:true,
  parts:reports,observationChecks:observationsReport,
  sourceTopologyGatePASS:reports.every(x=>x.sourceTopologyPASS)&&
   (!requireFullCoverage||used.size===scene.nodes.length),
  measurementsWithinTolerance:observationsReport.length>0&&
   observationsReport.every(x=>x.comparisonPASS),
  precision1to1IndependentlyCertified:false,
  missingMeasurements:observationsReport.length===0,
  inferredHiddenBackOrThicknessAllowed:false,
  automaticStructureInferenceCertified:false,
  productionRenderAndAnatomyPASS:false,releasePASS:false};
}
