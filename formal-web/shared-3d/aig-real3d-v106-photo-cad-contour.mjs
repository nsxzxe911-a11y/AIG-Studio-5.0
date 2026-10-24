/**
 * Real3D V106 - source-pixel observed ALPHA -> measured CAD TOP outline.
 * No pretrained semantic segmenter is run. RGB-only/opaque photos BLOCK.
 * Pixels alone are NOT millimeters: two manually measured control points
 * and an explicitly verified TOP-camera orientation are prerequisites.
 * No implicit model/source mesh edits and no inferred backside/depth.
 */
import {createAIGReal3DTopCADObservation}
 from './aig-real3d-v104-cad-top-first.mjs';

export const AIG_REAL3D_V106_SCHEMA='AIG_REAL3D_V106_SOURCE_ALPHA_CAD_TOP_CONTOUR_V1';
const fail=s=>{throw Error('REAL3D_V106_'+s);};
const finite=Number.isFinite;
const validSHA=s=>typeof s==='string'&&/^[0-9a-f]{64}$/i.test(s);
const pointKey=(x,y)=>x+','+y;
const round=x=>Math.round(x*1e6)/1e6;
const area=v=>v.reduce((s,p,i)=>{
 const q=v[(i+1)%v.length];return s+p[0]*q[1]-q[0]*p[1];
},0)/2;
const collinear=(a,b,c)=>Math.abs((b[0]-a[0])*(c[1]-b[1])-
 (b[1]-a[1])*(c[0]-b[0]))<1e-8;
function componentCount(mask,w,h){
 const visited=new Uint8Array(mask.length);
 let n=0,biggest=0;
 for(let i=0;i<mask.length;i++){
  if(!mask[i]||visited[i])continue;
  n++;let size=0;
  const q=[i];visited[i]=1;
  for(let head=0;head<q.length;head++){
   const k=q[head],x=k%w,y=Math.floor(k/w);size++;
   const neighbors=[x>0?k-1:-1,x+1<w?k+1:-1,y>0?k-w:-1,
    y+1<h?k+w:-1];
   for(const next of neighbors)if(next>=0&&mask[next]&&!visited[next]){
    visited[next]=1;q.push(next);
   }
  }
  biggest=Math.max(biggest,size);
 }
 return {n,biggest};
}
function countHoles(mask,w,h){
 const visited=new Uint8Array(mask.length);
 const q=[];
 const push=(k)=>{if(!mask[k]&&!visited[k]){visited[k]=1;q.push(k);}};
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
 for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
 for(let head=0;head<q.length;head++){
  const k=q[head],x=k%w,y=Math.floor(k/w);
  for(const n of [x>0?k-1:-1,x+1<w?k+1:-1,
    y>0?k-w:-1,y+1<h?k+w:-1])if(n>=0)push(n);
 }
 let holes=0;
 for(let k=0;k<mask.length;k++)if(!mask[k]&&!visited[k]){
  holes++;push(k);
  for(let head=0;head<q.length;head++){
   const i=q[head],x=i%w,y=Math.floor(i/w);
   for(const n of [x>0?i-1:-1,x+1<w?i+1:-1,
    y>0?i-w:-1,y+1<h?i+w:-1])if(n>=0)push(n);
  }
 }
 return holes;
}
function boundary(mask,w,h){
 const edges=new Map();
 const add=(x,y,tx,ty)=>{
  const key=pointKey(x,y);
  if(edges.has(key))fail('SOURCE_BOUNDARY_SELF_TOUCH_OR_JUNCTION');
  edges.set(key,[tx,ty]);
 };
 const fg=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&mask[y*w+x]!==0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(fg(x,y)){
  if(!fg(x,y-1))add(x,y,x+1,y);
  if(!fg(x+1,y))add(x+1,y,x+1,y+1);
  if(!fg(x,y+1))add(x+1,y+1,x,y+1);
  if(!fg(x-1,y))add(x,y+1,x,y);
 }
 if(edges.size<4)fail('SOURCE_BOUNDARY_TOO_SMALL');
 const first=edges.keys().next().value,verts=[],used=new Set();
 let current=first;
 while(!used.has(current)){
  used.add(current);
  if(used.size>edges.size+1)fail('SOURCE_BOUNDARY_LOOP_INVALID');
  const [x,y]=current.split(',').map(Number);
  verts.push([x,y]);
  const next=edges.get(current);
  if(!next)fail('SOURCE_BOUNDARY_OPEN_OR_AMBIGUOUS');
  current=pointKey(next[0],next[1]);
 }
 if(current!==first||used.size!==edges.size)
  fail('SOURCE_MULTIPLE_BOUNDARIES_NOT_SUPPORTED');
 let compact=verts;
 for(let iteration=0;iteration<2;iteration++){
  compact=compact.filter((p,i,a)=>
   !collinear(a[(i+a.length-1)%a.length],p,a[(i+1)%a.length]));
 }
 if(compact.length<3||Math.abs(area(compact))<2)
  fail('SOURCE_ALPHA_CONTOUR_DEGENERATE');
 if(compact.length>512)
  fail('SOURCE_CONTOUR_TOO_DETAILED_NEEDS_EXPLICIT_APPROVED_SIMPLIFICATION');
 return compact;
}
/**
 * raw RGBA bytes are from the ORIGINAL imported image source.
 * Strict alpha transparency avoids color/background hallucination.
 */
export function extractAIGReal3DObservedAlphaContour({
 rgba,width,height,imageSha256,alphaThreshold=16
}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<16||height<16||width>2048||height>2048||
  !rgba||rgba.length!==width*height*4||
  !validSHA(imageSha256)||!Number.isInteger(alphaThreshold)||
  alphaThreshold<0||alphaThreshold>220)
  fail('ORIGINAL_IMAGE_ALPHA_SOURCE_AND_SHA_REQUIRED');
 const binary=new Uint8Array(width*height);
 let pixels=0,border=0,transparent=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const k=y*width+x,a=rgba[k*4+3];
  if(a<=alphaThreshold)transparent++;
  if(a>alphaThreshold){
   binary[k]=1;pixels++;
   if(x===0||x===width-1||y===0||y===height-1)border++;
  }
 }
 if(transparent===0)fail('OPAQUE_SOURCE_NEEDS_TRUSTED_SEGMENTATION_NOT_FAKE_ALPHA');
 if(pixels<16||pixels>width*height*.97)
  fail('SOURCE_ALPHA_FOREGROUND_COVERAGE_UNTRUSTED');
 if(border)fail('SOURCE_SILHOUETTE_CROPPED_AT_IMAGE_BORDER');
 const cc=componentCount(binary,width,height);
 if(cc.n!==1)fail('MULTIPLE_FOREGROUND_ISLANDS_NEED_MANUAL_SOURCE_ID');
 const holes=countHoles(binary,width,height);
 if(holes)fail('SOURCE_ALPHA_HOLES_REQUIRE_MULTILOOP_CAD_NOT_YET_SUPPORTED');
 const vertices=boundary(binary,width,height);
 return {
  schema:AIG_REAL3D_V106_SCHEMA,imageSha256,width,height,
  pixelVertices:vertices,pixelForegroundCount:pixels,
  alphaThreshold,foregroundComponents:cc.n,holes,frameBoundaryHits:border,
  polygonSignedAreaPx2:area(vertices),
  originalRGBAColorPixelsNotModified:true,
  alphaIsActuallyMeasuredFromOriginalPixels:true,
  genuineCadXYScaleEstablished:false,
  originalImageIsIndependentlyVerifiedTopView:false,
  physicallyMeasuredCADDepth:false,
  sourceBacksideOrIdentityCertified:false,
  actualNeuralForegroundSegmentationCalled:false,releasePASS:false
 };
}
/**
 * The user provides two independent pixel -> CNC XY mm control points.
 * Their positions determine translation, rotation and UNIFORM scale.
 * Two points do NOT establish an independently certified camera pose:
 * explicit confirmedTopView + calibratedMeasurement flags remain required.
 */
export function calibrateAIGReal3DAlphaToCAD({
 contour,pixelAnchors,cncAnchorsMM,confirmedTopView=false,
 calibratedMeasurement=false,assetId='CalibratedAlphaTop'
}={}){
 if(contour?.schema!==AIG_REAL3D_V106_SCHEMA||
  !Array.isArray(pixelAnchors)||pixelAnchors.length!==2||
  !Array.isArray(cncAnchorsMM)||cncAnchorsMM.length!==2||
  [...pixelAnchors,...cncAnchorsMM].some(p=>
   !Array.isArray(p)||p.length!==2||p.some(x=>!finite(x)||Math.abs(x)>1e6)))
  fail('ORIGINAL_ALPHA_AND_TWO_REAL_ANCHORS_REQUIRED');
 const [a,b]=pixelAnchors,[A,B]=cncAnchorsMM;
 for(const p of pixelAnchors)if(p[0]<0||p[1]<0||
  p[0]>contour.width||p[1]>contour.height)
  fail('PIXEL_CALIBRATION_ANCHOR_OUTSIDE_IMAGE');
 const ud=[b[0]-a[0],a[1]-b[1]],
  vd=[B[0]-A[0],B[1]-A[1]],
  up=Math.hypot(...ud),vp=Math.hypot(...vd);
 if(up<8||vp<=0.001||vp>1e5)
  fail('TWO_ANCHOR_CALIBRATION_BASELINE_TOO_SHORT');
 const sc=vp/up,
  cosine=(ud[0]*vd[0]+ud[1]*vd[1])/(up*vp),
  sine=(ud[0]*vd[1]-ud[1]*vd[0])/(up*vp);
 if(sc<.00001||sc>1000)fail('CAD_MM_PER_PIXEL_SCALE_OUTSIDE_BUDGET');
 const toCAD=p=>{
  const d=[p[0]-a[0],a[1]-p[1]];
  return [round(A[0]+sc*(cosine*d[0]-sine*d[1])),
   round(A[1]+sc*(sine*d[0]+cosine*d[1]))];
 };
 const vertices=contour.pixelVertices.map(toCAD);
 const perimeter=vertices.reduce((s,p,i)=>{
  const q=vertices[(i+1)%vertices.length];
  return s+Math.hypot(p[0]-q[0],p[1]-q[1]);
 },0);
 if(perimeter<=0)fail('CAD_CALIBRATED_CONTOUR_ZERO_SIZE');
 const observation=createAIGReal3DTopCADObservation({
  imageSha256:contour.imageSha256,assetId,
  verticesXYmm:vertices,
  sourceVisibility:confirmedTopView&&calibratedMeasurement?
   'OBSERVED':'AI_ESTIMATED',
  originCNCmm:[0,0,0],actualTopPlaneHeightMM:null
 });
 return {schema:'AIG_REAL3D_V106_PHOTO_CALIBRATION_TO_V105_CAD_V1',
  imageSha256:contour.imageSha256,
  sourcePixelContourSchema:contour.schema,
  pixelAnchors:pixelAnchors.map(p=>[...p]),
  cncAnchorsMM:cncAnchorsMM.map(p=>[...p]),
  mmPerPixel:round(sc),rotationCos:round(cosine),rotationSin:round(sine),
  userConfirmedTopOrientation:confirmedTopView,
  userConfirmedPhysicalMeasurement:calibratedMeasurement,
  topPlaneDepthNotInferred:true,
  originalPixelColorsAndContourUnchanged:true,
  noSource3DVertexOrTextureMutation:true,
  originalImageIsNotIndependentProofOfBackside:true,
  externallyCertifiedPhotoMeasurement:false,
  observedTopCAD:observation,releasePASS:false};
}
