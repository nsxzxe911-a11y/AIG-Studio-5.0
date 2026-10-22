/**
 * AIG 3AX formal visual source gate.
 * Source identity SHA is not a replacement for image decode, authored
 * interactive RGB regions, GLB authenticity, native 4K, or CNC approval.
 * Browser / Node 22+, no network writes, no dependency on user accounts.
 */
export const AIG3AX_VISUAL_MANIFEST_SCHEMA='AIG_3AX_AUTHORITY_SOURCE_GATE_V1';
export const AIG3AX_MOBILE_PIN=Object.freeze({
 authorityId:'AIGII-MOBILE-3AX-CURRENT-20261016',
 fileName:'05_3AX.png',
 sha256:'4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28',
 width:864,height:1536,bytes:431467
});
const PNG=[137,80,78,71,13,10,26,10];
const isHex64=v=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
const fail=reason=>Object.freeze({ok:false,reason,displayAsRuntime:false,
 authorityModelVerified:false,native4KCertified:false,machineOutputEnabled:false});
export function validateAIG3AXManifest(manifest){
 if(manifest?.schema!==AIG3AX_VISUAL_MANIFEST_SCHEMA||
  !manifest.mobile||!Object.entries(AIG3AX_MOBILE_PIN).every(([k,v])=>manifest.mobile[k]===v)||
  manifest.mobile.native4K!==false||
  manifest.mobile.candidateUrl!=='./visual-authority/mobile/05_3AX.png'||
  manifest.oldRevoked438Allowed!==false||
  manifest.desktop?.sha256!==null||
  manifest.machineGeometry?.sourceSha256!==null||
  manifest.cncMachineOutputEnabled!==false||
  manifest.previewUsage!=='INDEPENDENT_SOURCE_COMPARISON_ONLY_NEVER_BACKGROUND_FAKE_CONTROLS')
  throw Error('AIG_3AX_AUTHORITY_MANIFEST_NOT_EXACT_APPROVED_SOURCE');
 return true;
}
export async function verifyAIG3AXPNGBytes(bytes,expected=AIG3AX_MOBILE_PIN){
 if(!(bytes instanceof Uint8Array)||bytes.length<33||bytes.length>16000000)
  return fail('AIG_3AX_INVALID_OR_OVERSIZE_PNG');
 if(!expected||!isHex64(expected.sha256)||
  !Number.isInteger(expected.bytes)||expected.bytes<33||
  !Number.isInteger(expected.width)||!Number.isInteger(expected.height))
  return fail('AIG_3AX_PIN_INVALID');
 if(bytes.length!==expected.bytes)return fail('AIG_3AX_ORIGINAL_BYTE_LENGTH_MISMATCH');
 if(!PNG.every((v,i)=>bytes[i]===v))return fail('AIG_3AX_PNG_SIGNATURE_MISMATCH');
 const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(dv.getUint32(8)!==13||bytes[12]!==73||bytes[13]!==72||
  bytes[14]!==68||bytes[15]!==82)
  return fail('AIG_3AX_PNG_IHDR_MISSING');
 const width=dv.getUint32(16),height=dv.getUint32(20);
 if(width!==expected.width||height!==expected.height)
  return fail('AIG_3AX_APPROVED_DIMENSIONS_MISMATCH');
 if(typeof crypto==='undefined'||!crypto.subtle?.digest)
  return fail('AIG_3AX_NO_SHA256_PROVIDER');
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 const actual=[...hash].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(actual!==expected.sha256)return fail('AIG_3AX_SHA256_MISMATCH');
 return Object.freeze({ok:true,reason:'AIG_3AX_SOURCE_BYTES_MATCH_APPROVED_MOBILE',
  sha256:actual,width,height,bytes:bytes.length,
  sourceIdentityOnly:true,displayAsRuntime:false,
  native4KCertified:false,authorityModelVerified:false,
  machineOutputEnabled:false,desktopApproved:false});
}