/**
 * Real3D 2.3 — adapt the EXISTING 6.4 true 17-bone skinned technical GLB
 * into the 2.0 single-renderer world and the 2.2 Chinese source-clip player.
 * This does NOT skin the separately exported 7.15 candidate geometry, scan
 * invisible anatomy, certify identity, or generate new walk/run/jump clips.
 */
import {analyzeAIG64PartialPortrait,generateAIG64SinglePartialFullbody}
 from './aig-single-photo-autobody-6-4.mjs';
import {parseRiggedGLB} from './viewer.mjs';
import {auditAIG50FullBody} from './aig-fullbody-5-0.mjs';
import {auditAIG63SchoolModelActualGLTF}
 from './aig-visual-compare-6-3.mjs';
import {auditAIG58RealPoseContacts} from './aig-appearance-fit-5-8.mjs';
export const AIG23_SCHEMA='AIG_FASTMODEL_REAL3D_2_3_SOURCE_PHOTO_TRUE_SKINNED_ACTOR';
const fail=s=>{throw Error('AIG23_'+s)};
const hex=bytes=>Array.from(new Uint8Array(bytes),
 x=>x.toString(16).padStart(2,'0')).join('');
export async function buildAIG23PhotoActor({pixels,width,height,sourceImageSHA256}={}){
 if(!(pixels instanceof Uint8Array||pixels instanceof Uint8ClampedArray)||
  !Number.isInteger(width)||!Number.isInteger(height)||
  width<128||height<128||width*height>2048*2048||
  pixels.length!==width*height*4||
  !/^[a-f0-9]{64}$/i.test(sourceImageSHA256||''))
  fail('BOUNDED_ACTUAL_IMAGE_PIXELS_AND_ORIGINAL_SHA_REQUIRED');
 const analysis=analyzeAIG64PartialPortrait({
  pixels,imageWidth:width,imageHeight:height,sourceImageSHA256
 });
 const technical=generateAIG64SinglePartialFullbody({analysis});
 if(technical.riggedBoneCount!==17||technical.skinnedMeshCount!==9||
  technical.animationClipCount!==5||technical.releaseAllowed!==false)
  fail('ORIGINAL_64_RIG_CONTRACT_CHANGED');
 const bytes=technical.bytes;
 if(!(bytes instanceof Uint8Array)||bytes.length<100||
  bytes.length>64*1024*1024)fail('BOUNDED_TRUE_GLB_REQUIRED');
 const modelSHA256=hex(await crypto.subtle.digest('SHA-256',bytes));
 const binary=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 const gltf=await parseRiggedGLB(binary);
 const rig=await auditAIG50FullBody(gltf,{sourceSHA256:modelSHA256});
 const garments=auditAIG63SchoolModelActualGLTF(gltf,{
  modelGLBSHA256:modelSHA256
 });
 if(rig.outcome!=='STRUCTURAL_QA_PASS_ONLY'||
  !rig.skeletonTopologyGate||rig.skinnedMeshCount!==9||
  rig.boneCount!==17||rig.clipsAvailable!==5||
  !garments.schoolOutfitMeshesPresent||
  garments.actualSkinnedMeshes!==9)
  fail('REAL_SKIN_WEIGHTS_AND_CLOTH_MESH_GATE_FAILED');
 // These are real numerical sampled body/skirt/hair intersections.
 // Contact risk is a release blocker, not a license to delete the working GLB.
 const contacts=await auditAIG58RealPoseContacts(gltf,{
  sourceSHA256:modelSHA256,maxClips:5
 });
 const proof={
  schema:AIG23_SCHEMA,sourceImageSHA256:sourceImageSHA256.toLowerCase(),
  modelGLBSHA256:modelSHA256,sourceCoverage:analysis.photoCoverage,
  technicalHeadToBodyRatio:technical.actualTechnicalHeadToBodyRatio,
  realBones:rig.boneCount,realSkinnedMeshes:rig.skinnedMeshCount,
  realSourceClips:gltf.animations.map(c=>({
   name:c.name,durationSeconds:c.duration
  })),
  genuineSkinningWeightsValidated:rig.skeletonTopologyGate,
  actuallyAnimatedGeometry:rig.animationHasRealSkinnedVertexMotion,
  separateSkinnedGarmentAndHairMeshes:garments.visibleSchoolAccessories.map(x=>x.name),
  sampledPoseCount:contacts.posesChecked,
  sampledSkirtBodyTriangleContacts:contacts.skirtBodyConfirmedTriangleContacts,
  sampledHairBodyTriangleContacts:contacts.hairBodyConfirmedTriangleContacts,
  discreteContactCheck:contacts.outcome,
  contactRiskNeedsRepair:contacts.outcome!=='DISCRETE_TRIANGLE_SURFACE_QA_PASS_ONLY',
  measuredPersonHeight:false,photoIdentityReconstructed:false,
  invisibleAnatomyIsPriorEstimated:true,
  candidate715GeometryAutomaticallySkinned:false,
  newWalkRunJumpGenerated:false,continuousCollisionFreeVerified:false,
  originalPhotoStoredSeparatelyRequired:true,androidWindowsNativeVerified:false,
  releaseAllowed:false
 };
 return {bytes,proof};
}
