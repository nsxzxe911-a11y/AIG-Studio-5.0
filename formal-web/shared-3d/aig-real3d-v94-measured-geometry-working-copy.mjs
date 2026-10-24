/**
 * Real3D V94 source-locked geometry precision corrections.
 *
 * ONLY specifically measured original vertices move. No smoothing, invented
 * backside, 3D hallucination, SDF, subdivision, auto-remesh or template morph.
 * The original untouched mesh is immutable. Requires SHA-bound independent
 * point measurements and strict topology/temporal quality Gates.
 */
import {createAIG3DMesh}
 from './aig-real3d-core.mjs';
import {auditAIGReal3DAnimatedSourceTopology}
 from './aig-real3d-v94-dynamic-topology-gate.mjs';
export const AIG_REAL3D_V94_CORRECTION_SCHEMA=
 'AIG_REAL3D_V94_SPARSE_MEASURED_XYZ_WORKING_COPY_V1';
const invalid=x=>{throw Error('REAL3D_V94_CORRECTION_'+x);};
const SHA=/^[a-f0-9]{64}$/i;
const vec=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
const difference=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const mag=x=>Math.hypot(...x);
function normalsFromOriginalFaces(positions,indices,count){
 const normals=new Array(count*3).fill(0);
 for(let k=0;k<indices.length;k+=3){
  const [a,b,c]=indices.slice(k,k+3),
   v=indices.slice(k,k+3).map(id=>positions.slice(id*3,id*3+3)),
   ab=difference(v[1],v[0]),ac=difference(v[2],v[0]),n=cross(ab,ac);
  if(mag(n)<1e-12)invalid('MEASURED_GEOMETRY_DEGENERATE_FACE_'+(k/3));
  for(const id of [a,b,c])for(let i=0;i<3;i++)
   normals[3*id+i]+=n[i];
 }
 for(let k=0;k<normals.length;k+=3){
  const n=normals.slice(k,k+3),length=mag(n);
  if(length<1e-12)invalid('SOURCE_VERTEX_NORMAL_CANCELLED');
  for(let i=0;i<3;i++)normals[k+i]/=length;
 }
 return normals;
}
export function buildAIGReal3DMeasuredGeometryWorkingCopy({
 sourceScene,sourceSha256,measurements,maxDisplacementMm=2,
 motionLimits={
  maxRelativeEdgeStretch:.15,maxRelativeEdgeCompression:.15,
  minRelativeFaceArea:.5,maxRelativeFaceArea:2,
  maxFrameVertexStepMeters:.01,maxChangedFaceFraction:1,
  faceNormalFlipDotTolerance:-.85
 }
}={}){
 if(sourceScene?.schema!=='AIG_REAL3D_SCENE_V1'||sourceScene.units!=='METERS'||
  !Array.isArray(sourceScene.nodes)||!sourceScene.nodes.length||
  sourceScene.nodes.length>40||!SHA.test(sourceSha256??'')||
  !Array.isArray(measurements)||measurements.length<3||measurements.length>500||
  !Number.isFinite(maxDisplacementMm)||maxDisplacementMm<=0||
  maxDisplacementMm>5)
  invalid('SHA_SCENE_MEASUREMENT_BUDGET_INVALID');
 const nodes=new Map(sourceScene.nodes.map(n=>[n.id,n]));
 if(nodes.size!==sourceScene.nodes.length)invalid('DUPLICATE_SOURCE_NODES');
 for(const n of sourceScene.nodes){
  const t=n.transform;
  if(t&&((t.position||[]).some(x=>x!==0)||
   (t.rotationDeg||[]).some(x=>x!==0)||
   (t.scale||[]).some(x=>x!==1)))
   invalid('MEASUREMENTS_REQUIRE_IDENTITY_SOURCE_SPACE');
  if(!n.mesh?.actualXYZTriangles)invalid('REAL_INDEXED_SOURCE_GEOMETRY_REQUIRED');
 }
 const perNode=new Map(),seen=new Set(),normalized=[];
 for(let i=0;i<measurements.length;i++){
  const m=measurements[i],node=nodes.get(m?.nodeId);
  if(!node||!Number.isInteger(m.originalVertexIndex)||
   m.originalVertexIndex<0||m.originalVertexIndex>=node.mesh.vertexCount||
   !vec(m.measuredLocalXYZMeters)||!SHA.test(m.evidenceSha256??''))
   invalid('MEASURED_SOURCE_VERTEX_OR_PROVENANCE_'+i);
  const key=m.nodeId+':'+m.originalVertexIndex;
  if(seen.has(key))invalid('DUPLICATE_ORIGINAL_VERTEX_MEASUREMENT');
  seen.add(key);
  const before=node.mesh.positions.slice(m.originalVertexIndex*3,
   m.originalVertexIndex*3+3),
   displacementMm=mag(difference(before,m.measuredLocalXYZMeters))*1000;
  if(displacementMm>maxDisplacementMm+1e-7)
   invalid('MEASURED_DISPLACEMENT_EXCEEDS_VERIFIED_LIMIT');
  const values=perNode.get(m.nodeId)||[];
  values.push(m);perNode.set(m.nodeId,values);
  normalized.push({nodeId:m.nodeId,originalVertexIndex:m.originalVertexIndex,
   sourceReferenceSHA:m.evidenceSha256,
   observedVertexDisplacementMm:Math.round(displacementMm*10000)/10000});
 }
 const outputs=[],reports=[];
 const clonedNodes=sourceScene.nodes.map(node=>{
  const original=node.mesh,
   observations=perNode.get(node.id)||[];
  if(!observations.length)return {...node,mesh:original};
  const position=[...original.positions];
  for(const m of observations)
   position.splice(m.originalVertexIndex*3,3,...m.measuredLocalXYZMeters);
  // Derived normals from the unchanged TRUE SOURCE face connectivity:
  // this is shading recalculation, NEVER a source geometry addition.
  const normals=normalsFromOriginalFaces(position,original.indices,original.vertexCount);
  const mesh=createAIG3DMesh({positions:position,normals,
   indices:original.indices,
   provenance:'V94_SPARSE_EXTERNAL_MEASURED_WORKING_COPY_'+sourceSha256});
  const quality=auditAIGReal3DAnimatedSourceTopology({
   originalMesh:original,sourceSha256,
   frames:[{timeSec:0,positions:[...original.positions]},
    {timeSec:.1,positions:[...position]}],
   limits:motionLimits
  });
  if(!quality.sourceMotionGeometryGatePASS)
   invalid('MEASURED_WORKING_COPY_SOURCE_TRIANGLE_STRAIN_BLOCK_'+node.id);
  reports.push({nodeId:node.id,originalTriangles:original.triangleCount,
   workingTriangles:mesh.triangleCount,modifiedSourceVertices:observations.length,
   originalNormalsRecomputedOnWorkingCopy:true,
   sourceTriangleQuality:quality});
  outputs.push(node.id);
  return {...node,mesh,source:'V94_SPARSE_EVIDENCE_LOCKED_WORKING_COPY'};
 });
 const workingScene={...sourceScene,nodes:clonedNodes,
  source:'V94_SHA_VERIFIED_SPARSE_MEASURED_WORKING_COPY',
  revision:sourceScene.revision+1};
 return {schema:AIG_REAL3D_V94_CORRECTION_SCHEMA,
  sourceSha256,sourceScene,workingScene,
  correctedSourceNodes:outputs,sourceVertexMeasurements:normalized,
  componentReports:reports,actualSourceVerticesMoved:measurements.length,
  originalSourceTriangleCount:sourceScene.nodes.reduce((a,n)=>a+n.mesh.triangleCount,0),
  displayTriangleCount:workingScene.nodes.reduce((a,n)=>a+n.mesh.triangleCount,0),
  originalSourceMeshesNeverMutated:true,sourceFaceIndicesUnchanged:true,
  unmeasuredSourceVerticesUntouched:true,
  hiddenOrUnobservedGeometryNeverGenerated:true,
  externalMeasurementAuthenticityIndependentCheckPASS:false,
  visualNaturalAnatomyCertified:false,releasePASS:false};
}
