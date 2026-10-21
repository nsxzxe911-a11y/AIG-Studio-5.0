/** FastModel 6.2 — 2D model-sheet source provenance, NOT GLB geometry.
 * The user's school-uniform visual reference coexists with all prior
 * animation costumes. Never delete or gate swimwear/other wardrobe features.
 */
export const AIG62_SCHEMA='AIG_FASTMODEL_6_2_SCHOOL_VISUAL_REFERENCE_NO_WARDROBE_RESTRICTIONS';
export const AIG62_REFERENCES=Object.freeze([
 Object.freeze({id:'SCHOOL_CAMPUS_COLLAGE_20261021',file:'00_原始校園情境參考.jpg',
  mime:'image/jpeg',width:1536,height:864,bytes:330831,
  sha256:'ed5ed4ad139605344d67bf0a865e0a82f486fed63665cf503820811569c0b31f',
  kind:'USER_SUPPLIED_2D_CAMPUS_COLLAGE'}),
 Object.freeze({id:'SCHOOL_3D_STYLE_SHEET_V1_20261021',
  file:'01_校園制服3D展示板_v1.png',mime:'image/png',width:1448,height:1086,
  bytes:2378840,
  sha256:'5604014bbcd476078b2f738e34155d9273df61085e1bf4e2deb8719a73d47b22',
  kind:'AI_GENERATED_2D_STYLIZED_3D_SHEET'}),
 Object.freeze({id:'SCHOOL_3D_STYLE_SHEET_APPROVED_20261021',
  file:'02_校園制服3D展示板_最新版.png',mime:'image/png',width:1448,height:1086,
  bytes:2448092,
  sha256:'1deed212a2adcdc821e4291c6021fd1db490644da9a9c9b497f8243a7da296c1',
  kind:'USER_SELECTED_CURRENT_2D_VISUAL_REFERENCE'})
]);
export const AIG62_DEFAULT_REFERENCE_ID=AIG62_REFERENCES[2].id;
export const AIG62_WARDROBE_POLICY=Object.freeze({
 selectedCharacterReferenceCostume:'SCHOOL_UNIFORM',
 otherExistingAnimationOutfitsPreserved:true,
 existingSwimwearAssetsDeleted:false,
 otherOutfitBan:false,
 noGlobalWardrobeMutation:true
});
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
export function verifyAIG62ReferenceFile({
 id,fileSHA256,fileBytes,width,height,mime
}={}){
 const ref=AIG62_REFERENCES.find(x=>x.id===id);
 if(!ref||!hex(fileSHA256)||!Number.isInteger(fileBytes)||fileBytes<100||
  !Number.isInteger(width)||!Number.isInteger(height)||typeof mime!=='string')
  throw Error('AIG62_SOURCE_RECORD_INVALID');
 if(fileSHA256.toLowerCase()!==ref.sha256||fileBytes!==ref.bytes||
  width!==ref.width||height!==ref.height||mime!==ref.mime)
  throw Error('AIG62_REFERENCE_SHA_DIMENSIONS_OR_MIME_MISMATCH');
 return {schema:AIG62_SCHEMA,referenceId:ref.id,referenceFile:ref.file,
  sourceImageSHA256:ref.sha256,pixelDimensions:[ref.width,ref.height],
  verifiedActualBytesByCaller:true,
  selectedForSchoolHeroine:ref.id===AIG62_DEFAULT_REFERENCE_ID,
  actual3DGeometryPresent:false,
  loadedRealRiggedGLB:false,
  visualLikenessBetweenReferenceAndGLBVerified:false,
  userArtDirectionReferenceOnly:true,
  wardrobePolicy:AIG62_WARDROBE_POLICY,
  nativeAndroidWindows60FPSVerified:false,
  formal3DModelApproval:false,releaseAllowed:false};
}
/** Result is a read-only pairing: it never substitutes the independent
 * original photo SHA required by 6.0/6.1 face-measurement pipelines. */
export function pairAIG62WithTechnicalGLB(referenceEvidence,{
 glbSHA256,actualSkinnedMeshCount,actualAnimationClipCount,glbFromSourceImageSHA256
}={}){
 if(referenceEvidence?.schema!==AIG62_SCHEMA||
  referenceEvidence.sourceImageSHA256!==AIG62_REFERENCES.find(x=>
   x.id===referenceEvidence.referenceId)?.sha256||
  !hex(glbSHA256)||!hex(glbFromSourceImageSHA256)||
  !Number.isInteger(actualSkinnedMeshCount)||actualSkinnedMeshCount<1||
  !Number.isInteger(actualAnimationClipCount)||actualAnimationClipCount<1)
  throw Error('AIG62_REAL_GLB_OR_REFERENCE_EVIDENCE_REQUIRED');
 return {schema:AIG62_SCHEMA,sourceVisualReferenceSHA256:referenceEvidence.sourceImageSHA256,
  actualTechnicalGLBSHA256:glbSHA256.toLowerCase(),
  technicalGLBOriginalPhotoSHA256:glbFromSourceImageSHA256.toLowerCase(),
  realSkinnedMeshesObserved:actualSkinnedMeshCount,
  animationClipsObserved:actualAnimationClipCount,
  styleReferenceAndAnimationAreIndependentAssets:true,
  source2DIsNotAnActual3DMesh:true,
  visuallyComparedByHuman:false,
  wardrobePolicy:AIG62_WARDROBE_POLICY,
  approvedForAutoPublishing:false,releaseAllowed:false};
}
