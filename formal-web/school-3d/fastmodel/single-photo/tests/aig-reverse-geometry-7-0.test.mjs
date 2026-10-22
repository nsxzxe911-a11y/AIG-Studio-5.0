import test from 'node:test';
import assert from 'node:assert/strict';
import {
 reversePhotoMask,traceMaskContours,resampleClosedContour,createElasticContour,
 stepElasticContour,auditElasticContour,exportObservedSvg,AIG70_SCHEMA
} from '../aig-reverse-geometry-7-0.mjs';

function bitmap(w=72,h=72,inside=(x,y)=>x>=18&&x<54&&y>=10&&y<60,{alpha=true}={}){
 const data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;
  const fg=inside(x,y);
  data[i]=fg?30:235;data[i+1]=fg?76:234;data[i+2]=fg?145:231;
  data[i+3]=alpha?(fg?255:0):255;
 }
 return {width:w,height:h,data};
}
test('7.0 pixel reverse: exact rectangle bounds, area, order and observed-only contract',()=>{
 assert.match(AIG70_SCHEMA,/REVERSE_2D/);
 const m=reversePhotoMask(bitmap());
 assert.equal(m.foregroundPixels,1800);
 assert.deepEqual(m.bounds,{x:18,y:10,width:36,height:50});
 const contour=traceMaskContours(m);
 assert.equal(contour.rings.length,1);
 assert.equal(contour.rings[0].signedArea,1800);
 assert.equal(contour.edgeCount,172);
 assert.equal(contour.threeDVerified,false);
 assert.match(exportObservedSvg(contour,{sourceSHA256:'a'.repeat(64)}),/data-aig-observation="2d-only"/);
});
test('7.0 real background flood-fill isolates connected exterior and exposes review requirement',()=>{
 const m=reversePhotoMask(bitmap(72,72,(x,y)=>x>=18&&x<54&&y>=10&&y<60,{alpha:false}),
 {method:'background',backgroundPoint:[0,0],threshold:5});
 assert.equal(m.foregroundPixels,1800);
 assert.equal(m.method,'background');
 assert.equal(m.confidence,'USER_REVIEW_REQUIRED');
 assert.throws(()=>reversePhotoMask(bitmap(72,72,()=>true,{alpha:false})),/ALPHA_MISSING/);
 assert.throws(()=>reversePhotoMask(bitmap(72,72,()=>false)),/MASK_AMBIGUOUS/);
});
test('7.0 interior hole retains counter-oriented contour instead of solidifying it',()=>{
 const shape=(x,y)=>x>=10&&x<62&&y>=10&&y<62&&!(x>=24&&x<48&&y>=24&&y<48);
 const c=traceMaskContours(reversePhotoMask(bitmap(72,72,shape)));
 assert.equal(c.rings.length,2);
 assert.equal(c.rings[0].signedArea,52*52);
 assert.equal(c.rings[1].signedArea,-24*24);
 assert.equal(c.rings[1].hole,true);
});
test('7.0 diagonally touching regions are blocked, not joined as fake self-intersection',()=>{
 const shape=(x,y)=>x>=12&&x<25&&y>=12&&y<25||x>=25&&x<38&&y>=25&&y<38;
 assert.throws(()=>traceMaskContours(reversePhotoMask(bitmap(72,72,shape))),/AMBIGUOUS_DIAGONAL_TOUCH/);
});
test('7.0 actual numerical elastic integration produces changing positions and respects pin/floor',()=>{
 const c=traceMaskContours(reversePhotoMask(bitmap()));
 const sampled=resampleClosedContour(c.rings[0].points,96);
 const sim=createElasticContour(sampled,{gravity:180,floor:67});
 const before=JSON.stringify(sim.live);
 for(let i=0;i<80;i++)stepElasticContour(sim);
 const evidence=auditElasticContour(sim);
 assert.notEqual(JSON.stringify(sim.live),before);
 assert.equal(evidence.steps,80);
 assert.equal(evidence.claim,'NUMERICAL_2D_SILHOUETTE_ONLY');
 assert.equal(evidence.realThreeDSkinVerified,false);
 assert.ok(evidence.maxDisplacement>2);
 assert.ok(evidence.meanConstraintError<3);
 assert.ok(sim.live.every(p=>p[1]<=67+1e-7));
 assert.ok(sim.pins.every(i=>sim.live[i][0]===sim.origin[i][0]&&sim.live[i][1]===sim.origin[i][1]));
});
test('7.0 external pointer force moves a true numerical control node',()=>{
 const m=reversePhotoMask(bitmap()),c=traceMaskContours(m);
 const sim=createElasticContour(resampleClosedContour(c.rings[0].points,48),{gravity:0,pin:false});
 const original=sim.live[4];
 const target=[original[0]+18,original[1]-8];
 stepElasticContour(sim,1/60,{dragPoint:{index:4,xy:target}});
 assert.deepEqual(sim.live[4],target);
 assert.ok(auditElasticContour(sim).maxDisplacement>15);
});
test('7.0 malformed masks, fake alpha, invalid physics and fake 3D claims rejected',()=>{
 const data=bitmap();
 assert.throws(()=>reversePhotoMask({...data,width:3}),/IMAGE_DIMENSION/);
 const m=reversePhotoMask(data);
 assert.throws(()=>traceMaskContours({...m,mask:new Uint8Array(4)}),/VERIFIED_MASK/);
 const contour=traceMaskContours(m);
 assert.throws(()=>exportObservedSvg(contour,{sourceSHA256:'spoof'}),/SVG_SHA_INVALID/);
 const sim=createElasticContour(resampleClosedContour(contour.rings[0].points,36));
 assert.throws(()=>stepElasticContour(sim,3),/SIM_STEP_INVALID/);
 assert.throws(()=>createElasticContour(sim.live,{damping:2}),/SIM_INPUT_INVALID/);
});
