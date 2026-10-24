/**
 * Real3D V85 — ORIGINAL global Indexed XYZ six-direction curved-source
 * depth/occlusion evidence. All six directions measure the supplied geometry,
 * NOT six authenticated scan photographs and NOT four imagined sidewalls.
 *
 * Grid rasterization uses bounded exact original source triangle barycentrics;
 * per-view nearest/farthest depths and source triangle IDs stay auditable.
 * No subdivision, SDF, metaball, proxy sphere, or generated side surfaces.
 */
export const AIG_REAL3D_CURVED_SIX_DIRECTION_SCHEMA=
 'AIG_REAL3D_V85_SIX_DIRECTION_CURVED_ORIGINAL_SOURCE_DEPTH_V1';
export const AIG_REAL3D_CURVED_SIX_VIEWS=Object.freeze([
 {id:'RIGHT_POS_X',label:'右側 +X',axis:0,sign:1,u:2,v:1},
 {id:'LEFT_NEG_X',label:'左側 -X',axis:0,sign:-1,u:2,v:1},
 {id:'TOP_POS_Y',label:'頂部 +Y',axis:1,sign:1,u:0,v:2},
 {id:'BOTTOM_NEG_Y',label:'底部 -Y',axis:1,sign:-1,u:0,v:2},
 {id:'FRONT_POS_Z',label:'正面 +Z',axis:2,sign:1,u:0,v:1},
 {id:'BACK_NEG_Z',label:'背面 -Z',axis:2,sign:-1,u:0,v:1}
]);
const reject=x=>{throw Error('REAL3D_CURVED_SIX_'+x);};
const num=x=>typeof x==='number'&&Number.isFinite(x);
const round=x=>Math.round(x*1e6)/1e6;
function scanManifest(manifest,sourceSha256,triangles){
 if(manifest===null)return null;
 if(!manifest||manifest.schema!=='AIG_REAL3D_USER_DECLARED_VIEW_COVERAGE_V1'||
  manifest.sourceSha256!==sourceSha256||
  !manifest.observedByDirection||typeof manifest.observedByDirection!=='object')
  reject('SCAN_EVIDENCE_SOURCE_SHA_OR_SCHEMA_MISMATCH');
 const result={};
 for(const {id} of AIG_REAL3D_CURVED_SIX_VIEWS){
  const claimed=manifest.observedByDirection[id];
  if(claimed===undefined){result[id]=null;continue;}
  if(!Array.isArray(claimed)||claimed.length>triangles)
   reject('SCAN_SIDE_EVIDENCE_INVALID');
  const seen=new Set();
  for(const value of claimed){
   if(!Number.isInteger(value)||value<0||value>=triangles||seen.has(value))
    reject('SCAN_SOURCE_TRIANGLE_ID_INVALID');
   seen.add(value);
  }
  result[id]=seen;
 }
 return result;
}
export function auditAIGReal3DCurvedSixDirections({
 positions,indices,sourceSha256,gridSize=32,
 maxOriginalTriangles=300000,scanEvidence=null
}={}){
 if(!(positions instanceof Float32Array)||positions.length<12||
  positions.length%3!==0||
  !(indices instanceof Uint32Array)||indices.length<3||
  indices.length%3!==0||!/^[a-f0-9]{64}$/i.test(String(sourceSha256))||
  !Number.isInteger(gridSize)||gridSize<16||gridSize>64||
  !Number.isInteger(maxOriginalTriangles)||maxOriginalTriangles<4||
  maxOriginalTriangles>350000)
  reject('ORIGINAL_SOURCE_AND_BOUNDED_GRID_REQUIRED');
 const vertexCount=positions.length/3,faceCount=indices.length/3;
 if(faceCount>maxOriginalTriangles)
  reject('SOURCE_TRIANGLE_BUDGET');
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<positions.length;i++){
  if(!num(positions[i]))reject('NONFINITE_SOURCE_POSITION');
  const a=i%3;
  lo[a]=Math.min(lo[a],positions[i]);
  hi[a]=Math.max(hi[a],positions[i]);
 }
 if(lo.some((x,a)=>hi[a]-x<1e-8))
  reject('THREE_DIMENSIONAL_BOUNDS_REQUIRED');
 const scan=scanManifest(scanEvidence,sourceSha256,faceCount),
  originalXYZ=positions.slice(),originalFaceIds=indices.slice();
 const pixels=gridSize*gridSize;
 const views=AIG_REAL3D_CURVED_SIX_VIEWS.map(meta=>({
  ...meta,near:new Float64Array(pixels).fill(Infinity),
  far:new Float64Array(pixels).fill(-Infinity),
  nearFace:new Int32Array(pixels).fill(-1),
  facingOriginalTriangles:0,surfaceAreaFacing:0,
  projectedOriginalTriangles:0,sourceDegenerateProjectedTriangles:0
 }));
 let degenerate=0,totalArea=0,volume=0;
 const edges=new Map();
 for(let face=0;face<faceCount;face++){
  const ia=indices[3*face],ib=indices[3*face+1],ic=indices[3*face+2];
  if(ia>=vertexCount||ib>=vertexCount||ic>=vertexCount||
   ia===ib||ib===ic||ic===ia)
   reject('SOURCE_GLOBAL_TRIANGLE_INDEX_INVALID');
  const a=ia*3,b=ib*3,c=ic*3,
   ab=[positions[b]-positions[a],positions[b+1]-positions[a+1],
    positions[b+2]-positions[a+2]],
   ac=[positions[c]-positions[a],positions[c+1]-positions[a+1],
    positions[c+2]-positions[a+2]];
  const nx=ab[1]*ac[2]-ab[2]*ac[1],
   ny=ab[2]*ac[0]-ab[0]*ac[2],
   nz=ab[0]*ac[1]-ab[1]*ac[0],
   norm=Math.hypot(nx,ny,nz);
  if(norm<1e-12){degenerate++;continue;}
  totalArea+=norm*.5;
  volume+=(positions[a]*(positions[b+1]*positions[c+2]-
   positions[b+2]*positions[c+1])+
   positions[a+1]*(positions[b+2]*positions[c]-
    positions[b]*positions[c+2])+
   positions[a+2]*(positions[b]*positions[c+1]-
    positions[b+1]*positions[c]))/6;
  for(const [from,to] of [[ia,ib],[ib,ic],[ic,ia]]){
   const key=Math.min(from,to)+','+Math.max(from,to),
    forward=from<to?1:-1;
   const old=edges.get(key);
   if(old){old.count++;old.sum+=forward;}
   else edges.set(key,{count:1,sum:forward});
  }
  for(const v of views){
   const normal=[nx,ny,nz][v.axis]*v.sign/norm;
   if(normal>.05){v.facingOriginalTriangles++;v.surfaceAreaFacing+=norm*.5;}
   const U=(id)=>((positions[id*3+v.u]-lo[v.u])/
    (hi[v.u]-lo[v.u]))*gridSize;
   const V=(id)=>((positions[id*3+v.v]-lo[v.v])/
    (hi[v.v]-lo[v.v]))*gridSize;
   const pu=[U(ia),U(ib),U(ic)],pv=[V(ia),V(ib),V(ic)];
   const denom=(pv[1]-pv[2])*(pu[0]-pu[2])+
    (pu[2]-pu[1])*(pv[0]-pv[2]);
   if(Math.abs(denom)<1e-10){v.sourceDegenerateProjectedTriangles++;continue;}
   const minu=Math.max(0,Math.floor(Math.min(...pu)-.5)),
    maxu=Math.min(gridSize-1,Math.ceil(Math.max(...pu)-.5)),
    minv=Math.max(0,Math.floor(Math.min(...pv)-.5)),
    maxv=Math.min(gridSize-1,Math.ceil(Math.max(...pv)-.5));
   if(minu>maxu||minv>maxv)continue;
   v.projectedOriginalTriangles++;
   const depths=[ia,ib,ic].map(id=>v.sign>0?
    hi[v.axis]-positions[id*3+v.axis]:
    positions[id*3+v.axis]-lo[v.axis]);
   for(let y=minv;y<=maxv;y++)for(let x=minu;x<=maxu;x++){
    const px=x+.5,py=y+.5,
     w0=((pv[1]-pv[2])*(px-pu[2])+
      (pu[2]-pu[1])*(py-pv[2]))/denom,
     w1=((pv[2]-pv[0])*(px-pu[2])+
      (pu[0]-pu[2])*(py-pv[2]))/denom,
     w2=1-w0-w1;
    if(w0< -1e-8||w1< -1e-8||w2< -1e-8)continue;
    const offset=y*gridSize+x,depth=
     w0*depths[0]+w1*depths[1]+w2*depths[2];
    if(depth<v.near[offset]){
     v.near[offset]=depth;v.nearFace[offset]=face;
    }
    if(depth>v.far[offset])v.far[offset]=depth;
   }
  }
 }
 let openEdges=0,nonManifoldEdges=0,windingConflicts=0;
 for(const e of edges.values()){
  if(e.count===1)openEdges++;
  else if(e.count!==2)nonManifoldEdges++;
  if(e.count===2&&e.sum!==0)windingConflicts++;
 }
 const results=views.map(v=>{
  let coveredPixels=0,layeredPixels=0,frontMin=Infinity,
   frontMax=-Infinity,depthLayerSum=0;
  const nearIds=new Set();
  const nearestDepthMM=new Array(pixels);
  const depthLayerMM=new Array(pixels);
  for(let i=0;i<pixels;i++){
   if(v.nearFace[i]===-1){
    nearestDepthMM[i]=null;depthLayerMM[i]=null;continue;
   }
   coveredPixels++;nearIds.add(v.nearFace[i]);
   frontMin=Math.min(frontMin,v.near[i]);
   frontMax=Math.max(frontMax,v.near[i]);
   const thickness=Math.max(0,v.far[i]-v.near[i]);
   if(thickness>1e-7){layeredPixels++;depthLayerSum+=thickness;}
   nearestDepthMM[i]=round(v.near[i]*1000);
   depthLayerMM[i]=round(thickness*1000);
  }
  const declared=scan?.[v.id]??null;
  let visibleDeclared=0;
  if(declared)for(const id of nearIds)if(declared.has(id))visibleDeclared++;
  return {
   direction:v.id,label:v.label,
   actualSourceFacingOriginalTriangles:v.facingOriginalTriangles,
   projectedOriginalTriangleCount:v.projectedOriginalTriangles,
   originalTrianglesVisibleInRaster:nearIds.size,
   sourceNormalFacingSurfaceAreaSquareMeters:round(v.surfaceAreaFacing),
   viewPixels: pixels,originalGeometryCoveredPixels:coveredPixels,
   originalGeometryPixelCoverage:round(coveredPixels/pixels),
   obscuredOrSubpixelSourceTriangles:faceCount-nearIds.size,
   pixelsWithDistinctNearFarDepth:layeredPixels,
   meanNearFarDepthMillimeters:layeredPixels?
    round(depthLayerSum/layeredPixels*1000):null,
   nearestDepthMinimumMillimeters:coveredPixels?round(frontMin*1000):null,
   nearestDepthMaximumMillimeters:coveredPixels?round(frontMax*1000):null,
   nearestSourceTriangleIdPerPixel:Array.from(v.nearFace,x=>x<0?null:x),
   nearestOriginalDepthMillimetersPerPixel:nearestDepthMM,
   farMinusNearDepthMillimetersPerPixel:depthLayerMM,
   sourceDirectionGeometryPresent:v.facingOriginalTriangles>0&&coveredPixels>0,
   userDeclaredObservedTriangleCount:declared?declared.size:null,
   userDeclaredVisibleTriangleOverlap:declared?visibleDeclared:null,
   externallyAuthenticatedScanObservation:false,
   scannerEvidenceStatus:declared?
    'USER_DECLARED_NOT_INDEPENDENTLY_AUTHENTICATED':'UNKNOWN_NO_VIEW_SCAN_PROVENANCE',
   originallyUnseenBackSideIsNotInferred:true
  };
 });
 const allDirectionsSource=results.every(v=>v.sourceDirectionGeometryPresent),
  topologyClosed=openEdges===0&&nonManifoldEdges===0&&
   windingConflicts===0&&degenerate===0;
 if(positions.some((v,i)=>v!==originalXYZ[i])||
  indices.some((v,i)=>v!==originalFaceIds[i]))
  reject('ORIGINAL_SOURCE_MUTATED');
 return {
  schema:AIG_REAL3D_CURVED_SIX_DIRECTION_SCHEMA,sourceSha256,
  originalGlobalVertexCount:vertexCount,originalTriangleCount:faceCount,
  sourceBounds:{min:lo,max:hi},
  gridWidth:gridSize,gridHeight:gridSize,
  actualOriginalTriangleFacesUsed:faceCount,
  sixDirectionalGeometryProjections:results,
  sixDirectionsHaveOriginalSourceSurfaceGeometry:allDirectionsSource,
  missingOriginalGeometricDirections:results.filter(v=>
   !v.sourceDirectionGeometryPresent).map(v=>v.direction),
  originalSourceTopology:{
   originalUndirectedEdgesExamined:edges.size,
   openEdges,nonManifoldEdges,windingConflicts,
   degenerateOriginalTriangles:degenerate,
   closedOrientedEdgeIncidence:topologyClosed
  },
  totalOriginalSurfaceAreaSquareMeters:round(totalArea),
  enclosedSignedVolumeFromOriginalTrianglesCubicMeters:round(volume),
  realClosedCurvedSourceSurfaceGatePASS:topologyClosed&&
   allDirectionsSource&&volume>0,
  hasAuthenticatedSixScanDirectionObservations:false,
  inferredUnobservedSurfaceCount:0,
  attemptedMissingSurfaceFabrication:false,
  originalOBJVertexAndIndicesUnmodified:true,
  sixViewsAreProjectionsNotSixSeparateSpatialDimensions:true,
  naturalHumanAnatomyVerified:false,
  photoToExact3DVerified:false,
  globalReleasePASS:false
 };
}
