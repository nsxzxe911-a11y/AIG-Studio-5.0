/**
 * AIG Real3D Stage 1 neutral ADULT male/female anatomical references.
 * 1 m = 1 world unit; +Y up, +X character left, -Z forward.
 * These are constructed editable technical anatomy proxies, NOT scans,
 * verified real people, face reconstruction, or production skinning.
 * Tight swim garments are surface-conforming overlays, not opaque skirts.
 */
export const AIG_STAGE1_SCHEMA='AIG_STAGE1_ADULT_MALE_FEMALE_ANATOMY_V1';
export const AIG_STAGE1_COORDINATES=Object.freeze({
 units:'meters',up:'+Y',front:'-Z',right:'+X',origin:'GROUND_MID_FEET'
});
export const AIG_STAGE1_GENDERS=Object.freeze(['male','female']);
const bad=s=>{throw Error('AIG_STAGE1_'+s)};
const PROFILE=Object.freeze({
 male:Object.freeze({height:1.78,shoulder:.126,hip:.109,
  waist:.091,chest:.126,headX:.055,headY:.071,armX:.143,
  legX:.073,legThigh:.060,legCalf:.043,
  swim:'fitted-briefs',swimColor:'#234b71'}),
 female:Object.freeze({height:1.68,shoulder:.114,hip:.118,
  waist:.084,chest:.112,headX:.055,headY:.072,armX:.135,
  legX:.078,legThigh:.065,legCalf:.044,
  swim:'fitted-one-piece',swimColor:'#296f72'})
});
const round=v=>+v.toFixed(6);
// Smooth adjoining anatomical rings without changing head/body height or
// filling the left and right leg gap. Retain original source ring locations.
function refineRings(points,steps=3){
 const result=[];
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],p=points[Math.max(0,i-1)],
   n=points[Math.min(points.length-1,i+2)];
  if(!i)result.push(a);
  for(let j=1;j<=steps;j++){
   const t=j/steps,t2=t*t,t3=t2*t,r={};
   for(const k of ['x','z','rx','rz']){
    const v=(2*t3-3*t2+1)*a[k]+(t3-2*t2+t)*(b[k]-p[k])*.5+
      (-2*t3+3*t2)*b[k]+(t3-t2)*(n[k]-a[k])*.5;
    r[k]=k==='rx'||k==='rz'?
     Math.max(.001,Math.min(v,Math.max(a[k],b[k])*1.08)):v;
   }
   r.y=a.y+(b.y-a.y)*t;
   result.push(r);
  }
 }
 return result;
}
function loft(points,{segments=28,caps=true}={}){
 points=refineRings(points);
 if(points.length<2)bad('AT_LEAST_TWO_LOFT_LEVELS');
 const xyz=[],faces=[];
 for(const r of points){
  if(![r.x,r.y,r.z,r.rx,r.rz].every(Number.isFinite)||
   r.rx<=0||r.rz<=0)bad('INVALID_RING');
  for(let k=0;k<segments;k++){
   const a=2*Math.PI*k/segments;
   xyz.push(round(r.x+Math.cos(a)*r.rx),round(r.y),
    round(r.z+Math.sin(a)*r.rz));
  }
 }
 for(let i=0;i<points.length-1;i++)
  for(let k=0;k<segments;k++){
   const a=i*segments+k,b=i*segments+(k+1)%segments,
    c=(i+1)*segments+k,d=(i+1)*segments+(k+1)%segments;
   faces.push(a,c,b,b,c,d);
  }
 if(caps){
  let start=xyz.length/3;
  xyz.push(round(points[0].x),round(points[0].y),round(points[0].z));
  let end=xyz.length/3;
  const tail=points.at(-1);
  xyz.push(round(tail.x),round(tail.y),round(tail.z));
  for(let k=0;k<segments;k++){
   faces.push(start,k,(k+1)%segments);
   const last=(points.length-1)*segments;
   faces.push(end,last+(k+1)%segments,last+k);
  }
 }
 return Object.freeze({positions:new Float32Array(xyz),
  indices:new Uint32Array(faces),triangleCount:faces.length/3});
}
function ringsFromShape(H,p,spec){
 return spec.map(([y,x,z,rx,rz])=>({
  x:x*H,y:y*H,z:z*H,rx:rx*H,rz:rz*H
 }));
}
function makeAdult(gender){
 if(!PROFILE[gender])bad('ONLY_ADULT_MALE_FEMALE_PROFILES');
 const p=PROFILE[gender],H=p.height,parts=[],joints={};
 const put=(id,role,rings,material='body',parent=null)=>{
  const geo=loft(ringsFromShape(H,p,rings));
  parts.push(Object.freeze({id,role,material,parent,geometry:geo}));
  return geo;
 };
 const J=(id,x,y,z,parent=null)=>{
  const value=Object.freeze({id,position:[round(x*H),round(y*H),round(z*H)],parent});
  joints[id]=value;return value;
 };
 // Explicitly distinct left and right rig joint positions.
 J('pelvis',0,.545,0);
 J('spine',0,.672,0,'pelvis');
 J('chest',0,.778,-.006,'spine');
 J('neck',0,.875,0,'chest');
 J('head',0,.933,0,'neck');
 for(const s of [-1,1]){
  const side=s<0?'left':'right';
  J(side+'Shoulder',s*p.shoulder,.805,0,'chest');
  J(side+'Elbow',s*(p.armX+.036),.642,-.004,side+'Shoulder');
  J(side+'Wrist',s*(p.armX+.054),.496,-.012,side+'Elbow');
  J(side+'Hand',s*(p.armX+.057),.453,-.016,side+'Wrist');
  J(side+'Hip',s*p.legX,.514,0,'pelvis');
  J(side+'Knee',s*(p.legX+.005),.289,-.018,side+'Hip');
  J(side+'Ankle',s*(p.legX+.006),.085,0,side+'Knee');
  J(side+'Foot',s*(p.legX+.006),.046,-.058,side+'Ankle');
 }
 // Torso is smoothly ringed and deliberately one human-volume surface,
 // not several stacked cylinder primitives.
 const torso=[
  [.510,0,0,p.hip*.72,.070],
  [.537,0,0,p.hip*.93,.091],
  [.570,0,0,p.hip,.100],
  [.602,0,-.006,p.waist*.97,.082],
  [.655,0,-.007,p.waist,.084],
  [.700,0,-.006,(p.waist+p.chest)*.52,.096],
  [.744,0,-.004,p.chest*.98,.107],
  [.785,0,-.008,p.chest,.107],
  [.812,0,0,p.shoulder*.96,.101],
  [.842,0,0,p.shoulder*.73,.085],
  [.868,0,0,.038,.041]
 ];
 put('torso','connected-torso',torso);
 put('neck','neck',[
  [.858,0,0,.039,.038],[.871,0,0,.035,.036],
  [.892,0,0,.038,.037]
 ],'body','chest');
 // Neutral elongated head: jaw -> cheek -> temples -> cranial dome.
 const head=[
  [.863,0,-.012,.020,.018],
  [.875,0,-.010,p.headX*.54,.030],
  [.893,0,-.008,p.headX*.78,.043],
  [.915,0,-.005,p.headX*.96,.052],
  [.942,0,-.003,p.headX,.057],
  [.967,0,0,p.headX*.92,.052],
  [.984,0,.003,p.headX*.66,.039],
  [.994,0,.004,p.headX*.33,.020],
  [1.000,0,.004,.002,.003]
 ];
 put('head','neutral-head-no-hair-no-face-texture',head,'body','neck');
 for(const s of [-1,1]){
  const side=s<0?'left':'right';
  const armStart=s*p.shoulder,elbow=s*(p.armX+.036),
   wrist=s*(p.armX+.054),hand=s*(p.armX+.057);
  put(side+'UpperArm','upper-arm',[
   [.839,armStart-s*.002,0,.012,.015],
   [.829,armStart,0,.025,.030],
   [.808,armStart,0,.032,.035],
   [.787,armStart+s*.013,0,.036,.038],
   [.745,armStart+s*.023,-.001,.035,.036],
   [.704,armStart+s*.033,-.003,.031,.033],
   [.657,elbow,-.004,.027,.028],
   [.640,elbow,-.004,.026,.026]
  ],'body',side+'Shoulder');
  put(side+'Forearm','forearm',[
   [.645,elbow,-.004,.028,.029],
   [.618,elbow+s*.009,-.005,.030,.031],
   [.567,elbow+s*.017,-.008,.031,.030],
   [.531,wrist-s*.004,-.010,.023,.025],
   [.494,wrist,-.012,.019,.021]
  ],'body',side+'Elbow');
  put(side+'Hand','separate-hand',[
   [.502,wrist,-.012,.020,.020],
   [.477,hand,-.017,.025,.017],
   [.449,hand,-.016,.023,.015],
   [.429,hand,-.018,.015,.014],
   [.421,hand,-.019,.005,.006]
  ],'body',side+'Wrist');
  const hip=s*p.legX,knee=s*(p.legX+.005),ankle=s*(p.legX+.006);
  put(side+'Thigh','distinct-thigh',[
   [.522,hip,0,p.legThigh*.85,.067],
   [.499,hip,0,p.legThigh,.073],
   [.456,hip+s*.002,0,p.legThigh*.96,.070],
   [.394,hip+s*.002,-.005,p.legThigh*.82,.064],
   [.333,knee,-.014,.045,.046],
   [.285,knee,-.018,.040,.043]
  ],'body',side+'Hip');
  put(side+'Calf','distinct-calf',[
   [.300,knee,-.018,.042,.044],
   [.275,knee,-.016,.045,.048],
   [.247,knee+s*.002,-.012,p.legCalf,.050],
   [.212,knee+s*.001,-.008,p.legCalf*.97,.048],
   [.167,ankle,-.003,.036,.038],
   [.117,ankle,0,.025,.027],
   [.082,ankle,0,.025,.026]
  ],'body',side+'Knee');
  put(side+'Foot','individual-foot',[
   [.103,ankle,0,.026,.029],
   [.077,ankle,-.010,.038,.058],
   [.050,ankle,-.046,.043,.075],
   [.029,ankle,-.060,.040,.076],
   [.019,ankle,-.060,.035,.058],
   [.008,ankle,-.060,.019,.039],
   [.000,ankle,-.060,.009,.015]
  ],'body',side+'Ankle');
 }
 // Both garments are tight, opaque, close to anatomically correct profiles.
 // Briefs have SHORT legs and no wraparound skirt. Women's one-piece covers
 // chest+torso but leaves actual legs entirely separate and visible.
 if(gender==='male'){
  put('swimBriefs','fitted-swim-briefs',[
   [.503,0,-.002,p.hip*.68+.002,.075],
   [.528,0,-.002,p.hip*.88+.003,.095],
   [.558,0,-.002,p.hip+.003,.104],
   [.581,0,-.001,p.hip*.99+.003,.103]
  ],'swim');
  for(const s of [-1,1]){
   put(s<0?'leftBriefLeg':'rightBriefLeg','fitted-brief-leg-band',[
    [.484,s*p.legX,0,p.legThigh+.002,.078],
    [.508,s*p.legX,0,p.legThigh+.003,.080],
    [.529,s*p.legX,0,p.legThigh*.88+.002,.075]
   ],'swim');
  }
 }else{
  put('onePieceSwim','fitted-one-piece',[
   [.507,0,-.002,p.hip*.70+.003,.074],
   [.543,0,-.001,p.hip*.95+.003,.096],
   [.576,0,-.002,p.hip+.003,.104],
   [.608,0,-.007,p.waist*.97+.003,.087],
   [.657,0,-.008,p.waist+.003,.089],
   [.699,0,-.007,(p.waist+p.chest)*.52+.003,.101],
   [.743,0,-.005,p.chest*.98+.003,.112],
   [.777,0,-.009,p.chest+.003,.112],
   [.806,0,-.004,p.shoulder*.77,.096]
  ],'swim');
  for(const s of [-1,1]){
   put(s<0?'leftStrap':'rightStrap','integrated-swim-strap',[
    [.795,s*.096,-.009,.012,.025],
    [.821,s*.102,-.012,.013,.023],
    [.846,s*.082,-.007,.011,.017],
    [.864,s*.055,0,.009,.012]
   ],'swim');
  }
 }
 const tri=parts.reduce((n,m)=>n+m.geometry.triangleCount,0);
 const boneIds=Object.keys(joints),left=boneIds.filter(k=>k.startsWith('left')),
  right=boneIds.filter(k=>k.startsWith('right'));
 const mandatory=['pelvis','spine','chest','neck','head',
  ...['left','right'].flatMap(s=>['Shoulder','Elbow','Wrist','Hand',
   'Hip','Knee','Ankle','Foot'].map(k=>s+k))];
 if(mandatory.some(k=>!joints[k]))bad('MISSING_MANDATORY_JOINT');
 const lhip=joints.leftHip.position[0],
  rhip=joints.rightHip.position[0];
 if(!(lhip<0&&rhip>0)||left.length!==right.length)
  bad('LEFT_RIGHT_ANATOMY_NOT_SEPARATE');
 return Object.freeze({
  schema:AIG_STAGE1_SCHEMA,gender,profile:p,
  adultTechnicalReferenceOnly:true,
  bodySurfaceRevision:'SMOOTH_RING_LOFT_SHOULDER_HEAD_HIP_CLEARANCE',
  originCoordinates:AIG_STAGE1_COORDINATES,
  heightMeters:H,heightMm:Math.round(H*1000000)/1000,
  coordinateAuthority:'mm/0.001',rendererAdapterWorldUnit:'meters',
  joints:Object.freeze(joints),
  parts:Object.freeze(parts),
  partCount:parts.length,jointCount:boneIds.length,
  actualIndexedTriangles:tri,
  leftRightLegsDistinct:true,leftRightArmsDistinct:true,
  separateHeadAndNeck:true,
  noHair:true,noSchoolUniform:true,
  noSkirt:true,noFaceIdentityReconstructed:true,
  garmentType:p.swim,
  fullySkinnedDeformationVerified:false,
  physicallyMeasuredUserAnatomy:false,
  userVisualGatePASS:false
 });
}
export function buildAIGStage1AdultAnatomy(gender){
 return makeAdult(gender);
}
/**
 * Actual 3D geometry cross-section checks. Measurements are taken from
 * real generated world-XYZ vertices, not invented name/rig flags.
 * A contract PASS cannot certify photo likeness or deformation physics.
 */
export function auditAIGStage1BodySurface(model){
 if(model?.schema!==AIG_STAGE1_SCHEMA)
  bad('SURFACE_AUDIT_REQUIRES_REAL_ANATOMY');
 const H=model.heightMeters,part=id=>model.parts.find(p=>p.id===id);
 const envelope=(id,level,tolerance=.003)=>{
  const a=part(id)?.geometry?.positions;
  if(!(a instanceof Float32Array))bad('SURFACE_MISSING_'+id);
  let min=Infinity,max=-Infinity,count=0;
  for(let i=0;i<a.length;i+=3){
   if(Math.abs(a[i+1]/H-level)>tolerance)continue;
   count++;min=Math.min(min,a[i]);max=Math.max(max,a[i]);
  }
  if(count<16)bad('SURFACE_CROSS_SECTION_EMPTY_'+id);
  return {min,max,count};
 };
 const head=part('head').geometry.positions;
 let minY=Infinity,maxY=-Infinity,minX=Infinity,maxX=-Infinity;
 for(let i=0;i<head.length;i+=3){
  minY=Math.min(minY,head[i+1]);maxY=Math.max(maxY,head[i+1]);
  minX=Math.min(minX,head[i]);maxX=Math.max(maxX,head[i]);
 }
 const a=envelope('leftThigh',.499),b=envelope('rightThigh',.499);
 const leftShoulder=envelope('leftUpperArm',.808);
 const rightShoulder=envelope('rightUpperArm',.808);
 const torso=envelope('torso',.812);
 const gap=b.min-a.max;
 const overlap=Math.min(torso.min-leftShoulder.min,
  rightShoulder.max-torso.max);
 // Better measure actual overlap of each inner arm with torso's silhouette.
 const leftOverlap=leftShoulder.max-torso.min;
 const rightOverlap=torso.max-rightShoulder.min;
 const headAspect=(maxY-minY)/(maxX-minX);
 const minFootY=Math.min(...['leftFoot','rightFoot'].map(id=>{
  const pts=part(id).geometry.positions;
  let lo=Infinity;
  for(let k=1;k<pts.length;k+=3)lo=Math.min(lo,pts[k]);
  return lo;
 }));
 const errors=[];
 if(!(gap/H>=.012&&gap/H<=.09))
  errors.push('UPPER_THIGHS_MERGED_OR_TOO_FAR');
 if(!(headAspect>=1.18&&headAspect<=1.65))
  errors.push('HEAD_ASPECT_FLATTENED');
 if(!(leftOverlap/H>=.008&&rightOverlap/H>=.008))
  errors.push('SHOULDER_ARM_FLOATING');
 if(Math.abs(minFootY)>0.001)
  errors.push('FEET_NOT_GROUNDED_AT_MM_ZERO');
 if(![gap,headAspect,leftOverlap,rightOverlap].every(Number.isFinite))
  errors.push('INVALID_BODY_SURFACE_MEASUREMENT');
 return Object.freeze({
  modelGender:model.gender,sourceRealXYZVertices:true,
  smoothedContinuousRingLoft:true,
  actualHeadHeightMm:+((maxY-minY)*1000).toFixed(3),
  actualHeadWidthMm:+((maxX-minX)*1000).toFixed(3),
  actualHeadHeightToWidth:+headAspect.toFixed(4),
  upperThighInnerGapMm:+(gap*1000).toFixed(3),
  footGroundContactMm:+(minFootY*1000).toFixed(3),
  upperThighGapNormalized:+(gap/H).toFixed(5),
  shoulderTorsoLeftOverlapMm:+(leftOverlap*1000).toFixed(3),
  shoulderTorsoRightOverlapMm:+(rightOverlap*1000).toFixed(3),
  crossSectionSamples:Object.freeze({
   upperLeftThigh:a.count,upperRightThigh:b.count,
   torso:torso.count,leftShoulder:leftShoulder.count,
   rightShoulder:rightShoulder.count
  }),
  actualBodySurfaceErrors:Object.freeze(errors),
  actualBodySurfaceNumericPASS:errors.length===0,
  entireHumanSilhouetteVisuallyApproved:false,
  fullContinuousSkinnedMeshVerified:false
 });
}
export function auditAIGStage1Anatomy(model){
 if(model?.schema!==AIG_STAGE1_SCHEMA)bad('UNRECOGNIZED_BODY_SOURCE');
 const ids=new Set(model.parts.map(x=>x.id));
 const check=['torso','neck','head',
  ...['left','right'].flatMap(s=>
   [s+'UpperArm',s+'Forearm',s+'Hand',s+'Thigh',s+'Calf',s+'Foot'])];
 const errors=[];
 for(const k of check)if(!ids.has(k))errors.push('MISSING_'+k);
 for(const s of ['left','right']){
  const hip=model.joints[s+'Hip'].position,
   knee=model.joints[s+'Knee'].position,
   ankle=model.joints[s+'Ankle'].position;
  if(!(hip[1]>knee[1]&&knee[1]>ankle[1]))
   errors.push('BAD_'+s.toUpperCase()+'_LEG_ORDER');
 }
 for(const p of model.parts){
  if(!p.geometry.positions.every(Number.isFinite))errors.push('NAN_'+p.id);
  const n=p.geometry.positions.length/3;
  if(p.geometry.indices.some(x=>x>=n))errors.push('BAD_INDEX_'+p.id);
 }
 if(model.gender==='male'&&!ids.has('swimBriefs'))errors.push('MALE_BRIEFS_MISSING');
 if(model.gender==='female'&&!ids.has('onePieceSwim'))errors.push('FEMALE_ONE_PIECE_MISSING');
 const surface=auditAIGStage1BodySurface(model);
 errors.push(...surface.actualBodySurfaceErrors);
 const result={
  schema:AIG_STAGE1_SCHEMA,
  gender:model.gender,
  actualSurfaceAudit:surface,
  coordinateUnits:model.originCoordinates.units,
  inspectedParts:check.length,actualJointCount:model.jointCount,
  actualTriangleCount:model.actualIndexedTriangles,
  structuralErrors:errors,
  automaticGeometryContractPASS:errors.length===0,
  visualSnapshotAcceptancePASS:false,
  fullProductionSkinnedRigPASS:false
 };
 return Object.freeze(result);
}
