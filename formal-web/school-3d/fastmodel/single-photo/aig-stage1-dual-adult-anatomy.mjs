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
 male:Object.freeze({height:1.78,shoulder:.137,hip:.105,
  waist:.091,chest:.129,headX:.061,headY:.071,armX:.153,
  legX:.064,legThigh:.066,legCalf:.045,
  swim:'fitted-briefs',swimColor:'#234b71'}),
 female:Object.freeze({height:1.68,shoulder:.119,hip:.116,
  waist:.084,chest:.115,headX:.061,headY:.072,armX:.145,
  legX:.066,legThigh:.069,legCalf:.048,
  swim:'fitted-one-piece',swimColor:'#296f72'})
});
const round=v=>+v.toFixed(6);
const vertices=[],indices=[];
function loft(points,{segments=28,caps=true}={}){
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
  [.510,0,0,p.hip*.69,.070],
  [.537,0,0,p.hip*.91,.091],
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
 const head=[
  [.863,0,0,.028,.028],
  [.882,0,-.002,p.headX*.75,.040],
  [.904,0,-.004,p.headX*.98,.053],
  [.934,0,-.003,p.headX,.057],
  [.958,0,-.001,p.headX*.95,.053],
  [.978,0,0,p.headX*.73,.046],
  [.991,0,0,p.headX*.34,.024],
  [1.000,0,0,.004,.005]
 ];
 put('head','neutral-head-no-hair-no-face-texture',head,'body','neck');
 for(const s of [-1,1]){
  const side=s<0?'left':'right';
  const armStart=s*p.shoulder,elbow=s*(p.armX+.036),
   wrist=s*(p.armX+.054),hand=s*(p.armX+.057);
  put(side+'UpperArm','upper-arm',[
   [.808,armStart,0,.036,.041],
   [.787,armStart+s*.016,0,.042,.042],
   [.745,armStart+s*.023,-.001,.039,.039],
   [.704,armStart+s*.035,-.003,.033,.034],
   [.657,elbow,-.004,.028,.029],
   [.640,elbow,-.004,.027,.027]
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
   [.522,hip,0,p.legThigh*.90,.073],
   [.499,hip,0,p.legThigh,.075],
   [.456,hip+s*.002,0,p.legThigh*.94,.072],
   [.394,hip+s*.002,-.005,p.legThigh*.78,.064],
   [.333,knee,-.014,.049,.049],
   [.285,knee,-.018,.041,.044]
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
   [.015,ankle,-.060,.012,.025]
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
 const result={
  schema:AIG_STAGE1_SCHEMA,
  gender:model.gender,
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
