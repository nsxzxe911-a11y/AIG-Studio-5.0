/* AIG V93: small real WebGL preview of the on-disk GLB. Purely visual.
 * Never shows fabricated CNC coordinates or removed material. The 6AX Runtime
 * remains the authority for machining playback, axes and physical safety.
 */
(function(w,d){"use strict";
const src="./zoo-6ax/local-glb/aig_6ax_machine_v9.glb";
const skip=/^(?:STATIC_LEFT_|STATIC_BRIDGE|STATIC_BACK_WALL|STATIC_LEFT_INNER_WALL|STATIC_RIGHT_INNER_WALL|B_SUPPORT_REAR|B_BEARING_REAR|B_JOURNAL_REAR|B_CRADLE_LEFT_|A_SUPPORT_LEFT|A_BEARING_LEFT|A_SHAFT_LEFT|A_DRIVE_COVER_LEFT|A_BEARING_CAP_LEFT|A_BOLT_L_|WORKPIECE)/;
let started=false,canvas=null,frame=null,ready=false,program=null,gl=null;
const I=()=>{const m=new Float32Array(16);m[0]=m[5]=m[10]=m[15]=1;return m};
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
function translate(a){const m=I();m[12]=a[0];m[13]=a[1];m[14]=a[2];return m}
function scale(a){const m=I();m[0]=a[0];m[5]=a[1];m[10]=a[2];return m}
function quat(a){const [x,y,z,w]=a||[0,0,0,1],m=I();m[0]=1-2*(y*y+z*z);m[1]=2*(x*y+z*w);m[2]=2*(x*z-y*w);m[4]=2*(x*y-z*w);m[5]=1-2*(x*x+z*z);m[6]=2*(y*z+x*w);m[8]=2*(x*z+y*w);m[9]=2*(y*z-x*w);m[10]=1-2*(x*x+y*y);return m}
function look(eye,target){
 const norm=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n)};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross([0,0,1],z)),y=cross(z,x);
 const m=I();for(let i=0;i<3;i++){m[i]=x[i];m[4+i]=y[i];m[8+i]=z[i]}
 m[12]=-x.reduce((v,e,i)=>v+e*eye[i],0);m[13]=-y.reduce((v,e,i)=>v+e*eye[i],0);m[14]=-z.reduce((v,e,i)=>v+e*eye[i],0);return m;
}
function perspective(ratio){const f=1/Math.tan(.83/2),m=new Float32Array(16),near=3,far=7000;m[0]=f/ratio;m[5]=f;m[10]=(far+near)/(near-far);m[11]=-1;m[14]=2*far*near/(near-far);return m}
function compile(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error("SHADER: "+gl.getShaderInfoLog(s));return s}
function createShader(){
 const v=compile(gl.VERTEX_SHADER,"attribute vec3 p;attribute vec3 n;uniform mat4 mvp;uniform mat4 model;varying vec3 normal;varying float height;void main(){vec4 w=model*vec4(p,1.);normal=mat3(model)*n;height=w.z;gl_Position=mvp*vec4(p,1.);}");
 const f=compile(gl.FRAGMENT_SHADER,"precision mediump float;varying vec3 normal;varying float height;uniform vec3 color;void main(){vec3 N=normalize(normal);float lite=.25+.7*max(0.,dot(N,normalize(vec3(.35,-.68,.68))));float spec=pow(max(0.,dot(N,normalize(vec3(.7,-.3,.6)))),18.)*.25;vec3 c=color*(.38+lite)+vec3(.48,.75,1.)*spec;gl_FragColor=vec4(c,1.);}");
 program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error("LINK "+gl.getProgramInfoLog(program));
 gl.useProgram(program);return{p:gl.getAttribLocation(program,"p"),n:gl.getAttribLocation(program,"n"),mvp:gl.getUniformLocation(program,"mvp"),model:gl.getUniformLocation(program,"model"),color:gl.getUniformLocation(program,"color")};
}
function unpack(bytes){
 const dv=new DataView(bytes),size=dv.byteLength;
 if(size<28||dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2||dv.getUint32(8,true)!==size)throw Error("GLB_INVALID");
 const len=dv.getUint32(12,true),bin=20+len;
 if(dv.getUint32(16,true)!==0x4e4f534a||bin+8>size||dv.getUint32(bin+4,true)!==0x004e4942)throw Error("GLB_CHUNK");
 const json=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,len))),offset=bin+8,binSize=dv.getUint32(bin,true);
 function read(i){
  const a=json.accessors[i],b=json.bufferViews[a.bufferView],n=a.type==="VEC3"?3:1,width=a.componentType===5123?2:4;
  if(b.buffer!==0||a.count>300000||![5123,5125,5126].includes(a.componentType))throw Error("GLB_ACCESSOR");
  const from=offset+(b.byteOffset||0)+(a.byteOffset||0),stride=b.byteStride||n*width;
  if(from+(a.count-1)*stride+n*width>offset+binSize)throw Error("GLB_BOUNDS");
  const values=[];
  for(let j=0;j<a.count;j++)for(let k=0;k<n;k++){
   const at=from+j*stride+k*width;
   values.push(a.componentType===5126?dv.getFloat32(at,true):a.componentType===5125?dv.getUint32(at,true):dv.getUint16(at,true));
  }return values;
 }
 const mesh=json.meshes.map(m=>m.primitives.map(p=>{
  const vertices=read(p.attributes.POSITION),normals=read(p.attributes.NORMAL),indices=read(p.indices),a=[],b=[];
  if(indices.length%3||indices.length>600000)throw Error("GLB_INDEX");
  for(const i of indices){if(i<0||i>=vertices.length/3)throw Error("GLB_OOB");a.push(...vertices.slice(i*3,i*3+3));b.push(...normals.slice(i*3,i*3+3))}
  const position=gl.createBuffer(),normal=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,position);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER,normal);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(b),gl.STATIC_DRAW);
  return{position,normal,count:a.length/3,color:json.materials[p.material]?.pbrMetallicRoughness?.baseColorFactor?.slice(0,3)||[.55,.72,.8]};
 }));
 if(!["A_GROUP","B_GROUP","C_GROUP"].every(name=>json.nodes.some(n=>n.name===name)))throw Error("GLB_AXES_MISSING");
 const scene=json.scenes[json.scene||0];
 const all=[];function walk(id,parent){
  const n=json.nodes[id];if(!n||skip.test(n.name||""))return;
  const m=mul(parent,mul(translate(n.translation||[0,0,0]),mul(quat(n.rotation),scale(n.scale||[1,1,1]))));
  if(n.mesh!==undefined)for(const part of mesh[n.mesh])all.push({...part,world:m});
  for(const child of n.children||[])walk(child,m);
 }
 for(const id of scene.nodes)walk(id,I());
 return all;
}
function start(){
 if(started)return;canvas=d.querySelector('.screen[data-page="HOME"] [data-aig93-glb]');
 if(!canvas)return;started=true;
 const label=d.querySelector("[data-aig93-model-label]");
 try{gl=canvas.getContext("webgl",{alpha:true,antialias:true,powerPreference:"low-power"});
  if(!gl)throw Error("WEBGL_UNAVAILABLE");
  const uniforms=createShader();
  fetch(src,{cache:"force-cache"}).then(r=>{if(!r.ok)throw Error("GLB_HTTP_"+r.status);return r.arrayBuffer()}).then(data=>{
   const parts=unpack(data);ready=true;canvas.dataset.aig93Glb="ready";
   if(label)label.textContent="真實 GLB V9.3 · 模型外觀預覽（非切削結果）";
   let last=0;
   const loop=now=>{
    frame=null;
    if(d.querySelector('.app>.shell>.screen.active[data-page="HOME"]')===null)return;
    frame=requestAnimationFrame(loop);
    if(now-last<34)return;last=now;
    const box=canvas.getBoundingClientRect(),wpx=Math.min(1600,Math.max(80,Math.floor(box.width*(devicePixelRatio||1)))),
      hpx=Math.min(1200,Math.max(80,Math.floor(box.height*(devicePixelRatio||1))));
    if(canvas.width!==wpx||canvas.height!==hpx){canvas.width=wpx;canvas.height=hpx}
    gl.viewport(0,0,wpx,hpx);gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const a=now*.00010,eye=[950*Math.cos(a)-780*Math.sin(a),950*Math.sin(a)+780*Math.cos(a),790];
    const pv=mul(perspective(wpx/hpx),look(eye,[0,0,360]));
    for(const item of parts){
     gl.uniformMatrix4fv(uniforms.model,false,item.world);
     gl.uniformMatrix4fv(uniforms.mvp,false,mul(pv,item.world));
     gl.uniform3fv(uniforms.color,new Float32Array(item.color));
     gl.bindBuffer(gl.ARRAY_BUFFER,item.position);gl.enableVertexAttribArray(uniforms.p);gl.vertexAttribPointer(uniforms.p,3,gl.FLOAT,false,0,0);
     gl.bindBuffer(gl.ARRAY_BUFFER,item.normal);gl.enableVertexAttribArray(uniforms.n);gl.vertexAttribPointer(uniforms.n,3,gl.FLOAT,false,0,0);
     gl.drawArrays(gl.TRIANGLES,0,item.count);
    }
   };
   w.AIG_HOME_V93_VIEWER=Object.freeze({inspect:()=>({ready,parts:parts.length,source:src,visualOnly:true})});
   frame=requestAnimationFrame(loop);
   w.addEventListener("hashchange",()=>{if(!frame&&ready)frame=requestAnimationFrame(loop)});
  }).catch(e=>{canvas.dataset.aig93Glb="error";if(label)label.textContent="GLB 外觀預覽未就緒 · 請進入 6AX 真工作區";});
 }catch(e){canvas.dataset.aig93Glb="error";if(label)label.textContent="WebGL 不可用 · 真工作區仍可操作";}
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",()=>w.addEventListener("aig93-home-mounted",start,{once:true}));
else {w.addEventListener("aig93-home-mounted",start,{once:true});if(d.querySelector('.screen[data-page="HOME"] [data-aig93-glb]'))start()}
})(window,document);
