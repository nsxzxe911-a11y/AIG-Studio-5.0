import test from 'node:test';
import assert from 'node:assert/strict';
import {edt1D,distanceField2D,createObservedImplicitVolume,sampleImplicitVolume,surfaceNormal,raycastImplicitVolume,probeSphereContact,renderImplicitVolume,AIG71_SCHEMA} from '../aig-implicit-volume-7-1.mjs';
function observed(){
 const width=96,height=96,mask=new Uint8Array(width*height);
 for(let y=20;y<76;y++)for(let x=28;x<68;x++)mask[y*width+x]=1;
 return {width,height,mask,sourceSHA256:'f'.repeat(64)};
}
const g=createObservedImplicitVolume(observed(),{maxGrid:96,halfDepth:.13});
test('7.1 signed 3D includes real Z negative interior and explicitly inferred depth',()=>{
 assert.equal(g.schema,AIG71_SCHEMA);assert.equal(g.occupiedCells,2240);
 assert.equal(g.hiddenZ,'EXPLICIT_ESTIMATE_NOT_OBSERVED');
 assert.equal(g.verifiedAnatomicalReconstruction,false);
 assert.ok(sampleImplicitVolume(g,[0,0,0])<-.12);
 assert.ok(sampleImplicitVolume(g,[0,0,.2])>.06);
 assert.ok(sampleImplicitVolume(g,[.55,0,0])>0);
 assert.ok(sampleImplicitVolume(g,[0,.55,0])>0);
});
test('7.1 Euclidean pixel metric agrees with known squared distances',()=>{
 assert.deepEqual(Array.from(edt1D(new Float64Array([1e10,0,1e10,1e10]))),[1,0,1,4]);
 const bits=new Uint8Array(25);bits[12]=1;
 const d=distanceField2D(bits,5,5,1);
 assert.equal(d[12],0);assert.ok(Math.abs(d[24]-Math.sqrt(8))<1e-6);
});
test('7.1 orthogonal ray intersection finds actual different front and side surfaces',()=>{
 const front=raycastImplicitVolume(g,[0,0,1],[0,0,-1]);
 const side=raycastImplicitVolume(g,[1,0,0],[-1,0,0]);
 assert.equal(front.hit,true);assert.equal(side.hit,true);
 assert.ok(Math.abs(front.point[2]-.13)<.02);
 assert.ok(Math.abs(side.point[0]-(40/96/2))<.02);
 assert.ok(front.normal[2]>.9);assert.ok(side.normal[0]>.85);
 assert.ok(Math.abs(front.distance-side.distance)>.03);
});
test('7.1 truly rotated camera changes surface pixel ray hit geometry',()=>{
 const a=renderImplicitVolume(g,{width:80,height:64,yaw:0,pitch:0,maxSteps:74});
 const b=renderImplicitVolume(g,{width:80,height:64,yaw:Math.PI/2,pitch:.1,maxSteps:74});
 assert.ok(a.hitPixels>150);assert.ok(b.hitPixels>50);
 assert.notDeepEqual(a.pixels,b.pixels);
 assert.equal(a.realSurfaceRayIntersections,true);
 assert.equal(a.photorealistic,false);
});
test('7.1 sphere contact penetration in XYZ produces normal and corrected center',()=>{
 const out=probeSphereContact(g,[0,0,.35],.07);
 const hit=probeSphereContact(g,[0,0,.155],.055);
 assert.equal(out.overlap,false);assert.equal(hit.overlap,true);
 assert.ok(hit.penetrationDepth>.02);assert.ok(hit.contactNormal[2]>.9);
 assert.ok(hit.correctedCenter[2]>hit.nearestSurfacePoint[2]);
 assert.equal(hit.simulatedMaterialResponse,false);
});
test('7.1 inverse 3D geometry bend changes actual surface distance and normal',()=>{
 const q=[.2,.2,0],before=sampleImplicitVolume(g,q),after=sampleImplicitVolume(g,q,{bend:.35});
 assert.ok(Math.abs(after-before)>1e-6);
 assert.ok(surfaceNormal(g,[0,0,.13])[2]>.9);
 assert.equal(g.verifiedElasticMaterial,false);
});
test('7.1 reject malformed masks, nonfinite ray and bogus large image output',()=>{
 assert.throws(()=>createObservedImplicitVolume(observed(),{halfDepth:0}),/MASK_GRID_OR_DEPTH/);
 assert.throws(()=>createObservedImplicitVolume({...observed(),mask:new Uint8Array(8)}),/MASK_GRID_OR_DEPTH/);
 assert.throws(()=>raycastImplicitVolume(g,[0,0,2],[0,0,0]),/RAY_INVALID/);
 assert.throws(()=>sampleImplicitVolume(g,[NaN,0,0]),/SDF_INPUT/);
 assert.throws(()=>renderImplicitVolume(g,{width:1600,height:1000}),/RENDER_INPUT/);
});
