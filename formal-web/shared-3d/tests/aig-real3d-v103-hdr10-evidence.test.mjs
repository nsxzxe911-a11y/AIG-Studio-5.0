import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAIGReal3DHDR10Source}
 from '../aig-real3d-v103-hdr10-evidence.mjs';
test('V103 existing 8-bit SDR 3840x2160 PNG output must NOT be called HDR10',()=>{
 const receipt=auditAIGReal3DHDR10Source({
  rendererColorBits:[8,8,8,0],
  linearSceneFloatSource:false,sourceLuminanceActuallyMeasured:false,
  float16FramebufferActuallyVerified:false,
  outputEncodedBitDepth:8,
  transferFunction:'bt709',colorPrimaries:'bt709',
  colorMatrix:'bt709',masteringDisplayPresent:false});
 assert.equal(receipt.HDR10PASS,false);
 assert.equal(receipt.SDR8BitSourceCannotBeUpconvertedToRealHDR10,true);
 assert.equal(receipt.actual10BitPQEncodedStream,false);
 assert.equal(receipt.actualLinearLightHDRSourceProof,false);
 assert.equal(receipt.releasePASS,false);
});
test('V103 even user-declared 10-bit PQ fields are not true independent decoded media proof',()=>{
 const r=auditAIGReal3DHDR10Source({
  rendererColorBits:[10,10,10,0],
  linearSceneFloatSource:true,sourceLuminanceActuallyMeasured:true,
  float16FramebufferActuallyVerified:true,
  outputEncodedBitDepth:10,transferFunction:'smpte2084',
  colorPrimaries:'bt2020',colorMatrix:'bt2020nc',
  masteringDisplayPresent:true,maxCLLAndFALLPresent:true,
  externalDecodedFrameVerified:true,
  actualOutputSha256:'a'.repeat(64)});
 assert.equal(r.hdr10ClaimedMetadataAndSourceRequirementsMet,true);
 assert.equal(r.actualMediaFileDecodedAndIndependentlyInspectedByThisModule,false);
 assert.equal(r.HDR10PASS,false);
});
test('V103 forged/colorless video metrics cannot be promoted to HDR',()=>{
 assert.throws(()=>auditAIGReal3DHDR10Source({
  rendererColorBits:[8,'HDR10',8,0]}),/INVALID_MEASUREMENT_SOURCE/);
});
