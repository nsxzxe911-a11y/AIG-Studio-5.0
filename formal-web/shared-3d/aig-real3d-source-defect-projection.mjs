/**
 * Source-indexed mesh defects -> same FOUR orthographic camera pixel coords.
 * Data projection only. Does NOT alter OBJ geometry or infer a natural person.
 */
import {validateAIGInspectionCapturePlan} from './aig-real3d-render-inspection.mjs';
import {AIG_REAL3D_LOCAL_SURFACE_QA_SCHEMA} from './aig-real3d-local-surface-topology.mjs';
export const AIG_NATIVE_DEFECT_PROJECTION_SCHEMA='AIG_REAL3D_ORIGINAL_EDGE_FOUR_VIEW_PROJECTION_V1';
const SHA=/^[a-f0-9]{64}$/i;
const TYPES=['OPEN_BOUNDARY','NON_MANIFOLD','WINDING_CONFLICT'];
const ANGLES=['front','side','back','threeQuarter'];
const num=x=>typeof x==='number'&&Number.isFinite(x);
const r=x=>Math.round(x*1000)/1000;
export function projectAIGSourceDefectEdges({localSurface,angle='front',width=1080,height=1920}={}){
 if(localSurface?.schema!==AIG_REAL3D_LOCAL_SURFACE_QA_SCHEMA||
 !SHA.test(localSurface.sourceSha256??'')||
 !Number.isInteger(localSurface.heightMm)||localSurface.heightMm<900||
 !Array.isArray(localSurface.regions)||localSurface.regionCount!==5)
  throw Error('DEFECT_PROJECTION_NATIVE_SOURCE_REPORT_REQUIRED');
 if(!ANGLES.includes(angle)||!Number.isInteger(width)||!Number.isInteger(height)||
 width<320||height<320||width*height>3200000)
  throw Error('DEFECT_PROJECTION_CAMERA_CONTRACT');
 const H=localSurface.heightMm/1000;
 const camera=validateAIGInspectionCapturePlan({
  heightMeters:H,angle,mode:'ALBEDO'
 }).camera;
 const yaw=camera.yaw;
 // Identical orthographic basis and focus as the existing 21 OBJ points.
 const basis=[Math.cos(yaw),0,-Math.sin(yaw)];
 const toPixel=p=>{
  if(!Array.isArray(p)||p.length!==3||!p.every(num))
   throw Error('DEFECT_PROJECTION_NONFINITE_EDGE_COORDINATES');
  const centered=p.map((v,i)=>v-camera.focus[i]);
  const x=width/2+height*(centered[0]*basis[0]+centered[2]*basis[2])/
   camera.orthoSpan;
  const y=height/2-height*centered[1]/camera.orthoSpan;
  return {x:r(x),y:r(y),onCanvas:x>=0&&x<width&&y>=0&&y<height};
 };
 const already=new Set(),edges=[];
 let overlappingRegions=0,zeroLengthProjected=0;
 for(const region of localSurface.regions){
  if(!Array.isArray(region.anomalyExactWorldEdges)||
   region.anomalyExactWorldEdges.length>96)
   throw Error('DEFECT_PROJECTION_INDEXED_EDGE_EVIDENCE_MISSING');
  for(const edge of region.anomalyExactWorldEdges){
   if(!TYPES.includes(edge.type)||!Number.isInteger(edge.startVertexIndex)||
    !Number.isInteger(edge.endVertexIndex)||edge.startVertexIndex<0||
    edge.endVertexIndex<0||edge.startVertexIndex===edge.endVertexIndex)
    throw Error('DEFECT_PROJECTION_INVALID_INDEXED_EDGE');
   const identity=edge.type+':'+
    [edge.startVertexIndex,edge.endVertexIndex].sort((a,b)=>a-b).join(':');
   if(already.has(identity)){overlappingRegions++;continue;}
   already.add(identity);
   const start=toPixel(edge.startWorldMeters),end=toPixel(edge.endWorldMeters);
   if(Math.hypot(start.x-end.x,start.y-end.y)<.25)zeroLengthProjected++;
   edges.push({
    type:edge.type,regionId:region.id,
    startVertexIndex:edge.startVertexIndex,
    endVertexIndex:edge.endVertexIndex,start,end,
    originalSourceEdgeNotSmoothed:true
   });
  }
 }
 const totalUncapped=localSurface.regions.reduce((n,z)=>
  n+(z.anomalyEdgeCountUncapped??0),0);
 const truncated=localSurface.regions.some(z=>z.anomalyEdgeEvidenceTruncated);
 return {
  schema:AIG_NATIVE_DEFECT_PROJECTION_SCHEMA,angle,width,height,
  sourceSha256:localSurface.sourceSha256,
  cameraYaw:camera.yaw,cameraOrthoSpan:camera.orthoSpan,
  projection:'ORTHOGRAPHIC_SOURCE_WORLD_TO_CANVAS',
  projectedEdges:edges,
  uniqueEvidenceEdges:edges.length,
  summedRegionAnomalyEdges:totalUncapped,
  duplicateEdgesAcrossRegions:overlappingRegions,
  evidenceTruncated:truncated,
  edgeCountInvisibleOrCompressedInProjection:zeroLengthProjected,
  drawingIs2DOverlayNotSourceMeshModification:true,
  originalSourceTopologyIsNotRepaired:true,
  naturalHumanAppearancePASS:false,releasePASS:false
 };
}
