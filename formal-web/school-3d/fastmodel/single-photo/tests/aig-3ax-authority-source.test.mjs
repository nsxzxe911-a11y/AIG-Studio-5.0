import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {AIG3AX_MOBILE_PIN,validateAIG3AXManifest,verifyAIG3AXImageBytes}
 from '../../../../3ax-authority-source-gate.mjs';
const {subtle}=webcrypto;
const fixtureJPEG=(w=864,h=1536)=>{
 // Synthetic JPEG marker sequence, deliberately not a decodable photo.
 // This exercises the byte gate only; browser createImageBitmap is separate.
 const b=new Uint8Array(20);
 b.set([255,216,255,224,0,4,0,0,255,192,0,8,8,h>>8,h&255,w>>8,w&255,1,255,217]);
 return b;
};
const digest=async bytes=>[...new Uint8Array(await subtle.digest('SHA-256',bytes))]
 .map(x=>x.toString(16).padStart(2,'0')).join('');
test('mobile 3AX exact original is registered by SHA and real JPEG encoding, not filename',()=>{
 assert.equal(AIG3AX_MOBILE_PIN.authorityId,'AIGII-MOBILE-3AX-CURRENT-20261016');
 assert.equal(AIG3AX_MOBILE_PIN.fileName,'05_3AX.png');
 assert.equal(AIG3AX_MOBILE_PIN.encoding,'JPEG_JFIF_DESPITE_PNG_FILENAME');
 assert.equal(AIG3AX_MOBILE_PIN.width,864);
 assert.equal(AIG3AX_MOBILE_PIN.height,1536);
 assert.equal(AIG3AX_MOBILE_PIN.bytes,431467);
 assert.equal(AIG3AX_MOBILE_PIN.sha256,'4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28');
});
test('only pinned approved source and blocked desktop/3D geometry are allowed',()=>{
 const m={schema:'AIG_3AX_AUTHORITY_SOURCE_GATE_V1',
 mobile:{...AIG3AX_MOBILE_PIN,native4K:false,candidateUrl:'./visual-authority/mobile/05_3AX.png'},
 oldRevoked438Allowed:false,desktop:{sha256:null},
 machineGeometry:{sourceSha256:null},cncMachineOutputEnabled:false,
 previewUsage:'INDEPENDENT_SOURCE_COMPARISON_ONLY_NEVER_BACKGROUND_FAKE_CONTROLS'};
 assert.equal(validateAIG3AXManifest(m),true);
 assert.throws(()=>validateAIG3AXManifest({...m,oldRevoked438Allowed:true}),/MANIFEST/);
 assert.throws(()=>validateAIG3AXManifest({...m,desktop:{sha256:'c'.repeat(64)}}),/MANIFEST/);
 assert.throws(()=>validateAIG3AXManifest({...m,mobile:{...m.mobile,width:900}}),/MANIFEST/);
 assert.throws(()=>validateAIG3AXManifest({...m,machineGeometry:{sourceSha256:'b'.repeat(64)}}),/MANIFEST/);
});
test('JPEG original binary frame dimension, SHA and size gates, never native4K or CNC',async()=>{
 const fake=fixtureJPEG();
 assert.match((await verifyAIG3AXImageBytes(fake)).reason,/BYTE_LENGTH_MISMATCH|INVALID_OR_OVERSIZE/);
 const pin={...AIG3AX_MOBILE_PIN,bytes:fake.length,sha256:await digest(fake)};
 const match=await verifyAIG3AXImageBytes(fake,pin);
 assert.equal(match.ok,true);
 assert.equal(match.originalEncoding,'JPEG_JFIF_DESPITE_PNG_FILENAME');
 assert.equal(match.displayAsRuntime,false);
 assert.equal(match.native4KCertified,false);
 assert.equal(match.machineOutputEnabled,false);
 assert.match((await verifyAIG3AXImageBytes(fake,{...pin,sha256:'0'.repeat(64)})).reason,/SHA256_MISMATCH/);
 assert.match((await verifyAIG3AXImageBytes(fixtureJPEG(900,1536),pin)).reason,/DIMENSIONS_MISMATCH/);
 const bad=fake.slice();bad[0]=0;
 assert.match((await verifyAIG3AXImageBytes(bad,pin)).reason,/JPEG_ORIGINAL_ENCODING_INVALID/);
 const mislabeledPNG=Uint8Array.from([137,80,78,71,...new Array(29).fill(0)]);
 assert.match((await verifyAIG3AXImageBytes(mislabeledPNG,{...pin,bytes:33})).reason,/JPEG_ORIGINAL_ENCODING_INVALID/);
});
test('no bytes, no matching source, no verified physical 3AX model',async()=>{
 const r=await verifyAIG3AXImageBytes(new Uint8Array(0));
 assert.equal(r.ok,false);assert.equal(r.displayAsRuntime,false);
 assert.equal(r.authorityModelVerified,false);assert.equal(r.machineOutputEnabled,false);
});
