/**
 * FastModel Real3D V118. Self-contained, actually TRAINED on-device neural
 * RGB classifier (3 -> 12 tanh -> 1 sigmoid), with original-pixel scribbles.
 * No pretrained human-semantic weights, no network/CDN, no inferred geometry.
 * The user labels pixels; model weights are learned in this browser session.
 */
export const AIG_REAL3D_V118_SCHEMA='AIG_REAL3D_V118_LOCALLY_TRAINED_PIXEL_NEURAL_V1';
const err=s=>{throw Error('REAL3D_V118_'+s);};
const validSha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s);
const bytes=x=>x instanceof Uint8Array||x instanceof Uint8ClampedArray;
const key=(x,y,w)=>y*w+x;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const color=(src,k)=>[src[k*4],src[k*4+1],src[k*4+2]];
const sigmoid=x=>1/(1+Math.exp(-Math.max(-30,Math.min(30,x))));
const N=12,W=3*N+N+N+1;
const fy=()=>new Float64Array(W);
function seeds(points,w,h,label){
 if(!Array.isArray(points)||points.length<2||points.length>80)
  err(label+'_NEEDS_2_TO_80_EXPLICIT_PIXEL_LABELS');
 const set=new Set();
 return points.map(p=>{
  if(!Number.isInteger(p?.x)||!Number.isInteger(p?.y)||
   p.x<0||p.y<0||p.x>=w||p.y>=h)
   err(label+'_PIXEL_NOT_OBSERVED_IN_SOURCE');
  const k=key(p.x,p.y,w);
  if(set.has(k))err(label+'_DUPLICATED_PIXEL_LABEL');
  set.add(k);return k;
 });
}
function evaluate(weights,rgb,hidden){
 const x0=rgb[0]/127.5-1,x1=rgb[1]/127.5-1,x2=rgb[2]/127.5-1;
 let value=weights[W-1];
 for(let j=0;j<N;j++){
  const k=j*3;
  const h=Math.tanh(weights[k]*x0+weights[k+1]*x1+
   weights[k+2]*x2+weights[3*N+j]);
  hidden[j]=h;value+=weights[4*N+j]*h;
 }
 return sigmoid(value);
}
function reachable(mask,w,h,start){
 const out=new Uint8Array(mask.length),q=new Int32Array(mask.length);
 let head=0,tail=0;
 if(!mask[start])return out;
 q[tail++]=start;out[start]=1;
 while(head<tail){
  const i=q[head++],x=i%w,y=(i/w)|0;
  for(const other of [x?i-1:-1,x+1<w?i+1:-1,y?i-w:-1,y+1<h?i+w:-1])
   if(other>=0&&mask[other]&&!out[other]){
    out[other]=1;q[tail++]=other;
   }
 }
 return out;
}
async function bytesSHA256(array){
 if(!globalThis.crypto?.subtle?.digest)err('CRYPTOGRAPHIC_SHA256_UNAVAILABLE');
 const hash=await globalThis.crypto.subtle.digest('SHA-256',array);
 return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
/**
 * One training invocation always starts fresh. No cross-user state or network.
 * Adam gradient descent trains actual neural weights on source pixel labels.
 * Independent holdout labels are not supplied, so no generalization claim.
 */
export async function trainAIGReal3DV118LocalNeural({
 rgba,width,height,sourcePhotoSha256,foregroundSeeds,backgroundSeeds,
 iterations=900,confidenceThreshold=.88,minimumCoverageFraction=.02,
 maximumCoverageFraction=.85
}={}){
 if(!bytes(rgba)||!Number.isInteger(width)||!Number.isInteger(height)||
  width<16||height<16||width>1024||height>1024||
  rgba.length!==width*height*4||!validSha(sourcePhotoSha256)||
  !Number.isInteger(iterations)||iterations<200||iterations>1800||
  !Number.isFinite(confidenceThreshold)||confidenceThreshold<.8||
  confidenceThreshold>.98||minimumCoverageFraction<.01||
  maximumCoverageFraction>.9||minimumCoverageFraction>=maximumCoverageFraction)
  err('SOURCE_SIZE_SHA_TRAINING_CONTRACT_INVALID');
 const fg=seeds(foregroundSeeds,width,height,'FOREGROUND'),
  bg=seeds(backgroundSeeds,width,height,'BACKGROUND');
 if(fg.some(k=>bg.includes(k)))err('CONFLICTING_LABELS_ON_SAME_PHOTO_PIXEL');
 if(fg.some(f=>bg.some(b=>distance(color(rgba,f),color(rgba,b))<14)))
  err('LABEL_COLORS_AMBIGUOUS_NO_VISUAL_SEPARATION');
 const set=fg.map(k=>({rgb:color(rgba,k),target:1})).concat(
  bg.map(k=>({rgb:color(rgba,k),target:0})));
 const weights=fy(),m=fy(),v=fy(),grad=fy(),hidden=new Float64Array(N);
 let seed=2166136261;
 for(const char of sourcePhotoSha256)seed=(Math.imul(seed^char.charCodeAt(0),16777619))>>>0;
 function random(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}
 for(let j=0;j<N;j++)for(let c=0;c<3;c++)weights[j*3+c]=(random()-.5)*.65;
 for(let j=0;j<N;j++)weights[4*N+j]=(random()-.5)*.6;
 const trainLoss=[];
 for(let t=1;t<=iterations;t++){
  grad.fill(0);let loss=0;
  for(const example of set){
   const p=evaluate(weights,example.rgb,hidden);
   const delta=p-example.target;
   loss-=example.target*Math.log(Math.max(1e-12,p))+
    (1-example.target)*Math.log(Math.max(1e-12,1-p));
   for(let j=0;j<N;j++){
    const a=delta*weights[4*N+j]*(1-hidden[j]*hidden[j]);
    grad[j*3]+=a*(example.rgb[0]/127.5-1);
    grad[j*3+1]+=a*(example.rgb[1]/127.5-1);
    grad[j*3+2]+=a*(example.rgb[2]/127.5-1);
    grad[3*N+j]+=a;
    grad[4*N+j]+=delta*hidden[j];
   }
   grad[W-1]+=delta;
  }
  const lr=.024,inv=1/set.length;
  for(let k=0;k<W;k++){
   const g=grad[k]*inv+weights[k]*.00005;
   m[k]=.9*m[k]+.1*g;
   v[k]=.999*v[k]+.001*g*g;
   weights[k]-=lr*(m[k]/(1-Math.pow(.9,t)))/
    (Math.sqrt(v[k]/(1-Math.pow(.999,t)))+1e-8);
  }
  if(t===1||t===iterations)trainLoss.push(loss*inv);
 }
 const learnedProbabilities=new Float32Array(width*height),
  predicted=new Uint8Array(width*height);
 let uncertain=0;
 for(let k=0;k<predicted.length;k++){
  const p=evaluate(weights,color(rgba,k),hidden);
  learnedProbabilities[k]=p;
  if(p>=confidenceThreshold)predicted[k]=1;
  else if(p>1-confidenceThreshold)uncertain++;
 }
 if(fg.some(k=>learnedProbabilities[k]<confidenceThreshold)||
  bg.some(k=>learnedProbabilities[k]>1-confidenceThreshold))
  err('MODEL_DID_NOT_LEARN_BOTH_SOURCE_LABELS');
 const connected=reachable(predicted,width,height,fg[0]);
 if(fg.some(k=>connected[k]!==1))err('LEARNED_SUBJECT_SEEDS_NOT_ONE_CONNECTED_REGION');
 let foregroundPixels=0,border=0,boundary=0,uncertainBoundary=0,disconnected=0;
 for(let k=0;k<connected.length;k++){
  if(predicted[k]&&!connected[k])disconnected++;
  if(!connected[k])continue;
  foregroundPixels++;
  const x=k%width,y=(k/width)|0;
  if(!x||!y||x===width-1||y===height-1)border++;
  if([x?k-1:-1,x+1<width?k+1:-1,y?k-width:-1,y+1<height?k+width:-1]
   .some(i=>i<0||!connected[i])){
   boundary++;
   if(learnedProbabilities[k]<.96)uncertainBoundary++;
  }
 }
 const coverage=foregroundPixels/connected.length,
  uncertainFraction=uncertain/connected.length;
 if(border||foregroundPixels<128||coverage<minimumCoverageFraction||
   coverage>maximumCoverageFraction)err('MODEL_FOREGROUND_CROPPED_OR_COVERAGE_UNTRUSTED');
 if(uncertainFraction>.2||boundary&&uncertainBoundary/boundary>.8)
  err('LEARNED_PIXEL_CLASSIFICATION_UNCERTAIN_NEEDS_HUMAN_MASK_REVIEW');
 const workingRGBA=new Uint8ClampedArray(rgba);
 for(let k=0;k<connected.length;k++)workingRGBA[k*4+3]=
  connected[k]?rgba[k*4+3]:0;
 const parameters=new Float32Array(weights);
 const modelWeightsSha256=await bytesSHA256(parameters.buffer);
 const model={architecture:'LOCAL_RGB_3x12_TANH_SIGMOID',
  parameterCount:W,weights:parameters,
  weightsSha256:modelWeightsSha256,trainingIterations:iterations};
 return {schema:AIG_REAL3D_V118_SCHEMA,status:'LOCALLY_TRAINED_NEURAL_INFERENCE_COMPLETED',
  sourcePhotoSha256,modelWeightsSha256,architecture:model.architecture,
  learnedParameterCount:W,trainingExamples:set.length,trainingIterations:iterations,
  trainingLossFirst:trainLoss[0],trainingLossFinal:trainLoss[1],
  modelLearnedFromUserLabels:true,actualNeuralWeightsExecuted:true,
  pretrainedSemanticHumanModelLoaded:false,trainedOnLicensedHumanPhotos:false,
  fullyAutomaticNoClickPersonSegmentation:false,
  foregroundPixels,foregroundFraction:coverage,
  uncertainPixelFraction:uncertainFraction,
  boundaryUncertainFraction:boundary?uncertainBoundary/boundary:1,
  disconnectedCandidatesRejected:disconnected,
  allOriginalPhotoRGBBytesPreserved:true,originalPhotoAlphaModifiedOnlyInWorkingCopy:true,
  independentSegmentationGroundTruthVerified:false,
  completeHuman3DOrClothesRecovered:false,unseenBacksideReconstructed:false,
  productionReleasePASS:false,workingRGBA,learnedProbabilities,model};
}
