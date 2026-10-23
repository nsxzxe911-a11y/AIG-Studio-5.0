import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {join} from 'node:path';
import {publishAIG316SnapshotManifest}
 from './aig-stage-snapshot-gate-3-16.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function fixture(same=false){
 const out=await mkdtemp(join(os.tmpdir(),'aig316-'));
 const files=[];
 for(const stage of ['01-source','heroine-front',
  'heroine-profile','heroine-rear']){
  const data=Buffer.from(same&&stage.startsWith('heroine')?'DUPLICATE':stage);
  const path=join(out,stage+'.png');
  await writeFile(path,data);
  files.push({stage,relativePath:path,sha256:hash(data),
   rendererActualTriangleEvidence:56000,
   screenshotCapturedFromActualCanvas:true});
 }
 return {out,files};
}
test('cannot mark screenshots PASS when front/side/back byte-identical',async()=>{
 const f=await fixture(true);
 try{
  await assert.rejects(()=>publishAIG316SnapshotManifest({
   out:f.out,device:'phone',stages:f.files
  }),/AIG316_REPEATED_PNGS/);
 }finally{await rm(f.out,{recursive:true,force:true})}
});
test('distinct actual canvas screenshot hashes can publish only TECHNICAL evidence, not human likeness',async()=>{
 const f=await fixture(false);
 try{
  const m=await publishAIG316SnapshotManifest({
   out:f.out,device:'phone',stages:f.files});
  assert.equal(m.actualCanvasSnapshots.length,4);
  assert.equal(m.certifiedDistinctRenderedViews,true);
  assert.equal(m.finalAvatarReleasePASS,false);
  assert.equal(m.sourceReferenceFaceLikenessApproved,false);
  assert.ok(m.sourceDisclaimer.includes('synthetic human silhouette'));
 }finally{await rm(f.out,{recursive:true,force:true})}
});
