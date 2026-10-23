import {compareAIGReal3DSilhouetteRGBA}
 from './aig-real3d-reference-silhouette.mjs';
const PNG_SIGNATURE=0x89504e47;
export async function compareAIGReal3DReferencePNGs({
 sourcePNG,referencePNG,angle,sourceSHA,width=1080,height=1920
}={}){
 if(!(sourcePNG instanceof Blob)||!(referencePNG instanceof Blob))
  throw Error('SILHOUETTE_BOTH_PNGS_REQUIRED');
 if(referencePNG.size>12500000||sourcePNG.size>12500000||
 referencePNG.size<128||sourcePNG.size<128)
  throw Error('SILHOUETTE_PNG_SIZE_BUDGET');
 const srcBytes=await sourcePNG.arrayBuffer(),refBytes=await referencePNG.arrayBuffer();
 if(new DataView(srcBytes).getUint32(0)!==PNG_SIGNATURE||
 new DataView(refBytes).getUint32(0)!==PNG_SIGNATURE)
  throw Error('SILHOUETTE_PNG_SIGNATURE_INVALID');
 const sha=await crypto.subtle.digest('SHA-256',refBytes);
 const referenceSHA=Array.from(new Uint8Array(sha),x=>x.toString(16).padStart(2,'0')).join('');
 const imgs=await Promise.all([createImageBitmap(sourcePNG),createImageBitmap(referencePNG)]);
 try{
  if(imgs.some(x=>x.width!==width||x.height!==height))
   throw Error('SILHOUETTE_REFERENCE_NATIVE_RESOLUTION_MUST_BE_1080x1920');
  const canvases=imgs.map(img=>{
   const canvas=document.createElement('canvas');
   canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   if(!ctx)throw Error('SILHOUETTE_CANVAS2D_UNAVAILABLE');
   ctx.clearRect(0,0,width,height);
   ctx.drawImage(img,0,0);
   return {canvas,ctx};
  });
  const gpu=canvases[0].ctx.getImageData(0,0,width,height);
  const ref=canvases[1].ctx.getImageData(0,0,width,height);
  const comparison=compareAIGReal3DSilhouetteRGBA({
   sourcePixels:gpu.data,referencePixels:ref.data,
   width,height,angle,modelSHA:sourceSHA,referenceSHA
  });
  const overlay=document.createElement('canvas');overlay.width=width;overlay.height=height;
  const oc=overlay.getContext('2d');
  if(!oc)throw Error('SILHOUETTE_OVERLAY_CANVAS_UNAVAILABLE');
  oc.putImageData(new ImageData(comparison.outputOverlayRGBA,width,height),0,0);
  const overlayPNG=await new Promise((resolve,reject)=>
   overlay.toBlob(b=>b?resolve(b):reject(Error('SILHOUETTE_OVERLAY_ENCODE_FAILED')),'image/png'));
  const overlaySHA=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
   await overlayPNG.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');
  const {outputOverlayRGBA:discard,...diagnostic}=comparison;
  return {diagnostic:{...diagnostic,overlaySHA256:overlaySHA,
   photoSilhouetteAlreadySegmentedByUser:true},overlayPNG};
 }finally{for(const img of imgs)img.close();}
}
