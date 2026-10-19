/* AIG 6AX live articulated mechanism PREVIEW V1.
 * Operates a separate WebGL scene; leaves V65 simulator / NC editor untouched.
 * Six independent kinematic transforms, no machine output or collision certification. */
(function(w,d){"use strict";
const CORE=w.AIG_6AX_MECHANISM_CORE_V1;
if(!CORE)return;
let root=null,canvas=null,gl=null,mesh={},program=null,uniforms=null,raf=0,on=false,
 renderedFrames=0,lastGlError=0,lastRenderTime=0,
 values={X:0,Y:0,Z:0,A:0,B:0,H:0}, camera={yaw:.54,pitch:.34,dist:8.8,target:[0,0,1.55]},mouse=null;
const R=CORE,blue=[.06,.78,1,1],steel=[.53,.60,.68,1],light=[.80,.88,.94,1],
 dark=[.115,.15,.21,1],black=[.045,.065,.10,1],gold=[.87,.59,.24,1],
violet=[.63,.32,.91,1],silver=[.63,.72,.79,1];
const vertexSource="attribute vec3 aPos;attribute vec3 aNormal;uniform mat4 uMvp;uniform mat4 uModel;varying vec3 vNormal;varying vec3 vPos;void main(){vec4 p=uModel*vec4(aPos,1.0);vPos=p.xyz;vNormal=mat3(uModel)*aNormal;gl_Position=uMvp*vec4(aPos,1.0);}";
const fragmentSource="precision mediump float;varying vec3 vNormal;varying vec3 vPos;uniform vec4 uColor;uniform float uGlow;void main(){vec3 n=normalize(vNormal);vec3 l=normalize(vec3(-.45,-.65,.85));float lam=max(.0,dot(n,l));float rim=pow(1.0-max(0.0,dot(n,normalize(vec3(.4,-.6,.7)))),2.0);vec3 c=uColor.rgb*(.32+.67*lam)+vec3(.12,.20,.26)*rim*.34+uColor.rgb*uGlow;gl_FragColor=vec4(c,uColor.a);}";
function shader(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
function buildProgram(){program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertexSource));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragmentSource));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
uniforms={model:gl.getUniformLocation(program,"uModel"),mvp:gl.getUniformLocation(program,"uMvp"),color:gl.getUniformLocation(program,"uColor"),glow:gl.getUniformLocation(program,"uGlow"),pos:gl.getAttribLocation(program,"aPos"),normal:gl.getAttribLocation(program,"aNormal")};}
function mkMesh(pos,norm){const m={count:pos.length/3,p:gl.createBuffer(),n:gl.createBuffer()};gl.bindBuffer(gl.ARRAY_BUFFER,m.p);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pos),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(norm),gl.STATIC_DRAW);return m}
function cube(){const p=[],n=[];const faces=[
 [[1,0,0],[1,2,6,5]], [[-1,0,0],[0,4,7,3]], [[0,1,0],[3,7,6,2]],
 [[0,-1,0],[0,1,5,4]], [[0,0,1],[4,5,6,7]], [[0,0,-1],[0,3,2,1]]
 ];const v=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];
 for(const [normal,face] of faces)for(const j of [0,1,2,0,2,3]){p.push(...v[face[j]]);n.push(...normal)}
 return mkMesh(p,n)}
function cylinder(segments=32){const p=[],n=[];function v(pt,no){p.push(...pt);n.push(...no)}
 for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
  v([ca,sa,-.5],[ca,sa,0]);v([cb,sb,-.5],[cb,sb,0]);v([cb,sb,.5],[cb,sb,0]);
  v([ca,sa,-.5],[ca,sa,0]);v([cb,sb,.5],[cb,sb,0]);v([ca,sa,.5],[ca,sa,0]);
  for(const z of [-.5,.5]){const nz=z>0?1:-1;v([0,0,z],[0,0,nz]);v(z>0?[ca,sa,z]:[cb,sb,z],[0,0,nz]);v(z>0?[cb,sb,z]:[ca,sa,z],[0,0,nz]);}
 }return mkMesh(p,n)}
function scale(x,y,z){return [x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1]}
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2);const m=new Array(16).fill(0);m[0]=f/aspect;m[5]=f;m[10]=(far+near)/(near-far);m[11]=-1;m[14]=2*far*near/(near-far);return m}
function normal(v){const l=Math.hypot(...v)||1;return v.map(x=>x/l)}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function lookAt(e,c){const z=normal(e.map((v,i)=>v-c[i])),x=normal(cross([0,0,1],z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((a,v,i)=>a+v*e[i],0),-y.reduce((a,v,i)=>a+v*e[i],0),-z.reduce((a,v,i)=>a+v*e[i],0),1]}
function draw(meshName,parent,pos,size,color,rot=null,glow=0){const m=mesh[meshName],model=R.chain(parent,R.translate(...pos),rot||R.identity(),scale(...size));gl.uniformMatrix4fv(uniforms.model,false,new Float32Array(model));gl.uniformMatrix4fv(uniforms.mvp,false,new Float32Array(R.multiply(viewProjection,model)));gl.uniform4fv(uniforms.color,new Float32Array(color));gl.uniform1f(uniforms.glow,glow);
gl.bindBuffer(gl.ARRAY_BUFFER,m.p);gl.enableVertexAttribArray(uniforms.pos);gl.vertexAttribPointer(uniforms.pos,3,gl.FLOAT,false,0,0);
gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.enableVertexAttribArray(uniforms.normal);gl.vertexAttribPointer(uniforms.normal,3,gl.FLOAT,false,0,0);
gl.drawArrays(gl.TRIANGLES,0,m.count)}
let viewProjection=R.identity();
function frame(){raf=0;if(!on||!root?.isConnected||d.visibilityState==="hidden"||!gl)return;
 const rect=canvas.getBoundingClientRect();if(rect.width<50||rect.height<50){return}
 const dpi=Math.min(w.devicePixelRatio||1,2);const width=Math.round(rect.width*dpi),height=Math.round(rect.height*dpi);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height)}
 gl.clearColor(.007,.015,.029,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(program);
 const {yaw,pitch,dist,target}=camera;const eye=[target[0]+Math.sin(yaw)*Math.cos(pitch)*dist,target[1]-Math.cos(yaw)*Math.cos(pitch)*dist,target[2]+Math.sin(pitch)*dist];
 viewProjection=R.multiply(perspective(Math.PI/4,width/height,.1,60),lookAt(eye,target));
 const I=R.identity(),pose=R.solve(values),c=pose.pivots;
 // fixed machine structure, no enclosing shell
 draw("box",I,[0,0,-.23],[6.0,3.6,.36],dark);
 for(let i=-6;i<=6;i++)draw("box",I,[i*.42,0,-.042],[.027,3.25,.014],silver);
 for(const x of [-2.60,2.60]){draw("box",I,[x,1.05,1.7],[.33,.48,3.6],steel);draw("box",I,[x,1.04,2.1],[.17,.11,2.7],silver);}
 draw("box",I,[0,1.03,3.85],[5.35,.62,.42],dark);
 draw("box",I,[0,1.08,3.82],[5.02,.16,.08],blue,null,.38);
 // A single trunnion axis aligned with +X; both support housings are stationary
 for(const x of [-2.08,2.08]){
  draw("box",I,[x,0,.37],[.72,1.03,.89],dark);
  draw("cyl",I,[x,0,1.0],[.76,.76,.67],steel,R.rotateY(90));
  draw("cyl",I,[x*1.01,0,1.0],[.59,.59,.69],black,R.rotateY(90));
  draw("cyl",I,[x*.92,0,1.0],[.42,.42,.64],gold,R.rotateY(90));
 }
 // rotating cradle supports are siblings of ONE A pivot
 for(const x of [-1.65,1.65])draw("box",c.cradle,[x,0,-.24],[.29,.92,.65],steel);
 draw("box",c.cradle,[0,0,-.45],[3.35,1.18,.22],dark);
 draw("box",c.cradle,[0,0,-.31],[2.35,.97,.15],steel);
 draw("cyl",c.cradle,[0,0,-.25],[1.52,1.52,.22],dark);
 // B turns the independent center disk, radial chuck bolting and four jaws
 draw("cyl",c.platter,[0,0,.06],[1.31,1.31,.24],silver);
 draw("cyl",c.platter,[0,0,.19],[1.12,1.12,.055],light);
 draw("cyl",c.platter,[0,0,.23],[.82,.82,.06],black);
 for(let i=0;i<12;i++){const t=2*Math.PI*i/12;draw("cyl",c.platter,[.99*Math.cos(t),.99*Math.sin(t),.23],[.048,.048,.025],gold);}
 for(let i=0;i<4;i++){const t=Math.PI*i/2;draw("box",c.platter,[.57*Math.cos(t),.57*Math.sin(t),.35],[.28,.25,.18],steel,R.rotateZ(i*90));}
 // workpiece intentionally absent; tool remains replaceable visual node
 draw("box",c.linear,[0,0,.33],[.72,.83,1.15],dark);
 draw("box",c.linear,[0,0,.08],[.81,.92,.25],steel);
 draw("cyl",c.head,[0,0,-.30],[.38,.38,.78],steel);
 draw("cyl",c.spindle,[0,0,-.20],[.23,.23,.5],light);
 draw("cyl",c.spindle,[0,0,-.58],[.105,.105,.39],gold);
 draw("cyl",c.spindle,[0,0,-.83],[.044,.044,.25],blue,null,.35);
 // reference lights are decor only and excluded from collision
 for(const x of [-2.40,2.40])draw("box",I,[x,1.30,1.65],[.028,.04,2.42],blue,null,.32);
 const hint=root.querySelector("[data-aig6-hint]");if(hint)hint.textContent="A "+values.A.toFixed(0)+"°  ·  B "+values.B.toFixed(0)+"°  ·  頭 "+values.H.toFixed(1)+"°";
 lastGlError=gl.getError();renderedFrames++;lastRenderTime=(w.performance?.now?.()||Date.now());
}
function requestFrame(){if(on&&!raf)raf=w.requestAnimationFrame(frame)}
function setAxis(id,value){const next={...values,[id]:Number(value)};try{R.solve(next);values=next;const input=root?.querySelector('[data-aig6-axis="'+id+'"]');if(input)input.value=String(values[id]);const output=root?.querySelector('[data-aig6-value="'+id+'"]');if(output)output.textContent=values[id].toFixed(id==="H"?1:0)+(id==="A"||id==="B"||id==="H"?"°":"");requestFrame();return true;}catch(e){const notice=root?.querySelector("[data-aig6-error]");if(notice)notice.textContent=String(e.message);return false}}
function orbit(){canvas.addEventListener("pointerdown",e=>{if(!on)return;mouse={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener("pointermove",e=>{if(!mouse)return;camera.yaw+=(e.clientX-mouse.x)*.009;camera.pitch=Math.min(1.35,Math.max(-.12,camera.pitch+(e.clientY-mouse.y)*.006));mouse={x:e.clientX,y:e.clientY};requestFrame()});
 canvas.addEventListener("pointerup",()=>mouse=null);canvas.addEventListener("pointercancel",()=>mouse=null);
 canvas.addEventListener("wheel",e=>{if(!on)return;e.preventDefault();camera.dist=Math.min(17,Math.max(4,camera.dist*(e.deltaY>0?1.09:.91)));requestFrame()},{passive:false});
}
function mount(){if(root?.isConnected)return true;
 const host=d.querySelector('.app>.shell>.screen[data-page="6AX"] .simgrid[data-runtime="6AX"] .sceneWrap');if(!host)return false;
 const wrap=d.createElement("div");wrap.className="aig6-mount";
 const toggle=d.createElement("button");toggle.className="aig6-toggle";toggle.type="button";toggle.textContent="◈ 六軸機構";toggle.setAttribute("aria-pressed","false");toggle.setAttribute("aria-label","切換六軸機構 WebGL 預覽");
 const stage=d.createElement("section");stage.className="aig6-stage";stage.hidden=true;
 canvas=d.createElement("canvas");canvas.className="aig6-canvas";canvas.setAttribute("aria-label","可旋轉的六軸 WebGL 機構預覽，拖曳可轉動相機");
 const panel=d.createElement("div");panel.className="aig6-panel";
 const title=d.createElement("div");title.className="aig6-panel-title";title.textContent="6AX 機構姿態 · 預覽";
 const tip=d.createElement("div");tip.className="aig6-panel-note";tip.textContent="A/B 360° · 傾斜頭 45° · 非 CNC 安全驗證";
 panel.append(title,tip);
 for(const id of ["A","B","H","X","Y","Z"]){const [min,max]=R.limits[id];const label=d.createElement("label");label.className="aig6-slider";const name=d.createElement("span");name.textContent={A:"A 搖籃",B:"B 圓盤",H:"H 主軸頭",X:"X",Y:"Y",Z:"Z"}[id];const input=d.createElement("input");input.type="range";input.min=String(min);input.max=String(max);input.step=id==="H"?"0.5":"1";input.value="0";input.dataset.aig6Axis=id;const value=d.createElement("output");value.dataset.aig6Value=id;value.textContent="0"+("ABH".includes(id)?"°":"");input.addEventListener("input",()=>setAxis(id,input.value));label.append(name,input,value);panel.append(label);}
 const reset=d.createElement("button");reset.type="button";reset.className="aig6-reset";reset.textContent="軸姿態復歸";reset.addEventListener("click",()=>{for(const k of Object.keys(values))setAxis(k,0)});
 const error=d.createElement("output");error.dataset.aig6Error="";error.setAttribute("role","status");
 const hint=d.createElement("div");hint.className="aig6-hint";hint.dataset.aig6Hint="";stage.append(canvas,panel,hint);panel.append(reset,error);
 wrap.append(toggle,stage);host.append(wrap);root=wrap;
 canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();if(raf){w.cancelAnimationFrame(raf);raf=0}gl=null;program=null;mesh={};lastGlError=-1;const out=root?.querySelector("[data-aig6-error]");if(out)out.textContent="WebGL 暫時中斷，等待圖形裝置恢復";});
 canvas.addEventListener("webglcontextrestored",()=>{if(on&&initializeGL())requestFrame();});
 if(typeof ResizeObserver!=="undefined"){const observer=new ResizeObserver(()=>requestFrame());observer.observe(canvas);}
 toggle.addEventListener("click",()=>show(!on));orbit();
 w.addEventListener("resize",requestFrame,{passive:true});
 d.addEventListener("visibilitychange",requestFrame);
 w.addEventListener("hashchange",()=>{if(d.querySelector('.screen.active[data-page="6AX"]'))requestFrame()});
 return true;
}
function initializeGL(){if(gl)return true;try{
 gl=canvas.getContext("webgl",{alpha:false,antialias:true,depth:true,preserveDrawingBuffer:false});
 if(!gl)throw Error("WEBGL_UNAVAILABLE");
 buildProgram();mesh={box:cube(),cyl:cylinder(36)};return true;
 }catch(e){gl=null;const out=root?.querySelector("[data-aig6-error]");if(out)out.textContent="3D 裝置不可用："+e.message;return false}}
function show(visible){if(!mount())return false;if(visible&&!initializeGL())return false;on=!!visible;root.querySelector(".aig6-stage").hidden=!on;root.querySelector(".aig6-toggle").setAttribute("aria-pressed",String(on));if(raf){w.cancelAnimationFrame(raf);raf=0}requestFrame();return on}
function init(){if(mount())return;let tries=0;const retry=()=>{if(mount()||++tries>24)return;w.setTimeout(retry,300)};retry()}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
w.AIG_6AX_MECHANISM_PREVIEW_V1=Object.freeze({version:"1.0.0",setAxis,show,inspect:()=>({mounted:!!root?.isConnected,active:on,webglReady:!!gl,renderedFrames,lastGlError,lastRenderTime,
 canvasSize:{width:canvas?.width||0,height:canvas?.height||0},joints:{...values},...({machineOutput:"BLOCKED",collisionGate:"NOT_IMPLEMENTED",materialRemovalGate:"NOT_IMPLEMENTED",accuracy:"VISUAL_UNCALIBRATED"})})});
})(window,document);
