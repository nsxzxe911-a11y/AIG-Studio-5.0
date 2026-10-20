import test from 'node:test';
import assert from 'node:assert/strict';
import {SubmissionJournal} from '../submission.mjs';
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('lost response and reload reuse persisted request identity for the same source and options',()=>{
 const disk=storage();let count=0;const id=()=>String(++count).padStart(32,'0');
 const first=new SubmissionJournal(disk,id);const a=first.begin('source-sha|humanoid|walk');
 const reload=new SubmissionJournal(disk,id);assert.equal(reload.pending()[0].requestId,a);
 assert.equal(reload.begin('source-sha|humanoid|walk'),a);assert.equal(count,1);
 const other=reload.begin('other-sha|humanoid|walk');assert.notEqual(other,a);
 assert.equal(reload.begin('source-sha|humanoid|walk'),a);
 reload.accept('source-sha|humanoid|walk','a'.repeat(32));assert.equal(reload.pending().length,1);
 assert.equal(disk.getItem('aig-photo-job'),'a'.repeat(32));
});
test('accepted jobs survive polling errors; retry resumes instead of submitting another billed job',()=>{
 const disk=storage();let count=0;const id=()=>String(++count).padStart(32,'0');
 const journal=new SubmissionJournal(disk,id),first=journal.begin('photo|human|walk');
 journal.accept('photo|human|walk','c'.repeat(32));
 const reload=new SubmissionJournal(disk,id);
 assert.equal(reload.begin('photo|human|walk'),first);assert.equal(count,1);
 reload.finish('c'.repeat(32));
 assert.notEqual(reload.begin('photo|human|walk'),first);assert.equal(count,2);
});
