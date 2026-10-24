/**
 * Immutable before/after source audits; NO mesh mutation and NO "repair PASS".
 * Edge identity follows source WORLD XYZ endpoints (0.1 mm quantized),
 * not OBJ vertex ordering, and distinguishes face-winding vs boundary faults.
 */
import {AIG_REAL3D_LOCAL_SURFACE_QA_SCHEMA} from './aig-real3d-local-surface-topology.mjs';
export const AIG_REAL3D_DEFECT_SOURCE_DIFF_SCHEMA='AIG_REAL3D_NATIVE_OBJ_BEFORE_AFTER_DEFECT_DIFF_V1';
const TYPES=new Set(['OPEN_BOUNDARY','NON_MANIFOLD','WINDING_CONFLICT']);
const q=p=>p.map(x=>Math.round(x*10000)).join(',');
function keyed(e){
 if(!TYPES.has(e.type)||!Array.isArray(e.startWorldMeters)||
 !Array.isArray(e.endWorldMeters)||e.startWorldMeters.length!==3||
 e.endWorldMeters.length!==3)
  throw Error('DEFECT_DIFF_NATIVE_EVIDENCE_CORRUPT');
 const pts=[q(e.startWorldMeters),q(e.endWorldMeters)].sort();
 return e.type+':'+pts.join('|');
}
function edges(report){
 const map=new Map();
 for(const region of report.regions){
  if(region.anomalyEdgeEvidenceTruncated)
   throw Error('DEFECT_DIFF_TRUNCATED_SOURCE_EVIDENCE_BLOCK');
  for(const e of region.anomalyExactWorldEdges??[]){
   const id=keyed(e);
   if(!map.has(id))map.set(id,{
    type:e.type,originalRegionId:region.id,
    startWorldMeters:e.startWorldMeters,
    endWorldMeters:e.endWorldMeters,
    startVertexIndex:e.startVertexIndex,
    endVertexIndex:e.endVertexIndex
   });
  }
 }
 return map;
}
export function compareAIGNativeSourceDefects({before,after}={}){
 if(before?.schema!==AIG_REAL3D_LOCAL_SURFACE_QA_SCHEMA||
 after?.schema!==AIG_REAL3D_LOCAL_SURFACE_QA_SCHEMA||
 !before.sourceLandmarkMeshAuditPASS||!after.sourceLandmarkMeshAuditPASS||
 before.sourceFormat!=='OBJ'||after.sourceFormat!=='OBJ'||
 !/^[a-f0-9]{64}$/i.test(before.sourceSha256??'')||
 !/^[a-f0-9]{64}$/i.test(after.sourceSha256??''))
  throw Error('DEFECT_DIFF_TWO_NATIVE_AUDITS_REQUIRED');
 if(before.sourceSha256===after.sourceSha256)
  throw Error('DEFECT_DIFF_REQUIRES_DIFFERENT_SOURCE_SHA');
 if(before.heightMm!==after.heightMm||before.upAxis!==after.upAxis)
  throw Error('DEFECT_DIFF_SCALE_UP_AXIS_MISMATCH');
 if(before.regionCount!==5||after.regionCount!==5||
 before.regions.map(r=>r.id).join('|')!==after.regions.map(r=>r.id).join('|'))
  throw Error('DEFECT_DIFF_REGION_AUTHORITY_CHANGED');
 const a=edges(before),b=edges(after);
 const disappearance=[...a].filter(([id])=>!b.has(id)).map(([,e])=>e);
 const added=[...b].filter(([id])=>!a.has(id)).map(([,e])=>e);
 const unchanged=[...a].filter(([id])=>b.has(id)).length;
 const regionChanges=before.regions.map((x,i)=>{
  const y=after.regions[i];
  return {
   id:x.id,label:x.label,
   before:{openEdges:x.openEdges,nonManifoldEdges:x.nonManifoldEdges,
    windingConflicts:x.inconsistentFaceWindingEdges,
    connectedComponents:x.landmarkConnectedComponents,
    markerSnapErrorMm:x.largestMarkerSnapErrorMm},
   after:{openEdges:y.openEdges,nonManifoldEdges:y.nonManifoldEdges,
    windingConflicts:y.inconsistentFaceWindingEdges,
    connectedComponents:y.landmarkConnectedComponents,
    markerSnapErrorMm:y.largestMarkerSnapErrorMm},
   openEdgeDelta:y.openEdges-x.openEdges,
   nonManifoldDelta:y.nonManifoldEdges-x.nonManifoldEdges,
   windingDelta:y.inconsistentFaceWindingEdges-x.inconsistentFaceWindingEdges
  };
 });
 const globalBefore={
  openEdges:before.globallyOpenEdges,nonManifoldEdges:before.globallyNonManifoldEdges,
  connectedComponents:before.globallyConnectedComponents,
  degenerateFaces:before.globallyDegenerateFaces
 },globalAfter={
  openEdges:after.globallyOpenEdges,nonManifoldEdges:after.globallyNonManifoldEdges,
  connectedComponents:after.globallyConnectedComponents,
  degenerateFaces:after.globallyDegenerateFaces
 };
 return {
  schema:AIG_REAL3D_DEFECT_SOURCE_DIFF_SCHEMA,
  beforeSha256:before.sourceSha256,afterSha256:after.sourceSha256,
  scaleAndUpAxisEqual:true,
  heightMm:before.heightMm,upAxis:before.upAxis,
  beforeOriginalTriangles:before.originalTriangles,
  afterOriginalTriangles:after.originalTriangles,
  beforeSourceGeometryPASS:before.sourceGeometryGatePASS,
  afterSourceGeometryPASS:after.sourceGeometryGatePASS,
  globalBefore,globalAfter,
  totalDistinctOldDefects:a.size,totalDistinctNewDefects:b.size,
  unchangedDefectEdges:unchanged,
  previousDefectEdgesAbsentInAfter:disappearance.length,
  newDefectEdgesNotPresentInBefore:added.length,
  disappearedDefectSamples:disappearance.slice(0,36),
  introducedDefectSamples:added.slice(0,36),
  regionChanges,
  allCheckedGlobalCountsNonIncreasing:
   globalAfter.openEdges<=globalBefore.openEdges&&
   globalAfter.nonManifoldEdges<=globalBefore.nonManifoldEdges&&
   globalAfter.degenerateFaces<=globalBefore.degenerateFaces,
  originalGeometryAutoModified:false,
  improvedTopologyCountsAreNotProofOfCorrectRepair:true,
  noPhotoHumanLikenessVerified:true,
  naturalHumanAppearancePASS:false,
  releasePASS:false
 };
}
