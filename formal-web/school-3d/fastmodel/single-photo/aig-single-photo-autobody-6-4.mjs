/** FastModel 6.4 — one cropped face or upper-body still image is enough
 * to generate a complete ANATOMICALLY PLAUSIBLE rigged character draft.
 * There is NO requirement for full-length/front/side/back photographs,
 * user pixel landmarks, or an external neural-network/credit service.
 *
 * A partial picture cannot reveal the person's true hidden body, exact
 * height, proportions, or face depth. These are always prior-based estimates.
 */
import {generateAIG58FittedTechnical} from './aig-appearance-fit-5-8.mjs';
export const AIG64_AUTOBODY_SCHEMA='AIG_FASTMODEL_6_4_SINGLE_PARTIAL_PHOTO_NORMAL_RATIO_FULLBODY';
export const AIG64_DEFAULT_HEAD_TO_BODY_RATIO=7.5;
const finite=Number.isFinite;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const validSha=v=>typeof v==='string'&&/^[0-9a-f]{64}$/i.test(v);
/** Return the largest connected object with color different from the
 * outside border on a bounded 96x96 thumbnail. This is NOT facial ID,
 * segmentation ground truth, or a true skeleton keypoint detector. */
export function analyzeAIG64PartialPortrait({
 pixels,imageWidth,imageHeight,sourceImageSHA256,expectedPersonCount=1
}={}){
 if(!validSha(sourceImageSHA256)||!Number.isInteger(imageWidth)||
   !Number.isInteger(imageHeight)||imageWidth<128||imageHeight<128||
   imageWidth>12000||imageHeight>12000||
   pixels?.length!==imageWidth*imageHeight*4||
   expectedPersonCount!==1)
  throw Error('AIG64_PARTIAL_IMAGE_SOURCE_SIZE_OR_SINGLE_SUBJECT_INVALID');
 const w=96,h=96,rgbs=new Float32Array(w*h*3),alphas=new Uint8Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=clamp(Math.floor((x+.5)*imageWidth/w),0,imageWidth-1),
   sy=clamp(Math.floor((y+.5)*imageHeight/h),0,imageHeight-1);
  const source=(sy*imageWidth+sx)*4,point=y*w+x;
  alphas[point]=pixels[source+3];
  for(let k=0;k<3;k++)rgbs[point*3+k]=pixels[source+k]/255;
 }
 const rim=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if(x>3&&x<w-4&&y>3&&y<h-4)continue;
  const i=y*w+x;
  if(alphas[i]<240)continue;
  rim.push(i);
 }
 if(rim.length<100)throw Error('AIG64_BACKGROUND_PIXEL_EVIDENCE_MISSING');
 const bg=[0,1,2].map(k=>{
  const sorted=rim.map(i=>rgbs[i*3+k]).sort((a,b)=>a-b);
  return sorted[Math.floor(sorted.length/2)];
 });
 const mask=new Uint8Array(w*h),visited=new Uint8Array(w*h);
 let foreground=0;
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  const i=y*w+x;
  if(alphas[i]<240)continue;
  const distance=Math.hypot(...[0,1,2].map(k=>rgbs[i*3+k]-bg[k]));
  if(distance>.19){mask[i]=1;foreground++;}
 }
 if(foreground<140)throw Error('AIG64_NO_OBSERVABLE_SUBJECT_CONTRAST');
 // Connected-components on the thumbnail; favor a coherent foreground
 // region rather than an unrelated separate text/logo/background patch.
 let best=null,bestPixels=null;
 for(let start=0;start<mask.length;start++){
  if(!mask[start]||visited[start])continue;
  const queue=[start];visited[start]=1;
  let x0=w,x1=0,y0=h,y1=0,sumX=0,sumY=0;
  for(let ptr=0;ptr<queue.length;ptr++){
   const i=queue[ptr],x=i%w,y=Math.floor(i/w);
   x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   sumX+=x;sumY+=y;
   for(const n of [i-1,i+1,i-w,i+w]){
    if(n<0||n>=mask.length||visited[n]||!mask[n])continue;
    if(Math.abs(n%w-x)+Math.abs(Math.floor(n/w)-y)!==1)continue;
    visited[n]=1;queue.push(n);
   }
  }
  const count=queue.length,centerX=sumX/count,centerY=sumY/count;
  // Penalize peripheral unrelated objects, not photographed hairstyle.
  const score=count*(1-.12*Math.abs(centerX-w/2)/(w/2));
  if(!best||score>best.score){
   best={x0,x1,y0,y1,count,score,centerX,centerY};
   bestPixels=queue;
  }
 }
 if(!best||best.count<100||best.y1-best.y0<8||best.x1-best.x0<5)
  throw Error('AIG64_PARTIAL_PERSON_BOUNDARY_UNCERTAIN');
 // Critical: row width must be measured only on the SELECTED connected
 // component. Previous implementation read other foreground pixels within
 // its bounding box and inflated head/shoulder width estimates.
 const connected=new Uint8Array(w*h);
 for(const index of bestPixels)connected[index]=1;
 const bandWidth=(low,high)=>{
  const left=[],right=[];
  for(let y=clamp(Math.floor(low),0,h-1);y<=clamp(Math.ceil(high),0,h-1);y++){
   let min=w,max=-1;
   for(let x=0;x<w;x++)if(connected[y*w+x]&&
     x>=best.x0&&x<=best.x1){min=Math.min(min,x);max=Math.max(max,x);}
   if(max>=min&&max-min>=3){left.push(min);right.push(max);}
  }
  if(!left.length)return null;
  return [...left.map((x,i)=>right[i]-x+1)].sort((a,b)=>a-b)[Math.floor(left.length/2)];
 };
 const visibleHeight=best.y1-best.y0+1;
 const headWidth=bandWidth(best.y0+visibleHeight*.10,best.y0+visibleHeight*.33);
 const chestWidth=bandWidth(best.y0+visibleHeight*.52,best.y0+visibleHeight*.79);
 const lowerRegionVisible=best.y1>h*.73;
 const shoulderEvidence=!!headWidth&&!!chestWidth&&lowerRegionVisible&&
   chestWidth/headWidth>=1.25&&chestWidth/headWidth<=3.4;
 const inputCoverage=shoulderEvidence?'HEAD_AND_UPPER_BODY_VISIBLE':
   'FACE_OR_HEAD_ONLY_VISIBLE';
 // This affects only conservative breadth, not body length, leg/arm
 // identity, height in cm, sex from photo, or unknown hidden anatomy.
 const ratio=shoulderEvidence?
  clamp(.48*(chestWidth/headWidth)/1.85,.43,.56):.48;
 const proportions={
  widthHeightRatio:+ratio.toFixed(5),
  ratiosByImageHeight:Array.from({length:11},(_,i)=>({
   atHeight:i/10,
   widthRatio:+(.19+Math.sin(Math.PI*i/10)*.06).toFixed(5),
   centerRatio:.5,
   source:shoulderEvidence&&i>=5&&i<=8?
    'UPPER_BODY_PIXEL_WIDTH_AS_LOOSE_CONSTRAINT':
    'INFERRED_STANDARD_HUMAN_PROPORTION_NOT_PHOTO_OBSERVATION'
  }))
 };
 const scaffold={
  meshType:'CLOSED_ELLIPTICAL_SECTION_VOLUME',
  sourceSHA256:sourceImageSHA256.toLowerCase(),
  unseenSurfacesInferred:true,autoRiggingAvailable:false,
  releaseAllowed:false,proportions
 };
 return {schema:AIG64_AUTOBODY_SCHEMA,
  sourceImageSHA256:sourceImageSHA256.toLowerCase(),
  sourceImagePixels:[imageWidth,imageHeight],
  detectedForegroundThumbnailBox:best,
  regionAnalysis:'BOUNDARY_COLOR_CONNECTED_COMPONENT_HEURISTIC',
  headAndShoulderMeasurementsAreApproximate:true,
  hasReliableMeasuredHeight:false,
  photoCoverage:inputCoverage,
  faceAndShoulderWereNotManualKeypointVerified:true,
  headToBodyRatioPrior:AIG64_DEFAULT_HEAD_TO_BODY_RATIO,
  widthToHeightModelRatio:ratio,
  defaultScaleUnits:'TECHNICAL_UNITS_NOT_REAL_WORLD_CM',
  inferredUnseenLegsArmsTorso:true,
  noAdditionalAnglesRequired:true,
  otherWardrobesPreserved:true,
  source2dPhotoProvidesNoTrue3DDepth:true,
  scaffold,releaseAllowed:false};
}

const align4=n=>(n+3)&~3;
function unpackGLB(bytes){
 const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2||
  dv.getUint32(8,true)!==bytes.length||dv.getUint32(16,true)!==0x4e4f534a)
  throw Error('AIG64_ABNORMAL_GLB_SOURCE');
 const jsonLength=dv.getUint32(12,true),position=20+jsonLength;
 if(position+8>bytes.length||dv.getUint32(position+4,true)!==0x004e4942||
    position+8+dv.getUint32(position,true)!==bytes.length)
  throw Error('AIG64_GLB_MALFORMED_LENGTH');
 return {json:JSON.parse(new TextDecoder().decode(bytes.subarray(20,position))),
  binary:bytes.slice(position+8)};
}
function packGLB(json,binary){
 json.buffers=[{byteLength:binary.length}];
 const encoded=new TextEncoder().encode(JSON.stringify(json)),length=align4(encoded.length);
 const bytes=new Uint8Array(12+8+length+8+binary.length),dv=new DataView(bytes.buffer);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);
 dv.setUint32(8,bytes.length,true);dv.setUint32(12,length,true);
 dv.setUint32(16,0x4e4f534a,true);
 bytes.set(encoded,20);bytes.fill(32,20+encoded.length,20+length);
 const position=20+length;
 dv.setUint32(position,binary.length,true);dv.setUint32(position+4,0x004e4942,true);
 bytes.set(binary,position+8);
 return bytes;
}
function arrayInfo(json,binary,index,componentType,type,stride){
 const a=json.accessors[index],v=json.bufferViews[a?.bufferView];
 if(!a||!v||a.componentType!==componentType||a.type!==type||
  a.byteOffset||v.byteStride||((v.byteOffset||0)%4)||
  (v.byteOffset||0)+a.count*stride>binary.length||
  v.byteLength<a.count*stride)
  throw Error('AIG64_RIGGED_ATTRIBUTE_NOT_CONTIGUOUS');
 return {a,offset:v.byteOffset||0,view:new DataView(binary.buffer,binary.byteOffset,binary.byteLength)};
}
function stretchFullBodyToSevenAndHalfHeads(bytes){
 const {json,binary}=unpackGLB(bytes);
 if(json.skins?.[0]?.joints?.length!==17||json.animations?.length!==5||
   json.meshes?.length!==9||json.extras?.releaseAllowed!==false)
  throw Error('AIG64_FULLBODY_GLTF_SKIN_CONTRACT');
 const body=json.meshes.find(m=>m.name==='AIG56_NATIVE_FULLBODY_TECHNICAL_SKIN');
 if(!body)throw Error('AIG64_INTEGRATED_HUMAN_BODY_MISSING');
 const primitive=body.primitives?.[0],pos=arrayInfo(json,binary,
  primitive?.attributes?.POSITION,5126,'VEC3',12);
 let top=-Infinity,bottom=Infinity;
 for(let i=0;i<pos.a.count;i++){
  const y=pos.view.getFloat32(pos.offset+i*12+4,true);
  if(!finite(y))throw Error('AIG64_UNBOUNDED_BODY_VERTEX');
  top=Math.max(top,y);bottom=Math.min(bottom,y);
 }
 const joints=json.skins[0].joints;
 const parent=new Int32Array(json.nodes.length).fill(-1);
 json.nodes.forEach((n,i)=>n.children?.forEach(child=>{parent[child]=i;}));
 const world=new Map(),updated=new Map();
 function boneWorld(index){
  if(world.has(index))return world.get(index);
  const local=json.nodes[index].translation?.[1]||0;
  const value=(parent[index]<0?0:boneWorld(parent[index]))+local;
  world.set(index,value);return value;
 }
 for(const joint of joints)boneWorld(joint);
 const hipY=world.get(joints[0]),neckY=world.get(joints[3]);
 const headHeight=top-(neckY+.09);
 if(!finite(headHeight)||headHeight<.22||headHeight>.50||
  bottom>=hipY||top<=hipY)
  throw Error('AIG64_NO_RELIABLE_TECHNICAL_HEAD_BOUNDS');
 const desired=AIG64_DEFAULT_HEAD_TO_BODY_RATIO*headHeight;
 const factor=(desired-(top-hipY))/(hipY-bottom);
 if(!finite(factor)||factor<1.10||factor>2.1)
  throw Error('AIG64_NORMAL_BODY_SCALE_NOT_PLAUSIBLE');
 const scaleY=y=>y<hipY?hipY+(y-hipY)*factor:y;
 for(const [index,y] of world)updated.set(index,scaleY(y));
 // Update local bone translations using their adjusted global bind coordinates.
 for(const joint of joints){
  const n=json.nodes[joint],p=parent[joint];
  n.translation[1]=updated.get(joint)-
   (p>=0?(updated.get(p)??world.get(p)):0);
 }
 // All inverse bind matrices must follow the moved joints to preserve real
 // skinned deformation rather than animating bones disconnected from legs.
 const inv=arrayInfo(json,binary,json.skins[0].inverseBindMatrices,5126,'MAT4',64);
 if(inv.a.count!==17)throw Error('AIG64_INVERSE_BIND_JOINT_COUNT');
 joints.forEach((joint,i)=>inv.view.setFloat32(inv.offset+i*64+13*4,
   -updated.get(joint),true));
 let affectedMeshVertices=0;
 for(const mesh of json.meshes){
  const p=mesh.primitives[0];
  const xyz=arrayInfo(json,binary,p.attributes.POSITION,5126,'VEC3',12);
  const nrm=arrayInfo(json,binary,p.attributes.NORMAL,5126,'VEC3',12);
  const ids=arrayInfo(json,binary,p.indices,5125,'SCALAR',4);
  const vertices=[];
  let lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<xyz.a.count;i++){
   const vec=[0,1,2].map(k=>xyz.view.getFloat32(xyz.offset+i*12+k*4,true));
   if(vec.some(v=>!finite(v)))throw Error('AIG64_ABNORMAL_MESH_VERTEX');
   if(vec[1]<hipY){vec[1]=scaleY(vec[1]);affectedMeshVertices++;}
   for(let k=0;k<3;k++){
    xyz.view.setFloat32(xyz.offset+i*12+k*4,vec[k],true);
    lo[k]=Math.min(lo[k],vec[k]);hi[k]=Math.max(hi[k],vec[k]);
   }
   vertices.push(vec);
  }
  xyz.a.min=lo;xyz.a.max=hi;
  const normals=Array.from({length:vertices.length},()=>[0,0,0]);
  if(ids.a.count%3)throw Error('AIG64_TRIANGLE_BUDGET');
  for(let t=0;t<ids.a.count;t+=3){
   const inds=[0,1,2].map(k=>ids.view.getUint32(ids.offset+(t+k)*4,true));
   if(new Set(inds).size!==3||inds.some(k=>k>=vertices.length))
    throw Error('AIG64_INVALID_BODY_TRIANGLE');
   const [a,b,c]=inds.map(k=>vertices[k]);
   const ab=b.map((v,k)=>v-a[k]),ac=c.map((v,k)=>v-a[k]);
   const face=[
    ab[1]*ac[2]-ab[2]*ac[1],
    ab[2]*ac[0]-ab[0]*ac[2],
    ab[0]*ac[1]-ab[1]*ac[0]
   ];
   if(Math.hypot(...face)<1e-11)
    throw Error('AIG64_DEFORMED_TRIANGLE_DEGENERATE');
   for(const id of inds)for(let k=0;k<3;k++)normals[id][k]+=face[k];
  }
  for(let i=0;i<normals.length;i++){
   const length=Math.hypot(...normals[i]);
   if(length<1e-9)throw Error('AIG64_NORMAL_BROKEN');
   for(let k=0;k<3;k++)
    nrm.view.setFloat32(nrm.offset+i*12+k*4,normals[i][k]/length,true);
  }
 }
 json.asset.generator='AIG FastModel 6.4 one portrait normal-body-ratio true rigged GLB';
 json.extras={...json.extras,schema:AIG64_AUTOBODY_SCHEMA,
  sourceOnePartialPhotoNoAdditionalAngles:true,
  estimatedHumanHeightInHeads:AIG64_DEFAULT_HEAD_TO_BODY_RATIO,
  actualTechnicalHeadHeight:headHeight,
  actualTechnicalWholeBodyHeightBefore:top-bottom,
  actualTechnicalWholeBodyHeightAfter:top-scaleY(bottom),
  actualLegProportionStretchFactor:factor,
  actualChangedSkinnedMeshVertices:affectedMeshVertices,
  adultProportionIsAPriorNotPersonHeightMeasurement:true,
  accuratePhotoFaceAndHiddenBodyClaim:false,releaseAllowed:false};
 return {bytes:packGLB(json,binary),
  actualTechnicalHeadToBodyRatio:(top-scaleY(bottom))/headHeight,
  legProportionStretchFactor:factor,changedRealVertices:affectedMeshVertices};
}

/** Actually generate a full-body skinned glTF 2.0 binary with 17 bones and
 * five recorded animation clips from ONE partial photo's extracted evidence.
 */
export function generateAIG64SinglePartialFullbody({analysis}={}){
 if(analysis?.schema!==AIG64_AUTOBODY_SCHEMA||
  analysis.scaffold?.sourceSHA256!==analysis.sourceImageSHA256||
  analysis.headToBodyRatioPrior!==AIG64_DEFAULT_HEAD_TO_BODY_RATIO||
  analysis.releaseAllowed!==false||analysis.noAdditionalAnglesRequired!==true||
  analysis.scaffold?.releaseAllowed!==false)
  throw Error('AIG64_UNTRUSTED_PARTIAL_PHOTO_ANALYSIS');
 const result=generateAIG58FittedTechnical(analysis.scaffold);
 const proportioned=stretchFullBodyToSevenAndHalfHeads(result.bytes);
 if(result.sourceImageSHA256!==analysis.sourceImageSHA256||
  result.skinnedMeshCount!==9||result.animationClipCount!==5)
  throw Error('AIG64_FULLBODY_ANIMATION_GENERATION_FAILED');
 return {schema:AIG64_AUTOBODY_SCHEMA,
  bytes:proportioned.bytes,sourceImageSHA256:analysis.sourceImageSHA256,
  actualTechnicalHeadToBodyRatio:proportioned.actualTechnicalHeadToBodyRatio,
  actualLegLengthStretchFactor:proportioned.legProportionStretchFactor,
  actuallyRemeshedVertexCount:proportioned.changedRealVertices,
  inputCoverage:analysis.photoCoverage,
  anatomicallyPlausibleEstimateOnly:true,
  generatedCompleteTechnicalBody:true,
  generatedWholeBodyParts:['head','neck','torso','leftArm','rightArm',
   'leftHand','rightHand','leftLeg','rightLeg','leftFoot','rightFoot'],
  unseenPhotoRegionsProcedurallyEstimated:true,
  originalPhotoFullbodyLikenessVerified:false,
  originalPhotoFaceIdentityReconstructed:false,
  riggedBoneCount:17,skinnedMeshCount:result.skinnedMeshCount,
  animationClipCount:result.animationClipCount,
  noBackOrSidePhotoRequired:true,
  mobileNative60FPSMeasured:false,
  releaseAllowed:false};
}
