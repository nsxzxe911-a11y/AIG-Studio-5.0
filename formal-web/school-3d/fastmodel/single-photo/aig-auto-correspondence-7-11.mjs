/**
 * FastModel 7.11 | deterministic, local, automatic stereo FEATURE CANDIDATES.
 *
 * Uses actual source pixels, Shi-Tomasi corner response, normalized image
 * patches, bidirectional uniqueness and conservative rectified epipolar gate.
 * Never infers camera intrinsics/extrinsics or upgrades single-video arbitrary
 * motion into a calibrated stereo rig. Output candidates are NOT measured 3D
 * until the user reviews their source/rig, and 7.10 triangulation passes.
 */
import {addAIG710StereoMatch} from './aig-multiview-fusion-7-10.mjs';
export const AIG711_SCHEMA='AIG_FASTMODEL_7_11_SOURCE_FEATURE_MATCH_CANDIDATES';
const fin=Number.isFinite;
const valid=(v,a,b)=>fin(v)&&v>=a&&v<=b;
function config({
 maxFeatures=64,minDistance=9,patchRadius=5,maxVerticalErrorPx=2,
 minDisparityPx=3,maxDisparityPx=128,
 minPatchContrast=.045,maxPatchError=.31,uniquenessRatio=.82
}={}){
 if(!Number.isInteger(maxFeatures)||maxFeatures<4||maxFeatures>160||
 !Number.isInteger(minDistance)||minDistance<4||minDistance>30||
 !Number.isInteger(patchRadius)||patchRadius<3||patchRadius>9||
 ![maxVerticalErrorPx,minDisparityPx,maxDisparityPx,
 minPatchContrast,maxPatchError,uniquenessRatio].every(fin)||
 !valid(maxVerticalErrorPx,.5,6)||!valid(minDisparityPx,1,24)||
 maxDisparityPx<=minDisparityPx||maxDisparityPx>500||
 !valid(minPatchContrast,.01,.35)||!valid(maxPatchError,.06,.7)||
 !valid(uniquenessRatio,.55,.97))
  throw Error('AIG711_MATCH_CONFIG_INVALID');
 return {maxFeatures,minDistance,patchRadius,maxVerticalErrorPx,
  minDisparityPx,maxDisparityPx,minPatchContrast,maxPatchError,uniquenessRatio};
}
function luminance(frame){
 const {width:w,height:h,data}=frame||{};
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<48||h<48||
  w*h>1100000||!data||data.length!==w*h*4)
  throw Error('AIG711_FRAME_SIZE_INVALID');
 const arr=new Float32Array(w*h);
 for(let i=0;i<w*h;i++){
  const k=i*4;
  arr[i]=(.2126*data[k]+.7152*data[k+1]+.0722*data[k+2])/
   255*(data[k+3]/255);
 }
 return {width:w,height:h,gray:arr};
}
function texture(img,x,y,patchRadius){
 const w=img.width,g=img.gray,r=patchRadius,values=[];
 let sum=0,sum2=0;
 for(let dy=-r;dy<=r;dy+=2)for(let dx=-r;dx<=r;dx+=2){
  const value=g[(y+dy)*w+x+dx];values.push(value);sum+=value;sum2+=value*value;
 }
 const mean=sum/values.length,std=Math.sqrt(Math.max(0,sum2/values.length-mean*mean));
 return {values:values.map(v=>(v-mean)/Math.max(.012,std)),contrast:std};
}
function detect(img,opt){
 const {width:w,height:h,gray:g}=img,r=opt.patchRadius+3;
 const candidates=[];
 // Explicit pixel-gradient structure tensor and minimum eigenvalue:
 // corners have edges in BOTH directions. Selected feature distribution
 // is constrained by minimum Euclidean pixel spacing (NMS).
 for(let y=r;y<h-r;y+=2)for(let x=r;x<w-r;x+=2){
  let a=0,b=0,c=0;
  for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){
   const n=(y+j)*w+x+i,gx=(g[n+1]-g[n-1])*.5,
    gy=(g[n+w]-g[n-w])*.5;
   a+=gx*gx;b+=gx*gy;c+=gy*gy;
  }
  const minEig=(a+c-Math.sqrt((a-c)*(a-c)+4*b*b))/2;
  if(minEig<.012)continue;
  const desc=texture(img,x,y,opt.patchRadius);
  if(desc.contrast<opt.minPatchContrast)continue;
  candidates.push({x,y,response:minEig,descriptor:desc.values,contrast:desc.contrast});
 }
 candidates.sort((a,b)=>b.response-a.response);
 const out=[];const minSq=opt.minDistance*opt.minDistance;
 for(const item of candidates){
  if(out.every(p=>(p.x-item.x)**2+(p.y-item.y)**2>=minSq))out.push(item);
  if(out.length>=opt.maxFeatures)break;
 }
 return out;
}
function error(a,b){
 let sum=0;
 for(let i=0;i<a.length;i++){
  const v=a[i]-b[i];sum+=v*v;
 }
 // Normalize contrast-invariant zero-mean descriptors into a practical
 // 0.. range: identical patches = 0; unrelated = approximately 1.
 return sum/(a.length*2);
}
function bestMatch(source,target,opt,sign){
 const mappings=[];
 for(let i=0;i<source.length;i++){
  const p=source[i],scores=[];
  for(let j=0;j<target.length;j++){
   const q=target[j],d=sign*(p.x-q.x);
   if(d<opt.minDisparityPx||d>opt.maxDisparityPx||
    Math.abs(p.y-q.y)>opt.maxVerticalErrorPx)continue;
   scores.push({j,score:error(p.descriptor,q.descriptor),
    d,dy:Math.abs(p.y-q.y)});
  }
  scores.sort((a,b)=>a.score-b.score);
  const best=scores[0],second=scores[1];
  if(!best||best.score>opt.maxPatchError||
   second&&best.score>=second.score*opt.uniquenessRatio)continue;
  mappings.push({i,...best,uniqueness:second?
   1-best.score/Math.max(.00001,second.score):.8});
 }
 return mappings;
}
export function suggestAIG711StereoMatches(frameA,frameB,options={}){
 const opt=config(options),a=luminance(frameA),b=luminance(frameB);
 if(a.width!==b.width||a.height!==b.height)
  throw Error('AIG711_SAME_RECTIFIED_IMAGE_DIMENSIONS_REQUIRED');
 // No physical baseline is observable if source images contain no meaningful
 // photometric change. A same-frame pair must never create false depth merely
 // because similar hair/skin textures repeat at other image X positions.
 let globalDiff=0,globalN=0;
 for(let i=0;i<a.gray.length;i+=11){globalDiff+=Math.abs(a.gray[i]-b.gray[i]);globalN++;}
 globalDiff/=Math.max(1,globalN);
 if(globalDiff<.012)return {schema:AIG711_SCHEMA,config:opt,width:a.width,height:a.height,
  cornersA:0,cornersB:0,forwardProposals:0,backwardProposals:0,
  mutualMatches:0,rawMutualMatches:0,coherentDisparityMatches:0,
  photometricDifference:globalDiff,candidates:[],previewOnly:true,sourcePixelGeometry:true,
  cameraIntrinsicsSolved:false,cameraExtrinsicsSolved:false,
  epipolarModel:'USER_ASSERTED_HORIZONTAL_RECTIFICATION',
  realXYZReconstructed:false,complete3DHumanReconstructed:false,
  rejectedReason:'INSUFFICIENT_FRAME_CHANGE'};
 const left=detect(a,opt),right=detect(b,opt),
  forward=bestMatch(left,right,opt,1),
  backward=bestMatch(right,left,opt,-1),
  reverse=new Map(backward.map(x=>[x.i,x.j]));
 const accepted=[];
 for(const match of forward){
  if(reverse.get(match.j)!==match.i)continue;
  const l=left[match.i],r=right[match.j];
  accepted.push({
   id:'candidate-'+String(accepted.length+1).padStart(3,'0'),
   left:{x:l.x,y:l.y},right:{x:r.x,y:r.y},
   disparityPx:match.d,epipolarErrorPx:match.dy,
   patchError:match.score,
   confidence:Math.min(1,Math.max(0,(1-match.score/opt.maxPatchError)*.7+
    .3*match.uniqueness)),
   reviewed:false,calibrationSolved:false,
   source:'AUTO_PHOTO_PATCH_MATCH_BIDIRECTIONAL_RECTIFIED_ONLY'
  });
 }
 // Patch appearance on two valid views should be mutually strong.
 // Distinct repeated motifs can otherwise "match" faraway textures.
 // A dominant coherent horizontal stereo-parallax set must exist; reject
 // split/repeated texture modes instead of inventing a pseudo surface.
 const rawMutualMatches=accepted.length;
 const reliable=accepted.filter(p=>p.confidence>=.72&&p.patchError<=.18);
 const bins=new Map();
 for(const p of reliable){
  const key=Math.round(p.disparityPx/3);
  bins.set(key,(bins.get(key)||0)+1);
 }
 const strongest=[...bins.entries()].sort((a,b)=>b[1]-a[1])[0];
 const disparityPeak=strongest?strongest[0]*3:null;
 const inliers=disparityPeak===null?[]:reliable.filter(p=>
  Math.abs(p.disparityPx-disparityPeak)<=Math.max(2.5,disparityPeak*.16));
 const stable=inliers.length>=4&&inliers.length/Math.max(1,reliable.length)>=.60;
 const final=stable?inliers:[],
  coherence=stable?'COHERENT_HORIZONTAL_STEREO_CANDIDATES':'NO_DOMINANT_PARALLAX_BLOCKED';
 final.sort((a,b)=>b.confidence-a.confidence);
 return {schema:AIG711_SCHEMA,config:opt,width:a.width,height:a.height,
  cornersA:left.length,cornersB:right.length,
  forwardProposals:forward.length,backwardProposals:backward.length,
  mutualMatches:final.length,rawMutualMatches,coherentDisparityMatches:final.length,
  photometricDifference:globalDiff,disparityPeakPx:disparityPeak,coherence,candidates:final,
  previewOnly:true,sourcePixelGeometry:true,
  cameraIntrinsicsSolved:false,cameraExtrinsicsSolved:false,
  epipolarModel:'USER_ASSERTED_HORIZONTAL_RECTIFICATION',
  realXYZReconstructed:false,complete3DHumanReconstructed:false};
}
export function commitAIG711ReviewedCandidates(fusion,proposal,{
 frameAId,frameBId,timeAMs,timeBMs,reviewedIds=[],limit=24
}={}){
 if(proposal?.schema!==AIG711_SCHEMA||
  !Array.isArray(reviewedIds)||!Number.isInteger(limit)||limit<1||limit>96||
  reviewedIds.length>limit||!fusion||fusion.calibration?.width!==proposal.width||
  fusion.calibration?.height!==proposal.height)
  throw Error('AIG711_REVIEWED_STEREO_FUSION_REQUIRED');
 if(reviewedIds.length===0)throw Error('AIG711_NO_USER_ACCEPTED_MATCHES');
 if(new Set(reviewedIds).size!==reviewedIds.length)
  throw Error('AIG711_DUPLICATE_REVIEW_ID_BLOCKED');
 const mapped=new Map(proposal.candidates.map(x=>[x.id,x]));
 const results=[],rejections=[];
 for(const id of reviewedIds){
  const p=mapped.get(id);
  if(!p||p.confidence<.30){rejections.push({id,reason:'UNKNOWN_OR_LOW_CONFIDENCE'});continue;}
  try{
   // 7.10 remains the only owner of final XYZ triangulation and the
   // anti-drift/positive-parallax/reprojection/source-time Gate.
   const value=addAIG710StereoMatch(fusion,{
    label:'auto_'+frameAId+'_'+id,frameAId,frameBId,timeAMs,timeBMs,
    left:p.left,right:p.right,reviewed:true
   });
   results.push({id,xyzMm:value.xyzMm,revision:value.revision,
    confidence:p.confidence});
  }catch(e){rejections.push({id,reason:String(e.message||e)});}
 }
 return {schema:AIG711_SCHEMA,accepted:results,blocked:rejections,
  reviewedByUser:true,automaticCameraPoseSolved:false,
  human3DAnatomyApproved:false,finalXYZThroughGate710:true};
}
