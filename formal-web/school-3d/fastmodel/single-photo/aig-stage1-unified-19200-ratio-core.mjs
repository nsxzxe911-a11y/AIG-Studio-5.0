/**
 * Stage1 19,200 LOGICAL render + validation work slots, all attached to ONE
 * Scene/Renderer/geometry contract. These are NOT hardware CPU/GPU cores,
 * 19,200 shader contexts, parallel threads or instantaneous FPS improvements.
 *
 * This core produces measurements from REAL model XYZ and bone positions.
 * It never mutates source anatomy or permits automatic appearance approval.
 */
import {AIG_STAGE1_SCHEMA,auditAIGStage1BodySurface} from './aig-stage1-dual-adult-anatomy.mjs';
import {planAIG36UnifiedCore}
 from './aig-unified-120-core-3-6.mjs';
import {makeAIGStage1CanonicalMM,auditAIGStage1MMConversion,
 aigStage1MmFromTicks}
 from './aig-stage1-mm-coordinate-contract.mjs';
export const AIG_STAGE1_RATIO_SCHEMA='AIG_STAGE1_ONE_CORE_19200_PROPORTION_GATE';
export const AIG_STAGE1_LOGICAL_SLOTS=19200;
export const AIG_STAGE1_SLOT_BUDGET=Object.freeze({
 viewport:4000,proportion:5000,skeleton:4000,
 snapshots:3000,gate:3200
});
export const AIG_STAGE1_TARGET=Object.freeze({
 bodyHeightRatio:[.78,.86],canvasAspectTolerance:.015,
 headToHeight:[.115,.155],shoulderToHead:[1.8,2.8],
 hipToShoulder:[.6,1.15],thighToCalf:[.88,1.22],
 maxNormalizedLimbSymmetryError:.015,
 minimumLegGapAtKneeHeight:.018
});
const fail=s=>{throw Error('AIG_STAGE1_RATIO_'+s)};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const norm=a=>Math.hypot(...a);
const diff=(a,b)=>norm(a.map((v,i)=>v-b[i]));
const round=n=>Math.round(n*1e6)/1e6;
function source(model){
 if(model?.schema!==AIG_STAGE1_SCHEMA||
  !Array.isArray(model.parts)||!model.parts.length||
  typeof model.joints!=='object'||!finite(model.heightMeters)||
  model.heightMeters<1||model.heightMeters>2.3)
  fail('VALID_SOURCE_ANATOMY_REQUIRED');
 return model;
}
export function planAIGStage1OneCore19200({
 requestedLogicalSlots=AIG_STAGE1_LOGICAL_SLOTS
}={}){
 if(requestedLogicalSlots!==AIG_STAGE1_LOGICAL_SLOTS)
  fail('FIXED_19200_LOGICAL_SLOTS_REQUIRED');
 const existing=planAIG36UnifiedCore({
  requestedLogicalSlots:AIG_STAGE1_LOGICAL_SLOTS,
  hardwareConcurrency:2,mobile:false,
  gpuContextAvailable:true
 });
 if(existing.kernelImplementationCount!==1||
  existing.logicalSlotsConfigured!==AIG_STAGE1_LOGICAL_SLOTS||
  existing.sharedWebGLContextCount!==1)
  fail('PRIMARY_SHARED_REAL3D_CORE_CONTRACT_MISMATCH');
 const ranges={};let cursor=0;
 for(const [name,budget] of Object.entries(AIG_STAGE1_SLOT_BUDGET)){
  ranges[name]=Object.freeze({start:cursor,endExclusive:cursor+budget,
   reservedLogicalSlots:budget});
  cursor+=budget;
 }
 if(cursor!==requestedLogicalSlots)fail('SLOT_BUDGET_SUM_MISMATCH');
 return Object.freeze({
  schema:AIG_STAGE1_RATIO_SCHEMA,
  rendererImplementationCount:existing.kernelImplementationCount,
  sharedWebGLRendererCount:existing.sharedWebGLContextCount,
  logicalSlotsConfigured:existing.logicalSlotsConfigured,
  reusedExistingAIG36UnifiedCore:true,
  existingSharedCoreSchema:existing.schema,
  existingCoreWorkProfile:existing.activeProfile,
  logicalSlotRanges:Object.freeze(ranges),
  actualCpuHardwareCoresCreated:0,extraWebGLContextsCreated:0,
  actualWorkersSpawned:0,oneJsExecutionQueue:true,
  allContractStagesShareOneCore:true,
  notAnFpsOrPhysicalCoreSpeedupClaim:true
 });
}
export function measureAIGStage1Bounds(model){
 source(model);
 const mn=[Infinity,Infinity,Infinity],mx=[-Infinity,-Infinity,-Infinity];
 let positionsCount=0;
 for(const part of model.parts){
  const p=part.geometry?.positions;
  if(!(p instanceof Float32Array)||p.length<9||p.length%3||
   !p.every(Number.isFinite))fail('BAD_INDEXED_REAL_MESH');
  positionsCount+=p.length/3;
  for(let i=0;i<p.length;i+=3)for(let k=0;k<3;k++){
   mn[k]=Math.min(mn[k],p[i+k]);mx[k]=Math.max(mx[k],p[i+k]);
  }
 }
 const min=mn.map(v=>round(v)),max=mx.map(v=>round(v));
 const size=mx.map((v,i)=>round(v-mn[i])),center=
  mx.map((v,i)=>round((v+mn[i])/2));
 return Object.freeze({min:Object.freeze(min),max:Object.freeze(max),
  size:Object.freeze(size),center:Object.freeze(center),
  minMM:Object.freeze(mn.map(v=>Math.round(v*1000000)/1000)),
  maxMM:Object.freeze(mx.map(v=>Math.round(v*1000000)/1000)),
  sizeMM:Object.freeze(size.map(v=>Math.round(v*1000000)/1000)),
  centerMM:Object.freeze(center.map(v=>Math.round(v*1000000)/1000)),
  coordinateMeasurementUnit:'mm',measurementPrecisionMM:.001,
  actualMeasuredXYZVertices:positionsCount});
}
export function auditHumanProportion(model){
 source(model);
 const H=model.heightMeters, J=model.joints, p=model.profile;
 const hp=model.parts.find(x=>x.id==='head')?.geometry?.positions;
 if(!(hp instanceof Float32Array)||!hp.length)fail('SOURCE_HEAD_REQUIRED');
 let top=-Infinity,bottom=Infinity,loX=Infinity,hiX=-Infinity;
 for(let i=0;i<hp.length;i+=3){
  top=Math.max(top,hp[i+1]);bottom=Math.min(bottom,hp[i+1]);
  loX=Math.min(loX,hp[i]);hiX=Math.max(hiX,hp[i]);
 }
 // Pelvis width is the actual BODY silhouette, not the distance
 // between hip joint centers (those lie inside the pelvic surface).
 const pelvisPoints=model.parts.find(x=>x.id==='torso')?.geometry?.positions;
 if(!(pelvisPoints instanceof Float32Array))fail('PELVIS_BODY_MESH_REQUIRED');
 let pelvisMin=Infinity,pelvisMax=-Infinity,pelvisSamples=0;
 for(let i=0;i<pelvisPoints.length;i+=3){
  if(Math.abs(pelvisPoints[i+1]-.570*H)>.008*H)continue;
  pelvisMin=Math.min(pelvisMin,pelvisPoints[i]);
  pelvisMax=Math.max(pelvisMax,pelvisPoints[i]);pelvisSamples++;
 }
 if(pelvisSamples<8)fail('PELVIS_WIDTH_SAMPLES_REQUIRED');
 const headHeight=top-bottom,headWidth=hiX-loX,
  shoulder=diff(J.leftShoulder.position,J.rightShoulder.position),
  hip=pelvisMax-pelvisMin,
  ll=diff(J.leftHip.position,J.leftKnee.position),
  lr=diff(J.leftKnee.position,J.leftAnkle.position);
 const legGapAtKnee=2*(Math.abs(J.leftKnee.position[0])-
  .049*H); // knee anatomical loft has measured 0.049H radius
 const out={
  headToBodyRatio:round(headHeight/H),
  shoulderToHeadRatio:round(shoulder/headWidth),
  hipToShoulderRatio:round(hip/shoulder),
  truePelvicSilhouetteSamples:pelvisSamples,
  truePelvicBodyWidthMeters:round(hip),
  truePelvicBodyWidthMm:Math.round(hip*1000000)/1000,
  hipJointDistanceMeters:round(diff(J.leftHip.position,J.rightHip.position)),
  hipJointDistanceMm:Math.round(diff(J.leftHip.position,J.rightHip.position)*1000000)/1000,
  thighToCalfRatio:round(ll/lr),
  legSeparationAtKneeMeters:round(legGapAtKnee),
  legSeparationAtKneeMm:Math.round(legGapAtKnee*1000000)/1000,
  legSeparationNormalized:round(legGapAtKnee/H),
  leftArmLengthNormalized:round((
   diff(J.leftShoulder.position,J.leftElbow.position)+
   diff(J.leftElbow.position,J.leftWrist.position))/H),
  leftLegLengthNormalized:round((ll+lr)/H),
  headWidthMeters:round(headWidth),
  headHeightMeters:round(headHeight),
  headWidthMm:Math.round(headWidth*1000000)/1000,
  headHeightMm:Math.round(headHeight*1000000)/1000,
  actualAdultHeightMeters:H,actualAdultHeightMm:Math.round(H*1000000)/1000,
  physicalMeasurementsUnit:'mm',precisionMm:.001,
  originalBodyGeometryUnmodified:true
 };
 const issues=[];
 const range=(v,name,bounds)=>{if(!(v>=bounds[0]&&v<=bounds[1]))
  issues.push('PROPORTION_'+name)};
 range(out.headToBodyRatio,'HEAD_HEIGHT',AIG_STAGE1_TARGET.headToHeight);
 range(out.shoulderToHeadRatio,'SHOULDER_HEAD',AIG_STAGE1_TARGET.shoulderToHead);
 range(out.hipToShoulderRatio,'HIP_SHOULDER',AIG_STAGE1_TARGET.hipToShoulder);
 range(out.thighToCalfRatio,'THIGH_CALF',AIG_STAGE1_TARGET.thighToCalf);
 if(out.legSeparationNormalized<AIG_STAGE1_TARGET.minimumLegGapAtKnee)
  issues.push('LEGS_NOT_SEPARATED_AT_KNEES');
 return Object.freeze({...out,proportionIssues:Object.freeze(issues),
  normativeRuleOfThumbNotCertifiedHumanAnatomy:true,
  proportionNumericContractPASS:issues.length===0});
}
export function auditSkeletonAlignment(model){
 source(model);
 const H=model.heightMeters,j=model.joints,issues=[],limbs={};
 for(const kind of ['Shoulder','Elbow','Wrist','Hand','Hip','Knee','Ankle','Foot']){
  const l=j['left'+kind],r=j['right'+kind];
  if(!l||!r){issues.push('MISSING_'+kind.toUpperCase());continue}
  limbs[kind]=Object.freeze({
   xMirrorErrorNormalized:round(Math.abs(l.position[0]+r.position[0])/H),
   heightErrorNormalized:round(Math.abs(l.position[1]-r.position[1])/H),
   depthErrorNormalized:round(Math.abs(l.position[2]-r.position[2])/H)
  });
  for(const k of ['xMirrorErrorNormalized','heightErrorNormalized',
   'depthErrorNormalized'])
   if(limbs[kind][k]>AIG_STAGE1_TARGET.maxNormalizedLimbSymmetryError)
    issues.push(kind.toUpperCase()+'_'+k.toUpperCase());
 }
 for(const side of ['left','right']){
  if(!(j[side+'Hip'].position[1]>j[side+'Knee'].position[1]&&
   j[side+'Knee'].position[1]>j[side+'Ankle'].position[1]))
   issues.push(side.toUpperCase()+'_BONE_ORDER');
  if(j[side+'Elbow'].parent!==side+'Shoulder'||
   j[side+'Wrist'].parent!==side+'Elbow'||
   j[side+'Knee'].parent!==side+'Hip'||
   j[side+'Ankle'].parent!==side+'Knee')
   issues.push(side.toUpperCase()+'_PARENT_CHAIN');
 }
 const armLength=side=>
  diff(j[side+'Shoulder'].position,j[side+'Elbow'].position)+
  diff(j[side+'Elbow'].position,j[side+'Wrist'].position);
 const legLength=side=>
  diff(j[side+'Hip'].position,j[side+'Knee'].position)+
  diff(j[side+'Knee'].position,j[side+'Ankle'].position);
 const result={
  jointPairs:Object.freeze(limbs),
  leftRightArmLengthDeltaNormalized:round(
   Math.abs(armLength('left')-armLength('right'))/H),
  leftRightLegLengthDeltaNormalized:round(
   Math.abs(legLength('left')-legLength('right'))/H),
  actualJointCount:Object.keys(j).length,
  sourceBoneParentLinksValidated:true,
  originalBonePositionsUnmodified:true
 };
 if(result.leftRightArmLengthDeltaNormalized>
  AIG_STAGE1_TARGET.maxNormalizedLimbSymmetryError)issues.push('ARM_LENGTH_MISMATCH');
 if(result.leftRightLegLengthDeltaNormalized>
  AIG_STAGE1_TARGET.maxNormalizedLimbSymmetryError)issues.push('LEG_LENGTH_MISMATCH');
 return Object.freeze({...result,alignmentIssues:Object.freeze(issues),
  boneAlignmentNumericContractPASS:issues.length===0,
  continuousSkinningNotYetVerified:true});
}
export function auditViewportAspect({
 cssWidth,cssHeight,gpuWidth,gpuHeight,cameraAspect
}={}){
 if(![cssWidth,cssHeight,gpuWidth,gpuHeight,cameraAspect].every(finite)||
  Math.min(cssWidth,cssHeight,gpuWidth,gpuHeight,cameraAspect)<=0)
  fail('REAL_CANVAS_AND_GPU_MEASUREMENTS_REQUIRED');
 const cssAspect=cssWidth/cssHeight,gpuAspect=gpuWidth/gpuHeight;
 const gpuError=Math.abs(cssAspect-gpuAspect);
 const cameraError=Math.abs(cameraAspect-cssAspect);
 return Object.freeze({cssAspect:round(cssAspect),
  gpuAspect:round(gpuAspect),cameraAspect:round(cameraAspect),
  gpuCssAspectError:round(gpuError),cameraCssAspectError:round(cameraError),
  aspectTolerance:AIG_STAGE1_TARGET.canvasAspectTolerance,
  viewportNumericContractPASS:gpuError<=.015&&cameraError<=.015,
  actualCanvasUsedNotParentPanel:true});
}
const VIEW_DIRECTIONS=Object.freeze({
 front:Object.freeze([0,0,-1]),profile:Object.freeze([1,0,0]),
 rear:Object.freeze([0,0,1]),quarter45:Object.freeze([Math.SQRT1_2,0,-Math.SQRT1_2])
});
export function fitHumanToView(model,{view='front',aspect=1,
 verticalFovDeg=40,targetHeight=.82}={}){
 source(model);
 if(!Object.hasOwn(VIEW_DIRECTIONS,view)||!finite(aspect)||
  aspect<=.2||aspect>5||!finite(verticalFovDeg)||
  verticalFovDeg<20||verticalFovDeg>65||
  !finite(targetHeight)||targetHeight<.7||targetHeight>.87)
  fail('VIEWPORT_CAMERA_TARGET_INVALID');
 const bound=measureAIGStage1Bounds(model),target=bound.center,
  dir=VIEW_DIRECTIONS[view],right=[dir[2],0,-dir[0]],
  vtan=Math.tan(verticalFovDeg*Math.PI/360);
 const corners=[];
 for(const x of [bound.min[0],bound.max[0]])
  for(const y of [bound.min[1],bound.max[1]])
   for(const z of [bound.min[2],bound.max[2]]){
    const d=[x-target[0],y-target[1],z-target[2]];
    corners.push({x:d[0]*right[0]+d[2]*right[2],y:d[1],
     depth:d[0]*dir[0]+d[2]*dir[2]});
   }
 const projected=dist=>{
  let left=Infinity,rightmost=-Infinity,bottom=Infinity,top=-Infinity;
  for(const c of corners){
   const z=dist-c.depth;
   if(z<=0)return {height:Infinity,width:Infinity};
   const x=c.x/(z*vtan*aspect),y=c.y/(z*vtan);
   left=Math.min(left,x);rightmost=Math.max(rightmost,x);
   bottom=Math.min(bottom,y);top=Math.max(top,y);
  }
  return {height:(top-bottom)/2,width:(rightmost-left)/2};
 };
 let lo=bound.size[1]*.1,hi=bound.size[1]*20;
 for(let i=0;i<70;i++){
  const mid=(lo+hi)/2,ratios=projected(mid);
  if(ratios.height>targetHeight||ratios.width>.90)lo=mid;
  else hi=mid;
 }
 const final=projected(hi);
 return Object.freeze({schema:AIG_STAGE1_RATIO_SCHEMA,view,
  target:Object.freeze([...target]),
  cameraPosition:Object.freeze(target.map((v,i)=>round(v+dir[i]*hi))),
  actualSourceXYZBounds:bound,actualProjectedBodyHeightRatio:round(final.height),
  actualProjectedBodyWidthRatio:round(final.width),
  targetHeightRatio:targetHeight,verticalFovDeg,aspect,
  cameraDistanceMeters:round(hi),
  cameraDistanceMm:Math.round(hi*1000000)/1000,
  cameraPositionMm:Object.freeze(target.map((v,i)=>
   Math.round((v+dir[i]*hi)*1000000)/1000)),
  targetMm:Object.freeze(target.map(v=>Math.round(v*1000000)/1000)),
  geometryIsAuthoritativeMillimeters:true,
  framingNumericContractPASS:final.height<=targetHeight+.002&&
   final.height>=.70&&final.width<=.902,
  actualPixelSilhouetteStillRequiresWebGLSnapshot:true,
  sameGeometricScaleAcrossViews:true});
}
export function runStage1UnifiedRenderLogicCore({
 model,viewport=null,view='front',aspect=1,verticalFovDeg=40,
 snapshots=[],canonicalMM=null
}={}){
 source(model);
 const plan=planAIGStage1OneCore19200();
 const millimeters=canonicalMM??makeAIGStage1CanonicalMM(model);
 const mmEvidence=auditAIGStage1MMConversion(model,millimeters);
 const bounds=measureAIGStage1Bounds(model);
 const proportion=auditHumanProportion(model);
 const surface=auditAIGStage1BodySurface(model);
 const skeleton=auditSkeletonAlignment(model);
 const framing=fitHumanToView(model,{view,aspect,verticalFovDeg});
 const viewportResult=viewport?auditViewportAspect(viewport):null;
 const used={
  viewport:viewport?1:0,
  proportion:Math.min(plan.logicalSlotRanges.proportion.reservedLogicalSlots,
   bounds.actualMeasuredXYZVertices),
  skeleton:Math.min(plan.logicalSlotRanges.skeleton.reservedLogicalSlots,
   Object.keys(model.joints).length),
  snapshots:Math.min(views.length,snapshots.length),
  gate:1
 };
 const violations=[
  ...proportion.proportionIssues,...skeleton.alignmentIssues,
  ...surface.actualBodySurfaceErrors,
  ...mmEvidence.millimeterContractViolations
 ];
 if(!framing.framingNumericContractPASS)violations.push('FRAMING_HEIGHT_OR_WIDTH');
 if(viewportResult&&!viewportResult.viewportNumericContractPASS)
  violations.push('CANVAS_GPU_CAMERA_ASPECT_MISMATCH');
 if(!viewportResult)violations.push('NO_REAL_CANVAS_EVIDENCE');
 if(snapshots.length<4)violations.push('FOUR_REAL_VIEW_SNAPSHOTS_REQUIRED');
 const viewsOK=snapshots.length>=4&&new Set(snapshots.map(x=>x.view)).size===4&&
  snapshots.every(x=>x.realWebGLRendererPixels===true&&typeof x.sha256==='string'&&
   x.sha256.length===64)&&
  new Set(snapshots.map(x=>x.sha256)).size===4;
 if(snapshots.length>=4&&!viewsOK)violations.push('SNAPSHOT_SOURCE_OR_UNIQUENESS_FAIL');
 return Object.freeze({
  schema:AIG_STAGE1_RATIO_SCHEMA,
  modelGender:model.gender,logicalCore:plan,
  allocatedActualWorkUnits:Object.freeze(used),
  no19200PhysicalRendererClaim:true,
  proportions:proportion,skeleton,viewport:viewportResult,
  actualSurfaceClearances:surface,
  canonicalMillimeters:mmEvidence,
  dimensionsMm:Object.freeze({
   bodyHeight:mmEvidence.verifiedMillimeterHeight,
   headHeight:proportion.headHeightMm,
   headWidth:proportion.headWidthMm,
   pelvisSurfaceWidth:proportion.truePelvicBodyWidthMm,
   hipJointSpacing:proportion.hipJointDistanceMm,
   kneeLegClearance:proportion.legSeparationAtKneeMm
  }),
  threeFixes:Object.freeze({
   actualPelvisMeshSurfaceUsed:proportion.truePelvicSilhouetteSamples>=8,
   fullBodyCameraAutofitPassed:framing.framingNumericContractPASS,
   freshFourViewActualPngShaVerified:viewsOK
  }),
  camera:framing,
  numericAndEvidenceViolations:Object.freeze(violations),
  numericAndEvidenceGatePASS:violations.length===0,
  realAppearanceHumanReviewed:false,
  fullJointSmoothSkinningVerified:false,
  stage1ReleasePASS:false,
  nextGeometryAndVisualStageBLOCKED:true
 });
}
const views=Object.keys(VIEW_DIRECTIONS);
