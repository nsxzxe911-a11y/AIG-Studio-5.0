import * as THREE from 'three';

/** FastModel 2.9 evidence guide. World +/-Z and +/-X labels are not an
 * automatic anatomical front/left/right determination of an arbitrary GLB.
 * A source SHA alone cannot confer "approved heroine" status.
 */
export const REVIEW_DIRECTIONS=Object.freeze([
 Object.freeze({key:'positive-z',name:'＋Z 方向（前側候選）',axis:[0,0,1]}),
 Object.freeze({key:'positive-x',name:'＋X 方向（側面候選）',axis:[1,0,0]}),
 Object.freeze({key:'negative-z',name:'－Z 方向（背側候選）',axis:[0,0,-1]}),
 Object.freeze({key:'negative-x',name:'－X 方向（另一側候選）',axis:[-1,0,0]})
]);
export const REVIEW_POSE_FRACTIONS=Object.freeze([0,.25,.5,.75]);
export function reviewCameraPose(bounds,key){
 if(!bounds?.isBox3||bounds.isEmpty())throw Error('REVIEW_BOUNDS_REQUIRED');
 const direction=REVIEW_DIRECTIONS.find(x=>x.key===key);
 if(!direction)throw Error('REVIEW_ANGLE_INVALID');
 const center=bounds.getCenter(new THREE.Vector3());
 const size=bounds.getSize(new THREE.Vector3());
 const radius=Math.max(size.x,size.y,size.z,.01);
 const distance=radius*1.95;
 const pos=center.clone().add(new THREE.Vector3(...direction.axis).multiplyScalar(distance));
 pos.y+=radius*.08;
 return {position:pos,target:center,near:Math.max(radius/1000,1e-4),far:Math.max(radius*100,10),
   direction:direction.key,label:direction.name,sourceGeometryCentered:true};
}
export function reviewPoseTime(clip,fraction){
 if(!REVIEW_POSE_FRACTIONS.includes(fraction))throw Error('REVIEW_FRACTION_INVALID');
 if(!clip)return {timeSeconds:0,animated:false};
 if(!Number.isFinite(clip.duration)||clip.duration<=0)throw Error('REVIEW_CLIP_DURATION_INVALID');
 return {timeSeconds:clip.duration*fraction,animated:true};
}
export function reviewEvidenceManifest({sourceSha256,clipName=null,timeSeconds=0,views=[],audit=null}={}){
 if(!/^[a-f0-9]{64}$/i.test(sourceSha256||''))throw Error('REVIEW_SHA_REQUIRED');
 if(!Number.isFinite(timeSeconds)||timeSeconds<0)throw Error('REVIEW_TIME_INVALID');
 const have=new Set(views.map(v=>v.key));
 const allViews=REVIEW_DIRECTIONS.every(x=>have.has(x.key));
 return {
  schema:'AIG_HEROINE_VISUAL_EVIDENCE_2_9',
  sourceSha256:sourceSha256.toLowerCase(),clipName,timeSeconds,viewCount:views.length,
  worldAxisViewKeys:views.map(v=>v.key),allFourViewsCaptured:allViews,
  sampledTriangleOverlapCount:audit?.coincidentTrianglePairs??null,
  sampledWeightIssues:audit?.skinningVertexIssues??null,
  sampledAnatomyTagsAvailable:audit?.anatomyTagsAvailable??false,
  checkedTriangles:audit?.checkedTriangles??0,scanIncomplete:audit?.incomplete??true,
  approvedHeroineSourceVerified:false,visualHumanReviewPassed:false,
  exactHeadNeckWeldProven:false,hairPenetrationFreeProven:false,
  nativeWindowsAndroidFps60Verified:false,
  acceptance:'BLOCKED_REAL_HEROINE_AND_MANUAL_VISUAL_QA',
  notes:'Only captured source model viewpoints and bounded pose-space geometry. +Z front is a candidate; world-axis directions may not match character anatomy. No scene geometry or source GLB was edited.'
 };
}
