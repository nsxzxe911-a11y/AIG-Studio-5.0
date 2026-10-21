/** Stable FastModel UI command identity for EXISTING real DOM callbacks.
 * This module only tags/validates original buttons; never clones or
 * replaces them and never fakes animation, audio or recorded media.
 */
export const FASTMODEL_CONTROL_SCHEMA='AIG_FASTMODEL_LIVE_COMMAND_BINDINGS_V1';
export const FASTMODEL_CONTROLS=Object.freeze([
 {buttonId:'FASTM.CREATE.BUILD',commandId:'ANIMATION.BUILD',pageId:'create',domId:'aig65-build'},
 {buttonId:'FASTM.OUTPUT.PLAY',commandId:'ANIMATION.PLAY',pageId:'output',domId:'aig65-play'},
 {buttonId:'FASTM.OUTPUT.STOP',commandId:'ANIMATION.STOP',pageId:'output',domId:'aig65-stop'},
 {buttonId:'FASTM.OUTPUT.RECORD',commandId:'MOVIE.RECORD',pageId:'output',domId:'aig65-record'},
 {buttonId:'FASTM.OUTPUT.REVIEW',commandId:'MOVIE.REVIEW',pageId:'output',domId:'aig68-review'},
 {buttonId:'FASTM.OUTPUT.REPORT',commandId:'EVIDENCE.REPORT',pageId:'output',domId:'aig65-report'}
].map(entry=>Object.freeze(entry)));

export function bindFastModelLiveControls(doc) {
 if(!doc?.getElementById||!doc?.querySelectorAll)
  return {ready:false,reason:'DOCUMENT_UNAVAILABLE',count:0};
 const ids=new Set(),doms=new Set();
 const found=[];
 for(const entry of FASTMODEL_CONTROLS) {
  if(ids.has(entry.buttonId)||doms.has(entry.domId))
   throw Error('FASTM_CONTROL_ID_DUPLICATE');
  ids.add(entry.buttonId);doms.add(entry.domId);
  const matches=doc.querySelectorAll('#'+entry.domId);
  if(matches.length!==1 || matches[0].tagName!=='BUTTON')
   return {ready:false,reason:'MISSING_OR_DUPLICATE_REAL_BUTTON:'+entry.domId,count:found.length};
  found.push([entry,matches[0]]);
 }
 for(const [entry,button] of found) {
  // Existing addEventListener handlers on the SAME element remain authoritative.
  button.dataset.aigButtonId=entry.buttonId;
  button.dataset.aigCommandId=entry.commandId;
  button.dataset.aigPageId=entry.pageId;
 }
 return {ready:true,schema:FASTMODEL_CONTROL_SCHEMA,count:found.length,
  ids:FASTMODEL_CONTROLS.map(x=>x.buttonId),
  originalCallbacksPreserved:true,actualFilmNotProvedByThisManifest:true};
}
