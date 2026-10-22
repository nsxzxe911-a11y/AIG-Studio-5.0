/**
 * AIG 3AX formal mobile RGB visual source gate.
 * Verified registry file is named "05_3AX.png", but its ORIGINAL BYTES
 * are JPEG/JFIF. Never silently transcode or rename source before SHA.
 * Source identity != interactive controls / native 4K / genuine machine GLB.
 */
export const AIG3AX_VISUAL_MANIFEST_SCHEMA='AIG_3AX_AUTHORITY_SOURCE_GATE_V1';
export const AIG3AX_MOBILE_PIN=Object.freeze({
 authorityId:'AIGII-MOBILE-3AX-CURRENT-20261016',
 fileName:'05_3AX.png',
 sha256:'4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28',
 width:864,height:1536,bytes:431467,
 encoding:'JPEG_JFIF_DESPITE_PNG_FILENAME',decodedMime:'image/jpeg'
});
const fail=reason=>Object.freeze({ok:false,reason,displayAsRuntime:false,
 authorityModelVerified:false,native4KCertified:false,machineOutputEnabled:false});
const isHex64=v=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
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
function jpegSize(bytes){
 // Validate a JPEG SOI and scan its segment headers until a real Start-of-Frame.
 // Decode validity is independently checked with browser createImageBitmap.
 if(bytes.length<16||bytes[0]!==255||bytes[1]!==216)return null;
 let i=2,steps=0;
 while(i+4<bytes.length&&steps++<2000){
  if(bytes[i]!==255)return null;
  while(i<bytes.length&&bytes[i]===255)i++;
  if(i>=bytes.length)return null;
  const marker=bytes[i++];
  if(marker===217||marker===218)break; // EOI / entropy-coded SOS
  if(marker===1||marker>=208&&marker<=215)continue;
  if(i+2>bytes.length)return null;
  const length=bytes[i]*256+bytes[i+1];
  if(length<2||i+length>bytes.length)return null;
  if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){
   if(length<8)return null;
   return {height:bytes[i+3]*256+bytes[i+4],
    width:bytes[i+5]*256+bytes[i+6]};
  }
  i+=length;
 }
 return null;
}
export async function verifyAIG3AXImageBytes(bytes,expected=AIG3AX_MOBILE_PIN){
 if(!(bytes instanceof Uint8Array)||bytes.length<32||bytes.length>16000000)
  return fail('AIG_3AX_INVALID_OR_OVERSIZE_IMAGE');
 if(!expected||!isHex64(expected.sha256)||
  !Number.isInteger(expected.bytes)||expected.bytes<32||
  !Number.isInteger(expected.width)||!Number.isInteger(expected.height)||
  expected.encoding!=='JPEG_JFIF_DESPITE_PNG_FILENAME')
  return fail('AIG_3AX_PIN_INVALID');
 if(bytes.length!==expected.bytes)return fail('AIG_3AX_ORIGINAL_BYTE_LENGTH_MISMATCH');
 const dimensions=jpegSize(bytes);
 if(!dimensions)return fail('AIG_3AX_JPEG_ORIGINAL_ENCODING_INVALID');
 if(dimensions.width!==expected.width||dimensions.height!==expected.height)
  return fail('AIG_3AX_APPROVED_DIMENSIONS_MISMATCH');
 if(typeof crypto==='undefined'||!crypto.subtle?.digest)
  return fail('AIG_3AX_NO_SHA256_PROVIDER');
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 const actual=[...hash].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(actual!==expected.sha256)return fail('AIG_3AX_SHA256_MISMATCH');
 return Object.freeze({ok:true,reason:'AIG_3AX_SOURCE_BYTES_MATCH_APPROVED_MOBILE',
  sha256:actual,width:dimensions.width,height:dimensions.height,bytes:bytes.length,
  originalEncoding:'JPEG_JFIF_DESPITE_PNG_FILENAME',
  sourceIdentityOnly:true,displayAsRuntime:false,
  native4KCertified:false,authorityModelVerified:false,
  machineOutputEnabled:false,desktopApproved:false});
}
