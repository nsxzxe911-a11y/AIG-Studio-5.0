import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {AIG54_SCHEMA,digestAIG54,verifyAIG54NativeChain} from '../aig-native-source-5-4.mjs';
import {compileAIG53Evidence} from '../aig-unified-gate-5-3.mjs';
const source='b'.repeat(64),id='e'.repeat(32),code='d'.repeat(64);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function nativeGLB(sourceHash=source,{rigged=false,approved=false}={}){
 const doc={asset:{version:'2.0',generator:'AIG FastModel 4.0 self-developed scaffold'},
  extras:{sourceImageSHA256:sourceHash,structuralDraftOnly:true,
   rigged,releaseAllowed:false,realHeroineGLBApproved:approved}};
 let encoded=new TextEncoder().encode(JSON.stringify(doc));
 const n=(encoded.length+3)&~3;
 const bytes=new Uint8Array(20+n);
 bytes.fill(32,20);bytes.set(encoded,20);
 const v=new DataView(bytes.buffer);
 v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);
 v.setUint32(8,bytes.length,true);v.setUint32(12,n,true);
 v.setUint32(16,0x4e4f534a,true);
 return bytes;
}
function manifest(glb){
 return {schema:AIG54_SCHEMA,status:'SOURCE_CHAIN_INTEGRITY_PASS_TECHNICAL_DRAFT_ONLY',
  sourceImageSHA256:source,modelGLBSHA256:sha(glb),jobId:id,
  scaffoldSHA256:'a'.repeat(64),nativeEngineSourceSHA256AtBuild:code,
  verificationPerformedOnPersistedSourceBytes:true,
  verificationPerformedOnPersistedGLBBytes:true,
  sameJobSourceToGLBVerified:true,zeroCreditNativeOnly:true,
  generatorHasHumanoidRig:false,releaseAllowed:false};
}
test('5.4 browser genuinely SHA-rehashes the downloaded glTF2 technical draft bytes',async()=>{
 const glb=nativeGLB(),m=manifest(glb);
 const result=await verifyAIG54NativeChain({
  manifest:m,glbBytes:glb.buffer,expectedImageSHA256:source,
  expectedJobId:id,cryptoImpl:webcrypto
 });
 assert.equal(result.modelGLBSHA256,sha(glb));
 assert.equal(result.outcome,'NATIVE_SOURCE_INTEGRITY_ONLY');
 assert.equal(result.clientDownloadedGLBHashVerified,true);
 assert.equal(result.nativeUnriggedTechnicalDraftOnly,true);
 assert.equal(result.only4_0InferredVolumeMesh,true);
 assert.equal(result.formalHeroineApproved,false);
 assert.equal(result.releaseAllowed,false);
 assert.equal(await digestAIG54(glb,{cryptoImpl:webcrypto}),sha(glb));
});
test('5.4 wrong downloaded SHA, input SHA, job id, embedded SHA or fake rig must BLOCK',async()=>{
 const glb=nativeGLB(),m=manifest(glb);
 const opt={manifest:m,glbBytes:glb,expectedImageSHA256:source,expectedJobId:id,cryptoImpl:webcrypto};
 await assert.rejects(verifyAIG54NativeChain({...opt,expectedJobId:'f'.repeat(32)}),/MANIFEST_MISMATCH/);
 await assert.rejects(verifyAIG54NativeChain({...opt,expectedImageSHA256:'a'.repeat(64)}),/MANIFEST_MISMATCH/);
 await assert.rejects(verifyAIG54NativeChain({...opt,glbBytes:nativeGLB('c'.repeat(64))}),/DOWNLOADED_MODEL_SHA_MISMATCH/);
 await assert.rejects(verifyAIG54NativeChain({...opt,manifest:{...m,releaseAllowed:true}}),/MANIFEST_MISMATCH/);
 const fakeRig=nativeGLB(source,{rigged:true});
 await assert.rejects(verifyAIG54NativeChain({...opt,glbBytes:fakeRig,manifest:manifest(fakeRig)}),/NOT_UNRIGGED_TECHNICAL_DRAFT/);
 const fakeApproved=nativeGLB(source,{approved:true});
 await assert.rejects(verifyAIG54NativeChain({...opt,glbBytes:fakeApproved,manifest:manifest(fakeApproved)}),/NOT_UNRIGGED_TECHNICAL_DRAFT/);
 const corrupt=new Uint8Array(glb);corrupt[0]=0;
 await assert.rejects(verifyAIG54NativeChain({...opt,glbBytes:corrupt,manifest:manifest(corrupt)}),/GLB_HEADER_MISMATCH/);
});
test('5.4 source integrity cannot circumvent the 5.3 required full-body, heroine and native FPS release gates',()=>{
 const report=compileAIG53Evidence({nativeEvidence54:{
  ...manifest(nativeGLB()),releaseAllowed:false
 }});
 assert.equal(report.outcome,'BLOCKED');
 assert.equal(report.passedChecks,0);
 assert.equal(report.releaseAllowed,false);
 assert.equal(report.checks.find(x=>x.id==='GLB_SOURCE_PROVENANCE').status,'BLOCKED');
 assert.equal(report.checks.find(x=>x.id==='FULLBODY_SKIN_5_0').status,'BLOCKED');
});
test('5.4 UI controls and persisted nonpaid local backend route are real and uniquely wired',()=>{
 const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const html=read('index.html'),app=read('app.mjs'),server=read('server.py'),
  jobs=read('aig_native4_jobs.py'),audit=read('aig_native_provenance_5_4.py');
 for(const id of ['aig54-check','aig54-download','aig54-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.ok(app.includes("$('aig54-check').addEventListener('click'"));
 assert.ok(app.includes("$('aig54-download').addEventListener('click'"));
 assert.ok(app.includes('verifyAIG54NativeChain({'));
 assert.ok(app.includes("aig54NativeJobId=job.id"));
 assert.ok(app.includes('sha256Bytes(original)'));
 assert.ok(app.includes("aig53Invalidate('已取得新的 5.4"));
 assert.ok(server.includes("from aig_native_provenance_5_4 import audit_native_aig4_job"));
 assert.ok(server.includes("if provenance:"));
 assert.ok(jobs.includes("'nativeEngineSourceSHA256':digest("));
 assert.ok(audit.includes("source_glb_extras(model)"));
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('generateVoiceBatch('));
});
