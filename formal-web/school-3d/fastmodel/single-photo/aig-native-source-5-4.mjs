/** AIG 5.4 independent browser byte audit of the native technical model.
 * An authenticated backend must produce the manifest; arbitrary JSON is NOT
 * proof of who built a model, identity, rigging quality, or release authority.
 */
export const AIG54_SCHEMA='AIG_FASTMODEL_5_4_NATIVE_SOURCE_CHAIN_TECHNICAL_ONLY';
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
export async function digestAIG54(bytes,{cryptoImpl=globalThis.crypto}={}){
 if(!(bytes instanceof ArrayBuffer)&&!(bytes instanceof Uint8Array))throw Error('AIG54_ARRAYBUFFER_REQUIRED');
 if(!cryptoImpl?.subtle?.digest)throw Error('AIG54_SHA256_UNAVAILABLE');
 const input=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(input.byteLength<20||input.byteLength>40*1024*1024)throw Error('AIG54_BINARY_SIZE_INVALID');
 const result=new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',input));
 return Array.from(result,x=>x.toString(16).padStart(2,'0')).join('');
}
function sourceExtras(bytes){
 const a=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(a.length<32||a.length>40*1024*1024)throw Error('AIG54_GLB_BINARY_INVALID');
 const view=new DataView(a.buffer,a.byteOffset,a.byteLength);
 if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||
    view.getUint32(8,true)!==a.length||view.getUint32(16,true)!==0x4e4f534a)
  throw Error('AIG54_GLB_HEADER_MISMATCH');
 const jsonLength=view.getUint32(12,true);
 if(jsonLength<8||jsonLength>4*1024*1024||jsonLength>a.length-20)
  throw Error('AIG54_GLB_JSON_LENGTH_INVALID');
 const j=JSON.parse(new TextDecoder().decode(a.subarray(20,20+jsonLength)));
 if(j.asset?.generator!=='AIG FastModel 4.0 self-developed scaffold')
  throw Error('AIG54_GLB_GENERATOR_NOT_NATIVE');
 const extras=j.extras||{};
 if(extras.structuralDraftOnly!==true||extras.rigged!==false||
    extras.releaseAllowed!==false||extras.realHeroineGLBApproved!==false)
  throw Error('AIG54_NOT_UNRIGGED_TECHNICAL_DRAFT');
 return extras;
}
export async function verifyAIG54NativeChain({manifest,glbBytes,expectedImageSHA256,
 expectedJobId,cryptoImpl=globalThis.crypto}={}){
 if(manifest?.schema!==AIG54_SCHEMA||
    manifest.status!=='SOURCE_CHAIN_INTEGRITY_PASS_TECHNICAL_DRAFT_ONLY'||
    !hex(expectedImageSHA256)||manifest.sourceImageSHA256!==expectedImageSHA256||
    typeof expectedJobId!=='string'||!/^[a-f0-9]{32}$/.test(expectedJobId)||
    manifest.jobId!==expectedJobId||!hex(manifest.modelGLBSHA256)||
    !hex(manifest.nativeEngineSourceSHA256AtBuild)||
    !hex(manifest.scaffoldSHA256)||manifest.sameJobSourceToGLBVerified!==true||
    manifest.verificationPerformedOnPersistedSourceBytes!==true||
    manifest.verificationPerformedOnPersistedGLBBytes!==true||
    manifest.zeroCreditNativeOnly!==true||manifest.generatorHasHumanoidRig!==false||
    manifest.releaseAllowed!==false)
  throw Error('AIG54_SOURCE_MANIFEST_MISMATCH');
 const hash=await digestAIG54(glbBytes,{cryptoImpl});
 if(hash!==manifest.modelGLBSHA256)throw Error('AIG54_DOWNLOADED_MODEL_SHA_MISMATCH');
 const extras=sourceExtras(glbBytes);
 if(extras.sourceImageSHA256!==expectedImageSHA256)
  throw Error('AIG54_GLB_EMBEDDED_IMAGE_SHA_MISMATCH');
 return {schema:AIG54_SCHEMA,jobId:expectedJobId,sourceImageSHA256:expectedImageSHA256,
  nativeEngineSourceSHA256AtBuild:manifest.nativeEngineSourceSHA256AtBuild,
  engineSourceNowMatchesBuild:manifest.engineSourceNowMatchesBuild,
  modelGLBSHA256:hash,scaffoldSHA256:manifest.scaffoldSHA256,
  serverPersistedOriginalScaffoldAndGLBHashVerified:true,
  clientDownloadedGLBHashVerified:true,
  nativeUnriggedTechnicalDraftOnly:true,
  actualGLBAndSourceByteDigestLinked:true,
  only4_0InferredVolumeMesh:true,
  identityMatchUnverified:true,characterSourcePhotoSHAAloneInsufficient:true,
  5_0FullBodySkinNotVerified:true,
  hairBodyCollisionNotVerified:true,
  noPaidThirdPartyUsed:true,formalHeroineApproved:false,
  releaseAllowed:false,outcome:'NATIVE_SOURCE_INTEGRITY_ONLY'};
}
