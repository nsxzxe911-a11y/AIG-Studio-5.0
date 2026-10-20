import {decodeGLB,readAccessor,buildBatches} from './fastmodel-data.mjs';
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
out vec2 fUv;out vec4 fColor;
mat4 bone(int k){return mat4(texelFetch(boneTexture,ivec2(0,k),0),texelFetch(boneTexture,ivec2(1,k),0),texelFetch(boneTexture,ivec2(2,k),0),texelFetch(boneTexture,ivec2(3,k),0));}
void main(){ivec4 j=ivec4(joints+.01);vec4 p=weights.x*(bone(j.x)*vec4(pos,1.))+weights.y*(bone(j.y)*vec4(pos,1.))+weights.z*(bone(j.z)*vec4(pos,1.))+weights.w*(bone(j.w)*vec4(pos,1.));
 float co=cos(angle),si=sin(angle);p.xyz-=center;p.xz=vec2(co*p.x+si*p.z,-si*p.x+co*p.z);gl_Position=vec4(p.x*zoom/aspect,p.y*zoom,clamp(p.z*.1,-.95,.95),1.);fUv=uv;fColor=vColor;
}`;
const FRAGMENT=`#version 300 es
precision highp float;
in vec2 fUv;in vec4 fColor;
uniform sampler2D colorTexture;
uniform vec4 colorFactor;
uniform int hasTexture;
out vec4 result;
void main(){vec4 c=colorFactor*fColor;if(hasTexture==1)c*=texture(colorTexture,fUv);if(c.a<0.025)discard;result=vec4(c.rgb,c.a);}
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
function matsFor(file,world,skinIndex){const skin=file.g.skins[skinIndex],inv=readAccessor(file,skin.inverseBindMatrices),n=skin.joints.length;const out=new Float32Array(4*n*4);
 for(let j=0;j<n;j++){const m=mul(world[skin.joints[j]],inv.subarray(j*16,(j+1)*16));out.set(m,j*16);}return {out,n};}
function getImageBytes(file,idx){const im=file.g.images[idx];if(!im||im.bufferView===undefined)throw Error('GLB embedded image missing');const bv=file.g.bufferViews[im.bufferView],start=file.bin.byteOffset+(bv.byteOffset||0),bytes=file.arrayBuffer.slice(start,start+bv.byteLength);return new Blob([bytes],{type:im.mimeType||'image/png'});}
export class FastModelView {
 constructor(canvas,onStats=()=>{}){this.canvas=canvas;this.onStats=onStats;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});if(!this.gl)throw Error('WebGL2 GPU unavailable on this device');const gl=this.gl;const ext=gl.getExtension('EXT_color_buffer_float');this.program=program(gl);this.u={};for(const k of ['zoom','angle','center','aspect','boneTexture','colorTexture','colorFactor','hasTexture'])this.u[k]=gl.getUniformLocation(this.program,k);this.textures=[];this.boneTex=[];this.entries=[];this.mode='full';this.angle=0;this.zoomFactor=1;this.wind=true;this.width=1920;this.height=1080;this.frames=[];this.last=0;this.running=false;this.autoQuality=false;this.qualityDown=0;this.qualityUp=0;gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);this.gpu=gl.getParameter(gl.RENDERER);}
 async load(arrayBuffer,mode='full'){this.disposeMeshes();const start=performance.now();this.file=decodeGLB(arrayBuffer);this.file.g.asset?.generator?.includes('NOT_APPROVED');this.tracks=tracksFor(this.file);this.mode=mode;let assembled=buildBatches(this.file,mode);this.stats={sourceMeshes:this.file.g.meshes.length,sourcePrimitives:this.file.g.meshes.reduce((s,m)=>s+m.primitives.length,0),...{drawCalls:assembled.drawCalls,triangles:assembled.indices/3,vertices:assembled.vertices,skipped:assembled.skipped},gpu:this.gpu};
 this.bound=assembled.bound;this.center=this.bound.min.map((a,i)=>(a+this.bound.max[i])*.5);this.zoom=2/Math.max(this.bound.max[1]-this.bound.min[1],(this.bound.max[0]-this.bound.min[0])*1080/1920)*.93;
 const gl=this.gl;this.program&&gl.useProgram(this.program);this.entries=assembled.batches.map(b=>{
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,b.vertices,gl.STATIC_DRAW);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,b.indices,gl.STATIC_DRAW);
  const stride=17*4;for(const [loc,count,offset] of [[0,3,0],[1,2,12],[2,4,20],[3,4,36],[4,4,52]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,count,gl.FLOAT,false,stride,offset);}gl.bindVertexArray(null);
  return {vao,vb,ib,count:b.indices.length,skin:b.skin,material:b.mat};
 });
 this.materials=this.file.g.materials||[];this.textures=await Promise.all((this.file.g.textures||[]).map(async t=>{
  const im=await createImageBitmap(getImageBytes(this.file,t.source));let tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.generateMipmap(gl.TEXTURE_2D);im.close();return tex;
 }));
 this.boneTex=(this.file.g.skins||[]).map(s=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,4,s.joints.length,0,gl.RGBA,gl.FLOAT,null);return t;});
 this.resize(1920,1080);this.stats.loadMs=+(performance.now()-start).toFixed(1);this.onStats({...this.stats,status:'loaded'});return this.stats;
 }
 disposeMeshes(){const gl=this.gl;for(const b of this.entries||[]){gl.deleteVertexArray(b.vao);gl.deleteBuffer(b.vb);gl.deleteBuffer(b.ib);}for(let t of this.textures||[])gl.deleteTexture(t);for(let t of this.boneTex||[])gl.deleteTexture(t);this.entries=[];this.textures=[];this.boneTex=[];}
 resize(w,h){this.width=w;this.height=h;this.canvas.width=w;this.canvas.height=h;this.gl.viewport(0,0,w,h);}
 draw(ts){if(!this.file||!this.entries.length)return;const gl=this.gl;let start=performance.now();let world=animatedWorld(this.file.g.nodes,this.wind?this.tracks:[],ts*.001);gl.useProgram(this.program);
 this.boneTex.forEach((texture,i)=>{let {out,n}=matsFor(this.file,world,i);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,4,n,gl.RGBA,gl.FLOAT,out);});
 gl.clearColor(.012,.017,.035,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.uniform1f(this.u.zoom,this.zoom*this.zoomFactor);gl.uniform1f(this.u.angle,this.angle);gl.uniform3fv(this.u.center,this.center);gl.uniform1f(this.u.aspect,this.width/this.height);gl.uniform1i(this.u.boneTexture,0);gl.uniform1i(this.u.colorTexture,1);
 const ordered=[...this.entries].sort((a,b)=>{let aa=this.materials[a.material]?.alphaMode==='BLEND',bb=this.materials[b.material]?.alphaMode==='BLEND';return aa-bb;});
 let oldSkin=-1;for(const b of ordered){const mat=this.materials[b.material]||{},texid=mat.pbrMetallicRoughness?.baseColorTexture?.index,has=texid!==undefined,color=mat.pbrMetallicRoughness?.baseColorFactor||[1,1,1,1];
  if(oldSkin!==b.skin){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.boneTex[b.skin]);oldSkin=b.skin;}
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,has?this.textures[texid]:null);gl.uniform1i(this.u.hasTexture,has?1:0);gl.uniform4fv(this.u.colorFactor,color);
  const blend=mat.alphaMode==='BLEND';if(blend){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}else{gl.disable(gl.BLEND);gl.depthMask(true);}gl.bindVertexArray(b.vao);gl.drawElements(gl.TRIANGLES,b.count,gl.UNSIGNED_INT,0);
 }
 gl.bindVertexArray(null);gl.depthMask(true);gl.disable(gl.BLEND);gl.flush();this.lastCPU=performance.now()-start;
 if(this.last){const dt=ts-this.last;if(dt>0&&dt<250){this.frames.push(dt);if(this.frames.length>180)this.frames.shift();}}
 this.last=ts;
 if(this.frames.length>=20){const avg=this.frames.reduce((a,b)=>a+b,0)/this.frames.length;let sorted=[...this.frames].sort((a,b)=>a-b),p95=sorted[Math.floor(sorted.length*.95)];this.onStats({...this.stats,status:'running',fps:+(1000/avg).toFixed(1),p95FrameMs:+p95.toFixed(2),jsSubmitMs:+this.lastCPU.toFixed(2),resolution:[this.width,this.height],sampleCount:this.frames.length});
 if(this.autoQuality&&this.frames.length>=90){if(1000/avg<46){this.qualityDown++;this.qualityUp=0;}else if(1000/avg>58){this.qualityUp++;this.qualityDown=0;}else{this.qualityDown=0;this.qualityUp=0;}
 if(this.qualityDown>=45&&this.width>1280){this.resize(1280,720);this.qualityDown=0;}if(this.qualityUp>=120&&this.width<1920){this.resize(1920,1080);this.qualityUp=0;}}
 }
 }
 start(){if(this.running)return;this.running=true;const fn=(ts)=>{if(!this.running)return;this.draw(ts);this.raf=requestAnimationFrame(fn);};this.raf=requestAnimationFrame(fn);}
 stop(){this.running=false;cancelAnimationFrame(this.raf);}
}