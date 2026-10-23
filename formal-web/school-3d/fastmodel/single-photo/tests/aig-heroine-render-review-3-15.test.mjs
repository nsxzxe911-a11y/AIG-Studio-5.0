import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG315_SCHEMA,AIG315_ORDER,planAIG315HeroineCamera,
 reviewAIG315HeroineGeometry} from '../aig-heroine-render-review-3-15.mjs';
const ref='1deed212a2adcdc821e4291c6021fd1db490644da9a9c9b497f8243a7da296c1';
function source(){
 const p=[],labels=[];
 for(let j=0;j<10;j++)for(let i=0;i<32;i++){
  const theta=i*Math.PI*2/32;
  const y=j*.2,head=j>=7;
  const r=head?.19:.23;
  p.push(r*Math.cos(theta),y,r*.7*Math.sin(theta));
  labels.push(head?2:14);
 }
 return {positions:new Float32Array(p),
  sourceLabels:new Uint8Array(labels)};
}
const hair={geometry:{
 positions:new Float32Array([
  -.15,1.8,-.2,.15,1.8,-.2, -.16,1.2,-.2,
  .16,1.2,.15,-.15,.8,.1,.15,.8,.2
 ]),triangleCount:4}};
const outfit={geometry:{positions:new Float32Array([
 -.25,1,0,.25,1,0,0,.5,-.15
 ]),triangleCount:1}};
const params=()=>({...source(),
 sourcePhotoSha256:'demo-source-sha256-not-certified',
 approvedReferenceSha256:ref,hairMeshes:[hair],outfitMeshes:[outfit,outfit],
 recordedMultiViewScreenshots:[]});
test('geometry first contract never lets PBR or a technical wig claim source-verified face identity',()=>{
 const x=reviewAIG315HeroineGeometry(params());
 assert.equal(x.schema,AIG315_SCHEMA);
 assert.deepEqual(AIG315_ORDER.slice(0,3),[
  'VERIFY_SOURCE_SHA_AND_GEOMETRY',
  'FACE_HEAD_TOPOLOGY_AND_EXPRESSION_GEOMETRY',
  'SOURCE_CONSTRAINED_DETACHABLE_HAIR'
 ]);
 assert.equal(x.visibleNonplanarIndependentHairMeshes,1);
 assert.ok(x.actualHeadSourceVertices>=24);
 assert.equal(x.actualIndependentOutfitMeshes,2);
 assert.equal(x.approvedPlaidUVPresent,false);
 assert.equal(x.verifiedUserFacialLandmarkMeshTriangles,0);
 assert.equal(x.reference3DIdentityFitPASS,false);
 assert.equal(x.finalAppearanceReleasePASS,false);
 assert.ok(x.releaseBlockReasons.includes(
  'FACE_EYES_NOSE_MOUTH_SOURCE_FIT_NOT_BUILT'));
 assert.ok(x.releaseBlockReasons.includes('ACTUAL_APPROVED_PLAID_UV_TEXTURE_MISSING'));
 assert.equal(x.projectedBodySilhouettes.front.xWidthByBodyHeight.length,7);
 assert.equal(x.sourceImageProjectedAsFakeFace,false);
});
test('real XYZ source has reproducible genuinely different front profile rear camera poses',()=>{
 const {positions}=source();
 const all=['front','profile','rear'].map(view=>
  planAIG315HeroineCamera({bodyPositions:positions,view}));
 assert.notDeepEqual(all[0].position,all[1].position);
 assert.notDeepEqual(all[0].position,all[2].position);
 assert.equal(all[0].position[2]<all[0].target[2],true);
 assert.equal(all[2].position[2]>all[2].target[2],true);
 assert.equal(all[1].position[0]>all[1].target[0],true);
 assert.ok(all.every(x=>x.near>0&&x.far>x.near));
 assert.ok(all.every(x=>x.existingWebGLRendererReused===true));
});
test('adding mere view screenshots cannot bypass real face shape and cloth UV requirements',()=>{
 const v=reviewAIG315HeroineGeometry({
  ...params(),recordedMultiViewScreenshots:['front','profile','rear']
 });
 assert.equal(v.screenCapturesVerified.length,3);
 assert.equal(v.releaseBlockReasons.some(x=>x.startsWith('MISSING_')),false);
 assert.equal(v.finalAppearanceReleasePASS,false);
 assert.equal(v.releaseBlockReasons.includes(
  'REFERENCE_IDENTITY_LIKENESS_NOT_HUMAN_APPROVED'),true);
});
test('invalid source vertex arrays/labels and non-user approved authority always block',()=>{
 assert.throws(()=>reviewAIG315HeroineGeometry({
  ...params(),sourceLabels:new Uint8Array(1)
 }),/AIG315_SOURCE_AND_APPROVED_REFERENCE_CONTRACT_REQUIRED/);
 assert.throws(()=>reviewAIG315HeroineGeometry({
  ...params(),approvedReferenceSha256:'wrong'
 }),/AIG315_SOURCE_AND_APPROVED_REFERENCE_CONTRACT_REQUIRED/);
 assert.throws(()=>planAIG315HeroineCamera({
  bodyPositions:source().positions,view:'raytrace'
 }),/AIG315_VIEW_OR_FOV_INVALID/);
});
