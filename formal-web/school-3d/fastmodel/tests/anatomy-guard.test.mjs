import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAnatomyMetadata} from '../web/anatomy-guard.mjs';
import {FastModelView} from '../web/renderer.mjs';
test('unknown head/neck never falsely passes continuity',()=>{
 const file={g:{nodes:[{mesh:0},{name:'Head',mesh:1}],meshes:[
  {primitives:[{material:0}]},{primitives:[{material:1}]}
 ]}};
 const r=auditAnatomyMetadata(file);
 assert.equal(r.status,'UNVERIFIED_MISSING_HEAD_OR_NECK_METADATA');
 assert.equal(r.actualGeometricContinuityVerified,false);
 assert.equal(r.protectedMaterials.size,0);
});
test('explicit head and neck semantic tags protect shared materials',()=>{
 const file={g:{nodes:[{mesh:0,extras:{aigAnatomyPart:'head'}},{mesh:1,extras:{aigAnatomyPart:'neck'}},{mesh:2}],
 meshes:[{primitives:[{material:9}]},{primitives:[{material:3}]},{primitives:[{material:9}]}]}};
 const a=auditAnatomyMetadata(file);
 assert.equal(a.status,'HEAD_NECK_METADATA_FOUND_CONTINUITY_NOT_PROVEN');
 assert.deepEqual([...a.protectedMaterials].sort((x,y)=>x-y),[3,9]);
 assert.equal(a.actualGeometricContinuityVerified,false);
});
test('renderer preflight integrates anatomy guard and does not trust skin=1',async()=>{
 const fs=await import('node:fs');
 const r=fs.readFileSync(new URL('../web/renderer.mjs',import.meta.url),'utf8');
 assert.match(r,/auditAnatomyMetadata\(nextFile\)/);
 assert.match(r,/!protectedMaterials\.has\(b\.mat\)/);
 assert.doesNotMatch(r,/skin===1\)\{gl\.deleteVertexArray/);
});
