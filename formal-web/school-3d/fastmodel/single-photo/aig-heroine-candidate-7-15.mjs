/**
 * FastModel 7.15-A: one-photo heroine editable 3D CANDIDATE, not scanner truth.
 * User-reviewed semantic/color from 7.14 -> conservative edge-separated
 * hair/face/neck masks -> RELATIVE image-prior depth -> labeled 3D mesh
 * and editable 2D-anchored skeleton/garment surfaces.
 *
 * Invariant: estimated depth is UNIT-LESS and never substituted for
 * 7.13 stereo millimetres. No guessed backface, true skinning or rig proof.
 */
import {AIG714_LABELS} from './aig-heroine-scan-7-14.mjs';
export const AIG715_SCHEMA='AIG_FASTMODEL_7_15A_EDITABLE_HEROINE_DEPTH_CANDIDATE';
const finite=Number.isFinite,UNKNOWN=AIG714_LABELS.UNKNOWN;
const partNames=Object.keys(AIG714_LABELS);
const clothing=['JACKET','SHIRT','SKIRT','BAG','ACCESSORY'];
const prominence={HAIR:.18,FACE:.24,NECK:.03,JACKET:-.01,SHIRT:.015,
 SKIRT:-.055,SKIN:.09,BAG:-.16,ACCESSORY:.06};
const err=s=>{throw Error('AIG715_'+s)};
function verify(image,regions){
 const w=image?.width,h=image?.height;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<32||h<32||w*h>640*480||
  !(image.data instanceof Uint8ClampedArray||image.data instanceof Uint8Array)||
  image.data.length!==4*w*h||regions?.schema!=='AIG714_REVIEWED_SEED_RGB_REGION_V1'||
  regions.width!==w||regions.height!==h||regions.labels?.length!==w*h||
  regions.confidence?.length!==w*h)
  err('REVIEWED_SOURCE_RGB_AND_MASK_REQUIRED');
 return [w,h];
}
const lum=(p,i)=>.2126*p[i*4]+.7152*p[i*4+1]+.0722*p[i*4+2];
const boolNum=n=>finite(n)&&n>=0&&n<=1;
const JOINTS=[
 ['pelvis',null,.50,.70],['spine','pelvis',.50,.55],
 ['chest','spine',.50,.38],['neck','chest',.50,.26],
 ['head','neck',.50,.16],
 ['shoulderL','chest',.38,.38],['elbowL','shoulderL',.30,.52],['wristL','elbowL',.27,.66],
 ['shoulderR','chest',.62,.38],['elbowR','shoulderR',.70,.52],['wristR','elbowR',.73,.66],
 ['hipL','pelvis',.44,.72],['kneeL','hipL',.43,.86],['ankleL','kneeL',.43,.97],
 ['hipR','pelvis',.56,.72],['kneeR','hipR',.57,.86],['ankleR','kneeR',.57,.97]
];
export function buildAIG715HeroineCandidate(image,regions,{
 gridStep=4,edgeThreshold=24,minimumRegionConfidence=.16,
 stereo=null,sourceDigest=null
}={}){
 const [w,h]=verify(image,regions),n=w*h;
 if(!Number.isInteger(gridStep)||gridStep<2||gridStep>12||
  !finite(edgeThreshold)||edgeThreshold<5||edgeThreshold>90||
  !boolNum(minimumRegionConfidence)||minimumRegionConfidence<.02||
  minimumRegionConfidence>.8||
  (sourceDigest!==null&&!/^sha256:[a-f0-9]{64}$/.test(sourceDigest)))
  err('BOUNDED_RECONSTRUCTION_SETTINGS_REQUIRED');
 if(stereo!==null&&(
  stereo.schema!=='AIG_FASTMODEL_7_13_METRIC_RECTIFIED_STEREO_MESH_MM'||
  stereo.uvs?.length!==stereo.vertexCount*2||
  stereo.positions?.length!==stereo.vertexCount*3||
  stereo.confidence?.length!==stereo.vertexCount))
  err('UNTRUSTED_STEREO_MEASUREMENT_BLOCKED');
 const refined=new Uint8Array(n),semanticConfidence=new Float32Array(n),
  depthEstimated=new Float32Array(n),estimatedConfidence=new Float32Array(n),
  estimatedValid=new Uint8Array(n),depthMeasuredMm=new Float32Array(n),
  measuredConfidence=new Float32Array(n),measuredValid=new Uint8Array(n),
  sourceRGB=new Uint8Array(n*3);
 // Explicit invalid depth values: never encode unknown as 0.000mm.
 depthEstimated.fill(NaN);depthMeasuredMm.fill(NaN);
 const masks=regions.labels,conf=regions.confidence,data=image.data;
 const count=Object.fromEntries(partNames.map(p=>[p,0]));
 // Base geometry: original semantic mask remains untouched. Colored
 // hair/face/neck boundaries lose confidence rather than bleeding into
 // another body part. Does NOT assert exact pixel-perfect segmentation.
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const i=y*w+x,k=4*i,label=masks[i],raw=conf[i]/255;
  if(label===UNKNOWN||label===AIG714_LABELS.BACKGROUND||
   data[k+3]<240||raw<minimumRegionConfidence)continue;
  const neighbors=[i-1,i+1,i-w,i+w];let edge=false,contr=0;
  for(const j of neighbors){
   if(masks[j]!==label)edge=true;
   contr=Math.max(contr,Math.abs(lum(data,i)-lum(data,j)));
  }
  const boundary=label===AIG714_LABELS.HAIR||
   label===AIG714_LABELS.FACE||label===AIG714_LABELS.NECK;
  const certainty=raw*(edge?(boundary?.45:.7):1)*
   (contr>edgeThreshold?(boundary?.65:.8):1);
  if(certainty<minimumRegionConfidence)continue;
  refined[i]=label;semanticConfidence[i]=Math.min(1,certainty);
  count[partNames.find(p=>AIG714_LABELS[p]===label)]++;
  sourceRGB.set(data.subarray(k,k+3),3*i);
  // A depth hypothesis (normalized relative displacement), NOT mm.
  // Tiny rounded relief helps preview orientation but physical depth
  // must be determined by a calibrated camera or additional views.
  const centered=(x-(w-1)/2)/w,vertical=(y-(h-1)/2)/h;
  const bulge=.055*(1-Math.min(1,Math.abs(centered)*3))+
   .015*(1-Math.min(1,Math.abs(vertical)*3));
  depthEstimated[i]=prominence[partNames.find(p=>AIG714_LABELS[p]===label)] + bulge;
  estimatedConfidence[i]=Math.min(.28,certainty*.35);
  estimatedValid[i]=1;
 }
 // Stereo stays a SEPARATE channel. Only source-provided triangulated
 // camera-space metric mm can mark a pixel physically measured.
 let validStereo=0;
 if(stereo){
  for(let i=0;i<stereo.vertexCount;i++){
   const u=stereo.uvs[i*2],v=stereo.uvs[i*2+1],
    z=stereo.positions[i*3+2],quality=stereo.confidence[i];
   if(!finite(u)||!finite(v)||u<0||u>1||v<0||v>1||
    !finite(z)||z<=0||!boolNum(quality)||quality<.1)continue;
   const x=Math.round(u*(w-1)),y=Math.round((1-v)*(h-1)),at=y*w+x;
   if(!refined[at]||quality<=measuredConfidence[at])continue;
   depthMeasuredMm[at]=z;measuredConfidence[at]=quality;
   measuredValid[at]=1;validStereo++;
  }
 }
 // True distinct editable meshes: hair, face, neck and each cloth group
 // NEVER share an index across mask seam. Grid sample prevents creating
 // triangles across unknown areas or unverified joint intersections.
 const buckets=new Map(),widthCells=Math.floor((w-1)/gridStep),
  heightCells=Math.floor((h-1)/gridStep);
 for(let cy=0;cy<heightCells;cy++)for(let cx=0;cx<widthCells;cx++){
  const x=cx*gridStep,y=cy*gridStep;
  const pixels=[y*w+x,y*w+x+gridStep,(y+gridStep)*w+x,
   (y+gridStep)*w+x+gridStep],label=refined[pixels[0]];
  if(!label||pixels.some(i=>refined[i]!==label))continue;
  const key=partNames.find(p=>AIG714_LABELS[p]===label);
  if(!buckets.has(key))buckets.set(key,{positions:[],uv:[],rgb:[],confidence:[],triangles:0});
  const part=buckets.get(key),append=i=>{
   const xx=i%w,yy=Math.floor(i/w),z=depthEstimated[i];
   part.positions.push(xx/(w-1)-.5,.5-yy/(h-1),z);
   part.uv.push(xx/(w-1),1-yy/(h-1));
   part.rgb.push(...sourceRGB.subarray(i*3,i*3+3));
   part.confidence.push(estimatedConfidence[i]);
  };
  for(const j of [0,2,1,1,2,3])append(pixels[j]);
  part.triangles+=2;
 }
 const groups=Object.fromEntries([...buckets.entries()].map(([key,v])=>[key,{
  positions:Float32Array.from(v.positions),
  uv:Float32Array.from(v.uv),rgb:Uint8Array.from(v.rgb),
  confidence:Float32Array.from(v.confidence),triangles:v.triangles,
  category:clothing.includes(key)?'INDEPENDENT_CLOTH_DRAFT':'SEPARATE_CHARACTER_SURFACE',
  realWorldThicknessKnown:false
 }]));
 const rig=Object.freeze(JOINTS.map(([name,parent,x,y])=>Object.freeze({
  name,parent,x,y,zEstimate:null,depthSource:'UNOBSERVED_JOINT_CANDIDATE',
  confirmed:false,visibleInSource:false,editable:true
 })));
 return Object.freeze({
  schema:AIG715_SCHEMA,width:w,height:h,sourceDigest,
  reviewedLabels:refined,semanticConfidence,sourceRGB,
  depth_estimated:Object.freeze({
   values:depthEstimated,valid:estimatedValid,confidence:estimatedConfidence,
   units:'NORMALIZED_RELATIVE_NOT_MM',source_type:'SINGLE_IMAGE_ESTIMATE',
   method:'DETERMINISTIC_GEOMETRIC_VISUAL_PRIOR_NOT_LEARNED_TRUE_DEPTH',
   validPixels:estimatedValid.reduce((a,v)=>a+v,0)
  }),
  depth_measured:Object.freeze({
   values:depthMeasuredMm,valid:measuredValid,confidence:measuredConfidence,
   units:'MM_LEFT_CAMERA_DEPTH',source_type:'CALIBRATED_STEREO_MEASURED',
   validPixels:measuredValid.reduce((a,v)=>a+v,0),
   leftSHA256:stereo?.leftSHA256??null,
   rightSHA256:stereo?.rightSHA256??null,
   sourceStereoCalibrationTrusted:Boolean(stereo)
  }),
  skeletonCandidate:rig,geometryGroups:groups,regionCounts:count,
  geometricMeshUnits:'NORMALIZED_IMAGE_COORDINATES_NOT_PHYSICAL_METRES',
  estimatedAndMeasuredStoredSeparately:true,
  hiddenBodyBacksideNotConstructed:true,
  dressGeometryIndependentOfFaceAndNeck:true,
  characterSkinningWeightsCertified:false,
  realHumanOneToOneVerified:false
 });
}
export function editAIG715Joint(candidate,jointName,{x,y,confirmed=false}={}){
 if(candidate?.schema!==AIG715_SCHEMA||
  !candidate.skeletonCandidate.some(j=>j.name===jointName)||
  !boolNum(x)||!boolNum(y)||typeof confirmed!=='boolean')
  err('VALID_EDITABLE_JOINT_REQUIRED');
 // Copy-on-write keeps source plan and all other joints unchanged.
 const joints=candidate.skeletonCandidate.map(j=>j.name===jointName?
  Object.freeze({...j,x,y,confirmed,visibleInSource:confirmed,
   depthSource:'USER_PLACED_2D_NOT_MEASURED_3D'}):j);
 return Object.freeze({...candidate,skeletonCandidate:Object.freeze(joints)});
}
export function summarizeAIG715Candidate(candidate){
 if(candidate?.schema!==AIG715_SCHEMA)err('CANDIDATE_REQUIRED');
 return {
  schema:candidate.schema,width:candidate.width,height:candidate.height,
  sourceDigest:candidate.sourceDigest,
  depthEstimated:{source_type:candidate.depth_estimated.source_type,
   units:candidate.depth_estimated.units,validPixels:candidate.depth_estimated.validPixels},
  depthMeasured:{source_type:candidate.depth_measured.source_type,
   units:candidate.depth_measured.units,validPixels:candidate.depth_measured.validPixels,
   leftSHA256:candidate.depth_measured.leftSHA256,
   rightSHA256:candidate.depth_measured.rightSHA256},
  meshParts:Object.fromEntries(Object.entries(candidate.geometryGroups)
   .map(([k,v])=>[k,{triangles:v.triangles,category:v.category,
    physicalThicknessVerified:false}])),
  skeleton:candidate.skeletonCandidate.map(j=>({...j})),
  realHumanOneToOneVerified:false,fullBodyHiddenSurfacesUnknown:true
 };
}
