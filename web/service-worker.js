/* AIG II portal and CNC Studio must never replace each other's cached HTML. */
const CACHE_PREFIX="aig-studio-runtime-";
const CACHE_NAME=CACHE_PREFIX+"375-portal-separated-from-studio-v1";
const APP_SHELL=["./","./index.html","./portal.css","./portal.js","./studio.html","./aigii-skin.css","./aigii-overlay.js","./manifest.webmanifest"];

self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 const pathname=url.pathname;
 if(request.mode==="navigate"){
   const fallback=pathname.endsWith("/studio.html")?"./studio.html":pathname.endsWith("/gallery.html")?"./gallery.html":"./index.html";
   event.respondWith(fetch(request).then(async response=>{
     if(response&&response.ok){
       const cache=await caches.open(CACHE_NAME);
       await cache.put(fallback,response.clone());
     }
     return response;
   }).catch(async()=>{
     const cache=await caches.open(CACHE_NAME);
     return(await cache.match(fallback))||new Response("離線快取尚未就緒",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
   }));
   return;
 }
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(async response=>{
   if(response&&response.ok){
     const cache=await caches.open(CACHE_NAME);
     await cache.put(request,response.clone());
   }
   return response;
 })));
});
