/* AIG-II public website + separately routed CNC workbench.
   Cache the actual portal and runtime; no engineering gallery in the startup path. */
const CACHE="aig-ii-site-v21-portal-runtime-20261018-v8";
const SHELL=[
  "./","./index.html","./guide.html","./updates.html","./faq.html","./site.css","./site-v2.css","./site-v21.css","./site.js","./site-v21.js","./mobile-runtime.html","./manifest.webmanifest",
  "./runtime/page-runtime-router.js","./runtime/ai-page-runtime.js",
  "./runtime/layout-mode.js",
  "./authority/cam-unified-rgb-v1.css",
  "./authority/desktop-mobile-layout-v1.css",
  "./authority/aigii-rgb-glass-runtime-20261018-v1.css",
  "./authority/aigii-rgb-glass-style-20261018-v1.json"
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
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  const isNavigation=event.request.mode==="navigate";
  event.respondWith(
    fetch(event.request).then(response=>{
      if(response.ok){
        const copy=response.clone();
        // Keep navigation plus static Runtime assets available after network loss.
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{}));
      }
      return response;
    }).catch(async()=>{
      const cached=await caches.match(event.request,{ignoreSearch:true});
      if(cached)return cached;
      if(isNavigation){
        const path=url.pathname;
        const isRuntime=path.endsWith("/mobile-runtime.html");
        const fallback=await caches.match(isRuntime?"./mobile-runtime.html":"./index.html");
        if(fallback)return fallback;
      }
      return Response.error();
    })
  );
});
