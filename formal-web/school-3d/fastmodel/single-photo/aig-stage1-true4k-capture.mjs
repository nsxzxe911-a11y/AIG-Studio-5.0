/**
 * Stage1 genuine multi-tier raster output. ONE WebGLRenderer, ONE temporary
 * render target at a time, sequential AUTO resolution selection and retries.
 * Source geometry, joint data, mm precision and active viewport unaffected.
 */
import * as THREE from 'three';
import {fitHumanToView}
 from './aig-stage1-unified-19200-ratio-core.mjs';
import {planAIGStage1ResolutionLadder,verifyAIGStage1ResolutionResult}
 from './aig-stage1-resolution-ladder.mjs';
const fail=s=>{throw Error('AIG_STAGE1_RESOLUTION_CAPTURE_'+s)};
const supportedView=new Set(['front','profile','rear','quarter45']);
const pngHash=async bytes=>{
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),
  b=>b.toString(16).padStart(2,'0')).join('');
};
async function renderOneNativeLevel({renderer,scene,sourceBody,currentCamera,
 view,orientation,level,width,height}){
 const cameraPlan=fitHumanToView(sourceBody,{
  view,aspect:width/height,
  verticalFovDeg:currentCamera.fov,targetHeight:.82
 });
 if(!cameraPlan.framingNumericContractPASS)
  fail('FULL_BODY_CAMERA_FRAMING_FAILED');
 const shotCamera=currentCamera.clone();
 shotCamera.position.set(...cameraPlan.cameraPosition);
 shotCamera.aspect=width/height;
 shotCamera.near=Math.max(.005,cameraPlan.cameraDistanceMeters/1000);
 shotCamera.far=Math.max(20,cameraPlan.cameraDistanceMeters*8);
 shotCamera.lookAt(new THREE.Vector3(...cameraPlan.target));
 shotCamera.updateProjectionMatrix();
 const oldTarget=renderer.getRenderTarget(),
  oldViewport=renderer.getViewport(new THREE.Vector4()).clone(),
  oldScissor=renderer.getScissor(new THREE.Vector4()).clone(),
  oldScissorTest=renderer.getScissorTest();
 let target,buffer;
 try{
  // MSAA=0 to protect low-end GPU memory at native 4K; no fake upscale.
  target=new THREE.WebGLRenderTarget(width,height,{
   type:THREE.UnsignedByteType,format:THREE.RGBAFormat,
   colorSpace:THREE.SRGBColorSpace,samples:0,
   depthBuffer:true,stencilBuffer:false
  });
  renderer.setRenderTarget(target);
  renderer.setViewport(0,0,width,height);
  renderer.setScissor(0,0,width,height);
  renderer.setScissorTest(false);
  renderer.clear(true,true,true);
  renderer.render(scene,shotCamera);
  buffer=new Uint8Array(width*height*4);
  renderer.readRenderTargetPixels(target,0,0,width,height,buffer);
  if(renderer.getContext().isContextLost?.())
   fail('WEBGL_CONTEXT_LOST_DURING_CAPTURE');
 }finally{
  renderer.setRenderTarget(oldTarget);
  renderer.setViewport(oldViewport);
  renderer.setScissor(oldScissor);
  renderer.setScissorTest(oldScissorTest);
  target?.dispose();
 }
 const samples=new Set();
 for(let y=0;y<height;y+=Math.max(1,Math.floor(height/17)))
  for(let x=0;x<width;x+=Math.max(1,Math.floor(width/17))){
   const i=(y*width+x)*4;
   samples.add(buffer[i]+','+buffer[i+1]+','+buffer[i+2]);
  }
 if(samples.size<6)fail('BLANK_GPU_RENDER_TARGET');
 const canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');
 if(!ctx)fail('PNG_CANVAS_UNAVAILABLE');
 const flipped=new Uint8ClampedArray(buffer.length);
 for(let y=0;y<height;y++)
  flipped.set(buffer.subarray((height-y-1)*width*4,(height-y)*width*4),
   y*width*4);
 ctx.putImageData(new ImageData(flipped,width,height),0,0);
 // Readback memory is no longer referenced after PNG encoding.
 const blob=await new Promise((resolve,reject)=>
  canvas.toBlob(x=>x?resolve(x):reject(Error('PNG_ENCODING_FAILED')),'image/png'));
 const data=await blob.arrayBuffer();
 if(blob.size<3000||data.byteLength<24)
  fail('ACTUAL_RENDERED_PNG_EMPTY');
 const head=new DataView(data);
 if(head.getUint32(0,false)!==0x89504e47||
  head.getUint32(12,false)!==0x49484452)
  fail('ACTUAL_PNG_SIGNATURE_INVALID');
 const actualPNGWidth=head.getUint32(16,false);
 const actualPNGHeight=head.getUint32(20,false);
 const pixelProof=verifyAIGStage1ResolutionResult({
  selected:{level,orientation},renderTargetWidth:width,
  renderTargetHeight:height,pngWidth:actualPNGWidth,pngHeight:actualPNGHeight
 });
 if(!pixelProof.authenticResolutionPASS)
  fail('NATIVE_GPU_PNG_PIXEL_CONTRACT_MISMATCH');
 return Object.freeze({
  blob,sha256:await pngHash(data),width,height,
  view,orientation,selectedResolution:level,
  pixelProof,cameraPlan,actualImagePNGBytes:blob.size,
  originalSceneCameraAndRendererPreserved:true,
  oneSharedWebGLRenderer:true,
  actualGPUFramebufferReadback:true,
  sourceMMDimensionsUnchanged:true,
  stage1AppearanceReleasePASS:false
 });
}
export async function renderAIGStage1ResolutionPNG({
 renderer,scene,sourceBody,view='front',orientation='landscape',
 requested='auto',currentCamera,deviceMemoryGB=8
}={}){
 if(!renderer?.isWebGLRenderer||!scene?.isScene||
  !currentCamera?.isPerspectiveCamera||!sourceBody||
  !supportedView.has(view))fail('SHARED_WEBGL_SCENE_AND_SOURCE_REQUIRED');
 const gl=renderer.getContext();
 if(gl.isContextLost?.())fail('WEBGL_CONTEXT_LOST');
 const decision=planAIGStage1ResolutionLadder({
  requested,orientation,
  maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE),
  maxRenderbufferSize:gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
  deviceMemoryGB,rendererAvailable:true
 });
 if(!decision.isSupported)
  fail('NO_SUPPORTED_NATIVE_RESOLUTION_'+requested.toUpperCase());
 const failures=[];
 for(const candidate of decision.levels){
  if(!candidate.supportedByReportedLimits)continue;
  if(gl.isContextLost?.())fail('WEBGL_CONTEXT_LOST');
  try{
   const record=await renderOneNativeLevel({
    renderer,scene,sourceBody,currentCamera,view,orientation,
    level:candidate.level,width:candidate.width,height:candidate.height
   });
   return Object.freeze({...record,
    schema:decision.schema,requestedResolution:requested,
    actuallyDowngraded:requested==='auto'&&candidate.level!=='4k',
    gpuFailedHigherLevels:Object.freeze(failures),
    noLowerTierEverMislabelledAs4K:true});
  }catch(e){
   failures.push({level:candidate.level,reason:String(e?.message||e)});
   if(requested!=='auto')throw e;
  }
 }
 fail('ALL_NATIVE_RESOLUTION_LEVELS_FAILED_'+
  failures.map(x=>x.level).join('_'));
}
/** Existing explicit 4K entrypoint remains strict; never auto downgrades. */
export async function renderAIGStage1True4KPNG(args={}){
 const result=await renderAIGStage1ResolutionPNG({...args,requested:'4k'});
 return Object.freeze({...result,
  actualUHDOutput:true,actual8MPFramebufferAndReadback:true,
  rasterEvidence:{exactPixelContractPASS:result.pixelProof.authenticResolutionPASS,
   verifiedPNGDimensions:[result.width,result.height]},
  antialiasingSamples:0,photoReferenceLikenessNotApproved:true
 });
}
