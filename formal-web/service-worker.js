/* AIG portal-only retirement of the low-grade Web CNC runtimes.
 * This service worker never deletes CAD/CAM/NC drafts in localStorage/IndexedDB.
 * Previously cached executable Web runtime shells are not retained.
 */
const CACHE="aig-ii-portal-native-only-20261020";
const SHELL=["./","./index.html","./mobile-runtime.html","./mobile-runtime-v90.html","./mobile-runtime-v86.html","./studio-375.html",
"./status.html","./guide.html","./image-library.html","./site.css","./site-v2.css","./site-v21.css","./site-phase4.css",
"./site-dual-v2.css","./site-dual-latest.css","./visual-library.css","./site-frontpage-v3.css","./site-v4.css",
"./site-nature-v24.css","./site-nature-v24.js","./site.js","./site-v21.js","./manifest.webmanifest"];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(
  keys.filter(k=>k.startsWith("aig-")&&k!==CACHE).map(k=>caches.delete(k))
 )).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok&&SHELL.includes("."+url.pathname.slice(self.registration.scope.replace(url.origin,"").length-1))){
   const copy=response.clone();
   event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{}));
  }
  return response;
 }).catch(async()=>{
  const cached=await caches.match(event.request,{ignoreSearch:true});
  if(cached)return cached;
  if(event.request.mode==="navigate"){
   const fallback=await caches.match("./mobile-runtime.html");
   if(fallback&&/\/(?:mobile-runtime(?:-v86|-v90)?|studio-375)\.html$/.test(url.pathname))return fallback;
   const home=await caches.match("./index.html");
   if(home)return home;
  }
  return Response.error();
 }));
});
