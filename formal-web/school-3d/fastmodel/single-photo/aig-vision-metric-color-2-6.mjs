/**
 * Real3D 2.6 — SOURCE-BOUND semantic evidence, homography mm, linear colour.
 * DOES NOT hallucinate unseen body depth, identity, ground truth labels,
 * physical 3D measurements, or monitor-calibrated 1:1 spectral colours.
 * Pure functions: no GPU reset, vault mutation, storage or network.
 */
export const AIG26_SCHEMA='AIG_REAL3D_2_6_SOURCE_BOUND_MEASURED_VISION_COLOR';
const fail=x=>{throw Error('AIG26_'+x)};
const finite=Number.isFinite;
const sha=s=>typeof s==='string'&&/^sha256:[0-9a-f]{64}$/.test(s);
const point=p=>Array.isArray(p)&&p.length===2&&p.every(finite);
const inImage=(p,w,h)=>point(p)&&p[0]>=0&&p[1]>=0&&p[0]<=w&&p[1]<=h;
const validImage=(w,h)=>Number.isInteger(w)&&Number.isInteger(h)&&
 w>=128&&h>=128&&w<=12000&&h<=12000;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

export const AIG26_CLASSES=Object.freeze([
 'background','person','head','hair','neck','torso','leftArm','rightArm',
 'leftHand','rightHand','leftLeg','rightLeg','leftFoot','rightFoot',
 'garment','accessory','animal','plant','tree','building','road','vehicle',
 'sky','water','ground','unknown'
]);
/** Inspect externally derived per-pixel class IDs. This does NOT run a model. */
export function inspectAIG26SemanticLabels({
 width,height,sourceSha256,labels,regions=[],producer='UNVERIFIED',
 modelSha256=null,humanReviewed=false
}={}){
 if(!validImage(width,height)||!sha(sourceSha256)||
  !(labels instanceof Uint8Array)||labels.length!==width*height||
  !Array.isArray(regions)||regions.length<1||regions.length>25||
  !['UNVERIFIED','MODEL_INFERENCE','HUMAN_ANNOTATION'].includes(producer)||
  (modelSha256!==null&&!sha(modelSha256))||typeof humanReviewed!=='boolean')
  fail('LABEL_SOURCE_OR_DIMENSIONS_INVALID');
 if(producer==='MODEL_INFERENCE'&&!sha(modelSha256))
  fail('MODEL_DIGEST_REQUIRED_NOT_JUST_CONFIDENCE');
 if(producer==='HUMAN_ANNOTATION'&&!humanReviewed)
  fail('ANNOTATION_REVIEW_REQUIRED');
 const ids=new Set();
 const values=regions.map(r=>{
  if(!Number.isInteger(r.id)||r.id<1||r.id>255||ids.has(r.id)||
   !AIG26_CLASSES.includes(r.className)||r.className==='unknown'||
   r.className==='background'||!finite(r.confidence)||r.confidence<0||
   r.confidence>1)fail('UNIQUE_CLASS_AND_CONFIDENCE_REQUIRED');
  ids.add(r.id);
  return {id:r.id,className:r.className,confidence:r.confidence,
   observedPixels:0,box:[width,height,-1,-1]};
 });
 const lookup=new Map(values.map((v,i)=>[v.id,i]));let unknown=0;
 for(let i=0;i<labels.length;i++){
  const n=labels[i];if(n===0)continue;
  const at=lookup.get(n);if(at===undefined){unknown++;continue}
  const r=values[at],x=i%width,y=Math.floor(i/width);
  r.observedPixels++;r.box=[
   Math.min(x,r.box[0]),Math.min(y,r.box[1]),
   Math.max(x,r.box[2]),Math.max(y,r.box[3])];
 }
 if(unknown>0||values.some(v=>v.observedPixels===0))
  fail('UNDECLARED_LABELS_OR_EMPTY_REGION');
 return {
  schema:AIG26_SCHEMA,sourceSha256,modelSha256,
  image:[width,height],producer,humanReviewed,
  semanticLabelsFromRealExternalEvidence:true,
  automaticSemanticModelExecutedHere:false,
  imageClassificationGroundTruthCertified:false,
  estimatedHiddenBodyGeometry:false,
  categoryEvidence:values.map(({id,className,confidence,observedPixels,box})=>
   ({id,className,confidence,pixelCount:observedPixels,coverage:
    +(observedPixels/(width*height)).toFixed(6),pixelBox:box,
    confidenceIsModelScoreNotRealWorldAccuracy:true})),
  proofStatus:humanReviewed?'REVIEWED_2D_LABELS_ONLY':'UNREVIEWED_2D_LABELS_ONLY',
  fullBody3DIdentityVerified:false
 };
}
// Gaussian elimination with pivoting for 4-corner pixel -> measured XY (mm).
function solve8(a,b){
 const matrix=a.map((r,i)=>[...r,b[i]]);
 for(let col=0;col<8;col++){
  let pivot=col;
  for(let j=col+1;j<8;j++)
   if(Math.abs(matrix[j][col])>Math.abs(matrix[pivot][col]))pivot=j;
  if(Math.abs(matrix[pivot][col])<1e-9)fail('DEGENERATE_REFERENCE_QUADRILATERAL');
  [matrix[col],matrix[pivot]]=[matrix[pivot],matrix[col]];
  const k=matrix[col][col];
  for(let j=col;j<=8;j++)matrix[col][j]/=k;
  for(let i=0;i<8;i++)if(i!==col){
   const q=matrix[i][col];
   for(let j=col;j<=8;j++)matrix[i][j]-=q*matrix[col][j];
  }
 }
 return matrix.map(row=>row[8]);
}
export function mapAIG26PixelToMeasuredMM(homography,p){
 if(!Array.isArray(homography)||homography.length!==8||
  homography.some(v=>!finite(v))||!point(p))fail('METRIC_MAP_INPUT_INVALID');
 const [x,y]=p,[a,b,c,d,e,f,g,h]=homography;
 const denominator=g*x+h*y+1;
 if(!finite(denominator)||Math.abs(denominator)<1e-10)
  fail('PROJECTIVE_HORIZON_NOT_ON_REFERENCE_PLANE');
 return [(a*x+b*y+c)/denominator,(d*x+e*y+f)/denominator];
}
/** Four measured planar corners PLUS an independent 5th physical checkpoint. */
export function calibrateAIG26PlanarReference({
 width,height,sourceSha256,referenceId,referenceSource,
 cornersPx,widthMm,heightMm,checkPointPx,checkPointMm
}={}){
 if(!validImage(width,height)||!sha(sourceSha256)||
  typeof referenceId!=='string'||!referenceId.trim()||
  referenceId.length>120||
  !['USER_MEASURED','CAD_DIMENSION_AUTHORITY'].includes(referenceSource)||
  !Array.isArray(cornersPx)||cornersPx.length!==4||
  !cornersPx.every(p=>inImage(p,width,height))||
  !finite(widthMm)||!finite(heightMm)||widthMm<=0||heightMm<=0||
  widthMm>1e7||heightMm>1e7||
  !inImage(checkPointPx,width,height)||!point(checkPointMm))
  fail('REAL_PHYSICAL_REFERENCE_REQUIRED');
 // TL,TR,BR,BL must form one strictly convex planar image quadrilateral.
 const crosses=cornersPx.map((p,i)=>{
  const q=cornersPx[(i+1)%4],r=cornersPx[(i+2)%4];
  return (q[0]-p[0])*(r[1]-q[1])-(q[1]-p[1])*(r[0]-q[0]);
 });
 if(crosses.some(c=>Math.abs(c)<8)||crosses.some(c=>c*crosses[0]<=0))
  fail('CORNERS_NOT_CONVEX_OR_WRONGLY_ORDERED');
 const physical=[[0,0],[widthMm,0],[widthMm,heightMm],[0,heightMm]];
 const A=[],B=[];
 for(let i=0;i<4;i++){
  const [x,y]=cornersPx[i],[X,Y]=physical[i];
  A.push([x,y,1,0,0,0,-x*X,-y*X]);B.push(X);
  A.push([0,0,0,x,y,1,-x*Y,-y*Y]);B.push(Y);
 }
 const H=solve8(A,B);
 for(let i=0;i<4;i++){
  const p=mapAIG26PixelToMeasuredMM(H,cornersPx[i]);
  if(Math.hypot(p[0]-physical[i][0],p[1]-physical[i][1])>
    Math.max(widthMm,heightMm)*1e-5)fail('PLANAR_HOMOGRAPHY_UNSTABLE');
 }
 const measured=mapAIG26PixelToMeasuredMM(H,checkPointPx);
 const residualMm=Math.hypot(measured[0]-checkPointMm[0],
  measured[1]-checkPointMm[1]);
 const thresholdMm=Math.max(.02,Math.hypot(widthMm,heightMm)*.005);
 if(residualMm>thresholdMm)fail('INDEPENDENT_MEASURED_CHECKPOINT_MISMATCH');
 return {
  schema:AIG26_SCHEMA,sourceSha256,referenceId,referenceSource,
  sourceImage:[width,height],actualReferenceMm:[widthMm,heightMm],
  imageReferenceCorners:cornersPx.map(p=>[...p]),homographyPxToPlaneMm:H,
  independentCheckPointPx:[...checkPointPx],
  independentCheckPointMeasuredMm:[...checkPointMm],
  independentResidualMm:+residualMm.toFixed(6),
  independentMaxResidualMm:+thresholdMm.toFixed(6),
  calibratedSourcePlaneOnly:true,all3DObjectsPhysicallyMeasured:false,
  hiddenPersonDimensionsMeasured:false,
  perspectiveCorrectionApplied:true,
  coordinateStoragePrecisionMm:.001,
  measurementAccuracyGuaranteedMm001:false,
  status:'MEASURED_REFERENCE_PLANE_VALIDATED_NOT_FULL_3D_1_TO_1'
 };
}
/** IEC 61966-2-1 sRGB transfer, NOT gamma=2.2 approximation. */
export function aig26SRGBToLinear(s){
 if(!finite(s)||s<0||s>1)fail('SRGB_INPUT_RANGE_INVALID');
 return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;
}
export function aig26LinearToSRGB(v){
 if(!finite(v)||v<0||v>1)fail('LINEAR_RGB_OUT_OF_GAMUT');
 return v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;
}
export function calibrateAIG26NeutralPatch({
 sourceSha256,sampleRGB,knownNeutralRGB=[128,128,128],
 samplePx,width,height
}={}){
 if(!sha(sourceSha256)||!validImage(width,height)||
  !inImage(samplePx,width,height)||
  !Array.isArray(sampleRGB)||sampleRGB.length!==3||
  !Array.isArray(knownNeutralRGB)||knownNeutralRGB.length!==3||
  [...sampleRGB,...knownNeutralRGB].some(c=>!Number.isInteger(c)||c<8||c>247)||
  Math.max(...knownNeutralRGB)-Math.min(...knownNeutralRGB)>1)
  fail('MEASURED_NEUTRAL_PATCH_SOURCE_REQUIRED');
 const lin=sampleRGB.map(c=>aig26SRGBToLinear(c/255));
 const intended=knownNeutralRGB.map(c=>aig26SRGBToLinear(c/255));
 const gains=lin.map((c,i)=>intended[i]/c);
 if(gains.some(g=>!finite(g)||g<.35||g>3))
  fail('NEUTRAL_PATCH_COLOR_CORRECTION_UNSTABLE');
 return {
  schema:AIG26_SCHEMA,sourceSha256,samplePx:[...samplePx],
  measuredSampleRGB:[...sampleRGB],referenceNeutralRGB:[...knownNeutralRGB],
  perChannelLinearGains:gains,
  transfer:'IEC_61966_2_1_sRGB_LINEAR_LIGHT',
  neutralSampleOnly:true,
  calibratedDisplayICCVerified:false,spectralColorAccuracyVerified:false,
  outputColorSpace:'SRGB',sourcePixelsPreserved:true,
  status:'LINEAR_WHITE_BALANCE_ESTIMATED_NOT_CERTIFIED_TRUE_COLOR'
 };
}
export function applyAIG26ColorToRGBA(pixels,profile){
 if(!(pixels instanceof Uint8ClampedArray)||pixels.length<4||
  pixels.length%4||!profile||profile.schema!==AIG26_SCHEMA||
  !Array.isArray(profile.perChannelLinearGains)||
  profile.perChannelLinearGains.length!==3)
  fail('SOURCE_PIXELS_AND_COLOR_PROFILE_REQUIRED');
 const out=new Uint8ClampedArray(pixels.length);
 let clipped=0;
 for(let i=0;i<pixels.length;i+=4){
  for(let k=0;k<3;k++){
   const v=aig26SRGBToLinear(pixels[i+k]/255)*
    profile.perChannelLinearGains[k];
   if(v>1)clipped++;
   out[i+k]=Math.round(255*aig26LinearToSRGB(clamp(v,0,1)));
  }
  out[i+3]=pixels[i+3];
 }
 return {pixels:out,clippedChannels:clipped,
  sourcePixelsUnmodified:true,displayICCProofUnavailable:true};
}
