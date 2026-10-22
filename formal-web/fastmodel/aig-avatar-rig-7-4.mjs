/** AIG FastModel 7.4 | MMORPG-style authorable avatar preset, expression clips
 * and genuine XYZ deforming SDF surface. Input landmarks are unverified manual
 * face-box RELATIVE PRESETS. No measured face depth, bone detection, likeness
 * certification, server persistence, MMO networking, or native device claim.
 */
import {sampleImplicitVolume} from './aig-implicit-volume-7-1.mjs';
import {shadeAIG73Surface,makeAIG73Makeup,validateAIG73FaceROI} from './aig-face-material-7-3.mjs';
export const AIG74_SCHEMA='AIG_FASTMODEL_7_4_LOCAL_AVATAR_AUTHORING_XYZ_EXPRESSION';
export const AIG74_CHANNELS=Object.freeze(['jawOpen','smile','blinkLeft','blinkRight','browRaise']);
const finite=Number.isFinite,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const norm=v=>{const l=Math.hypot(...v);return l>1e-12?v.map(x=>x/l):[0,0,1];};
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const gauss=(u,v,cx,cy,rx,ry)=>Math.exp(-2.5*(((u-cx)/rx)**2+((v-cy)/ry)**2));
export function createAIG74Expression(channels={}){
 if(!channels||typeof channels!=='object'||Array.isArray(channels)||Object.keys(channels).some(k=>!AIG74_CHANNELS.includes(k)))throw Error('AIG74_EXPRESSION_CHANNEL_INVALID');
 const result={};for(const key of AIG74_CHANNELS){
  const x=channels[key]??0;if(!finite(x)||x<0||x>1)throw Error('AIG74_EXPRESSION_RANGE_INVALID');result[key]=x;
 }return result;
}
export function createAIG74AvatarPreset({name='Avatar local',sourceSHA256,faceROI,makeup={},expression={},revision=1}={}){
 if(typeof name!=='string'||!name.trim()||name.length>64||/[\u0000-\u001f]/.test(name)||
  !/^[a-f0-9]{64}$/i.test(sourceSHA256||'')||
  !faceROI||!faceROI.reviewed||!['x','y','width','height'].every(k=>finite(faceROI[k]))||
  faceROI.x<0||faceROI.y<0||faceROI.width<=.07||faceROI.height<=.09||
  faceROI.x+faceROI.width>1||faceROI.y+faceROI.height>1||
  revision!==1)throw Error('AIG74_PRESET_SOURCE_OR_REVIEW_REQUIRED');
 const face={x:faceROI.x,y:faceROI.y,width:faceROI.width,height:faceROI.height,reviewed:true,sourceSHA256:sourceSHA256.toLowerCase()};
 // Reject unknown cosmetic fields and do not store original source image pixels.
 const colorFields=['foundation','blush','lips','eyes'],strengths=['foundationStrength','blushStrength','lipsStrength','eyesStrength'],heights=['eyeHeight','lipHeight'];
 if(!makeup||typeof makeup!=='object'||Object.keys(makeup).some(x=>![...colorFields,...strengths,...heights].includes(x)))throw Error('AIG74_PRESET_MAKEUP_INVALID');
 const normalized={};for(const k of colorFields){
  if(makeup[k]!==undefined){if(typeof makeup[k]!=='string'||!/^#[0-9a-f]{6}$/i.test(makeup[k]))throw Error('AIG74_PRESET_COLOR_INVALID');normalized[k]=makeup[k];}
 }
 for(const k of [...strengths,...heights])if(makeup[k]!==undefined){
  const v=makeup[k];if(!finite(v)||(heights.includes(k)?Math.abs(v)>.12:v<0||v>1))throw Error('AIG74_PRESET_MAKEUP_RANGE');normalized[k]=v;
 }
 const colors=makeAIG73Makeup(normalized);
 return {schema:AIG74_SCHEMA,revision:1,name:name.trim(),sourceSHA256:sourceSHA256.toLowerCase(),
  faceROI:face,cosmetics:{
   foundation:normalized.foundation??'#d7b69d',blush:normalized.blush??'#d46886',
   eyes:normalized.eyes??'#6d527d',lips:normalized.lips??'#bc365f',
   foundationStrength:colors.foundationStrength,blushStrength:colors.blushStrength,
   eyesStrength:colors.eyesStrength,lipsStrength:colors.lipsStrength,
   eyeHeight:colors.eyeHeight,lipHeight:colors.lipHeight
  },expression:createAIG74Expression(expression),
  geometryTruth:'OBSERVED_2D_PHOTO_WITH_ESTIMATED_Z',faceLandmarksMeasured:false,
  anatomicalFaceReconstructionVerified:false,networkProfileSynced:false};
}
export function parseAIG74AvatarPreset(json,requiredSourceSHA256){
 if(typeof json!=='string'||json.length>16000)throw Error('AIG74_PRESET_JSON_BUDGET');
 let item;try{item=JSON.parse(json);}catch{throw Error('AIG74_PRESET_JSON_INVALID');}
 if(!item||item.schema!==AIG74_SCHEMA||item.revision!==1||item.sourceSHA256!==requiredSourceSHA256?.toLowerCase())throw Error('AIG74_PRESET_PHOTO_SHA_MISMATCH');
 return createAIG74AvatarPreset({name:item.name,sourceSHA256:item.sourceSHA256,faceROI:item.faceROI,makeup:item.cosmetics,expression:item.expression,revision:item.revision});
}
export function evaluateAIG74Clip(name,timeSeconds){
 if(!['idle','blink','smile','talk'].includes(name)||!finite(timeSeconds)||timeSeconds<0||timeSeconds>3600)throw Error('AIG74_CLIP_OR_TIME_INVALID');
 const t=timeSeconds,out=createAIG74Expression();
 if(name==='blink'){
  const phase=t%2.8;out.blinkLeft=out.blinkRight=phase<.28?Math.sin(Math.PI*phase/.28)**2:0;
 }else if(name==='smile'){out.smile=.50+.42*Math.sin(t*1.7)**2;}
 else if(name==='talk'){out.jawOpen=.22+.52*Math.sin(t*8)**2;out.smile=.12;}
 else if(name==='idle'){const phase=t%4.1;out.blinkLeft=out.blinkRight=phase<.16?Math.sin(Math.PI*phase/.16)**2:0;}
 return out;
}
function roiForExpression(face){
 if(!face?.reviewed||!['x','y','width','height'].every(k=>finite(face[k]))||
 face.x<0||face.y<0||face.width<.07||face.height<.09||face.x+face.width>1||face.y+face.height>1)throw Error('AIG74_FACE_REVIEW_REQUIRED');
 return face;
}
function displacement(field,face,expr,q){
 const roi=roiForExpression(face),[hx,hy]=field.xyBounds;
 const u=(q[0]+hx)/(2*hx),v=(hy-q[1])/(2*hy),fx=(u-roi.x)/roi.width,fy=(v-roi.y)/roi.height;
 // Procedural *relative* placements. No recognition/measurement claim.
 const xl=gauss(fx,fy,.31,.38,.22,.11),xr=gauss(fx,fy,.69,.38,.22,.11),
  jaw=gauss(fx,fy,.5,.79,.36,.19),chin=gauss(fx,fy,.5,.96,.55,.2),
  cornerL=gauss(fx,fy,.30,.74,.14,.14),cornerR=gauss(fx,fy,.70,.74,.14,.14),
  brow=gauss(fx,fy,.5,.25,.55,.13);
 const nearFront=clamp((q[2]+field.halfDepth)/(2*field.halfDepth),0,1),front=.25+.75*nearFront;
 return [
  front*(.025*expr.smile*(cornerR-cornerL)+.003*(expr.blinkRight*xr-expr.blinkLeft*xl)),
  front*(.052*expr.smile*(cornerL+cornerR)-.075*expr.jawOpen*(jaw+.28*chin)
   -.012*(expr.blinkLeft*xl+expr.blinkRight*xr)+.039*expr.browRaise*brow),
  front*(-.025*(expr.blinkLeft*xl+expr.blinkRight*xr)+.034*expr.jawOpen*jaw+.014*expr.smile*(cornerL+cornerR))
 ];
}
export function warpAIG74FacePoint(field,face,expression,reference){
 if(!field?.xyBounds||!Array.isArray(reference)||reference.length!==3||!reference.every(finite))throw Error('AIG74_REFERENCE_POINT_INVALID');
 const expr=createAIG74Expression(expression);
 return add(reference,displacement(field,face,expr,reference));
}
export function inverseAIG74FacePoint(field,face,expression,world,{iterations=6}={}){
 if(!Array.isArray(world)||world.length!==3||!world.every(finite)||!Number.isInteger(iterations)||iterations<1||iterations>12)throw Error('AIG74_INVERSE_INPUT_INVALID');
 const expr=createAIG74Expression(expression);let p=[...world];
 for(let i=0;i<iterations;i++)p=sub(world,displacement(field,face,expr,p));
 return p;
}
export function sampleAIG74ExpressionVolume(field,face,expression,world){
 const q=inverseAIG74FacePoint(field,face,expression,world);
 return {signedDistance:sampleImplicitVolume(field,q),sourcePoint:q,
  raySurfaceIsTrueXYZ:true,anatomicalSkinVerified:false};
}
export function normalAIG74Expression(field,face,expression,point,delta=.002){
 if(!finite(delta)||delta<=0||delta>.02)throw Error('AIG74_NORMAL_DELTA_INVALID');
 const gradient=[0,0,0];
 for(let k=0;k<3;k++){
  const a=[...point],b=[...point];a[k]+=delta;b[k]-=delta;
  gradient[k]=sampleAIG74ExpressionVolume(field,face,expression,a).signedDistance-
   sampleAIG74ExpressionVolume(field,face,expression,b).signedDistance;
 }
 return norm(gradient);
}
export function raycastAIG74Expression(field,face,expression,origin,direction,{maxSteps=112,epsilon=.0015,maxDistance=4}={}){
 if(![origin,direction].every(a=>Array.isArray(a)&&a.length===3&&a.every(finite))||Math.hypot(...direction)<1e-10||
  !Number.isInteger(maxSteps)||maxSteps<8||maxSteps>230||![epsilon,maxDistance].every(finite)||epsilon<=0||maxDistance<=0)throw Error('AIG74_RAY_INVALID');
 const dir=norm(direction);let t=0,steps=0,previousDistance=Infinity,previousT=0;
 for(;steps<maxSteps&&t<=maxDistance;steps++){
  const point=add(origin,mul(dir,t)),sample=sampleAIG74ExpressionVolume(field,face,expression,point),d=sample.signedDistance;
  if(d<epsilon){
   if(previousDistance>0&&t>0){
    let lo=previousT,hi=t;
    for(let j=0;j<6;j++){
     const mid=(lo+hi)/2;
     if(sampleAIG74ExpressionVolume(field,face,expression,add(origin,mul(dir,mid))).signedDistance>0)lo=mid;else hi=mid;
    }
    t=hi;
   }
   const hit=add(origin,mul(dir,t));
   return {hit:true,point:hit,referencePoint:inverseAIG74FacePoint(field,face,expression,hit),
    normal:normalAIG74Expression(field,face,expression,hit),steps:steps+1,distance:t};
  }
  previousDistance=d;previousT=t;
  // Deformed SDF is NOT distance-preserving. Use conservative fixed maximum.
  t+=clamp(Math.max(.0018,d*.38),.0018,.055);
 }
 return {hit:false,steps,point:null,referencePoint:null,normal:null,distance:null};
}
export function renderAIG74Avatar(field,image,{faceROI,cosmetics={},expression={},width=64,height=64,yaw=0,pitch=0,maxSteps=100}={}){
 if(!field?.xyBounds||!image||![width,height].every(n=>Number.isInteger(n)&&n>=16&&n<=180)||
 width*height>10000||![yaw,pitch].every(finite)||Math.abs(pitch)>1.35)throw Error('AIG74_RENDER_INPUT_INVALID');
 const roi=roiForExpression(faceROI),expr=createAIG74Expression(expression),makeup=makeAIG73Makeup(cosmetics),
  pixels=new Uint8ClampedArray(width*height*4);
 const camera=[2*Math.sin(yaw)*Math.cos(pitch),2*Math.sin(pitch),2*Math.cos(yaw)*Math.cos(pitch)],
  forward=norm(mul(camera,-1)),right=norm(cross(forward,[0,1,0])),up=norm(cross(right,forward));
 let hits=0,sourcePhotoPixels=0,estimatedRearPixels=0,cosmeticPixels=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const pos=(y*width+x)*4,dx=((x+.5)/width-.5)*1.45*width/height,dy=(.5-(y+.5)/height)*1.45,
   origin=add(camera,add(mul(right,dx),mul(up,dy))),
   ray=raycastAIG74Expression(field,roi,expr,origin,forward,{maxSteps});
  let rgb=[3,10,19];
  if(ray.hit){
   hits++;
   const shaded=shadeAIG73Surface({image,field,roi,makeup,point:ray.referencePoint,normal:ray.normal});
   rgb=shaded.rgb;
   if(shaded.source==='SOURCE_PHOTO_FRONT_PROJECTION'){sourcePhotoPixels++;if(shaded.cosmeticOpacity>.02)cosmeticPixels++;}
   else estimatedRearPixels++;
  }
  pixels.set([...rgb,255],pos);
 }
 return {schema:'AIG_FASTMODEL_7_4_3D_EXPRESSION_RAY_OUTPUT',width,height,pixels,hits,sourcePhotoPixels,
  estimatedRearPixels,cosmeticPixels,expression:expr,realXYZZSurfaceMotion:true,
  faceFeaturesUserReviewedOnly:true,anatomicalFacialRigApproved:false,actualMMOServer:false};
}
