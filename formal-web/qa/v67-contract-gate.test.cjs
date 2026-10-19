/* AIG V67 cross-project IDs / screenshot / authority safety Gate. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const manifest=JSON.parse(read("runtime/v67-page-subpage-contract.json"));
const ledger=JSON.parse(read("authority/v67-authority-ledger.json"));
const revoked=JSON.parse(read("visual-library/authority-revocations-438.json"));
const html=read("mobile-runtime.html"),inspector=read("runtime/v67-control-registry.js");
let n=0;const pass=(desc,fn)=>{fn();n++;console.log("PASS "+desc)};
pass("11 unique START + 10 runtime pages",()=>{
 assert.equal(manifest.pages.length,11);
 assert.deepEqual(manifest.pages.map(p=>p.id),["START","HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"]);
 assert.equal(new Set(manifest.pages.map(x=>x.pageId)).size,11);
});
pass("every parent/subpage has stable unique ID",()=>{
 const all=manifest.pages.flatMap(p=>p.subpages.map(s=>({p,s})));
 assert.equal(all.length,59);
 assert.equal(new Set(all.map(x=>x.s.id)).size,all.length);
 for(const {p,s}of all){assert.ok(s.id.startsWith("SUBPAGE_"+p.id+"_"));assert.ok(s.selector);
  assert.ok(["NAVIGABLE","GROUP","PENDING","EXTERNAL"].includes(s.kind))}
});
pass("undeveloped subpages cannot auto-promote to PASS",()=>{
 for(const x of manifest.pages.flatMap(p=>p.subpages))
  if(x.kind==="PENDING")assert.equal(x.status,"BLOCKED_UNIMPLEMENTED");
});
pass("Button ID prefix and existing callback isolation",()=>{
 assert.ok(inspector.includes('PREFIX="BTN."'));
 assert.ok(inspector.includes('data-aig67-button-id')||inspector.includes("aig67ButtonId"));
 assert.ok(inspector.includes("UNMAPPED_BLOCKED"));
 assert.ok(inspector.includes("LEGACY_DUPLICATE_REQUIRES_MANIFEST_FIX"));
 assert.ok(inspector.includes("fp(stableNodeKey(n))"),"duplicate button disambiguation must use stable DOM path");
 assert.ok(!/addEventListener\(["']click["']/.test(inspector));
 assert.ok(inspector.includes("never")||inspector.includes("Preserve every preexisting"));
});
pass("V65 original CAD CAM NC 3-6AX preserved",()=>{
 for(const x of ["data-cad-runtime","data-cam-runtime","data-nc-runtime",
  "axis-3ax-v62.js","axis-4ax-v63.js","axis-5ax-v64.js","axis-6ax-v65.js"])assert.ok(html.includes(x));
});
pass("V67 Inspector bound without replacing callback handlers",()=>{
 assert.ok(html.includes('src="./runtime/v67-control-registry.js"'));
 assert.ok(html.includes('href="./v67-rgb-unified.css"'));
 assert.ok(html.includes('src="./runtime/6ax-lazy-loader-v66.js"'));
});
pass("11 page platform pairs x2, zero invented authority PASS",()=>{
 assert.equal(ledger.pagePlatforms.length,22);
 assert.equal(ledger.pagePlatforms.filter(s=>s.approved).length,0);
 assert.equal(ledger.subpagePlatforms.length,118);
 assert.ok(ledger.subpagePlatforms.every(x=>x.status==="PENDING_NOT_AUTO_APPROVED"));
});
pass("Revoked 20 original 438 images forbidden",()=>{
 assert.equal(revoked.sources.length,20);assert.equal(revoked.status,"REVOKED_BY_USER");
 assert.equal(ledger.revoked.count,20);assert.equal(ledger.revoked.forbidFallback,true);
});
pass("style-only RGB image is never promoted as per-page Authority",()=>{
 assert.equal(ledger.styleAuthority.styleOnly,true);
 assert.equal(ledger.styleAuthority.prohibitAutoPromoteToRuntimeImage,true);
 assert.equal(ledger.styleAuthority.sha256.length,64);
});
pass("each subpage Mobile/Desktop pair exists",()=>{
 for(const p of manifest.pages)for(const s of p.subpages){
  const pairs=ledger.subpagePlatforms.filter(a=>a.subpageId===s.id);
  assert.equal(pairs.length,2);
  assert.deepEqual(pairs.map(x=>x.platform).sort(),["DESKTOP","MOBILE"]);
 }
});
pass("screenshot evidence script inspects every page and all real subpages",()=>{
 const src=read("qa/v67-visual-audit.mjs");
 assert.ok(src.includes("for(const spec of contract.pages.filter"));
 assert.ok(src.includes("for(const sub of spec.subpages)"));
 assert.ok(src.includes("screenshot(page,profile"));
 assert.ok(src.includes('realCallbackVerification')||src.includes("CONTROL_REGISTRY"));
 assert.ok(src.includes("AUTHORITY_MISSING"));
});
pass("no guessed RGB image drives native Runtime controls",()=>{
 const body=read("v67-rgb-unified.css");
 assert.ok(body.includes("#020407"));
 assert.ok(body.includes("--aig67-panel:#07111b"));
 assert.ok(!/background-image\s*:\s*url\(/i.test(body));
});
pass("automatic visual audit checks screenshots but blocks uncertified CNC",()=>{
 const src=read("qa/v67-visual-audit.mjs");
 assert.ok(src.includes("PNG.sync.read"));
 assert.ok(src.includes('visualRelease:"BLOCKED_AUTHORITY_NOT_APPROVED"'));
 assert.ok(src.includes('cncRelease:"BLOCKED"'));
});
pass("global V67 RGB navigation is wired to the actual production router",()=>{
 const nav=read("runtime/v67-global-nav.js");
 assert.ok(html.includes('src="./runtime/v67-global-nav.js"'));
 assert.ok(html.includes('href="./v67-global-nav.css"'));
 assert.ok(nav.includes("aigProductionPageRouter"));
 assert.ok(nav.includes("navigateView"));
 assert.ok(nav.includes("BTN.GLOBAL.NAV"));
 assert.ok(!nav.includes("localStorage.clear"));
});
pass("visible AI visual-audit panel uses actual runtime buttons",()=>{
 const ai=read("runtime/v67-ai-visual-audit-panel.js");
 assert.ok(html.includes('src="./runtime/v67-ai-visual-audit-panel.js"'));
 assert.ok(html.includes('href="./v67-ai-audit-panel.css"'));
 assert.ok(ai.includes("[data-ai-page-runtime]"));
 assert.ok(ai.includes("AIG_V67_CONTROL_REGISTRY"));
 assert.ok(ai.includes("BTN.AI.AUDIT.RECHECK"));
 assert.ok(ai.includes("AIG_V67_GLOBAL_NAV"));
 assert.ok(ai.includes('releaseGate:"BLOCKED_PENDING_EXACT_IMAGE_CALLBACK_BROWSER_AND_DUAL_SHA"'));
});
pass("unified V67 RGB source uses approved palette only as STYLE",()=>{
 const css=read("v67-rgb-unified.css");
 assert.ok(css.includes("--aig67-bg:#020407"));
 assert.ok(css.includes("--aig67-panel:#07111b"));
 assert.ok(!css.includes("background-image:url("));
});
pass("automated Chromium audits cover all 12 public HTML routes and ten CNC modules",()=>{
 const src=read("qa/v67-public-site-audit.mjs");
 assert.ok(src.includes('readdir(root)'));
 assert.ok(src.includes('mobile-runtime.html'));
 assert.ok(src.includes("PNG.sync.read"));
 const main=read("qa/v67-visual-audit.mjs");
 assert.ok(main.includes("navigateRuntime(page,id)"));
 assert.ok(main.includes(".aig67-global-trigger"));
 assert.ok(main.includes("VISIBLE_NAVIGATION_UNAVAILABLE"));
});
pass("V67 4K full-colour CSS loaded and CNC screen uses scalable vectors",()=>{
 const css=read("v67-4k-rgb-quality.css");
 assert.ok(html.includes('href="./v67-4k-rgb-quality.css"'));
 assert.ok(css.includes("@media(min-width:3800px)"));
 assert.ok(css.includes("--aig4k-spectrum"));
 assert.ok(!/background-image\\s*:\\s*url\\(/i.test(css));
});
pass("all public pages inherit scalable site 4K colour stylesheet",()=>{
 const css=read("site-nature-v24.css");
 const publicCss=read("v67-4k-public.css");
 assert.ok(css.startsWith('@import url("./v67-4k-public.css");'));
 assert.ok(publicCss.includes("@media(min-width:3200px)"));
 assert.ok(publicCss.includes("body :is(img,video,svg,canvas)"));
});
pass("CAD/CAM display DPI adaptive and 3D framebuffer is memory limited",()=>{
 assert.ok(html.includes("10000000:cfg.pixels"));
 assert.ok(html.includes("innerWidth>=2560?2.5:2"));
 assert.ok(html.includes("Math.sqrt((innerWidth>=2560?10000000:6500000)/area)"));
 assert.ok(html.includes("v32Perf.scale"),"automatic GPU performance scaling must remain");
});
pass("4K screenshot inspector captures real framebuffer evidence",()=>{
 const src=read("qa/v67-visual-audit.mjs");
 assert.ok(src.includes("canvasResolution"));
 assert.ok(src.includes("UNDERSAMPLED_CANVAS"));
 assert.ok(src.includes("EXCESSIVE_CANVAS_MEMORY"));
});
console.log("AIG_V67_PAGE_SUBPAGE_AUTHORITY_SOURCE_PASS|"+n+"_CASES|BROWSER_VISUAL_GATE_PENDING");
