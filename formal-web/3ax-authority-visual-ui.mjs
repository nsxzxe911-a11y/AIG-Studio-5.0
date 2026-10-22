/**
 * 3AX Authority reference viewer: only displays a proven original PNG in
 * a separate, non-interactive comparison panel. Never makes controls out
 * of a screenshot. No upload or CNC output.
 */
import {validateAIG3AXManifest,verifyAIG3AXPNGBytes}
 from './3ax-authority-source-gate.mjs';
const $=id=>document.getElementById(id);
const status=$('authority-status'),preview=$('authority-preview');
const input=$('authority-file'),check=$('authority-check'),pick=$('authority-pick');
let objectUrl=null;
const state=(message,ok=false)=>{
 status.textContent=message;
 status.dataset.ok=ok?'true':'false';
};
function clear(){
 preview.hidden=true;
 preview.removeAttribute('src');
 if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}
}
async function manifest(){
 const response=await fetch('./3ax-authority-source.json',{cache:'no-store'});
 if(!response.ok)throw Error('AUTHORITY_SOURCE_MANIFEST_HTTP_'+response.status);
 const candidate=await response.json();
 validateAIG3AXManifest(candidate);
 return candidate.mobile;
}
async function accept(blob,pin){
 clear();
 if(blob.size>16000000||blob.size!==pin.bytes)
  throw Error('SOURCE_PNG_BYTE_LENGTH_OR_SIZE_BLOCKED');
 const result=await verifyAIG3AXPNGBytes(new Uint8Array(await blob.arrayBuffer()),pin);
 if(!result.ok)throw Error(result.reason);
 // Hash match verifies exact registered bytes. Decode independently to reject
 // broken/invalid browser image data, then display as passive reference only.
 const bitmap=await createImageBitmap(blob);
 try{
  if(bitmap.width!==pin.width||bitmap.height!==pin.height)
   throw Error('IMAGE_DECODE_DIMENSIONS_NOT_APPROVED');
 }finally{bitmap.close();}
 objectUrl=URL.createObjectURL(blob);
 preview.src=objectUrl;
 preview.hidden=false;
 state('原圖比對通過：核准手機 3AX PNG 的 SHA-256／864×1536／431467 bytes 完全符合。此圖僅供對照，不等於原生 4K、真機 3D 模型或 CNC 正式介面驗收。',true);
}
check.addEventListener('click',async()=>{
 check.disabled=true;clear();
 state('正在檢查網站是否已放入正確的核准原圖……');
 try{
  const pin=await manifest();
  const url=new URL('./visual-authority/mobile/05_3AX.png',document.baseURI);
  if(url.origin!==location.origin)throw Error('CROSS_ORIGIN_AUTHORITY_ASSET_BLOCKED');
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw Error('MISSING_AUTHORITY_ORIGINAL_HTTP_'+response.status);
  await accept(await response.blob(),pin);
 }catch(error){clear();state('尚未通過核准原圖驗證：'+String(error.message||error)+'。3AX 數值 NC 模擬不受影響；正式圖不採替代品。');}
 finally{check.disabled=false;}
});
pick.addEventListener('click',()=>input.click());
input.addEventListener('change',async()=>{
 const file=input.files?.[0];input.value='';
 if(!file)return;
 pick.disabled=true;clear();state('正在以本機原始 PNG 比對核准 SHA；不會上傳到網站。');
 try{
  const pin=await manifest();
  if(!/\.png$/i.test(file.name))throw Error('LOCAL_ASSET_NOT_PNG');
  await accept(file,pin);
 }catch(error){clear();state('本機圖片驗證 BLOCKED：'+String(error.message||error)+'。未將候選圖視為正式 Authority。');}
 finally{pick.disabled=false;}
});
window.addEventListener('pagehide',clear,{once:true});
