/**
 * Real3D V97: real observed image-mask rows constrain actual Indexed XYZ
 * source-candidate head geometry. NEVER claim texture colors are real depth,
 * anatomical identity, measured backside or an ML face detector.
 */
export const AIG_REAL3D_V97_SILHOUETTE_SCHEMA='AIG_REAL3D_V97_OBSERVED_COLOR_CONTOUR_CONSTRAINT_V1';
const fail=x=>{throw Error('REAL3D_V97_SILHOUETTE_'+x);};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const skin=(r,g,b,a)=>a>=200&&r>75&&g>36&&b>24&&
 r>g*1.08&&r>b*1.12&&Math.max(r,g,b)-Math.min(r,g,b)>19;
const sample=(rows,t)=>{
 let lower=rows[0],upper=rows.at(-1);
 for(let i=0;i<rows.length;i++)if(rows[i].t<=t)lower=rows[i];
 for(let i=0;i<rows.length;i++)if(rows[i].t>=t){upper=rows[i];break;}
 const alpha=upper.t<=lower.t?0:(t-lower.t)/(upper.t-lower.t);
 return lower.halfWidthNormalized*(1-alpha)+upper.halfWidthNormalized*alpha;
};
export function extractAIGReal3DObservedFaceSilhouette({
 rgba,width,height,imageSha256,faceBox
}={}){
 if(!sha(imageSha256)||!Number.isInteger(width)||!Number.isInteger(height)||
  width<96||height<96||width>4096||height>4096||
  !rgba||rgba.length!==width*height*4||
  !faceBox||![faceBox.x,faceBox.y,faceBox.width,faceBox.height].every(Number.isFinite)||
  faceBox.x<0||faceBox.y<0||faceBox.width<15||faceBox.height<22||
  faceBox.x+faceBox.width>width||faceBox.y+faceBox.height>height)
  fail('ORIGINAL_IMAGE_MASK_OR_FACE_OBSERVATION_INVALID');
 const x0=Math.max(0,Math.floor(faceBox.x)),
  x1=Math.min(width-1,Math.ceil(faceBox.x+faceBox.width)),
  y0=Math.max(0,Math.floor(faceBox.y)),
  y1=Math.min(height-1,Math.ceil(faceBox.y+faceBox.height)),
  mid=(faceBox.x+faceBox.width*.5);
 const rows=[];let observedPixels=0,missing=0,ambiguous=0;
 // Propose sparse color-connected slices. This is NOT a semantic segmentation
 // model and may include garments/background. Keep LOW source confidence.
 for(let y=y0;y<=y1;y+=Math.max(1,Math.floor(faceBox.height/56))){
  const spans=[];let start=-1,last=-1;
  for(let x=x0;x<=x1;x++){
   const i=(y*width+x)*4;
   const yes=skin(rgba[i],rgba[i+1],rgba[i+2],rgba[i+3]);
   if(yes){if(start<0)start=x;last=x;observedPixels++;}
   if((!yes||x===x1)&&start>=0){
    spans.push({left:start,right:last,length:last-start+1});
    start=-1;
   }
  }
  if(!spans.length){missing++;continue;}
  spans.sort((a,b)=>(b.length-a.length));
  const best=spans[0];
  if(spans.length>1&&spans[1].length>=best.length*.70)ambiguous++;
  if(best.length<4){missing++;continue;}
  const t=(y-faceBox.y)/faceBox.height;
  rows.push({t:clamp(t,0,1),imageY:y,
   halfWidthNormalized:best.length/Math.max(1,faceBox.width),
   centerXNormalized:(best.left+best.right)/2/width,
   spanPixels:best.length,sourceObserved:true});
 }
 if(rows.length<10||observedPixels<120||
  rows.at(-1).t-rows[0].t<.40)
  return {schema:AIG_REAL3D_V97_SILHOUETTE_SCHEMA,
   imageSha256,result:'BLOCK_INSUFFICIENT_OBSERVED_CONTOUR',
   colorMaskRows:rows,sourceConfidence:'LOW',imageObservedDepth:false,
   subjectIdentityConfirmed:false,releasePASS:false};
 const max=Math.max(...rows.map(r=>r.halfWidthNormalized));
 const normalized=rows.map(r=>({...r,halfWidthNormalized:r.halfWidthNormalized/max}));
 return {schema:AIG_REAL3D_V97_SILHOUETTE_SCHEMA,imageSha256,
  result:'OBSERVED_MASK_WITH_INFERRED_3D_CONTOUR',sourceConfidence:'LOW',
  faceBox:{...faceBox},colorMaskRows:normalized,
  totalMaskRows:rows.length,maskedColorPixelSamples:observedPixels,
  missingRows:missing,ambiguousColorRows:ambiguous,
  maxObservedFaceHalfWidthPixels:max*faceBox.width/2,
  maskIsColorHeuristicNotTrainedSemanticModel:true,
  faceAndHairBoundariesUnverified:true,imageObservedDepth:false,
  subjectIdentityConfirmed:false,releasePASS:false};
}
export function fitAIGReal3DHeadGeometryFromObservedMask({
 positions,silhouette,headVertexStart=0,headSteps=28,headRows=14,
 headCenterY=1.515,headRadiusY=1.64/7.35*.53,
 maxRelativeXYChange=.75
}={}){
 if(silhouette?.schema!==AIG_REAL3D_V97_SILHOUETTE_SCHEMA||
  silhouette.result!=='OBSERVED_MASK_WITH_INFERRED_3D_CONTOUR'||
  !Array.isArray(positions)||positions.length%3!==0||
  !Number.isInteger(headVertexStart)||headVertexStart<0||
  !Number.isInteger(headSteps)||headSteps<12||
  !Number.isInteger(headRows)||headRows<6||
  positions.length/3<headVertexStart+2+(headRows-1)*headSteps||
  ![headCenterY,headRadiusY,maxRelativeXYChange].every(Number.isFinite)||
  headRadiusY<=0||maxRelativeXYChange<=0||maxRelativeXYChange>2)
  fail('INDEXED_HEAD_SURFACE_OR_OBSERVED_MASK_INVALID');
 const copy=[...positions],rows=silhouette.colorMaskRows;
 const eqX=headVertexStart+1+Math.floor((headRows-2)/2)*headSteps,
  headXMax=Math.max(...Array.from({length:headSteps},(_,i)=>Math.abs(positions[(eqX+i)*3])));
 if(!(headXMax>.01))fail('HEAD_GEOMETRY_UNDEFINED');
 let changed=0,priorLoss=0,afterLoss=0,total=0,maxShiftM=0;
 const headTop=headCenterY+headRadiusY;
 for(let ring=1;ring<headRows;ring++){
  const start=headVertexStart+1+(ring-1)*headSteps;
  const vertexY=positions[start*3+1],
   t=clamp((headTop-vertexY)/(2*headRadiusY),0,1),
   evidenceRatio=clamp(sample(rows,t),.06,1.12),
   angle=ring*Math.PI/headRows,
   originalRadius=headXMax*Math.sin(angle),
   targetRadius=headXMax*evidenceRatio,
   // Fitting a sparse color contour is an inferred cosmetic deformation;
   // this bounded prior prevents dramatic unmeasured shape changes.
   bounded=clamp(targetRadius,
    originalRadius*(1-maxRelativeXYChange),
    originalRadius*(1+maxRelativeXYChange));
  priorLoss+=Math.abs(originalRadius/headXMax-evidenceRatio);
  afterLoss+=Math.abs(bounded/headXMax-evidenceRatio);total++;
  for(let k=0;k<headSteps;k++){
   const v=start+k,original=positions[v*3],
    fitted=Math.cos(2*Math.PI*k/headSteps)*bounded;
   maxShiftM=Math.max(maxShiftM,Math.abs(fitted-original));
   if(Math.abs(fitted-original)>1e-8){copy[v*3]=fitted;changed++;}
  }
 }
 // Unobserved head depth, body, limbs, neck and original source indices
 // are untouched. Changing mirrored/head back-facing x is INFERRED, not observed.
 return {schema:'AIG_REAL3D_V97_CONTOUR_BOUND_3D_HEAD_WORKING_COPY_V1',
  sourceImageSha256:silhouette.imageSha256,
  positions:copy,changedOriginalHeadVertices:changed,
  adjustedHeadVertexCount:headSteps*(headRows-1),
  maxActualHeadVertexShiftMeters:Math.round(maxShiftM*1e8)/1e8,
  meanNormalizedContourErrorBefore:priorLoss/total,
  meanNormalizedContourErrorAfter:afterLoss/total,
  contourFitImproved:afterLoss+1e-9<priorLoss,
  originalVertexCountUnchanged:copy.length===positions.length,
  originalBodyVerticesUntouched:true,headZDepthUnchanged:true,
  hiddenHeadSideGeometryInferredNotObserved:true,
  verifiedIdentitySimilarity:false,sourceSurfaceAnatomyCertified:false,
  sourceGeometryTriangulationUnchanged:true,releasePASS:false};
}
