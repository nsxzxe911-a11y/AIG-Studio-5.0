/** FastModel 3.0 — review real 4×4 actual animation frame contact sheets.
 * Source GLB + AnimationMixer are required; there is NO synthesized combat clip.
 */
export const TIMELINE_FRACTIONS=Object.freeze([0,.25,.5,.75]);
export const TIMELINE_VIEW_KEYS=Object.freeze(['positive-z','positive-x','negative-z','negative-x']);
const exactKeys=a=>Array.isArray(a)&&a.length===4&&TIMELINE_VIEW_KEYS.every((k,i)=>a[i]?.key===k);
export function validateTimelineSamples(samples,{clipName,sourceSha256}={}){
 if(!/^[0-9a-f]{64}$/i.test(sourceSha256||''))throw Error('TIMELINE_SOURCE_SHA_REQUIRED');
 if(typeof clipName!=='string'||!clipName.trim())throw Error('TIMELINE_ACTION_REQUIRED');
 if(!Array.isArray(samples)||samples.length!==TIMELINE_FRACTIONS.length)throw Error('TIMELINE_FOUR_POSES_REQUIRED');
 return samples.map((s,i)=>{
  if(s.fraction!==TIMELINE_FRACTIONS[i]||!exactKeys(s.views)||!Number.isFinite(s.timeSeconds)||s.timeSeconds<0||
     !s.image||s.image.type!=='image/png'||!s.audit)throw Error('TIMELINE_REAL_POSE_EVIDENCE_INVALID');
  return {
   fraction:s.fraction,timeSeconds:s.timeSeconds,
   viewKeys:s.views.map(v=>v.key),clipName:s.clipName,
   inspectedTriangles:s.audit.checkedTriangles,
   duplicateSurfacePairs:s.audit.coincidentTrianglePairs,
   collapsedTriangles:s.audit.degenerateTriangles,
   badRigWeights:s.audit.skinningVertexIssues,
   possibleHairNeckOverlap:s.audit.hairNeckBoxOverlap,
   anatomyTagsAvailable:s.audit.anatomyTagsAvailable,
   incomplete:s.audit.incomplete,
   actualCollisionFreeProven:false
  };
 });
}
export function timelineEvidenceManifest({sourceSha256,actionSha256=null,clipName,samples}={}){
 if(actionSha256!==null&&!/^[0-9a-f]{64}$/i.test(actionSha256))throw Error('TIMELINE_ACTION_SHA_INVALID');
 const rows=validateTimelineSamples(samples,{clipName,sourceSha256});
 if(rows.some(row=>row.clipName!==clipName))throw Error('TIMELINE_CLIP_CHANGED');
 return {
  schema:'AIG_FASTMODEL_3_0_REAL_ANIMATED_16_FRAME_QA',
  sourceSha256:sourceSha256.toLowerCase(),actionSha256:(actionSha256||sourceSha256).toLowerCase(),
  externalActionGLBUsed:!!actionSha256&&actionSha256.toLowerCase()!==sourceSha256.toLowerCase(),
  selectedClipName:clipName,
  sampleCount:rows.length,viewCount:rows.length*4,
  fractions:[...TIMELINE_FRACTIONS],worldAxisViews:[...TIMELINE_VIEW_KEYS],
  rows,visualEvidenceType:'ACTUAL_GLTF_ANIMATION_AND_WEBGL_CAPTURE',
  visualHumanReviewPassed:false,approvedHeroineGLBConfirmed:false,
  collisionExactVerified:false,neckWeldVerified:false,
  approvedFightChoreographyPresent:false,nativeGpu60FPSVerified:false,
  acceptance:'BLOCKED_PENDING_REAL_HEROINE_VISUAL_AND_DEVICE_TEST',
  disclaimer:'Captures only 4 sampled time positions and 4 world-axis views each. A clip can be walk, idle, or fight; clip naming and frame count cannot prove a fight sequence or collision safety. Hair alpha and actual GPU Z fighting require visual/device inspection.'
 };
}
/** Compose already-rendered pose sheets (each 2×2) into 4 columns × 4 rows.
 * User's browser creates the image; nothing is fabricated server-side.
 */
export async function composeTimelineImage(samples,{imageDecoder,canvasFactory}={}){
 if(!Array.isArray(samples)||samples.length!==4)throw Error('TIMELINE_SHEETS_REQUIRED');
 if(typeof imageDecoder!=='function'||typeof canvasFactory!=='function')throw Error('TIMELINE_CANVAS_UNAVAILABLE');
 const cellW=420,cellH=300,canvas=canvasFactory();
 canvas.width=cellW*4;canvas.height=cellH*4;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('TIMELINE_CANVAS_UNAVAILABLE');
 ctx.fillStyle='#020407';ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let row=0;row<4;row++){
  const decoded=await imageDecoder(samples[row].image);
  try{
   if(!decoded?.width||!decoded?.height||decoded.width<4||decoded.height<4)throw Error('TIMELINE_REAL_IMAGE_INVALID');
   const srcW=decoded.width/2,srcH=decoded.height/2;
   for(let column=0;column<4;column++){
    const srcX=(column%2)*srcW,srcY=Math.floor(column/2)*srcH;
    const x=column*cellW,y=row*cellH;
    ctx.drawImage(decoded,srcX,srcY,srcW,srcH,x,y,cellW,cellH);
    ctx.fillStyle='rgba(2,4,7,.9)';ctx.fillRect(x+5,y+cellH-28,cellW-10,24);
    ctx.fillStyle='#f2e9fa';ctx.font='bold 12px sans-serif';
    const name=TIMELINE_VIEW_KEYS[column].replace('positive','+').replace('negative','-');
    ctx.fillText(Math.round(samples[row].fraction*100)+'% · '+name,x+14,y+cellH-12);
   }
  }finally{decoded.close?.();}
 }
 const image=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('TIMELINE_PNG_FAILED')),'image/png'));
 return {image,width:canvas.width,height:canvas.height,frames:16,actualSourceFrames:true};
}
