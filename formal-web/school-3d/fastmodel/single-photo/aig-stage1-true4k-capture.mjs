/**
 * Actual 4K Stage1 photographic EVIDENCE from the same THREE renderer.
 * Render 1 offscreen frame and read 8,294,400 pixels; no source geometry,
 * existing canvas, active camera, GLB or stored mm data is resized/mutated.
 */
import * as THREE from 'three';
import {fitHumanToView}
 from './aig-stage1-unified-19200-ratio-core.mjs';
import {planAIGStage1True4KOutput,validateAIGStage1RasterResult}
 from './aig-stage1-4k-adaptive-render.mjs';
const fail=s=>{throw Error('AIG_STAGE1_4K_CAPTURE_'+s)};
const supportedView=new Set(['front','profile','rear','quarter45']);
export async function renderAIGStage1True4KPNG({
 renderer,scene,sourceBody,view='front',orientation='landscape',
 currentCamera,deviceMemoryGB=8
}={}){
 if(!renderer?.isWebGLRenderer||!scene?.isScene||
  !currentCamera?.isPerspectiveCamera||!sourceBody||
  !supportedView.has(view))fail('SHARED_WEBGL_SCENE_AND_SOURCE_REQUIRED');
 const gl=renderer.getContext();
 if(gl.isContextLost?.())fail('WEBGL_CONTEXT_LOST');
 const resolution=planAIGStage1True4KOutput({
  orientation,maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE),
  maxRenderbufferSize:gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
  availableMemoryGB:deviceMemoryGB,rendererAvailable:true
 });
 if(!resolution.supportedByReportedLimits)
  fail('GPU_LIMIT_TRUE_4K_BLOCKED_NO_UPSCALE');
 const {width,height}=resolution;
 const plan=fitHumanToView(sourceBody,{
  view,aspect:width/height,
  verticalFovDeg:currentCamera.fov,targetHeight:.82
 });
 if(!plan.framingNumericContractPASS)fail('FULL_BODY_FRAMING_FAILED');
 const shotCamera=currentCamera.clone();
 shotCamera.position.set(...plan.cameraPosition);
 shotCamera.aspect=width/height;
 shotCamera.near=Math.max(.005,plan.cameraDistanceMeters/1000);
 shotCamera.far=Math.max(20,plan.cameraDistanceMeters*8);
 shotCamera.lookAt(new THREE.Vector3(...plan.target));
 shotCamera.updateProjectionMatrix();
 const oldTarget=renderer.getRenderTarget(),
  oldViewport=renderer.getViewport(new THREE.Vector4()).clone(),
  oldScissor=renderer.getScissor(new THREE.Vector4()).clone(),
  oldScissorTest=renderer.getScissorTest();
 // Only one framebuffer is ever created, even for four sequential views.
 const samples=renderer.capabilities.isWebGL2&&
  gl.getParameter(gl.MAX_SAMPLES)>=4?4:0;
 const target=new THREE.WebGLRenderTarget(width,height,{
  type:THREE.UnsignedByteType,format:THREE.RGBAFormat,
  colorSpace:THREE.SRGBColorSpace,
  samples,depthBuffer:true,stencilBuffer:false
 });
 let pixels;
 try{
  renderer.setRenderTarget(target);
  renderer.setViewport(0,0,width,height);
  renderer.setScissor(0,0,width,height);
  renderer.setScissorTest(false);
  renderer.clear(true,true,true);
  renderer.render(scene,shotCamera);
  pixels=new Uint8Array(width*height*4);
  renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
 }finally{
  renderer.setRenderTarget(oldTarget);
  renderer.setViewport(oldViewport);
  renderer.setScissor(oldScissor);
  renderer.setScissorTest(oldScissorTest);
  target.dispose();
 }
 // PNG encoding happens AFTER GPU framebuffer disposal; never hold 4 targets.
 const canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');
 if(!ctx)fail('PNG_CANVAS_UNAVAILABLE');
 const flipped=new Uint8ClampedArray(pixels.length);
 for(let row=0;row<height;row++)
  flipped.set(pixels.subarray(
   (height-row-1)*width*4,(height-row)*width*4),row*width*4);
 ctx.putImageData(new ImageData(flipped,width,height),0,0);
 const blob=await new Promise((resolve,reject)=>{
  canvas.toBlob(b=>b?resolve(b):reject(
   Error('AIG_STAGE1_4K_CAPTURE_PNG_ENCODING_FAILED')),'image/png');
 });
 const bytes=await blob.arrayBuffer();
 const data=new DataView(bytes);
 const pngWidth=data.getUint32(16,false),
  pngHeight=data.getUint32(20,false);
 const evidence=validateAIGStage1RasterResult({
  expectedWidth:width,expectedHeight:height,
  actualWidth:canvas.width,actualHeight:canvas.height,
  actualPNGWidth:pngWidth,actualPNGHeight:pngHeight
 });
 if(!evidence.exactPixelContractPASS||blob.size<50000)
  fail('ACTUAL_TRUE_4K_PNG_BYTES_INVALID');
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 const sha=Array.from(new Uint8Array(hash),
  b=>b.toString(16).padStart(2,'0')).join('');
 return Object.freeze({schema:resolution.schema,blob,sha256:sha,
  width,height,view,orientation,cameraPlan:plan,
  actualImagePNGBytes:blob.size,actualUHDOutput:true,
  originalSceneCameraAndRendererPreserved:true,
  antialiasingSamples:samples,
  actual8MPFramebufferAndReadback:true,
  rasterEvidence:evidence,
  sourceBodyMillimeterDimensionsUnchanged:true,
  photoReferenceLikenessNotApproved:true,
  stage1AppearanceReleasePASS:false});
}
