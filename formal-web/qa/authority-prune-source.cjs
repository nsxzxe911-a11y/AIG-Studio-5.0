"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),path=require("node:path");
const base=path.resolve("formal-web");
const man=JSON.parse(fs.readFileSync(path.join(base,"visual-library/manifest.json"),"utf8"));
const html=fs.readFileSync(path.join(base,"image-library.html"),"utf8");
const revoked=JSON.parse(fs.readFileSync(path.join(base,"visual-library/authority-revocations-438.json"),"utf8"));
assert.equal(man.pages.length,20);
assert.equal(man.authorityPolicy.revoke438Count,20);
assert.equal(revoked.count,20);
assert(man.pages.every(p=>p.websiteStatus==="MISSING_ASSET"||p.websiteStatus==="MISSING_AUTHORITY"));
assert(man.pages.every(p=>p.runtimeEligible===false));
assert.equal(man.pages.filter(p=>p.platform==="MOBILE"&&/^[0-9a-f]{64}$/.test(p.sha256)).length,10);
assert.equal(man.pages.filter(p=>p.platform==="DESKTOP"&&p.revoked438).length,10);
assert(!/visual-library\/(?:pages|icons|candidates)\//.test(html),"Historic image linked in current gallery");
assert(!/DESKTOP-.*-438-SOURCE/.test(html),"Revoked Desktop skin promoted");
assert(html.includes("10/5")&&html.includes("MISSING_AUTHORITY"));
for(const p of man.referenceImages){assert.equal(p.role,"REFERENCE_ONLY");assert(fs.existsSync(path.join(base,p.src.replace(/^\.\//,""))))}
const forbidden=["visual-library/pages/","visual-library/icons/","visual-library/candidates/"];
for(const sub of forbidden){assert(!fs.existsSync(path.join(base,sub))||fs.readdirSync(path.join(base,sub)).filter(x=>/\.(png|jpeg|jpg|webp)$/i.test(x)).length===0,"Discarded asset retained "+sub);}
assert(!fs.existsSync(path.join(base,"assets/authority/home_mobile.jpg")));
assert(!fs.existsSync(path.join(base,"assets/authority/home_desktop.jpg")));
const portal=fs.readFileSync(path.join(base,"index.html"),"utf8");
assert(portal.includes('id="dual-projects"')&&portal.includes('href="./image-library.html"'));
assert(fs.existsSync(path.join(base,"native-download.html")));
console.log("AIG_AUTHORITY_IMAGE_CLEANUP_PASS: mobile SHA manifest, 438 blockade, site-image pruning, current references");
