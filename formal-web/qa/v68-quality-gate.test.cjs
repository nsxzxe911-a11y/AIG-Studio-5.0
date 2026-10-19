/* AIG V68 full-site real display resolution SOURCE gate.
 * Verifies framebuffer size policy and preservation of original CNC algorithms.
 * Does not claim photographic 4K source, calibrated 0.001mm CNC, or WebGL screenshot PASS. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const Q=require("../runtime/v68-visual-quality.js");
let tests=0;
function test(desc,cb){cb();tests++;console.log("PASS "+desc)}
const device=(width,height,ratio=1,memory=8)=>({width,height,ratio,memory,desktop:width>900});
test("UHD output standard is literal 3840x2160, 8,294,400 pixels",()=>{
 assert.deepEqual(Q.RES_4K,{width:3840,height:2160,pixels:8294400})});
test("4K desktop AUTO is real 3840x2160 at native DPR 1",()=>{
 const f=Q.frame({width:3840,height:2160},{mode:"AUTO",device:device(3840,2160,1)});
 assert.equal(f.width,3840);assert.equal(f.height,2160);assert.ok(f.ultra4kCanvas)});
test("1920x1080 optional ULTRA_4K produces 4K backing by supersampling",()=>{
 const f=Q.frame({width:1920,height:1080},{mode:"ULTRA_4K",device:device(1920,1080,1)});
 assert.equal(f.width,3840);assert.equal(f.height,2160);assert.equal(f.mode,"ULTRA_4K")});
test("1440x3088 native mobile display profile is honored without forced 4K",()=>{
 const f=Q.frame({width:360,height:772},{mode:"AUTO",device:device(360,772,4,8)});
 assert.equal(f.width,1440);assert.equal(f.height,3088);assert.ok(!f.ultra4kCanvas)});
test("weak-memory phone safely limits draw pixels without resizing CSS geometry",()=>{
 const f=Q.frame({width:360,height:772},{mode:"ULTRA_4K",device:device(360,772,4,2)});
 assert.ok(f.pixels<=1600000);assert.equal(f.cssWidth,360);assert.equal(f.cssHeight,772)});
test("respects hardware max renderbuffer and total pixel budget",()=>{
 const f=Q.frame({width:3840,height:2160},{mode:"ULTRA_4K",device:device(3840,2160),
  maxDimension:2048,qualityPixelBudget:3000000});
 assert.ok(f.width<=2048&&f.height<=2048&&f.pixels<=3000000)});
test("respects preexisting FAST / BALANCED scene fidelity without reconfiguring stock",()=>{
 const f=Q.frame({width:1300,height:700},{mode:"ULTRA_4K",device:device(1920,1080),
  qualityMaxDpr:1.5,qualityPixelBudget:1800000});
 assert.ok(f.dpr<=1.5&&f.pixels<=1800000)});
test("reduced adaptive frame scale lowers render pixels without changing coordinates",()=>{
 const args={mode:"ULTRA_4K",device:device(1920,1080)};
 const high=Q.frame({width:1280,height:720},{...args,dynamicScale:1});
 const low=Q.frame({width:1280,height:720},{...args,dynamicScale:.7});
 assert.ok(low.width<high.width&&low.height<high.height);
 assert.equal(low.cssWidth,high.cssWidth);assert.equal(low.cssHeight,high.cssHeight)});
test("unknown quality modes cannot silently change machine outputs",()=>{
 assert.equal(Q.setMode("DANGEROUS_FAKE_4K"),false);
 assert.equal(Q.inspect().cncSafety,"BLOCKED")});
test("main CAD/CAM/NC canvas resize uses real shared quality policy",()=>{
 const s=read("mobile-runtime.html");
 assert.ok(s.includes('<script src="./runtime/v68-visual-quality.js"></script>'));
 assert.equal((s.match(/AIG_V68_VISUAL_QUALITY\?\.frame\(r,\{maxDimension:4096\}\)/g)||[]).length,4);
 assert.ok(s.includes("qualityPixelBudget:cfg.pixels"));
 assert.ok(s.includes("dynamicScale:v32Perf.scale"));
 assert.ok(s.includes("setTransform(dpr,0,0,dpr,0,0)"));
 assert.ok(s.includes("getFidelity"));
 assert.ok(s.includes("getRemoval"))});
test("each original 3AX 4AX 5AX 6AX/NC runtime still exists",()=>{
 const s=read("mobile-runtime.html");
 for(const str of ["axis-3ax-v62.js","axis-4ax-v63.js","axis-5ax-v64.js","axis-6ax-v65.js",
 "data-nc-code","data-cad-canvas","data-cam-canvas"])assert.ok(s.includes(str),str)});
test("independent articulated 6AX and fallback WebGL axes share display policy",()=>{
 const s=read("runtime/6ax-mechanism-preview-v1.js");
 const other=read("axis-scene-v2.js");
 assert.ok(s.includes("AIG_V68_VISUAL_QUALITY?.frame(rect"));
 assert.ok(other.includes("AIG_V68_VISUAL_QUALITY?.frame("));
 assert.ok(s.includes("R.solve(values)"));
 assert.ok(s.includes('machineOutput:"BLOCKED"'))});
test("4K quality button is a REAL callback with stable command ID",()=>{
 const script=read("runtime/v67-global-nav.js");
 assert.ok(script.includes('BTN.GLOBAL.DISPLAY.TOGGLE_4K'));
 assert.ok(script.includes("quality.setMode("));
 assert.ok(script.includes('data-aig68-visual-mode')||read("v68-rgb-4k.css").includes('data-aig68-visual-mode'));
 assert.ok(!script.includes('machineOutput:"PASS"'))});
test("public and runtime both use 4K full-color responsive stylesheet",()=>{
 const css=read("v68-rgb-4k.css"),site=read("site.css"),web=read("mobile-runtime.html");
 assert.ok(site.includes('@import url("./v68-rgb-4k.css");'));
 assert.ok(web.includes('href="./v68-rgb-4k.css"'));
 assert.ok(css.includes("1740px"));
 assert.ok(css.includes("--aig68-neon"));
 assert.ok(!css.includes("image-rendering:pixelated"))});
test("offline shell includes V68 quality essentials, not GLB preload",()=>{
 const worker=read("service-worker.js");
 assert.ok(worker.includes("aig-web-v68-4k-rgb-shell"));
 assert.ok(worker.includes("./runtime/v68-visual-quality.js"));
 assert.ok(worker.includes("./v68-rgb-4k.css"));
 const list=worker.slice(worker.indexOf("const SHELL=["),worker.indexOf("const MAX_DYNAMIC_ENTRIES"));
 assert.ok(!/\.glb|\.pbr|6ax-mechanism-preview/.test(list))});
test("approved 10 mobile RGB pictures are still original non4K authority sources",()=>{
 const images=JSON.parse(read("authority/v67-mobile-approved-source-index.json")).images;
 assert.equal(images.length,10);
 assert.ok(images.every(x=>x.native4K===false&&x.approvedAsVisualSource));
 assert.ok(!images.some(x=>x.approvedForWebLayout===true))});
console.log("AIG_V68_4K_RGB_QUALITY_SOURCE_PASS|"+tests+"_CASES|REAL_BROWSER_4K_PIXELS_PENDING");
