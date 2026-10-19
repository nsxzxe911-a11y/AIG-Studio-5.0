/* V71: safe, explicit photo geometry handoff. No fabricated CAD commit. */
(function(w,d){"use strict";
const KEY="AIG_V71_PHOTO_CAD_DRAFT";
function validate(g){
 if(!g||g.units!=="mm"||g.origin!=="PHOTO_BOTTOM_LEFT"||!Array.isArray(g.geometry)||!g.geometry.length||g.geometry.length>10000)throw Error("INVALID_PHOTO_GEOMETRY");
 for(const s of g.geometry){
  if(s.type!=="LINE")throw Error("UNSUPPORTED_GEOMETRY");
  for(const p of [s.start,s.end])for(const axis of ["x","y"])
   if(typeof p?.[axis]!=="number"||!Number.isFinite(p[axis])||Math.abs(p[axis])>100000||Math.abs(p[axis]*1000-Math.round(p[axis]*1000))>1e-6)throw Error("INVALID_MM_COORDINATE");
  if(s.start.x===s.end.x&&s.start.y===s.end.y)throw Error("ZERO_LENGTH_LINE");
 }
 return true;
}
function prepare(){
 const api=w.AIG_V69_SOURCE;if(!api?.getTraceContract)throw Error("PHOTO_SOURCE_UNAVAILABLE");
 const draft=api.getTraceContract();validate(draft);
 const payload={schema:"AIG_V71_CAD_DRAFT",sourceHash:draft.sourceHash,reference:draft.reference,units:"mm",origin:draft.origin,geometry:draft.geometry,precisionVerified:false,cadCoreCommitted:false,machineOutput:"BLOCKED"};
 w.sessionStorage.setItem(KEY,JSON.stringify(payload));return payload;
}
function inspect(){let data=null;try{data=JSON.parse(w.sessionStorage.getItem(KEY)||"null")}catch(_){}return {draftPresent:!!data,segments:data?.geometry?.length||0,cadCoreCommitted:false,machineOutput:"BLOCKED"}}
w.AIG_V71_CAD_BRIDGE=Object.freeze({prepare,validate,inspect,storageKey:KEY});
})(window,document);
