/**
 * Real3D 3.14: exact discrete triangle-vs-triangle QA reuses AIG5.1
 * already-tested triangleSurfaceContact pipeline. This is an EVIDENCE gate,
 * separate from the bounded vertex-to-triangle projection in 3.14.
 * No fake zero contacts and no new renderer.
 */
import {intersectMeshTriangles} from './aig-seam-contact-5-1.mjs';
export const AIG314_INTERSECTION_SCHEMA='AIG_REAL3D_3_14_EXACT_DISCRETE_TRIANGLE_PAIRS';
const labelsByMode={
 hair:new Set([5,14,6,7]),
 skirt:new Set([10,11,12,13])
};
const fail=s=>{throw Error('AIG314_AUDIT_'+s)};
function makeFaces(position,indices,labels=null,mode=null,maxTriangles=36000){
 if(!(position instanceof Float32Array)||position.length<9||
  position.length%3||!(indices instanceof Uint32Array)||
  indices.length<3||indices.length%3||
  indices.length/3>maxTriangles||
  labels!==null&&(!(labels instanceof Uint8Array)||
   labels.length*3!==position.length)||
  !position.every(Number.isFinite)||
  indices.some(i=>i>=position.length/3))
  fail('REAL_INDEXED_TRIANGLES_REQUIRED');
 const subset=mode?labelsByMode[mode]:null;
 if(mode&&!subset)fail('BODY_CLASS_FILTER_UNKNOWN');
 const faces=[];
 for(let t=0;t<indices.length;t+=3){
  const ids=[indices[t],indices[t+1],indices[t+2]];
  if(new Set(ids).size!==3)continue;
  if(subset&&ids.filter(i=>subset.has(labels[i])).length<2)continue;
  const verts=ids.map(i=>[
   position[i*3],position[i*3+1],position[i*3+2]]);
  const ab=verts[1].map((x,k)=>x-verts[0][k]),
   ac=verts[2].map((x,k)=>x-verts[0][k]);
  const n=[ab[1]*ac[2]-ab[2]*ac[1],
   ab[2]*ac[0]-ab[0]*ac[2],
   ab[0]*ac[1]-ab[1]*ac[0]];
  if(Math.hypot(...n)<1e-10)continue;
  const box={min:[0,1,2].map(k=>Math.min(...verts.map(p=>p[k]))),
   max:[0,1,2].map(k=>Math.max(...verts.map(p=>p[k])))};
  faces.push({vertices:verts,box,face:t/3});
 }
 return faces;
}
export function auditAIG314ActualTriangleIntersections({
 bodyPosed,bodyIndices,sourceLabels,attachments=[],
 maxExactPairs=120000
}={}){
 if(!Array.isArray(attachments)||attachments.length<1||
  attachments.length>12||!Number.isInteger(maxExactPairs)||
  maxExactPairs<100||maxExactPairs>150000)
  fail('ATTACHMENT_AND_EXACT_PAIR_BUDGET_REQUIRED');
 const details=[];let contacts=0,exactTests=0,sourceFaces=0;
 for(const entry of attachments){
  const {mode,positions,indices,name='attachment'}=entry??{};
  if(!Object.hasOwn(labelsByMode,mode)||typeof name!=='string'||
   name.length>120)fail('ATTACHMENT_MODE_OR_NAME_INVALID');
  const body=makeFaces(bodyPosed,bodyIndices,sourceLabels,mode);
  const garment=makeFaces(positions,indices);
  if(!body.length||!garment.length){
   details.push({name,mode,sourceLabelledBodyTriangles:body.length,
    actualAttachmentTriangles:garment.length,
    confirmedIntersectionPairs:null,
    outcome:'BLOCKED_MISSING_SOURCE_TRIANGLE_REGION'});
   continue;
  }
  sourceFaces+=body.length;
  const result=intersectMeshTriangles(body,garment,{
   maxPairTests:maxExactPairs,maxCellEntries:200000
  });
  contacts+=result.confirmedSurfaceContactPairs;
  exactTests+=result.exactTrianglePairs;
  details.push({name,mode,sourceLabelledBodyTriangles:body.length,
   actualAttachmentTriangles:garment.length,
   exactTrianglePairsTested:result.exactTrianglePairs,
   actualBroadPhaseCandidates:result.broadPhaseCandidates,
   confirmedIntersectionPairs:result.confirmedSurfaceContactPairs,
   examples:result.examples,
   outcome:result.confirmedSurfaceContactPairs>0?
    'INTERSECTIONS_FOUND_NEEDS_REPAIR':
    'DISCRETE_TRIANGLE_SAMPLE_CLEAR_ONLY'});
 }
 const missing=details.some(x=>x.confirmedIntersectionPairs===null);
 return Object.freeze({schema:AIG314_INTERSECTION_SCHEMA,
  attachmentMeshesSampled:details.length,
  sourceBodyTriangleFacesChecked:sourceFaces,
  exactTrianglePairsTested:exactTests,
  confirmedBodyClothHairTriangleIntersections:contacts,
  details,
  sampledContactRiskDetected:contacts>0,
  sampledSourceDataComplete:!missing,
  discreteTriangleAuditClearOnly:!missing&&contacts===0,
  fullContinuousTimeCollisionFreeCertified:false,
  clothingHairSelfIntersectionsAudited:false,
  userApprovedHeroineAppearanceCertified:false,
  trueBodyAndAttachmentVerticesNotMutated:true,
  releaseAllowed:false});
}
