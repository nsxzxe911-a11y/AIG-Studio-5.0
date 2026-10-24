/**
 * Actual GPU snapshot -> diagnostic 2D exact defective edge overlay.
 * This paints only on a NEW 2D Canvas image; 3D source remains unchanged.
 */
import {AIG_NATIVE_DEFECT_PROJECTION_SCHEMA} from './aig-real3d-source-defect-projection.mjs';
const STYLE=Object.freeze({
 OPEN_BOUNDARY:{line:'#7A2E14',inner:'#D8A06B',name:'開放邊'},
 NON_MANIFOLD:{line:'#28170F',inner:'#AB754F',name:'非流形邊'},
 WINDING_CONFLICT:{line:'#5A3F20',inner:'#E0C39D',name:'面片方向錯誤'}
});
export async function createAIGSourceDefectOverlay({sourcePNG,projection}={}){
 if(!(sourcePNG instanceof Blob)||sourcePNG.size<128||
 projection?.schema!==AIG_NATIVE_DEFECT_PROJECTION_SCHEMA||
 !Array.isArray(projection.projectedEdges))
  throw Error('DEFECT_OVERLAY_MISSING_TRUE_GPU_SOURCE_OR_EDGES');
 const img=await createImageBitmap(sourcePNG);
 try{
  if(img.width!==projection.width||img.height!==projection.height)
   throw Error('DEFECT_OVERLAY_CAMERA_SIZE_MISMATCH');
  const canvas=document.createElement('canvas');
  canvas.width=img.width;canvas.height=img.height;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('DEFECT_OVERLAY_2D_CONTEXT_UNAVAILABLE');
  ctx.drawImage(img,0,0);
  ctx.lineCap='round';ctx.lineJoin='round';
  let actuallyDrawable=0;
  const byType={OPEN_BOUNDARY:0,NON_MANIFOLD:0,WINDING_CONFLICT:0};
  const shown=[];
  for(const edge of projection.projectedEdges){
   const sty=STYLE[edge.type];
   if(!sty)throw Error('DEFECT_OVERLAY_UNKNOWN_EDGE_TYPE');
   byType[edge.type]++;
   const {start:a,end:b}=edge;
   if(![a.x,a.y,b.x,b.y].every(Number.isFinite))
    throw Error('DEFECT_OVERLAY_INVALID_COORDINATES');
   // Partially off-screen segments are still clipped naturally by Canvas2D.
   if((a.x<0&&b.x<0)||(a.x>=canvas.width&&b.x>=canvas.width)||
      (a.y<0&&b.y<0)||(a.y>=canvas.height&&b.y>=canvas.height))
    continue;
   ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
   ctx.strokeStyle=sty.line;ctx.lineWidth=9;ctx.stroke();
   ctx.strokeStyle=sty.inner;ctx.lineWidth=4;ctx.stroke();
   const middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   ctx.beginPath();ctx.arc(middle.x,middle.y,5,0,Math.PI*2);
   ctx.fillStyle='#21140E';ctx.fill();
   actuallyDrawable++;
   if(shown.length<24)shown.push({type:edge.type,regionId:edge.regionId,
    x:Math.round(middle.x),y:Math.round(middle.y)});
  }
  // Always label diagnostic status so clear topology is not a fake 'no
  // defect in full body'; this overlay only covers source-marked regions.
  const header=projection.uniqueEvidenceEdges===0?
   '局部來源網格：未偵測到上述異常；非自然人體驗收':
   '局部網格異常 '+projection.uniqueEvidenceEdges+
    ' 條；需人工查修；原始網格未修改';
  ctx.font='bold 24px system-ui';
  const width=Math.min(canvas.width-24,Math.ceil(ctx.measureText(header).width)+30);
  ctx.fillStyle='#D9C3A5';
  ctx.fillRect(12,12,width,43);
  ctx.fillStyle='#24160F';
  ctx.fillText(header,22,41,width-20);
  const png=await new Promise((resolve,reject)=>canvas.toBlob(
   b=>b?resolve(b):reject(Error('DEFECT_OVERLAY_PNG_ENCODING_FAILED')),'image/png'));
  const digest=await crypto.subtle.digest('SHA-256',await png.arrayBuffer());
  const sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  return {
   blob:png,sha256,angle:projection.angle,
   sourceSha256:projection.sourceSha256,
   renderedEdgeCount:actuallyDrawable,
   deduplicatedRawEdgeCount:projection.uniqueEvidenceEdges,
   byType,
   evidenceTruncated:projection.evidenceTruncated,
   zeroLocalAnomaliesIsNotFullBodyClearance:projection.uniqueEvidenceEdges===0,
   sampleProjectedMidpoints:shown,
   originalSourceTrianglesChanged:false,
   diagnosticPixelsOverTrueGPUOnly:true,
   humanVisualApproval:false,
   releasePASS:false
  };
 }finally{img.close();}
}
