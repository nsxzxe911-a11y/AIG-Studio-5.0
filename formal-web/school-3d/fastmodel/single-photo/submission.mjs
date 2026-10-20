/** Save intent BEFORE upload; recovery never submits another paid task automatically. */
export class SubmissionJournal{
 constructor(storage,id=()=>crypto.randomUUID().replaceAll('-','')){this.storage=storage;this.id=id;this.key='aig-photo-pending';}
 pending(){const raw=this.storage.getItem(this.key);if(!raw)return [];const a=JSON.parse(raw);if(!Array.isArray(a))throw Error('SUBMISSION_JOURNAL_INVALID');return a;}
 accepted(){return JSON.parse(this.storage.getItem('aig-photo-accepted')||'[]');}
 begin(fingerprint){const a=this.pending(),known=[...a,...this.accepted()].find(x=>x.fingerprint===fingerprint);if(known)return known.requestId;
  const requestId=this.id();if(!/^[0-9a-f]{32}$/.test(requestId))throw Error('REQUEST_ID_INVALID');
  a.push({fingerprint,requestId});this.storage.setItem(this.key,JSON.stringify(a));return requestId;
 }
 accept(fingerprint,job){
  const entry=this.pending().find(x=>x.fingerprint===fingerprint)||this.accepted().find(x=>x.fingerprint===fingerprint);
  if(entry)this.storage.setItem('aig-photo-accepted',JSON.stringify([...this.accepted().filter(x=>x.fingerprint!==fingerprint),{...entry,job}]));
  this.storage.setItem('aig-photo-job',job);this.storage.setItem(this.key,JSON.stringify(this.pending().filter(x=>x.fingerprint!==fingerprint)));
 }
 finish(job){this.storage.setItem('aig-photo-accepted',JSON.stringify(this.accepted().filter(x=>x.job!==job)));}
}
