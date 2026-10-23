/**
 * Real3D 3.3 — analytic signed-distance skin for fingers and toes.
 * No per-digit visible triangulated tube surface: four source-anchored
 * implicit groups (left/right hand/foot), 14 phalanx capsules per group,
 * smoothly blended with a compact palm/sole ellipsoid.
 *
 * The GPU ray marches the SDF directly. Its four box rasterization proxies
 * still contain triangles, but NONE are used as the displayed skin surface.
 * Relative proportions and absent digit detail are anatomical priors, NOT
 * 1:1 scan measurements or validated skin. Preserves source/3.0/3.1/3.2.
 */
export const AIG33_SCHEMA='AIG_REAL3D_3_3_DIRECT_SDF_RAYMARCH_SKIN_V1';
const fail=s=>{throw Error('AIG33_'+s)};
const len=v=>Math.hypot(...v);
const groups=['leftHand','rightHand','leftFoot','rightFoot'];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const AIG33_GROUPS=Object.freeze([...groups]);
export const AIG33_CAPSULES_PER_GROUP=14;
export function aig33CapsuleSDF(p,a,b,r){
 if(![...p,...a,...b,r].every(Number.isFinite)||r<=0)fail('FINITE_CAPSULE_REQUIRED');
 const ab=a.map((v,i)=>b[i]-v),ap=p.map((v,i)=>v-a[i]);
 const h=clamp(ab.reduce((sum,v,i)=>sum+v*ap[i],0)/
  Math.max(1e-10,ab.reduce((s,v)=>s+v*v,0)),0,1);
 return len(p.map((v,i)=>v-a[i]-h*ab[i]))-r;
}
export function aig33SmoothUnion(a,b,k){
 if(![a,b,k].every(Number.isFinite)||k<=0)fail('POSITIVE_FINITE_SMOOTH_WIDTH');
 const h=Math.max(k-Math.abs(a-b),0)/k;
 return Math.min(a,b)-h*h*k*.25;
}
export function aig33PrepareImplicitGroups(result,rig,{
 quality='BALANCED'
}={}){
 if(!result?.meshes||result?.meshes.length===0||
  result.sourceSha256!==rig?.sourceSha256||
  !rig?.anchoredBodyHeightRelativeUnits||
  result.actualPositionsAndIndexedTrianglesPresent!==true)
  fail('VERIFIED_SOURCE_POSE_SHA_REQUIRED');
 if(!['MOBILE','BALANCED','HIGH'].includes(quality))fail('QUALITY_MODE_INVALID');
 const body=rig.anchoredBodyHeightRelativeUnits;
 const modes={MOBILE:28,BALANCED:42,HIGH:64};
 const parts=[];
 for(const group of groups){
  const hand=group.includes('Hand'),side=group.startsWith('left')?'left':'right',
   type=hand?'hand':'foot';
  const digits=result.meshes.filter(d=>d.side===side&&d.type===type)
   .sort((a,b)=>a.index-b.index);
  if(!digits.length)continue;
  if(digits.length!==5)fail('SOURCE_GROUP_MUST_CONTAIN_FIVE_DIGITS_'+group);
  const centerline=[],ids=[];
  for(const d of digits){
   if(!Array.isArray(d.actual3DJointXYZ)||
    d.actual3DJointXYZ.length!==d.phalanxCount+1||
    d.actual3DJointXYZ.some(p=>p.length!==3||p.some(v=>!Number.isFinite(v))))
    fail('ACTUAL_JOINT_XYZ_REQUIRED_'+d.id);
   for(let j=0;j<d.phalanxCount;j++){
    const radius=body*(hand?.0072:.0088)*
     [1.18,1.03,1,.94,.79][d.index]*(1-.13*j);
    centerline.push({
     a:[...d.actual3DJointXYZ[j]],b:[...d.actual3DJointXYZ[j+1]],
     radius,sourceDigitId:d.id,phalanxIndex:j
    });
    ids.push(d.id);
   }
  }
  if(centerline.length!==AIG33_CAPSULES_PER_GROUP||
   new Set(ids).size!==5)fail('TWENTY_DIGIT_56_LINK_MANIFEST_NOT_RESOLVED');
  const root=rig.sourceAnchors[group];
  if(!root)fail('MISSING_SOURCE_HAND_FOOT_ROOT_'+group);
  const palmCenter=[...root.xyz];
  if(hand)palmCenter[1]+=.013*body;
  else palmCenter[2]-=.023*body;
  const palmRadius=hand?
   [.061*body,.026*body,.020*body]:
   [.066*body,.015*body,.040*body];
  // Finite scene-aligned ray proxy box; surface geometry is SDF, not box.
  const samples=[...centerline.flatMap(l=>[l.a,l.b]),palmCenter];
  const biggest=Math.max(...centerline.map(l=>l.radius),
   ...palmRadius);
  const margin=biggest+.025*body;
  const min=[0,1,2].map(i=>Math.min(...samples.map(p=>p[i]))-margin);
  const max=[0,1,2].map(i=>Math.max(...samples.map(p=>p[i]))+margin);
  const span=max.map((v,i)=>v-min[i]);
  if(span.some(x=>!Number.isFinite(x)||x<=0||x>body*.65))
   fail('RAY_PROXY_BOUNDS_OUTSIDE_SOURCE_LIMITS_'+group);
  parts.push({
   group,side,type,sourceSha256:result.sourceSha256,
   realSourceAnchored:!!root,
   sourceDigitCount:5,sourcePhalanxCount:centerline.length,
   sourceDigitMeasured:false,
   organicSDFProfileRevision:'RETAIN_FIVE_SEPARATE_FINGER_TIPS_WITH_COMPACT_PALM_V2',
   originalGeometryUnchanged:true,
   fieldRepresentation:'14_ANALYTIC_CAPSULE_SDFS_PLUS_PALM_ELLIPSOID',
   skinSurfaceDeterminedBy:'GPU_FRAGMENT_RAYMARCH_ONLY',
   rasterizationProxyTrianglesVisibleAsSkin:false,
   centerline,palmCenter,palmRadius,
   blendingWidth:(hand?.0055:.0045)*body,
   min,max,span,maxMarchSteps:modes[quality],
   estimatedSourceBodyUnits:body
  });
 }
 return {
  schema:AIG33_SCHEMA,
  sourceSha256:result.sourceSha256,
  expectedDigitCount:20,actualDigits:result.generatedActual3DDigits,
  actualPhalanges:result.generatedActual3DPhalanges,
  implicitGroupCount:parts.length,
  actualImplicitCapsuleCount:parts.reduce((n,p)=>n+p.centerline.length,0),
  gpuSurfaceSource:'ANALYTIC_SIGNED_DISTANCE_DIRECT_FRAGMENT_RAYMARCH',
  noVisibleTriangulatedDigitTubeSurfaces:true,
  quality,parts,
  priorGeometryNotReal3DScan:true,
  mobile60FPSTested:false,
  real3DPrintOutputVerified:false,
  humanAppearanceApproved:false,releaseAllowed:false
 };
}
