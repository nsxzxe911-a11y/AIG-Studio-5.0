/** AIG FastModel 3.7 — exact user-supplied heroine source, NOT 3D approval.
 * Original file is a JPEG despite its conversation filename extension .png.
 * No face identity detection. SHA binds only bytes, never a visual resemblance.
 */
export const HEROINE_REFERENCE=Object.freeze({
 id:'HEROINE_SAKURA_CAMPUS_20261021',
 sha256:'fbf47f32a844a80e1bb39cb23084527baaf1350427c20d2b49d21fdc453444d6',
 pixelWidth:1152,pixelHeight:1536,mime:'image/jpeg',
 captureScope:'UPPER_BODY_AND_THIGHS_VISIBLE_LEGS_TRUNCATED',
 occlusion:'LONG_HAIR_COVERS_PART_OF_NECK',
 unseenGeometryInferred:true,backgroundContainsOtherPeople:true,
 originalNotStoredInRepository:true,realHeroineGLBApproved:false
});
const hex=/^[a-f0-9]{64}$/i;
const copied=a=>a?JSON.parse(JSON.stringify(a)):null;
export function identifyHeroineSource({sha256,width,height,mime}={}){
 const shaValid=typeof sha256==='string'&&hex.test(sha256);
 const verified=shaValid&&sha256.toLowerCase()===HEROINE_REFERENCE.sha256&&
  width===HEROINE_REFERENCE.pixelWidth&&height===HEROINE_REFERENCE.pixelHeight&&
  mime==='image/jpeg';
 return {schema:'AIG_HEROINE_3_7_IMAGE_ADMISSION',referenceId:HEROINE_REFERENCE.id,
  sourceImageSHA256:shaValid?sha256.toLowerCase():null,
  sourceMatched:!!verified,status:verified?'SOURCE_IMAGE_MATCH_ONLY':'SOURCE_IMAGE_NOT_AUTHORITY',
  scene3dGenerated:false,headNeckContinuityVerified:false,
  unseenLegsReconstructed:false,visualIdentityApproved:false,releaseAllowed:false};
}
export async function inspectHeroineImage(file,{cryptoImpl=globalThis.crypto,decodeImage}={}){
 if(!file||typeof file.arrayBuffer!=='function'||!cryptoImpl?.subtle?.digest||typeof decodeImage!=='function')
  throw Error('HEROINE_SOURCE_READER_REQUIRED');
 if(!Number.isInteger(file.size)||file.size<100||file.size>20*1024*1024)
  throw Error('HEROINE_IMAGE_SIZE_INVALID');
 const bytes=await file.arrayBuffer(),header=new Uint8Array(bytes,0,Math.min(12,bytes.byteLength));
 // Format determined from bytes, not file extension or MIME supplied by OS.
 if(header[0]!==0xff||header[1]!==0xd8||header[2]!==0xff)
  throw Error('HEROINE_SOURCE_NOT_JPEG');
 const hash=new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',bytes));
 const sha=[...hash].map(x=>x.toString(16).padStart(2,'0')).join('');
 const shape=await decodeImage(file);
 return identifyHeroineSource({sha256:sha,width:shape.width,height:shape.height,mime:'image/jpeg'});
}
/** A local pipeline journal can corroborate byte linkage, NOT likeness.
 * Any manually imported GLB, synthetic fixture, mismatched job, or source
 * photo alone remains unapproved. No implicit merge into real release gate.
 */
export function evaluateHeroineJob({job,modelSha256,assetName='animated.glb'}={}){
 const artifact=job?.artifacts?.[assetName];
 const audit=artifact?.audit;
 const isHash=x=>typeof x==='string'&&hex.test(x);
 const imageMatch=job?.sourceSHA256===HEROINE_REFERENCE.sha256;
 const artifactMatch=isHash(modelSha256)&&isHash(artifact?.sha256)&&
  modelSha256.toLowerCase()===artifact.sha256.toLowerCase();
 const structural=!!(audit?.structuralOnly&&Number.isInteger(audit.vertices)&&
  audit.vertices>=4&&Number.isInteger(audit.triangles)&&audit.triangles>=4&&
  audit.skins>=1&&audit.animationClips>=1&&audit.changingKeys===true);
 const linked=job?.status==='COMPLETE'&&job?.provider==='Meshy'&&
  job?.mode==='humanoid'&&imageMatch&&artifactMatch&&structural&&
  job?.stages?.model?.status==='SUCCEEDED'&&job?.stages?.rig?.status==='SUCCEEDED'&&
  job?.stages?.animation?.status==='SUCCEEDED';
 return {schema:'AIG_HEROINE_3_7_MODEL_SOURCE_CHAIN',referenceId:HEROINE_REFERENCE.id,
  sourceImageSHA256:job?.sourceSHA256||null,modelSHA256:isHash(modelSha256)?modelSha256:null,
  originalImageHashMatches:!!imageMatch,artifactHashMatches:!!artifactMatch,
  glbStructuralAuditAvailable:!!structural,sourceChainMatched:!!linked,
  providerJobId:linked?job.id:null,
  status:linked?'REAL_GLB_SOURCE_LINKED_VISUAL_REVIEW_REQUIRED':'BLOCKED_NO_VERIFIED_HEROINE_GLB_CHAIN',
  knownLimitations:['UNSEEN_LEGS_INFERRED','HAIR_NECK_OCCLUSION','BACKGROUND_HAS_OTHER_PERSONS'],
  confirmedPhotorealHeroine:false,skinHairCollisionVerified:false,
  headNeckSeamVerified:false,lipSyncPhonemesVerified:false,
  native60fpsVerified:false,video1080pPlaybackVerified:false,
  formalReleaseAllowed:false,sourceReport:copied(audit)};
}
