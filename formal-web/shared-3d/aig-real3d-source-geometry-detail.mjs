/**
 * Genuine source-OBJ mesh detail evidence at 5 user-supplied landmark areas.
 * ALL measurements use existing calibrated Indexed XYZ triangles, NOT 4K
 * image pixels, smoothing normals, subdivision or guessed human anatomy.
 */
import {AIG_REAL3D_LOCAL_SURFACE_QA_SCHEMA}
 from './aig-real3d-local-surface-topology.mjs';
export const AIG_REAL3D_SOURCE_DETAIL_SCHEMA='AIG_REAL3D_SOURCE_TRIANGLE_DETAIL_AND_JUNCTION_V1';
const SHA=/^[0-9a-f]{64}$/i;
const TYPES=new Set(['HEAD_NECK_JOIN','LEFT_HAND_SURFACE','RIGHT_HAND_SURFACE',
 'LEFT_FOOT_SURFACE','RIGHT_FOOT_SURFACE']);
const xyz=(flat,i)=>[flat[3*i],flat[3*i+1],flat[3*i+2]];
const minus=(a,b)=>a.map((x,i)=>x-b[i]);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const mag=a=>Math.hypot(...a);
const round=x=>Math.round(x*1000)/1000;
const key=(a,b)=>a<b?a+':'+b:b+':'+a;
const percentile=(arr,p)=>{
 if(!arr.length)return null;
 const sorted=[...arr].sort((a,b)=>a-b);
 return round(sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)]);
};
export function auditAIGReal3DSourceGeometryDetail({
 scene,localSurface,sourceSha256,claimedCaptureMethod='UNSPECIFIED'
}={}){
 if(!SHA.test(sourceSha256??'')||sourceSha256!==localSurface?.sourceSha256||
 localSurface.schema!==AIG_REAL3D_LOCAL_SURFACE_QA_SCHEMA||
 localSurface.sourceLandmarkMeshAuditPASS!==true||
 localSurface.regionCount!==5||!Array.isArray(localSurface.regions)||
 !scene||scene.schema!=='AIG_REAL3D_SCENE_V1'||scene.nodes?.length!==1)
  throw Error('DETAIL_GATE_REAL_OBJ_MESH_AND_LANDMARKS_REQUIRED');
 const mesh=scene.nodes[0]?.mesh,positions=mesh?.positions,indices=mesh?.indices;
 if(!Array.isArray(positions)||!Array.isArray(indices)||positions.length%3!==0||
 indices.length%3!==0||positions.length/3!==localSurface.originalVertices||
 indices.length/3!==localSurface.originalTriangles)
  throw Error('DETAIL_GATE_INDEXED_SOURCE_COUNT_MISMATCH');
 if(!['UNSPECIFIED','STRUCTURED_LIGHT','PHOTOGRAMMETRY','LIDAR',
 'MANUAL_MODEL','OTHER'].includes(claimedCaptureMethod))
  throw Error('DETAIL_GATE_SOURCE_METHOD_INVALID');
 const count=positions.length/3;
 if(count<4||count>110000||indices.length>540000)
  throw Error('DETAIL_GATE_SOURCE_MESH_LIMITS');
 const tris=[],edgeMap=new Map();
 for(let i=0;i<indices.length;i+=3){
  const ids=indices.slice(i,i+3);
  if(ids.some(x=>!Number.isInteger(x)||x<0||x>=count))
   throw Error('DETAIL_GATE_CORRUPT_SOURCE_TRIANGLE');
  const pts=ids.map(id=>xyz(positions,id));
  const a=minus(pts[1],pts[0]),b=minus(pts[2],pts[0]);
  const normal=cross(a,b),size=mag(normal);
  const lens=[mag(minus(pts[0],pts[1])),mag(minus(pts[1],pts[2])),
   mag(minus(pts[2],pts[0]))];
  const ti=tris.length;
  tris.push({ids,centroid:pts[0].map((v,k)=>(v+pts[1][k]+pts[2][k])/3),
   normal:size>1e-12?normal.map(x=>x/size):null,
   longestEdgeMm:1000*Math.max(...lens),
   areaMm2:500000*size});
  for(const [u,v] of [[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[0]]]){
   const label=key(u,v),record=edgeMap.get(label);
   if(record){record.tris.push(ti);}
   else edgeMap.set(label,{a:u,b:v,tris:[ti]});
  }
 }
 const sections=localSurface.regions.map(region=>{
  if(!TYPES.has(region.id)||!Number.isFinite(region.localRadiusMm)||
   region.localRadiusMm<1||!Array.isArray(region.markerNearestVertexReferences))
   throw Error('DETAIL_GATE_INVALID_MARKER_REGION');
  const anchors=region.markerNearestVertexReferences.map(x=>{
   if(!Number.isInteger(x.index)||x.index<0||x.index>=count)
    throw Error('DETAIL_GATE_INVALID_MARKER_VERTEX');
   return xyz(positions,x.index);
  });
  const r2=(region.localRadiusMm/1000)**2;
  const inside=new Uint8Array(count),ids=[];
  for(let i=0;i<count;i++){
   const p=xyz(positions,i);
   if(anchors.some(a=>{
    const d=minus(p,a);return dot(d,d)<=r2;
   })){inside[i]=1;ids.push(i);}
  }
  const edgeLengths=[],areas=[],normalBends=[],longestEdges=[];
  let selectedTriangles=0,nearBoundaryEdges=0;
  const boundaryPoints=[];
  const regionFace=new Uint8Array(tris.length);
  for(let i=0;i<tris.length;i++){
   const t=tris[i];
   if(!t.ids.some(x=>inside[x]))continue;
   regionFace[i]=1;selectedTriangles++;
   if(t.normal){
    areas.push(t.areaMm2);longestEdges.push(t.longestEdgeMm);
   }
  }
  for(const record of edgeMap.values()){
   if(!inside[record.a]&&!inside[record.b])continue;
   edgeLengths.push(1000*mag(minus(
    xyz(positions,record.a),xyz(positions,record.b))));
   if(record.tris.length===1){
    nearBoundaryEdges++;boundaryPoints.push(record.a,record.b);
   }else if(record.tris.length===2){
    const a=tris[record.tris[0]].normal,b=tris[record.tris[1]].normal;
    if(a&&b){
     const angle=Math.acos(Math.max(-1,Math.min(1,dot(a,b))))*180/Math.PI;
     normalBends.push(angle);
    }
   }
  }
  // Find source-index disconnected boundaries whose XYZ coordinates touch
  // within 0.5 mm. These are seam CANDIDATES, not guaranteed cracks.
  const buckets=new Map(),pairs=[],unique=new Set(boundaryPoints);
  let nearCoincident=0;
  const step=.0005;
  for(const i of unique){
   const p=xyz(positions,i),cell=p.map(x=>Math.floor(x/step));
   for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++){
    const name=[cell[0]+a,cell[1]+b,cell[2]+c].join(',');
    for(const other of buckets.get(name)??[]){
     const distance=mag(minus(p,xyz(positions,other)));
     if(distance<step){
      nearCoincident++;
      if(pairs.length<12)pairs.push({vertexA:other,vertexB:i,
       separationMm:round(distance*1000)});
     }
    }
   }
   const own=cell.join(',');
   if(!buckets.has(own))buckets.set(own,[]);
   buckets.get(own).push(i);
  }
  const warning=[];
  if(!selectedTriangles||!ids.length)
   warning.push('MISSING_SOURCE_SURFACE_TRIANGLES');
  if(region.openEdges)warning.push('OPEN_SOURCE_JUNCTION');
  if(region.nonManifoldEdges)warning.push('NON_MANIFOLD_SOURCE_JUNCTION');
  if(region.inconsistentFaceWindingEdges)warning.push('JUNCTION_WINDING_CONFLICT');
  if(region.landmarkConnectedComponents>1)
   warning.push('MARKERS_ON_DISCONNECTED_INDEX_SHELLS');
  if(nearCoincident)warning.push('NEAR_COINCIDENT_UNWELDED_BOUNDARY_REVIEW');
  const maxEdge=percentile(longestEdges,.95);
  // REVIEW cues, not universal thresholds or a fake anatomy approval:
  if(maxEdge!==null&&maxEdge>8)
   warning.push('SOURCE_TRIANGLES_TOO_COARSE_FOR_8MM_DETAIL_REVIEW');
  if(percentile(normalBends,.95)>55)
   warning.push('SHARP_OR_DISCONTINUOUS_JUNCTION_REVIEW');
  return {
   regionId:region.id,label:region.label,
   referencedOriginalVertexIds:region.markerNearestVertexReferences.map(x=>x.index),
   sourceRadiusMm:region.localRadiusMm,
   originalVerticesInRadius:ids.length,
   actualSourceTrianglesTouchingRadius:selectedTriangles,
   localTriangleMaxEdgeP50Mm:percentile(longestEdges,.5),
   localTriangleMaxEdgeP95Mm:maxEdge,
   localSourceTriangleAreaP95Mm2:percentile(areas,.95),
   localIndexedEdgeP95Mm:percentile(edgeLengths,.95),
   adjacentFaceBendP95Degrees:percentile(normalBends,.95),
   originalBoundaryEdgesInRadius:nearBoundaryEdges,
   nearCoincidentDifferentIndexBoundaryPairs:nearCoincident,
   sourceBoundaryPotentialSeamEvidence:pairs,
   warningCodes:warning,
   sourceNormalsAndCurvatureFromActualTriangleXYZ:true,
   screenResolutionIsNotGeometryResolution:true,
   technicalResolutionAndJunctionWarningsClear:warning.length===0,
   certifiedHumanHeadNeckHandFootShape:false,
   anatomicalFineDetailAndFiveDigitsConfirmed:false
  };
 });
 return {
  schema:AIG_REAL3D_SOURCE_DETAIL_SCHEMA,
  sourceSha256,
  sourceMeshVertices:count,
  sourceMeshTriangles:tris.length,
  claimedCaptureMethod,
  captureMethodSelfReportedNotIndependentlyVerified:true,
  sourceOriginIndependentAuthenticationPASS:false,
  sourceIsHuman3DScanIndependentlyEstablished:false,
  regions:sections,regionCount:sections.length,
  regionsRequiringReview:sections.filter(x=>x.warningCodes.length).length,
  measuredFromSource3DTrianglesNotGPUPixels:true,
  originalIndexDataModified:false,
  generatedNewSurfaceGeometry:false,
  generatedAnatomicalFingersOrHair:false,
  source4KPixelResolutionDoesNotImproveGeometry:true,
  naturalHumanAppearancePASS:false,
  releasePASS:false
 };
}
