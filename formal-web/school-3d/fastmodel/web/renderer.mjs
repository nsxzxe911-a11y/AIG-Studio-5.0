import {assertRasterOnly,GRAPHICS_POLICY} from './graphics-policy.mjs';
import {decodeGLB,readAccessor,buildBatches} from './fastmodel-data.mjs';
import {buildEdgeIndex,wireCap,WIRE_MODES,WIRE_DENSITIES,adaptiveWireStep} from './mesh-lines.mjs';
import {surfaceGuideId} from './surface-guides.mjs';
import {ResourceGovernor,makeBudgets,RebuildableCache} from './resource-governor.mjs';
import {checkRenderTarget} from './resolution-policy.mjs';
const VERTEX=`#version 300 es
precision highp float;precision highp int;
layout(location=0)in vec3 pos;
layout(location=1)in vec2 uv;
layout(location=2)in vec4 joints;
layout(location=3)in vec4 weights;
layout(location=4)in vec4 vColor;
uniform highp sampler2D boneTexture;
uniform float zoom;
uniform float angle;
uniform vec3 center;
uniform float aspect;
out vec2 fUv;out vec4 fColor;out float fEditWeight;
uniform int editHighlight;
mat4 bone(int k){return mat4(texelFetch(boneTexture,ivec2(0,k),0),texelFetch(boneTexture,ivec2(1,k),0),texelFetch(boneTexture,ivec2(2,k),0),texelFetch(boneTexture,ivec2(3,k),0));}
void main(){ivec4 j=ivec4(joints+.01);vec4 p=weights.x*(bone(j.x)*vec4(pos,1.))+weights.y*(bone(j.y)*vec4(pos,1.))+weights.z*(bone(j.z)*vec4(pos,1.))+weights.w*(bone(j.w)*vec4(pos,1.));
 float co=cos(angle),si=sin(angle);p.xyz-=center;p.xz=vec2(co*p.x+si*p.z,-si*p.x+co*p.z);gl_Position=vec4(p.x*zoom/aspect,p.y*zoom,clamp(p.z*.1,-.95,.95),1.);fUv=uv;fColor=vColor;fEditWeight=(editHighlight==1&&gl_VertexID<256)?1.0:0.0;
}`;
const FRAGMENT=`#version 300 es
precision highp float;
in vec2 fUv;in vec4 fColor;in float fEditWeight;
uniform sampler2D colorTexture;
uniform vec4 colorFactor;
uniform int hasTexture;
uniform int linePass;
uniform int surfaceGuide;
out vec4 result;
void main(){if(linePass==1){result=vec4(.34,.89,1.0,.46);return;}vec4 c=colorFactor*fColor;if(hasTexture==1)c*=texture(colorTexture,fUv);if(c.a<0.025)discard;vec3 rgb=c.rgb;
 if(surfaceGuide==1)rgb=mix(rgb,vec3(.08,.80,.89),.28*clamp(fEditWeight,0.0,1.0));
 else if(surfaceGuide==2)rgb=pow(clamp(rgb,0.0,1.0),vec3(.86));
 result=vec4(rgb,c.a);}
`;
function compile(gl,type,src){let sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
function program(gl){let p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,VERTEX));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
function unitMat(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let sum=0;for(let k=0;k<4;k++)sum+=a[k*4+r]*b[c*4+k];o[c*4+r]=sum;}return o;}
function fromTRS(n,rotation){const t=n.translation||[0,0,0],q=rotation||n.rotation||[0,0,0,1],s=n.scale||[1,1,1];let [x,y,z,w]=q;return new Float32Array([(1-2*y*y-2*z*z)*s[0],(2*x*y+2*z*w)*s[0],(2*x*z-2*y*w)*s[0],0,(2*x*y-2*z*w)*s[1],(1-2*x*x-2*z*z)*s[1],(2*y*z+2*x*w)*s[1],0,(2*x*z+2*y*w)*s[2],(2*y*z-2*x*w)*s[2],(1-2*x*x-2*y*y)*s[2],0,t[0],t[1],t[2],1]);}
function interpQuat(a,b,f){let dot=a.reduce((s,x,i)=>s+x*b[i],0),end=dot<0?b.map(x=>-x):b;let q=a.map((x,i)=>x*(1-f)+end[i]*f),len=Math.hypot(...q)||1;return q.map(x=>x/len);}
function tracksFor(file){let g=file.g,list=[];for(const a of g.animations||[])for(const ch of a.channels||[]){if(ch.target?.path!=='rotation')continue;const sm=a.samplers[ch.sampler];if(sm.interpolation&&sm.interpolation!=='LINEAR')continue;let times=readAccessor(file,sm.input),values=readAccessor(file,sm.output);list.push({node:ch.target.node,times,values});}return list;}
function animatedWorld(nodes,tracks,t){const rotation=new Map();for(const tr of tracks){let times=tr.times,index=0,tt=t%(times[times.length-1]||1);while(index<times.length-2&&times[index+1]<tt)index++;let f=(tt-times[index])/Math.max(1e-9,times[index+1]-times[index]);f=Math.min(1,Math.max(0,f));let a=Array.from(tr.values.slice(index*4,index*4+4)),b=Array.from(tr.values.slice((index+1)*4,(index+2)*4));rotation.set(tr.node,interpQuat(a,b,f));}
 const parent=Array(nodes.length).fill(-1);nodes.forEach((n,i)=>(n.children||[]).forEach(j=>parent[j]=i));let done=new Array(nodes.length);
 function world(i){if(done[i])return done[i];let n=nodes[i],m=n.matrix?new Float32Array(n.matrix):fromTRS(n,rotation.get(i));return done[i]=parent[i]>=0?mul(world(parent[i]),m):m;}
 return nodes.map((_,i)=>world(i));}
function matsFor(file,world,skinIndex,inv){const skin=file.g.skins[skinIndex],n=skin.joints.length;const out=new Float32Array(4*n*4);
 for(let j=0;j<n;j++){const m=mul(world[skin.joints[j]],inv.subarray(j*16,(j+1)*16));out.set(m,j*16);}return {out,n};}
function chunkedUpload(gl,target,typed,maxBytes){
  gl.bufferData(target,typed.byteLength,gl.STATIC_DRAW);
  const bytesPerElement=typed.BYTES_PER_ELEMENT;
  const step=Math.max(1,Math.floor(maxBytes/bytesPerElement));
  for(let i=0;i<typed.length;i+=step)gl.bufferSubData(target,i*bytesPerElement,typed.subarray(i,Math.min(typed.length,i+step)));
}
function getImageBytes(file,idx){const im=file.g.images[idx];if(!im||im.bufferView===undefined)throw Error('GLB embedded image missing');const bv=file.g.bufferViews[im.bufferView],start=file.bin.byteOffset+(bv.byteOffset||0),bytes=file.arrayBuffer.slice(start,start+bv.byteLength);return new Blob([bytes],{type:im.mimeType||'image/png'});}
export class FastModelView {
 constructor(canvas,onStats=()=>{}){assertRasterOnly(GRAPHICS_POLICY);this.graphicsPolicy=GRAPHICS_POLICY;this.canvas=canvas;this.onStats=onStats;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});if(!this.gl)throw Error('WebGL2 GPU unavailable on this device');const gl=this.gl;const ext=gl.getExtension('EXT_color_buffer_float');this.program=program(gl);this.u={};for(const k of ['zoom','angle','center','aspect','boneTexture','colorTexture','colorFactor','hasTexture','linePass','editHighlight','surfaceGuide'])this.u[k]=gl.getUniformLocation(this.program,k);this.textures=[];this.boneTex=[];this.entries=[];this.mode='full';this.angle=0;this.zoomFactor=1;this.wind=true;this.width=1920;this.height=1080;this.frames=[];this.last=0;this.running=false;this.autoQuality=false;this.qualityDown=0;this.qualityUp=0;gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);this.gpu=gl.getParameter(gl.RENDERER);
 this.governor=new ResourceGovernor({budgets:makeBudgets({deviceMemoryGiB:typeof navigator!=='undefined'?navigator.deviceMemory:4})});
 this.gpuAllocatedEstimateBytes=0;this.cpuDerivedEstimateBytes=0;this.lastPressure=null;this.baseWidth=1920;this.baseHeight=1080;this.frameOrdinal=0;this.surfaceGuide='clean';this.wireMode='off';this.wireDensity='balanced';this.wireState={suppressed:false,hot:0,cool:0};this.wireStats={segments:0,drawCalls:0,gpuBytes:0};this.drawEntries=[];this.inverseBindCache=[];
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.stop();this.onStats({status:'GPU_CONTEXT_LOST',message:'顯示裝置中斷：保留來源模型，停止GPU繪圖。請重新載入，絕不自動清空編輯資料。'});});}
 async load(arrayBuffer,mode='full'){
  // Refuse excessive source assets BEFORE destroying a previously displayed scene.
  if(arrayBuffer.byteLength>this.governor.b.gpuWorkingSetEstimateBytes/2)
    throw Error('模型來源超出保守記憶體預算；原工作區不變。可先建立低 LOD 或在 RAM 更大的裝置載入。');
  // Two-phase load: parse/build/preflight first. Invalid or too large GLB CANNOT clear a live scene.
 const start=performance.now();const nextFile=decodeGLB(arrayBuffer),nextTracks=tracksFor(nextFile),assembled=buildBatches(nextFile,mode);
 const requiredGPU=assembled.batches.reduce((acc,b)=>acc+b.vertices.byteLength+b.indices.byteLength,0);
 if(requiredGPU>this.governor.b.gpuWorkingSetEstimateBytes)throw Error('GPU 繪圖網格推估超過本次預算，保留原有工作區。');
 this.disposeMeshes();this.file=nextFile;this.tracks=nextTracks;this.mode=mode;this.patchStats=null;
 this.stats={sourceMeshes:this.file.g.meshes.length,sourcePrimitives:this.file.g.meshes.reduce((s,m)=>s+m.primitives.length,0),...{drawCalls:assembled.drawCalls,triangles:assembled.indices/3,vertices:assembled.vertices,skipped:assembled.skipped},gpu:this.gpu};
 this.gpuAllocatedEstimateBytes=requiredGPU;
 this.bound=assembled.bound;this.center=this.bound.min.map((a,i)=>(a+this.bound.max[i])*.5);this.zoom=2/Math.max(this.bound.max[1]-this.bound.min[1],(this.bound.max[0]-this.bound.min[0])*1080/1920)*.93;
 const gl=this.gl;this.program&&gl.useProgram(this.program);this.entries=assembled.batches.map(b=>{
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);chunkedUpload(gl,gl.ARRAY_BUFFER,b.vertices,this.governor.b.maxSingleUploadBytes);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);chunkedUpload(gl,gl.ELEMENT_ARRAY_BUFFER,b.indices,this.governor.b.maxSingleUploadBytes);
  const stride=17*4;for(const [loc,count,offset] of [[0,3,0],[1,2,12],[2,4,20],[3,4,36],[4,4,52]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,count,gl.FLOAT,false,stride,offset);}gl.bindVertexArray(null);
  const editable=b.skin===0&&b.mat===0;
  return {vao,vb,ib,editable,count:b.indices.length,skin:b.skin,material:b.mat,vertexCount:b.vertexCount,gpuBytes:b.vertices.byteLength+b.indices.byteLength,
    positionsPacked:editable?b.vertices:null,firstPositions:editable?b.vertices.slice(0,Math.min(256,b.vertexCount)*17):null,
    lineSource:b.indices,lineIB:null,lineCount:0};
 });
 this.drawEntries=[...this.entries].sort((a,b)=>{const aa=this.file.g.materials?.[a.material]?.alphaMode==='BLEND',bb=this.file.g.materials?.[b.material]?.alphaMode==='BLEND';return Number(aa)-Number(bb);});
 this.inverseBindCache=(this.file.g.skins||[]).map(sk=>readAccessor(this.file,sk.inverseBindMatrices));
 if(this.wireMode!=='off')this.setWireMode(this.wireMode,this.wireDensity);
 this.materials=this.file.g.materials||[];this.textures=await Promise.all((this.file.g.textures||[]).map(async t=>{
  const im=await createImageBitmap(getImageBytes(this.file,t.source));let tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.generateMipmap(gl.TEXTURE_2D);this.gpuAllocatedEstimateBytes+=Math.ceil(im.width*im.height*4*1.34);im.close();return tex;
 }));
 this.boneTex=(this.file.g.skins||[]).map(s=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,4,s.joints.length,0,gl.RGBA,gl.FLOAT,null);return t;});
 this.boneTex.forEach((t,i)=>{this.gpuAllocatedEstimateBytes+=this.file.g.skins[i].joints.length*4*4*4;});
 this.cpuDerivedEstimateBytes=this.entries.reduce((s,e)=>s+(e.positionsPacked?.byteLength||0)+(e.firstPositions?.byteLength||0)+(e.lineSource?.byteLength||0),0);
 this.resize(this.baseWidth*this.governor.recommendedScale,this.baseHeight*this.governor.recommendedScale,true);this.stats.loadMs=+(performance.now()-start).toFixed(1);this.onStats({...this.stats,status:'loaded'});return this.stats;
 }
 // Under pressure, release only auxiliary GPU hair-display geometry. The source GLB and editable mesh are untouched.
 releaseOptionalHair(){
   const gl=this.gl;let released=0,count=0;const keep=[];
   for(const e of this.entries){
     if(e.skin===1){gl.deleteVertexArray(e.vao);gl.deleteBuffer(e.vb);gl.deleteBuffer(e.ib);if(e.lineIB){gl.deleteBuffer(e.lineIB);released+=e.lineCount*4;}released+=e.gpuBytes||0;count++;}
     else keep.push(e);
   }
   if(count){this.entries=keep;if(this.drawEntries)this.drawEntries=this.drawEntries.filter(e=>e.skin!==1);if(this.countWireStats)this.wireStats=this.countWireStats();this.gpuAllocatedEstimateBytes=Math.max(0,this.gpuAllocatedEstimateBytes-released);
     this.stats.drawCalls=this.entries.length;this.stats.skipped=(this.stats.skipped||0)+count;}
   return {requestedGpuReleaseBytes:released,releasedHairBatches:count,preservedWorkingCopy:true,
     note:'WebGL requests deletion; exact physical memory reclamation not measurable'};
 }
 patchLocal(amount){
  if(!this.entries.length)return null;
  const target=this.entries.find(b=>b.skin===0&&b.material===0);
  if(!target)return null;
  const n=Math.min(256,target.vertexCount),gl=this.gl,t=performance.now();
  for(let i=0;i<n;i++){
   const offset=i*17, original=target.firstPositions[offset+2];
   target.positionsPacked[offset+2]=original + amount*0.004*Math.sin((i/n)*Math.PI);
  }
  const section=target.positionsPacked.subarray(0,n*17);
  gl.bindBuffer(gl.ARRAY_BUFFER,target.vb);
  gl.bufferSubData(gl.ARRAY_BUFFER,0,section);
  const result={mode:'LOCAL_GPU_BUFFER_SUBDATA_NOT_FULL_REBUILD',patchedVertices:n,bytes:n*17*4,hostSubmitMs:+(performance.now()-t).toFixed(4)};
  this.patchStats=result;
  return result;
 }
 clearWireBuffers(){const gl=this.gl;for(const b of this.entries||[]){if(b.lineIB){gl.deleteBuffer(b.lineIB);b.lineIB=null;b.lineCount=0;}}this.gpuAllocatedEstimateBytes=Math.max(0,this.gpuAllocatedEstimateBytes-(this.wireStats?.gpuBytes||0));this.wireStats={segments:0,drawCalls:0,gpuBytes:0};}
 countWireStats(){let segments=0,drawCalls=0,gpuBytes=0;for(const b of this.entries){if(b.lineIB&&b.lineCount){segments+=b.lineCount/2;drawCalls++;gpuBytes+=b.lineCount*4;}}return {segments,drawCalls,gpuBytes};}
 setSurfaceGuide(mode='clean'){surfaceGuideId(mode);this.surfaceGuide=mode;return {mode,extraDrawCalls:0,extraLineBuffers:0,preservesMesh:true};}
 setWireMode(mode='off',density='balanced'){
  if(!WIRE_MODES.includes(mode)||!WIRE_DENSITIES.includes(density))throw Error('Invalid mesh line mode');
  this.clearWireBuffers();this.wireMode=mode;this.wireDensity=density;this.wireState={suppressed:false,hot:0,cool:0};
  if(mode==='off'||!this.entries.length)return {...this.wireStats,mode,density,changed:true};
  const gl=this.gl;let remaining=wireCap(mode,density);
  // Prefer the main character mesh and only spend remaining line budget on hair in full mode.
  for(const b of [...this.entries].sort((a,b)=>a.skin-b.skin)){
   if(remaining<=0)break;if(mode!=='full'&&b.skin!==0)continue;
   if(mode==='edit'&&(b.skin!==0||b.material!==0))continue;
   const edges=buildEdgeIndex(b.lineSource,{mode,maxLines:remaining,editVertices:256});
   if(!edges.segments)continue;
   const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,edges.indices,gl.STATIC_DRAW);
   b.lineIB=ib;b.lineCount=edges.indices.length;remaining-=edges.segments;
  }
  // Element binding is VAO state: restore each mesh's triangle index buffer.
  gl.bindVertexArray(null);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null);
  this.wireStats=this.countWireStats();this.gpuAllocatedEstimateBytes+=(this.wireStats.gpuBytes||0);
  return {...this.wireStats,mode,density,changed:true};
 }
 disposeMeshes(){const gl=this.gl;this.clearWireBuffers();this.drawEntries=[];this.inverseBindCache=[];this.gpuAllocatedEstimateBytes=0;this.cpuDerivedEstimateBytes=0;for(const b of this.entries||[]){gl.deleteVertexArray(b.vao);gl.deleteBuffer(b.vb);gl.deleteBuffer(b.ib);}for(let t of this.textures||[])gl.deleteTexture(t);for(let t of this.boneTex||[])gl.deleteTexture(t);this.entries=[];this.textures=[];this.boneTex=[];}
 resize(w,h,automatic=false){
  // Preflight dimensions and working-set allowance BEFORE touching the canvas or existing GLB.
  const gl=this.gl;
  const gmax=gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
  const viewport=gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  const targetW=Math.max(640,Math.round(w)),targetH=Math.max(360,Math.round(h));
  const verdict=checkRenderTarget({width:targetW,height:targetH,maxRenderbufferSize:gmax,
    maxViewportWidth:viewport?.[0],maxViewportHeight:viewport?.[1],
    gpuBudgetBytes:this.governor.b.gpuWorkingSetEstimateBytes,existingGpuBytes:this.gpuAllocatedEstimateBytes||0});
  if(!verdict.allowed)return {ok:false,reason:verdict.reason,requested:[targetW,targetH],actual:[this.width,this.height],
    estimatedFramebufferMiB:verdict.framebufferEstimateBytes?+(verdict.framebufferEstimateBytes/1048576).toFixed(1):null};
  const oldW=this.canvas.width,oldH=this.canvas.height;
  if(this.width!==targetW||this.height!==targetH){
    this.canvas.width=targetW;this.canvas.height=targetH;
    // Drivers may silently clamp drawing buffers; never pretend 4K if allocation failed.
    if((gl.drawingBufferWidth>0&&gl.drawingBufferWidth!==targetW)||(gl.drawingBufferHeight>0&&gl.drawingBufferHeight!==targetH)){
      this.canvas.width=oldW;this.canvas.height=oldH;gl.viewport(0,0,oldW,oldH);
      return {ok:false,reason:'DRIVER_BUFFER_MISMATCH',requested:[targetW,targetH],actual:[this.width,this.height]};
    }
    gl.viewport(0,0,targetW,targetH);
    this.width=targetW;this.height=targetH;
  }
  if(!automatic){this.baseWidth=targetW;this.baseHeight=targetH;}
  return {ok:true,reason:'OK',requested:[targetW,targetH],actual:[this.width,this.height],
    estimatedFramebufferMiB:+(verdict.framebufferEstimateBytes/1048576).toFixed(1),automatic};
 }

 draw(ts){if(!this.file||!this.entries.length)return;const gl=this.gl;let start=performance.now();let world=animatedWorld(this.file.g.nodes,this.wind?this.tracks:[],ts*.001);gl.useProgram(this.program);
 this.boneTex.forEach((texture,i)=>{let {out,n}=matsFor(this.file,world,i,this.inverseBindCache[i]);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,4,n,gl.RGBA,gl.FLOAT,out);});
 gl.clearColor(.012,.017,.035,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.uniform1f(this.u.zoom,this.zoom*this.zoomFactor);gl.uniform1f(this.u.angle,this.angle);gl.uniform3fv(this.u.center,this.center);gl.uniform1f(this.u.aspect,this.width/this.height);gl.uniform1i(this.u.boneTexture,0);gl.uniform1i(this.u.colorTexture,1);
 const ordered=this.drawEntries;gl.uniform1i(this.u.linePass,0);gl.uniform1i(this.u.surfaceGuide,surfaceGuideId(this.surfaceGuide||'clean'));
 if(this.wireMode!=='off'&&!this.wireState.suppressed){gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);}
 let oldSkin=-1;for(const b of ordered){const mat=this.materials[b.material]||{},texid=mat.pbrMetallicRoughness?.baseColorTexture?.index,has=texid!==undefined,color=mat.pbrMetallicRoughness?.baseColorFactor||[1,1,1,1];
  if(oldSkin!==b.skin){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.boneTex[b.skin]);oldSkin=b.skin;}
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,has?this.textures[texid]:null);gl.uniform1i(this.u.hasTexture,has?1:0);gl.uniform4fv(this.u.colorFactor,color);gl.uniform1i(this.u.editHighlight,this.surfaceGuide==='edit-tint'&&b.editable?1:0);
  const blend=mat.alphaMode==='BLEND';if(blend){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}else{gl.disable(gl.BLEND);gl.depthMask(true);}gl.bindVertexArray(b.vao);gl.drawElements(gl.TRIANGLES,b.count,gl.UNSIGNED_INT,0);
 }
 gl.disable(gl.POLYGON_OFFSET_FILL);
 if(this.wireMode!=='off'&&!this.wireState.suppressed&&this.wireStats.segments){
   gl.uniform1i(this.u.linePass,1);gl.uniform1i(this.u.editHighlight,0);gl.uniform1i(this.u.hasTexture,0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
   let wireSkin=-1;for(const b of this.entries){if(!b.lineIB||!b.lineCount)continue;
     if(wireSkin!==b.skin){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.boneTex[b.skin]);wireSkin=b.skin;}
     gl.bindVertexArray(b.vao);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.lineIB);
     gl.drawElements(gl.LINES,b.lineCount,gl.UNSIGNED_INT,0);
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.ib);
   }
   gl.uniform1i(this.u.linePass,0);
 }
 gl.bindVertexArray(null);gl.depthMask(true);gl.disable(gl.BLEND);gl.flush();this.lastCPU=performance.now()-start;
 if(this.last){const dt=ts-this.last;if(dt>0&&dt<250){this.frames.push(dt);if(this.frames.length>180)this.frames.shift();}}
 this.last=ts;
 // Sample only periodically; avoids adding GC/StorageManager overhead to every frame.
 if((++this.frameOrdinal%60)===0){
  const mem=(typeof performance!=='undefined'&&performance.memory)||null;
  this.lastPressure=this.governor.sampleMemory({
    heapUsedBytes:mem?.usedJSHeapSize??null,heapLimitBytes:mem?.jsHeapSizeLimit??null,
    cpuDerivedBytes:this.cpuDerivedEstimateBytes,gpuAllocatedEstimateBytes:this.gpuAllocatedEstimateBytes
  });
  if((this.lastPressure.status==='critical'||this.lastPressure.status==='pressure')&&this.entries.some(e=>e.skin===1)){
    this.lastOptionalRelease=this.releaseOptionalHair();
  }
 }
 if(this.frames.length>=20){const avg=this.frames.reduce((a,b)=>a+b,0)/this.frames.length;let sorted=[...this.frames].sort((a,b)=>a-b),p95=sorted[Math.floor(sorted.length*.95)];
 const decision=this.governor.recordFrame({frameMs:avg,cpuSubmitMs:this.lastCPU});
 if(this.wireMode!=='off')this.wireState=adaptiveWireStep(this.wireState,p95);
 if(this.autoQuality){
   const scale=decision.resolutionScale;
   if(Math.abs(this.width-this.baseWidth*scale)>40)this.resize(this.baseWidth*scale,this.baseHeight*scale,true);
 }
 this.onStats({...this.stats,status:'running',fps:+(1000/avg).toFixed(1),p95FrameMs:+p95.toFixed(2),jsSubmitMs:+this.lastCPU.toFixed(2),resolution:[this.width,this.height],sampleCount:this.frames.length,
   stability:this.lastPressure?.status||'unmeasured',memoryPressure:this.lastPressure,
   gpuEstimateMiB:+(this.gpuAllocatedEstimateBytes/1048576).toFixed(1),cpuDerivedMiB:+(this.cpuDerivedEstimateBytes/1048576).toFixed(1),
   frameBudget:decision,cacheEvictedMiB:+(this.governor.cache.totalEvictedBytes/1048576).toFixed(1),optionalHairRelease:this.lastOptionalRelease||null,gpuUtilizationPercent:null,surfaceGuide:this.surfaceGuide,wireMode:this.wireMode,wireDensity:this.wireDensity,wireLines:this.wireStats.segments,wireSkippedForLag:this.wireState.suppressed});

 }
 }
 start(){if(this.running)return;this.running=true;const fn=(ts)=>{if(!this.running)return;
  try{this.draw(ts);}catch(e){this.stop();this.onStats({status:'RENDER_ACTION_BLOCKED',message:String(e),gpu:this.gpu});return;}
  this.raf=requestAnimationFrame(fn);};this.raf=requestAnimationFrame(fn);}
 stop(){this.running=false;cancelAnimationFrame(this.raf);}
}