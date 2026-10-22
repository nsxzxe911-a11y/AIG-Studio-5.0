/** AIG FastModel 7.3 — source-photo anchored facial makeup on genuine 3D SDF ray hits.
 * Immutable original pixels; no procedural replacement face or inferred identity.
 * Face ROI requires EXPLICIT USER REVIEW. Back/sides have estimated neutral material,
 * never mirrored photo or verified rear skin. Eye/lip positions are cosmetic presets,
 * NOT detected facial landmarks or claimed human anatomy.
 */
import {raycastImplicitVolume} from './aig-implicit-volume-7-1.mjs';
import {raycastAIG72Volume,sampleAIG72DeformedVolume} from './aig-volumetric-deform-7-2.mjs';
export const AIG73_SCHEMA='AIG_FASTMODEL_7_3_REVIEWED_FACE_2D_UV_ON_3D_SURFACE_MATERIAL';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=Number.isFinite;
const validRGBA=(image)=>image&&Number.isInteger(image.width)&&Number.isInteger(image.height)&&
 image.width>=32&&image.height>=32&&image.width*image.height<=1600000&&
 (image.data instanceof Uint8ClampedArray||image.data instanceof Uint8Array)&&image.data.length===image.width*image.height*4;
export function flipAIG73RGBA(image){
 if(!validRGBA(image))throw Error('AIG73_RGBA_REQUIRED');
 const {width:w,height:h,data}=image,out=new Uint8ClampedArray(data.length);
 for(let y=0;y<h;y++)out.set(data.subarray(y*w*4,(y+1)*w*4),(h-y-1)*w*4);
 return {width:w,height:h,data:out,flippedFor3DUp:true};
}
export function validateAIG73FaceROI(image,rect,{reviewed=false,sourceSHA256=null}={}){
 if(!validRGBA(image)||!rect||!['x','y','width','height'].every(k=>finite(rect[k]))||
  rect.width<.07||rect.height<.09||rect.width>.94||rect.height>.95||
  rect.x<0||rect.y<0||rect.x+rect.width>1||rect.y+rect.height>1||
  rect.width*image.width<14||rect.height*image.height<14)
   throw Error('AIG73_FACE_ROI_INVALID');
 if(sourceSHA256!==null&&!/^[a-f0-9]{64}$/i.test(sourceSHA256))throw Error('AIG73_SOURCE_SHA_INVALID');
 return {schema:'AIG_FASTMODEL_7_3_FACE_ROI',...rect,reviewed:reviewed===true,sourceSHA256,
  identityRecognized:false,photoLandmarksVerified:false,uncertainty:'EYES_AND_MOUTH_PRESET_NOT_DETECTED'};
}
const gaussian=(x,y,cx,cy,rx,ry)=>{
 const q=((x-cx)/rx)**2+((y-cy)/ry)**2;
 return Math.exp(-2.4*q)*(q<2.3?1:0);
};
const color=(hex)=>{
 if(!/^#[0-9a-f]{6}$/i.test(hex))throw Error('AIG73_COLOR_HEX_INVALID');
 return [1,3,5].map(k=>parseInt(hex.slice(k,k+2),16));
};
const mix=(a,b,w)=>a.map((v,i)=>clamp(v+(b[i]-v)*clamp(w,0,1),0,255));
export function makeAIG73Makeup({foundation='#d7b69d',blush='#d46886',lips='#bc365f',eyes='#6d527d',
 foundationStrength=0,blushStrength=.36,lipsStrength=.60,eyesStrength=.28,eyeHeight=0,lipHeight=0}={}){
 if(![foundationStrength,blushStrength,lipsStrength,eyesStrength].every(v=>finite(v)&&v>=0&&v<=1)||
  ![eyeHeight,lipHeight].every(v=>finite(v)&&Math.abs(v)<=.12))throw Error('AIG73_MAKEUP_SETTINGS_INVALID');
 return {foundation:color(foundation),blush:color(blush),lips:color(lips),eyes:color(eyes),
  foundationStrength,blushStrength,lipsStrength,eyesStrength,eyeHeight,lipHeight};
}
function sampleImage(image,u,v){
 const {width:w,height:h,data}=image;
 const x=clamp(u,0,1)*(w-1),y=clamp(v,0,1)*(h-1),x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1),tx=x-x0,ty=y-y0;
 const fetch=(ix,iy,c)=>data[(iy*w+ix)*4+c];
 return [0,1,2,3].map(c=>(fetch(x0,y0,c)*(1-tx)+fetch(x1,y0,c)*tx)*(1-ty)+(fetch(x0,y1,c)*(1-tx)+fetch(x1,y1,c)*tx)*ty);
}
export function projectAIG73SourceUV(field,p){
 if(!field?.gridWidth||!field.gridHeight||!finite(field.cellSize)||!Array.isArray(p)||p.length!==3||!p.every(finite))throw Error('AIG73_UV_INVALID');
 const u=(p[0]/field.cellSize+field.gridWidth/2)/field.gridWidth;
 // The SDF is constructed from vertically flipped source mask: +Y is upward.
 const v=1-(p[1]/field.cellSize+field.gridHeight/2)/field.gridHeight;
 return [u,v];
}
export function shadeAIG73Surface({image,field,roi,makeup,point,normal,light=[.45,.7,1]}){
 if(!validRGBA(image)||!field||!roi||!makeup||!Array.isArray(point)||point.length!==3||!point.every(finite)||
  !Array.isArray(normal)||normal.length!==3||!normal.every(finite))throw Error('AIG73_SURFACE_INPUT_INVALID');
 const [u,v]=projectAIG73SourceUV(field,point);
 // Back and side are inferred. Real source pixels are not cloned onto unseen faces.
 const front=point[2]>=0&&normal[2]>.32;
 if(!front)return {rgb:[68,86,99],source:'INFERRED_SIDE_OR_BACK_NEUTRAL',cosmeticOpacity:0,uv:[u,v]};
 const [r,g,b,a]=sampleImage(image,u,v);
 if(a<16)return {rgb:[72,86,97],source:'SOURCE_ALPHA_TRANSPARENT_NEUTRAL',cosmeticOpacity:0,uv:[u,v]};
 let rgb=[r,g,b],opacity=0;
 if(roi.reviewed){
  const fx=(u-roi.x)/roi.width,fy=(v-roi.y)/roi.height;
  const face=gaussian(fx,fy,.5,.49,.58,.62);
  const steps=[
   [makeup.foundation,makeup.foundationStrength*face*.42],
   [makeup.blush,makeup.blushStrength*(gaussian(fx,fy,.28,.62,.16,.11)+gaussian(fx,fy,.72,.62,.16,.11))],
   [makeup.eyes,makeup.eyesStrength*(gaussian(fx,fy,.32,.37+makeup.eyeHeight,.18,.075)+gaussian(fx,fy,.68,.37+makeup.eyeHeight,.18,.075))],
   [makeup.lips,makeup.lipsStrength*gaussian(fx,fy,.5,.78+makeup.lipHeight,.16,.065)]
  ];
  for(const [c,weight] of steps){const alpha=clamp(weight,0,.85);rgb=mix(rgb,c,alpha);opacity=1-(1-opacity)*(1-alpha);}
 }
 const L=Math.hypot(...light)||1,nLen=Math.hypot(...normal)||1,nd=Math.max(0,normal.reduce((s,v,i)=>s+v*light[i],0)/(L*nLen));
 const lighting=clamp(.48+.56*nd,.3,1.12);
 return {rgb:rgb.map(v=>Math.round(clamp(v*lighting,0,255))),source:'SOURCE_PHOTO_FRONT_PROJECTION',cosmeticOpacity:opacity,uv:[u,v]};
}
export function renderAIG73FaceMaterial(field,image,{roi=null,makeup=makeAIG73Makeup(),width=96,height=96,yaw=0,pitch=0,maxSteps=88,body=null}={}){
 if(!validRGBA(image)||!field||!Number.isInteger(width)||!Number.isInteger(height)||width<16||height<16||width*height>12000||
  ![yaw,pitch].every(finite)||Math.abs(pitch)>1.35||!Number.isInteger(maxSteps)||maxSteps<12||maxSteps>160)throw Error('AIG73_RENDER_INPUT_INVALID');
 const pixels=new Uint8ClampedArray(width*height*4),eye=[2*Math.sin(yaw)*Math.cos(pitch),2*Math.sin(pitch),2*Math.cos(yaw)*Math.cos(pitch)],fwd=eye.map(v=>-v/2);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const normalized=a=>{const l=Math.hypot(...a);return a.map(v=>v/(l||1));};
 const right=normalized(cross(fwd,[0,1,0])),up=normalized(cross(right,fwd));
 let hitPixels=0,photoPixels=0,inferredPixels=0,cosmeticPixels=0,alphaFallbackPixels=0;
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const at=(j*width+i)*4,dx=((i+.5)/width-.5)*1.45*width/height,dy=(.5-(j+.5)/height)*1.45,
   origin=eye.map((v,k)=>v+right[k]*dx+up[k]*dy);
  const ray=body?raycastAIG72Volume(body,origin,fwd,{maxSteps,maxDistance:4}):
    raycastImplicitVolume(field,origin,fwd,{maxSteps,maxDistance:4});
  let rgb=[3,10,19];
  if(ray.hit){
   hitPixels++;
   const referencePoint=body?sampleAIG72DeformedVolume(body,ray.point).referencePoint:ray.point;
   const shaded=shadeAIG73Surface({image,field,roi,makeup,point:referencePoint,normal:ray.normal});
   rgb=shaded.rgb;
   if(shaded.source==='SOURCE_PHOTO_FRONT_PROJECTION'){photoPixels++;if(shaded.cosmeticOpacity>.01)cosmeticPixels++;}
   else if(shaded.source==='SOURCE_ALPHA_TRANSPARENT_NEUTRAL')alphaFallbackPixels++;
   else inferredPixels++;
  }
  pixels[at]=rgb[0];pixels[at+1]=rgb[1];pixels[at+2]=rgb[2];pixels[at+3]=255;
 }
 return {schema:'AIG_FASTMODEL_7_3_PHOTO_PROJECTED_TRUE_SDF_RENDER',pixels,width,height,hitPixels,photoPixels,inferredPixels,alphaFallbackPixels,cosmeticPixels,
  source:'REAL_IMAGE_FRONT_ONLY',faceBoxReviewed:roi?.reviewed===true,sideAndRearEstimated:true,xyzDeformationSampled:body!==null,
  actualPhotoFaceRecovered3D:false,verifiedFaceLandmarks:false,skeletalFaceAnimation:false,photorealCharacterApproved:false};
}
