/** Read the actual browser-generated Blob bytes without relying on
 * Chromium download-UI events, which can be blocked in CI.
 * This does NOT synthesize a PNG/WebM; bytes come from the renderer Blob URL.
 */
export async function readAIGReal3DBrowserBlobBytes(page,selector){
 const b64=await page.evaluate(async selector=>{
  const link=document.querySelector(selector);
  if(!link?.href?.startsWith('blob:'))
   throw Error('SOURCE_GPU_OR_WEBM_REAL_BLOB_LINK_MISSING');
  const response=await fetch(link.href);
  if(!response.ok)throw Error('NATIVE_GPU_BLOB_UNREADABLE');
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.length<100)throw Error('NATIVE_GPU_BLOB_EMPTY');
  let chars='';
  for(let i=0;i<bytes.length;i+=8192)
   chars+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(chars);
 },selector);
 return Buffer.from(b64,'base64');
}
