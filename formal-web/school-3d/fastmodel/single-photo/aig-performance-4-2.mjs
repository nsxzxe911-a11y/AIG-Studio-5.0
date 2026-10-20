/** AIG FastModel 4.2: self-owned adaptive nonblocking 3D viewer policy.
 * No external model, no network, no credits, no timer busy loops.
 * GPU costs are only trusted when sourced from an actual non-disjoint timer query.
 */
export const AIG42_SCHEMA='AIG_NATIVE_4_2_NONBLOCKING_ADAPTIVE_PREVIEW';
export const AIG42_TIERS=Object.freeze([
 Object.freeze({id:'safe',pixelScale:.35,maxSteps:24}),
 Object.freeze({id:'fast',pixelScale:.50,maxSteps:36}),
 Object.freeze({id:'balanced',pixelScale:.70,maxSteps:56}),
 Object.freeze({id:'quality',pixelScale:1.0,maxSteps:88})
]);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export class Aig42Governor {
 constructor({targetGpuMs=12,initialTier=1,slowSamples=3,fastSamples=8,cooldownSamples=6}={}){
  if(!finite(targetGpuMs)||targetGpuMs<4||targetGpuMs>40 ||
     !Number.isInteger(initialTier)||initialTier<0||initialTier>=AIG42_TIERS.length)
   throw Error('AIG42_POLICY_INVALID');
  this.targetGpuMs=targetGpuMs;
  this.tier=initialTier;
  this.slowSamples=Math.max(2,slowSamples|0);
  this.fastSamples=Math.max(4,fastSamples|0);
  this.cooldownSamples=Math.max(2,cooldownSamples|0);
  this.bad=0;this.good=0;this.cooldown=0;this.samples=0;this.lastGpuMs=null;
  this.deviceFpsVerified=false;this.requiresNativeFpsTest=true;
 }
 get quality(){return AIG42_TIERS[this.tier];}
 observe(measurement){
  if(!measurement||measurement.source!=='EXT_disjoint_timer_query_webgl2' ||
     measurement.disjoint!==false||!finite(measurement.gpuMs)||
     measurement.gpuMs<0||measurement.gpuMs>1e5)
   return {status:'IGNORED_UNVERIFIED_GPU_SAMPLE',quality:this.quality,changed:false};
  const gpuMs=measurement.gpuMs;
  this.lastGpuMs=gpuMs;this.samples++;
  if(this.cooldown){this.cooldown--;return {status:'COOLDOWN',quality:this.quality,changed:false};}
  if(gpuMs>this.targetGpuMs*1.1){this.bad++;this.good=0;}
  else if(gpuMs<this.targetGpuMs*.53){this.good++;this.bad=0;}
  else{this.good=0;this.bad=0;}
  if(this.bad>=this.slowSamples&&this.tier>0){
   this.tier--;this.bad=0;this.cooldown=this.cooldownSamples;
   return {status:'REDUCED_WORKLOAD',quality:this.quality,changed:true};
  }
  if(this.good>=this.fastSamples&&this.tier<AIG42_TIERS.length-1){
   this.tier++;this.good=0;this.cooldown=this.cooldownSamples;
   return {status:'RAISED_PREVIEW_QUALITY',quality:this.quality,changed:true};
  }
  return {status:this.tier===0&&this.bad>=this.slowSamples?
   'MINIMUM_WORKLOAD_STILL_SLOW_USE_CACHED_GLB':'NO_CHANGE',
   quality:this.quality,changed:false};
 }
 report(){
  return {schema:AIG42_SCHEMA,quality:this.quality,gpuTimingSupported:this.samples>0,
   lastGpuMs:this.lastGpuMs,targetGpuMs:this.targetGpuMs,
   deviceFpsVerified:false,releaseAllowed:false,creditsUsed:0};
 }
}
// Coalesce bursts from touch, slider and mouse into a SINGLE rAF draw.
// Never post to requestAnimationFrame in a self-rescheduling loop.
export class Aig42FrameCoalescer {
 constructor({requestFrame,draw,cancelFrame=null}={}){
  if(typeof requestFrame!=='function'||typeof draw!=='function')throw Error('AIG42_FRAME_RUNTIME_REQUIRED');
  this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;this.draw=draw;
  this.pending=false;this.closed=false;this.latest=null;this.handle=null;
  this.drawCount=0;this.coalesced=0;
 }
 schedule(value){
  if(this.closed)return false;
  this.latest=value;
  if(this.pending){this.coalesced++;return false;}
  this.pending=true;
  this.handle=this.requestFrame(()=>{
   this.handle=null;this.pending=false;
   if(this.closed)return;
   this.drawCount++;
   this.draw(this.latest);
  });
  return true;
 }
 dispose(){
  if(this.closed)return;
  this.closed=true;
  if(this.pending&&this.cancelFrame&&this.handle!==null)this.cancelFrame(this.handle);
  this.pending=false;this.latest=null;
 }
}
// Nonblocking WebGL2 timer: no gl.finish(), readPixels(), or spin/poll loops.
export class Aig42GpuTimer {
 constructor(gl){
  this.gl=gl;
  this.ext=gl?.getExtension?.('EXT_disjoint_timer_query_webgl2')||null;
  this.queue=[];this.running=null;
  this.supported=!!(this.ext&&gl.createQuery&&gl.beginQuery&&gl.endQuery&&
   gl.getQueryParameter&&gl.getParameter&&gl.deleteQuery);
  this.maxPending=3;this.closed=false;
 }
 begin(){
  if(!this.supported||this.closed||this.running||this.queue.length>=this.maxPending)return false;
  const q=this.gl.createQuery();
  if(!q)return false;
  try{
   this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT,q);
   this.running=q;return true;
  }catch(error){this.gl.deleteQuery(q);this.supported=false;return false;}
 }
 end(){
  if(!this.running)return false;
  try{
   this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
   this.queue.push(this.running);
  }catch(error){this.gl.deleteQuery(this.running);this.supported=false;}
  finally{this.running=null;}
  return true;
 }
 poll(){
  if(!this.supported||this.closed||!this.queue.length)return null;
  // GPU_DISJOINT invalidates all outstanding query measurements.
  if(this.gl.getParameter(this.ext.GPU_DISJOINT_EXT)){
   for(const q of this.queue)this.gl.deleteQuery(q);
   this.queue=[];
   return {source:'EXT_disjoint_timer_query_webgl2',disjoint:true,gpuMs:null};
  }
  const q=this.queue[0];
  if(!this.gl.getQueryParameter(q,this.gl.QUERY_RESULT_AVAILABLE))return null;
  this.queue.shift();
  const ns=this.gl.getQueryParameter(q,this.gl.QUERY_RESULT);
  this.gl.deleteQuery(q);
  return {source:'EXT_disjoint_timer_query_webgl2',
   disjoint:false,gpuMs:ns/1000000};
 }
 dispose(){
  if(this.closed)return;
  this.closed=true;
  if(this.running){
   try{this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);}catch{}
   this.gl.deleteQuery(this.running);
  }
  for(const q of this.queue)this.gl.deleteQuery(q);
  this.queue=[];this.running=null;
 }
}
