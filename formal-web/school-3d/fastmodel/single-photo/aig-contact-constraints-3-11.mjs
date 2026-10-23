/**
 * Real3D 3.11 — source-labelled, posed-body coarse contact proxies.
 * Corrects hair tails against shoulders/upper torso and procedural skirt
 * against legs, in actual XYZ geometry. NO claim of watertight cloth collision,
 * medical anatomy, mass-spring cloth dynamics or natural hair simulation.
 * Uses original per-vertex labels and 3.1 real joint deformation, not
 * photograph pixels or fake meshes. Fail-closed on bad source inputs.
 */
export const AIG311_CONTACT_SCHEMA='AIG_REAL3D_3_11_REAL_POSE_CONTACT_PROXY';
const fail=s=>{throw Error('AIG311_CONTACT_'+s)};
const groups=Object.freeze({
 hair:[
  {id:'UPPER_TORSO',classes:[5,14],minPoints:22},
  {id:'LEFT_SHOULDER_ARM',classes:[6],minPoints:22},
  {id:'RIGHT_SHOULDER_ARM',classes:[7],minPoints:22}
 ],
 skirt:[
  {id:'LEFT_LEG',classes:[10,12],minPoints:22},
  {id:'RIGHT_LEG',classes:[11,13],minPoints:22}
 ]
});
function isFloat3(v){return v instanceof Float32Array&&v.length%3===0&&v.length>0}
function buildProxy(points,labels,group,margin){
 const classes=new Set(group.classes),low=[Infinity,Infinity,Infinity],
  high=[-Infinity,-Infinity,-Infinity];
 let n=0;
 for(let i=0;i<labels.length;i++){
  if(!classes.has(labels[i]))continue;
  const k=i*3;
  for(let axis=0;axis<3;axis++){
   const v=points[k+axis];
   low[axis]=Math.min(low[axis],v);high[axis]=Math.max(high[axis],v);
  }
  n++;
 }
 if(n<group.minPoints)return null;
 const radius=high.map((v,i)=>(v-low[i])/2+margin);
 // Ellipsoids are conservative coarse collision PROXIES only; never use
 // a flat or missing labelled body region to invent usable collision.
 if(radius.some(x=>x<=margin+1e-5))return null;
 return Object.freeze({id:group.id,fromActualPosedBodyLabels:true,
  sourceSampledVertices:n,
  center:low.map((v,i)=>(v+high[i])/2),
  radii:radius});
}
export function buildAIG311PoseContactProxies({
 bodyPosed,sourceLabels,mode='hair',marginRatio=.006
}={}){
 if(!isFloat3(bodyPosed)||!(sourceLabels instanceof Uint8Array)||
  sourceLabels.length*3!==bodyPosed.length||
  !Object.hasOwn(groups,mode)||
  !Number.isFinite(marginRatio)||marginRatio<0||marginRatio>.05||
  !bodyPosed.every(Number.isFinite))
  fail('REAL_POSED_SOURCE_AND_CLASSES_REQUIRED');
 let minY=Infinity,maxY=-Infinity;
 for(let i=1;i<bodyPosed.length;i+=3){
  minY=Math.min(minY,bodyPosed[i]);maxY=Math.max(maxY,bodyPosed[i]);
 }
 const height=maxY-minY;
 if(height<.05)fail('DEGENERATE_BODY_HEIGHT');
 const margin=Math.max(height*marginRatio,0.00001);
 const active=groups[mode].map(group=>buildProxy(
  bodyPosed,sourceLabels,group,margin)).filter(Boolean);
 return Object.freeze({schema:AIG311_CONTACT_SCHEMA,mode,
  activeProxies:active,sourceBoundCollisionApproximation:true,
  measuredBodyHeightUnits:height,contactMarginUnits:margin,
  expectedRegionCount:groups[mode].length,
  absentRegions:groups[mode].filter(g=>
   !active.some(p=>p.id===g.id)).map(g=>g.id),
  trueFullBodyCollisionProven:false});
}
function inside(p,c){
 let d2=0;
 for(let k=0;k<3;k++){
  const v=(p[k]-c.center[k])/c.radii[k];
  d2+=v*v;
 }
 return d2<1-1e-7;
}
export function resolveAIG311PoseContacts({
 posedAttachment,bodyPosed,sourceLabels,mode,
 maxCorrectionRatio=.08,marginRatio=.006,passes=2
}={}){
 if(!isFloat3(posedAttachment)||!Number.isInteger(passes)||
  passes<1||passes>4||!Number.isFinite(maxCorrectionRatio)||
  maxCorrectionRatio<=0||maxCorrectionRatio>.2||
  !posedAttachment.every(Number.isFinite))
  fail('ATTACHMENT_CONTACT_INPUT_INVALID');
 const proxies=buildAIG311PoseContactProxies({
  bodyPosed,sourceLabels,mode,marginRatio});
 const out=new Float32Array(posedAttachment);
 const cap=proxies.measuredBodyHeightUnits*maxCorrectionRatio;
 let corrected=0,candidates=0,maxApplied=0;
 for(let i=0;i<out.length;i+=3){
  const start=[out[i],out[i+1],out[i+2]];
  let p=[...start],hit=false;
  for(let pass=0;pass<passes;pass++){
   let changed=false;
   for(const collider of proxies.activeProxies){
    if(!inside(p,collider))continue;
    hit=true;
    const diff=p.map((v,k)=>v-collider.center[k]);
    let norm=Math.hypot(...diff.map((v,k)=>v/collider.radii[k]));
    // Center is ambiguous: shift rearward for hair, outward for skirt.
    if(norm<1e-8){
     if(mode==='hair')p[2]=collider.center[2]-collider.radii[2];
     else p[0]=collider.center[0]+
      (collider.id==='LEFT_LEG'?-1:1)*collider.radii[0];
    }else{
     // Exact ray projection to coarse ellipsoid, subsequently bounded.
     const f=1/norm;
     p=p.map((v,k)=>collider.center[k]+diff[k]*f);
    }
    const shift=p.map((v,k)=>v-start[k]),total=Math.hypot(...shift);
    if(total>cap){
     p=start.map((v,k)=>v+shift[k]*cap/total);
    }
    changed=true;
   }
   if(!changed)break;
  }
  if(hit)candidates++;
  const dis=Math.hypot(...p.map((v,k)=>v-start[k]));
  if(dis>1e-9){
   corrected++;maxApplied=Math.max(maxApplied,dis);
   for(let k=0;k<3;k++)out[i+k]=p[k];
  }
 }
 let remaining=0;
 for(let i=0;i<out.length;i+=3){
  const point=[out[i],out[i+1],out[i+2]];
  if(proxies.activeProxies.some(c=>inside(point,c)))remaining++;
 }
 return Object.freeze({
  schema:AIG311_CONTACT_SCHEMA,
  positions:out,mode,
  actualAttachmentVertices:out.length/3,
  actualCollisionCandidateVertices:candidates,
  actualCorrectedVertices:corrected,
  remainingCoarseProxyPenetrations:remaining,
  maximumCorrectionAppliedUnits:maxApplied,
  maximumPermittedCorrectionUnits:cap,
  actualSourceBodyProxyCount:proxies.activeProxies.length,
  unavailableSourceRegions:proxies.absentRegions,
  inputAttachmentUnmodified:true,
  sourceBodyUnmodified:true,
  originalClothesOrHairRestUnmodified:true,
  actualContactResolutionApplied:corrected>0,
  fullSkinAndFabricIntersectionFreeCertified:false,
  continuousClothAndHairPhysicsCertified:false,
  productionAppearanceAccepted:false
 });
}
