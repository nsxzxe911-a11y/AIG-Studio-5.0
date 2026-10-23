/**
 * Real3D trustworthy source intake and anatomy review contract.
 * No user declaration or aspect ratio auto-certifies an authentic human.
 * No uploads, source mesh morphs, synthetic people, or release shortcuts.
 */
export const AIG_REAL3D_SOURCE_GATE_SCHEMA='AIG_REAL3D_BROWN_SOURCE_REVIEW_V1';
const SHA=/^[a-f0-9]{64}$/i;
const MARKERS=['headTop','chin','noseTip','neckBase','leftShoulder',
 'rightShoulder','leftElbow','rightElbow','leftWrist','rightWrist',
 'leftThumbTip','rightThumbTip','leftIndexTip','rightIndexTip','pelvis',
 'leftKnee','rightKnee','leftHeel','rightHeel','leftToe','rightToe'];
export function validateAIGReal3DLandmarkSidecar(raw){
 if(raw===null||raw===undefined)return {provided:false,count:0,allRequiredNamesPresent:false,errors:['LANDMARKS_MISSING'],points:null};
 if(typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>60)
  throw Error('SOURCE_LANDMARK_DOCUMENT_FORMAT');
 const keys=Object.keys(raw),errors=[];
 for(const key of MARKERS){
  const p=raw[key];
  if(!Array.isArray(p)||p.length!==3||!p.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<1000000))
   errors.push('MISSING_OR_INVALID_'+key);
 }
 return {provided:true,count:keys.length,
  allRequiredNamesPresent:errors.length===0,
  errors,points:errors.length===0?raw:null};
}
export function buildAIGReal3DSourceReview({
 sourceName,sourceSha256,sourceBytes,heightMm,
 upAxis='Y',evidence,declaredOrigin='',declaredMethod='UNSPECIFIED',
 userClaimsAuthorized=false,landmarkSidecar=null,
 captureProofs=[]
}={}){
 if(typeof sourceName!=='string'||!/\.(obj|glb)$/i.test(sourceName)||sourceName.length>180)
  throw Error('SOURCE_FILE_NAME_OR_FORMAT');
 if(!SHA.test(sourceSha256??''))throw Error('SOURCE_MISSING_REAL_SHA256');
 if(!Number.isInteger(sourceBytes)||sourceBytes<64||sourceBytes>50000000)
  throw Error('SOURCE_SIZE');
 if(!Number.isInteger(heightMm)||heightMm<900||heightMm>2200)
  throw Error('SOURCE_MEASURED_HEIGHT');
 if(!['Y','Z'].includes(upAxis))throw Error('SOURCE_UP_AXIS');
 if(!evidence||typeof evidence!=='object')throw Error('SOURCE_NATIVE_EVIDENCE_REQUIRED');
 if(!['UNSPECIFIED','STRUCTURED_LIGHT','PHOTOGRAMMETRY','LIDAR','MANUAL_MODEL','OTHER'].includes(declaredMethod))
  throw Error('SOURCE_METHOD');
 if(typeof declaredOrigin!=='string'||declaredOrigin.length>256)
  throw Error('SOURCE_ORIGIN_FORMAT');
 if(typeof userClaimsAuthorized!=='boolean')throw Error('SOURCE_AUTHORIZATION_FORMAT');
 const marker=validateAIGReal3DLandmarkSidecar(landmarkSidecar);
 if(!Array.isArray(captureProofs)||captureProofs.length>20||
 captureProofs.some(p=>!p||typeof p!=='object'||!SHA.test(p.sha256)||!['front','side','back','threeQuarter'].includes(p.angle)||!Number.isInteger(p.width)||!Number.isInteger(p.height)))
  throw Error('SOURCE_CAPTURE_EVIDENCE_INVALID');
 const ext=sourceName.toLowerCase().endsWith('.obj')?'OBJ':'GLB';
 const shapeOK=ext==='OBJ'?evidence.geometryPASS===true:evidence.renderGeometryPASS===true;
 const checksumMatches=evidence.sourceSha256===sourceSha256;
 const angles=[...new Set(captureProofs.map(x=>x.angle))];
 const fourAngles=['front','side','back','threeQuarter'].every(a=>angles.includes(a));
 const anatomicalLabelsComplete=ext==='OBJ'&&evidence.landmarkAudit?.complete===true&&marker.allRequiredNamesPresent;
 const authorizedDeclarationRecorded=userClaimsAuthorized&&declaredOrigin.trim().length>0;
 const pipelineErrors=[];
 if(!shapeOK)pipelineErrors.push('NATIVE_GEOMETRY_GATE_BLOCK');
 if(!checksumMatches)pipelineErrors.push('HASH_EVIDENCE_MISMATCH');
 if(!fourAngles)pipelineErrors.push('FOUR_ANGLE_GPU_CAPTURE_PENDING');
 if(!authorizedDeclarationRecorded)pipelineErrors.push('PROVENANCE_DECLARATION_PENDING');
 if(!anatomicalLabelsComplete)pipelineErrors.push('ANATOMICAL_REFERENCE_VALIDATION_PENDING');
 // This is a PRE-REVIEW RECORD, not an endorsement or an automatic PASS.
 return {
  schema:AIG_REAL3D_SOURCE_GATE_SCHEMA,
  model:{name:sourceName,sha256:sourceSha256,bytes:sourceBytes,
   format:ext,heightMm,upAxis,
   originalXYZNeverModifiedByPostFX:true},
  sourceDeclaration:{origin:declaredOrigin.trim(),method:declaredMethod,
   claimantStatesAuthorized:userClaimsAuthorized,
   provenanceAuthenticatedByIndependentEvidence:false,
   authenticityNotProvableFromFilenameOrSelfAttestation:true},
  computedEvidence:{
   nativeMeshGeometryGatePASS:shapeOK,
   checksumMatchesNativeIntake:checksumMatches,
   totalVertices:evidence.actualVertices??null,
   totalTriangles:evidence.actualTriangles??null,
   connectedComponents:evidence.connectedComponents??null,
   openEdges:evidence.openEdges??null,
   nonManifoldEdges:evidence.nonManifoldEdges??null,
   fourRealGpuOrthographicAnglesCaptured:fourAngles,
   fourAngles:angles,
   submittedLandmarks:marker.count,
   labeledAnatomyValidatedAgainstMesh:anatomicalLabelsComplete,
   labelProblems:marker.errors
  },
  gateIssues:pipelineErrors,
  readyForHumanReferenceReview:pipelineErrors.length===0,
  personAuthenticityVerified:false,
  verifiedSamePersonFromPhotos:false,
  realisticFaceFingersFeetPASS:false,
  naturalAppearancePASS:false,
  riggedAnimationPASS:false,
  releasePASS:false,
  releaseStatus:'BLOCK_PENDING_INDEPENDENT_SOURCE_AND_HUMAN_VISUAL_REVIEW',
  noGeometricReconstructionPerformed:true
 };
}
