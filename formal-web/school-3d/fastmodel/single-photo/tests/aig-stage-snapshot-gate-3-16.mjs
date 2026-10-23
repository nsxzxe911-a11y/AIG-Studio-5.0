/**
 * AIG Real3D stage snapshots. The only visual proof is pixels from the
 * actual WebGL <canvas id="viewport">, NOT a whole-page screenshot and
 * NEVER an ImageGen composition. Source fixture identity must be explicit.
 */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export const AIG316_SCHEMA='AIG_REAL3D_3_16_REAL_CANVAS_PER_STAGE_SNAPSHOT_GATE';
export async function takeAIG316WebGLCanvasStage(page,{
 device,stage,out,sourceKind='SYNTHETIC_ANATOMICAL_FIXTURE',
 sourceSha256=null,view=null,appearanceApproved=false
}={}){
 assert.ok(/^[a-z0-9_-]+$/.test(device)&&
 /^[a-z0-9_-]+$/.test(stage)&&typeof out==='string');
 const loc=page.locator('#viewport');
 await loc.scrollIntoViewIfNeeded({timeout:15000});
 // Prevent a state-only camera change from being captured before WebGL draws.
 await page.evaluate(async()=>await new Promise(resolve=>
  requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const stat=await page.evaluate(()=>{
  const canvas=document.getElementById('viewport');
  const proof=JSON.parse(document.getElementById('scan29-proof').textContent);
  const rect=canvas.getBoundingClientRect();
  return {
   canvasWidth:canvas.width,canvasHeight:canvas.height,
   visibleCssWidth:rect.width,visibleCssHeight:rect.height,
   actualWebGLSceneObjectActive:proof.actualWebGLSceneObjectActive===true,
   actualSubmittedTriangles:proof.webGLDrawEvidence?.actualSubmittedTriangles??0,
   approvedSourceGeometry:proof.real315GeometryFirstHeroineViewReview?.finalAppearanceReleasePASS===true,
   actualSourcePhotoSha256:proof.originalSourcePhotoSHA
  };
 });
 assert.ok(stat.canvasWidth>=200&&stat.canvasHeight>=150);
 assert.ok(stat.actualWebGLSceneObjectActive&&
  stat.actualSubmittedTriangles>0,
  'snapshot must have real actively rendered triangles, not fake canvas or PNG');
 assert.equal(stat.approvedSourceGeometry,false,
  'a synthetic technical fixture may not be classified as an approved heroine');
 await mkdir(out,{recursive:true});
 const path=out+'/'+device+'-stage-'+stage+'-ACTUAL-WEBGL-CANVAS.png';
 const bytes=await loc.screenshot({
  path,animations:'disabled',timeout:20000
 });
 assert.ok(bytes.length>7000,'canvas screenshot unexpectedly small / blank');
 const sha256=createHash('sha256').update(bytes).digest('hex');
 return Object.freeze({
  schema:AIG316_SCHEMA,device,stage,view,
  relativePath:path,sha256,
  byteLength:bytes.length,
  screenshotCapturedFromActualCanvas:true,
  fullscreenWebpageScreenshotProhibited:true,
  sourceKind,sourceSha256:sourceSha256??stat.actualSourcePhotoSha256,
  rendererActualTriangleEvidence:stat.actualSubmittedTriangles,
  measuredCanvasPixels:[stat.canvasWidth,stat.canvasHeight],
  faceAndLikenessAccepted:appearanceApproved,
  sourceFixtureIsNotActualUserHeroine:
   sourceKind==='SYNTHETIC_ANATOMICAL_FIXTURE',
  officialReleaseAllowed:false
 });
}
export async function publishAIG316SnapshotManifest({
 out,device,stages=[],distinctViews=['front','profile','rear']
}={}){
 assert.ok(stages.length>=4);
 const views=distinctViews.map(v=>{
  const f=stages.find(x=>x.stage==='heroine-'+v);
  assert.ok(f,'missing genuine canvas screenshot '+v);
  return f;
 });
 const unique=new Set(views.map(x=>x.sha256));
 if(unique.size!==views.length)
  throw Error('AIG316_REPEATED_PNGS: front/profile/rear are pixel-identical; FAIL, never claim different camera snapshots');
 for(const stage of stages){
  const bytes=await readFile(stage.relativePath);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),stage.sha256);
  assert.ok(stage.rendererActualTriangleEvidence>0);
 }
 const manifest={
  schema:AIG316_SCHEMA,device,
  sourceDisclaimer:'All CI screenshots use an explicitly synthetic human silhouette. Not the approved heroine; no face likeness accepted.',
  actualCanvasSnapshots:stages,
  certifiedDistinctRenderedViews:true,
  sourceReferenceFaceLikenessApproved:false,
  stageSnapshotsCanBeUserReviewed:true,
  screenshotEvidenceComplete:true,
  finalAvatarReleasePASS:false
 };
 await writeFile(out+'/'+device+'-stage-snapshots-MANIFEST.json',
  JSON.stringify(manifest,null,2));
 return manifest;
}
