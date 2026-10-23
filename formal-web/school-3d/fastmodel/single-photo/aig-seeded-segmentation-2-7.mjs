/**
 * Real3D 2.7 — real source-pixel, offline competitive geodesic segmentation.
 * Uses human-provided class seeds. Not trained AI, face identification,
 * depth measurement, body part reconstruction or automatic semantic naming.
 * Bounded low-resolution 4-neighbour shortest paths; true RGBA masks,
 * source SHA provenance, conservative ambiguous-boundary rejection.
 */
import {AIG26_CLASSES} from './aig-vision-metric-color-2-6.mjs';
export const AIG27_SCHEMA='AIG_REAL3D_2_7_REAL_PIXEL_SEEDED_EDGE_SEGMENTATION';
const fail=x=>{throw Error('AIG27_'+x)};
const validSHA=x=>typeof x==='string'&&/^sha256:[a-f0-9]{64}$/.test(x);
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
class MinHeap{
 constructor(){this.a=[]}
 push(v){
  let i=this.a.length;this.a.push(v);
  while(i>0){const p=(i-1)>>1;if(this.a[p][0]<=v[0])break;
   this.a[i]=this.a[p];i=p}
  this.a[i]=v;
 }
 pop(){
  const a=this.a,head=a[0],last=a.pop();
  if(a.length){let i=0;
   for(;;){
    const left=i*2+1;if(left>=a.length)break;
    const right=left+1,j=right<a.length&&a[right][0]<a[left][0]?right:left;
    if(a[j][0]>=last[0])break;a[i]=a[j];i=j;
   }
   a[i]=last;
  }
  return head;
 }
 get size(){return this.a.length}
}
const dist3=(r,g,b,p)=>Math.sqrt((r-p[0])**2+
 (g-p[1])**2+(b-p[2])**2);
function rle(labels){
 const runs=[];let last=labels[0],length=1;
 for(let i=1;i<labels.length;i++){
  if(labels[i]===last){length++;continue}
  runs.push([last,length]);last=labels[i];length=1;
 }
 runs.push([last,length]);return runs;
}
export function segmentAIG27Pixels({
 pixels,width,height,sourceSha256,seeds,
 maxWorkSide=320,edgeWeight=.009,colorWeight=.001
}={}){
 if(!validSHA(sourceSha256)||!(pixels instanceof Uint8Array||
  pixels instanceof Uint8ClampedArray)||!Number.isInteger(width)||
  !Number.isInteger(height)||width<128||height<128||
  width*height>2_000_000||pixels.length!==width*height*4||
  !Array.isArray(seeds)||seeds.length<2||seeds.length>48||
  !Number.isInteger(maxWorkSide)||maxWorkSide<128||maxWorkSide>384||
  !Number.isFinite(edgeWeight)||edgeWeight<0||edgeWeight>.025||
  !Number.isFinite(colorWeight)||colorWeight<0||colorWeight>.004)
  fail('BOUNDED_RGBA_SOURCE_SHA_AND_SEEDS_REQUIRED');
 const classes=new Map(),anchorLabels=new Set();
 let backgroundSeed=false,foregroundSeed=false;
 for(const seed of seeds){
  if(!seed||!Number.isInteger(seed.labelId)||
   seed.labelId<0||seed.labelId>24||
   !Number.isFinite(seed.x)||!Number.isFinite(seed.y)||
   seed.x<0||seed.y<0||seed.x>=width||seed.y>=height)
   fail('SEED_COORDINATES_AND_CLASS_INVALID');
  const name=seed.labelId===0?'background':
   AIG26_CLASSES[seed.labelId];
  if(!name||name==='unknown'||(seed.labelId!==0&&name==='background'))
   fail('USER_SEED_CLASS_INVALID');
  backgroundSeed||=seed.labelId===0;
  foregroundSeed||=seed.labelId!==0;
  if(!classes.has(seed.labelId))classes.set(seed.labelId,{
   id:seed.labelId,className:name,points:[],rgb:[]});
  classes.get(seed.labelId).points.push([seed.x,seed.y]);
  anchorLabels.add(seed.labelId);
 }
 if(!backgroundSeed||!foregroundSeed||classes.size>8)
  fail('NEED_USER_BACKGROUND_AND_FOREGROUND_SEEDS');
 const ratio=Math.min(1,maxWorkSide/Math.max(width,height));
 const w=Math.max(1,Math.floor(width*ratio)),
  h=Math.max(1,Math.floor(height*ratio)),n=w*h;
 const samples=new Uint8Array(n*3),opaque=new Uint8Array(n);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const ox=clip(Math.floor((x+.5)*width/w),0,width-1),
   oy=clip(Math.floor((y+.5)*height/h),0,height-1),
   from=(oy*width+ox)*4,to=(y*w+x)*3;
  samples[to]=pixels[from];samples[to+1]=pixels[from+1];
  samples[to+2]=pixels[from+2];opaque[y*w+x]=pixels[from+3]>=32?1:0;
 }
 const anchor=new Int16Array(n).fill(-1),
  labels=new Uint8Array(n),best=new Float64Array(n).fill(Infinity),
  palette=new Map();
 const heap=new MinHeap();
 for(const cls of classes.values()){
  const colours=[];
  for(const [x,y] of cls.points){
   const sx=clip(Math.floor(x*w/width),0,w-1),
    sy=clip(Math.floor(y*h/height),0,h-1),i=sy*w+sx;
   if(anchor[i]>=0&&anchor[i]!==cls.id)
    fail('CONFLICTING_CLASS_SEEDS_IN_SAME_WORK_CELL');
   if(cls.id!==0&&!opaque[i])
    fail('FOREGROUND_SEED_IS_TRANSPARENT');
   anchor[i]=cls.id;
   const k=i*3;colours.push([samples[k],samples[k+1],samples[k+2]]);
   best[i]=0;labels[i]=cls.id;heap.push([0,i,cls.id]);
  }
  palette.set(cls.id,colours);
 }
 const ids=[...classes.keys()].sort((a,b)=>a-b);
 const colorTo=(i,id)=>{
  const k=i*3,colours=palette.get(id);let best=Infinity;
  for(const p of colours)best=Math.min(best,
   dist3(samples[k],samples[k+1],samples[k+2],p));
  return best;
 };
 let settled=0;
 while(heap.size){
  const [cost,i,id]=heap.pop();
  if(cost>best[i]+1e-7||labels[i]!==id)continue;
  settled++;
  const x=i%w,y=(i/w)|0,k=i*3;
  for(const j of [x>0?i-1:-1,x+1<w?i+1:-1,
   y>0?i-w:-1,y+1<h?i+w:-1]){
   if(j<0||anchor[j]>=0&&anchor[j]!==id)continue;
   const t=j*3;
   const dr=samples[k]-samples[t],dg=samples[k+1]-samples[t+1],
    db=samples[k+2]-samples[t+2];
   const edge=dr*dr+dg*dg+db*db;
   const paletteDist=colorTo(j,id);
   const proposed=cost+1+edge*edgeWeight+
    paletteDist*paletteDist*colorWeight;
   if(proposed+1e-7>=best[j])continue;
   best[j]=proposed;labels[j]=id;heap.push([proposed,j,id]);
  }
 }
 // Real unknown band: don't certify class assignments on mixed-colour
 // boundaries where class-palette distances cannot distinguish the regions.
 const conservative=new Uint8Array(labels);
 let uncertainCells=0;
 for(let i=0;i<n;i++){
  if(!opaque[i]){conservative[i]=0;continue}
  const id=labels[i];if(!id||anchor[i]>=0)continue;
  const x=i%w,y=(i/w)|0;
  const touching=[x>0?i-1:-1,x+1<w?i+1:-1,
   y>0?i-w:-1,y+1<h?i+w:-1].some(j=>j>=0&&labels[j]!==id);
  if(!touching)continue;
  const own=colorTo(i,id);
  let other=Infinity;
  for(const alt of ids)if(alt!==id)other=Math.min(other,colorTo(i,alt));
  if(Math.abs(other-own)<17){conservative[i]=0;uncertainCells++}
 }
 const full=new Uint8Array(width*height),count=new Map(ids.map(id=>[id,0]));
 let uncertainPixels=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,gi=Math.min(h-1,Math.floor(y*h/height))*w+
   Math.min(w-1,Math.floor(x*w/width)),value=pixels[i*4+3]<32?
   0:conservative[gi];
  full[i]=value;count.set(value,(count.get(value)||0)+1);
  if(value===0&&opaque[gi]&&labels[gi]!==0)uncertainPixels++;
 }
 const regions=ids.filter(id=>id!==0).map(id=>({
  id,className:classes.get(id).className,
  pixelCount:count.get(id)||0,seedCount:classes.get(id).points.length,
  userSuppliedClassNotModelPrediction:true
 }));
 if(regions.some(r=>r.pixelCount<16))
  fail('SEGMENT_MISSING_OR_TOO_SMALL_CHECK_SEEDS');
 const humanReviewRequired=true;
 return {
  schema:AIG27_SCHEMA,sourceSha256,width,height,labels:full,runs:rle(full),
  regions,seedCount:seeds.length,explicitUserClasses:ids.map(id=>({
   id,className:classes.get(id).className})),
  workspaceGrid:[w,h],maxWorkSide,
  actualInputPixelsProcessed:true,
  geodesicEdgeAwarePropagation:true,
  sampledActualRGBAColours:true,unresolvedBoundaryPixels:uncertainPixels,
  uncertainWorkCells:uncertainCells,
  sourcePhotoUnchanged:true,
  automaticTrainedSemanticInference:false,
  claimedHumanOrFaceIdentity:false,occludedBodyNotReconstructed:true,
  physical3DDepthInferred:false,notGroundTruth:true,
  humanReviewRequired,releaseAllowed:false,
  proofStatus:'SOURCE_BOUND_USER_SEEDED_SEGMENTATION_UNREVIEWED'
 };
}
