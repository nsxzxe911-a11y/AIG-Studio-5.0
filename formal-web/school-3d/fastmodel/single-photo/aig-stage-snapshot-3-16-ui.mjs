/**
 * Real3D 3.16 in-app image capture, for real local USER source, not
 * CI's synthetic fixture. Reuses ONE existing renderer via temporary
 * render target, and shows unedited front/profile/rear WebGL pixels.
 * No network, no uploaded private source, no fake photo billboard.
 */
import * as THREE from 'three';
import {planAIG315HeroineCamera}
 from './aig-heroine-render-review-3-15.mjs';
const fail=s=>{throw Error('AIG316_CAPTURE_'+s)};
const toCanvas=(rgba,w,h)=>{
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d',{willReadFrequently:false});
 const flipped=new Uint8ClampedArray(rgba.length);
 for(let y=0;y<h;y++){
  const src=(h-1-y)*w*4,dst=y*w*4;
  flipped.set(rgba.subarray(src,src+w*4),dst);
 }
 ctx.putImageData(new ImageData(flipped,w,h),0,0);
 return c;
};
export function captureAIG316RealWebGLViews({
 viewer,sourceBodyPositions,sourceSHA,
 width=360,height=600,stage='technical',
 actuallyUserApproved=false
}={}){
 if(!viewer?.renderer||!viewer.scene||!viewer.camera||
  !(sourceBodyPositions instanceof Float32Array)||
  sourceBodyPositions.length<9||!sourceBodyPositions.every(Number.isFinite)||
  typeof sourceSHA!=='string'||sourceSHA.length<16||
  !Number.isInteger(width)||!Number.isInteger(height)||
  width<160||height<200||width>1024||height>1536||
  viewer.renderer.getContext()?.isContextLost?.())
  fail('REQUIRES_REAL_SOURCE_AND_WEBGL_RENDERER');
 if(viewer.movieMode||viewer.reviewBusy)fail('BUSY_RECORDING_OR_REVIEW');
 const renderer=viewer.renderer,original=renderer.getRenderTarget();
 const camera=viewer.camera.clone();
 camera.aspect=width/height;
 const target=new THREE.WebGLRenderTarget(width,height,{
  type:THREE.UnsignedByteType,format:THREE.RGBAFormat,
  depthBuffer:true,stencilBuffer:false
 });
 const images=[];
 try{
  for(const dir of ['front','profile','rear']){
   const plan=planAIG315HeroineCamera({
    bodyPositions:sourceBodyPositions,view:dir,
    fieldOfViewDegrees:camera.fov,aspect:camera.aspect
   });
   camera.position.set(...plan.position);
   camera.near=plan.near;camera.far=plan.far;
   camera.updateProjectionMatrix();
   camera.lookAt(new THREE.Vector3(...plan.target));
   renderer.setRenderTarget(target);
   renderer.clear(true,true,true);
   renderer.render(viewer.scene,camera);
   const buffer=new Uint8Array(width*height*4);
   renderer.readRenderTargetPixels(target,0,0,width,height,buffer);
   const canvas=toCanvas(buffer,width,height),url=canvas.toDataURL('image/png');
   // Colour variance guard detects fully blank WebGL render targets.
   const swatches=new Set();
   for(let y=0;y<height;y+=31)for(let x=0;x<width;x+=31){
    const i=(y*width+x)*4;
    swatches.add(buffer[i]+'-'+buffer[i+1]+'-'+buffer[i+2]);
   }
   if(swatches.size<8)fail('BLANK_OR_SINGLE_COLOUR_RENDER');
   images.push(Object.freeze({dir,url,width,height,
    distinctSampleColours:swatches.size,realWebGLRenderTarget:true}));
  }
  if(new Set(images.map(x=>x.url)).size!==3)
   fail('THREE_IDENTICAL_VIEW_IMAGES');
  return Object.freeze({schema:'AIG_REAL3D_3_16_REAL_USER_CANVAS_SNAPSHOTS',
   stage,sourceSHA,
   images,temporaryRenderTargetOnly:true,usedExistingWebGLRenderer:true,
   originalSceneAndCameraUnchanged:true,
   privatePhotosUploadedToGitHub:false,
   actualHeroineVisualAppearanceApproved:actuallyUserApproved,
   nextStageBlockedWithoutUserVisualReview:true});
 }finally{
  renderer.setRenderTarget(original);
  target.dispose();
 }
}
export function installAIG316SnapshotGallery({onCapture}={}){
 if(typeof onCapture!=='function')fail('CAPTURE_CALLBACK_REQUIRED');
 const gallery=document.getElementById('scan316-gallery'),
  status=document.getElementById('scan316-status'),
  button=document.getElementById('scan316-capture');
 if(!gallery||!status||!button)fail('FORMAL_GALLERY_REQUIRED');
 const snapshots=[];
 const capture=(stage)=>{
  let result;
  try{result=onCapture(stage)}catch(e){
   status.textContent='快照 FAIL：'+String(e.message||e)+
    '。本階不可驗收，上一組快照保留。';
   return null;
  }
  const block=document.createElement('section');
  block.style.cssText='margin:12px 0;padding:9px;border:1px solid #315167;border-radius:8px';
  const heading=document.createElement('strong');
  heading.textContent='階段 '+result.stage+
   '｜來源 SHA '+result.sourceSHA.slice(0,12)+
   '…｜正式外觀：待人工驗收';
  block.append(heading);
  const panel=document.createElement('div');
  panel.style.cssText='display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:8px';
  for(const img of result.images){
   const figure=document.createElement('figure');
   figure.style.cssText='margin:0;min-width:0';
   const el=document.createElement('img');
   el.src=img.url;el.alt=result.stage+' 來源真 3D '+img.dir+' 視角';
   el.style.cssText='width:100%;height:auto;display:block;border-radius:5px';
   const caption=document.createElement('figcaption');
   caption.style.cssText='font-size:11px;text-align:center;color:#add9e9';
   caption.textContent=img.dir==='front'?'正面真 3D':
    img.dir==='profile'?'側面真 3D':'背面真 3D';
   figure.append(el,caption);panel.append(figure);
  }
  block.append(panel);
  // Newest stage first, no prior stage discarded by scene changes.
  gallery.prepend(block);
  snapshots.unshift({stage:result.stage,sourceSHA:result.sourceSHA});
  status.textContent='已從目前真正 WebGL 捕捉 '+result.images.length+
   ' 張不同視角｜階段 '+result.stage+
   '。技術快照不等於外觀合格，請先目視驗收。';
  return result;
 };
 button.addEventListener('click',()=>capture('manual-review'));
 return Object.freeze({capture,list:()=>snapshots.slice()});
}
