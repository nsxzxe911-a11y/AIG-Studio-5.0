/**
 * Real3D 3.4: image-pixel OBSERVED hand/foot silhouettes constrain the
 * Real3D 3.3 implicit 3D fingers/toes. No more fixed five-digit lengths when
 * five source-labelled protrusions are demonstrably visible in one photo.
 * A single photo provides XY silhouette evidence, NEVER metric depth, nail
 * geometry, individual finger identity, or measured actual 3D length.
 */
export const AIG34_SCHEMA='AIG_REAL3D_3_4_SOURCE_PIXEL_FIVE_TIP_CONSTRAINT_V1';
export const AIG34_GROUP_CLASSES=Object.freeze({
 leftHand:8,rightHand:9,leftFoot:12,rightFoot:13
});
const fail=m=>{throw Error('AIG34_'+m)};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const sha=s=>typeof s==='string'&&/^sha256:[0-9a-f]{64}$/.test(s);
const DIGITS=['thumb','index','middle','ring','little'];
function rowRuns(labels,width,y,id,left,right){
 const runs=[];let from=-1;
 for(let x=left;x<=right+1;x++){
  const yes=x<=right&&labels[y*width+x]===id;
  if(yes&&from<0)from=x;
  if(!yes&&from>=0){runs.push([from,x-1]);from=-1}
 }
 return runs;
}
export function detectAIG34FiveDigitContours({
 width,height,labels,pixels,sourceSha256,group
}={}){
 if(!sha(sourceSha256)||!Number.isInteger(width)||
  !Number.isInteger(height)||width<128||height<128||
  width*height>2_000_000||
  !(labels instanceof Uint8Array)||labels.length!==width*height||
  !(pixels instanceof Uint8ClampedArray)||pixels.length!==width*height*4||
  !Object.hasOwn(AIG34_GROUP_CLASSES,group))
  fail('VERIFIED_2D_SOURCE_SHA_AND_RGBA_REQUIRED');
 const id=AIG34_GROUP_CLASSES[group];
 let minX=width,minY=height,maxX=-1,maxY=-1,count=0;
 for(let i=0;i<labels.length;i++)if(labels[i]===id){
  const x=i%width,y=Math.floor(i/width);
  minX=Math.min(x,minX);maxX=Math.max(x,maxX);
  minY=Math.min(y,minY);maxY=Math.max(y,maxY);count++;
 }
 const basic={schema:AIG34_SCHEMA,group,sourceSha256,
  sourceClassId:id,sourceRegionPixelCount:count,
  sourceBoundingBox:maxX>=0?[minX,minY,maxX,maxY]:null,
  independentVisibleTips:0,
  automaticModelInference:false,observedPixelSilhouetteOnly:true,
  actual3DDepthMeasured:false,sourcePhotoUnchanged:true,
  userIndividualFingerIdentityVerified:false,
  releaseAllowed:false};
 if(count<120||maxX-minX<24||maxY-minY<25)
  return {...basic,status:'NO_DISTINCT_SOURCE_HAND_OR_FOOT_REGION',
   tips:[],safeForGeometryConstraint:false};
 const h=maxY-minY+1,span=maxX-minX+1;
 let best=null;
 // Find an actual scanline on the distal HALF (image y increases down).
 // Five disconnected runs of sufficient width, separated by true background.
 // If the real photo is perspective-rotated or fingers are occluded, fail
 // conservatively rather than assigning false individual fingers.
 for(let y=minY+Math.floor(h*.39);y<=maxY-Math.max(10,Math.ceil(h*.13));y++){
  const all=rowRuns(labels,width,y,id,minX,maxX);
  const candidates=all.filter(([a,b])=>b-a+1>=2&&
   b-a+1<=Math.floor(span*.29));
  if(candidates.length!==5||all.length!==5)continue;
  const centers=candidates.map(([a,b])=>(a+b)*.5);
  const coverage=centers.at(-1)-centers[0];
  if(coverage<span*.42)continue;
  const gaps=candidates.slice(1).map(([a],i)=>a-candidates[i][1]-1);
  if(gaps.some(g=>g<1))continue;
  const score=y+Math.min(8,coverage/span*10);
  if(!best||score>best.score)best={score,y,runs:candidates,centers,gaps};
 }
 if(!best)return {...basic,status:'FIVE_INDEPENDENT_VISIBLE_TIPS_NOT_PROVEN',
  tips:[],safeForGeometryConstraint:false};
 const tips=[];
 for(let digit=0;digit<5;digit++){
  const [left,right]=best.runs[digit],x=(left+right)*.5;
  let endY=best.y,support=0,tipX=x;
  // Trace visible source pixels downward using local continuity, without
  // filling class gaps, inventing a fingertip, or assuming hidden pixels.
  for(let y=best.y;y<=Math.min(maxY,best.y+Math.ceil(h*.55));y++){
   let minDistance=Infinity,chosen=-1;
   for(let xx=Math.max(minX,Math.floor(tipX-2));xx<=Math.min(maxX,Math.ceil(tipX+2));xx++){
    if(labels[y*width+xx]!==id)continue;
    const delta=Math.abs(xx-tipX);
    if(delta<minDistance){minDistance=delta;chosen=xx}
   }
   if(chosen<0)break;
   tipX=chosen;endY=y;support++;
  }
  if(support<Math.max(4,Math.floor(h*.07)))
   return {...basic,status:'INSUFFICIENT_CONTINUOUS_TIP_PIXEL_SUPPORT',
    tips:[],safeForGeometryConstraint:false};
  const k=(endY*width+tipX)*4;
  if(pixels[k+3]<128)
   return {...basic,status:'TRANSPARENT_SOURCE_PIXEL_NOT_SUPPORTED',
    tips:[],safeForGeometryConstraint:false};
  tips.push({
   // Left-to-right order is an UNIDENTIFIED tip slot, not thumb/index ID.
   slot:digit,sourcePixelTip:[tipX,endY],
   sourcePixelWitness:[x,best.y],
   observedCrossSectionPx:right-left+1,
   actualSourceRGB:[pixels[k],pixels[k+1],pixels[k+2]],
   sourceTracePixels:support,
   physicallyMeasured3DDepth:false
  });
 }
 return {...basic,status:'FIVE_DISTINCT_SOURCE_2D_PROTRUSIONS',
  witnessedScanlinePx:best.y,
  actualDistinctBackgroundGapsPx:best.gaps,
  independentVisibleTips:tips.length,
  tips,safeForGeometryConstraint:true,
  leftToRightSlotIsAnatomicalIdentity:false};
}
/**
 * Constrain five already independently animated Real3D 3.3 line chains.
 * Only apply evidence in IMAGE PLANE: source tip x changes attachment
 * location, observed protrusion pixel length scales chain tangent lengths.
 * Retain all current 3.2 joint curl, inferred Z depth and rest original.
 */
export function constrainAIG34DigitPoseToPhoto({
 result,rig,constraints,photoWidth,photoHeight
}={}){
 if(result?.sourceSha256!==rig?.sourceSha256||
  !sha(result?.sourceSha256)||!Array.isArray(result?.meshes)||
  !Number.isInteger(photoWidth)||!Number.isInteger(photoHeight)||
  photoWidth<128||photoHeight<128||
  !Number.isFinite(rig?.anchoredBodyHeightRelativeUnits))
  fail('MATCHING_3D_SOURCE_AND_PHOTO_REQUIRED');
 if(!Array.isArray(constraints)||constraints.length>4)
  fail('MAX_FOUR_SOURCE_GROUP_CONSTRAINTS');
 const byGroup=new Map();
 for(const item of constraints){
  if(!Object.hasOwn(AIG34_GROUP_CLASSES,item?.group)||
   item.sourceSha256!==result.sourceSha256||
   !item.safeForGeometryConstraint||item.tips?.length!==5||
   byGroup.has(item.group))
   fail('FIVE_VERIFIED_TIPS_AND_SAME_SOURCE_SHA_REQUIRED');
  byGroup.set(item.group,item);
 }
 const cloned=result.meshes.map(m=>({
  ...m,positions:m.positions,indices:m.indices,
  actual3DJointXYZ:m.actual3DJointXYZ.map(p=>[...p])
 }));
 const changed=[];
 for(const [group,obs] of byGroup){
  const part=cloned.filter(m=>
   (m.side+(m.type==='hand'?'Hand':'Foot'))===group).sort((a,b)=>a.index-b.index);
  if(part.length!==5)fail('VISIBLE_SOURCE_3D_DIGITS_NOT_COMPLETE_'+group);
  const base=rig.sourceAnchors[group];
  if(!base)fail('MISSING_SOURCE_HAND_OR_FOOT_ANCHOR_'+group);
  const scale=rig.anchoredBodyHeightRelativeUnits/photoHeight;
  const worldX=p=>(p-(photoWidth-1)*.5)*scale;
  for(let i=0;i<5;i++){
   const m=part[i],tip=obs.tips[i];
   const points=m.actual3DJointXYZ;
   const orig=points[0],end=points.at(-1);
   const desiredX=worldX(tip.sourcePixelWitness[0]);
   const shiftX=desiredX-orig[0];
   // The source may be perspective-distorted or image crop mismatch.
   // Reject impossible projection jumps rather than silently snap fingers.
   if(Math.abs(shiftX)>rig.anchoredBodyHeightRelativeUnits*.22)
    fail('PROJECTED_DIGIT_BASE_TOO_FAR_FROM_SOURCE_BODY_'+group);
   const visibleLength=Math.max(1,
    tip.sourcePixelTip[1]-tip.sourcePixelWitness[1])*scale;
   const currentLength=Math.hypot(end[0]-orig[0],
    end[1]-orig[1],end[2]-orig[2]);
   const relative=clamp(visibleLength/Math.max(currentLength,1e-6),.72,1.45);
   const first=[orig[0]+shiftX,orig[1],orig[2]];
   const next=[first];
   for(let j=1;j<points.length;j++){
    const step=points[j].map((v,k)=>v-points[j-1][k]);
    next.push(next.at(-1).map((v,k)=>v+step[k]*relative));
   }
   m.actual3DJointXYZ=next;
   m.photoConstrainedSilhouette=true;
   m.photoProtrusionScale=relative;
   m.photoObservedWidthPx=tip.observedCrossSectionPx;
   m.sourceColorFromActualPixelRGB=tip.actualSourceRGB;
   m.unknownDepthStillUnmeasured=true;
   changed.push({id:m.id,sourceGroup:group,
    observedTipPx:tip.sourcePixelTip,actual3DTipXYZ:next.at(-1),
    photoProtrusionScale:relative,observedTipLabelIdentity:false});
  }
 }
 return {...result,meshes:cloned,
  sourcePhotoConstraintsActuallyApplied:changed.length,
  constrainedDigitIDs:changed,constrainedGroupCount:byGroup.size,
  surfaceSourceEvidence:'ACTUAL_MASK_XY_OUTLINE_ONLY_Z_UNMEASURED',
  sourcePhotoPixelsNotChanged:true,
  originalReal3D32ModelNotChanged:true,
  oneToOnePhysicalDepthVerified:false,
  humanLikenessApproved:false,releaseAllowed:false};
}
