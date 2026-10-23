/**
 * Real3D 3.5 — one source-locked appearance engine, BEFORE articulation.
 * Uses the EXISTING 2.9 measured source pixels -> 3.0 fused SDF chain.
 * Compares the unaltered geometry against bounded silhouette corrections,
 * chooses the lowest observed-XY projection error, and exposes non-destructive
 * colour/proportion controls. No hidden depth, identity, or "100% likeness".
 */
import {buildAIG29ContinuousSurface} from './aig-continuous-surface-scan-2-9.mjs';
import {AIG30_SCHEMA,buildAIG30FusedSDF,auditAIG30ClosedManifold}
 from './aig-fused-manifold-surface-3-0.mjs';
export const AIG35_SCHEMA='AIG_REAL3D_3_5_UNIFIED_SOURCE_APPEARANCE_GATE';
const fail=s=>{throw Error('AIG35_'+s)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sha=s=>typeof s==='string'&&/^sha256:[a-f0-9]{64}$/.test(s);
const HUMAN=new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
const validNumber=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
function verifySource(data){
 const {width:w,height:h,labels,pixels,sourceSha256}=data||{};
 if(!sha(sourceSha256)||!Number.isInteger(w)||!Number.isInteger(h)||
   w<128||h<128||w*h>2000000||
   !(labels instanceof Uint8Array)||labels.length!==w*h||
   !(pixels instanceof Uint8Array||pixels instanceof Uint8ClampedArray)||
   pixels.length!==w*h*4)fail('SOURCE_RGBA_MASK_AND_SHA_REQUIRED');
}
function maskBins(data){
 const {width:w,height:h,labels,pixels}=data;
 const step=Math.max(4,Math.round(h/48)),n=Math.ceil(h/step);
 const bins=Array.from({length:n},()=>({min:w,max:-1,rows:0,pixels:0}));
 let observed=0;
 for(let y=0;y<h;y++){
  let lo=w,hi=-1,total=0;
  for(let x=0;x<w;x++){
   const i=y*w+x;
   if(!HUMAN.has(labels[i])||pixels[i*4+3]<128)continue;
   lo=Math.min(lo,x);hi=Math.max(hi,x);total++;
  }
  if(total<5||hi-lo<4||hi-lo>w*.9)continue;
  const b=bins[Math.floor(y/step)];
  b.min=Math.min(b.min,lo);b.max=Math.max(b.max,hi);
  b.rows++;b.pixels+=total;observed+=total;
 }
 if(observed<250)fail('VISIBLE_PERSON_SILHOUETTE_NOT_PROVEN');
 return {bins,step,observed};
}
function meshBins(positions,w,h,worldHeight,step,n){
 const bins=Array.from({length:n},()=>({min:Infinity,max:-Infinity,count:0}));
 for(let i=0;i<positions.length;i+=3){
  const x=(positions[i]/worldHeight)*h+(w-1)*.5;
  const y=h-1-positions[i+1]/worldHeight*h;
  const b=Math.floor(y/step);
  if(b<0||b>=n)continue;
  const r=bins[b];r.min=Math.min(r.min,x);r.max=Math.max(r.max,x);r.count++;
 }
 return bins;
}
function score(source,predicted,step){
 const usable=[];
 for(let b=0;b<source.length;b++){
  const s=source[b],p=predicted[b];
  if(s.rows<Math.min(2,step)||s.pixels<30||p.count<5||
   s.max-s.min<5||p.max-p.min<4)continue;
  usable.push({bin:b,left:s.min,right:s.max,predLeft:p.min,predRight:p.max});
 }
 if(usable.length<Math.max(7,Math.floor(source.length*.18)))
  fail('INSUFFICIENT_MATCHABLE_SOURCE_ROWS');
 const mean=usable.reduce((sum,b)=>sum+
  Math.abs(b.left-b.predLeft)+Math.abs(b.right-b.predRight),0)/(usable.length*2);
 return {meanEdgeErrorPx:mean,rowsCompared:usable.length,rows:usable};
}
function recalcNormals(positions,indices){
 const normals=new Float32Array(positions.length);
 for(let j=0;j<indices.length;j+=3){
  const a=indices[j]*3,b=indices[j+1]*3,c=indices[j+2]*3;
  const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],
   uz=positions[b+2]-positions[a+2];
  const vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],
   vz=positions[c+2]-positions[a+2];
  const n=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];
  for(const k of [a,b,c])for(let t=0;t<3;t++)normals[k+t]+=n[t];
 }
 for(let i=0;i<normals.length;i+=3){
  const len=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;
  for(let k=0;k<3;k++)normals[i+k]/=len;
 }
 return normals;
}
function replaceGeometry(scan,positions){
 const source=scan.fusedOnePieceMesh;
 const audit=auditAIG30ClosedManifold(positions,source.indices);
 if(!audit.closedManifold)fail('CORRECTION_DAMAGED_WATERTIGHT_MANIFOLD');
 const mesh={...source,positions,normals:recalcNormals(positions,source.indices)};
 return {...scan,fusedOnePieceMesh:mesh,surfaces:[mesh],manifoldAudit:audit};
}
function boundedFit(scan,mask,data,baseline,{maxShift=.07,maxStretch=1.22}={}){
 const {width:w,height:h}=data,positions=scan.fusedOnePieceMesh.positions;
 const pred=meshBins(positions,w,h,scan.bodyHeightUnits,mask.step,mask.bins.length);
 const corrections=new Map(),lim=h*maxShift;
 for(const row of baseline.rows){
  const s=mask.bins[row.bin],p=pred[row.bin];
  const rawShift=(s.min+s.max-p.min-p.max)*.5;
  const rawScale=(s.max-s.min)/Math.max(.1,p.max-p.min);
  if(Math.abs(rawShift)>lim||rawScale<1/maxStretch||rawScale>maxStretch)
   continue;
  corrections.set(row.bin,{shift:rawShift,scale:rawScale,
   center:(p.min+p.max)*.5});
 }
 if(corrections.size<Math.max(5,Math.floor(baseline.rowsCompared*.5)))
  fail('CAMERA_POSE_OR_MASK_TOO_DIFFERENT_FOR_SAFE_FIT');
 const out=new Float32Array(positions);let changed=0;
 for(let i=0;i<out.length;i+=3){
  const y=h-1-out[i+1]/scan.bodyHeightUnits*h;
  const at=Math.floor(y/mask.step),c=corrections.get(at);
  if(!c)continue;
  const pixelX=out[i]/scan.bodyHeightUnits*h+(w-1)*.5;
  const next=c.center+(pixelX-c.center)*c.scale+c.shift;
  const x=(next-(w-1)*.5)/h*scan.bodyHeightUnits;
  if(Math.abs(x-out[i])>1e-8){out[i]=x;changed++}
 }
 if(changed<50)fail('NO_REAL_3D_VERTICES_CHANGED');
 return {scan:replaceGeometry(scan,out),changed};
}
/** Evaluate source XY only; this is NOT a 3D photorealistic similarity score. */
export function evaluateAIG35ProjectedSilhouette(scan,data){
 verifySource(data);
 if(scan?.schema!==AIG30_SCHEMA||!scan.manifoldAudit?.closedManifold||
  scan.sourceSha256!==data.sourceSha256||
  scan.sourceSize?.[0]!==data.width||
  scan.sourceSize?.[1]!==data.height||
  !scan.fusedOnePieceMesh?.positions?.length||
  !scan.fusedOnePieceMesh.originalPhotoSilhouetteSources?.every(id=>HUMAN.has(id)))
  fail('SAME_PHOTO_AND_HUMAN_REST_MESH_REQUIRED');
 const mask=maskBins(data);
 const predicted=meshBins(scan.fusedOnePieceMesh.positions,data.width,
  data.height,scan.bodyHeightUnits,mask.step,mask.bins.length);
 return {...score(mask.bins,predicted,mask.step),
  observedSourcePixels:mask.observed,imagePlaneOnly:true,
  physicallyMeasuredDepth:false,visualIdentityApproved:false};
}
/** Dimensions and colour only change a copy. Never adjust CNC / GLB source. */
export function adjustAIG35Appearance(scan,{
 widthScale=1,heightScale=1,depthScale=1,colourGain=1
}={}){
 if(scan?.schema!==AIG30_SCHEMA||!scan.manifoldAudit?.closedManifold||
  !validNumber(widthScale,.8,1.2)||
  !validNumber(heightScale,.85,1.15)||
  !validNumber(depthScale,.75,1.25)||
  !validNumber(colourGain,.7,1.3))
  fail('SAFE_APPEARANCE_PARAMETER_RANGE_REQUIRED');
 const src=scan.fusedOnePieceMesh.positions,out=new Float32Array(src);
 for(let i=0;i<out.length;i+=3){
  out[i]*=widthScale;out[i+1]*=heightScale;out[i+2]*=depthScale;
 }
 return {...replaceGeometry(scan,out),
  appearanceControls:{widthScale,heightScale,depthScale,colourGain},
  sourceAppearanceOnly:true,physicalScaleUnverified:true,
  colourGainDoesNotChangeOriginalPhoto:true};
}
/**
 * One-click scan: actual source RGB and class IDs -> 2.9 sections ->
 * 3.0 single fused SDF -> compare untouched vs bounded source-silhouette
 * fitting. If the correction is unsupported, KEEP the old candidate.
 * Later 3.3/3.4 digit constraints and 3.1/3.2 rig must use this selected
 * single geometry (they are not counted as a second "photo scan").
 */
export function buildAIG35UnifiedAppearance({
 source,radialSegments=48,sliceStep=4,depthRatio=.6,
 resolution=84,blend=.075,proportions={}
}={}){
 verifySource(source);
 const sections=buildAIG29ContinuousSurface({...source,
  radialSegments,sliceStep,depthRatio});
 const fused=buildAIG30FusedSDF(sections,{resolution,blend});
 const base=evaluateAIG35ProjectedSilhouette(fused,source);
 let best=fused,chosen='FUSED_SDF_3_0',fit=null,fitBlocked=null;
 try{
  const attempt=boundedFit(fused,maskBins(source),source,base);
  const measured=evaluateAIG35ProjectedSilhouette(attempt.scan,source);
  if(measured.meanEdgeErrorPx+.05<base.meanEdgeErrorPx){
   best=attempt.scan;chosen='SOURCE_XY_OUTLINE_FIT_3_5';
   fit={beforePx:base.meanEdgeErrorPx,afterPx:measured.meanEdgeErrorPx,
    movedActualXYZVertices:attempt.changed};
  }else fitBlocked='FITTED_PROJECTION_NOT_BETTER';
 }catch(e){fitBlocked=String(e?.message||e)}
 const adjusted=adjustAIG35Appearance(best,proportions);
 const final=evaluateAIG35ProjectedSilhouette(adjusted,source);
 const proof={
  schema:AIG35_SCHEMA,sourceSha256:source.sourceSha256,
  originalPhotoAndSegmentationUnchanged:true,
  scannedStages:['2.7_SOURCE_PIXELS','2.9_VARIABLE_SECTIONS',
   '3.0_FUSED_SDF','3.5_SOURCE_XY_OUTLINE_FIT_IF_VALID'],
  scannedModes:['FUSED_SDF_3_0','SOURCE_XY_OUTLINE_FIT_3_5'],
  selectedMode:chosen,sourceVisiblePixels:final.observedSourcePixels,
  source2DEdgeErrorBeforePx:+base.meanEdgeErrorPx.toFixed(4),
  source2DEdgeErrorAfterPx:+final.meanEdgeErrorPx.toFixed(4),
  matchingRows:final.rowsCompared,photoOutlineFit:fit,fitBlocked,
  finalControls:adjusted.appearanceControls,
  actualSingleClosedManifold:adjusted.manifoldAudit.closedManifold,
  sourcePhotoRGBRetainedForMaterialSampling:true,
  rearAndOccludedDepthUnknown:true,
  faceHairTailoringAndPhysical1to1NotCertified:true,
  motionStageLockedUntilAppearanceReview:true,
  automaticallyAchieved100PercentLikeness:false,
  realVisualAcceptanceByUser:false,releaseAllowed:false
 };
 return {schema:AIG35_SCHEMA,reconstruction:adjusted,
  proof,selectedMode:chosen,sourceSha256:source.sourceSha256};
}