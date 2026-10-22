/**
 * Real3D 2.4 — no-click, offline image inspection before optional 6.4 rig.
 * Measures REAL RGBA source pixels: luminance/contrast, transparent edges,
 * coarse foreground-connected regions, count/position/shape and usable ROI.
 *
 * This is a bounded non-ML visual detector, NOT trained face/person/animal/
 * vehicle semantic recognition. A plausible silhouette is only a technical
 * humanoid draft candidate and must never certify a person's identity.
 */
export const AIG24_SCHEMA='AIG_FASTMODEL_REAL3D_2_4_AUTOMATIC_IMAGE_INSPECTION';
const SAMPLE=96,PIXELS=SAMPLE*SAMPLE;
const fail=s=>{throw Error('AIG24_'+s)};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const fixed=v=>Math.round(v*10000)/10000;
const validSha=s=>typeof s==='string'&&/^[0-9a-f]{64}$/i.test(s);
const median=items=>{
 const s=items.slice().sort((a,b)=>a-b);
 return s.length?s[Math.floor(s.length/2)]:0;
};
export function detectAIG24Image({pixels,width,height,sourceImageSHA256}={}){
 if(!validSha(sourceImageSHA256)||
  !(pixels instanceof Uint8Array||pixels instanceof Uint8ClampedArray)||
  !Number.isInteger(width)||!Number.isInteger(height)||
  width<128||height<128||width*height>2048*2048||
  pixels.length!==width*height*4)
  fail('VERIFIED_BOUNDED_IMAGE_RGBA_AND_SHA_REQUIRED');
 const rgbs=new Uint8Array(PIXELS*3),alphas=new Uint8Array(PIXELS);
 const rim=[[],[],[]];
 let transparentRim=0,validRim=0,lumSum=0,lumSquares=0;
 for(let y=0;y<SAMPLE;y++)for(let x=0;x<SAMPLE;x++){
  const sx=Math.min(width-1,Math.floor((x+.5)*width/SAMPLE));
  const sy=Math.min(height-1,Math.floor((y+.5)*height/SAMPLE));
  const pos=(sy*width+sx)*4,i=y*SAMPLE+x;
  const r=pixels[pos],g=pixels[pos+1],b=pixels[pos+2],a=pixels[pos+3];
  alphas[i]=a;rgbs.set([r,g,b],i*3);
  const lum=(.2126*r+.7152*g+.0722*b)/255;
  lumSum+=lum;lumSquares+=lum*lum;
  if(x<4||x>=SAMPLE-4||y<4||y>=SAMPLE-4){
   validRim++;
   if(a<64)transparentRim++;
   else if(a>=240){rim[0].push(r);rim[1].push(g);rim[2].push(b)}
  }
 }
 const alphaMode=transparentRim>validRim*.5;
 // A complex/unknown border is not interpreted as a measured background.
 const haveBackground=alphaMode||rim[0].length>=150;
 const bg=alphaMode?null:rim.map(median);
 const mask=new Uint8Array(PIXELS);
 let foreground=0,gradSum=0;
 const limitSq=55*55;
 for(let y=0;y<SAMPLE;y++)for(let x=0;x<SAMPLE;x++){
  const i=y*SAMPLE+x,k=i*3,a=alphas[i];
  if(a<180)continue;
  if(alphaMode){
   mask[i]=1;foreground++;continue;
  }
  if(!haveBackground)continue;
  const d0=rgbs[k]-bg[0],d1=rgbs[k+1]-bg[1],
   d2=rgbs[k+2]-bg[2];
  // Conservative color distance against the measured outer-border median.
  if(d0*d0+d1*d1+d2*d2>limitSq){mask[i]=1;foreground++}
  if(x>0){
   const j=k-3;
   gradSum+=(Math.abs(rgbs[k]-rgbs[j])+
    Math.abs(rgbs[k+1]-rgbs[j+1])+
    Math.abs(rgbs[k+2]-rgbs[j+2]))/3;
  }
 }
 const visited=new Uint8Array(PIXELS),regions=[];
 for(let start=0;start<PIXELS;start++){
  if(!mask[start]||visited[start])continue;
  let x0=SAMPLE,y0=SAMPLE,x1=0,y1=0,sumX=0,sumY=0;
  const q=[start];visited[start]=1;
  for(let qi=0;qi<q.length;qi++){
   const i=q[qi],x=i%SAMPLE,y=Math.floor(i/SAMPLE);
   x0=Math.min(x0,x);x1=Math.max(x1,x);
   y0=Math.min(y0,y);y1=Math.max(y1,y);sumX+=x;sumY+=y;
   for(const n of [i-1,i+1,i-SAMPLE,i+SAMPLE]){
    if(n<0||n>=PIXELS||visited[n]||!mask[n])continue;
    if(Math.abs((n%SAMPLE)-x)+
      Math.abs(Math.floor(n/SAMPLE)-y)!==1)continue;
    visited[n]=1;q.push(n);
   }
  }
  if(q.length<24)continue; // Ignore scattered compression/edge artifacts.
  const bw=x1-x0+1,bh=y1-y0+1;
  regions.push({
   samplePixels:q.length,
   bbox:{x:fixed(x0/SAMPLE),y:fixed(y0/SAMPLE),
    width:fixed(bw/SAMPLE),height:fixed(bh/SAMPLE)},
   center:[fixed((sumX/q.length+.5)/SAMPLE),
    fixed((sumY/q.length+.5)/SAMPLE)],
   occupancy:fixed(q.length/(bw*bh)),
   aspectHeightToWidth:fixed((bh*height)/(bw*width))
  });
 }
 regions.sort((a,b)=>b.samplePixels-a.samplePixels);
 const largest=regions[0]||null;
 const substantial=regions.filter(r=>r.samplePixels>=
  Math.max(90,(largest?.samplePixels||0)*.25));
 const backgroundFraction=1-foreground/PIXELS;
 const mean=lumSum/PIXELS;
 const brightnessStdev=Math.sqrt(Math.max(0,lumSquares/PIXELS-mean*mean));
 const mainShare=largest?largest.samplePixels/Math.max(foreground,1):0;
 const aspect=largest?.aspectHeightToWidth??0,center=largest?.center??[0,0];
 const shapeCandidate=!!largest&&
  largest.samplePixels>=120&&aspect>=1.18&&aspect<=4.5&&
  largest.bbox.width>=.06&&largest.bbox.height>=.09&&
  Math.abs(center[0]-.5)<=.30&&mainShare>=.60&&
  largest.occupancy>=.25&&largest.occupancy<=1;
 const multi=substantial.length>=2;
 const coverage=foreground/PIXELS;
 const contrastEnough=brightnessStdev>=.04||alphaMode;
 const autoTechnicalRig=haveBackground&&contrastEnough&&shapeCandidate&&
  !multi&&coverage>=.015&&coverage<=.68&&
  backgroundFraction>=.25;
 const reason=!haveBackground?'NO_RELIABLE_BACKGROUND':
  !largest?'NO_DISTINCT_FOREGROUND':
  multi?'MULTIPLE_FOREGROUND_REGIONS_UNCERTAIN':
  !contrastEnough?'LOW_IMAGE_CONTRAST':
  !shapeCandidate?'OBJECT_TYPE_OR_SHAPE_UNCERTAIN':
  !autoTechnicalRig?'INSUFFICIENT_IMAGE_SEPARATION':
  'SINGLE_PORTRAIT_SHAPE_CANDIDATE_NOT_IDENTITY_PROOF';
 return Object.freeze({
  schema:AIG24_SCHEMA,
  sourceImageSHA256:sourceImageSHA256.toLowerCase(),
  sourceImagePixels:[width,height],sampleGrid:[SAMPLE,SAMPLE],
  hasMeasuredOuterBorderBackground:haveBackground,
  backgroundMode:alphaMode?'ALPHA':'MEDIAN_BORDER_RGB',
  luminanceMean:fixed(mean),luminanceStdDev:fixed(brightnessStdev),
  averageAdjacentRGBDifference:fixed(gradSum/Math.max(1,PIXELS-SAMPLE)),
  foregroundFraction:fixed(coverage),
  significantObjectCandidates:substantial.length,
  mainForegroundFraction:fixed(mainShare),
  regions:regions.slice(0,8),
  suggestedObjectType:autoTechnicalRig?
   'HUMANOID_SHAPED_TECHNICAL_CANDIDATE_ONLY':'UNKNOWN_NEEDS_REAL_SEMANTIC_MODEL',
  classificationIsNotLearnedHumanFaceDetection:true,
  actualPersonIdentityRecognized:false,
  autoTechnicalRigAllowed:autoTechnicalRig,
  autoProcessReason:reason,
  status:autoTechnicalRig?'AUTO_TECHNICAL_RIG_CANDIDATE':'DETECTION_ONLY_BLOCK_MODEL',
  requiresManualLandmarksForInspection:false,
  estimatedDepthOnly:true,realWorldScaleKnown:false,
  sourceOriginalUnmodified:true,releaseAllowed:false
 });
}
