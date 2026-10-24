import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildAIGReal3DDenseOBJSource,AIG_REAL3D_DENSE_SOURCE_SCHEMA}
 from '../aig-real3d-dense-source-obj.mjs';
import {parseAIGScanNativeOBJ}
 from '../aig-real3d-scan-native-mesh.mjs';
function denseFixture({rings=319,segments=360,broken=false}={}){
 const s=[];
 for(let j=0;j<rings;j++){
  const y=j/(rings-1),r=.14+.055*Math.sin(y*Math.PI);
  for(let k=0;k<segments;k++){
   const t=k*2*Math.PI/segments;
   s.push('v '+(r*Math.cos(t)).toFixed(6)+' '+y.toFixed(6)+' '+
    (.7*r*Math.sin(t)).toFixed(6));
  }
 }
 for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
  const a=j*segments+k+1,b=j*segments+(k+1)%segments+1;
  const c=(j+1)*segments+k+1,d=(j+1)*segments+(k+1)%segments+1;
  s.push('f '+a+' '+b+' '+d,'f '+a+' '+d+' '+c);
 }
 if(broken)s.push('f 0 1 2');
 return s.join('\n');
}
const build=objText=>buildAIGReal3DDenseOBJSource({
 objText,heightMm:1680,sourceSha256:createHash('sha256').update(objText).digest('hex'),
 sourceName:'NONHUMAN_SOURCE_HIGH_DENSITY.obj'
});
test('Full original 114840+ vertices and 228960 triangles are not decimated at GPU mesh partition boundary',()=>{
 const source=denseFixture();
 const wantedVertices=319*360,wantedTriangles=(319-1)*360*2;
 assert.throws(()=>parseAIGScanNativeOBJ(source),/AIG_SCAN_NATIVE_VERTEX_BUDGET/);
 const out=build(source);
 assert.equal(out.evidence.schema,AIG_REAL3D_DENSE_SOURCE_SCHEMA);
 assert.equal(out.evidence.originalVertexCount,wantedVertices);
 assert.equal(out.evidence.originalTriangleCount,wantedTriangles);
 assert.equal(out.evidence.renderedTriangleCount,wantedTriangles);
 assert.equal(out.evidence.noSourceTopologyDecimation,true);
 assert.equal(out.evidence.noSyntheticSubdivision,true);
 assert.equal(out.evidence.originalHumanGeometryReviewed,false);
 assert.equal(out.evidence.sourceIndependentHumanScanAuthenticityVerified,false);
 assert.equal(out.evidence.releasePASS,false);
 assert.ok(out.evidence.gpuChunkCount>=3);
 assert.equal(out.scene.nodes.length,out.evidence.gpuChunkCount);
 let renderFaces=0;
 for(const node of out.scene.nodes){
  assert.ok(node.mesh.vertexCount<=52000);
  assert.equal(node.mesh.actualXYZTriangles,true);
  renderFaces+=node.mesh.triangleCount;
 }
 assert.equal(renderFaces,wantedTriangles);
});
test('Input is never silently auto-downsampled or corrected to appear more human',()=>{
 const source=denseFixture({rings:60,segments:64});
 const result=build(source);
 assert.equal(result.evidence.chunkingCreatesOnlyDuplicateVertexReferencesNotNewShape,true);
 assert.equal(result.evidence.bboxMillimeters.heightMm,1680);
 assert.ok(result.evidence.bboxMillimeters.widthMm>200);
 assert.equal(result.evidence.releasePASS,false);
});
test('Malformed OBJ face indices and unverified source sha are blocked',()=>{
 const malformed=denseFixture({rings:20,segments:24,broken:true});
 assert.throws(()=>build(malformed),/AIG_REAL3D_DENSE_BAD_FACE_VERTEX_INDEX/);
 const text=denseFixture({rings:20,segments:24});
 assert.throws(()=>buildAIGReal3DDenseOBJSource({
  objText:text,sourceSha256:'NO_HASH',heightMm:1680
 }),/AIG_REAL3D_DENSE_SOURCE_FILE_NAME_OR_SHA_REQUIRED/);
 assert.throws(()=>buildAIGReal3DDenseOBJSource({
  objText:text,sourceSha256:'a'.repeat(64),heightMm:500
 }),/AIG_REAL3D_DENSE_CALIBRATED_HEIGHT_AND_UP_AXIS_REQUIRED/);
});
