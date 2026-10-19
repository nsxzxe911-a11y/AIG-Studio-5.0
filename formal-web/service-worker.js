/* AIG Web V66 — lightweight, resilient, offline-first workspace cache.
 * Critical entry assets only on installation; all other modules/assets cached
 * after on-demand use. Do NOT preload 3AX–6AX GLB/PBR or the full image library.
 * Original V65 runtime behaviors are unchanged. */
const CACHE="aig-web-v66-rgb-shell-20261019-v4";
const DYNAMIC="aig-web-v66-runtime-on-demand-20261019-v4";
const SHELL=[
  "./",
  "./index.html",
  "./mobile-runtime.html",
  "./manifest.webmanifest",
  "./workspace-rgb-v66.css",
  "./workspace-responsive-v66b.css"
];
const MAX_DYNAMIC_ENTRIES=260;
const TIMEOUT_MS=5500;
async function timedFetch(url,init){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort("AIG_NETWORK_TIMEOUT"),TIMEOUT_MS);
 try{return await fetch(url,{...(init||{}),signal:controller.signal})}
 finally{clearTimeout(timeout)}
}

let pruneRunning=false;
async function pruneDynamic(){
 if(pruneRunning)return;pruneRunning=true;
 try{
  const cache=await caches.open(DYNAMIC),keys=await cache.keys();
  if(keys.length>MAX_DYNAMIC_ENTRIES)
   await Promise.all(keys.slice(0,keys.length-MAX_DYNAMIC_ENTRIES).map(key=>cache.delete(key)));
 }finally{pruneRunning=false;}
}
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // A failed optional asset must NOT block installation or wipe existing data.
  await Promise.all(SHELL.map(async url=>{
   try{
    const response=await timedFetch(url,{cache:"reload"});
    if(response.ok)await cache.put(url,response);
   }catch(_){/* optional asset is retried on demand */}
  }));
  // Never activate and remove the preceding offline worker if the two
  // boot entrypoints could not be cached (for example: offline update).
  for(const critical of ["./index.html","./mobile-runtime.html"]){
    if(!await cache.match(critical))throw Error("V66_CRITICAL_SHELL_MISSING:"+critical);
  }
  await self.skipWaiting();
 })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith("aig-")&&!([CACHE,DYNAMIC].includes(k))).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 // Only static same-origin workbench resources are cacheable. Never persist
 // auth, APIs, machine commands or private project downloads in SW cache.
 const path=url.pathname;
 const staticRoute=/\.(?:html|css|js|json|svg|png|jpe?g|webp|glb|gltf|bin|woff2?)$/i.test(path)||path.endsWith("/");
 if(!staticRoute||/\/(?:api|auth|machine|cloud-sync)\//i.test(path))return;
 // Network-first with bounded fail-fast; caches keep the offline boot alive.
 event.respondWith((async()=>{
  const isNavigation=request.mode==="navigate";
  try{
   const response=await timedFetch(request);
   if(response.ok){
    const copy=response.clone();
    event.waitUntil((async()=>{
     try{
      const cache=await caches.open(DYNAMIC);
      await cache.put(request,copy);
      // Image/3D assets are never eagerly downloaded here.
      await pruneDynamic();
     }catch(_){/* storage quota must not break current page */}
    })());
   }
   return response;
  }catch(_){
   const cached=await caches.match(request,{ignoreSearch:true});
   if(cached)return cached;
   if(isNavigation){
    const fallback=await caches.match("./mobile-runtime.html");
    if(fallback&&/mobile-runtime\.html$/.test(url.pathname))return fallback;
    const home=await caches.match("./index.html");
    if(home)return home;
   }
   return Response.error();
  }
 })());
});
