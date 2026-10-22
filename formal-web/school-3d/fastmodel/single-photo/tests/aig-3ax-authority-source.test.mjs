import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {AIG3AX_MOBILE_PIN,validateAIG3AXManifest,verifyAIG3AXPNGBytes}
 from '../../../../3ax-authority-source-gate.mjs';
const {subtle}=webcrypto;
const fakePNG=(w=864,h=1536)=>{
 const buf=new Uint8Array(33),view=new DataView(buf.buffer);
 buf.set([137,80,78,71,13,10,26,10]);
 view.setUint32(8,13);buf.set([73,72,68,82],12);
 view.setUint32(16,w);view.setUint32(20,h);
 return buf;
};
const digest=async bytes=>[...new Uint8Array(await subtle.digest('SHA-256',bytes))]
 .map(x=>x.toString(16).padStart(2,'0')).join('');
test('mobile 3AX source SHA and dimensions are independently pinned',()=>{
 assert.equal(AIG3AX_MOBILE_PIN.authorityId,'AIGII-MOBILE-3AX-CURRENT-20261016');
 assert.equal(AIG3AX_MOBILE_PIN.width,864);
 assert.equal(AIG3AX_MOBILE_PIN.height,1536);
 assert.equal(AIG3AX_MOBILE_PIN.bytes,431467);
 assert.equal(AIG3AX_MOBILE_PIN.sha256,'4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28');
});
test('only properly declared approved mobile file identity and fail-closed desktop qualify',()=>{
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
test('incorrect PNG bytes, forged metadata and SHA mismatch all BLOCK',async()=>{
 const fake=fakePNG();
 assert.match((await verifyAIG3AXPNGBytes(fake)).reason,/BYTE_LENGTH_MISMATCH/);
 const pin={...AIG3AX_MOBILE_PIN,bytes:fake.length,sha256:await digest(fake)};
 const match=await verifyAIG3AXPNGBytes(fake,pin);
 // Byte-format check only; browser must additionally decode PNG before showing.
 assert.equal(match.ok,true);
 assert.equal(match.displayAsRuntime,false);
 assert.equal(match.native4KCertified,false);
 assert.equal(match.machineOutputEnabled,false);
 assert.match((await verifyAIG3AXPNGBytes(fake,{...pin,sha256:'0'.repeat(64)})).reason,/SHA256_MISMATCH/);
 assert.match((await verifyAIG3AXPNGBytes(fakePNG(900,1536),pin)).reason,/DIMENSIONS_MISMATCH/);
 const corrupt=fake.slice();corrupt[0]=0;
 assert.match((await verifyAIG3AXPNGBytes(corrupt,pin)).reason,/SIGNATURE_MISMATCH/);
});
test('never allow a non image payload, and never certify a desktop or physical CNC rig',async()=>{
 const x=await verifyAIG3AXPNGBytes(new Uint8Array(0));
 assert.equal(x.ok,false);assert.equal(x.displayAsRuntime,false);
 assert.equal(x.authorityModelVerified,false);
 assert.equal(x.machineOutputEnabled,false);
});
