/** FastModel 5.3 — immutable, fail-closed evidence manifest for the exact same GLB SHA.
 * This is an evidence aggregator: not a native device verifier, approved-image
 * matcher, signature verifier, or a human release-authority replacement.
 */
import {HEROINE_REFERENCE} from './heroine-authority-3-7.mjs';
import {AIG50_SCHEMA} from './aig-fullbody-5-0.mjs';
import {AIG51_SCHEMA} from './aig-seam-contact-5-1.mjs';
import {AIG52_SCHEMA} from './aig-runtime-evidence-5-2.mjs';
import {AIG54_SCHEMA} from './aig-native-source-5-4.mjs';

export const AIG53_SCHEMA='AIG_FASTMODEL_5_3_UNIFIED_EVIDENCE_NONRELEASE_DRAFT';
export const AIG53_CHECK_IDS=Object.freeze([
 'AUTHORITY_PHOTO_SHA','GLB_SOURCE_PROVENANCE','FULLBODY_SKIN_5_0',
 'POSED_SEAMS_HAIR_5_1','VISUAL_16_VIEWS_5_2','BROWSER_240_FRAMES_5_2',
 'VIEWER_SAME_SOURCE_SHA','VISUAL_IDENTITY_HUMAN_REVIEW',
 'ANDROID_NATIVE_DEVICE_60FPS','WINDOWS_NATIVE_DEVICE_60FPS',
 'PRODUCTION_VIDEO_AUDIO_REVIEW'
]);
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/i.test(x);
const validHex=x=>hex(x)?x.toLowerCase():null;
const n=x=>typeof x==='number'&&Number.isFinite(x);
function decision(id,pass,reason,evidence={}) {
 return {id,status:pass?'PASS':'BLOCKED',reason,...evidence};
}
/**
 * All evidence objects must be produced from the current in-memory workflow.
 * Independently imported/untrusted JSON is not a sufficient attestation.
 * No manual approve flags or external arbitrary native PASS are accepted.
 */
export function compileAIG53Evidence({
 sourceImageEvidence=null,heroineSourceChain=null,rig50=null,seams51=null,
 visual52=null,fps52=null,nativeTechnical54=null,currentViewerSourceSHA256=null,currentClipName=null,
 storyReady=false
}={}){
 const model=validHex(rig50?.sourceSHA256),viewer=validHex(currentViewerSourceSHA256);
 const imageMatched=sourceImageEvidence?.sourceMatched===true&&
  sourceImageEvidence?.sourceImageSHA256===HEROINE_REFERENCE.sha256&&
  sourceImageEvidence?.referenceId===HEROINE_REFERENCE.id;
 const chainMatch=heroineSourceChain?.schema==='AIG_HEROINE_3_7_MODEL_SOURCE_CHAIN'&&
  heroineSourceChain?.referenceId===HEROINE_REFERENCE.id&&
  heroineSourceChain?.sourceImageSHA256===HEROINE_REFERENCE.sha256&&
  heroineSourceChain?.originalImageHashMatches===true&&
  heroineSourceChain?.artifactHashMatches===true&&
  heroineSourceChain?.glbStructuralAuditAvailable===true&&
  heroineSourceChain?.sourceChainMatched===true&&
  validHex(heroineSourceChain.modelSHA256)===model;
 const rigOK=!!model&&rig50?.schema===AIG50_SCHEMA&&
  rig50.outcome==='STRUCTURAL_QA_PASS_ONLY'&&rig50.skeletonTopologyGate===true&&
  rig50.shoulderNeckHeadActualSharedIndexedComponent===true&&
  rig50.animationHasRealSkinnedVertexMotion===true;
 const seamsOK=!!model&&seams51?.schema===AIG51_SCHEMA&&
  validHex(seams51.sourceSHA256)===model&&
  seams51.outcome==='POSED_GEOMETRY_QA_PASS_ONLY'&&
  seams51.upstreamAIG50Outcome==='STRUCTURAL_QA_PASS_ONLY'&&
  seams51.sampledShoulderNeckSeamsInRange===true&&
  seams51.sampledBodyHairIntersectionFree===true&&
  seams51.confirmedBodyHairContacts===0&&
  n(seams51.posesChecked)&&seams51.posesChecked>=5;
 const viewerSame=!!model&&viewer===model;
 const selectedClip=typeof currentClipName==='string'?currentClipName:null;
 const visualOK=!!model&&visual52?.schema===AIG52_SCHEMA&&
  visual52?.sourceSHA256===model&&
  visual52?.sourceMatchesCurrentViewer===true&&
  visual52?.visualEvidenceSource==='ACTUAL_BROWSER_WEBGL_CAPTURE_16_VIEWS'&&
  visual52?.frameCount===16&&Array.isArray(visual52.frames)&&
  visual52.frames.length===4&&visual52.frames.every(f=>Array.isArray(f.views)&&f.views.length===4)&&
  visual52.clipName===selectedClip&&viewerSame;
 const browserOK=!!model&&fps52?.schema===AIG52_SCHEMA&&
  validHex(fps52.sourceSHA256)===model&&
  fps52.sourceMatchesCurrentViewer===true&&
  fps52.runtime==='BROWSER_WEBGL_ANIMATION_LOOP'&&
  fps52.outcome==='BROWSER_FRAME_TIMING_PASS_ONLY'&&
  fps52.observedBrowserFramePacingPassed===true&&
  fps52.measurementCompleted===true&&
  fps52.measurementInvalidReason===null&&
  n(fps52.measuredFrameIntervals)&&fps52.measuredFrameIntervals>=240&&
  n(fps52.framesPerSecond)&&fps52.framesPerSecond>=57&&
  n(fps52.p95FrameMs)&&fps52.p95FrameMs<=1000/60*1.25&&
  typeof fps52?.environment?.userAgent==='string'&&
  fps52.environment.userAgent.length>0&&
  fps52.clipName===selectedClip&&viewerSame;
 const technicalNative4Proof=nativeTechnical54?.schema===AIG54_SCHEMA&&
  nativeTechnical54?.outcome==='NATIVE_SOURCE_INTEGRITY_ONLY'&&
  nativeTechnical54?.serverPersistedOriginalScaffoldAndGLBHashVerified===true&&
  nativeTechnical54?.clientDownloadedGLBHashVerified===true&&
  nativeTechnical54?.only4_0InferredVolumeMesh===true&&
  nativeTechnical54?.releaseAllowed===false;
 const native4Integrity54={
  status:technicalNative4Proof?'SOURCE_INTEGRITY_PASS_TECHNICAL_DRAFT_ONLY':'BLOCKED',
  modelSHA256:technicalNative4Proof?nativeTechnical54.modelGLBSHA256:null,
  sourceImageSHA256:technicalNative4Proof?nativeTechnical54.sourceImageSHA256:null,
  matchesSpecifiedHeroineOriginalImage:technicalNative4Proof&&
   nativeTechnical54.sourceImageSHA256===HEROINE_REFERENCE.sha256,
  canReplace5_0FullbodyGLB:false,canClear3_7HeroineSourceProvenance:false,
  doesNotCertifyHeroineIdentity:true
 };
 const checks=[
  decision('AUTHORITY_PHOTO_SHA',imageMatched,'指定櫻花校園 JPEG 的來源位元 SHA/像素核對；不證明 3D'),
  decision('GLB_SOURCE_PROVENANCE',chainMatch,'原圖 → 正式生成任務 → 完整 GLB 的可核查 SHA 鏈；僅匯入 GLB 不算'),
  decision('FULLBODY_SKIN_5_0',rigOK,'完整人體 15 骨、真蒙皮、頭頸胸共享 indexed mesh、動作變形'),
  decision('POSED_SEAMS_HAIR_5_1',seamsOK,'相同 GLB 來源之真動畫肩頸面積與具名髮束 SAT 取樣，並非全時段物理證明'),
  decision('VISUAL_16_VIEWS_5_2',visualOK,'與目前真播放器同 SHA、同片段的 16 張 WebGL 動畫畫面，只能交人工審視'),
  decision('BROWSER_240_FRAMES_5_2',browserOK,'實際瀏覽器可見畫面 240 幀+p95；GPU/Windows/Android 原生尚無證據'),
  decision('VIEWER_SAME_SOURCE_SHA',viewerSame,'正在顯示的 GLB 必須與全部來源證據為同一 SHA'),
  decision('VISUAL_IDENTITY_HUMAN_REVIEW',false,'目前沒有核准女主角五官、全身比例、服裝、貼圖、髮束的人工簽核系統'),
  decision('ANDROID_NATIVE_DEVICE_60FPS',false,'尚無具可驗來源的 Android 原生 APK 實機 60FPS/熱負載測量'),
  decision('WINDOWS_NATIVE_DEVICE_60FPS',false,'尚無具可驗來源的 Windows EXE 原生 60FPS/熱負載測量'),
  decision('PRODUCTION_VIDEO_AUDIO_REVIEW',false,
   storyReady?'劇情可播放≠正式 1080p 有聲成片已審核':'缺少已驗收實際人物有聲動畫成片')
 ];
 const passed=checks.filter(x=>x.status==='PASS').length;
 const technicalChecks=checks.slice(0,7);
 const verifiedTechnicalBundle=technicalChecks.every(x=>x.status==='PASS');
 // The aggregator can NEVER grant formal release: the three mandatory human/native gates
 // have no trusted identity/attestation mechanism in this browser-only stage.
 return {
  schema:AIG53_SCHEMA,referenceId:HEROINE_REFERENCE.id,sourceImageSHA256:HEROINE_REFERENCE.sha256,
  modelSHA256:model,currentViewerSourceSHA256:viewer,selectedClipName:selectedClip,
  sourceChainProviderJobId:chainMatch?heroineSourceChain.providerJobId:null,
  sourceChainAvailable:chainMatch,
  native4TechnicalIntegrity54:native4Integrity54,
  checks,passedChecks:passed,totalChecks:checks.length,blockedChecks:checks.length-passed,
  technicalEvidenceReadyForReview:verifiedTechnicalBundle,
  outcome:verifiedTechnicalBundle?'TECHNICAL_BUNDLE_READY_FOR_HUMAN_REVIEW_ONLY':'BLOCKED',
  reportIsEvidenceManifestNotReleaseCertificate:true,
  canVerifyAuthenticHumanAttestation:false,
  canVerifyOriginalImageAndGLBSemanticLikeness:false,
  canProveNativeAndroidWindowsPerformance:false,
  formalHeroineApproved:false,releaseAllowed:false
 };
}
