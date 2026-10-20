const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const spec=JSON.parse(fs.readFileSync(path.join(root,'hair-face-spec.v1.json')));
const path1=path.join(root,'..','phase13','mesh-envelope.v1.json');
const path2='/mnt/data/AIG_School3D_Phase13_Envelope/mesh-envelope.v1.json';
const phase13=JSON.parse(fs.readFileSync(fs.existsSync(path1)?path1:path2));
const vm=require('node:vm');
// Run the original browser script in a CommonJS sandbox; repo formal-web uses type=module.
const sandbox={module:{exports:{}},console};
vm.runInNewContext(fs.readFileSync(path.join(root,'beauty-engine.v1.js'),'utf8'),sandbox,{filename:'beauty-engine.v1.js'});
const {HairSolver,faceWarp,initialPath}=sandbox.module.exports;
assert.equal(spec.source.sha256,phase13.source.sha256);
assert.equal(spec.hair.strands.length,88);
assert.equal(spec.gate.aiModelAvailable,false);
assert.equal(spec.approved3DModel,false);
assert.equal(spec.releasedToHomepage,false);
assert.equal(spec.hair.segmentsPerStrand,9);
const hair=new HairSolver(spec);
assert.equal(hair.strands.length,88);
const rootBefore=hair.strands.map(s=>s.points[0].slice());
for(let f=0;f<120;f++)hair.step(1/60,.72,6);
assert.ok(hair.maxMovement()>1,'hair tip should move');
assert.ok(hair.maxMovement()<55,'hair displacement must remain bounded');
for(const [i,s] of hair.strands.entries()){
 assert.equal(s.points.length,9);
 assert.ok(Math.abs(s.points[0][0]-(654+(rootBefore[i][0]-654)*Math.cos(6*Math.PI/180)+5*Math.sin(6*Math.PI/180)))<1e-8);assert.ok(Math.abs(s.points[0][1]-rootBefore[i][1])<1e-8);
 assert.ok(s.points.flat().every(Number.isFinite));
}
assert.equal(JSON.stringify(faceWarp([650,220],'hair',100)),JSON.stringify([650,220]));
assert.equal(JSON.stringify(faceWarp([650,220],'face',0)),JSON.stringify([650,220]));
const jaw=faceWarp([722,307],'face',100);
assert.ok(Math.hypot(jaw[0]-722,jaw[1]-307)<6);
assert.ok(Math.hypot(jaw[0]-722,jaw[1]-307)>0.1);
assert.ok(initialPath(spec.hair.strands[0],9).length===9);
// tampered visual authority is rejected (release gate must remain fail closed).
const forged=structuredClone(spec);forged.approved3DModel=true;
assert.throws(()=>new HairSolver(forged),/Fake approval blocked/);
const wrong=structuredClone(spec);wrong.source.sha256='0'.repeat(64);
assert.throws(()=>new HairSolver(wrong),/SHA mismatch/);
console.log('PASS 17 technical checks: hair spring, root lock, bounded displacement, face geometry, SHA, anti-fake');