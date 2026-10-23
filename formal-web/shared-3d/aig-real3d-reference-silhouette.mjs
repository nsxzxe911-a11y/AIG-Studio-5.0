/** Real3D four-angle source image silhouettes comparison.
 * Requires already-matted RGBA PNG alpha, not a normal opaque photo.
 * Comparisons only: never certify a real person, matching identity or likeness.
 */
export const AIG_SILHOUETTE_COMPARE_SCHEMA='AIG_REAL3D_STRICT_FOUR_VIEW_SILHOUETTE_COMPARE_V1';
const ANGLES=Object.freeze(['front','side','back','threeQuarter']);
const RGBA_BYTES_PER_PIXEL=4;
const byte=v=>Number.isInteger(v)&&v>=0&&v<=255;
const alphaMask=(pixels,p)=>pixels[p*4+3]>=128;
const renderedMask=(pixels,p,bg)=>{
 const i=p*4;
 return pixels[i+3]>=250&&
  (Math.abs(pixels[i]-bg[0])+Math.abs(pixels[i+1]-bg[1])+
   Math.abs(pixels[i+2]-bg[2]))>78;
};
function validPixels(pixels,w,h){
 return Number.isInteger(w)&&Number.isInteger(h)&&w>100&&h>100&&
  w*h<=3200000&&pixels instanceof Uint8ClampedArray&&
  pixels.length===w*h*RGBA_BYTES_PER_PIXEL;
}
export function compareAIGReal3DSilhouetteRGBA({
 sourcePixels,referencePixels,width,height,
 angle,modelSHA,referenceSHA,backgroundRGB=[196,190,179]
}={}){
 if(!validPixels(sourcePixels,width,height)||
 !validPixels(referencePixels,width,height))
  throw Error('SILHOUETTE_PIXEL_DIMENSIONS_MISMATCH');
 if(!ANGLES.includes(angle))throw Error('SILHOUETTE_CAMERA_ANGLE_INVALID');
 if(![modelSHA,referenceSHA].every(s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s)))
  throw Error('SILHOUETTE_SOURCE_SHA_REQUIRED');
 if(!Array.isArray(backgroundRGB)||backgroundRGB.length!==3||
 !backgroundRGB.every(byte))throw Error('SILHOUETTE_BACKGROUND_INVALID');
 const count=width*height;
 let referenceCount=0,modelCount=0,intersection=0,union=0;
 let noAlpha=0;
 const image=new Uint8ClampedArray(count*4);
 // Strict raw image-space 1:1 alignment. NO auto-fit, aspect crop,
 // scaling or silhouette inflation to improve the score.
 for(let p=0;p<count;p++){
  const ref=alphaMask(referencePixels,p);
  const gpu=renderedMask(sourcePixels,p,backgroundRGB);
  if(referencePixels[p*4+3]===255)noAlpha++;
  if(ref)referenceCount++;
  if(gpu)modelCount++;
  if(ref&&gpu)intersection++;
  if(ref||gpu)union++;
  const i=p*4;
  const rgb=ref&&gpu?[148,107,76]:
   ref?[54,33,25]:gpu?[185,132,95]:backgroundRGB;
  image[i]=rgb[0];image[i+1]=rgb[1];image[i+2]=rgb[2];image[i+3]=255;
 }
 // An ordinary JPG or fully opaque PNG has no reliable alpha silhouette.
 if(noAlpha/count>.985||
 referenceCount/count<.004||referenceCount/count>.92)
  throw Error('SILHOUETTE_TRANSPARENT_REFERENCE_REQUIRED');
 if(modelCount/count<.004||modelCount/count>.92)
  throw Error('SILHOUETTE_GPU_SUBJECT_EMPTY_OR_OVERSIZED');
 const iou=intersection/Math.max(1,union),dice=2*intersection/
  Math.max(1,modelCount+referenceCount);
 return {
  schema:AIG_SILHOUETTE_COMPARE_SCHEMA,angle,width,height,
  modelSHA,referenceSHA,renderedSubjectPixels:modelCount,
  transparentReferenceSubjectPixels:referenceCount,
  foregroundIntersectionPixels:intersection,
  foregroundUnionPixels:union,
  absoluteForegroundAreaDifferencePercent:+(Math.abs(modelCount-referenceCount)/
    referenceCount*100).toFixed(3),
  intersectionOverUnion:+iou.toFixed(6),
  diceCoefficient:+dice.toFixed(6),
  alignment:'STRICT_SAME_1080x1920_ORIGINAL_PIXELS_NO_AUTO_FIT',
  outputOverlayRGBA:image,
  referenceBackgroundVerifiedTransparent:true,
  photoSegmentationPerformed:false,
  confidenceIsNotAnatomicalHumanApproval:true,
  naturalHumanAppearancePASS:false,
  identityLikenessVerified:false
 };
}
export function evaluateAIGReal3DFourViewComparisons(comparisons=[]){
 if(!Array.isArray(comparisons)||comparisons.length>4)
  throw Error('SILHOUETTE_COMPARISON_COUNT');
 const found=new Set();
 for(const item of comparisons){
  if(!item||item.schema!==AIG_SILHOUETTE_COMPARE_SCHEMA||
    !ANGLES.includes(item.angle)||found.has(item.angle))
   throw Error('SILHOUETTE_COMPARISON_INVALID');
  found.add(item.angle);
 }
 const missingAngles=ANGLES.filter(a=>!found.has(a));
 const allFour=missingAngles.length===0;
 const modelHashes=[...new Set(comparisons.map(x=>x.modelSHA))];
 return {
  schema:'AIG_REAL3D_FOUR_VIEW_SOURCE_REFERENCE_DIAGNOSTIC_V1',
  count:comparisons.length,allFourAnglesCompared:allFour,
  missingAngles,
  sourceSHAConsistent:modelHashes.length<=1,
  averageIoU:comparisons.length?
   +(comparisons.reduce((sum,x)=>sum+x.intersectionOverUnion,0)/
     comparisons.length).toFixed(6):null,
  geometricImageOverlayCompleted:allFour,
  automatedAnatomicalApproval:false,
  fullHumanGeometryAndLikenessPASS:false,
  releasePASS:false
 };
}
