/** FastModel 5.9 — bounded local search over ACTUAL posed skirt/body and
 * hair/body triangle contact counts. No simulated or guessed clearance scores.
 * 2 clips screen candidates; ALL 5 clips verify finalist versus baseline.
 * If either type of contact worsens on all 25 poses, REVERT to baseline.
 * Release/photographic identity never inferred from zero sampled contacts.
 */
import {generateAIG58FittedTechnical,auditAIG58RealPoseContacts} from './aig-appearance-fit-5-8.mjs';

export const AIG59_SCHEMA='AIG_FASTMODEL_5_9_REAL_POSE_BOUNDED_AUTO_FIT_TECHNICAL';
export const AIG59_PROFILES=Object.freeze([
 Object.freeze({skirtExpansion:1.16,hairBackClearance:.046}),
 Object.freeze({skirtExpansion:1.22,hairBackClearance:.065}),
 Object.freeze({skirtExpansion:1.29,hairBackClearance:.085}),
 Object.freeze({skirtExpansion:1.34,hairBackClearance:.105})
]);
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/i.test(x);
function fields(result){
 if(result?.schema!=='AIG_FASTMODEL_5_8_POSED_GARMENT_HAIR_CONTACT_TECHNICAL'||
  !hex(result.sourceSHA256)||!Number.isInteger(result.posesChecked)||
  !Array.isArray(result.clips)||result.posesChecked!==result.clips.length*5||
  result.posesChecked<5||result.clips.some(c=>!Array.isArray(c.samples)||c.samples.length!==5||
   typeof c.name!=='string'||!c.name.length||
   c.samples.some((s,i)=>s.fraction!==[0,.25,.5,.75,1][i]||
    !Number.isInteger(s.skirtBodyTriangleContacts)||s.skirtBodyTriangleContacts<0||
    !Number.isInteger(s.hairBodyTriangleContacts)||s.hairBodyTriangleContacts<0))||
  !Number.isInteger(result.skirtBodyConfirmedTriangleContacts)||
  !Number.isInteger(result.hairBodyConfirmedTriangleContacts))
  throw Error('AIG59_REAL_TRIANGLE_EVIDENCE_REQUIRED');
 const skirt=result.clips.reduce((a,c)=>a+c.samples.reduce((b,p)=>b+p.skirtBodyTriangleContacts,0),0);
 const hair=result.clips.reduce((a,c)=>a+c.samples.reduce((b,p)=>b+p.hairBodyTriangleContacts,0),0);
 if(skirt!==result.skirtBodyConfirmedTriangleContacts||
    hair!==result.hairBodyConfirmedTriangleContacts)
  throw Error('AIG59_EVIDENCE_SUMS_INCONSISTENT');
 return {skirt,hair,contactTotal:skirt+hair};
}
export function chooseAIG59NonRegressingIndex(records,{expectedClips=2}={}){
 if(!Array.isArray(records)||records.length<2||records.length>8||
  !Number.isInteger(expectedClips)||expectedClips<1||expectedClips>5)
  throw Error('AIG59_PROFILE_EVIDENCE_COUNT');
 const baseline=records[0],first=fields(baseline.audit);
 if(baseline.audit.clips.length!==expectedClips||
  !hex(baseline.glbSHA256)||baseline.audit.sourceSHA256!==baseline.glbSHA256)
  throw Error('AIG59_BASELINE_SOURCE_OR_CLIPS');
 const match=baseline.audit.clips.map(x=>x.name);
 let winner=0,winnerCost=Infinity;
 for(const [i,entry] of records.entries()){
  const f=fields(entry.audit);
  if(!hex(entry.glbSHA256)||entry.audit.sourceSHA256!==entry.glbSHA256||
   entry.audit.clips.length!==expectedClips||
   entry.audit.clips.some((c,j)=>c.name!==match[j])||
   !Number.isFinite(entry.skirtExpansion)||
   !Number.isFinite(entry.hairBackClearance))
   throw Error('AIG59_DIFFERENT_GLBS_OR_CLIPS');
  if(f.skirt>first.skirt||f.hair>first.hair)continue;
  // All non-regressing candidates are valid for review; among equal
  // contacts prefer less geometry distortion from the 5.8 baseline.
  const cost=(f.skirt+f.hair)*100000+
   Math.abs(entry.skirtExpansion-baseline.skirtExpansion)*10+
   Math.abs(entry.hairBackClearance-baseline.hairBackClearance)*10;
  if(cost<winnerCost){winner=i;winnerCost=cost;}
 }
 return {index:winner,
  baseline:first,selected:fields(records[winner].audit),
  verifiedNonRegressingOnSampledClips:true,
  samplingOnlyNotContinuousGuarantee:true,
  profileEvaluations:records.length,
  comparisonClips:[...match],releaseAllowed:false};
}
const validatedSha=async(bytes,hashBytes)=>{
 const result=await hashBytes(bytes);
 if(!hex(result))throw Error('AIG59_HASH_UNAVAILABLE');
 return result.toLowerCase();
};
/** Inject the exact GLTFLoader-backed parse and SHA implementations from
 * the existing runtime. Every pose is computed on its own parsed real GLB.
 */
export async function runAIG59BoundedAutoFit(scaffold,{
 parseGLB,hashBytes,profiles=AIG59_PROFILES,onProgress=()=>{}
}={}){
 if(typeof parseGLB!=='function'||typeof hashBytes!=='function'||
  typeof onProgress!=='function'||!Array.isArray(profiles)||
  profiles.length<2||profiles.length>8||
  profiles.some(p=>!Number.isFinite(p.skirtExpansion)||
   !Number.isFinite(p.hairBackClearance)))
  throw Error('AIG59_RUNTIME_OR_PROFILES_INVALID');
 if(profiles[0].skirtExpansion!==1.16||profiles[0].hairBackClearance!==.046)
  throw Error('AIG59_5_8_BASELINE_REQUIRED');
 const records=[];
 for(const [i,profile] of profiles.entries()){
  onProgress({phase:'measure',current:i+1,total:profiles.length});
  const model=generateAIG58FittedTechnical(scaffold,profile);
  const sha=await validatedSha(model.bytes,hashBytes);
  const parsed=await parseGLB(model.bytes.buffer);
  const audit=await auditAIG58RealPoseContacts(parsed,{
   sourceSHA256:sha,maxClips:2
  });
  records.push({index:i,profile:{...profile},
   skirtExpansion:profile.skirtExpansion,
   hairBackClearance:profile.hairBackClearance,
   glbSHA256:sha,audit,bytes:model.bytes});
 }
 const decision=chooseAIG59NonRegressingIndex(records);
 // Full five-clip check: rollback if the two-clip winner causes new
 // penetrations on a later wave/hair animation.
 const fullAudit=async entry=>{
  const parsed=await parseGLB(entry.bytes.buffer);
  return auditAIG58RealPoseContacts(parsed,{
   sourceSHA256:entry.glbSHA256,maxClips:5
  });
 };
 onProgress({phase:'verify-all-clips',current:0,total:2});
 const baseFull=await fullAudit(records[0]);
 let chosen=records[decision.index],selectedFull=decision.index===0?
  baseFull:await fullAudit(chosen);
 const initialWinningIndex=decision.index,base=fields(baseFull);
 let measuredRegression=fields(selectedFull).skirt>base.skirt||
  fields(selectedFull).hair>base.hair,rolledBack=false;
 if(measuredRegression){chosen=records[0];selectedFull=baseFull;rolledBack=true;}
 if(chosen.audit.sourceSHA256!==chosen.glbSHA256||
    selectedFull.sourceSHA256!==chosen.glbSHA256)
  throw Error('AIG59_FINAL_SOURCE_SHA_CHANGED');
 const summary=records.map(({bytes,audit,...r})=>({
  ...r,screenClips:audit.clips.map(c=>c.name),
  screenSkirtContacts:audit.skirtBodyConfirmedTriangleContacts,
  screenHairContacts:audit.hairBodyConfirmedTriangleContacts,
  screenPosesChecked:audit.posesChecked
 }));
 return {schema:AIG59_SCHEMA,bytes:chosen.bytes,
  sourceImageSHA256:scaffold.sourceSHA256,
  selectedGLBSHA256:chosen.glbSHA256,selectedProfile:{...chosen.profile},
  shortlistedProfileIndex:initialWinningIndex,selectedProfileIndex:chosen.index,
  profileCandidates:summary,full25PoseBaseline:{
   skirtContacts:base.skirt,hairContacts:base.hair,
   glbSHA256:records[0].glbSHA256},
  full25PoseSelected:{
   skirtContacts:selectedFull.skirtBodyConfirmedTriangleContacts,
   hairContacts:selectedFull.hairBodyConfirmedTriangleContacts,
   glbSHA256:chosen.glbSHA256,
   perClip:selectedFull.clips.map(c=>({name:c.name,
    skirtContacts:c.samples.reduce((a,s)=>a+s.skirtBodyTriangleContacts,0),
    hairContacts:c.samples.reduce((a,s)=>a+s.hairBodyTriangleContacts,0)}))},
  selectionAfterFullClipFallback:rolledBack,
  twoClipCandidateDecision:decision,
  actualMeasuredSkirtDelta:selectedFull.skirtBodyConfirmedTriangleContacts-base.skirt,
  actualMeasuredHairDelta:selectedFull.hairBodyConfirmedTriangleContacts-base.hair,
  exactPosesPerFullEvaluation:25,
  outcome:selectedFull.outcome,
  geometryOptimizerUsedRealSkinnedTriangles:true,
  identicalFiveOriginalClipNamesChecked:true,
  photoFaceLandmarkMeasurementAvailable:false,
  userOriginalFaceLikenessValidated:false,
  continuousMotionCollisionFreeProven:false,
  skirtAndHairSelfCollisionsVerified:false,
  nativeAndroidWindows60FPSMeasured:false,
  formalHumanApproval:false,releaseAllowed:false};
}
