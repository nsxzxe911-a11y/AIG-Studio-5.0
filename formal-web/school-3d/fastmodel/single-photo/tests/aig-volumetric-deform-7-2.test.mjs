import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservedImplicitVolume,sampleImplicitVolume} from '../aig-implicit-volume-7-1.mjs';
import {createAIG72VolumeBody,stepAIG72Volume,auditAIG72Volume,sampleAIG72DeformedVolume,raycastAIG72Volume,renderAIG72DeformedVolume,AIG72_SCHEMA} from '../aig-volumetric-deform-7-2.mjs';
const mask=new Uint8Array(72*72);
for(let y=10;y<62;y++)for(let x=20;x<52;x++)mask[y*72+x]=1;
const field=createObservedImplicitVolume({width:72,height:72,mask},{maxGrid:72,halfDepth:.12});
const body=()=>createAIG72VolumeBody(field,{nx:4,ny:5,nz:3});
test('7.2 source uses actual XYZ tetra signed volumes, not flat screen rectangles',()=>{
 const b=body(),a=auditAIG72Volume(b);
 assert.equal(b.schema,AIG72_SCHEMA);
 assert.equal(a.nodeCount,60);assert.equal(a.tetraCount,144);
 assert.equal(a.invertedTetraCount,0);
 assert.equal(a.minSignedVolumeRatio,1);
 assert.ok(b.rest.some(p=>p[2]<0)&&b.rest.some(p=>p[2]>0));
 assert.equal(a.anatomicalSkinVerified,false);
 assert.equal(b.unobservedDepth,'ESTIMATED_Z');
});
test('7.2 real time stepping deforms XYZ lattice while preserving positive signed tetra volumes',()=>{
 const b=body(),original=JSON.stringify(b.positions);
 for(let i=0;i<60;i++)stepAIG72Volume(b,{dt:1/60,iterations:5,tipX:.04,tipZ:.02});
 const a=auditAIG72Volume(b);
 assert.notEqual(JSON.stringify(b.positions),original);
 assert.equal(a.steps,60);assert.equal(a.invertedTetraCount,0);
 assert.ok(a.maxDisplacement>.04);
 assert.ok(a.meanVolumeRatioError<.05);
 assert.ok(a.minSignedVolumeRatio>.7);
 assert.ok(b.positions.some((p,i)=>Math.abs(p[2]-b.rest[i][2])>.005));
 assert.equal(a.simulationStable,true);
});
test('7.2 top kinematic control is applied to REAL 3D node positions and anchors are bounded',()=>{
 const b=body();stepAIG72Volume(b,{tipX:.06,tipZ:-.025});
 for(let i=0;i<b.inverseMass.length;i++)if(b.inverseMass[i]===0){
  assert.ok(Math.abs(b.positions[i][0]-b.rest[i][0]-.06)<1e-10);
  assert.ok(Math.abs(b.positions[i][2]-b.rest[i][2]+.025)<1e-10);
 }
});
test('7.2 colliding sphere actively pushes free 3D nodes out of collision volume',()=>{
 const b=body(),target=b.positions.findIndex((p,i)=>b.inverseMass[i]>0&&Math.abs(p[2])<.01);
 assert.notEqual(target,-1);
 const c=[...b.positions[target]],radius=.075;
 const a=stepAIG72Volume(b,{gravity:0,sphere:{center:c,radius},iterations:9});
 assert.ok(a.collisionProjections>0);
 assert.ok(Math.hypot(...b.positions[target].map((x,i)=>x-c[i]))>=radius-1e-8);
});
test('7.2 deformed inverse field changes actual 3D surface and camera output',()=>{
 const b=body(),query=[0,.16,0];
 const initial=sampleAIG72DeformedVolume(b,query).signedDistance;
 for(let i=0;i<40;i++)stepAIG72Volume(b,{tipX:.085,tipZ:0,gravity:0});
 const changed=sampleAIG72DeformedVolume(b,query).signedDistance;
 assert.ok(Math.abs(changed-initial)>1e-4);
 const ray=raycastAIG72Volume(b,[0,0,1],[0,0,-1]);
 assert.equal(ray.hit,true);assert.ok(ray.normal.every(Number.isFinite));
 const a=renderAIG72DeformedVolume(b,{width:34,height:26,yaw:0,pitch:.05});
 const rotated=renderAIG72DeformedVolume(b,{width:34,height:26,yaw:1.45,pitch:.1});
 assert.ok(a.hitPixels>30);assert.ok(rotated.hitPixels>15);
 assert.notDeepEqual(a.pixels,rotated.pixels);
 assert.equal(a.realHumanSkin,false);
});
test('7.2 reject invalid material inputs, huge grids, nonfinite forces or fake geometry',()=>{
 assert.throws(()=>createAIG72VolumeBody(field,{nx:20}),/LATTICE_CONFIG/);
 assert.throws(()=>stepAIG72Volume(body(),{tipX:99}),/STEP_INVALID/);
 assert.throws(()=>stepAIG72Volume(body(),{dt:2}),/STEP_INVALID/);
 assert.throws(()=>stepAIG72Volume(body(),{sphere:{center:[0,0,0],radius:0}}),/SPHERE_INVALID/);
 assert.throws(()=>sampleAIG72DeformedVolume(body(),[NaN,0,0]),/SAMPLE_INVALID/);
 assert.throws(()=>renderAIG72DeformedVolume(body(),{width:400,height:400}),/RENDER_INPUT/);
});
