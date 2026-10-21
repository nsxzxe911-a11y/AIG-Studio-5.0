/** FastModel 6.1 | offline no-API, deterministic pixel-contrast face mark ASSIST.
 * A user must indicate forehead/chin. Dark-feature proposals are uncertain and
 * must be visually reviewed and explicitly confirmed; no identity recognition.
 * Never state that predicted nose/mouth locations are measured photo truth.
 */
import {AIG60_MARKS,calibrateAIG60FaceMarks} from './aig-face-alignment-6-0.mjs';
export const AIG61_SCHEMA='AIG_FASTMODEL_6_1_TWO_ANCHOR_PIXEL_CONTRAST_LANDMARK_PROPOSAL_UNVERIFIED';
const finite=Number.isFinite;
const validPoint=p=>p&&finite(p.x)&&finite(p.y);
const clamp=(v,low,high)=>Math.max(low,Math.min(high,v));
function imageGuard({imageData,imageWidth,imageHeight,sourceImageSHA256,forehead,chin}){
 if(!Number.isInteger(imageWidth)||!Number.isInteger(imageHeight)||
    imageWidth<128||imageHeight<128||imageWidth>12000||imageHeight>12000||
    !/^[0-9a-f]{64}$/i.test(sourceImageSHA256||'')||
    !imageData||imageData.length!==imageWidth*imageHeight*4||
    !validPoint(forehead)||!validPoint(chin)||forehead.x<0||chin.x<0||
    forehead.y<0||chin.y>=imageHeight||forehead.x>=imageWidth||
    chin.x>=imageWidth||chin.y-forehead.y<imageHeight*.06||
    chin.y-forehead.y>imageHeight*.9)
  throw Error('AIG61_REAL_PIXELS_SOURCE_AND_TWO_ANCHORS_REQUIRED');
 const h=chin.y-forehead.y;
 if(Math.abs(forehead.x-chin.x)>.35*h||h<100)
  throw Error('AIG61_NONFRONTAL_OR_TOO_SMALL_FACE_ROI');
 for(const value of [0,1,2,3,4,5,6,7,8,9]){
  const ix=Math.min(imageData.length-4,Math.floor(value*(imageData.length-4)/9));
  if(!finite(imageData[ix]))throw Error('AIG61_IMAGE_PIXELS_INVALID');
 }
 return {x:(forehead.x+chin.x)/2,y:forehead.y,height:h};
}
// Sample actual dark-center/bright-surround contrast in source pixels.
// This is an imaging heuristic; strong contrast can also be shadow or hair.
export function proposeAIG61LocalLandmarks({
 imageData,imageWidth,imageHeight,sourceImageSHA256,forehead,chin
}={}){
 const roi=imageGuard({imageData,imageWidth,imageHeight,sourceImageSHA256,forehead,chin});
 const {x:cx,y:top,height:h}=roi;
 const stride=Math.max(1,Math.round(h/180));
 const radius=clamp(Math.round(h*.021),2,14),halo=radius*2;
 function intensity(x,y){
  const a=Math.round(x),b=Math.round(y);
  if(a<0||b<0||a>=imageWidth||b>=imageHeight)return null;
  const i=(b*imageWidth+a)*4;
  return .2126*imageData[i]+.7152*imageData[i+1]+.0722*imageData[i+2];
 }
 function contrast(x,y){
  const c=intensity(x,y);
  if(c===null)return -Infinity;
  const span=radius,inner=[
   [0,0],[span,0],[-span,0],[0,span],[0,-span]
  ];
  const outer=[
   [halo,0],[-halo,0],[0,halo],[0,-halo],
   [halo,halo],[-halo,halo],[halo,-halo],[-halo,-halo]
  ];
  const ins=inner.map(([dx,dy])=>intensity(x+dx,y+dy));
  const outs=outer.map(([dx,dy])=>intensity(x+dx,y+dy));
  if([...ins,...outs].some(v=>v===null))return -Infinity;
  const center=ins.reduce((a,b)=>a+b,0)/ins.length;
  const ring=outs.reduce((a,b)=>a+b,0)/outs.length;
  return ring-center;
 }
 function candidate(centerX,minX,maxX,minY,maxY){
  const searchStep=stride,result={score:-Infinity,x:centerX,y:(minY+maxY)/2};
  const startX=Math.max(halo,Math.ceil(minX)),endX=Math.min(imageWidth-halo-1,Math.floor(maxX));
  const startY=Math.max(halo,Math.ceil(minY)),endY=Math.min(imageHeight-halo-1,Math.floor(maxY));
  for(let y=startY;y<=endY;y+=searchStep)for(let x=startX;x<=endX;x+=searchStep){
   const score=contrast(x,y);
   const bias=.012*Math.abs(x-centerX)+.011*Math.abs(y-(minY+maxY)/2);
   if(score-bias>result.score){
    result.x=x;result.y=y;result.score=score-bias;
   }
  }
  return result;
 }
 // Search anatomical windows, not entire photograph; a second person in
 // the background cannot become the ROI unless the user anchored them.
 const left=candidate(cx-.24*h,cx-.37*h,cx-.12*h,top+.26*h,top+.47*h);
 const right=candidate(cx+.24*h,cx+.12*h,cx+.37*h,top+.26*h,top+.47*h);
 if(!finite(left.score)||!finite(right.score)||
    Math.min(left.score,right.score)<12)
  throw Error('AIG61_LOW_EYE_CONTRAST_MANUAL_SIX_MARKS_REQUIRED');
 const midpoint=(left.x+right.x)/2;
 const nose=candidate(midpoint,midpoint-.10*h,midpoint+.10*h,top+.53*h,top+.68*h);
 const mouth=candidate(midpoint,midpoint-.13*h,midpoint+.13*h,top+.70*h,top+.86*h);
 const proposal={
  forehead:{x:forehead.x,y:forehead.y},
  leftEye:{x:left.x,y:left.y},rightEye:{x:right.x,y:right.y},
  nose:{x:nose.x,y:nose.y},mouth:{x:mouth.x,y:mouth.y},
  chin:{x:chin.x,y:chin.y}
 };
 const evidence=[
  {key:'leftEye',score:left.score},
  {key:'rightEye',score:right.score},
  {key:'nose',score:nose.score},
  {key:'mouth',score:mouth.score}
 ].map(o=>({...o,confidence:clamp((o.score-8)/40,0,1),
  source:'PIXEL_CONTRAST_HEURISTIC_NOT_FACE_IDENTITY'}));
 let calibration;
 try{
  calibration=calibrateAIG60FaceMarks({
   imageWidth,imageHeight,sourceImageSHA256,marks:proposal
  });
 }catch{
  throw Error('AIG61_INFERRED_FACIAL_GEOMETRY_INVALID_MANUAL_SIX_MARKS_REQUIRED');
 }
 const weak=evidence.filter(e=>e.score<16).map(e=>e.key);
 return {schema:AIG61_SCHEMA,sourceImageSHA256:sourceImageSHA256.toLowerCase(),
  originalImageDimensions:{width:imageWidth,height:imageHeight},
  userAnchors:{forehead:{...forehead},chin:{...chin}},
  suggestedMarks:proposal,pixelEvidence:evidence,
  weakMarkKeys:weak,eyeContrastThreshold:12,
  calibrated2DConstraintsValid:true,
  imageSamplingStep:stride,analyzedRawPixelData:true,
  detectsOneIdentifiableRealFace:false,
  candidateIsMeasuredLandmark:false,
  confidenceIsNotStatisticalAccuracy:true,
  requiresExplicitUserVisualApproval:true,
  approvalGiven:false,
  originalFaceDepthInferred:false,
  releaseAllowed:false};
}
export function acceptAIG61ReviewedProposal(proposal,{
 imageWidth,imageHeight,sourceImageSHA256,userConfirmed=false,
 corrections={}
}={}){
 if(proposal?.schema!==AIG61_SCHEMA||
    proposal?.sourceImageSHA256!==sourceImageSHA256?.toLowerCase()||
    proposal?.originalImageDimensions?.width!==imageWidth||
    proposal?.originalImageDimensions?.height!==imageHeight||
    proposal.approvalGiven!==false||proposal.releaseAllowed!==false||
    userConfirmed!==true||!corrections||
    Object.keys(corrections).some(key=>!AIG60_MARKS.includes(key)||
      !validPoint(corrections[key])))
  throw Error('AIG61_SOURCE_OR_HUMAN_REVIEW_REQUIRED');
 const marks=Object.fromEntries(AIG60_MARKS.map(key=>[
  key, corrections[key]?
   {x:corrections[key].x,y:corrections[key].y}:
   {...proposal.suggestedMarks[key]}
 ]));
 const calibration=calibrateAIG60FaceMarks({
  imageWidth,imageHeight,sourceImageSHA256,marks
 });
 return {schema:AIG61_SCHEMA,
  sourceImageSHA256:sourceImageSHA256.toLowerCase(),
  reviewedMarks:marks,
  calibration,manualCorrections:Object.keys(corrections),
  sourceApproval:'USER_VISUALLY_CONFIRMED_PIXEL_PROPOSALS',
  copiedAutoMarksAreHumanReviewedNotVerifiedCVAccuracy:true,
  photo3DIdentityApproved:false,
  continuousCollisionFreeApproved:false,
  releaseAllowed:false};
}
