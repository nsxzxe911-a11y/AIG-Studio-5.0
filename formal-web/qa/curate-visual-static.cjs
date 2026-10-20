"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root="formal-web",read=p=>fs.readFileSync(path.join(root,p),"utf8");
const man=JSON.parse(read("visual-library/manifest.json"));
assert.equal(man.schema,"AIG_CURATED_VISUAL_SOURCE_REGISTRY_V5");
assert.equal(man.mobileCurrentApproved.length,11);
assert.equal(man.desktopIndependentSourceNotFinal.length,7);
assert.equal(man.hostedVisualReferences.length,2);
assert.equal(man.removedFromCurrentWebsite.length,44);
assert.equal(man.october05.websiteHosted,false);
assert.equal(man.withdrawn438.status,"REVOKED_BY_USER");
const html=read("image-library.html"),js=read("visual-library.js");
for(const stale of ["./visual-library/pages/","./visual-library/icons/","./visual-library/candidates/"]){
  assert(!html.includes(stale),"Old image link leaked: "+stale);
}
for(const removed of man.removedFromCurrentWebsite){
 assert(!fs.existsSync(removed),"Removed Web image remains: "+removed);
 const alias=removed.replace(/^formal-web\//,"");
 // Protect real HTML/JS/CSS usage rather than guessed image inventories.
 for(const file of ["image-library.html","index.html","site.js","site-v21.js","site-nature-v24.js","visual-library.js"]){
  assert(!read(file).includes("./"+alias),"Website still references deleted image: "+alias+" in "+file);
 }
}
for(const ref of man.hostedVisualReferences){
 const p=ref.path.replace(/^\.\//,"");assert(fs.existsSync(path.join(root,p)),"Public image is missing: "+ref.path);
 assert(html.includes(ref.path));
}
const validsha=s=>/^[a-f0-9]{64}$/.test(s);
for(const item of [...man.mobileCurrentApproved,...man.desktopIndependentSourceNotFinal]){
 assert(validsha(item.sha256));assert(!item.websiteHosted);assert.equal(item.publicImageUrl,null);
 assert(!String(item.source).includes("/438/ImageAuthority/"),"Revoked 438 cannot be used as source");
}
assert(html.includes("MISSING_AUTHORITY"));
assert(!html.includes("href=\"./mobile-runtime.html"));
assert(js.includes("data-visual-kind"));
assert(read("service-worker.js").includes("aig-ii-curated-image-library-20261020"));
assert(fs.existsSync("docs/asset-audit/visual-library-before-curation-20261020.json"));
console.log("AIG_CURATED_IMAGE_LIBRARY_PASS | 44 unused Web copies removed | 11 MOBILE verified Library-only | 7 DESKTOP unpromoted | 2 live public reference images");