/** FastModel 6.4: turn a verified user-selected stylized 2D model sheet
 * into PARAMETERS for a real skinned GLB generator (color + limited shapes).
 * Local deterministic heuristics; no third-party API. 2D is NOT 3D geometry.
 * Real WebGL reference-matching acceptance occurs separately in app.mjs.
 */
import {AIG57_PARTS} from './aig-native-appearance-5-7.mjs';
export const AIG64_SCHEMA='AIG_FASTMODEL_6_4_LOCAL_REFERENCE_GUIDED_REAL_GLB_APPEARANCE_DRAFT';
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v);
const finite=Number.isFinite,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const align4=n=>(n+3)&~3;
const roleMap=Object.freeze({
 [AIG57_PARTS[0]]:'face',
 [AIG57_PARTS[1]]:'blazer',
 [AIG57_PARTS[2]]:'shirt',
 [AIG57_PARTS[3]]:'skirt',
 [AIG57_PARTS[4]]:'bow',
 [AIG57_PARTS[5]]:'backpack',
 [AIG57_PARTS[6]]:'hair'
});
function pixelImageGuard(image){
 if(!Number.isInteger(image?.width)||!Number.isInteger(image?.height)||
   image.width<128||image.height<128||
   image.width*image.height>16000000||
   image.data?.length!==image.width*image.height*4)
  throw Error('AIG64_REAL_IMAGE_RGBA_REQUIRED');
}
const rgb=(data,i)=>[data[i]/255,data[i+1]/255,data[i+2]/255];
const luminance=p=>p[0]*.2126+p[1]*.7152+p[2]*.0722;
function chromaRole(p,role){
 const [r,g,b]=p,lum=luminance(p);
 switch(role){
  case 'hair':return r>g*1.10&&g>b*.98&&r>b*1.26&&lum>.07&&lum<.68;
  case 'blazer':return b>r*.95&&b>g*.96&&lum>.06&&lum<.45;
  case 'skirt':return b>r*.91&&b>g*.95&&lum>.07&&lum<.6;
  case 'shirt':return lum>.70&&Math.max(...p)-Math.min(...p)<.27;
  case 'bow':return r>g*1.40&&r>b*1.15&&lum>.05&&lum<.71;
  case 'backpack':return lum>.06&&lum<.38&&Math.max(...p)-Math.min(...p)<.35;
  case 'face':return r>g*1.08&&g>b*.95&&lum>.42&&lum<.91;
  default:return false;
 }
}
function roiGuard(image,b){
 if(!b||[b.x,b.y,b.width,b.height].some(x=>!finite(x)))throw Error('AIG64_INVALID_REFERENCE_ROI');
 const box={x:Math.round(b.x),y:Math.round(b.y),
  width:Math.round(b.width),height:Math.round(b.height)};
 if(box.x<0||box.y<0||box.width<64||box.height<64||
   box.x+box.width>image.width||box.y+box.height>image.height)
  throw Error('AIG64_REFERENCE_ROI_OUT_OF_BOUNDS');
 return box;
}
/** Automatically choose prominent center-connected foreground from the
 * user's generated model sheet; border/background contrast and multiple
 * characters can confuse this detector. It is NEVER called verified face ID.
 */
export function inferAIG64SingleCharacterROI(image){
 pixelImageGuard(image);
 const {width:w,height:h,data}=image;
 const border=[];
 const stride=Math.max(1,Math.floor(Math.min(w,h)/75));
 const collect=(x,y)=>{const k=(y*w+x)*4;if(data[k+3]>248)border.push(rgb(data,k));};
 for(let x=0;x<w;x+=stride){collect(x,0);collect(x,h-1);}
 for(let y=0;y<h;y+=stride){collect(0,y);collect(w-1,y);}
 if(border.length<8)throw Error('AIG64_NO_OPAQUE_BORDER_PIXELS');
 const bg=[0,1,2].map(k=>{
  const seq=border.map(p=>p[k]).sort((a,b)=>a-b);
  return seq[Math.floor(seq.length/2)];
 });
 const cell=clamp(Math.round(Math.max(w,h)/130),4,25);
 const cells=[];
 for(let y=cell;y<h-cell;y+=cell)for(let x=cell;x<w-cell;x+=cell){
  const index=(y*w+x)*4;
  if(data[index+3]<248)continue;
  const color=rgb(data,index),distance=Math.hypot(...color.map((v,k)=>v-bg[k]));
  // Assumes model sheets use a neutral/light background and character is
  // visually distinct; do not claim this is a semantic human segmenter.
  if(distance>.23)cells.push({x,y,weight:distance});
 }
 if(cells.length<20)throw Error('AIG64_FOREGROUND_NOT_RELIABLY_DETECTED');
 const bands=new Map();
 for(const p of cells){
  const key=Math.floor(p.x/(w/6));
  if(!bands.has(key))bands.set(key,[]);
  bands.get(key).push(p);
 }
 const ranked=[...bands.entries()].map(([band,points])=>({
  band,points,score:points.reduce((sum,p)=>sum+p.weight,0)*
    (1-.12*Math.abs(band-2.5))
 })).sort((a,b)=>b.score-a.score);
 const winner=ranked[0];
 if(winner.points.length<18)throw Error('AIG64_SUBJECT_TOO_SMALL');
 const xs=winner.points.map(p=>p.x),ys=winner.points.map(p=>p.y);
 // One subject can cross adjacent strips; expand and bound instead of
 // claiming all subject pixels were recovered.
 const x0=clamp(Math.min(...xs)-w*.075,0,w-64),x1=clamp(Math.max(...xs)+w*.075,x0+64,w);
 const y0=clamp(Math.min(...ys)-h*.075,0,h-64),y1=clamp(Math.max(...ys)+h*.075,y0+64,h);
 const roi={x:Math.floor(x0),y:Math.floor(y0),
  width:Math.floor(x1-x0),height:Math.floor(y1-y0)};
 return {roi,heuristic:'OPAQUE_BORDER_COLOR_CONTRAST_CENTER_BAND',
  backgroundMedianRGB:bg,foregroundSampleCells:winner.points.length,
  otherStrongBandsPresent:ranked.slice(1).some(b=>b.score>winner.score*.5),
  actualOneCharacterSegmentationProven:false,needsRealVisualCheck:true};
}
export function analyzeAIG64TargetPixels({
 image,referenceSHA256,roi=null,referenceId
}={}){
 pixelImageGuard(image);
 if(!hex(referenceSHA256)||typeof referenceId!=='string'||!referenceId)
  throw Error('AIG64_REFERENCE_SHA_OR_ID_REQUIRED');
 const auto=roi?null:inferAIG64SingleCharacterROI(image);
 const box=roiGuard(image,roi||auto.roi), {data,width}=image;
 const roles=['hair','blazer','shirt','skirt','bow','backpack','face'];
 const accum=Object.fromEntries(roles.map(r=>[r,[]]));
 const step=Math.max(1,Math.floor(Math.max(box.width,box.height)/250));
 for(let y=box.y;y<box.y+box.height;y+=step)for(let x=box.x;x<box.x+box.width;x+=step){
  const k=(y*width+x)*4;
  if(data[k+3]<245)continue;
  const p=rgb(data,k),t=(y-box.y)/box.height;
  if(t<.58&&chromaRole(p,'hair'))accum.hair.push(p);
  if(t>.16&&t<.69&&chromaRole(p,'blazer'))accum.blazer.push(p);
  if(t>.15&&t<.66&&chromaRole(p,'shirt'))accum.shirt.push(p);
  if(t>.46&&t<.82&&chromaRole(p,'skirt'))accum.skirt.push(p);
  if(t>.14&&t<.58&&chromaRole(p,'bow'))accum.bow.push(p);
  if(t>.13&&t<.77&&chromaRole(p,'backpack'))accum.backpack.push(p);
  if(t<.46&&chromaRole(p,'face'))accum.face.push(p);
 }
 const stats={};let detected=0;
 for(const role of roles){
  const points=accum[role],minSamples=24;
  if(points.length<minSamples){stats[role]={samples:points.length,color:null,
   sourceMeasured:false,reason:'LOW_ROLE_COLOR_SAMPLE_COUNT'};continue;}
  const color=[0,1,2].map(k=>{
   const seq=points.map(p=>p[k]).sort((a,b)=>a-b);
   return seq[Math.floor(seq.length/2)];
  });
  stats[role]={samples:points.length,color,sourceMeasured:true};detected++;
 }
 if(detected<2)throw Error('AIG64_INSUFFICIENT_OBSERVED_REFERENCE_COLORS');
 return {schema:AIG64_SCHEMA,referenceSHA256:referenceSHA256.toLowerCase(),
  referenceId,roi:box,automaticRegion:!roi,roiDetector:auto,
  palette:stats,observedRoles:detected,
  inferredImagePerspectiveDepth:false,measuredReal3DGeometry:false,
  canProvePhotoIdentity:false,allPriorOutfitsStillAvailable:true,
  releaseAllowed:false};
}
function decode(raw){
 const b=raw instanceof Uint8Array?raw:new Uint8Array(raw);
 if(b.byteLength<100||b.byteLength>12*1024*1024)
  throw Error('AIG64_GLB_SIZE');
 const view=new DataView(b.buffer,b.byteOffset,b.byteLength);
 if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||
  view.getUint32(8,true)!==b.length||view.getUint32(16,true)!==0x4e4f534a)
  throw Error('AIG64_GLB_HEADER');
 const jsonSize=view.getUint32(12,true),offset=20+jsonSize;
 if(jsonSize>4*1024*1024||offset+8>b.length||
    view.getUint32(offset+4,true)!==0x004e4942||
    offset+8+view.getUint32(offset,true)!==b.length)
  throw Error('AIG64_GLB_BINARY_LENGTH');
 return {json:JSON.parse(new TextDecoder().decode(b.subarray(20,offset))),
  binary:b.slice(offset+8)};
}
function encode(json,bytes){
 const jsonBytes=new TextEncoder().encode(JSON.stringify(json));
 const pad=align4(jsonBytes.byteLength);
 const out=new Uint8Array(12+8+pad+8+bytes.length);
 const view=new DataView(out.buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);
 view.setUint32(8,out.length,true);view.setUint32(12,pad,true);
 view.setUint32(16,0x4e4f534a,true);
 out.set(jsonBytes,20);out.fill(32,20+jsonBytes.length,20+pad);
 const off=20+pad;
 view.setUint32(off,bytes.length,true);view.setUint32(off+4,0x004e4942,true);
 out.set(bytes,off+8);return out;
}
function accessor(json,binary,id,count,componentType,type){
 const a=json.accessors[id],v=json.bufferViews[a?.bufferView];
 if(!a||!v||a.count!==count||a.componentType!==componentType||
  a.type!==type||a.byteOffset||v.byteStride||((v.byteOffset||0)%4)||
  v.byteOffset+v.byteLength>binary.length)
  throw Error('AIG64_UNSUPPORTED_INTERLEAVED_OR_MISSING_GLB_ATTRIBUTE');
 const off=v.byteOffset||0,bytes=count*({VEC3:12,VEC4:16}[type]);
 if(off+bytes>binary.length||v.byteLength<bytes)
  throw Error('AIG64_ATTRIBUTE_OUT_OF_BOUNDS');
 return {a,off,view:new DataView(binary.buffer,binary.byteOffset,binary.byteLength)};
}
/** Applies observed palette to COLOR_0 of REAL GLTF SkinnedMeshes, with
 * a strictly bounded shape scaling only if optional measurements supplied.
 * Every existing bone/weight/index/clip remains byte-identical.
 */
export function generateAIG64GuidedRealGLB({
 technicalGLB,technicalGLBSHA256,sourceImageSHA256,target,
 skirtWidthScale=1,hairLengthScale=1
}={}){
 if(!hex(technicalGLBSHA256)||!hex(sourceImageSHA256)||
  target?.schema!==AIG64_SCHEMA||!hex(target.referenceSHA256)||
  target.releaseAllowed!==false||
  !finite(skirtWidthScale)||skirtWidthScale<.94||skirtWidthScale>1.08||
  !finite(hairLengthScale)||hairLengthScale<.94||hairLengthScale>1.08)
  throw Error('AIG64_SOURCE_AND_SAFE_SHAPE_PARAMS_REQUIRED');
 const {json,binary}=decode(technicalGLB);
 if(!/AIG FastModel 5\.8 native procedural/.test(json.asset?.generator||'')||
  json.extras?.sourceImageSHA256!==sourceImageSHA256||
  json.skins?.[0]?.joints?.length!==17||
  json.animations?.length!==5||json.meshes?.length!==9)
  throw Error('AIG64_NATIVE_SCHOOL_SKINNED_GLB_REQUIRED');
 const affected=[];
 for(const [name,role] of Object.entries(roleMap)){
  const mesh=json.meshes.find(m=>m.name===name),p=mesh?.primitives?.[0];
  if(!p)throw Error('AIG64_REQUIRED_PART_MISSING_'+name);
  const pos=json.accessors[p.attributes.POSITION];
  const count=pos?.count||0;
  if(count<12||count>15000)throw Error('AIG64_ACCESSORY_VERTEX_BUDGET');
  const color=accessor(json,binary,p.attributes.COLOR_0,count,5126,'VEC4');
  const mark=target.palette?.[role];
  if(mark?.sourceMeasured===true){
   if(!Array.isArray(mark.color)||mark.color.length!==3||
    mark.color.some(v=>!finite(v)||v<0||v>1))
    throw Error('AIG64_FORGED_COLOR_EVIDENCE');
   for(let i=0;i<count;i++){
    const offset=color.off+i*16,prior=[0,1,2].map(k=>color.view.getFloat32(offset+k*4,true));
    // Preserve authored material detail while fitting the observed median;
    // clamp small variation to avoid flat recolored blobs.
    const originalRole={blazer:[.18,.21,.26],shirt:[.94,.93,.88],
     skirt:[.27,.29,.35],bow:[.54,.19,.23],backpack:[.25,.25,.31],
     hair:[.27,.12,.075],face:[.73,.55,.44]}[role];
    const ratio=prior.map((v,k)=>v/(originalRole[k]||1));
    for(let k=0;k<3;k++)color.view.setFloat32(offset+k*4,
     clamp(mark.color[k]*clamp(ratio[k],.72,1.4),.015,.98),true);
   }
   affected.push({name,role,vertices:count,sourceSamples:mark.samples});
  }
  if((name===AIG57_PARTS[3]&&skirtWidthScale!==1)||
     (name===AIG57_PARTS[6]&&hairLengthScale!==1)){
   const geom=accessor(json,binary,p.attributes.POSITION,count,5126,'VEC3');
   const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
   for(let i=0;i<count;i++){
    const idx=geom.off+i*12,xyz=[0,1,2].map(k=>geom.view.getFloat32(idx+k*4,true));
    if(xyz.some(v=>!finite(v)))throw Error('AIG64_NONFINITE_MESH');
    if(name===AIG57_PARTS[3]){
     const weight=clamp((1.115-xyz[1])/.32,0,1);
     xyz[0]*=1+(skirtWidthScale-1)*weight;
     xyz[2]*=1+(skirtWidthScale-1)*weight;
    }else{
     const weight=clamp((1.96-xyz[1])/.37,0,1);
     xyz[1]=1.96+(xyz[1]-1.96)* (1+(hairLengthScale-1)*weight);
    }
    for(let k=0;k<3;k++){
     geom.view.setFloat32(idx+k*4,xyz[k],true);
     lo[k]=Math.min(lo[k],xyz[k]);hi[k]=Math.max(hi[k],xyz[k]);
    }
   }
   geom.a.min=lo;geom.a.max=hi;
   // Tiny bounded deformation can change normals. Any large shape edit
   // requires the dedicated 5.8 normal/triangle recomputation pipeline.
  }
 }
 if(affected.length<2)throw Error('AIG64_TOO_FEW_ACTUAL_MATERIAL_CHANGES');
 json.asset.generator='AIG FastModel 6.4 local image conditioned real skinned school GLB refinement';
 json.extras={...json.extras,schema:AIG64_SCHEMA,
  inputTechnicalGLBSHA256:technicalGLBSHA256.toLowerCase(),
  originalPhotoSHA256:sourceImageSHA256.toLowerCase(),
  selectedStyleSheetSHA256:target.referenceSHA256,
  selectedStyleSheetReferenceId:target.referenceId,
  materialRolesAffected:affected,
  appliedSkirtWidthScale:skirtWidthScale,
  appliedHairLengthScale:hairLengthScale,
  sourceRenderStillNeedsRealWebGLQA:true,
  userVisualReferenceIs2DNotImported3D:true,
  sourceIdentity3DNotProven:true,
  otherWardrobesUnaffected:true,releaseAllowed:false};
 const bytes=encode(json,binary);
 return {schema:AIG64_SCHEMA,bytes,
  sourceImageSHA256:sourceImageSHA256.toLowerCase(),
  selected2DReferenceSHA256:target.referenceSHA256,
  inputTechnicalGLBSHA256:technicalGLBSHA256.toLowerCase(),
  modifiedRealSkinnedParts:affected,skirtWidthScale,hairLengthScale,
  preserved17BoneRig:true,preservedFiveAnimations:true,
  styleSheet2DIsNot3DModel:true,
  photo3DExactReconstructionProven:false,
  native60FPSValidated:false,releaseAllowed:false};
}
