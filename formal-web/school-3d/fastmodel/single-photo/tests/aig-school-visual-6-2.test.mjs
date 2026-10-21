import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 AIG62_SCHEMA,AIG62_REFERENCES,AIG62_DEFAULT_REFERENCE_ID,
 AIG62_WARDROBE_POLICY,verifyAIG62ReferenceFile,pairAIG62WithTechnicalGLB
} from '../aig-school-visual-6-2.mjs';
test('6.2 three visual image records verify real file metadata and keep 2D separate from actual GLB',()=>{
 assert.equal(AIG62_REFERENCES.length,3);
 assert.equal(AIG62_DEFAULT_REFERENCE_ID,AIG62_REFERENCES[2].id);
 for(const item of AIG62_REFERENCES){
  const e=verifyAIG62ReferenceFile({
   id:item.id,fileSHA256:item.sha256,fileBytes:item.bytes,
   width:item.width,height:item.height,mime:item.mime
  });
  assert.equal(e.schema,AIG62_SCHEMA);
  assert.equal(e.sourceImageSHA256,item.sha256);
  assert.equal(e.actual3DGeometryPresent,false);
  assert.equal(e.loadedRealRiggedGLB,false);
  assert.equal(e.releaseAllowed,false);
 }
});
test('6.2 refuses wrong SHA, bytes, dimensions or file type',()=>{
 const a=AIG62_REFERENCES[2],good={
  id:a.id,fileSHA256:a.sha256,fileBytes:a.bytes,width:a.width,height:a.height,mime:a.mime
 };
 for(const delta of [
  {id:'UNKNOWN'},{fileSHA256:'f'.repeat(64)},
  {fileBytes:a.bytes-1},{width:a.width+1},{height:1080},{mime:'image/jpeg'}
 ])assert.throws(()=>verifyAIG62ReferenceFile({...good,...delta}),/AIG62_/);
});
test('6.2 a visual reference must never automatically approve unrelated real GLB geometry',()=>{
 const a=AIG62_REFERENCES[2],e=verifyAIG62ReferenceFile({
  id:a.id,fileSHA256:a.sha256,fileBytes:a.bytes,width:a.width,height:a.height,mime:a.mime
 });
 assert.throws(()=>pairAIG62WithTechnicalGLB(e,{glbSHA256:'bad',
  actualSkinnedMeshCount:9,actualAnimationClipCount:5,
  glbFromSourceImageSHA256:'b'.repeat(64)}),/AIG62_/);
 const pair=pairAIG62WithTechnicalGLB(e,{glbSHA256:'a'.repeat(64),
  actualSkinnedMeshCount:9,actualAnimationClipCount:5,
  glbFromSourceImageSHA256:'b'.repeat(64)});
 assert.equal(pair.visuallyComparedByHuman,false);
 assert.equal(pair.releaseAllowed,false);
});
test('6.2 existing wardrobe and legacy animation remain completely independent',()=>{
 assert.equal(AIG62_WARDROBE_POLICY.otherExistingAnimationOutfitsPreserved,true);
 assert.equal(AIG62_WARDROBE_POLICY.otherOutfitBan,false);
 assert.equal(AIG62_WARDROBE_POLICY.noGlobalWardrobeMutation,true);
 const m=JSON.parse(fs.readFileSync(new URL('../AIG62-SCHOOL-VISUAL-ASSETS.json',import.meta.url),'utf8'));
 assert.equal(m.userCancelledSwimwearDeletion,true);
 assert.equal(m.imagesInGitHubRepository,false);
});
test('6.2 new UI controls are unique and hooked to actual browser file SHA verification',()=>{
 const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const html=read('index.html'),app=read('app.mjs');
 for(const id of ['aig62-select','aig62-file','aig62-verify','aig62-report','aig62-preview','aig62-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 for(const mark of ["$('aig62-verify').addEventListener('click'",
  "$('aig62-report').addEventListener('click'",
  'verifyAIG62ReferenceFile({','await sha256Bytes(raw)','createImageBitmap(file)',
  'new MovieWorkspace(','generateVoiceBatch('])
  assert.ok(app.includes(mark),mark);
});
