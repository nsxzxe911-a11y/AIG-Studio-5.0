/** Independent local evidence packet for a true high-density 3D source.
 * Checks supplied bytes/metadata correspondence only, not person identity.
 * Never uploads, logs photo bytes, or grants anatomical release approval.
 */
import {AIG_REAL3D_DENSE_SOURCE_SCHEMA} from './aig-real3d-dense-source-obj.mjs';
export const AIG_REAL3D_DENSE_EVIDENCE_SCHEMA='AIG_REAL3D_DENSE_SOURCE_REFERENCES_BOUND_BY_SHA_V1';
const SHA=/^[0-9a-f]{64}$/i;
const CAMERAS=['front','side','back','threeQuarter'];
export function buildAIGReal3DDenseEvidencePacket({
 sourceEvidence,sourceSha256,referenceImages=[],sourceOrigin='',
 claimedMethod='UNSPECIFIED',authorizedByClaimant=false
}={}){
 if(sourceEvidence?.schema!==AIG_REAL3D_DENSE_SOURCE_SCHEMA||
  sourceEvidence.sourceSha256!==sourceSha256||!SHA.test(sourceSha256??''))
  throw Error('DENSE_EVIDENCE_VERIFIED_OBJ_REQUIRED');
 if(typeof sourceOrigin!=='string'||sourceOrigin.length>256||
  !['UNSPECIFIED','STRUCTURED_LIGHT','PHOTOGRAMMETRY',
   'LIDAR','MANUAL_MODEL','OTHER'].includes(claimedMethod)||
  typeof authorizedByClaimant!=='boolean')
  throw Error('DENSE_EVIDENCE_SOURCE_DECLARATION_INVALID');
 if(!Array.isArray(referenceImages)||referenceImages.length>4)
  throw Error('DENSE_EVIDENCE_REFERENCE_SET_INVALID');
 const used=new Set(),images=[];
 for(const ref of referenceImages){
  if(!ref||!CAMERAS.includes(ref.angle)||used.has(ref.angle)||
   typeof ref.name!=='string'||ref.name.length>180||
   !SHA.test(ref.sha256)||!Number.isInteger(ref.width)||
   !Number.isInteger(ref.height)||ref.width<100||ref.height<100||
   ref.width*ref.height>9_000_000)
   throw Error('DENSE_EVIDENCE_REFERENCE_FILE_INVALID');
  used.add(ref.angle);
  images.push({
   angle:ref.angle,name:ref.name,sha256:ref.sha256,
   width:ref.width,height:ref.height,
   pixelsTakenFromUnalteredUserProvidedPNG:true
  });
 }
 const missing=CAMERAS.filter(a=>!used.has(a));
 const imageDimensionsMatch=images.length>0&&
  images.every(x=>x.width===images[0].width&&x.height===images[0].height);
 return {
  schema:AIG_REAL3D_DENSE_EVIDENCE_SCHEMA,
  sourceSha256,sourceName:sourceEvidence.sourceName,
  sourceVertexCount:sourceEvidence.originalVertexCount,
  originalTriangleCount:sourceEvidence.originalTriangleCount,
  gpuRenderedTriangles:sourceEvidence.renderedTriangleCount,
  gpuChunkCount:sourceEvidence.gpuChunkCount,
  noMeshDecimation:sourceEvidence.noSourceTopologyDecimation,
  referenceImages:images,referenceCount:images.length,
  missingAngles:missing,
  completeFourViewReferenceSet:missing.length===0&&imageDimensionsMatch,
  referenceImageDimensionsMatch:imageDimensionsMatch,
  sourceDeclaration:{
   origin:sourceOrigin.trim(),claimedMethod,claimantStatesAuthorized:authorizedByClaimant,
   originAuthenticatedByIndependentEvidence:false
  },
  imageContentNotIndependentlyAuthenticated:true,
  identicalPersonAcrossViewsNotProven:true,
  3DReconstructionFromPhotosNotPerformed:true,
  fineAnatomicalLandmarksStillNeedInspection:true,
  sourceHumanScanVerified:false,
  referencePhotosMatchedToMesh:false,
  naturalAppearancePASS:false,
  releasePASS:false
 };
}
