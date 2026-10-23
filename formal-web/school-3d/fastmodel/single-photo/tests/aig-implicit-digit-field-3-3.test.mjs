import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AIG32_DIGITS} from '../aig-20-digit-articulation-3-2.mjs';
import {AIG33_SCHEMA,aig33CapsuleSDF,aig33SmoothUnion,
 aig33PrepareImplicitGroups,AIG33_CAPSULES_PER_GROUP}
 from '../aig-implicit-digit-field-3-3.mjs';
import {AIG33_SHADER_SCHEMA,makeAIG33ImplicitSkinLayer}
 from '../aig-implicit-digit-raymarch-3-3.mjs';
const SHA='sha256:'+'d'.repeat(64);
function source(){
 const sourceAnchors={leftHand:{xyz:[-.2,1.1,0]},
  rightHand:{xyz:[.2,1.1,0]},
  leftFoot:{xyz:[-.1,.04,.05]},
  rightFoot:{xyz:[.1,.04,.05]}};
 const meshes=AIG32_DIGITS.map(d=>{
  const anchor=sourceAnchors[d.side+(d.type==='hand'?'Hand':'Foot')].xyz;
  const base=anchor.map((v,i)=>v+(
   i===0?(d.index-2)*.017:0));
  const points=[base];
  for(let j=0;j<d.phalanges;j++){
   const prev=points.at(-1);
   points.push(prev.map((v,i)=>v+
    (d.type==='hand'?(i===1?-.028:0):(i===2?.022:0))));
  }
  return {...d,phalanxCount:d.phalanges,actual3DJointXYZ:points};
 });
 const result={sourceSha256:SHA,meshes,
  actualPositionsAndIndexedTrianglesPresent:true,
  generatedActual3DDigits:20,generatedActual3DPhalanges:56};
 const rig={sourceSha256:SHA,sourceAnchors,
  anchoredBodyHeightRelativeUnits:2};
 return {result,rig};
}
test('3.3 four source-labelled group SDFs cover exactly 20 digits and 56 phalanx links',()=>{
 const {result,rig}=source();
 for(const quality of ['MOBILE','BALANCED','HIGH']){
  const r=aig33PrepareImplicitGroups(result,rig,{quality});
  assert.equal(r.schema,AIG33_SCHEMA);
  assert.equal(r.actualDigits,20);
  assert.equal(r.actualPhalanges,56);
  assert.equal(r.implicitGroupCount,4);
  assert.equal(r.actualImplicitCapsuleCount,56);
  assert.equal(r.noVisibleTriangulatedDigitTubeSurfaces,true);
  assert.equal(r.priorGeometryNotReal3DScan,true);
  for(const g of r.parts){
   assert.equal(g.sourceDigitCount,5);
   assert.equal(g.sourcePhalanxCount,14);
   assert.equal(g.centerline.length,AIG33_CAPSULES_PER_GROUP);
   assert.ok(g.maxMarchSteps>=28&&g.maxMarchSteps<=64);
   assert.ok(g.span.every(x=>x>0&&Number.isFinite(x)));
   assert.equal(g.skinSurfaceDeterminedBy,'GPU_FRAGMENT_RAYMARCH_ONLY');
   assert.equal(g.rasterizationProxyTrianglesVisibleAsSkin,false);
  }
 }
});
test('3.3 genuine analytic distance and smooth union are finite, continuous, not tessellated tubes',()=>{
 const d=aig33CapsuleSDF([0,.03,0],[0,0,0],[0,.1,0],.02);
 assert.ok(d<-.019);
 assert.ok(aig33CapsuleSDF([1,1,1],[0,0,0],[0,.1,0],.02)>1);
 assert.equal(aig33SmoothUnion(-.02,.03,.02),-.02);
 assert.ok(aig33SmoothUnion(.015,.015,.02)<.015);
 assert.throws(()=>aig33CapsuleSDF([NaN,0,0],[0,0,0],[0,1,0],.01),
  /FINITE_CAPSULE_REQUIRED/);
 assert.throws(()=>aig33SmoothUnion(.01,.02,0),
  /POSITIVE_FINITE_SMOOTH_WIDTH/);
});
test('3.3 shader is a real GLSL3 3D ray marcher with correct fragment depth (proxy triangulation is not visible skin)',()=>{
 const {result,rig}=source();
 const field=aig33PrepareImplicitGroups(result,rig,{quality:'MOBILE'});
 const palette=Object.fromEntries(field.parts.map(p=>[p.group,[.45,.27,.19]]));
 const layer=makeAIG33ImplicitSkinLayer(field,palette);
 assert.equal(layer.children.length,4);
 assert.equal(layer.userData.visibleDigitSurfaceIsTriangulated,false);
 for(const proxy of layer.children){
  assert.ok(proxy.isMesh);
  assert.ok(proxy.material.isShaderMaterial);
  assert.equal(proxy.material.glslVersion,THREE.GLSL3);
  assert.equal(proxy.material.depthWrite,true);
  assert.equal(proxy.material.uniforms.uCapsA.value.length,14);
  assert.equal(proxy.material.uniforms.uCapsR.value.length,14);
  assert.equal(proxy.userData.analyticalCapsules,14);
  assert.equal(proxy.userData.proxyTriangleCount,12);
  assert.equal(proxy.userData.directFragmentRayMarch,true);
  assert.equal(proxy.userData.surfaceNotDerivedFromProxyTriangles,true);
  assert.ok(proxy.material.fragmentShader.includes('sceneDistance(p)'));
  assert.ok(proxy.material.fragmentShader.includes('gl_FragDepth'));
  assert.ok(proxy.material.fragmentShader.includes('discard'));
  assert.equal(proxy.material.fragmentShader.includes('#version'),false,
   'Three.js GLSL3 adds version header exactly once');
 }
 layer.children.forEach(x=>{x.geometry.dispose();x.material.dispose()});
});
test('3.3 fail closed for missing source, corrupt number, unknown quality',()=>{
 const {result,rig}=source();
 assert.throws(()=>aig33PrepareImplicitGroups({...result,sourceSha256:'sha256:'+('f'.repeat(64))},rig),
  /VERIFIED_SOURCE_POSE_SHA_REQUIRED/);
 assert.throws(()=>aig33PrepareImplicitGroups(result,rig,{quality:'FAKE_CINEMATIC'}),
  /QUALITY_MODE_INVALID/);
 const removed=result.meshes.filter(x=>!x.id.startsWith('leftHand'));
 assert.deepEqual(aig33PrepareImplicitGroups({...result,meshes:removed},rig)
  .parts.map(x=>x.group).sort(),['leftFoot','rightFoot','rightHand']);
});
