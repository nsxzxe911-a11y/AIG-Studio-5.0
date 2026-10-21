/** AIG FastModel 6.6: CPU-only border-connected alpha and bounded local
 * face-patch deformation. This is 2D image warping, NOT a detected skeleton,
 * tracked facial landmarks, speech visemes or true face reconstruction.
 */
export const AIG66_SCHEMA='AIG_FASTMODEL_6_6_SOURCE_PIXEL_LOCAL_PORTRAIT';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function imageCanvas(doc,image,maxDim=850){
 if(!doc?.createElement||!image||image.width<32||image.height<32)
  throw Error('AIG66_VALID_IMAGE_REQUIRED');
 const c=doc.createElement('canvas'),s=Math.min(1,maxDim/Math.max(image.width,image.height));
 c.width=Math.max(32,Math.round(image.width*s));
 c.height=Math.max(32,Math.round(image.height*s));
 const cx=c.getContext('2d',{willReadFrequently:true});
 if(!cx)throw Error('AIG66_2D_CONTEXT_REQUIRED');
 cx.drawImage(image,0,0,c.width,c.height);
 return {canvas:c,context:cx};
}
function median(array){
 array.sort((a,b)=>a-b);
 return array[Math.floor(array.length/2)]||0;
}
/** Only color connected TO an outer edge may be removed. Unlike 6.5 global
 * RGB keying, an isolated white shirt is never erased because it is white.
 * Reject non-uniform border rather than pretending to segment scenery.
 */
export function segmentAIG66BorderRGBA({width:w,height:h,data}){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<32||h<32||
  w*h>1000000||data?.length!==w*h*4)throw Error('AIG66_RGBA_BUDGET');
 const src=data,corner=[];
 for(const [ox,oy] of [[0,0],[w-1,0],[0,h-1],[w-1,h-1]]){
  for(let dy=0;dy<Math.min(7,h);dy++)for(let dx=0;dx<Math.min(7,w);dx++){
   const x=clamp(ox+(ox===0?dx:-dx),0,w-1),
    y=clamp(oy+(oy===0?dy:-dy),0,h-1),i=(y*w+x)*4;
   if(src[i+3]>230)corner.push([src[i],src[i+1],src[i+2]]);
  }
 }
 const back=[0,1,2].map(k=>median(corner.map(p=>p[k])));
 const spread=corner.length?corner.filter(c=>Math.hypot(
  c[0]-back[0],c[1]-back[1],c[2]-back[2])>48).length/corner.length:1;
 let transparent=0;
 for(let i=3;i<src.length;i+=4)if(src[i]<120)transparent++;
 const alphaSource=transparent>w*h*.015;
 const visited=new Uint8Array(w*h),queue=new Int32Array(w*h);
 let head=0,tail=0;
 const eligible=p=>{
  const i=p*4;
  return alphaSource?src[i+3]<128:
   Math.hypot(src[i]-back[0],src[i+1]-back[1],src[i+2]-back[2])<43;
 };
 const push=p=>{
  if(!visited[p]&&eligible(p)){visited[p]=1;queue[tail++]=p;}
 };
 if(!alphaSource&&spread>.30)return {
  valid:false,reason:'NONUNIFORM_BORDER_CANNOT_SEGMENT',
  backgroundRGB:back,foreground:null,background:null,subjectBox:null,
  method:'NO_BORDER_CONNECTED_MASK'};
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
 for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
 while(head<tail){
  const p=queue[head++],x=p%w,y=(p/w)|0;
  if(x>0)push(p-1);if(x+1<w)push(p+1);
  if(y>0)push(p-w);if(y+1<h)push(p+w);
 }
 const count=w*h,frac=1-tail/count;
 if(frac<.035||frac>.90)return {
  valid:false,reason:'FOREGROUND_COVERAGE_OUT_OF_RANGE',
  foreground:null,background:null,subjectBox:null,
  backgroundRGB:back,method:'NO_TRUSTWORTHY_MATTE'};
 const front=new Uint8ClampedArray(src),bg=new Uint8ClampedArray(src);
 let x0=w,y0=h,x1=0,y1=0;
 for(let p=0;p<count;p++){
  const i=p*4,x=p%w,y=(p/w)|0;
  if(visited[p]){front[i+3]=0;continue;}
  // Preserve original alpha in foreground; cover only the source-pixel
  // silhouette in the BACKGROUND with a flat border-color approximation.
  if(front[i+3]>100){x0=Math.min(x0,x);x1=Math.max(x1,x);
   y0=Math.min(y0,y);y1=Math.max(y1,y);}
  bg[i]=back[0];bg[i+1]=back[1];bg[i+2]=back[2];bg[i+3]=255;
 }
 if(x1<=x0||y1<=y0)return {
  valid:false,reason:'EMPTY_VISIBLE_SUBJECT',foreground:null,
  background:null,subjectBox:null,backgroundRGB:back,
  method:'NO_TRUSTWORTHY_MATTE'};
 return {valid:true,reason:null,foreground:front,background:bg,
  subjectBox:{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1},
  backgroundRGB:back,foregroundFraction:+frac.toFixed(4),
  method:alphaSource?'EXISTING_ALPHA_CONNECTED_EDGES':
   'BORDER_CONNECTED_RGB_FLOOD_MASK',
  unknownPixelsFilledByFlatBorderColor:true,
  actualSemanticPersonDetection:false,actualDepthMeasured:false};
}
export function inferAIG66FaceBox(subject,w,h){
 if(!subject)return null;
 const {x,y,width:bw,height:bh}=subject;
 const ratio=bw/bh;
 if(bh<h*.28||bw<w*.12||ratio<.22||ratio>1.3)return null;
 const fw=Math.min(bw*.6,bh*.38);
 const fh=Math.min(bh*.32,fw*1.3);
 const box={x:clamp(x+bw/2-fw/2,0,w-fw),
  y:clamp(y+bh*.055,0,h-fh),width:fw,height:fh};
 return box;
}
export function sampleAIG66LocalRig(timeSeconds,beat={}){
 if(!Number.isFinite(timeSeconds)||timeSeconds<0)throw Error('AIG66_TIME_INVALID');
 const cycle=timeSeconds%3.6;
 const blink=clamp(1-Math.abs(cycle-1.26)/.11,0,1);
 const dialogue=/(說|開口|對白|台詞|「|」|：|:)/u.test(beat.text||'');
 const mouth=dialogue?clamp(.15+.75*Math.pow(Math.sin(timeSeconds*8.5),2),0,.9):0;
 return {blink,mouth,headTurnRadians:0,
  nodes:['HEAD_ANCHOR','LEFT_EYE_PATCH','RIGHT_EYE_PATCH','MOUTH_PATCH'],
  eyesAndMouthAreSourcePixelWarps:true,
  actualFacialLandmarksDetected:false,lipMotionSyncedToAudio:false};
}
function paintPatch(ctx,source,r,scaleY){
 const [x,y,w,h]=r;
 if(w<2||h<2)return;
 // Opaque neighborhood from the *actual source* covers the old feature;
 // local pixels replace the feature with a time-varying compression.
 ctx.drawImage(source,x,y-h*.5,w,h*.35,x,y,w,h);
 const used=h*scaleY,cy=y+(h-used)/2;
 ctx.drawImage(source,x,y,w,h,x,cy,w,used);
}
export function createAIG66Portrait(doc,image,layered){
 const original=imageCanvas(doc,image);
 const ctx=original.context,photo=ctx.getImageData(0,0,
  original.canvas.width,original.canvas.height);
 const seg=segmentAIG66BorderRGBA(photo),w=original.canvas.width,
  h=original.canvas.height;
 let outputLayers=seg.valid?layered:{...layered,image,foreground:null,
  background:image,evidence:{schema:AIG66_SCHEMA,method:seg.method,
   fallbackReason:seg.reason,depthWasMeasured:false},
  visualMethod:'AIG66_SAFE_FLAT_NO_UNPROVEN_MATTE'};
 if(seg.valid){
  const front=doc.createElement('canvas'),bg=doc.createElement('canvas');
  front.width=bg.width=w;front.height=bg.height=h;
  for(const [target,pixels] of [[front,seg.foreground],[bg,seg.background]]){
   const context=target.getContext('2d');
   if(!context)throw Error('AIG66_LAYER_CONTEXT_UNAVAILABLE');
   const data=context.createImageData(w,h);data.data.set(pixels);
   context.putImageData(data,0,0);
  }
  outputLayers={...layered,image,foreground:front,background:bg,
   evidence:{schema:AIG66_SCHEMA,method:seg.method,
    foregroundFraction:seg.foregroundFraction,backgroundRGB:seg.backgroundRGB,
    unknownPixelsFilledByFlatBorderColor:true,depthWasMeasured:false},
   visualMethod:'AIG66_BORDER_CONNECTED_ALPHA_PARALLAX'};
 }
 // This is a bounding-envelope estimate, never a verified anatomical face.
 const subject=seg.valid?seg.subjectBox:null;
 const box=inferAIG66FaceBox(subject,w,h);
 const source=imageCanvas(doc,outputLayers?.foreground||image);
 const work=doc.createElement('canvas');work.width=w;work.height=h;
 const wc=work.getContext('2d');
 if(!wc)throw Error('AIG66_MOTION_CONTEXT_UNAVAILABLE');
 return {
  layers:outputLayers,box,
  evidence:{schema:AIG66_SCHEMA,faceMethod:box?
   'HEURISTIC_SUBJECT_TOP_REGION_NOT_FACE_DETECTION':'NO_SAFE_FACE_REGION',
   localNodesAvailable:!!box,
   localEyesAndMouthPixelsDeformed:!!box,
   realFaceTracking:false,realHeadNeckSkeletalDeformation:false,
   visemesOrAudioLipsync:false,semanticSegmentation:false,
   maskMethod:seg.method,backgroundHoleIsSynthesized:!!seg.valid,
   true3DDepth:false,releaseAllowed:false},
  sample(timeSeconds,beat){
   if(!box)return null;
   const pose=sampleAIG66LocalRig(timeSeconds,beat);
   wc.clearRect(0,0,w,h);
   wc.drawImage(source.canvas,0,0,w,h);
   const {x,y,width:fw,height:fh}=box;
   if(pose.blink>.01)for(const fx of [.16,.62]){
    paintPatch(wc,source.canvas,[x+fw*fx,y+fh*.38,fw*.22,fh*.115],
     Math.max(.09,1-pose.blink*.91));
   }
   if(pose.mouth>.01){
    paintPatch(wc,source.canvas,[x+fw*.35,y+fh*.71,fw*.3,fh*.085],
     1+pose.mouth*.6);
   }
   return {canvas:work,pose};
  }
 };
}
