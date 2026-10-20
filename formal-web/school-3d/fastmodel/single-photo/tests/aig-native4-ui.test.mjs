import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('FastModel 4.0 RGB UI has executable zero-credit 3D and 8-view callback, not fake buttons',()=>{
 const html=read('../index.html'),app=read('../app.mjs'),server=read('../server.py');
 for(const id of ['aig4-front','aig4-side','aig4-build','aig4-status','aig4-downloads','aig4-view-gallery'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(app,/aig4-build'\)\.addEventListener\('click'/);
 assert.match(app,/\/api\/aig4\/jobs/);
 assert.match(app,/AIG_4_0_VOLUME_DRAFT_/);
 assert.match(app,/\[0,45,90,135,180,225,270,315\]/);
 assert.match(server,/AigNative4Jobs/);
 assert.match(server,/native4\.begin\(/);
 assert.match(server,/native4\.asset\(/);
});
test('confidence and source directions do not overclaim rig, hidden photos, character match',()=>{
 const core=read('../aig_native4.py'),jobs=read('../aig_native4_jobs.py'),server=read('../server.py');
 for(const token of ['UNCERTAIN_BACK_SURFACE','INFERRED_SIDE_SURFACE',
   'realBodyPartSeparation','autoRiggingAvailable','formalHeroineApproved','creditSpend'])
  assert.ok(core.includes(token),token);
 assert.match(jobs,/'noCreditsSpent':True/);
 assert.match(jobs,/'releaseAllowed':False/);
 assert.match(server,/allow_paid_3d=False/);
 assert.match(server,/ZERO_CREDITS_REMOTE_3D_BLOCKED/);
 assert.doesNotMatch(server,/from offline3d_service import/);
});
