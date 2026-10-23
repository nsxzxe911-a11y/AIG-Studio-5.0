/**
 * One real WebGLRenderer -> one temporary 1080x1920 orthographic render target
 * -> exact pixel readback -> original PNG bytes + SHA-256.
 * No generated concept art, fake photograph, DOM enlargement, or 45deg view.
 */
import * as THREE from 'three';
import {fitAIGStage1TrueFrontCamera,auditAIGStage1FrontClip,
 AIG_STAGE1_TRUE_FRONT_SCHEMA}
 from './aig-stage1-true-front-camera.mjs';
const error=s=>{throw Error('AIG_STAGE1_TRUE_FRONT_CAPTURE_'+s)};
export async function captureAIGStage1TrueFrontPhoto({
 renderer,scene,source,width=1080,height=1920
}={}){
 if(!renderer?.isWebGLRenderer||!scene?.isScene||!source)
  error('REAL_SHARED_THREE_RENDERER_SOURCE_REQUIRED');
 const gl=renderer.getContext();
 if(gl.isContextLost?.())error('WEBGL_CONTEXT_LOST');
 const limit=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),
  gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
 if(!Number.isFinite(limit)||Math.max(width,height)>limit)
  error('GPU_CANNOT_RENDER_NATIVE_FRONT_RESOLUTION');
 const front=fitAIGStage1TrueFrontCamera(source,{width,height,
  targetBodyHeight:.82});
 const clip=auditAIGStage1FrontClip(source,front);
 if(!front.numericalFrontalFramingPASS||!clip.frontalGeometryClipPASS)
  error('ACTUAL_BODY_CROPPED_OR_CAMERA_TILTED');
 const box=front.orthographicBox;
 const camera=new THREE.OrthographicCamera(
  box.left,box.right,box.top,box.bottom,box.near,box.far);
 camera.position.set(...front.eye);
 camera.up.set(0,1,0);
 camera.lookAt(new THREE.Vector3(...front.target));
 camera.updateProjectionMatrix();
 // The camera must lie on the -Z line through the human's center.
 if(Math.abs(camera.position.x-front.target[0])>.00000001||
  Math.abs(camera.position.y-front.target[1])>.00000001)
  error('CAMERA_NOT_PERPENDICULAR_TO_BODY');
 const formerTarget=renderer.getRenderTarget();
 const formerViewport=renderer.getViewport(new THREE.Vector4()).clone();
 const formerScissor=renderer.getScissor(new THREE.Vector4()).clone();
 const formerScissorEnabled=renderer.getScissorTest();
 const target=new THREE.WebGLRenderTarget(width,height,{
  type:THREE.UnsignedByteType,format:THREE.RGBAFormat,
  depthBuffer:true,stencilBuffer:false,samples:0,
  colorSpace:THREE.SRGBColorSpace
 });
 let pixels;
 try{
  renderer.setRenderTarget(target);
  renderer.setViewport(0,0,width,height);
  renderer.setScissor(0,0,width,height);
  renderer.setScissorTest(false);
  renderer.clear(true,true,true);
  renderer.render(scene,camera);
  pixels=new Uint8Array(width*height*4);
  renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
  if(gl.isContextLost?.())error('WEBGL_CONTEXT_LOST_DURING_READBACK');
 }finally{
  renderer.setRenderTarget(formerTarget);
  renderer.setViewport(formerViewport);
  renderer.setScissor(formerScissor);
  renderer.setScissorTest(formerScissorEnabled);
  target.dispose();
 }
 // A valid dimensions-only PNG may still be blank! Sample actual GPU
 // rendered colors, rejecting a solid background / empty 3D context.
 const shades=new Set();
 for(let y=0;y<height;y+=Math.max(1,Math.floor(height/31)))
  for(let x=0;x<width;x+=Math.max(1,Math.floor(width/25))){
   const i=(y*width+x)*4;
   shades.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);
  }
 if(shades.size<10)error('GPU_FRAME_IS_BLANK_OR_ONLY_BACKGROUND');
 const pngCanvas=document.createElement('canvas');
 pngCanvas.width=width;pngCanvas.height=height;
 const ctx=pngCanvas.getContext('2d');
 if(!ctx)error('PNG_ENCODING_CANVAS_UNAVAILABLE');
 const imageData=new Uint8ClampedArray(pixels.length);
 for(let row=0;row<height;row++){
  const off=(height-row-1)*width*4;
  imageData.set(pixels.subarray(off,off+width*4),row*width*4);
 }
 ctx.putImageData(new ImageData(imageData,width,height),0,0);
 const blob=await new Promise((resolve,reject)=>
  pngCanvas.toBlob(p=>p?resolve(p):
   reject(Error('AIG_STAGE1_TRUE_FRONT_PNG_ENCODING_FAILED')),'image/png'));
 const bytes=await blob.arrayBuffer(),head=new DataView(bytes);
 if(bytes.byteLength<12000||
  head.getUint32(0,false)!==0x89504e47||
  head.getUint32(12,false)!==0x49484452||
  head.getUint32(16,false)!==width||
  head.getUint32(20,false)!==height)
  error('REAL_PNG_IHDR_OR_RENDERED_PIXELS_INVALID');
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const sha=Array.from(new Uint8Array(digest),
  b=>b.toString(16).padStart(2,'0')).join('');
 return Object.freeze({
  schema:AIG_STAGE1_TRUE_FRONT_SCHEMA,
  gender:source.gender,view:'front',
  projection:'orthographic',cameraYawDeg:0,cameraPitchDeg:0,
  cameraRollDeg:0,
  width,height,blob,sha256:sha,sourceHeightMm:source.heightMm,
  actualGPUFramebufferAndPixelsRead:true,
  genuine1080x1920NativePNG:true,
  realVisibleColorCount:shades.size,
  renderResolutionNotAnatomyQuality:true,
  cameraFraming:front,
  sourceXYZClipAudit:clip,
  userAppearanceReviewPASS:false,
  stage1ReleasePASS:false,
  sourceMMGeometryAndOriginalScenePreserved:true
 });
}
