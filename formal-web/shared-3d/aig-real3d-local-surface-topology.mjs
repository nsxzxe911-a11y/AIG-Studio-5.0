/**
 * AIG Real3D local-source topology QA, NOT anatomical realism inference.
 * Uses actual imported indexed OBJ triangles and user-supplied,
 * independently native-mesh-audited landmark coordinates.
 * Does not weld, smooth, fill holes, morph, subdivide, or edit vertices.
 */
import {buildAIGReal3DScanNative} from './aig-real3d-scan-native-mesh.mjs';
export const AIG_REAL3D_LOCAL_SURFACE_QA_SCHEMA='AIG_REAL3D_NATIVE_5_REGION_SURFACE_TOPOLOGY_V1';
const SHA=/^[a-f0-9]{64}$/i;
const PARTS=Object.freeze([
 {id:'HEAD_NECK_JOIN',label:'頭頸附近',markers:['chin','neckBase','leftShoulder','rightShoulder']},
 {id:'LEFT_HAND_SURFACE',label:'左手附近',markers:['leftWrist','leftThumbTip','leftIndexTip']},
 {id:'RIGHT_HAND_SURFACE',label:'右手附近',markers:['rightWrist','rightThumbTip','rightIndexTip']},
 {id:'LEFT_FOOT_SURFACE',label:'左腳附近',markers:['leftKnee','leftHeel','leftToe']},
 {id:'RIGHT_FOOT_SURFACE',label:'右腳附近',markers:['rightKnee','rightHeel','rightToe']}
]);
const distSq=(p,q)=>((p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2);
const round=x=>Math.round(x*1000)/1000;
const key=(a,b)=>a<b?a+':'+b:b+':'+a;
function meshEdges(indices,positions) {
 const edges=new Map();
 let degenerate=0;
 for(let i=0;i<indices.length;i+=3){
  const a=indices[i],b=indices[i+1],c=indices[i+2];
  const u=[positions[b*3]-positions[a*3],positions[b*3+1]-positions[a*3+1],
   positions[b*3+2]-positions[a*3+2]];
  const v=[positions[c*3]-positions[a*3],positions[c*3+1]-positions[a*3+1],
   positions[c*3+2]-positions[a*3+2]];
  const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(Math.hypot(...cross)<1e-9)degenerate++;
  for(const [x,y] of [[a,b],[b,c],[c,a]]){
   const k=key(x,y),prev=edges.get(k);
   if(prev){prev.faceCount++;if(x===prev.start)prev.sameDirectionCount++;}
   else edges.set(k,{start:x,end:y,faceCount:1,sameDirectionCount:0});
  }
 }
 return {edges,degenerate};
}
function nearestVertex(points,position){
 let best=-1,d2=Infinity;
 for(let i=0;i<points.length;i+=3){
  const dx=points[i]-position[0],dy=points[i+1]-position[1],dz=points[i+2]-position[2];
  const score=dx*dx+dy*dy+dz*dz;
  if(score<d2){best=i/3;d2=score;}
 }
 return {index:best,distanceMm:round(Math.sqrt(d2)*1000)};
}
function sourceLandmarkWorld(p,axis,bounds,scale){
 const rotated=axis==='Z'?[p[0],p[2],-p[1]]:p;
 return [(rotated[0]-(bounds.min[0]+bounds.max[0])/2)*scale,
  (rotated[1]-bounds.min[1])*scale,
  (rotated[2]-(bounds.min[2]+bounds.max[2])/2)*scale];
}
export function auditAIGNativeOBJLocalSurface({
 objText,landmarks,heightMm,upAxis='Y',sourceSha256
}={}){
 if(!SHA.test(sourceSha256??''))throw Error('LOCAL_SURFACE_REAL_SOURCE_SHA_REQUIRED');
 if(!landmarks||typeof landmarks!=='object'||Array.isArray(landmarks))
  throw Error('LOCAL_SURFACE_LANDMARKS_REQUIRED');
 const native=buildAIGReal3DScanNative({objText,landmarks,heightMm,upAxis,sourceSha256});
 const e=native.evidence;
 if(e.landmarkAudit?.complete!==true)
  throw Error('LOCAL_SURFACE_SOURCE_LANDMARK_MESH_AUDIT_BLOCK');
 // We intentionally allow geometryPASS false (e.g. an open neck) so this
 // report can identify exactly what went wrong without changing the source.
 const mesh=native.scene.nodes[0].mesh,xyz=mesh.positions,indices=mesh.indices;
 const points=Array.from({length:xyz.length/3},(_,i)=>xyz.slice(i*3,i*3+3));
 const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
 const source=typeof objText==='string'?objText:null;
 if(!source)throw Error('LOCAL_SURFACE_MISSING_SOURCE');
 // Source raw coordinates are not obtained from screen pixels: preserve
 // the same Y/Z transformation and calibration used by native OBJ importer.
 const rawVerts=[];
 for(const line of source.split(/\r?\n/)){
  const x=line.trim().split(/\s+/);
  if(x[0]==='v')rawVerts.push([Number(x[1]),Number(x[2]),Number(x[3])]);
 }
 for(const v of rawVerts){
  const q=upAxis==='Z'?[v[0],v[2],-v[1]]:v;
  for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],q[k]);
    bounds.max[k]=Math.max(bounds.max[k],q[k]);}
 }
 const scale=(heightMm/1000)/(bounds.max[1]-bounds.min[1]);
 const {edges,degenerate}=meshEdges(indices,xyz);
 const n=points.length;
 const parent=Array.from({length:n},(_,i)=>i);
 function root(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
 function union(a,b){const ra=root(a),rb=root(b);if(ra!==rb)parent[rb]=ra;}
 for(const edge of edges.values())union(edge.start,edge.end);
 const rawMarkers={};
 const maxSnapMm=Math.max(3,(heightMm/1000)*5); // 0.5% measured height
 for(const [name,p] of Object.entries(landmarks)){
  if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))continue;
  const world=sourceLandmarkWorld(p,upAxis,bounds,scale);
  rawMarkers[name]={...nearestVertex(xyz,world),point:world};
 }
 const worldRadius=Math.max(0.04,(heightMm/1000)*.05);
 const stats=PARTS.map(part=>{
  const hits=part.markers.map(name=>({name,...rawMarkers[name]}));
  if(hits.some(h=>!Number.isInteger(h.index)))
   throw Error('LOCAL_SURFACE_MARKER_INDEX_MISSING');
  const anchors=hits.map(h=>h.point);
  const allowed=new Set();
  const d2=worldRadius*worldRadius;
  for(let i=0;i<n;i++)if(anchors.some(p=>distSq(points[i],p)<=d2))
   allowed.add(i);
  let edgeCount=0,openEdges=0,nonManifold=0,windingConflicts=0;
  const examplePositions=[],anomalyEdges=[];
  // Keep exact original index-connected edge endpoints, not approximate
  // centroid-only positions. Capped evidence but ALWAYS report truncation.
  const EDGE_SAMPLE_LIMIT=96;
  let totalAnomalyEdges=0;
  for(const item of edges.values()){
   if(!allowed.has(item.start)&&!allowed.has(item.end))continue;
   edgeCount++;
   if(item.faceCount===1)openEdges++;
   if(item.faceCount>2)nonManifold++;
   if(item.faceCount===2&&item.sameDirectionCount===1)windingConflicts++;
   const type=item.faceCount===1?'OPEN_BOUNDARY':
     item.faceCount>2?'NON_MANIFOLD':
     item.sameDirectionCount===1?'WINDING_CONFLICT':null;
   if(type){
    totalAnomalyEdges++;
    const a=points[item.start],b=points[item.end];
    if(examplePositions.length<6)
     examplePositions.push(a.map((v,k)=>round((v+b[k])/2)));
    if(anomalyEdges.length<EDGE_SAMPLE_LIMIT)
     anomalyEdges.push({
      type,startVertexIndex:item.start,endVertexIndex:item.end,
      startWorldMeters:a.map(round),endWorldMeters:b.map(round),
      numberOfIncidentFaces:item.faceCount
     });
   }
  }
  const comps=new Set(hits.map(h=>root(h.index)));
  const maximumSnapGapMm=Math.max(...hits.map(x=>x.distanceMm));
  const alerts=[];
  if(openEdges)alerts.push('NEARBY_OPEN_EDGES');
  if(nonManifold)alerts.push('NEARBY_NONMANIFOLD_EDGES');
  if(windingConflicts)alerts.push('INCONSISTENT_FACE_WINDING');
  if(comps.size>1)alerts.push('LANDMARKS_ON_DISCONNECTED_INDEX_COMPONENTS');
  if(maximumSnapGapMm>maxSnapMm)alerts.push('MARKER_TOO_FAR_FROM_MESH_SURFACE');
  return {id:part.id,label:part.label,
   markers:part.markers,
   localRadiusMm:round(worldRadius*1000),neighborhoodVertices:allowed.size,
   neighborhoodEdges:edgeCount,openEdges,nonManifoldEdges:nonManifold,
   inconsistentFaceWindingEdges:windingConflicts,
   landmarkConnectedComponents:comps.size,
   largestMarkerSnapErrorMm:maximumSnapGapMm,
   markerNearestVertexReferences:hits.map(h=>({
    name:h.name,index:h.index,surfaceOffsetMm:h.distanceMm
   })),
   anomalyWorldPositionSamples:examplePositions,
   anomalyExactWorldEdges:anomalyEdges,
   anomalyEdgeCountUncapped:totalAnomalyEdges,
   anomalyEdgeEvidenceTruncated:totalAnomalyEdges>anomalyEdges.length,
   anomalySamplesAreExactSourceIndexedEdges:true,
   anomalyCodes:alerts,
   technicalSurfaceFlagsClear:alerts.length===0,
   humanAnatomicalNaturalnessVerified:false,
   fiveFingersOrFiveToesConfirmed:false
  };
 });
 return {
  schema:AIG_REAL3D_LOCAL_SURFACE_QA_SCHEMA,
  sourceSha256,sourceFormat:'OBJ',heightMm,upAxis,
  originalVertices:n,originalTriangles:indices.length/3,
  globallyOpenEdges:e.openEdges,globallyNonManifoldEdges:e.nonManifoldEdges,
  globallyConnectedComponents:e.connectedComponents,globallyDegenerateFaces:degenerate,
  sourceGeometryGatePASS:e.geometryPASS,
  sourceLandmarkMeshAuditPASS:e.landmarkAudit.complete,
  regionCount:stats.length,regions:stats,
  allLocalTechnicalSurfaceChecksClear:stats.every(r=>r.technicalSurfaceFlagsClear),
  originalSourceVerticesChanged:false,
  trianglesAddedOrSmoothed:false,
  topologyCertifiedHuman:false,
  naturalAnatomyAndFingersApproved:false,
  provenanceIndependentlyAuthenticated:false,
  releasePASS:false
 };
}
