/**
 * HDR10 technical and source gate. NOT a fake "HDR" saturation slider.
 * True HDR10 requires:
 *  - genuine high-dynamic-range linear light pixel source, not RGBA8 canvas;
 *  - 10-bit encoded PQ ST-2084 samples, BT.2020 primaries/matrix;
 *  - verified mastery and content light metadata AND decoded values.
 * This module checks external verified encoder/evidence; it does not turn
 * SDR PNG into HDR10 or claim WebGL default framebuffer is 10-bit.
 */
export const AIG_REAL3D_V103_HDR_SCHEMA='AIG_REAL3D_V103_REAL_HDR10_OUTPUT_EVIDENCE_GATE_V1';
const fail=x=>{throw Error('REAL3D_V103_HDR10_'+x);};
const validSHA=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function auditAIGReal3DHDR10Source({
 rendererColorBits=[8,8,8,8],
 linearSceneFloatSource=false,
 sourceLuminanceActuallyMeasured=false,
 float16FramebufferActuallyVerified=false,
 outputEncodedBitDepth=null,transferFunction=null,
 colorPrimaries=null,colorMatrix=null,
 masteringDisplayPresent=false,maxCLLAndFALLPresent=false,
 externalDecodedFrameVerified=false,actualOutputSha256=null
}={}){
 if(!Array.isArray(rendererColorBits)||rendererColorBits.length!==4||
  !rendererColorBits.every(x=>Number.isInteger(x)&&x>=0&&x<=32)||
  [linearSceneFloatSource,sourceLuminanceActuallyMeasured,
   float16FramebufferActuallyVerified,masteringDisplayPresent,
   maxCLLAndFALLPresent,externalDecodedFrameVerified].some(x=>typeof x!=='boolean'))
  fail('INVALID_MEASUREMENT_SOURCE');
 const HDRSourcePASS=linearSceneFloatSource&&sourceLuminanceActuallyMeasured,
  tenBitEncodedPASS=outputEncodedBitDepth===10,
  pqBT2020PASS=transferFunction==='smpte2084'&&
   colorPrimaries==='bt2020'&&colorMatrix==='bt2020nc',
  metadataPASS=masteringDisplayPresent&&maxCLLAndFALLPresent,
  decodedOutputPASS=externalDecodedFrameVerified&&validSHA(actualOutputSha256),
  HDR10PASS=HDRSourcePASS&&tenBitEncodedPASS&&pqBT2020PASS&&
   metadataPASS&&decodedOutputPASS;
 return {schema:AIG_REAL3D_V103_HDR_SCHEMA,
  actualWebGLFramebufferRGBAChannelBits:[...rendererColorBits],
  actualLinearLightHDRSourceProof:HDRSourcePASS,
  floatingPointIntermediateHardwareSupport:float16FramebufferActuallyVerified,
  actual10BitPQEncodedStream:tenBitEncodedPASS&&pqBT2020PASS,
  encoderMasteringMetadataValidated:metadataPASS,
  external10BitDecodedSampleEvidenceValidated:decodedOutputPASS,
  actualVerifiedFileSha256:validSHA(actualOutputSha256)?actualOutputSha256:null,
  hdr10ClaimedMetadataAndSourceRequirementsMet:HDR10PASS,
  actualMediaFileDecodedAndIndependentlyInspectedByThisModule:false,
  HDR10PASS:false,
  SDR8BitSourceCannotBeUpconvertedToRealHDR10:!linearSceneFloatSource,
  notCertifiedByTonemapOrOverbrightColor:true,
  originalSourceImageAnd3DGeometryUnchanged:true,
  releasePASS:false};
}
