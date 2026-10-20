import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('3.9 has real provider adapter endpoints and action-bound paid submission guard',()=>{
 const server=read('../server.py'),pipeline=read('../pipeline.py'),contract=read('../reconstruction_service.py');
 assert.match(server,/api\/reconstruction\/services/);
 assert.match(server,/api\/reconstruction\/jobs/);
 assert.match(server,/RECONSTRUCTION_AUTOMATION_CONFIRMATION_REQUIRED/);
 assert.match(server,/additionalImages/);
 assert.match(pipeline,/multi-image-to-3d/);
 assert.match(pipeline,/image_urls/);
 assert.match(pipeline,/MULTIVIEW_MAX_FOUR_IMAGES/);
 assert.match(pipeline,/MULTIVIEW_SOURCE_CHANGED/);
 assert.match(contract,/automaticStagesEnabled/);
 assert.match(contract,/verifiedSourceGeometry':False/);
});
test('3.9 formal UI exposes real automated 3D service and 4-view inputs',()=>{
 const html=read('../index.html'),app=read('../app.mjs');
 for(const id of ['reconstruction-service','reconstruction-secondary','reconstruction-phase-status',
                  'reconstruction-evidence-downloads','reconstruction-service-status'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(app,/\/api\/reconstruction\/services/);
 assert.match(app,/\/api\/reconstruction\/jobs/);
 assert.match(app,/autoStages:true/);
 assert.match(app,/additionalImages=await Promise\.all/);
 assert.match(app,/renderReconstruction\(await api/);
 assert.match(app,/reconstructionEvidenceUrl/);
});
test('3.9 archive does not masquerade as completed user-identity GLB',()=>{
 const contract=read('../reconstruction_service.py'),pipeline=read('../pipeline.py');
 assert.match(contract,/faceHairNeckApproved':False/);
 assert.match(contract,/video1080pApproved':False/);
 assert.match(contract,/releaseAllowed':False/);
 assert.match(pipeline,/'releaseAllowed':False/);
});

test('AIG owner requested zero credit mode: no third-party engine or paid default',()=>{
 const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
 const html=read('../index.html'),app=read('../app.mjs'),server=read('../server.py');
 assert.match(html,/AIG 自研幾何重建/);
 assert.match(html,/<select id="reconstruction-service" disabled>/);
 assert.match(html,/<button id="generate" class="primary" disabled>/);
 assert.match(app,/function updateButton\(\)\{[^}]*disabled=true/);
 assert.match(app,/AIG 自研任意照片 3D 核心尚未完成 Gate/);
 assert.match(server,/ZERO_CREDITS_REMOTE_3D_BLOCKED/);
 assert.match(server,/allow_paid_3d=False/);
 assert.doesNotMatch(server,/from offline3d_service import/);
 assert.throws(()=>fs.readFileSync(new URL('../offline3d_service.py',import.meta.url)),
               /ENOENT|no such file/i);
});
