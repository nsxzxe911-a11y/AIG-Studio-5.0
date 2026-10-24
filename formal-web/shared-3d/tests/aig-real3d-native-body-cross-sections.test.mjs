import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGReal3DScanNative} from '../aig-real3d-scan-native-mesh.mjs';
import {auditAIGReal3DBodySectionGeometry,auditAIGReal3DSceneCrossSections}
 from '../aig-real3d-native-body-cross-sections.mjs';
const sha='a'.repeat(64);
function surfaceTube({cx=0,cy=0,cz=0,radiusX=.25,radiusZ=.15,
 y0=0,y1=1,segments=44,rings=42,ellipse=true}={}){
 const vs=[],faces=[];
 for(let j=0;j<rings;j++){
  const u=j/(rings-1),rad=ellipse?Math.max(.008,Math.sin(Math.PI*u)):1;
  for(let k=0;k<segments;k++){
   const a=2*Math.PI*k/segments;
   vs.push([cx+radiusX*rad*Math.cos(a),
    y0+(y1-y0)*u,cz+radiusZ*rad*Math.sin(a)]);
  }
 }
 for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
  const a=j*segments+k,b=j*segments+(k+1)%segments,
   c=(j+1)*segments+k,d=(j+1)*segments+(k+1)%segments;
  faces.push([a,b,d],[a,d,c]);
 }
 return {vs,faces};
}
function makeOBJ(tubes){
 const vertices=[],faces=[];
 for(const tube of tubes){
  const t=surfaceTube(tube),offset=vertices.length;
  vertices.push(...t.vs);
  for(const face of t.faces)faces.push(face.map(x=>x+offset));
 }
 return [
  ...vertices.map(v=>'v '+v.map(x=>x.toFixed(8)).join(' ')),
  ...faces.map(v=>'f '+v.map(x=>x+1).join(' '))
 ].join('\n');
}
function audit(text,upAxis='Y'){
 return auditAIGReal3DBodySectionGeometry({
  objText:text,heightMm:1680,upAxis,sourceSha256:sha,
  sourceName:'NONHUMAN_QA_SHAPE.obj'
 });
}
test('Actual original fat ellipsoid has only ONE lower leg-level closed 3D intersection ring',()=>{
 const shape=makeOBJ([{ellipse:true}]);
 const r=audit(shape);
 assert.equal(r.sections.length,4);
 assert.equal(r.sections[0].id,'LOWER_LEGS');
 assert.equal(r.sections[0].significantClosedLoops,1);
 assert.equal(r.sections[0].significantSections,1);
 assert.equal(r.oneClosedLowerMassFlag,true);
 assert.equal(r.distinctSideBySideLowerLegSectionsObserved,false);
 assert.ok(r.warnings.includes('ONE_LARGE_CLOSED_LOWER_BODY_SECTION_NOT_TWO_SEPARATE_LEGS'));
 assert.ok(r.sections.every(x=>x.actualNativeIntersectingSegments>20));
 assert.equal(r.silhouetteAndProportionNaturalnessApproved,false);
 assert.equal(r.manufacturedSeparateLegs,false);
 assert.equal(r.releasePASS,false);
});
test('Two actual independent leg-like TUBES have two distinct cross-section rings, unlike ellipsoid',()=>{
 const src=makeOBJ([
  {cx:-.14,radiusX:.065,radiusZ:.07,y0:0,y1:.50,ellipse:false},
  {cx:.14,radiusX:.065,radiusZ:.07,y0:0,y1:.50,ellipse:false},
  {cx:0,radiusX:.18,radiusZ:.11,y0:.50,y1:1,ellipse:false}
 ]);
 const result=audit(src);
 assert.equal(result.sections[0].significantClosedLoops,2);
 assert.equal(result.sections[0].significantSections,2);
 assert.equal(result.distinctSideBySideLowerLegSectionsObserved,true);
 assert.equal(result.oneClosedLowerMassFlag,false);
 assert.equal(result.sections[2].significantClosedLoops,1);
 assert.equal(result.sections[3].significantClosedLoops,1);
 assert.equal(result.releasePASS,false,'Source has 3 DISCONNECTED tubes, never actual human PASS');
});
test('Exact same original OBJ mesh positions via shared WebGL scene show equivalent 3D lower ring count',()=>{
 const src=makeOBJ([{ellipse:true}]);
 const imported=buildAIGReal3DScanNative({
  objText:src,heightMm:1680,upAxis:'Y',
  sourceName:'NONHUMAN_QA_SHAPE.obj',sourceSha256:sha
 });
 const glbStyle=auditAIGReal3DSceneCrossSections({
  scene:imported.scene,sourceSha256:sha,
  sourceName:'NONHUMAN_QA_SHAPE.obj',sourceFormat:'OBJ'
 });
 assert.equal(glbStyle.sections[0].significantClosedLoops,1);
 assert.equal(glbStyle.oneClosedLowerMassFlag,true);
 assert.equal(glbStyle.genuineOriginalTriangleIntersections,true);
 assert.equal(glbStyle.sourceVertexCount,imported.evidence.actualVertices);
 assert.equal(glbStyle.silhouetteAndProportionNaturalnessApproved,false);
});
test('Y-up to Z-up geometric mapping preserves cross-sectional rings',()=>{
 const src=makeOBJ([{ellipse:true}]);
 const z=src.split('\n').map(x=>{
  if(!x.startsWith('v '))return x;
  const [tag,X,Y,Z]=x.split(' ');
  return [tag,X,(-Number(Z)).toFixed(8),Y].join(' ');
 }).join('\n');
 const a=audit(src),b=audit(z,'Z');
 assert.deepEqual(a.sections.map(x=>x.significantClosedLoops),
  b.sections.map(x=>x.significantClosedLoops));
});
test('Source hash, measured height and up-axis always required',()=>{
 const objText=makeOBJ([{ellipse:true}]);
 assert.throws(()=>auditAIGReal3DBodySectionGeometry({
  objText,sourceSha256:'fake',heightMm:1680
 }),/BODY_SECTION_SOURCE_SHA_REQUIRED/);
 assert.throws(()=>auditAIGReal3DBodySectionGeometry({
  objText,sourceSha256:sha,heightMm:100
 }),/BODY_SECTION_SCALE_AXIS_INVALID/);
 assert.throws(()=>auditAIGReal3DBodySectionGeometry({
  objText,sourceSha256:sha,heightMm:1680,upAxis:'X'
 }),/BODY_SECTION_SCALE_AXIS_INVALID/);
});
