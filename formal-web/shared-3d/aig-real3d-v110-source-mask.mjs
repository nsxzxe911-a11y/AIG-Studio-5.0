/**
 * Real3D V110. Strict source-pixel foreground extraction for plain-background
 * OPAQUE PNG. This is not a neural semantic segmenter. Complex backgrounds
 * require a separate user-reviewed source mask. No new depth/hidden geometry.
 */
export const AIG_REAL3D_V110_SCHEMA='AIG_REAL3D_V110_SOURCE_MASK_PROVENANCE_V1';
const fail=msg=>{throw Error('REAL3D_V110_'+msg);};
const sha=s=>typeof s==='string'&&/^[0-9a-f]{64}$/i.test(s);
const isRGBA=a=>a instanceof Uint8Array||a instanceof Uint8ClampedArray;
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b[Math.floor(b.length/2)];};
function rgbDistance(data,index,color){
 const k=index*4;
 return Math.hypot(data[k]-color[0],data[k+1]-color[1],data[k+2]-color[2]);
}
function flood(mask,w,h,seedIndex=0,seekValue=1){
 const found=new Uint8Array(mask.length),queue=new Int32Array(mask.length);
 let head=0,tail=0,components=0,biggest=0;
 for(let start=seedIndex;start<mask.length;start++){
  if(found[start]||mask[start]!==seekValue)continue;
  components++;let size=0;found[start]=1;queue[tail++]=start;
  while(head<tail){
   const p=queue[head++],x=p%w,y=Math.floor(p/w);size++;
   for(const n of [x>0?p-1:-1,x+1<w?p+1:-1,y>0?p-w:-1,y+1<h?p+w:-1])
    if(n>=0&&!found[n]&&mask[n]===seekValue){
     found[n]=1;queue[tail++]=n;
    }
  }
  biggest=Math.max(biggest,size);
  head=0;tail=0;
 }
 return {components,biggest};
}
function borderSamples(rgba,w,h){
 const indices=[];
 for(let x=0;x<w;x++){indices.push(x,(h-1)*w+x);}
 for(let y=1;y<h-1;y++){indices.push(y*w,y*w+w-1);}
 return indices;
}
function makeRGBAMatte(source,mask){
 const out=new Uint8ClampedArray(source);
 for(let i=0;i<mask.length;i++)out[i*4+3]=mask[i]?255:0;
 return out;
}
function checkMask(mask,w,h,{minimumCoverage=.06,maximumCoverage=.86}={}){
 let foreground=0,border=0;
 for(let k=0;k<mask.length;k++)if(mask[k]){
  foreground++;
  const x=k%w,y=Math.floor(k/w);
  if(x===0||y===0||x===w-1||y===h-1)border++;
 }
 if(foreground<128||foreground<mask.length*minimumCoverage||
   foreground>mask.length*maximumCoverage)
  fail('MASK_COVERAGE_OUTSIDE_SAFE_RANGE');
 if(border)fail('FOREGROUND_CROPPED_TOUCHES_IMAGE_BORDER');
 const cc=flood(mask,w,h);
 if(cc.components!==1)fail('MASK_HAS_MULTIPLE_DISCONNECTED_SUBJECTS');
 return {foreground,foregroundFraction:foreground/mask.length,components:cc.components,border};
}
/**
 * Input RGBA is the decoded original PNG. imageSha256 belongs to source
 * bytes. Caller encodes a separate alpha PNG and hashes that separately.
 */
export function extractAIGReal3DV110Foreground({
 rgba,width,height,imageSha256,
 externalMaskRGBA=null,externalMaskSha256=null,
 externalMaskConfirmed=false,externalMaskMode='LUMINANCE',
 tolerance=30
}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<16||height<16||width>1024||height>1024||
  !isRGBA(rgba)||rgba.length!==width*height*4||!sha(imageSha256)||
  !Number.isFinite(tolerance)||tolerance<12||tolerance>48)
  fail('ORIGINAL_SOURCE_RGBA_AND_SHA_REQUIRED');
 const n=width*height,source=new Uint8ClampedArray(rgba),mask=new Uint8Array(n);
 let mode='AUTO_SIMPLE_BORDER_BG',bgColor=null,borderSpreadMax=null,
  edgeUncertainFraction=null;
 if(externalMaskRGBA!==null){
  if(!isRGBA(externalMaskRGBA)||externalMaskRGBA.length!==rgba.length||
   !sha(externalMaskSha256)||externalMaskSha256===imageSha256||
   externalMaskConfirmed!==true||
   !['ALPHA','LUMINANCE'].includes(externalMaskMode))
   fail('INDEPENDENT_REVIEWED_MASK_SOURCE_SHA_AND_CONSENT_REQUIRED');
  for(let i=0;i<n;i++){
   const k=i*4;
   mask[i]=(externalMaskMode==='ALPHA'?externalMaskRGBA[k+3]:
    (externalMaskRGBA[k]+externalMaskRGBA[k+1]+externalMaskRGBA[k+2])/3)>127?1:0;
  }
  mode='EXTERNAL_USER_REVIEWED_MASK_NOT_AI_CERTIFIED';
 }else{
  if(externalMaskSha256!==null||externalMaskConfirmed)
   fail('MASK_EVIDENCE_MISSING');
  let transparent=0,opaque=0;
  for(let i=0;i<n;i++){
   const a=source[i*4+3];
   if(a<=16)transparent++;
   if(a>=250)opaque++;
  }
  if(transparent>0){
   if(opaque+transparent!==n)fail('PARTIAL_ALPHA_REQUIRES_EXISTING_SOURCE_MANUAL_REVIEW');
   for(let i=0;i<n;i++)mask[i]=source[i*4+3]>16?1:0;
   mode='ORIGINAL_ALPHA_ALREADY_SEGMENTED';
  }else{
   if(opaque!==n)fail('SEMITRANSPARENT_OPAQUE_SOURCE_UNSUPPORTED');
   const borders=borderSamples(source,width,height);
   // The whole image border must be uniformly background; any foreground
   // touching it or textured scenery must not silently become geometry.
   bgColor=[0,1,2].map(c=>median(borders.map(i=>source[i*4+c])));
   const spread=borders.map(i=>rgbDistance(source,i,bgColor));
   borderSpreadMax=Math.max(...spread);
   if(borderSpreadMax>24)
    fail('COMPLEX_OR_CROPPED_BACKGROUND_NEEDS_INDEPENDENT_MASK');
   const background=new Uint8Array(n),queue=new Int32Array(n);
   let head=0,tail=0;
   const push=i=>{if(!background[i]&&rgbDistance(source,i,bgColor)<=tolerance){
    background[i]=1;queue[tail++]=i;
   }};
   for(const i of borders)push(i);
   while(head<tail){
    const p=queue[head++],x=p%width,y=Math.floor(p/width);
    for(const q of [x>0?p-1:-1,x+1<width?p+1:-1,
     y>0?p-width:-1,y+1<height?p+width:-1])
     if(q>=0)push(q);
   }
   if(tail<n*.12)fail('BACKGROUND_FLOOD_COVERAGE_UNTRUSTED');
   let edges=0,ambiguous=0;
   for(let k=0;k<n;k++){
    mask[k]=background[k]?0:1;
    if(!mask[k])continue;
    const x=k%width,y=Math.floor(k/width);
    const perimeter=[x>0?k-1:-1,x+1<width?k+1:-1,
     y>0?k-width:-1,y+1<height?k+width:-1];
    if(perimeter.some(i=>i>=0&&background[i])){
     edges++;
     if(rgbDistance(source,k,bgColor)<tolerance+10)ambiguous++;
    }
   }
   edgeUncertainFraction=edges?ambiguous/edges:1;
   if(edgeUncertainFraction>.04)fail('UNTRUSTED_SOFT_EDGE_OR_LOW_CONTRAST');
  }
 }
 const quality=checkMask(mask,width,height);
 const output=makeRGBAMatte(source,mask);
 return {
  schema:AIG_REAL3D_V110_SCHEMA,width,height,imageSha256,
  sourceMode:mode,backgroundMedianRGB:bgColor,
  maxBorderRGBDistance:borderSpreadMax,
  fractionAmbiguousSourceBoundary:edgeUncertainFraction,
  ...quality,
  originalImageColorPixelsPreserved:true,
  newMaskRequiresIndependentPNGAndSHA:true,
  sourceBacksideAndDepthNotObserved:true,
  automaticallyIdentifiedComplexPeople:false,
  neuralSegmentationWeightsExecuted:false,
  sourceMaskReviewStillRecommended:true,
  originalPhotoIdentityOr3DSimilarityCertified:false,
  releasePASS:false,
  mask,maskedRGBA:output
 };
}
