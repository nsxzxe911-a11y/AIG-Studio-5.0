/**
 * Real3D V84 — full SIX ORIGINAL sides of an axis-aligned solid.
 * Normals, edge closure, face coverage and signed enclosed volume are
 * evaluated ONLY from indexed native OBJ XYZ. No procedural repair,
 * extruded missing sidewalls, SDF, smoothing, or synthetic anatomy.
 *
 * A cube has six planar boundary surfaces, each triangulated in the OBJ.
 * A side view's shading is not evidence of actual side geometry.
 * This strict BOX gate is NOT appropriate for human/animal curved surfaces.
 */
export const AIG_REAL3D_SIX_SIDES_SCHEMA='AIG_REAL3D_V84_SIX_SOURCE_SIDES_CLOSED_SOLID_V1';
const reject=x=>{throw Error('REAL3D_SIX_SIDES_'+x);};
const directions=[
 {id:'RIGHT_POS_X',label:'右面',axis:0,sign:1,other:[1,2]},
 {id:'LEFT_NEG_X',label:'左面',axis:0,sign:-1,other:[1,2]},
 {id:'TOP_POS_Y',label:'上面',axis:1,sign:1,other:[0,2]},
 {id:'BOTTOM_NEG_Y',label:'下面',axis:1,sign:-1,other:[0,2]},
 {id:'FRONT_POS_Z',label:'前面',axis:2,sign:1,other:[0,1]},
 {id:'BACK_NEG_Z',label:'後面',axis:2,sign:-1,other:[0,1]}
];
const round=n=>Math.round(n*1e6)/1e6;
const vertex=(xyz,i)=>[xyz[3*i],xyz[3*i+1],xyz[3*i+2]];
const subtract=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[
 a[1]*b[2]-a[2]*b[1],
 a[2]*b[0]-a[0]*b[2],
 a[0]*b[1]-a[1]*b[0]
];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const length=v=>Math.hypot(...v);
const makeSide=d=>({...d,originalTriangleCount:0,
 measuredWorldSquareMeters:0,expectedWorldSquareMeters:0,
 planeOutliers:0,normalOutliers:0,
 originalTriangleIds:[]});
export function auditAIGReal3DSixSourceSolid({
 positions,indices,sourceSha256,
 planarRelativeTolerance=1e-5,
 faceAreaRelativeTolerance=.003,
 maxOriginalTriangles=200000
}={}){
 if(!(positions instanceof Float32Array)||positions.length<12||
  positions.length%3||
  !(indices instanceof Uint32Array)||indices.length<3||
  indices.length%3||
  !/^[0-9a-f]{64}$/i.test(String(sourceSha256))||
  !Number.isFinite(planarRelativeTolerance)||
  planarRelativeTolerance<1e-7||planarRelativeTolerance>1e-3||
  !Number.isFinite(faceAreaRelativeTolerance)||
  faceAreaRelativeTolerance<1e-5||faceAreaRelativeTolerance>.05||
  !Number.isInteger(maxOriginalTriangles)||
  maxOriginalTriangles<1||maxOriginalTriangles>700000)
  reject('ORIGINAL_GLOBAL_INDEXED_SOURCE_REQUIRED');
 const faces=indices.length/3,verts=positions.length/3;
 if(faces>maxOriginalTriangles)reject('TOPOLOGY_MEMORY_BUDGET');
 const boundsMin=[Infinity,Infinity,Infinity],
  boundsMax=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<positions.length;i+=3)for(let axis=0;axis<3;axis++){
  const v=positions[i+axis];
  if(!Number.isFinite(v))reject('NONFINITE_ORIGINAL_XYZ');
  boundsMin[axis]=Math.min(boundsMin[axis],v);
  boundsMax[axis]=Math.max(boundsMax[axis],v);
 }
 const extent=boundsMin.map((v,i)=>boundsMax[i]-v);
 if(extent.some(v=>v<=1e-8))
  reject('NOT_THREE_DIMENSIONAL_BOUNDS');
 const tol=Math.max(...extent)*planarRelativeTolerance;
 const sides=directions.map(makeSide),
  edges=new Map(),connected=Array.from({length:faces},()=>[]);
 let degenerates=0,wrongPlane=0,wrongNormal=0,unclassified=0,
  signedVolume=0,totalSurfaceArea=0;
 for(let f=0;f<faces;f++){
  const tri=[indices[3*f],indices[3*f+1],indices[3*f+2]];
  if(tri.some(v=>v>=verts)||new Set(tri).size!==3)
   reject('INVALID_ORIGINAL_FACE_INDEX');
  const a=vertex(positions,tri[0]),
   b=vertex(positions,tri[1]),c=vertex(positions,tri[2]),
   n=cross(subtract(b,a),subtract(c,a)),len=length(n);
  if(len<1e-13){degenerates++;continue;}
  const area=len/2;totalSurfaceArea+=area;
  signedVolume+=dot(a,cross(b,c))/6;
  const normalized=n.map(x=>x/len);
  let selected=null,best=-Infinity;
  for(const side of sides){
   const projection=normalized[side.axis]*side.sign;
   if(projection>best){best=projection;selected=side;}
  }
  if(best<.995){wrongNormal++;unclassified++;}
  else{
   selected.originalTriangleCount++;
   selected.measuredWorldSquareMeters+=area;
   selected.originalTriangleIds.push(f);
   const plane=selected.sign>0?
    boundsMax[selected.axis]:boundsMin[selected.axis];
   if([a,b,c].some(p=>Math.abs(p[selected.axis]-plane)>tol)){
    selected.planeOutliers++;wrongPlane++;
   }
  }
  for(let k=0;k<3;k++){
   const from=tri[k],to=tri[(k+1)%3],
    low=Math.min(from,to),high=Math.max(from,to),
    key=low+','+high;
   let e=edges.get(key);
   if(!e){e={count:0,directionSum:0,faces:[]};edges.set(key,e);}
   e.count++;e.directionSum+=from===low?1:-1;e.faces.push(f);
  }
 }
 let openEdges=0,nonManifoldEdges=0,windingConflicts=0;
 for(const e of edges.values()){
  if(e.count===1)openEdges++;
  else if(e.count!==2)nonManifoldEdges++;
  if(e.count===2&&e.directionSum!==0)windingConflicts++;
  if(e.count===2){
   connected[e.faces[0]].push(e.faces[1]);
   connected[e.faces[1]].push(e.faces[0]);
  }
 }
 let components=0;
 const visited=new Uint8Array(faces);
 for(let f=0;f<faces;f++){
  if(visited[f])continue;
  components++;
  visited[f]=1;const queue=[f];
  for(let k=0;k<queue.length;k++)for(const next of connected[queue[k]])
   if(!visited[next]){visited[next]=1;queue.push(next);}
 }
 const faceResults=sides.map(s=>{
  const expected=extent[s.other[0]]*extent[s.other[1]];
  s.expectedWorldSquareMeters=round(expected);
  s.measuredWorldSquareMeters=round(s.measuredWorldSquareMeters);
  const relativeError=Math.abs(s.measuredWorldSquareMeters-expected)/expected;
  const covered=s.originalTriangleCount>0&&s.planeOutliers===0&&
   s.normalOutliers===0&&relativeError<=faceAreaRelativeTolerance;
  return {
   id:s.id,label:s.label,originalTriangleCount:s.originalTriangleCount,
   originalSourceTriangleIndices:s.originalTriangleIds,
   planeDeviatingTriangles:s.planeOutliers,
   expectedFaceAreaSquareMeters:round(expected),
   measuredFaceAreaSquareMeters:s.measuredWorldSquareMeters,
   relativeAreaError:round(relativeError),
   verifiedExistingSourceFaceCoverage:covered
  };
 });
 const expectedVolume=extent.reduce((a,b)=>a*b,1),
  positiveOrientation=signedVolume>0,
  volumeError=Math.abs(signedVolume-expectedVolume)/expectedVolume,
  closed=openEdges===0&&nonManifoldEdges===0&&windingConflicts===0&&
   degenerates===0&&components===1;
 const fullSix=faceResults.every(s=>s.verifiedExistingSourceFaceCoverage);
 const pass=closed&&fullSix&&wrongNormal===0&&wrongPlane===0&&
  positiveOrientation&&volumeError<=faceAreaRelativeTolerance;
 return {
  schema:AIG_REAL3D_SIX_SIDES_SCHEMA,sourceSha256,
  originalGlobalIndexedVertexCount:verts,originalTriangleCount:faces,
  strictlyAxisAlignedSixSourceFaces:true,
  coverageOnlyFromProvidedSourceXYZ:true,
  sourceFileWasNotModified:true,
  syntheticMissingSideFacesGenerated:0,
  sixSides:faceResults,
  sixOriginalSidesPresent:fullSix,
  missingOrIncompleteSides:faceResults.filter(x=>
   !x.verifiedExistingSourceFaceCoverage).map(x=>x.id),
  indexedTopology:{
   originalUndirectedEdgesChecked:edges.size,
   originalOpenEdges:openEdges,nonManifoldEdges,
   originalWindingConflicts:windingConflicts,
   triangleConnectedComponents:components,
   degenerateSourceTriangles:degenerates,
   sourceFacesNotMatchingAxisAlignedPlanes:wrongPlane,
   sourceFaceNormalDirectionFailures:wrongNormal
  },
  measuredSignedVolumeCubicMeters:round(signedVolume),
  expectedBoundingBoxVolumeCubicMeters:round(expectedVolume),
  relativeVolumeError:round(volumeError),
  exteriorSurfaceAreaSquareMeters:round(totalSurfaceArea),
  closedSingleManifold:closed,
  outwardFacingSourceNormals:positiveOrientation&&wrongNormal===0&&
   wrongPlane===0&&faceResults.every(x=>x.verifiedExistingSourceFaceCoverage),
  realSixSidedBoxSourceGatePASS:pass,
  missingSideGeometryCannotBeInferredFromTopBottomOnly:true,
  notAGeneralHumanOrAnimalSurfaceGate:true,
  anatomyPhoto1to1Verified:false,
  originalHumanScanVerified:false,
  finalProductReleasePASS:false
 };
}
