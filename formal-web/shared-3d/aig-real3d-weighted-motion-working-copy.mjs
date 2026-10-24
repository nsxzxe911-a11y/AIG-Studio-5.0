/**
 * Real3D V1 explicit-weight, source-native finger motion WORKING COPY.
 * Uses only preserved original GLOBAL source indices, never gpu chunk seams.
 * A user-provided sparse weight manifest is REQUIRED; it is NOT autorigging.
 * Original OBJ/scene/normal data remain unchanged. Report strain and inversions;
 * neither a rendered bent mesh nor a stable frame certifies realistic skin.
 */
import {createAIG3DMesh,createAIG3DScene,addAIG3DNode} from './aig-real3d-core.mjs';
import {AIG_REAL3D_DENSE_SOURCE_SCHEMA} from './aig-real3d-dense-source-obj.mjs';
import {AIG_REAL3D_FINGER_JUNCTION_SCHEMA} from './aig-real3d-native-finger-junction-gate.mjs';
export const AIG_REAL3D_WEIGHTED_MOTION_SCHEMA=
 'AIG_REAL3D_EXPLICIT_WEIGHT_SOURCE_FINGER_WORKING_COPY_V1';
const SHA=/^[0-9a-f]{64}$/i, NAMES=['Thumb','Index','Middle','Ring','Pinky'];
const fail=x=>{throw Error('REAL3D_WEIGHTED_'+x);};
const vec=(v)=>Array.isArray(v)&&v.length===3&&v.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<1e6);
const magnitude=(x,y,z)=>Math.hypot(x,y,z);
const pos=(v,i)=>[v[i*3],v[i*3+1],v[i*3+2]];
const distance=(v,a,b)=>magnitude(v[a*3]-v[b*3],v[a*3+1]-v[b*3+1],v[a*3+2]-v[b*3+2]);
const cross=(x,y,z,a,b,c)=>[y*c-z*b,z*a-x*c,x*b-y*a];
const round=n=>Math.round(n*1000)/1000;
const p95=arr=>{if(!arr.length)return 0;arr.sort();return round(arr[Math.ceil(arr.length*.95)-1]);};
function originalWorld(raw,geo,axis){
 const p=axis==='Z'?[raw[0],raw[2],-raw[1]]:raw;
 const lo=geo.rotatedSourceBoundsMin,hi=geo.rotatedSourceBoundsMax,s=geo.metersPerRawUnit;
 return [(p[0]-(lo[0]+hi[0])/2)*s,(p[1]-lo[1])*s,
  (p[2]-(lo[2]+hi[2])/2)*s];
}
function prepare({dense,fingerJunction,weightManifest,angleDeg}){
 const e=dense?.evidence,g=dense?.sourceGeometry,m=weightManifest;
 if(e?.schema!==AIG_REAL3D_DENSE_SOURCE_SCHEMA||
  fingerJunction?.schema!==AIG_REAL3D_FINGER_JUNCTION_SCHEMA||
  !SHA.test(e.sourceSha256??'')||fingerJunction.sourceSha256!==e.sourceSha256||
  !g?.originalGlobalIndexSpace||g.noChunkBoundarySeamInference!==true||
  !(g.positions instanceof Float32Array)||!(g.indices instanceof Uint32Array)||
  g.positions.length!==e.originalVertexCount*3||
  g.indices.length!==e.originalTriangleCount*3||
  e.renderedTriangleCount!==e.originalTriangleCount)
  fail('ORIGINAL_SOURCE_AND_JUNCTION_SHA_REQUIRED');
 if(!m||m.schema!=='AIG_REAL3D_EXPLICIT_VERTEX_WEIGHTS_V1'||
  m.sourceSha256!==e.sourceSha256||m.sourceVertexCount!==e.originalVertexCount||
  !['left','right'].includes(m.side)||!NAMES.includes(m.finger)||
  m.joint!=='Middle'||!vec(m.axisWorld)||!vec(m.pivotSourceXYZ)||
  !Array.isArray(m.vertexWeights)||m.vertexWeights.length<3||
  m.vertexWeights.length>e.originalVertexCount||
  !Number.isFinite(angleDeg)||Math.abs(angleDeg)>45)
  fail('WEIGHT_MANIFEST_INVALID_OR_UNBOUND');
 const report=fingerJunction.fingers?.find(x=>x.side===m.side&&x.finger===m.finger);
 const middle=report?.markerSnapEvidence?.find(x=>x.name===m.side+m.finger+'Middle');
 if(!middle||!Number.isInteger(middle.originalVertexIndex)||middle.originalVertexIndex<0||
  middle.originalVertexIndex>=e.originalVertexCount)
  fail('NATIVE_JOINT_MIDDLE_SOURCE_MARKER_REQUIRED');
 const pivot=originalWorld(m.pivotSourceXYZ,g,e.upAxis);
 const nearest=pos(g.positions,middle.originalVertexIndex);
 if(magnitude(pivot[0]-nearest[0],pivot[1]-nearest[1],pivot[2]-nearest[2])>0.006)
  fail('PIVOT_NOT_ON_SOURCE_JOINT');
 const axisLen=magnitude(...m.axisWorld);
 if(axisLen<.5||axisLen>2)fail('ROTATION_AXIS_INVALID');
 const axis=m.axisWorld.map(x=>x/axisLen);
 const weights=new Float32Array(e.originalVertexCount),seen=new Set();
 for(const value of m.vertexWeights){
  if(!Array.isArray(value)||value.length!==2||
   !Number.isInteger(value[0])||value[0]<0||value[0]>=e.originalVertexCount||
   !Number.isFinite(value[1])||value[1]<=0||value[1]>1||seen.has(value[0]))
   fail('INVALID_DUPLICATED_SOURCE_VERTEX_WEIGHT');
  weights[value[0]]=value[1];seen.add(value[0]);
 }
 if(seen.size===e.originalVertexCount)fail('NO_STATIC_SOURCE_ANCHOR');
 return {e,g,m,axis,pivot,weights,report,weightedVertices:seen.size};
}
function metrics(original,posed,indices){
 let maxStretch=0,maxCompression=0,changedTriangles=0,flippedTriangles=0,
  degenerate=0,rawSample=[];
 for(let k=0;k<indices.length;k+=3){
  const a=indices[k],b=indices[k+1],c=indices[k+2],ids=[a,b,c];
  let changed=false;
  for(const i of ids)if(original[3*i]!==posed[3*i]||
   original[3*i+1]!==posed[3*i+1]||original[3*i+2]!==posed[3*i+2])
   changed=true;
  if(changed)changedTriangles++;
  const pa=pos(original,a),pb=pos(original,b),pc=pos(original,c),
   qa=pos(posed,a),qb=pos(posed,b),qc=pos(posed,c);
  const u=pb.map((x,i)=>x-pa[i]),v=pc.map((x,i)=>x-pa[i]),
   w=qb.map((x,i)=>x-qa[i]),t=qc.map((x,i)=>x-qa[i]);
  const n=cross(...u,...v),d=cross(...w,...t),
   nr=magnitude(...n),dr=magnitude(...d);
  if(dr<1e-11||dr/nr<.01)degenerate++;
  if(n[0]*d[0]+n[1]*d[1]+n[2]*d[2]<-1e-12)flippedTriangles++;
  for(const [x,y] of [[a,b],[b,c],[c,a]]){
   const old=distance(original,x,y),now=distance(posed,x,y);
   if(old<1e-9)continue;
   const change=(now/old-1)*100;
   if(change>maxStretch)maxStretch=change;
   if(change<0&&-change>maxCompression)maxCompression=-change;
   rawSample.push(Math.abs(change));
  }
 }
 return {
  changedOriginalTriangles:changedTriangles,
  originalTriangleCount:indices.length/3,
  sourceTrianglesRemoved:0,sourceTrianglesAdded:0,
  invertedFaceNormalTriangles:flippedTriangles,
  nearlyCollapsedTriangleCount:degenerate,
  maxOriginalEdgeStretchPercent:round(maxStretch),
  maxOriginalEdgeCompressionPercent:round(maxCompression),
  absoluteEdgeStrainP95Percent:p95(rawSample)
 };
}
/** Pose is a real generated 3D working-copy vertex array, not fake image animation. */
export function createAIGReal3DWeightedFingerPose({
 dense,fingerJunction,weightManifest,angleDeg=20
}={}){
 const {e,g,m,pivot,axis,weights,weightedVertices,report}=prepare({
  dense,fingerJunction,weightManifest,angleDeg
 });
 const xyz=g.positions,posed=new Float32Array(xyz);
 let moved=0,maxMove=0;
 for(let i=0;i<weights.length;i++){
  const weight=weights[i];if(!weight||angleDeg===0)continue;
  const theta=angleDeg*Math.PI/180*weight,cos=Math.cos(theta),sin=Math.sin(theta),
   j=i*3,x=xyz[j]-pivot[0],y=xyz[j+1]-pivot[1],z=xyz[j+2]-pivot[2],
   proj=axis[0]*x+axis[1]*y+axis[2]*z,
   cr=cross(...axis,x,y,z);
  const nx=cos*x+sin*cr[0]+(1-cos)*proj*axis[0]+pivot[0],
   ny=cos*y+sin*cr[1]+(1-cos)*proj*axis[1]+pivot[1],
   nz=cos*z+sin*cr[2]+(1-cos)*proj*axis[2]+pivot[2];
  posed[j]=nx;posed[j+1]=ny;posed[j+2]=nz;
  const delta=magnitude(nx-xyz[j],ny-xyz[j+1],nz-xyz[j+2]);
  if(delta>1e-8)moved++;maxMove=Math.max(maxMove,delta*1000);
 }
 const stat=metrics(xyz,posed,g.indices);
 const safe=stat.invertedFaceNormalTriangles===0&&stat.nearlyCollapsedTriangleCount===0&&
  stat.maxOriginalEdgeStretchPercent<=20&&stat.maxOriginalEdgeCompressionPercent<=20;
 const evidence={
  schema:AIG_REAL3D_WEIGHTED_MOTION_SCHEMA,sourceSha256:e.sourceSha256,
  inputWeightsSchema:m.schema,explicitWeightInputsOnly:true,
  sourceVertexCount:e.originalVertexCount,sourceTriangleCount:e.originalTriangleCount,
  side:m.side,finger:m.finger,joint:m.joint,angleDeg,
  weightedOriginalVertices:weightedVertices,
  movedOriginalVertices:moved,maxWorkingCopyDisplacementMm:round(maxMove),
  ...stat,
  deformationGeometricRiskIndicatorsClear:safe,
  originalSourcePositionsNeverModified:true,
  sourceChunkBoundariesIgnoredDuringDeformation:true,
  staticMeshCannotProveAnatomicalRig:true,
  priorFiveDigitGeometryVerifiedForThisFinger:report.warningCodes.length===0,
  manuallySuppliedWeightsNotIndependentAnatomicalProof:true,
  skinMotionNaturalnessPASS:false,animationRigPASS:false,
  releasePASS:false
 };
 return {workingCopyPositions:posed,sourceGlobalIndices:g.indices,evidence,releasePASS:false};
}
/** Build truly posed GPU scene preserving every index/face in original partitions. */
export function buildAIGReal3DWeightedFingerGPUPreview({dense,pose}={}){
 const e=dense?.evidence,g=dense?.sourceGeometry,xyz=pose?.workingCopyPositions;
 if(e?.sourceSha256!==pose?.evidence?.sourceSha256||
  !(xyz instanceof Float32Array)||xyz.length!==g?.positions?.length||
  pose.evidence.sourceTriangleCount!==e.originalTriangleCount||
  !Array.isArray(dense.scene?.nodes)||dense.scene.nodes.length===0)
  fail('GPU_WORKING_COPY_SOURCE_MISMATCH');
 const normals=new Float64Array(xyz.length),indices=g.indices;
 for(let k=0;k<indices.length;k+=3){
  const a=indices[k]*3,b=indices[k+1]*3,c=indices[k+2]*3;
  const u=[xyz[b]-xyz[a],xyz[b+1]-xyz[a+1],xyz[b+2]-xyz[a+2]],
   v=[xyz[c]-xyz[a],xyz[c+1]-xyz[a+1],xyz[c+2]-xyz[a+2]];
  const n=cross(...u,...v);
  for(const i of [a,b,c])for(let t=0;t<3;t++)normals[i+t]+=n[t];
 }
 for(let k=0;k<normals.length;k+=3){
  const l=magnitude(normals[k],normals[k+1],normals[k+2])||1;
  for(let j=0;j<3;j++)normals[k+j]/=l;
 }
 const scene=createAIG3DScene({
  id:'real3dWeightedFingerWorkingCopy',consumer:'FastModel',units:'METERS',
  source:'EXPLICIT_WEIGHTED_POSE_NOT_AUTHENTICATED_HUMAN'
 });
 let triangles=0;
 for(const old of dense.scene.nodes){
  const global=old.sourceGlobalVertexIds;
  if(!(global instanceof Uint32Array)||global.length!==old.mesh.vertexCount)
   fail('ORIGINAL_GPU_CHUNK_VERTEX_MAPPING_REQUIRED');
  const positions=[],localNormals=[];
  for(const originalIndex of global){
   const at=originalIndex*3;
   if(at>=xyz.length)fail('CORRUPT_GLOBAL_CHUNK_MAPPING');
   positions.push(xyz[at],xyz[at+1],xyz[at+2]);
   localNormals.push(normals[at],normals[at+1],normals[at+2]);
  }
  const mesh=createAIG3DMesh({
   positions,normals:localNormals,indices:old.mesh.indices,
   provenance:'POSED_WORKING_COPY_OF_'+e.sourceSha256
  });
  addAIG3DNode(scene,{
   id:'posed_'+old.id,mesh,kind:'character',
   source:'WORKING_COPY_NO_NATURAL_ANATOMY_CERTIFICATION',
   material:{baseColor:[.79,.66,.57,1],roughness:.87,metallic:0,doubleSided:true}
  });
  triangles+=mesh.triangleCount;
 }
 if(triangles!==e.originalTriangleCount)fail('GPU_POSE_TRIANGLE_LOSS');
 return {scene,evidence:{
  sourceSha256:e.sourceSha256,originalTriangleCount:e.originalTriangleCount,
  posedGPUOriginalTriangles:triangles,originalIndicesPreserved:true,
  sourceRawOBJUnmodified:true,animationNaturalnessPASS:false,releasePASS:false
 }};
}
