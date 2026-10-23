import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG314_HEROINE_SCHEMA,AIG314_HEROINE_SHEET,
 AIG314_OFFLINE_AUTHORITY_COLOURS,getAIG314VerifiedAuthorityPalette,
 applyAIG314ObservedPaletteToBody,analyseAIG314ApprovedHeroineSheet}
 from '../aig-heroine-authority-3-14.mjs';
import {AIG314_INTERSECTION_SCHEMA,
 auditAIG314ActualTriangleIntersections}
 from '../aig-triangle-intersection-audit-3-14.mjs';

test('user-approved heroine source multi-view SHA is explicitly the authority, not generic test mannequin',()=>{
 assert.equal(AIG314_HEROINE_SHEET.width,1448);
 assert.equal(AIG314_HEROINE_SHEET.height,1086);
 assert.equal(AIG314_HEROINE_SHEET.sha256,
  '1deed212a2adcdc821e4291c6021fd1db490644da9a9c9b497f8243a7da296c1');
 assert.deepEqual(AIG314_HEROINE_SHEET.requiredViews,
  ['front','profile','rear','neutralTPose']);
 const ref=getAIG314VerifiedAuthorityPalette();
 assert.equal(ref.schema,AIG314_HEROINE_SCHEMA);
 assert.equal(ref.photoBytesEmbedded,false);
 assert.deepEqual(AIG314_OFFLINE_AUTHORITY_COLOURS.skin,[243,192,174]);
 assert.deepEqual(AIG314_OFFLINE_AUTHORITY_COLOURS.hair,[73,46,53]);
 assert.equal(ref.individualFaceGeometryOrIdentityReconstructed,false);
});
test('real sampled source colour changes 3D vertex array but NOT original mesh or facial/cloth verification',()=>{
 const ref=getAIG314VerifiedAuthorityPalette(),base=new Float32Array(12).fill(.5);
 const original=base.slice(),ids=new Uint8Array([2,3,14,6]);
 const r=applyAIG314ObservedPaletteToBody({
  colours:base,sourceClassIds:ids,authority:ref});
 assert.equal(r.schema,AIG314_HEROINE_SCHEMA);
 assert.equal(r.actualRecolouredVertices,3);
 assert.equal(r.actualHumanFaceGeometryRemodelled,false);
 assert.equal(r.likenessAndClothingPatternStillNotApproved,true);
 assert.notDeepEqual(r.colours,base);
 assert.equal(r.colours[9],.5);
 assert.deepEqual(base,original);
});
test('a claimed original source SHA is NOT enough, real PNG bytes are cryptographically required',async()=>{
 await assert.rejects(()=>analyseAIG314ApprovedHeroineSheet({
  rgba:new Uint8ClampedArray(1448*1086*4),
  width:1448,height:1086,originalPNGBytes:new Uint8Array(32000)
 }),/AIG314_HEROINE_ORIGINAL_PRIVATE_REFERENCE_PNG_SHA_MISMATCH/);
});
const body=new Float32Array([
 -.2,0,0,.2,0,0,-.2,1,0,.2,1,0
]);
const bodyIndices=new Uint32Array([0,1,2,1,3,2]);
const sourceLabels=new Uint8Array(4).fill(14);
test('independent actual hair triangles cross body triangle: exact intersection is measured and blocks',()=>{
 const hair=new Float32Array([
  -.1,.20,-.12,.1,.2,.12,0,.8,-.12
 ]);
 const r=auditAIG314ActualTriangleIntersections({
  bodyPosed:body,bodyIndices,sourceLabels,
  attachments:[{name:'ponytail-real-3d',mode:'hair',
   positions:hair,indices:new Uint32Array([0,1,2])}]
 });
 assert.equal(r.schema,AIG314_INTERSECTION_SCHEMA);
 assert.equal(r.attachmentMeshesSampled,1);
 assert.ok(r.exactTrianglePairsTested>0);
 assert.ok(r.confirmedBodyClothHairTriangleIntersections>0);
 assert.equal(r.sampledContactRiskDetected,true);
 assert.equal(r.releaseAllowed,false);
});
test('real nonintersecting triangle remains clear ONLY for discrete test sample',()=>{
 const far=new Float32Array([
  -.1,.2,.3,.1,.2,.3,0,.8,.3
 ]);
 const r=auditAIG314ActualTriangleIntersections({
  bodyPosed:body,bodyIndices,sourceLabels,
  attachments:[{name:'far-hair',mode:'hair',
   positions:far,indices:new Uint32Array([0,1,2])}]
 });
 assert.equal(r.confirmedBodyClothHairTriangleIntersections,0);
 assert.equal(r.discreteTriangleAuditClearOnly,true);
 assert.equal(r.fullContinuousTimeCollisionFreeCertified,false);
 assert.equal(r.userApprovedHeroineAppearanceCertified,false);
});
test('missing source-labeled leg/torso never masquerades as a zero-contact PASS',()=>{
 const shirt=new Uint8Array(4).fill(0);
 const r=auditAIG314ActualTriangleIntersections({
  bodyPosed:body,bodyIndices,sourceLabels:shirt,
  attachments:[{name:'unknown-skirt',mode:'skirt',
   positions:new Float32Array([0,0,0,.1,0,0,0,1,0]),
   indices:new Uint32Array([0,1,2])}]
 });
 assert.equal(r.sampledSourceDataComplete,false);
 assert.equal(r.details[0].confirmedIntersectionPairs,null);
 assert.equal(r.discreteTriangleAuditClearOnly,false);
});
