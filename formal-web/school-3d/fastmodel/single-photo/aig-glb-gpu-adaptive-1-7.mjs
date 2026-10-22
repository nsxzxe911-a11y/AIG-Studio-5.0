/**
 * AIG FastModel 1.7: evidence-gated GLB animation GPU presentation governor.
 * Does not edit model, mesh topology, animation clips, skin weights, CAD,
 * material shaders or any source file. Only changes preview pixel ratio.
 * NEVER infer GPU execution time from JS submit, FPS or browser rAF intervals.
 */
export const AIG17_SCHEMA='AIG_FASTMODEL_REAL_GLB_GPU_ADAPTIVE_1_7';
const RATIOS=Object.freeze([.5,.65,.8,1]);
const valid=x=>typeof x==='number'&&Number.isFinite(x);
const quantile=(xs,q)=>{
 const sorted=[...xs].sort((a,b)=>a-b);
 if(!sorted.length)return null;
 return sorted[Math.min(sorted.length-1,Math.ceil(q*sorted.length)-1)];
};
export class Aig17GLBGpuGovernor{
 constructor({targetGpuMs=12,initialTier=3,slowSamples=3,
  fastSamples=20,cooldownSamples=12}={}){
  if(!valid(targetGpuMs)||targetGpuMs<4||targetGpuMs>40||
   !Number.isInteger(initialTier)||initialTier<0||initialTier>=RATIOS.length||
   !Number.isInteger(slowSamples)||slowSamples<2||slowSamples>20||
   !Number.isInteger(fastSamples)||fastSamples<8||fastSamples>100||
   !Number.isInteger(cooldownSamples)||cooldownSamples<0||cooldownSamples>120)
   throw Error('AIG17_GPU_GOVERNOR_POLICY_INVALID');
  this.targetGpuMs=targetGpuMs;this.tier=initialTier;
  this.slowSamples=slowSamples;this.fastSamples=fastSamples;
  this.cooldownSamples=cooldownSamples;this.cooldown=0;
  this.slow=0;this.fast=0;this.accepted=0;this.rejected=0;
  this.samples=[];this.changes=0;
 }
 get pixelRatioFactor(){return RATIOS[this.tier];}
 get report(){
  return Object.freeze({schema:AIG17_SCHEMA,qualityTier:this.tier,
   pixelRatioFactor:this.pixelRatioFactor,targetGpuMs:this.targetGpuMs,
   gpuSamplesAccepted:this.accepted,gpuSamplesIgnored:this.rejected,
   p50GpuMs:quantile(this.samples,.5),p95GpuMs:quantile(this.samples,.95),
   safeQualityChanges:this.changes,liveGLBRequired:true,
   gpuSource:'EXT_disjoint_timer_query_webgl2',
   cpuSubmitIsNotGpuTime:true,nativeAndroidWindowsFpsVerified:false,
   photoLikenessOrArticulatedAnimationApproved:false});
 }
 observe(sample){
  if(sample?.source!=='EXT_disjoint_timer_query_webgl2'||
   sample?.disjoint!==false||!valid(sample.gpuMs)||
   sample.gpuMs<0||sample.gpuMs>1000){
   this.rejected++;return Object.freeze({changed:false,
    reason:'AIG17_NO_TRUSTED_GPU_COMPLETION_MEASUREMENT',
    pixelRatioFactor:this.pixelRatioFactor});
  }
  const ms=sample.gpuMs;this.accepted++;
  this.samples.push(ms);if(this.samples.length>120)this.samples.shift();
  if(this.cooldown>0){
   this.cooldown--;this.slow=0;this.fast=0;
   return Object.freeze({changed:false,reason:'COOLDOWN',
    pixelRatioFactor:this.pixelRatioFactor});
  }
  // Changes are deliberately slow and hysteretic: UI focus shouldn't
  // oscillate between quality presets due to transient animation spikes.
  if(ms>this.targetGpuMs*1.20){
   this.slow++;this.fast=0;
   if(this.slow>=this.slowSamples&&this.tier>0){
    this.tier--;this.changes++;this.slow=0;this.cooldown=this.cooldownSamples;
    return Object.freeze({changed:true,reason:'VALIDATED_GPU_SLOW',
     pixelRatioFactor:this.pixelRatioFactor});
   }
  }else if(ms<this.targetGpuMs*.58){
   this.fast++;this.slow=0;
   if(this.fast>=this.fastSamples&&this.tier<RATIOS.length-1){
    this.tier++;this.changes++;this.fast=0;this.cooldown=this.cooldownSamples;
    return Object.freeze({changed:true,reason:'VALIDATED_GPU_HEADROOM',
     pixelRatioFactor:this.pixelRatioFactor});
   }
  }else{this.slow=0;this.fast=0;}
  return Object.freeze({changed:false,reason:'NO_QUALITY_CHANGE',
   pixelRatioFactor:this.pixelRatioFactor});
 }
}
