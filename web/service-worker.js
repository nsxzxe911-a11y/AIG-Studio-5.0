/* AIG-II public website + separately routed CNC workbench.
   Cache the actual portal and runtime; no engineering gallery in the startup path. */
const REVOKED_CACHE="aig-ii-authority-revocation-20261018-v18";
const PREVIOUS_CACHE="aig-ii-original-render-v4-20261018-v20";
const CACHE="aig-ii-original-render-module-navigation-v27-20261018";
const SHELL=[
  "./","./index.html","./image-library.html","./visual-library.css","./visual-library.js","./visual-library/manifest.json","./visual-library/authority-revocations-438.json","./runtime-visual-reference.css","./runtime/visual-reference-v1.js","./guide.html","./updates.html","./faq.html","./project-sync.html","./site.css","./site-v2.css","./site-v21.css","./site-phase4.css","./project-sync.css","./site.js","./site-v21.js","./project-transfer.js","./project-sync.js","./phase4.css","./mobile-runtime.html","./manifest.webmanifest",
  "./runtime/page-runtime-router.js","./runtime/ai-page-runtime.js","./runtime/cam-manual-path-v1.js",
  "./runtime/layout-mode.js",
  "./runtime-nav-v27.js","./runtime-nav-v27.css",
  "./runtime-uiux-v25.js","./runtime-uiux-v25.css","./uiux-settings.html","./uiux-control-v26.js","./uiux-control-v26.css","./uiux-module-contract-v25.json",
  "./studio-375.html","./studio-375-skin.css","./studio-375-overlay.js","./studio-375-diagnostics.js","./dual-project-latest.html","./dual-latest-binding.json","./site-dual-latest.css",
  "./assets/authority/home_desktop.jpg","./assets/authority/home_mobile.jpg",
  "./site-nature-v24.css","./site-nature-v24.js","./site-themes/forest-dawn.svg","./site-themes/alpine-morning.svg","./site-themes/coastal-twilight.svg",
  "./site-frontpage-v3.css","./site-v4.css","./insights.html","./insights-v4.js","./status.html","./status-v4.js",
  "./ai-updates.html","./ai-updates.js","./ai-update-manifest.json","./site-ai-updates-v1.css",
  "./authority/cam-unified-rgb-v1.css",
  "./authority/desktop-mobile-layout-v1.css",
  "./authority/aigii-rgb-glass-runtime-20261018-v1.css",
  "./authority/aigii-runtime-visual-v2.css",
  "./authority/aigii-axis-module-v3.css",
  "./authority/aigii-axis-fidelity-v4.css",
  "./authority/aigii-ai-cockpit-v2.css",
  "./authority/aigii-cam-sim-workbench-v1.css",
  "./site-dual-v2.css",
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
        const last=path.split("/").pop();
        // Preserve the requested offline page, especially the Studio 375 workspace and UI/UX control center.
        const target="./"+last;
        if(SHELL.includes(target)){
          const requested=await caches.match(target);
          if(requested)return requested;
        }
        const fallback=await caches.match("./index.html");
        if(fallback)return fallback;
      }
      return Response.error();
    })
  );
});
