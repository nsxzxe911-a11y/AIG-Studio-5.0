/** FastModel 6.12 — real pixel evidence. This is colour-key/alpha
 * segmentation, NOT biological species classification, pose/depth inference,
 * photoreal skin, or physical tissue modulus measurement.
 */
export const AIG_SOURCE_OBSERVATION_SCHEMA='AIG_FASTMODEL_6_12_REAL_PIXEL_OBSERVATION';
const DOMAINS=new Set(['HUMAN','ANIMAL','PLANT']);
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
export function inspectAigSourceObservation({
 pixels,imageWidth,imageHeight,sourceImageSHA256,domain='HUMAN'
}={}){
 if(!DOMAINS.has(domain))throw Error('AIG612_EXPLICIT_BIOLOGICAL_DOMAIN_REQUIRED');
 if(!/^[a-f0-9]{64}$/i.test(sourceImageSHA256||'')||
  !Number.isInteger(imageWidth)||!Number.isInteger(imageHeight)||
  imageWidth<128||imageHeight<128||imageWidth>12000||imageHeight>12000||
  pixels?.length!==imageWidth*imageHeight*4)
  throw Error('AIG612_INVALID_SOURCE_IMAGE');
 const w=128,h=128,N=w*h,p=new Uint8Array(N*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=Math.min(imageWidth-1,Math.floor((x+.5)*imageWidth/w));
  const sy=Math.min(imageHeight-1,Math.floor((y+.5)*imageHeight/h));
  const a=(sy*imageWidth+sx)*4,b=(y*w+x)*4;
  for(let k=0;k<4;k++)p[b+k]=pixels[a+k];
 }
 const rim=[];let clear=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if(x>=5&&x<w-5&&y>=5&&y<h-5)continue;
  const i=(y*w+x)*4;
  if(p[i+3]<64)clear++;
  else if(p[i+3]>=240)rim.push([p[i],p[i+1],p[i+2]]);
 }
 const alpha=clear>=100&&clear>rim.length;
 if(!alpha&&rim.length<140)throw Error('AIG612_BACKGROUND_NOT_OBSERVABLE');
 const background=alpha?null:[0,1,2].map(k=>median(rim.map(c=>c[k])));
 const deviations=alpha?[]:rim.map(v=>
  Math.hypot(...v.map((n,k)=>(n-background[k])/255)))
  .sort((a,b)=>a-b);
 const variance=alpha?null:median(deviations);
 // A median alone can miss two-tone border clutter if one colour has a
 // slight majority. Require both typical and 90th-percentile consistency.
 const p90=alpha?null:deviations[Math.floor((deviations.length-1)*.90)];
 if((variance!==null&&variance>.22)||(p90!==null&&p90>.45))
  throw Error('AIG612_COMPLEX_BACKGROUND_REQUIRES_REAL_SEGMENTATION');
 const mask=new Uint8Array(N),visited=new Uint8Array(N);
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  const i=y*w+x,j=i*4;
  if(alpha){mask[i]=p[j+3]>=128?1:0;continue;}
  if(p[j+3]<128)continue;
  const delta=Math.hypot(...[0,1,2].map(k=>(p[j+k]-background[k])/255));
  mask[i]=delta>Math.max(.17,variance*2.1)?1:0;
 }
 const components=[];
 for(let first=0;first<N;first++){
  if(!mask[first]||visited[first])continue;
  const queue=[first];visited[first]=1;
  let x0=w,x1=0,y0=h,y1=0,sumX=0,sumY=0;
  for(let at=0;at<queue.length;at++){
   const i=queue[at],x=i%w,y=Math.floor(i/w);
   x0=Math.min(x0,x);x1=Math.max(x1,x);
   y0=Math.min(y0,y);y1=Math.max(y1,y);sumX+=x;sumY+=y;
   for(const n of [i-1,i+1,i-w,i+w]){
    if(n<0||n>=N||visited[n]||!mask[n])continue;
    if(Math.abs(n%w-x)+Math.abs(Math.floor(n/w)-y)!==1)continue;
    visited[n]=1;queue.push(n);
   }
  }
  components.push({indices:queue,size:queue.length,x0,x1,y0,y1,
   centerX:sumX/queue.length,centerY:sumY/queue.length});
 }
 components.sort((a,b)=>b.size-a.size);
 const first=components[0],second=components[1];
 if(!first||first.size<180||first.x1-first.x0<6||first.y1-first.y0<9)
  throw Error('AIG612_NO_RELIABLE_FOREGROUND_SUBJECT');
 if(second&&second.size>Math.max(150,first.size*.55))
  throw Error('AIG612_MULTIPLE_DOMINANT_SUBJECTS');
 if(first.x0<3||first.x1>w-4||first.y0<3||first.y1>h-4)
  throw Error('AIG612_SUBJECT_CROPPED_OR_TOUCHES_BORDER');
 const single=new Uint8Array(N);
 for(const i of first.indices)single[i]=1;
 const bands=[];
 const bandHalf=Math.max(1,Math.floor((first.y1-first.y0+1)/35));
 for(let k=0;k<=10;k++){
  const row=first.y0+(first.y1-first.y0)*k/10;
  let min=w,max=-1,n=0,sum=0;
  for(let y=Math.max(first.y0,Math.round(row-bandHalf));
      y<=Math.min(first.y1,Math.round(row+bandHalf));y++)
   for(let x=first.x0;x<=first.x1;x++)if(single[y*w+x]){
    min=Math.min(min,x);max=Math.max(max,x);n++;sum+=x;
   }
  bands.push({fraction:k/10,widthPixels:n?max-min+1:null,
   centerXPixel:n?+(sum/n).toFixed(3):null,
   source:'PIXEL_OBSERVED_COLOUR_KEY_NOT_SEMANTIC_LANDMARK'});
 }
 const stride=Math.max(1,Math.floor(first.size/1024));
 const sampled=first.indices.filter((_,i)=>i%stride===0).slice(0,1024);
 const colour=[0,1,2].map(k=>median(sampled.map(i=>p[4*i+k])));
 return Object.freeze({
  schema:AIG_SOURCE_OBSERVATION_SCHEMA,
  sourceImageSHA256:sourceImageSHA256.toLowerCase(),
  inputPixels:[imageWidth,imageHeight],sampledPixels:[w,h],
  domain,domainDecisionSource:'EXPLICIT_USER_CHOICE_NOT_AI_SPECIES_RECOGNITION',
  segmentationMethod:alpha?'ORIGINAL_IMAGE_ALPHA':'UNIFORM_BORDER_COLOUR_KEY',
  backgroundMedianRGB:background,backgroundMedianColourDistance:variance,
  backgroundP90ColourDistance:p90,
  mainForegroundAreaFraction:+(first.size/N).toFixed(6),
  separateForegroundComponents:components.length,
  secondToMainAreaRatio:second?+(second.size/first.size).toFixed(6):0,
  foregroundBox:{x0:first.x0,y0:first.y0,x1:first.x1,y1:first.y1},
  observedSilhouetteBands:bands,
  measuredForegroundMedianRGB:colour,
  rgbMeasuredNotTrueSkinOrFurOrLeafAlbedo:true,
  speciesOrAnatomicalKeypointsVerified:false,
  hiddenPartsPhotographicallyMeasured:false,
  physicalSkinElasticityMeasured:false,
  true3DDepthFromSingleRGBMeasured:false,
  observedAndPriorSeparated:true,
  nonHuman3DGenerationReady:false,
  releaseAllowed:false
 });
}