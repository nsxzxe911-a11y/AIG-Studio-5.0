/**
 * FastModel Real3D V111 -- true source-pixel, user-seeded segmentation on
 * patterned backgrounds. This is an interactive graph/color classifier,
 * NOT neural inference or automatically recognized anatomy. No fake depth.
 */
export const AIG_REAL3D_V111_SCHEMA='AIG_REAL3D_V111_USER_SEEDED_COLOR_CONNECTED_MASK_V1';
const fail=x=>{throw Error('REAL3D_V111_'+x);};
const isSha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s);
const isBytes=x=>x instanceof Uint8Array||x instanceof Uint8ClampedArray;
const color=(a,i)=>[a[i*4],a[i*4+1],a[i*4+2]];
const cdist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const xyKey=(x,y,w)=>y*w+x;
function validateSeeds(seeds,width,height,label){
 if(!Array.isArray(seeds)||seeds.length<2||seeds.length>80)
  fail(label+'_AT_LEAST_TWO_AND_MAX_EIGHTY_SOURCE_SEEDS');
 const uniq=new Set();
 return seeds.map(p=>{
  const x=p?.x,y=p?.y;
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||
    x>=width||y>=height)fail(label+'_SEED_PIXEL_OUT_OF_BOUNDS');
  const key=xyKey(x,y,width);
  if(uniq.has(key))fail(label+'_DUPLICATE_SOURCE_SEED');
  uniq.add(key);
  return {x,y,key};
 });
}
function floodSelected(binary,w,h,start){
 const out=new Uint8Array(binary.length),queue=new Int32Array(binary.length);
 let head=0,tail=0;
 if(!binary[start])return out;
 out[start]=1;queue[tail++]=start;
 while(head<tail){
  const k=queue[head++],x=k%w,y=Math.floor(k/w);
  for(const n of [x>0?k-1:-1,x+1<w?k+1:-1,
   y>0?k-w:-1,y+1<h?k+w:-1])
   if(n>=0&&binary[n]&&!out[n]){
    out[n]=1;queue[tail++]=n;
   }
 }
 return out;
}
export function segmentAIGReal3DV111FromUserSeeds({
 rgba,width,height,imageSha256,foregroundSeeds,backgroundSeeds,
 minimumColorMargin=12,maximumDistance=86
}={}){
 if(!isBytes(rgba)||!Number.isInteger(width)||!Number.isInteger(height)||
  width<16||height<16||width>1024||height>1024||
  rgba.length!==width*height*4||!isSha(imageSha256)||
  !Number.isFinite(minimumColorMargin)||minimumColorMargin<4||minimumColorMargin>40||
  !Number.isFinite(maximumDistance)||maximumDistance<30||maximumDistance>125)
  fail('SOURCE_PIXELS_OR_SHA_INVALID');
 const foreground=validateSeeds(foregroundSeeds,width,height,'FOREGROUND'),
  background=validateSeeds(backgroundSeeds,width,height,'BACKGROUND');
 const foregroundKeys=new Set(foreground.map(x=>x.key));
 if(background.some(x=>foregroundKeys.has(x.key)))
  fail('CONTRADICTORY_FOREGROUND_BACKGROUND_SEEDS');
 // Each seed stores the RGB color *actually observed* at its source pixel.
 const fgColors=foreground.map(p=>color(rgba,p.key)),
  bgColors=background.map(p=>color(rgba,p.key));
 if(fgColors.some(f=>bgColors.some(b=>cdist(f,b)<minimumColorMargin*1.5)))
  fail('FOREGROUND_BACKGROUND_COLOR_UNRESOLVED_NEEDS_MORE_MARKS');
 const n=width*height,predicted=new Uint8Array(n),
  fgDist=new Float32Array(n),bgDist=new Float32Array(n);
 for(let k=0;k<n;k++){
  const c=color(rgba,k);
  let f=Infinity,b=Infinity;
  for(const p of fgColors)f=Math.min(f,cdist(c,p));
  for(const p of bgColors)b=Math.min(b,cdist(c,p));
  fgDist[k]=f;bgDist[k]=b;
  // Confident foreground only. Unknown pixels are not silently added.
  if(f+minimumColorMargin<b&&f<=maximumDistance)predicted[k]=1;
 }
 if(foreground.some(p=>!predicted[p.key])||
  background.some(p=>predicted[p.key]))
  fail('USER_SEEDS_CONTRADICT_PIXEL_COLOR_CLASSIFICATION');
 const connected=floodSelected(predicted,width,height,foreground[0].key);
 if(foreground.some(p=>!connected[p.key]))
  fail('FOREGROUND_SEEDS_SPLIT_ACROSS_UNCONNECTED_REGIONS');
 let count=0,border=0,ambiguousEdge=0,perimeter=0,extra=0;
 let minX=width,minY=height,maxX=-1,maxY=-1;
 for(let k=0;k<n;k++){
  if(predicted[k]&&!connected[k])extra++;
  if(!connected[k])continue;
  count++;
  const x=k%width,y=Math.floor(k/width);
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);
  minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  if(x===0||x===width-1||y===0||y===height-1)border++;
  const neighbors=[x>0?k-1:-1,x+1<width?k+1:-1,
   y>0?k-width:-1,y+1<height?k+width:-1];
  if(neighbors.some(p=>p<0||!connected[p])){
   perimeter++;
   if(bgDist[k]-fgDist[k]<minimumColorMargin*1.5)
    ambiguousEdge++;
  }
 }
 if(count<128||count/n<.015||count/n>.85)
  fail('SEGMENT_TOO_SMALL_OR_MOST_IMAGE_CLAIMED_AS_SUBJECT');
 if(border)fail('SOURCE_SUBJECT_TOUCHES_FRAME_OR_SPILLS_INTO_BACKGROUND');
 const uncertainEdgeFraction=perimeter?ambiguousEdge/perimeter:1;
 if(uncertainEdgeFraction>.2)
  fail('SEGMENT_BOUNDARY_UNCERTAINTY_EXCEEDS_REVIEW_BUDGET');
 const workingRGBA=new Uint8ClampedArray(rgba);
 for(let i=0;i<n;i++)workingRGBA[i*4+3]=connected[i]?rgba[i*4+3]:0;
 // Opaque photos remain 255-alpha on the interior; RGB bytes preserved.
 let sourceColorChanged=false;
 for(let k=0;k<n;k++)for(let c=0;c<3;c++)
  if(workingRGBA[k*4+c]!==rgba[k*4+c])sourceColorChanged=true;
 if(sourceColorChanged)fail('ORIGINAL_SOURCE_PIXEL_COLOR_CHANGED');
 return {
  schema:AIG_REAL3D_V111_SCHEMA,sourceImageSha256:imageSha256,
  sourceDimensions:[width,height],
  seedForegroundCount:foreground.length,seedBackgroundCount:background.length,
  userProvidedForegroundAndBackgroundMarks:true,
  segmentationMode:'INTERACTIVE_COLOR_CONNECTED_NOT_NEURAL_AI',
  actualNeuralInferencePerformed:false,
  minColorMargin:minimumColorMargin,maximumColorDistance:maximumDistance,
  foregroundPixelCount:count,foregroundFraction:count/n,
  disconnectedCandidatePixelsRejected:extra,
  boundaryPixels:perimeter,uncertainBoundaryFraction:uncertainEdgeFraction,
  boundRectanglePixels:{minX,minY,maxX,maxY},
  originalSourceRGBPreserved:true,
  sourceMaskIndependentlyProvenCorrect:false,
  independentlyObservedPhysicalDepth:false,
  previouslyUnseenBacksideGenerated:false,
  photo3DLikenessNotCertified:true,
  humanAnatomyAutomaticallyRecognized:false,
  full1to1ReleaseGate:'BLOCK_MULTIVIEW_AND_DEPTH_SOURCE_UNVERIFIED',
  originalWorkingRGBA:workingRGBA,mask:connected,releasePASS:false
 };
}
