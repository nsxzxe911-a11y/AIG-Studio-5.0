/**
 * V94 source-triangle and temporal integrity. No smoothing, subdivision,
 * fabricated backside, procedural re-topology, or color-as-depth tricks.
 * Tests source original face IDs across a real vertex-pose timeline.
 */
export const AIG_REAL3D_V94_MOTION_SCHEMA=
 'AIG_REAL3D_V94_SOURCE_TRIANGLE_TEMPORAL_GEOMETRY_QA_V1';
const fail=s=>{throw Error('REAL3D_V94_MOTION_'+s);};
const finite=Number.isFinite,v3=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=a=>Math.hypot(...a);
const vertex=(arr,id)=>arr.slice(id*3,id*3+3);
const round=n=>Math.round(n*1e7)/1e7;
function faceMetric(p,idx){
 const [a,b,c]=idx.map(i=>vertex(p,i));
 const normal=cross(sub(b,a),sub(c,a));
 return {normal,area:length(normal)*.5,
  edges:[length(sub(b,a)),length(sub(c,b)),length(sub(a,c))]};
}
export function auditAIGReal3DAnimatedSourceTopology({
 originalMesh,sourceSha256,frames,
 limits={
  maxRelativeEdgeStretch:.3,maxRelativeEdgeCompression:.35,
  minRelativeFaceArea:.08,maxRelativeFaceArea:3,
  maxFrameVertexStepMeters:.25,maxChangedFaceFraction:1,
  faceNormalFlipDotTolerance:-.85
 }
}={}){
 if(!/^[a-f0-9]{64}$/i.test(sourceSha256??'')||
  !originalMesh?.actualXYZTriangles||
  !Array.isArray(originalMesh.positions)||!Array.isArray(originalMesh.indices)||
  !Number.isInteger(originalMesh.triangleCount)||originalMesh.triangleCount<1||
  !Number.isInteger(originalMesh.vertexCount)||originalMesh.vertexCount<3||
  originalMesh.positions.length!==3*originalMesh.vertexCount||
  originalMesh.indices.length!==3*originalMesh.triangleCount||
  !Array.isArray(frames)||frames.length<2||frames.length>360||
  !limits||typeof limits!=='object')
  fail('ORIGINAL_SOURCE_SHA_MOTION_INVALID');
 for(const [name,min,max] of [
  ['maxRelativeEdgeStretch',0,3],['maxRelativeEdgeCompression',0,1],
  ['minRelativeFaceArea',0,1],['maxRelativeFaceArea',1,50],
  ['maxFrameVertexStepMeters',.00001,10],
  ['maxChangedFaceFraction',0,1],
  ['faceNormalFlipDotTolerance',-1,0]]){
  if(!finite(limits[name])||limits[name]<min||limits[name]>max)
   fail('MOTION_THRESHOLD_'+name+'_INVALID');
 }
 const indices=originalMesh.indices,original=originalMesh.positions,
  numFaces=originalMesh.triangleCount,numVertices=originalMesh.vertexCount;
 const originalFaces=Array.from({length:numFaces},(_,i)=>
  faceMetric(original,indices.slice(3*i,3*i+3)));
 let priorTime=-1,previous=original,observedMoved=false,
  largestEdgeStretch=0,largestEdgeCompression=0,smallestFaceAreaRatio=Infinity,
  largestFaceAreaRatio=0,mostVertexMotionMeters=0,flipped=[],collapsed=[],
  wrongIndices=[],temporalSpikeFrames=[];
 const measurements=[];
 for(let i=0;i<frames.length;i++){
  const frame=frames[i],pose=frame?.positions;
  if(!finite(frame?.timeSec)||frame.timeSec<=priorTime||
   frame.timeSec<0||frame.timeSec>90||
   !Array.isArray(pose)||pose.length!==original.length||
   !pose.every(Number.isFinite)||
   (frame.indices!==undefined&&(
    !Array.isArray(frame.indices)||
    frame.indices.length!==indices.length||
    frame.indices.some((x,k)=>x!==indices[k]))))
   fail('FRAME_TIMING_OR_SOURCE_INDEX_MISMATCH_'+i);
  const dt=i>0?frame.timeSec-priorTime:null;
  if(dt!==null&&dt<1/10000)fail('UNSTABLE_FRAME_TIMESTAMP');
  const indexStable=frame.indices===undefined||
   frame.indices.every((x,k)=>x===indices[k]);
  if(!indexStable)wrongIndices.push(i);
  let frameChanged=0,frameMaxStep=0,positiveStretch=0,
   negativeStretch=0,smallestRatio=Infinity,largestRatio=0,
   localFlips=0,localDegenerates=0;
  for(let v=0;v<numVertices;v++){
   const step=length(sub(vertex(pose,v),vertex(previous,v)));
   frameMaxStep=Math.max(frameMaxStep,step);
   if(step>1e-9)observedMoved=true;
  }
  mostVertexMotionMeters=Math.max(mostVertexMotionMeters,frameMaxStep);
  if(frameMaxStep>limits.maxFrameVertexStepMeters)
   temporalSpikeFrames.push(i);
  for(let f=0;f<numFaces;f++){
   const ids=indices.slice(3*f,3*f+3),a=originalFaces[f],
    b=faceMetric(pose,ids);
   let changed=false;
   for(const v of ids)for(let k=0;k<3;k++)
    if(original[v*3+k]!==pose[v*3+k])changed=true;
   if(changed)frameChanged++;
   if(a.area<1e-12){collapsed.push({frame:i,sourceFace:f,reason:'ORIGINAL_DEGENERATE'});continue;}
   const ratio=b.area/a.area;
   smallestRatio=Math.min(smallestRatio,ratio);
   largestRatio=Math.max(largestRatio,ratio);
   if(ratio<limits.minRelativeFaceArea)
    collapsed.push({frame:i,sourceFace:f,reason:'SOURCE_FACE_AREA_COLLAPSED'});
   const originalNormalLen=length(a.normal),newNormalLen=length(b.normal);
   const facing=newNormalLen>1e-12?
    dot(a.normal,b.normal)/(originalNormalLen*newNormalLen):-1;
   if(facing<limits.faceNormalFlipDotTolerance){
    localFlips++;flipped.push({frame:i,sourceFace:f,dot:round(facing)});
   }
   for(let k=0;k<3;k++){
    if(a.edges[k]<1e-12)continue;
    const change=b.edges[k]/a.edges[k]-1;
    if(change>positiveStretch)positiveStretch=change;
    if(-change>negativeStretch)negativeStretch=-change;
   }
  }
  largestEdgeStretch=Math.max(largestEdgeStretch,positiveStretch);
  largestEdgeCompression=Math.max(largestEdgeCompression,negativeStretch);
  smallestFaceAreaRatio=Math.min(smallestFaceAreaRatio,smallestRatio);
  largestFaceAreaRatio=Math.max(largestFaceAreaRatio,largestRatio);
  measurements.push({frame:i,timeSec:frame.timeSec,
   changedOriginalFaces:frameChanged,
   changedFaceFraction:round(frameChanged/numFaces),
   maxStepSincePriorMeters:round(frameMaxStep),
   maxStretchRatio:round(positiveStretch),
   maxCompressionRatio:round(negativeStretch),
   minAreaRatio:round(smallestRatio),maxAreaRatio:round(largestRatio),
   invertedNormalCandidateFaces:localFlips,
   collapsedFaces:localDegenerates,
   indexedFacesKept:true});
  if(frameChanged/numFaces>limits.maxChangedFaceFraction)
   measurements.at(-1).changedFractionOverLimit=true;
  previous=pose;priorTime=frame.timeSec;
 }
 const acceptable=observedMoved&&!wrongIndices.length&&!flipped.length&&
  !collapsed.length&&!temporalSpikeFrames.length&&
  largestEdgeStretch<=limits.maxRelativeEdgeStretch&&
  largestEdgeCompression<=limits.maxRelativeEdgeCompression&&
  smallestFaceAreaRatio>=limits.minRelativeFaceArea&&
  largestFaceAreaRatio<=limits.maxRelativeFaceArea&&
  measurements.every(m=>!m.changedFractionOverLimit);
 return {schema:AIG_REAL3D_V94_MOTION_SCHEMA,sourceSha256,
  originalTriangleCount:numFaces,originalVertexCount:numVertices,
  inputFrameCount:frames.length,actualXYZMotionObserved:observedMoved,
  originalIndexedTrianglesPreserved:wrongIndices.length===0,
  sourceFacesAdded:0,sourceFacesDeleted:0,
  maxRelativeEdgeStretch:round(largestEdgeStretch),
  maxRelativeEdgeCompression:round(largestEdgeCompression),
  minimumRelativeFaceArea:round(smallestFaceAreaRatio),
  maximumRelativeFaceArea:round(largestFaceAreaRatio),
  maximumInterframeVertexMotionMeters:round(mostVertexMotionMeters),
  flippedOriginalSourceFaceCandidates:flipped.slice(0,40),
  collapsedOriginalSourceFaceCandidates:collapsed.slice(0,40),
  temporalSpikeFrames,
  sourceMotionGeometryGatePASS:acceptable,
  frameMetrics:measurements,
  noClaimOfCollisionFreeBodyOrBiomechanicalRealism:true,
  noNewGeometryCreated:true,filmContinuityCertified:false,
  renderStyleCertified:false,releasePASS:false};
}
