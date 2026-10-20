import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('3.8 actual original and optional RGBA preparation both used in billable click-path',()=>{
 const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
 const html=read('../index.html'),app=read('../app.mjs'),server=read('../server.py'),pipeline=read('../pipeline.py'),prep=read('../prepared_input.py');
 for(const name of ['prepared-foreground','prepared-foreground-status'])assert.ok(html.includes('id="'+name+'"'),name);
 assert.match(app,/payload\.preparedImage=preparedImage/);
 assert.match(app,/inspectHeroineImage\(file/);
 assert.match(app,/preparedHash/);
 assert.match(server,/prepared_source=prepared/);
 assert.match(pipeline,/verify_prepared_foreground\(source,prepared_source\)/);
 assert.match(prep,/PREPARED_FOREGROUND_PIXEL_MISMATCH/);
 assert.match(prep,/manualMatteApprovalRequired/);
});
test('3.8 does not claim real approved heroine/GLB or deploy from synthetic CI',()=>{
 const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
 const pipeline=read('../pipeline.py'),prep=read('../prepared_input.py');
 assert.match(pipeline,/'foregroundAndHairEdgesApproved':False/);
 assert.match(pipeline,/'photorealismVerified':False/);
 assert.match(prep,/'real3DModelProduced':False/);
 assert.match(prep,/'formalHeroineApproved':False/);
});
