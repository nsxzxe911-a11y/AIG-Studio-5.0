/**
 * AIG FastModel 7.14 — color/depth/semantic provenance for the protagonist.
 *
 * No pretrained semantic network is bundled: seeds are user-reviewed image
 * pixels. Seeded RGB region growing is a local color suggestion, NOT proof
 * of anatomical parts or photometric albedo. Actual 3D xyz comes from the
 * physically calibrated stereo core 7.13, never guessed from flat colors.
 *
 * The output has independently inspectable:
 *  - categorical semantic labels and color confidence,
 *  - observed source RGB color (not invented albedo),
 *  - metric camera-space depth (mm) and stereo confidence,
 *  - surface normals derived from measured triangles,
 *  - unknown regions, with no fictional backside geometry.
 */
export const AIG714_SCHEMA='AIG_FASTMODEL_7_14_HEROINE_RGB_METRIC_DEPTH_SEMANTIC_SURFACE';
export const AIG714_LABELS=Object.freeze({
 UNKNOWN:0,HAIR:1,FACE:2,NECK:3,JACKET:4,SHIRT:5,SKIRT:6,
 SKIN:7,BAG:8,ACCESSORY:9,BACKGROUND:10
});
const MAX=640*480;
const fail=s=>{throw Error('AIG714_'+s)};
const okNumber=n=>typeof n==='number'&&Number.isFinite(n);
const rgbDist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const imageOk=(im,w,h)=>im?.width===w&&im?.height===h&&
 (im.data instanceof Uint8Array||im.data instanceof Uint8ClampedArray)&&
 im.data.length===w*h*4;
const classNames=new Set(Object.keys(AIG714_LABELS).filter(s=>!['UNKNOWN','BACKGROUND'].includes(s)));
export function growAIG714ReviewedColorRegions(image,seeds,{
 maxSeedDistance=47,maxNeighborDistance=29,maxFractionPerSeed=.30,
 minRegionPixels=5
}={}){
 const w=image?.width,h=image?.height;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<32||h<32||
  w*h>MAX||!imageOk(image,w,h))fail('RGBA_IMAGE_REQUIRED');
 if(!Array.isArray(seeds)||seeds.length<1||seeds.length>100||
  !okNumber(maxSeedDistance)||maxSeedDistance<5||maxSeedDistance>120||
  !okNumber(maxNeighborDistance)||maxNeighborDistance<3||maxNeighborDistance>120||
  !okNumber(maxFractionPerSeed)||maxFractionPerSeed<.002||maxFractionPerSeed>.7||
  !Number.isInteger(minRegionPixels)||minRegionPixels<1||minRegionPixels>500)
  fail('BOUNDED_REVIEWED_SEEDS_REQUIRED');
 const labels=new Uint8Array(w*h),confidences=new Uint8Array(w*h),
  assignments=new Float32Array(w*h).fill(Infinity);
 let accepted=0;
 const sources=[];
 for(const [index,s] of seeds.entries()){
  if(!classNames.has(s?.label)||!Number.isInteger(s.x)||!Number.isInteger(s.y)||
   s.x<0||s.x>=w||s.y<0||s.y>=h||s.reviewed!==true)
   fail('REVIEWED_PART_SEED_REQUIRED');
  const origin=s.y*w+s.x,off=origin*4;
  if(image.data[off+3]<240)fail('SEED_MUST_BE_VISIBLE_SOURCE_PIXEL');
  const seedRGB=[image.data[off],image.data[off+1],image.data[off+2]],
   id=AIG714_LABELS[s.label];
  const visited=new Uint8Array(w*h);
  const queue=new Int32Array(w*h);
  queue[0]=origin;visited[origin]=1;
  let front=0,tail=1,count=0,changed=0;
  const maxCount=Math.max(minRegionPixels,Math.floor(w*h*maxFractionPerSeed));
  while(front<tail&&count<maxCount){
   const p=queue[front++],x=p%w,y=Math.floor(p/w),k=4*p;
   if(image.data[k+3]<240)continue;
   const color=[image.data[k],image.data[k+1],image.data[k+2]],
    d=rgbDist(color,seedRGB);
   if(d>maxSeedDistance)continue;
   count++;
   const score=d+(Math.hypot(x-s.x,y-s.y)/Math.hypot(w,h))*6;
   if(score<assignments[p]){
    assignments[p]=score;labels[p]=id;
    confidences[p]=Math.round(255*Math.max(0,1-d/(maxSeedDistance+1)));
    changed++;
   }
   const neighbors=[x>0?p-1:-1,x+1<w?p+1:-1,y>0?p-w:-1,y+1<h?p+w:-1];
   for(const next of neighbors){
    if(next<0||visited[next])continue;
    const nk=next*4;
    if(image.data[nk+3]<240)continue;
    const local=rgbDist(color,[image.data[nk],image.data[nk+1],image.data[nk+2]]);
    if(local>maxNeighborDistance)continue;
    visited[next]=1;queue[tail++]=next;
   }
  }
  sources.push({index,part:s.label,seedPixel:[s.x,s.y],
   candidatePixels:count,assignedPixels:changed,hitSafetyLimit:count>=maxCount});
  accepted+=changed;
 }
 // Ambiguous boundaries deliberately remain UNKNOWN. A reviewed seed is
 // NOT enough to establish photogrammetric depth, 1:1 anatomy or clothing.
 const counts=Object.fromEntries(Object.keys(AIG714_LABELS).map(k=>[k,0]));
 for(let i=0;i<labels.length;i++)
  counts[Object.keys(AIG714_LABELS).find(k=>AIG714_LABELS[k]===labels[i])]++;
 if(sources.some(s=>s.candidatePixels<minRegionPixels))
  fail('SOURCE_SEED_INSUFFICIENT_COLOR_REGION');
 return Object.freeze({schema:'AIG714_REVIEWED_SEED_RGB_REGION_V1',
  width:w,height:h,labels,confidence:confidences,seeds:sources,
  counts,colorDistanceNotSemanticInference:true,
  allLabelsMustBeUserReviewed:true,actualDepthMeasurementProvided:false,
  backgroundNotReplacedWithSyntheticPixels:true});
}
const vec=(p,i)=>[p[3*i],p[3*i+1],p[3*i+2]];
export function assembleAIG714HeroineSurface(surface,colorImage,reviewedRegions,{
 minimumStereoConfidence=.1,requireReviewedMasks=true
}={}){
 if(surface?.schema!=='AIG_FASTMODEL_7_13_METRIC_RECTIFIED_STEREO_MESH_MM'||
  !Number.isInteger(surface.vertexCount)||surface.vertexCount<3||
  surface.positions?.length!==3*surface.vertexCount||
  surface.uvs?.length!==2*surface.vertexCount||
  surface.confidence?.length!==surface.vertexCount||
  surface.indices?.length%3!==0||
  !okNumber(minimumStereoConfidence)||minimumStereoConfidence<0||
  minimumStereoConfidence>.9)fail('MEASURED_STEREO_MESH_REQUIRED');
 const w=colorImage?.width,h=colorImage?.height;
 if(!Number.isInteger(w)||!Number.isInteger(h)||!imageOk(colorImage,w,h)||
  w*h>MAX||reviewedRegions?.width!==w||reviewedRegions?.height!==h||
  reviewedRegions.schema!=='AIG714_REVIEWED_SEED_RGB_REGION_V1'||
  reviewedRegions.labels?.length!==w*h||
  reviewedRegions.confidence?.length!==w*h||
  requireReviewedMasks!==true)fail('MATCHING_REVIEWED_RGB_IMAGE_REQUIRED');
 const n=surface.vertexCount;
 const vertexLabels=new Uint8Array(n),
  sourceRGB=new Uint8Array(n*3),
  normals=new Float32Array(n*3),accepted=new Uint8Array(n),
  confidence=new Float32Array(n),squared=new Float64Array(n);
 let measured=0,semanticTagged=0;
 for(let i=0;i<n;i++){
  const u=surface.uvs[2*i],v=surface.uvs[2*i+1],
   x=Math.min(w-1,Math.max(0,Math.round(u*(w-1)))),
   y=Math.min(h-1,Math.max(0,Math.round((1-v)*(h-1)))),
   at=y*w+x,r=at*4;
  const depthConfidence=surface.confidence[i];
  if(!okNumber(depthConfidence)||!surface.positions.slice(i*3,i*3+3).every(okNumber))
   fail('NONFINITE_MEASURED_VERTEX_REJECTED');
  if(colorImage.data[r+3]<240)continue;
  for(let j=0;j<3;j++)sourceRGB[3*i+j]=colorImage.data[r+j];
  confidence[i]=Math.min(depthConfidence,reviewedRegions.confidence[at]/255);
  if(depthConfidence<minimumStereoConfidence)continue;
  accepted[i]=1;measured++;
  vertexLabels[i]=reviewedRegions.labels[at];
  if(vertexLabels[i]!==AIG714_LABELS.UNKNOWN)semanticTagged++;
 }
 const indices=[],segmentedTriangles={},boundaryTriangles=[];
 // Do not bridge confidence holes or hide hair/neck disconnections by
 // fabricating a face. Retain real stereo triangles at part boundaries
 // as separate transition evidence in the SAME geometric space.
 for(let i=0;i<surface.indices.length;i+=3){
  const a=surface.indices[i],b=surface.indices[i+1],c=surface.indices[i+2];
  if([a,b,c].some(j=>j>=n||!accepted[j]))continue;
  const A=vec(surface.positions,a),B=vec(surface.positions,b),C=vec(surface.positions,c),
   e=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],
   f=[C[0]-A[0],C[1]-A[1],C[2]-A[2]],
   normal=[e[1]*f[2]-e[2]*f[1],e[2]*f[0]-e[0]*f[2],e[0]*f[1]-e[1]*f[0]],
   area=Math.hypot(...normal);
  if(area<1e-8)continue;
  indices.push(a,b,c);
  for(const j of [a,b,c])for(let k=0;k<3;k++)normals[j*3+k]+=normal[k];
  const codes=[vertexLabels[a],vertexLabels[b],vertexLabels[c]];
  if(codes[0]===codes[1]&&codes[1]===codes[2]&&codes[0]!==AIG714_LABELS.UNKNOWN){
   const key=Object.keys(AIG714_LABELS).find(x=>AIG714_LABELS[x]===codes[0]);
   segmentedTriangles[key]=(segmentedTriangles[key]||0)+1;
  }else boundaryTriangles.push(i/3);
 }
 if(indices.length<24)fail('INSUFFICIENT_CONNECTED_RELIABLE_3D_SURFACE');
 for(let i=0;i<n;i++){
  const mag=Math.hypot(normals[3*i],normals[3*i+1],normals[3*i+2]);
  if(mag>1e-9)for(let k=0;k<3;k++)normals[3*i+k]/=mag;
 }
 const regions=Object.freeze({...segmentedTriangles});
 return Object.freeze({
  schema:AIG714_SCHEMA,positions:surface.positions,uvs:surface.uvs,
  indices:Uint32Array.from(indices),normals,
  vertexPartLabels:vertexLabels,sourceRGB,vertexConfidence:confidence,
  stereoscopicallyMeasuredMask:accepted,
  physicallyMeasuredVertexCount:measured,
  semanticLabeledMeasuredVertices:semanticTagged,
  triangleCount:indices.length/3,partTriangles:regions,
  boundaryTriangleCount:boundaryTriangles.length,
  sourceImageWidth:w,sourceImageHeight:h,
  metricXYZUnit:'mm',sourceLeftSHA256:surface.leftSHA256,
  sourceRightSHA256:surface.rightSHA256,
  surfaceOrigin:'LEFT_CAMERA_OPTICAL_CENTRE',
  observedColorsAreIlluminatedPhotoRGBNotIntrinsicAlbedo:true,
  normalDerivedFromActualStereoTriangleGeometry:true,
  labelsRequireUserReviewedColorSeeds:true,
  generatedBackside:false,generatedOccludedHair:false,
  independentlyCertifiedRealHumanAnatomy:false,
  wholeCharacterOneToOneVerified:false,
  noBoneOrSkinWeightsInvented:true,noCncMachineWrites:true
 });
}
