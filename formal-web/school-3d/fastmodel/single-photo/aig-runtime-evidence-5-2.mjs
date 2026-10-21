/** FastModel 5.2 — actual viewer render-loop evidence.
 * No synthetic FPS is emitted as a device result.
 * frame timestamp = WebGL renderer animation loop's actual timestamp;
 * renderCpuMs = JS renderer.render() wall time, never GPU time.
 */
export const AIG52_SCHEMA='AIG_FASTMODEL_5_2_BROWSER_REAL_FRAME_VISUAL_EVIDENCE_DRAFT';
const finite=Number.isFinite;
const sortedPercentile=(values,q)=>{
 const v=[...values].sort((a,b)=>a-b),p=(v.length-1)*q;
 return v[Math.floor(p)]+(v[Math.ceil(p)]-v[Math.floor(p)])*(p%1);
};
export class Aig52FrameEvidence{
 constructor({sourceSHA256,targetFrames=240,minimumSeconds=2,expectedFps=60}={}){
  if(!/^[a-f0-9]{64}$/i.test(sourceSHA256||'')||!Number.isInteger(targetFrames)||
     targetFrames<120||targetFrames>600||!finite(minimumSeconds)||minimumSeconds<1||
     !finite(expectedFps)||expectedFps<30||expectedFps>240)throw Error('AIG52_EVIDENCE_CONFIG_INVALID');
  this.sourceSHA256=sourceSHA256;
  this.targetFrames=targetFrames;
  this.minimumSeconds=minimumSeconds;
  this.expectedFps=expectedFps;
  this.intervals=[];this.renderCpuTimes=[];this.meta=null;
  this.firstTime=null;this.lastTime=null;this.invalidReason=null;this.done=false;
 }
 addFrame({timeMs,renderCpuMs,width,height,drawCalls,triangles,visibility='visible'}={}){
  if(this.done)return true;
  if(!finite(timeMs)||!finite(renderCpuMs)||renderCpuMs<0||
   !Number.isInteger(width)||width<1||!Number.isInteger(height)||height<1||
   !Number.isInteger(drawCalls)||drawCalls<0||!Number.isInteger(triangles)||triangles<0)
   throw Error('AIG52_MEASUREMENT_NONFINITE_OR_MISSING');
  if(visibility!=='visible'){this.invalidReason='AIG52_PAGE_NOT_VISIBLE';this.done=true;return true;}
  if(this.firstTime===null){this.firstTime=timeMs;this.lastTime=timeMs;}
  else{
   const dt=timeMs-this.lastTime;
   if(!finite(dt)||dt<=0){this.invalidReason='AIG52_MONOTONIC_TIMING_INVALID';this.done=true;return true;}
   this.intervals.push(dt);this.lastTime=timeMs;
  }
  if(this.meta&&(this.meta.width!==width||this.meta.height!==height)){
   this.invalidReason='AIG52_CANVAS_RESIZED_DURING_MEASUREMENT';this.done=true;return true;
  }
  this.meta={width,height,maxDrawCalls:Math.max(this.meta?.maxDrawCalls||0,drawCalls),
   maxTriangles:Math.max(this.meta?.maxTriangles||0,triangles)};
  this.renderCpuTimes.push(renderCpuMs);
  if(this.intervals.length>=this.targetFrames&&
   (this.lastTime-this.firstTime)>=this.minimumSeconds*1000)this.done=true;
  return this.done;
 }
 summary({environment=null,clipName=null,verifiedSource=null}={}){
  const count=this.intervals.length;
  const elapsedMs=this.firstTime===null?0:this.lastTime-this.firstTime;
  const enough=count>=this.targetFrames&&elapsedMs>=this.minimumSeconds*1000;
  const fps=elapsedMs>0?count*1000/elapsedMs:0;
  const budgetMs=1000/this.expectedFps;
  const data=this.intervals;
  const median=data.length?sortedPercentile(data,.5):null;
  const p95=data.length?sortedPercentile(data,.95):null;
  const longest=data.length?Math.max(...data):null;
  const hitchCount=data.filter(t=>t>budgetMs*1.5).length;
  const overBudgetCount=data.filter(t=>t>budgetMs).length;
  const stableFps=enough&&!this.invalidReason&&fps>=this.expectedFps*.95&&
    p95<=budgetMs*1.25&&hitchCount/count<=.02;
  return {schema:AIG52_SCHEMA,sourceSHA256:this.sourceSHA256,
   sourceMatchesCurrentViewer:verifiedSource===this.sourceSHA256,
   runtime:'BROWSER_WEBGL_ANIMATION_LOOP',
   environment,clipName,requestedFrameSamples:this.targetFrames,
   measuredFrameIntervals:count,elapsedMs,framesPerSecond:fps,
   medianFrameMs:median,p95FrameMs:p95,longestFrameMs:longest,
   framesOverTargetBudget:overBudgetCount,framesOverHitchBudget:hitchCount,
   hitchRatio:count?hitchCount/count:null,
   maxDrawCalls:this.meta?.maxDrawCalls??null,maxTriangles:this.meta?.maxTriangles??null,
   actualCanvasPixels:this.meta?this.meta.width*this.meta.height:null,
   canvasSizePx:this.meta?{width:this.meta.width,height:this.meta.height}:null,
   expectedFps:this.expectedFps,measurementCompleted:enough,
   measurementInvalidReason:this.invalidReason,
   observedBrowserFramePacingPassed:stableFps,
   outcome:stableFps&&verifiedSource===this.sourceSHA256?
    'BROWSER_FRAME_TIMING_PASS_ONLY':'BLOCKED',
   gpuExecutionTimeMeasured:false,
   actualNativeAndroid60FpsVerified:false,actualNativeWindows60FpsVerified:false,
   originalCharacterIdentityMatched:false,releaseAllowed:false};
 }
}
