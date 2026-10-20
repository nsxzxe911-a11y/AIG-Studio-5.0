/* AIG dual-project public information site.
 * The failed V90-V95 Web CNC workspaces are deliberately retired.
 * This Service Worker does NOT touch localStorage/IndexedDB/CNC work copies.
 */
const CACHE="aig-ii-native-release-portal-only-20261020";
const SHELL=[
 "./","./index.html","./native-download.html","./mobile-runtime.html",
 "./studio-375.html","./site.css","./site-v2.css","./site-v21.css",
 "./site-phase4.css","./site-dual-v2.css","./site-dual-latest.css",
 "./site-frontpage-v3.css","./site-v4.css","./site-nature-v24.css",
 "./site-nature-v24.js","./manifest.webmanifest"
];
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
 const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
 const old=/^\/(?:mobile-runtime-v\d+\.html)$/;
 if(old.test(url.pathname)){
  event.respondWith(Response.redirect(new URL("./mobile-runtime.html",self.registration.scope),302));return;
 }
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok&&event.request.mode==="navigate"){
   const copy=response.clone();
   event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{}));
  }
  return response;
 }).catch(async()=>{
  const cached=await caches.match(event.request,{ignoreSearch:true});if(cached)return cached;
  if(event.request.mode==="navigate"){
   const page=url.pathname.split("/").pop();
   const target="./"+page;
   if(SHELL.includes(target)){const file=await caches.match(target);if(file)return file}
   return await caches.match("./index.html")||Response.error();
  }
  return Response.error();
 }));
});
