import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAIGReal3DSixSourceSolid,AIG_REAL3D_SIX_SIDES_SCHEMA}
 from '../aig-real3d-six-sided-source-solid.mjs';
const sha='b'.repeat(64);
/** Pure NONHUMAN cuboid fixture; NOT an algorithm for creating human sides. */
function cube({missing=[],reverse=[],segments=1}={}){
 const vertices=[],faces=[],keys=new Map();
 const vertex=p=>{
  const key=p.map(v=>v.toFixed(8)).join(',');
  if(keys.has(key))return keys.get(key);
  const id=vertices.length/3;vertices.push(...p);keys.set(key,id);return id;
 };
 const surfaces=[
  {id:'RIGHT_POS_X',constant:[0,.5],u:[1,1.25],v:[2,.35]},
  {id:'LEFT_NEG_X',constant:[0,-.5],u:[2,.35],v:[1,1.25]},
  {id:'TOP_POS_Y',constant:[1,1.25],u:[2,.35],v:[0,.5]},
  {id:'BOTTOM_NEG_Y',constant:[1,-1.25],u:[0,.5],v:[2,.35]},
  {id:'FRONT_POS_Z',constant:[2,.35],u:[0,.5],v:[1,1.25]},
  {id:'BACK_NEG_Z',constant:[2,-.35],u:[1,1.25],v:[0,.5]}
 ];
 for(const s of surfaces){
  if(missing.includes(s.id))continue;
  const point=(i,j)=>{
   const p=[0,0,0];p[s.constant[0]]=s.constant[1];
   p[s.u[0]]=s.u[1]*(-1+2*i/segments);
   p[s.v[0]]=s.v[1]*(-1+2*j/segments);
   return vertex(p);
  };
  for(let u=0;u<segments;u++)for(let v=0;v<segments;v++){
   const a=point(u,v),b=point(u+1,v),
    c=point(u,v+1),d=point(u+1,v+1);
   const first=[a,b,d],second=[a,d,c];
   faces.push(...(reverse.includes(s.id)?first.reverse():first),
    ...(reverse.includes(s.id)?second.reverse():second));
  }
 }
 return {positions:new Float32Array(vertices),indices:new Uint32Array(faces)};
}
test('True original six-face cuboid source has all ±X/±Y/±Z, closed seams, outward normals and cubic volume',()=>{
 const {positions,indices}=cube(),before=[...positions],beforeIndex=[...indices];
 const r=auditAIGReal3DSixSourceSolid({positions,indices,sourceSha256:sha});
 assert.equal(r.schema,AIG_REAL3D_SIX_SIDES_SCHEMA);
 assert.equal(r.originalGlobalIndexedVertexCount,8);
 assert.equal(r.originalTriangleCount,12);
 assert.equal(r.sixSides.length,6);
 assert.ok(r.sixSides.every(x=>
  x.originalTriangleCount===2&&x.verifiedExistingSourceFaceCoverage));
 assert.deepEqual(r.missingOrIncompleteSides,[]);
 assert.equal(r.indexedTopology.originalUndirectedEdgesChecked,18);
 assert.equal(r.indexedTopology.originalOpenEdges,0);
 assert.equal(r.indexedTopology.nonManifoldEdges,0);
 assert.equal(r.indexedTopology.originalWindingConflicts,0);
 assert.equal(r.indexedTopology.triangleConnectedComponents,1);
 assert.equal(r.closedSingleManifold,true);
 assert.ok(Math.abs(r.measuredSignedVolumeCubicMeters-1.75)<.00001);
 assert.equal(r.realSixSidedBoxSourceGatePASS,true);
 assert.deepEqual([...positions],before);
 assert.deepEqual([...indices],beforeIndex);
 assert.equal(r.syntheticMissingSideFacesGenerated,0);
 assert.equal(r.anatomyPhoto1to1Verified,false);
});
test('Just top and bottom source DOES NOT prove side wall geometry; missing side direction and open boundaries BLOCK',()=>{
 const {positions,indices}=cube({missing:[
  'RIGHT_POS_X','LEFT_NEG_X','FRONT_POS_Z','BACK_NEG_Z'
 ]});
 const r=auditAIGReal3DSixSourceSolid({positions,indices,sourceSha256:sha});
 assert.equal(r.realSixSidedBoxSourceGatePASS,false);
 assert.equal(r.missingOrIncompleteSides.length,4);
 assert.ok(r.missingOrIncompleteSides.includes('FRONT_POS_Z'));
 assert.ok(r.missingOrIncompleteSides.includes('LEFT_NEG_X'));
 assert.ok(r.indexedTopology.originalOpenEdges>0);
 assert.equal(r.syntheticMissingSideFacesGenerated,0);
});
test('Removing one of the four vertical faces leaves an open hole, cannot be rendered/declared watertight',()=>{
 const {positions,indices}=cube({missing:['BACK_NEG_Z']});
 const r=auditAIGReal3DSixSourceSolid({positions,indices,sourceSha256:sha});
 assert.equal(r.realSixSidedBoxSourceGatePASS,false);
 assert.deepEqual(r.missingOrIncompleteSides,['BACK_NEG_Z']);
 assert.equal(r.closedSingleManifold,false);
 assert.ok(r.indexedTopology.originalOpenEdges>=4);
});
test('Inverted source face winding is detected even when geometry appears visually covered from both sides',()=>{
 const {positions,indices}=cube({reverse:['RIGHT_POS_X']});
 const r=auditAIGReal3DSixSourceSolid({positions,indices,sourceSha256:sha});
 assert.equal(r.realSixSidedBoxSourceGatePASS,false);
 assert.equal(r.outwardFacingSourceNormals,false);
 assert.ok(r.indexedTopology.originalWindingConflicts>0);
});
test('High-density ORIGINAL subdivided six-face cuboid retains 3D coverage and exact original faces, no side inference',()=>{
 const {positions,indices}=cube({segments:24});
 const r=auditAIGReal3DSixSourceSolid({positions,indices,sourceSha256:sha});
 assert.equal(r.originalTriangleCount,6912);
 assert.equal(r.realSixSidedBoxSourceGatePASS,true);
 assert.equal(r.indexedTopology.originalOpenEdges,0);
 assert.ok(r.sixSides.every(x=>x.originalTriangleCount===1152));
 assert.equal(r.syntheticMissingSideFacesGenerated,0);
});
test('Invalid original indices, fake non-3D bounds and unbounded memory are rejected',()=>{
 const {positions,indices}=cube();
 assert.throws(()=>auditAIGReal3DSixSourceSolid({
  positions,indices:new Uint32Array([0,1,99]),sourceSha256:sha
 }),/REAL3D_SIX_SIDES_INVALID_ORIGINAL_FACE_INDEX/);
 assert.throws(()=>auditAIGReal3DSixSourceSolid({
  positions,indices,sourceSha256:'NOT_SHA'
 }),/REAL3D_SIX_SIDES_ORIGINAL_GLOBAL_INDEXED_SOURCE_REQUIRED/);
 assert.throws(()=>auditAIGReal3DSixSourceSolid({
  positions,indices,sourceSha256:sha,maxOriginalTriangles:5
 }),/REAL3D_SIX_SIDES_TOPOLOGY_MEMORY_BUDGET/);
});
