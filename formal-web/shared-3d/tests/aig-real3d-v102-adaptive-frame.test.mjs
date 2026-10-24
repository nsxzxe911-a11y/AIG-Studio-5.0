import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DBox,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {planAIGReal3DAdaptiveArtworkFrame,
 findAIGReal3DVisibleAlphaROI,collectAIGReal3DSourceBoundingCorners,
 createAIGReal3DAdaptivePreviewGate}
 from '../aig-real3d-v102-adaptive-frame.mjs';
const sha='a'.repeat(64);
function scene(){
 const scene=createAIG3DScene({id:'v102trueSource',consumer:'FastModel',
  units:'METERS',source:'SOURCE_INDEXED_MESH_QA'});
 addAIG3DNode(scene,{id:'realSourceShip',kind:'object',
  mesh:createAIG3DBox([1,2,.6],'V102_TEST_TRUE_XYZ_SOURCE'),
  source:'OBSERVED_SCENE_SOURCE',
  transform:{position:[.4,1.1,-.4],rotationDeg:[0,23,0]}});
 return scene;
}
test('V102 off-centre 3:2 AI reference picture composition drives actual camera, not original mesh re-creation',()=>{
 const s=scene(),old=JSON.stringify(s);
 const picture=planAIGReal3DAdaptiveArtworkFrame({
  scene:s,artworkWidth:1536,artworkHeight:1024,
  subjectROI:{x:640,y:76,width:740,height:860},
  yaw:.44,pitch:.20,originalImageSha256:sha});
 assert.equal(picture.artworkWidth,1536);
 assert.equal(picture.artworkHeight,1024);
 assert.equal(picture.aspectRatio,1.5);
 assert.equal(picture.modelFitsInsideOriginalArtworkROI,true);
 assert.ok(picture.projected3DBoundsInArtworkPixels.minX>=640);
 assert.ok(picture.projected3DBoundsInArtworkPixels.maxX<=1380);
 assert.ok(picture.projected3DBoundsInArtworkPixels.minY>=76);
 assert.ok(picture.projected3DBoundsInArtworkPixels.maxY<=936);
 assert.notEqual(picture.camera.focus[0],0);
 assert.equal(picture.cameraOnlyFramingNoGeometryEdits,true);
 assert.equal(picture.sourceTrianglesRetessellated,0);
 assert.equal(JSON.stringify(s),old);
});
test('V102 9:16/16:9/1:1 portraits and flyby all keep mesh INSIDE exact source artwork without stretching',()=>{
 const s=scene();
 for(const [w,h] of [[1080,1920],[3840,2160],[1024,1024],[720,1544]]){
  const r=planAIGReal3DAdaptiveArtworkFrame({
   scene:s,artworkWidth:w,artworkHeight:h,subjectROI:{
    x:w*.2,y:h*.15,width:w*.6,height:h*.72},
   originalImageSha256:sha,yaw:Math.PI/2,pitch:.24});
  assert.equal(r.modelFitsInsideOriginalArtworkROI,true);
  assert.equal(r.aspectRatio,w/h);
  assert.equal(r.camera.projection,'orthographic');
  assert.equal(r.originalImageAspectPreserved,true);
 }
});
test('V102 conservative transformed node bounding boxes only need eight transformed corners, not O(mesh vertices) per camera',()=>{
 const s=scene(),source=JSON.stringify(s);
 const out=collectAIGReal3DSourceBoundingCorners(s);
 assert.equal(out.length,8);
 assert.equal(JSON.stringify(s),source);
 assert.ok(out.some(p=>p[0]>.5));
});
test('V102 transparent original AI artwork ROI can be measured, opaque RGB is NOT falsely called segmented face',()=>{
 const width=160,height=120,
  rgba=new Uint8ClampedArray(width*height*4);
 for(let y=23;y<106;y++)for(let x=40;x<112;x++){
  const i=(y*width+x)*4;rgba[i+3]=255;
 }
 const found=findAIGReal3DVisibleAlphaROI({rgba,width,height});
 assert.equal(found.alphaDerivedROI,true);
 assert.deepEqual(found.subjectROI,{x:40,y:23,width:72,height:83});
 for(let i=3;i<rgba.length;i+=4)rgba[i]=255;
 const opaque=findAIGReal3DVisibleAlphaROI({rgba,width,height});
 assert.equal(opaque.alphaDerivedROI,false);
 assert.deepEqual(opaque.subjectROI,{x:0,y:0,width,height});
 assert.equal(opaque.nonTransparentRGBSemanticSegmentationNotInvented,true);
});
test('V102 coalesces AI generated snapshots into one GPU frame, throttles while rebuild active, never triggers 4K',()=>{
 const s=scene(),gate=createAIGReal3DAdaptivePreviewGate({
  aiActiveMinIntervalMs:250,idleMinIntervalMs:16});
 let count=0;
 gate.enqueue({scene:s,sourceRevision:1,sourceSHA:sha});
 gate.setAIRebuilderBusy(true);
 gate.enqueue({scene:s,sourceRevision:2,sourceSHA:sha});
 const drawn=(scene,data)=>{
  assert.equal(data.sourceRevision,count===0?2:4);
  count++;return {status:'WEBGL_XYZ_TRIANGLES_RENDERED'};
 };
 assert.equal(gate.pump(100,drawn).status,'RENDERED_LATEST_SOURCE');
 gate.enqueue({scene:s,sourceRevision:3,sourceSHA:sha});
 gate.enqueue({scene:s,sourceRevision:4,sourceSHA:sha});
 assert.equal(gate.pump(110,drawn).status,'SKIPPED_GPU_PREVIEW_THROTTLED');
 assert.equal(gate.pump(350,drawn).status,'RENDERED_LATEST_SOURCE');
 assert.equal(count,2);
 assert.equal(gate.snapshot().coalescedSupersededModels,2);
 assert.equal(gate.snapshot().maxQueuedFullMeshSnapshots,1);
 assert.equal(gate.snapshot().no4KReadbackTriggeredByPreview,true);
 assert.equal(gate.snapshot().actualAIPipelineRunInParallelThread,false);
 assert.equal(gate.pump(750,drawn).status,'SKIPPED_NO_NEW_FRAME');
});
test('V102 neither fabricated image ROI nor forged mesh provenance is silently allowed',()=>{
 const s=scene();
 assert.throws(()=>planAIGReal3DAdaptiveArtworkFrame({
  scene:s,artworkWidth:256,artworkHeight:256,
  subjectROI:{x:250,y:10,width:45,height:80}}),/IMAGE_FRAME_OR_SUBJECT_REGION_INVALID/);
 assert.throws(()=>planAIGReal3DAdaptiveArtworkFrame({
  scene:s,artworkWidth:256,artworkHeight:256,originalImageSha256:'FAKE_SOURCE'
 }),/ARTWORK_DIMENSIONS_OR_SOURCE_UNTRUSTED/);
 assert.throws(()=>collectAIGReal3DSourceBoundingCorners({
  schema:'FAKE_2D_BILLBOARD',nodes:[]}),/ACTUAL_INDEXED_SCENE_REQUIRED/);
 const gate=createAIGReal3DAdaptivePreviewGate();
 assert.throws(()=>gate.enqueue({scene:s,sourceRevision:1,sourceSHA:'bad'}),
  /PREVIEW_SOURCE_VERSION_OR_SHA_REQUIRED/);
});
