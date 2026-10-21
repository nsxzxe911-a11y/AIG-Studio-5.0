/** FastModel 6.0 — actual user-marked original-photo facial proportions
 * -> modified 3D face SkinnedMesh vertices. Only measured 2D ratios: never
 * label the resulting geometry a reconstruction of unseen photo depth.
 * All body geometry, five GLB clips, clothing and skinned weights remain.
 */
import {auditAIG58RealPoseContacts} from './aig-appearance-fit-5-8.mjs';
import {AIG57_PARTS} from './aig-native-appearance-5-7.mjs';

export const AIG60_SCHEMA='AIG_FASTMODEL_6_0_USER_MEASURED_FACE_2D_TO_REAL_3D_FIT_TECHNICAL';
export const AIG60_MARKS=Object.freeze(['forehead','leftEye','rightEye','nose','mouth','chin']);
const isHash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const finite=Number.isFinite,clamp=(v,low,high)=>Math.min(high,Math.max(low,v));
const align4=x=>(x+3)&~3;

export function calibrateAIG60FaceMarks({imageWidth,imageHeight,sourceImageSHA256,marks}={}){
 if(!Number.isInteger(imageWidth)||!Number.isInteger(imageHeight)||
  imageWidth<128||imageHeight<128||imageWidth>12000||imageHeight>12000||
  !isHash(sourceImageSHA256)||!marks||typeof marks!=='object'||
  AIG60_MARKS.some(key=>!marks[key]||!finite(marks[key].x)||
   !finite(marks[key].y)||marks[key].x<0||marks[key].y<0||
   marks[key].x>=imageWidth||marks[key].y>=imageHeight))
  throw Error('AIG60_REAL_IMAGE_AND_SIX_LANDMARKS_REQUIRED');
 const [top,eyeL,eyeR,nose,mouth,chin]=AIG60_MARKS.map(k=>marks[k]);
 const eyex=Math.abs(eyeR.x-eyeL.x),eyeY=(eyeL.y+eyeR.y)/2;
 const length=chin.y-top.y,center=(eyeL.x+eyeR.x)/2;
 if(length<imageHeight*.025||eyex<imageWidth*.01||
  eyeL.x>=eyeR.x||top.y>=eyeY||eyeY>=nose.y||nose.y>=mouth.y||
  mouth.y>=chin.y||eyex/length<.18||eyex/length>.85||
  Math.abs(eyeL.y-eyeR.y)>eyex*.18||
  Math.abs(nose.x-center)>eyex*.38||
  Math.abs(mouth.x-center)>eyex*.38||
  Math.abs(chin.x-center)>eyex*.65)
  throw Error('AIG60_LANDMARK_POSE_OR_ORDER_INVALID');
 const normalized={
  eyeSpanByFaceHeight:eyex/length,
  eyeFromChin:(chin.y-eyeY)/length,
  noseFromChin:(chin.y-nose.y)/length,
  mouthFromChin:(chin.y-mouth.y)/length,
  faceCenterFromImageWidth:center/imageWidth,
  forehead:top.y/imageHeight,chin:chin.y/imageHeight
 };
 const horizontalRaw=normalized.eyeSpanByFaceHeight/(.134/.30);
 const horizontalScale=clamp(horizontalRaw,.76,1.24);
 const baseline=[1.78,1.832,1.916,1.960,2.08];
 const target=[
  1.78,
  1.78+.30*normalized.mouthFromChin,
  1.78+.30*normalized.noseFromChin,
  1.78+.30*normalized.eyeFromChin,
  2.08
 ];
 if(target.some((v,i)=>i&&v<=target[i-1]+.008))
  throw Error('AIG60_LANDMARK_SPACING_DEGENERATE');
 const translation=clamp((nose.x-center)/length*.12,-.022,.022);
 return {
  schema:AIG60_SCHEMA,sourceImageSHA256:sourceImageSHA256.toLowerCase(),
  imageWidth,imageHeight,
  measuredMarks:Object.fromEntries(AIG60_MARKS.map(k=>[k,{x:marks[k].x,y:marks[k].y}])),
  realPixelMeasured2DProportions:normalized,
  modelFaceHorizontalScale:horizontalScale,
  faceModelYAnchors:baseline,fitFromRealPixelRatiosY:target,
  modelFaceXOffset:translation,
  faceWidthScaleClamped:horizontalRaw!==horizontalScale,
  photoFrontalPoseAssumed:true,sourcePhotoDepthNotMeasured:true,
  eyeNoseMouthGeometryOnly:true,
  photoIdentityVerified:false,releaseAllowed:false
 };
}
function glbDecode(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(b.byteLength<40||b.byteLength>12*1024*1024)throw Error('AIG60_GLB_SIZE');
 const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||
  v.getUint32(8,true)!==b.length||v.getUint32(16,true)!==0x4e4f534a)
  throw Error('AIG60_GLB_HEADER');
 const len=v.getUint32(12,true),bin=20+len;
 if(len<100||len>4*1024*1024||bin+8>b.length||
  v.getUint32(bin+4,true)!==0x004e4942||
  bin+8+v.getUint32(bin,true)!==b.length)
  throw Error('AIG60_GLB_BINARY');
 const json=JSON.parse(new TextDecoder().decode(b.subarray(20,bin)));
 return {json,binary:b.slice(bin+8)};
}
function glbEncode(json,binary){
 json.buffers=[{byteLength:binary.byteLength}];
 const source=new TextEncoder().encode(JSON.stringify(json)),padded=align4(source.length);
 const b=new Uint8Array(12+8+padded+8+binary.length),v=new DataView(b.buffer);
 v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);
 v.setUint32(8,b.length,true);v.setUint32(12,padded,true);
 v.setUint32(16,0x4e4f534a,true);
 b.set(source,20);b.fill(32,20+source.length,20+padded);
 const offset=20+padded;
 v.setUint32(offset,binary.length,true);v.setUint32(offset+4,0x004e4942,true);
 b.set(binary,offset+8);
 return b;
}
const mapY=(v,old,target)=>{
 if(v<=old[0])return v;
 if(v>=old[old.length-1])return v;
 for(let i=0;i<old.length-1;i++)if(v<=old[i+1]){
  const t=(v-old[i])/(old[i+1]-old[i]);
  return target[i]+(target[i+1]-target[i])*t;
 }
 return v;
};
export function fitAIG60MeasuredFaceGLB({baseGLB,baseGLBSHA256,
 sourceImageSHA256,calibration}={}){
 if(!isHash(baseGLBSHA256)||!isHash(sourceImageSHA256)||
  calibration?.schema!==AIG60_SCHEMA||
  calibration.sourceImageSHA256!==sourceImageSHA256.toLowerCase()||
  !calibration.measuredMarks||calibration.releaseAllowed!==false)
  throw Error('AIG60_SOURCE_IMAGE_OR_CALIBRATION_MISMATCH');
 const {json,binary}=glbDecode(baseGLB);
 if(!/AIG FastModel 5\.8 native procedural/.test(json.asset?.generator||'')||
    json.animations?.length!==5||json.meshes?.length!==9||
    json.skins?.[0]?.joints?.length!==17||
    json.extras?.sourceImageSHA256?.toLowerCase()!==sourceImageSHA256.toLowerCase())
  throw Error('AIG60_VALID_REAL_SKINNED_TECHNICAL_SOURCE_REQUIRED');
 const face=json.meshes.find(mesh=>mesh.name===AIG57_PARTS[0]);
 if(!face)throw Error('AIG60_ACTUAL_FACE_INDEXED_MESH_MISSING');
 const prim=face.primitives?.[0];
 const acc=json.accessors?.[prim?.attributes?.POSITION];
 const normals=json.accessors?.[prim?.attributes?.NORMAL];
 const index=json.accessors?.[prim?.indices];
 const pview=json.bufferViews?.[acc?.bufferView];
 const nview=json.bufferViews?.[normals?.bufferView];
 const iview=json.bufferViews?.[index?.bufferView];
 if(!acc||!normals||!index||!pview||!nview||!iview||
    acc.componentType!==5126||normals.componentType!==5126||
    index.componentType!==5125||acc.type!=='VEC3'||normals.type!=='VEC3'||
    acc.count!==normals.count||acc.count>16000||
    index.count>85000||index.count%3||
    pview.byteStride||nview.byteStride||iview.byteStride||
    acc.byteOffset||normals.byteOffset||index.byteOffset)
  throw Error('AIG60_FACE_MESH_ACCESSOR_UNSUPPORTED');
 const pOff=pview.byteOffset||0,nOff=nview.byteOffset||0,iOff=iview.byteOffset||0;
 if(pOff+acc.count*12>binary.length||nOff+acc.count*12>binary.length||
    iOff+index.count*4>binary.length)
  throw Error('AIG60_FACIAL_ACCESSOR_OUT_OF_BOUNDS');
 const d=new DataView(binary.buffer,binary.byteOffset,binary.byteLength);
 const verts=[];
 for(let i=0;i<acc.count;i++){
  const v=[0,1,2].map(k=>d.getFloat32(pOff+(i*3+k)*4,true));
  if(v.some(x=>!finite(x)))throw Error('AIG60_NONFINITE_BASE_FACE_VERTEX');
  verts.push([v[0]*calibration.modelFaceHorizontalScale+
     calibration.modelFaceXOffset,
    mapY(v[1],calibration.faceModelYAnchors,calibration.fitFromRealPixelRatiosY),
    v[2]]);
 }
 const accum=Array.from({length:verts.length},()=>[0,0,0]);
 for(let j=0;j<index.count;j+=3){
  const ids=[0,1,2].map(k=>d.getUint32(iOff+(j+k)*4,true));
  if(new Set(ids).size!==3||ids.some(i=>i>=verts.length))
   throw Error('AIG60_INVALID_FACE_TRIANGLE');
  const [a,b,c]=ids.map(i=>verts[i]);
  const x=b.map((v,k)=>v-a[k]),y=c.map((v,k)=>v-a[k]);
  const normal=[x[1]*y[2]-x[2]*y[1],
    x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
  if(Math.hypot(...normal)<1e-10)throw Error('AIG60_FIT_COLLAPSED_FACE_TRIANGLE');
  for(const id of ids)for(let k=0;k<3;k++)accum[id][k]+=normal[k];
 }
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<verts.length;i++){
  const n=accum[i],length=Math.hypot(...n);
  if(length<1e-12)throw Error('AIG60_FACIAL_NORMAL_INVALID');
  for(let k=0;k<3;k++){
   d.setFloat32(pOff+(i*3+k)*4,verts[i][k],true);
   d.setFloat32(nOff+(i*3+k)*4,n[k]/length,true);
   lo[k]=Math.min(lo[k],verts[i][k]);hi[k]=Math.max(hi[k],verts[i][k]);
  }
 }
 acc.min=lo;acc.max=hi;
 json.asset.generator='AIG FastModel 6.0 actual marked original photo face landmark 2D-proportion fit';
 json.extras={...json.extras,schema:AIG60_SCHEMA,
  parent59GLBSHA256:baseGLBSHA256.toLowerCase(),
  originalSourcePhotoSHA256:sourceImageSHA256.toLowerCase(),
  measured2DPixelMarks:calibration.measuredMarks,
  normalizedFace2DProportions:calibration.realPixelMeasured2DProportions,
  actualFacial3DMeshVertexCount:verts.length,
  verifiedPhotoPerspectiveDepth:false,
  realFace3DGroundTruthUnavailable:true,
  bodyGarmentHairSkinAndAnimationsUnmodified:true,
  photoIdentityApproved:false,releaseAllowed:false};
 const bytes=glbEncode(json,binary);
 return {schema:AIG60_SCHEMA,bytes,sourceImageSHA256:sourceImageSHA256.toLowerCase(),
  base59GLBSHA256:baseGLBSHA256.toLowerCase(),
  geometryMovedRealSkinnedFaceVertices:verts.length,
  original17BonesAnd5AnimationsPreserved:true,
  adjustedXYFromRealPhotoUserMarkedPixelCoordinates:true,
  originalPhoto3DDepthRecovered:false,
  sourcePhotoVisualIdentityApproved:false,releaseAllowed:false};
}
/** Two interleaved five-fraction sampling windows cover nine distinct
 * timestamps per clip (50 actual SAT evaluations over five clips; 45 distinct).
 * The original AIG58 "5 fractions" contract remains unchanged.
 */
export async function auditAIG60DenseAnimation(gltf,{sourceSHA256,maxClips=5}={}){
 const phases=[
  [0,.125,.25,.375,.5],
  [.5,.625,.75,.875,1]
 ];
 const audits=[];
 for(const fractions of phases){
  audits.push(await auditAIG58RealPoseContacts(gltf,{
   sourceSHA256,maxClips,sampleFractions:fractions
  }));
 }
 if(audits.some(a=>a.sourceSHA256!==sourceSHA256||
  a.clips.length!==maxClips||
  a.clips.some((c,i)=>c.name!==audits[0].clips[i].name)))
  throw Error('AIG60_ANIMATION_CLIP_OR_SOURCE_CHANGED');
 const summary=audits[0].clips.map((clip,i)=>{
  const sampleSet=[
   ...audits[0].clips[i].samples.slice(0,4),
   ...audits[1].clips[i].samples
  ];
  return {name:clip.name,nineDistinctTimeFractions:
    [0,.125,.25,.375,.5,.625,.75,.875,1],
   skirtSurfaceContacts:sampleSet.reduce((n,s)=>n+s.skirtBodyTriangleContacts,0),
   hairSurfaceContacts:sampleSet.reduce((n,s)=>n+s.hairBodyTriangleContacts,0)};
 });
 const skirt=summary.reduce((n,s)=>n+s.skirtSurfaceContacts,0),
  hair=summary.reduce((n,s)=>n+s.hairSurfaceContacts,0);
 return {schema:AIG60_SCHEMA,sourceSHA256,
  clipsAudited:maxClips,poseTriangleEvaluations:maxClips*10,
  distinctTimeSamples:maxClips*9,
  skirtBodyContactsAcrossDistinctSamples:skirt,
  hairBodyContactsAcrossDistinctSamples:hair,
  clips:summary,
  sampledContactRiskFound:skirt+hair>0,
  outcome:skirt+hair>0?'DENSE_SAMPLED_CONTACT_RISK_BLOCKED':
   'DENSE_SAMPLED_QA_PASS_ONLY',
  intervalBetweenSamplesActuallyCertified:false,
  garmentSelfCollisionTested:false,
  hairStrandSelfCollisionTested:false,
  continuousTimeCollisionFreeProven:false,
  referencePhotoVisualMatchApproved:false,
  releaseAllowed:false};
}
