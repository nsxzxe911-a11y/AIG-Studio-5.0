/**
 * Screenshot annotation is a separate RGBA canvas pass placed OVER
 * a real native GPU render capture. It never edits WebGL source pixels,
 * modifies native XYZ mesh, or asserts human anatomy/liveness.
 */
import {AIG_NATIVE_LANDMARK_PROJECTION_SCHEMA}
 from './aig-real3d-native-anatomy-projection.mjs';
const SHA=/^[a-f0-9]{64}$/i;
const LABELS={
 headTop:'頭頂',chin:'下巴',noseTip:'鼻尖',neckBase:'頸根',
 leftShoulder:'左肩',rightShoulder:'右肩',
 leftElbow:'左肘',rightElbow:'右肘',leftWrist:'左腕',rightWrist:'右腕',
 leftThumbTip:'左拇指',rightThumbTip:'右拇指',
 leftIndexTip:'左食指',rightIndexTip:'右食指',
 pelvis:'骨盆參考',leftKnee:'左膝',rightKnee:'右膝',
 leftHeel:'左腳跟',rightHeel:'右腳跟',leftToe:'左腳趾',rightToe:'右腳趾'
};
export async function createAIGNativeAnatomyAnnotation({
 sourcePNG,projection
}={}){
 if(!(sourcePNG instanceof Blob)||sourcePNG.size<128||
 projection?.schema!==AIG_NATIVE_LANDMARK_PROJECTION_SCHEMA||
 projection?.projectedLabelCount!==21||
 !SHA.test(projection.sourceSha256??''))
  throw Error('ANATOMY_ANNOTATION_SOURCE_OR_MARKERS_INVALID');
 const img=await createImageBitmap(sourcePNG);
 try{
  if(img.width!==projection.width||img.height!==projection.height)
   throw Error('ANATOMY_ANNOTATION_CAPTURE_MISMATCH');
  const canvas=document.createElement('canvas');
  canvas.width=img.width;canvas.height=img.height;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('ANATOMY_ANNOTATION_CANVAS_UNAVAILABLE');
  ctx.drawImage(img,0,0);
  const inBounds=Object.entries(projection.markerPixelPositions).filter(
   ([name,p])=>p.onCanvas&&LABELS[name]);
  for(const [id,p] of inBounds){
   const r=Math.max(4,Math.round(img.width/180));
   ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);
   ctx.fillStyle='#17110E';ctx.fill();
   ctx.lineWidth=2;ctx.strokeStyle='#C89A74';ctx.stroke();
   ctx.font='600 '+Math.max(13,Math.round(img.width/56))+'px system-ui';
   const text=LABELS[id],measure=ctx.measureText(text).width;
   const tx=Math.min(img.width-measure-10,Math.max(6,p.x+10));
   const ty=Math.max(26,Math.min(img.height-10,p.y-8));
   ctx.fillStyle='#C4BEB3';ctx.fillRect(tx-3,ty-20,measure+6,25);
   ctx.fillStyle='#17110E';ctx.fillText(text,tx,ty);
  }
  const png=await new Promise((resolve,reject)=>canvas.toBlob(
   b=>b?resolve(b):reject(Error('ANATOMY_ANNOTATION_PNG_FAILED')),'image/png'));
  const bytes=await png.arrayBuffer();
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  return {
   blob:png,sha256,sourceSha256:projection.sourceSha256,
   angle:projection.angle,width:projection.width,height:projection.height,
   projectedLandmarks:projection.projectedLabelCount,
   actuallyVisibleLandmarks:inBounds.length,
   original3DGeometryUnchanged:true,
   type:'CANVAS2D_ANNOTATION_OVER_REAL_GPU_PNG',
   humanAnatomyNotAutomated:true,
   humanAppearanceApproved:false
  };
 }finally{img.close();}
}
