import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGStage1AdultAnatomy} from '../aig-stage1-dual-adult-anatomy.mjs';
import {fitAIGStage1TrueFrontCamera,auditAIGStage1FrontClip,
 AIG_STAGE1_TRUE_FRONT_SCHEMA}
 from '../aig-stage1-true-front-camera.mjs';
for(const gender of ['male','female']){
 test('true anatomical '+gender+' FRONT is strict zero-yaw zero-pitch orthographic, source dimensions preserved',()=>{
  const body=buildAIGStage1AdultAnatomy(gender);
  const before=body.parts.map(p=>p.geometry.positions.slice());
  const framing=fitAIGStage1TrueFrontCamera(body,{width:1080,height:1920});
  assert.equal(framing.schema,AIG_STAGE1_TRUE_FRONT_SCHEMA);
  assert.equal(framing.projection,'orthographic');
  assert.equal(framing.view,'front');
  assert.equal(framing.frontWorldSide,'-Z');
  assert.equal(framing.cameraYawDeg,0);
  assert.equal(framing.cameraPitchDeg,0);
  assert.equal(framing.cameraRollDeg,0);
  assert.equal(framing.viewport.width,1080);
  assert.equal(framing.viewport.height,1920);
  assert.equal(framing.numericalFrontalFramingPASS,true,
   JSON.stringify(framing.projectedGeometryErrors));
  assert.ok(framing.bodyScreenHeightFraction>=.7);
  assert.ok(framing.bodyScreenHeightFraction<=.83);
  assert.equal(framing.eye[0],framing.target[0]);
  assert.equal(framing.eye[1],framing.target[1]);
  assert.ok(framing.eye[2]<framing.target[2]);
  assert.ok(framing.topMarginFraction>.07);
  assert.ok(framing.footMarginFraction>.07);
  const pixel=auditAIGStage1FrontClip(body,framing);
  assert.equal(pixel.frontalGeometryClipPASS,true,
   JSON.stringify(pixel.clipViolations));
  assert.ok(pixel.minimumHorizontalSafeMarginFraction>.035);
  assert.ok(pixel.minimumVerticalSafeMarginFraction>.04);
  assert.ok(pixel.actualVerticesChecked>2000);
  assert.equal(pixel.stage1HumanAppearancePASS,false);
  body.parts.forEach((p,i)=>assert.deepEqual(p.geometry.positions,before[i]));
 });
}
test('a true front photo does not deform or crop after resizing to desktop 16:9',()=>{
 for(const gender of ['male','female']){
  const source=buildAIGStage1AdultAnatomy(gender);
  for(const [width,height] of [[1080,1920],[1920,1080],[390,844],[3840,2160]]){
   const p=fitAIGStage1TrueFrontCamera(source,{width,height});
   const clips=auditAIGStage1FrontClip(source,p);
   assert.equal(clips.frontalGeometryClipPASS,true,
    gender+' at '+width+'x'+height+' '+JSON.stringify(clips.clipViolations));
   assert.equal(p.cameraYawDeg,0);
   assert.equal(p.cameraPitchDeg,0);
   assert.ok(p.bodyScreenHeightFraction<=.86);
   assert.ok(p.bodyScreenWidthFraction<=.86);
   assert.equal(p.sourceBoundsMm[1],source.heightMm);
  }
 }
});
test('false front camera and a deliberately cropped body must BLOCK',()=>{
 const source=buildAIGStage1AdultAnatomy('male');
 const frame=fitAIGStage1TrueFrontCamera(source);
 const badFrame={...frame,orthographicBox:{
  ...frame.orthographicBox,top:frame.orthographicBox.top*.35,
  bottom:frame.orthographicBox.bottom*.35
 }};
 const r=auditAIGStage1FrontClip(source,badFrame);
 assert.equal(r.frontalGeometryClipPASS,false);
 assert.ok(r.clipViolations.includes('REAL_HEAD_OR_FEET_CLIPPED'));
 assert.throws(()=>fitAIGStage1TrueFrontCamera(source,{
  width:1080,height:0
 }),/OUTPUT_SIZE_OR_BODY_MARGIN_INVALID/);
});
