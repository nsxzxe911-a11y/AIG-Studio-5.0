/** AIG FastModel 4.1: original, zero-credit implicit volume preview.
 * No triangulation in the editor's animation loop; output GLB from 4.0
 * remains an explicit export path. A sparse humanoid SDF is a DRAFT only:
 * unobserved limbs, hair and skirt are heuristics, not solved from the photo.
 */
import {Aig42GpuTimer} from './aig-performance-4-2.mjs';
export const AIG_SDF_VERSION='AIG_FASTMODEL_4_1_IMPLICIT_VOLUME_DRAFT';
const finite=(x,lo,hi)=>Number.isFinite(x)&&x>=lo&&x<=hi;
export function createImplicitScene(scaffold){
 const p=scaffold?.proportions;
 if(!p||!Array.isArray(p.ratiosByImageHeight)||p.ratiosByImageHeight.length!==11||
    typeof scaffold.sourceSHA256!=='string'||!/^[a-f0-9]{64}$/.test(scaffold.sourceSHA256))
  throw Error('AIG41_VALIDATED_4_0_SCAFFOLD_REQUIRED');
 if(!p.ratiosByImageHeight.every(v=>finite(v.widthRatio,0,2)&&finite(v.centerRatio,-.5,1.5)))
  throw Error('AIG41_PROPORTION_NONFINITE');
 const value=i=>p.ratiosByImageHeight[i].widthRatio;
 // Width bands are a measured silhouette, not identified body landmarks.
 // Bounded heuristic avoids monstrous dimensions from a broad skirt/pose.
 const shoulder=Math.max(.09,Math.min(.25,(value(2)+value(3))*.29));
 const hip=Math.max(.09,Math.min(.25,value(5)*.32));
 const skirt=Math.max(.14,Math.min(.34,value(7)*.47));
 const head=Math.max(.055,Math.min(.13,value(1)*.39));
 const params={headRadius:head,shoulderRadius:shoulder,hipRadius:hip,
   skirtRadius:skirt,neckRadius:Math.max(.022,head*.32),
   hairRadius:Math.min(.17,head*1.29),
   armRadius:Math.max(.025,shoulder*.23),
   legRadius:Math.max(.032,hip*.32)};
 return {schema:AIG_SDF_VERSION,sourceSHA256:scaffold.sourceSHA256,
  scaffoldSchema:scaffold.schema||null,
  primitiveCount:10,parameterCount:Object.keys(params).length,
  parameters:params,hiddenSurfacesInferred:true,
  inferredParts:['face depth','neck back','hair volume','arms','legs','skirt rear'],
  observedEvidence:'SOURCE_2D_SILHOUETTE_ONLY',
  implicitGeometryInEditor:true,exportTriangulationNeeded:true,
  gpuRenderingRequiresWebGL2:true,realWomanMeshApproved:false,
  articulationReady:false,skinWeightsPresent:false,
  formalHeroineApproved:false,releaseAllowed:false,
  noCreditsSpent:true,networkRequestsMade:0};
}
export function sdSphere(point,center,radius){
 return Math.hypot(point[0]-center[0],point[1]-center[1],point[2]-center[2])-radius;
}
export function sdCapsule(point,a,b,radius){
 const ab=b.map((v,i)=>v-a[i]),ap=point.map((v,i)=>v-a[i]);
 const t=Math.max(0,Math.min(1,ap.reduce((s,v,i)=>s+v*ab[i],0)/
   Math.max(1e-12,ab.reduce((s,v)=>s+v*v,0))));
 return Math.hypot(...point.map((v,i)=>v-(a[i]+t*ab[i])))-radius;
}
export function sdEllipsoidApprox(point,center,axes){
 if(!axes.every(x=>x>0))throw Error('AIG41_AXIS_INVALID');
 const q=point.map((v,i)=>Math.abs(v-center[i]));
 const k0=Math.hypot(...q.map((v,i)=>v/axes[i]));
 const k1=Math.hypot(...q.map((v,i)=>v/(axes[i]*axes[i])));
 return k0*(k0-1)/Math.max(k1,1e-12);
}
export function smoothMin(a,b,k){
 const h=Math.max(k-Math.abs(a-b),0)/k;
 return Math.min(a,b)-h*h*k*.25;
}
export function fieldAt(point,scene){
 const q=scene.parameters;
 if(!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite))
  throw Error('AIG41_POINT_INVALID');
 const head=sdSphere(point,[0,.385,.005],q.headRadius);
 const neck=sdCapsule(point,[0,.245,0],[0,.340,0],q.neckRadius);
 const torso=sdEllipsoidApprox(point,[0,.095,0],[q.shoulderRadius,.205,.085]);
 const pelvis=sdEllipsoidApprox(point,[0,-.095,0],[q.hipRadius,.09,.095]);
 let skin=smoothMin(head,neck,.055);
 skin=smoothMin(skin,torso,.07);skin=smoothMin(skin,pelvis,.05);
 for(const sign of [-1,1]){
  const shoulder=[sign*q.shoulderRadius*.95,.18,0];
  const wrist=[sign*(q.shoulderRadius+q.armRadius*.9),-.15,0];
  const arm=sdCapsule(point,shoulder,wrist,q.armRadius);
  skin=Math.min(skin,arm);
  const leg=sdCapsule(point,[sign*q.hipRadius*.45,-.10,0],
   [sign*q.hipRadius*.45,-.46,0],q.legRadius);
  skin=Math.min(skin,leg);
 }
 const skirt=sdEllipsoidApprox(point,[0,-.17,-.005],[q.skirtRadius,.17,.13]);
 const hair=sdEllipsoidApprox(point,[0,.25,-.075],[q.hairRadius,.235,.072]);
 return Math.min(skin,skirt,hair);
}
// WebGL2 shader: no per-frame mesh/indices regeneration, analytic SDFs.
export const AIG41_VERTEX=`#version 300 es
in vec2 aPosition;
out vec2 uv;
void main(){uv=aPosition;gl_Position=vec4(aPosition,0.,1.);}`;
export const AIG41_FRAGMENT=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 fragColor;
uniform vec2 uResolution;
uniform float uYaw;
uniform float uStepLimit;
uniform vec4 uSizeA; // head, shoulder, hip, skirt
uniform vec4 uSizeB; // neck, hair, arm, leg
float ellipsoid(vec3 p,vec3 r) {
  float k0=length(p/r);
  float k1=length(p/(r*r));
  return k0*(k0-1.)/max(k1,1e-5);
}
float capsule(vec3 p,vec3 a,vec3 b,float r){
  vec3 pa=p-a,ba=b-a;
  return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.))-r;
}
float smoothUnion(float a,float b,float k){
  float h=max(k-abs(a-b),0.)/k;
  return min(a,b)-h*h*k*.25;
}
vec2 map(vec3 p){
  float head=length(p-vec3(0.,.385,.005))-uSizeA.x;
  float neck=capsule(p,vec3(0.,.245,0.),vec3(0.,.340,0.),uSizeB.x);
  float torso=ellipsoid(p-vec3(0.,.095,0.),vec3(uSizeA.y,.205,.085));
  float hip=ellipsoid(p-vec3(0.,-.095,0.),vec3(uSizeA.z,.09,.095));
  float body=smoothUnion(smoothUnion(smoothUnion(head,neck,.055),torso,.07),hip,.05);
  for(int i=0;i<2;i++){
    float side=i==0?-1.:1.;
    vec3 a=vec3(side*uSizeA.y*.95,.18,0.);
    vec3 b=vec3(side*(uSizeA.y+uSizeB.z*.9),-.15,0.);
    body=min(body,capsule(p,a,b,uSizeB.z));
    body=min(body,capsule(p,vec3(side*uSizeA.z*.45,-.1,0.),
      vec3(side*uSizeA.z*.45,-.46,0.),uSizeB.w));
  }
  float skirt=ellipsoid(p-vec3(0.,-.17,-.005),vec3(uSizeA.w,.17,.13));
  float hair=ellipsoid(p-vec3(0.,.25,-.075),vec3(uSizeB.y,.235,.072));
  float d=min(min(body,skirt),hair);
  float m=d==hair?2.:d==skirt?1.:0.;
  return vec2(d,m);
}
vec3 normalAt(vec3 p){
  float e=.002;
  return normalize(vec3(
  map(p+vec3(e,0.,0.)).x-map(p-vec3(e,0.,0.)).x,
  map(p+vec3(0.,e,0.)).x-map(p-vec3(0.,e,0.)).x,
  map(p+vec3(0.,0.,e)).x-map(p-vec3(0.,0.,e)).x));
}
void main(){
  vec2 st=uv;
  st.x*=uResolution.x/max(1.,uResolution.y);
  float c=cos(uYaw),s=sin(uYaw);
  vec3 ro=vec3(s*1.7,0.,c*1.7);
  vec3 front=normalize(-ro),right=vec3(c,0.,-s),up=vec3(0.,1.,0.);
  vec3 rd=normalize(front+st.x*right+st.y*up);
  // Conservative world-space bound: avoid expensive SDF on empty pixels.
  // Current procedural mannequin is strictly within a sphere of radius .75.
  float b=dot(ro,rd);
  float determinant=b*b-dot(ro,ro)+.75*.75;
  if(determinant<=0.){
    fragColor=vec4(.015,.032,.06,1.);return;
  }
  float sphereRoot=sqrt(determinant);
  float travel=max(0.,-b-sphereRoot);
  float exitDistance=-b+sphereRoot;
  vec2 hit=vec2(1.,0.);
  for(int j=0;j<96;j++){
    if(float(j)>=uStepLimit||travel>exitDistance)break;
    hit=map(ro+rd*travel);
    if(hit.x<.002)break;
    travel+=max(hit.x*.78,.0025);
  }
  if(hit.x>.004||travel>exitDistance){
    fragColor=vec4(.015,.032,.06,1.);return;
  }
  vec3 pos=ro+rd*travel;
  vec3 n=normalAt(pos);
  vec3 light=normalize(vec3(-.4,.8,1.));
  float brightness=.20+.8*max(0.,dot(n,light));
  vec3 skin=vec3(.80,.63,.61),dress=vec3(.55,.68,.79),hair=vec3(.29,.18,.13);
  vec3 surface=hit.y>1.5?hair:(hit.y>.5?dress:skin);
  fragColor=vec4(pow(surface*brightness,vec3(.88)),1.);
}`;
function shader(gl,source,kind){
 const sh=gl.createShader(kind);gl.shaderSource(sh,source);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){
  const error=gl.getShaderInfoLog(sh);gl.deleteShader(sh);
  throw Error('AIG41_SHADER_COMPILE_'+error);
 }return sh;
}
export class AigImplicitRenderer {
 constructor(canvas,scene,{pixelScale=.75,maxSteps=64}={}){
  if(!canvas||!scene?.parameters)throw Error('AIG41_CANVAS_AND_SCENE_REQUIRED');
  this.canvas=canvas;this.scene=scene;
  this.gl=canvas.getContext('webgl2',{alpha:false,depth:false,antialias:false});
  if(!this.gl)throw Error('AIG41_WEBGL2_UNAVAILABLE');
  const gl=this.gl;const a=shader(gl,AIG41_VERTEX,gl.VERTEX_SHADER);
  const b=shader(gl,AIG41_FRAGMENT,gl.FRAGMENT_SHADER);
  this.program=gl.createProgram();gl.attachShader(this.program,a);
  gl.attachShader(this.program,b);gl.linkProgram(this.program);
  gl.deleteShader(a);gl.deleteShader(b);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))
   throw Error('AIG41_SHADER_LINK_'+gl.getProgramInfoLog(this.program));
  this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  this.loc=gl.getAttribLocation(this.program,'aPosition');
  this.uniforms=Object.fromEntries(['uResolution','uYaw','uStepLimit','uSizeA','uSizeB']
    .map(k=>[k,gl.getUniformLocation(this.program,k)]));
  this.pixelScale=Math.max(.35,Math.min(1,pixelScale));
  this.maxSteps=Math.max(24,Math.min(96,maxSteps|0));
  this.gpuTimer=new Aig42GpuTimer(gl);
  this.disposed=false;
 }
 configure({pixelScale=this.pixelScale,maxSteps=this.maxSteps}={}){
  if(this.disposed)throw Error('AIG41_RENDERER_DISPOSED');
  if(!Number.isFinite(pixelScale)||!Number.isFinite(maxSteps))throw Error('AIG41_QUALITY_INVALID');
  this.pixelScale=Math.max(.35,Math.min(1,pixelScale));
  this.maxSteps=Math.max(24,Math.min(96,maxSteps|0));
 }
 draw(yaw=0){
  if(this.disposed)throw Error('AIG41_RENDERER_DISPOSED');
  const gl=this.gl;
  const w=Math.min(960,Math.max(96,Math.round(this.canvas.clientWidth*this.pixelScale)));
  const h=Math.min(640,Math.max(96,Math.round(this.canvas.clientHeight*this.pixelScale)));
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
  const completedGpuSample=this.gpuTimer.poll();
  gl.viewport(0,0,w,h);gl.useProgram(this.program);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(this.loc);
  gl.vertexAttribPointer(this.loc,2,gl.FLOAT,false,0,0);
  gl.uniform2f(this.uniforms.uResolution,w,h);
  gl.uniform1f(this.uniforms.uYaw,yaw);
  gl.uniform1f(this.uniforms.uStepLimit,this.maxSteps);
  const p=this.scene.parameters;
  gl.uniform4f(this.uniforms.uSizeA,p.headRadius,p.shoulderRadius,p.hipRadius,p.skirtRadius);
  gl.uniform4f(this.uniforms.uSizeB,p.neckRadius,p.hairRadius,p.armRadius,p.legRadius);
  const queryStarted=this.gpuTimer.begin();
  try{gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}
  finally{if(queryStarted)this.gpuTimer.end();}
  return {renderPixels:w*h,rayStepsLimit:this.maxSteps,angleRadians:yaw,
    gpuSample:completedGpuSample,gpuTimerSupported:this.gpuTimer.supported,
    result:'GPU_COMMAND_SUBMITTED_NOT_GPU_FPS_PROVEN'};
 }
 dispose(){
  if(this.disposed)return;
  this.disposed=true;
  this.gpuTimer?.dispose();
  this.gl?.deleteBuffer(this.buffer);
  this.gl?.deleteProgram(this.program);
 }
}
