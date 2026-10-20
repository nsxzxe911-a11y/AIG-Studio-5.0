import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIG_SDF_VERSION,createImplicitScene,fieldAt,sdSphere,sdCapsule,
 sdEllipsoidApprox,smoothMin,AIG41_VERTEX,AIG41_FRAGMENT,AigImplicitRenderer} from '../aig-sdf-4-1.mjs';
const scaffold={
 sourceSHA256:'a'.repeat(64),
 schema:'AIG_FASTMODEL_NATIVE_4_0_GEOMETRIC_VOLUME_DRAFT',
 proportions:{ratiosByImageHeight:Array.from({length:11},(_,i)=>({
  atHeight:i/10,widthRatio:[.18,.22,.28,.32,.30,.28,.33,.42,.30,.13,.10][i],
  centerRatio:.5}))}
};
test('4.1 exact source SHA proportions, no body anatomy or photorealism approval',()=>{
 const scene=createImplicitScene(scaffold);
 assert.match(scene.schema,/4_1/);
 assert.equal(scene.sourceSHA256,scaffold.sourceSHA256);
 assert.equal(scene.networkRequestsMade,0);
 assert.equal(scene.formalHeroineApproved,false);
 assert.equal(scene.skinWeightsPresent,false);
 assert.equal(scene.exportTriangulationNeeded,true);
 assert.equal(scene.parameterCount,8);
 assert.equal(scene.primitiveCount,10);
 assert.equal(AIG_SDF_VERSION,scene.schema);
 assert.throws(()=>createImplicitScene({...scaffold,sourceSHA256:'b'}),/SCAFFOLD_REQUIRED/);
 assert.throws(()=>createImplicitScene({...scaffold,
  proportions:{ratiosByImageHeight:[...scaffold.proportions.ratiosByImageHeight.slice(0,10),
  {widthRatio:Infinity,centerRatio:.5}]}}),/PROPORTION_NONFINITE/);
});
test('4.1 true SDF head to neck is a connected continuous volume, no severed head',()=>{
 const scene=createImplicitScene(scaffold);
 // Head bottom and neck start overlap, not an artificial disconnected head.
 for(const y of [.315,.325,.34]){
  assert.ok(fieldAt([0,y,.005],scene)<0,'head/neck separation at y='+y);
 }
 for(const x of [-.004,0,.004]){
  const a=fieldAt([x,.315,.001],scene);
  const b=fieldAt([x,.3151,.001],scene);
  assert.ok(Math.abs(a-b)<.004,'unexpected SDF seam jump');
 }
 assert.ok(fieldAt([2,2,2],scene)>0);
 assert.throws(()=>fieldAt([NaN,0,0],scene),/POINT_INVALID/);
});
test('analytic field arithmetic works without triangles or external inference',()=>{
 assert.ok(Math.abs(sdSphere([1,0,0],[0,0,0],1))<1e-10);
 assert.ok(Math.abs(sdCapsule([.5,1,0],[0,0,0],[1,0,0],1))<1e-10);
 assert.ok(Math.abs(sdEllipsoidApprox([2,0,0],[0,0,0],[2,1,1]))<1e-10);
 assert.ok(smoothMin(-.1,.1,.3)<-.1);
 assert.match(AIG41_FRAGMENT,/for\(int j=0;j<96;j\+\+\)/);
 assert.match(AIG41_FRAGMENT,/vec3 normalAt/);
 assert.match(AIG41_FRAGMENT,/smoothUnion/);
 const src=fs.readFileSync(new URL('../aig-sdf-4-1.mjs',import.meta.url),'utf8');
 for(const token of ['fetch(', 'MeshyClient','StableFast3D','subprocess.run','requestAnimationFrame'])
  assert.ok(!src.includes(token),'unexpected paid/eager renderer API '+token);
});
test('4.1 viewport remains real buttons bound to 4.0 source SHA and resource cleanup',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 for(const id of ['aig41-canvas','aig41-yaw','aig41-quality','aig41-preview',
                  'aig41-release','aig41-status'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(app,/aig41FromScaffold\(prefix,frontSHA\)/);
 assert.match(app,/scaffold\.sourceSHA256!==expectedSHA/);
 assert.match(app,/new AigImplicitRenderer/);
 assert.match(app,/aig41-release'\)\.addEventListener/);
 assert.match(app,/GPU FPS/);
});
test('WebGL2 buffer/shader created only once across angle redraws, not remeshed',()=>{
 const calls=[];
 const gl={
   VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,
   ARRAY_BUFFER:5,STATIC_DRAW:6,FLOAT:7,TRIANGLE_STRIP:8,
   createShader:k=>({type:k}),shaderSource:()=>{},compileShader:()=>{},
   getShaderParameter:()=>true,getShaderInfoLog:()=>'',deleteShader:()=>{},
   createProgram:()=>({}),attachShader:()=>{},linkProgram:()=>{},
   getProgramParameter:()=>true,getProgramInfoLog:()=>'',createBuffer:()=>{calls.push('buffer');return {}},
   bindBuffer:()=>{},bufferData:()=>calls.push('upload'),
   getAttribLocation:()=>0,getUniformLocation:(p,name)=>name,
   viewport:()=>{},useProgram:()=>{},enableVertexAttribArray:()=>{},
   vertexAttribPointer:()=>{},uniform2f:()=>{},uniform1f:()=>{},
   uniform4f:()=>{},drawArrays:()=>calls.push('draw'),
   deleteBuffer:()=>calls.push('delete-buffer'),deleteProgram:()=>calls.push('delete-program')
 };
 const canvas={clientWidth:640,clientHeight:480,width:0,height:0,getContext:name=>name==='webgl2'?gl:null};
 const renderer=new AigImplicitRenderer(canvas,createImplicitScene(scaffold),{pixelScale:.5,maxSteps:48});
 for(let i=0;i<8;i++)renderer.draw(i*Math.PI/4);
 assert.equal(calls.filter(x=>x==='buffer').length,1);
 assert.equal(calls.filter(x=>x==='upload').length,1);
 assert.equal(calls.filter(x=>x==='draw').length,8);
 assert.equal(renderer.draw(0).result,'GPU_COMMAND_SUBMITTED_NOT_GPU_FPS_PROVEN');
 renderer.dispose();renderer.dispose();
 assert.equal(calls.filter(x=>x==='delete-buffer').length,1);
 assert.throws(()=>renderer.draw(0),/DISPOSED/);
});
