/* AIG Studio / AIG-II V68 — real framebuffer 4K-capable RGB-quality policy.
 * Separates display pixels from CNC geometry precision, voxel resolution,
 * G-code, collision/kinematic safety. No SVG/image is "upscaled to 4K Authority".
 * The caller remains responsible for canvas resize and actual GL draw.
 */
(function(root,factory){"use strict";
 const api=factory(root);
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 if(root)root.AIG_V68_VISUAL_QUALITY=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(w){"use strict";
 const KEY="aig-v68-rgb-quality-mode-v1",RES_4K=Object.freeze({width:3840,height:2160,pixels:8294400});
 const MODES=Object.freeze(["AUTO","ULTRA_4K","BALANCED","SAVER"]);
 const CLAMP=(v,a,b)=>Math.max(a,Math.min(b,v));
 let mode="AUTO",revision=0,lastIssue="",lastFrame=null;
 try{const raw=w?.localStorage?.getItem(KEY);if(MODES.includes(raw))mode=raw}catch(_){}
 const device=()=>({
  width:Math.max(1,Number(w?.innerWidth)||1920),
  height:Math.max(1,Number(w?.innerHeight)||1080),
  ratio:CLAMP(Number(w?.devicePixelRatio)||1,1,4),
  memory:Math.max(0,Number(w?.navigator?.deviceMemory)||0),
  desktop:Math.max(1,Number(w?.innerWidth)||1920)>900
 });
 function policy(options={}){
  const d=options.device||device(),m=MODES.includes(options.mode)?options.mode:mode;
  const desktop=Boolean(d.desktop),memory=d.memory||0;
  const weak=memory>0&&memory<=2;
  const budget=m==="SAVER"?1200000:
   m==="BALANCED"?(desktop?3200000:2200000):
   desktop?RES_4K.pixels:4800000;
  const pixelBudget=weak?Math.min(budget,desktop?2800000:1600000):budget;
  const minNative=CLAMP(Number(d.ratio)||1,1,4);
  // AUTO = native physical pixels; ULTRA_4K = opt-in supersampling (not new
  // source-photo detail). One screen never gets a 4K framebuffer by fiat.
  const targetDpr=m==="ULTRA_4K"&&desktop?Math.max(minNative,2.25):
   m==="SAVER"?Math.min(minNative,1):
   m==="BALANCED"?Math.min(minNative,desktop?1.5:2):
   minNative;
  return Object.freeze({mode:m,desktop,deviceRatio:minNative,pixelBudget,
   targetDpr:CLAMP(targetDpr,.6,desktop?3.25:4),weakMemory:weak,
   target:RES_4K,renderSpace:"CSS pixels scaled to backing pixels; RGBA8-capable context if supported",
   geometryPrecision:"INDEPENDENT",machineSafety:"NOT_CERTIFIED",sourceImageAuthority:"NOT_INFERRED"});
 }
 function frame(rect={},opts={}){
  const p=policy(opts),cssWidth=Math.max(1,Number(rect.width)||1),
   cssHeight=Math.max(1,Number(rect.height)||1);
  const density=Number(opts.qualityMaxDpr);
  const qualityMax=Number.isFinite(density)&&density>0?density:Infinity;
  const qualityPixels=Number(opts.qualityPixelBudget);
  const budget=Number.isFinite(qualityPixels)&&qualityPixels>0?
   Math.min(p.pixelBudget,qualityPixels):p.pixelBudget;
  const dynamicScale=CLAMP(Number(opts.dynamicScale)||1,.5,1);
  const maxDimension=CLAMP(Number(opts.maxDimension)||4096,256,16384);
  const maxDpr=Math.min(p.targetDpr,qualityMax,Math.sqrt(budget/(cssWidth*cssHeight)),
   maxDimension/cssWidth,maxDimension/cssHeight);
  // Prefer up to the real device resolution. A .5 min is used only if the
  // window itself is larger than the supported buffer dimensions.
  const dpr=Math.max(.1,Math.min(maxDpr,Math.max(.1,maxDpr*dynamicScale)));
  const width=CLAMP(Math.floor(cssWidth*dpr),1,maxDimension),
   height=CLAMP(Math.floor(cssHeight*dpr),1,maxDimension);
  const output=Object.freeze({mode:p.mode,cssWidth,cssHeight,width,height,
   dpr,widthScale:width/cssWidth,heightScale:height/cssHeight,pixels:width*height,
   pixelBudget:budget,maxDimension,deviceRatio:p.deviceRatio,
   ultra4kCanvas:width>=RES_4K.width&&height>=RES_4K.height,
   sourcePixelAuthorityUnchanged:true});
  lastFrame=output;return output;
 }
 function glLimit(gl){
  if(!gl)return 4096;
  try{
   const rb=Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
   const vp=gl.getParameter(gl.MAX_VIEWPORT_DIMS);
   const values=[rb,Number(vp?.[0]),Number(vp?.[1])].filter(n=>n>0&&Number.isFinite(n));
   return values.length?Math.min(8192,...values):4096;
  }catch(_){return 4096}
 }
 function setMode(next){
  if(!MODES.includes(next)){lastIssue="INVALID_MODE:"+next;return false}
  if(next===mode)return true;
  mode=next;revision++;
  try{w?.localStorage?.setItem(KEY,mode)}catch(_){}
  try{w?.document?.documentElement?.setAttribute("data-aig68-visual-mode",mode)}catch(_){}
  try{w?.dispatchEvent?.(new CustomEvent("aig68:qualitychange",{detail:{mode,revision}}))}catch(_){}
  try{w?.dispatchEvent?.(new Event("resize"))}catch(_){}
  return true;
 }
 function inspect(){
  return Object.freeze({version:"68.0.0",mode,revision,lastIssue,lastFrame,
   policy:policy(),target4K:RES_4K,frameIsNative4K:!!lastFrame?.ultra4kCanvas,
   colorSpaceClaim:"RGB UI full color; queried GL color bits required for each real context",
   authorityImageGate:"PENDING_EXACT_ORIGINAL_BYTES_AND_PLATFORM_APPROVAL",
   nativeApkExe:"NOT_VERIFIED",cncSafety:"BLOCKED"});
 }
 try{w?.document?.documentElement?.setAttribute("data-aig68-visual-mode",mode)}catch(_){}
 return Object.freeze({version:"68.0.0",MODES,RES_4K,policy,frame,glLimit,setMode,inspect});
});