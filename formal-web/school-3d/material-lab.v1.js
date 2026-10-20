/* AIG 3D School Material Studio: actual WebGL2 material probes, not character geometry. */
(()=>{'use strict';
const canvas=document.getElementById('material-canvas'), fallback=document.getElementById('fallback');
const nameNode=document.getElementById('active-name'),subNode=document.getElementById('active-sub'),titleNode=document.getElementById('mat-title'),descNode=document.getElementById('mat-description');
const status=document.getElementById('runtime-msg');
const defs={
 skin:{name:'SKIN / 自然膚質',sub:'DIFFUSE · MICRONORMAL · SUBSURFACE',title:'Skin PBR',desc:'柔和皮膚漫反射、低金屬度與細微孔隙。禁止塑膠、蠟像或過度磨皮外觀。',roughness:.62,micro:.38,sss:.42},
 hair:{name:'HAIR / 深棕髮絲',sub:'FIBER STRANDS · DIRECTIONAL SHEEN',title:'Hair PBR',desc:'深棕色絲束與沿髮向細微高光，重視髮絲密度及反射層次。材質球無法替代真正髮片。',roughness:.37,micro:.28,sss:.04},
 fabric:{name:'FABRIC / 藏青布料',sub:'COTTON WEAVE · THREAD MICROSTRUCTURE',title:'Fabric PBR',desc:'藏青制服布料、經緯編織方向與低反射；真實衣摺必須由後續模型拓樸提供。',roughness:.78,micro:.48,sss:0}
};
let active='skin',yaw=-.24,pitch=.12,zoom=1,ready=false,gl,program,vertexCount=0;
const global={exposure:1.05,warmth:.58};
const vert=`#version 300 es
precision highp float;
in vec3 aPosition; in vec3 aNormal; in vec2 aUv;
uniform mat4 uModelView; uniform mat4 uProjection;
out vec3 vNormal; out vec3 vViewPos; out vec2 vUv;
void main(){vec4 p=uModelView*vec4(aPosition,1.0);vViewPos=p.xyz;vNormal=mat3(uModelView)*aNormal;vUv=aUv;gl_Position=uProjection*p;}`;
const frag=`#version 300 es
precision highp float;
in vec3 vNormal;in vec3 vViewPos;in vec2 vUv;out vec4 fragColor;
uniform int uMaterial;uniform float uRoughness,uMicro,uSSS,uExposure,uWarmth,uSelected;
const float PI=3.141592653589793;
float hash(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float pores(vec2 uv){return noise(uv*640.0)*.52+noise(uv*1200.0)*.28+noise(uv*210.0)*.20;}
float fibers(vec2 uv){float a=noise(vec2(uv.x*290.0,uv.y*13.0));return a*.8+noise(vec2(uv.x*620.0,uv.y*10.0))*.2;}
float weave(vec2 uv){float w=sin(uv.x*890.0)*sin(uv.y*890.0);return w*.5+.5;}
vec3 Fschlick(float cosT,vec3 f0){return f0+(1.0-f0)*pow(max(1.0-cosT,0.0),5.0);}
float D_GGX(float NoH,float alpha){float a2=alpha*alpha,d=(NoH*NoH*(a2-1.0)+1.0);return a2/max(PI*d*d,.00001);}
float Gsmith(float NoV,float NoL,float rough){float k=pow(rough+1.0,2.0)/8.0;return NoV/max(NoV*(1.0-k)+k,.00001)*NoL/max(NoL*(1.0-k)+k,.00001);}
vec3 applyLight(vec3 N,vec3 V,vec3 L,vec3 color,vec3 albedo,float rough,vec3 f0,float sss,float strength){
 float NoL=max(dot(N,L),0.0),NoV=max(dot(N,V),0.001);vec3 H=normalize(V+L);
 float NoH=max(dot(N,H),0.0),VoH=max(dot(V,H),0.0);
 float alpha=max(.025,rough*rough);
 vec3 F=Fschlick(VoH,f0);
 vec3 spec=D_GGX(NoH,alpha)*Gsmith(NoV,NoL,rough)*F/max(4.0*NoV*NoL,.001);
 float diffuseWrap=max((dot(N,L)+sss*.35)/(1.0+sss*.35),0.0);
 vec3 diffuse=albedo*(vec3(1.0)-F)*diffuseWrap/PI;
 vec3 backlight=albedo*sss*pow(max(-dot(N,L),0.0),2.0)*.11;
 return (diffuse+spec)*NoL*color*strength+backlight*color*strength;
}
void main(){
 vec2 uv=vUv;float grain=0.0;vec3 albedo;float metal=0.0;
 if(uMaterial==0){
  grain=pores(uv);float variation=noise(uv*17.0)*.034;
  albedo=vec3(.81,.49,.403)+(grain-.5)*.06+variation;
  albedo-=vec3(.026,.013,.01)*step(.88,noise(uv*104.0));
 }else if(uMaterial==1){
  grain=fibers(uv);albedo=vec3(.105,.060,.05)+(grain-.4)*.10;
 }else{
  grain=weave(uv);albedo=vec3(.083,.132,.241)+(.5-grain)*.035;
 }
 vec3 N=normalize(vNormal);
 // Normal-map style high-frequency material relief in tangent-inspired screen-space derivatives.
 float relief=(grain-.5)*uMicro*.028;
 vec3 pert=normalize(cross(dFdx(vViewPos),dFdy(vViewPos)));
 vec3 gradient=vec3(dFdx(grain)*.01,dFdy(grain)*.01,0.0);
 N=normalize(N+relief*pert+gradient*uMicro);
 if(!gl_FrontFacing)N=-N;
 vec3 V=normalize(-vViewPos);
 float rough=clamp(uRoughness+(grain-.5)*.09,.15,.98);
 vec3 f0=mix(vec3(.040),albedo,metal);
 vec3 key=normalize(vec3(-.51,.76,.57)),fill=normalize(vec3(.66,.19,.60)),rim=normalize(vec3(.21,.35,-.93));
 vec3 keyColor=mix(vec3(.96,1.08,1.25),vec3(1.33,1.13,.92),uWarmth);
 vec3 color=applyLight(N,V,key,keyColor,albedo,rough,f0,uSSS,3.35);
 color+=applyLight(N,V,fill,vec3(.42,.60,1.07),albedo,rough,f0,uSSS,1.0);
 color+=applyLight(N,V,rim,vec3(1.13,.65,.72),albedo,rough,f0,uSSS,.66);
 color+=albedo*vec3(.14,.19,.29);
 // Soft studio rim, fades with view grazing angle.
 float edge=pow(1.0-max(dot(N,V),0.0),2.8);
 color+=mix(vec3(.06,.11,.16),vec3(.17,.27,.31),uSelected)*edge*.24;
 color=vec3(1.0)-exp(-color*uExposure);
 color=pow(color,vec3(1.0/2.2));
 fragColor=vec4(color,1.0);
}`;
function mat4mul(a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let k=0;k<4;k++)for(let n=0;n<4;n++)r[c*4+k]+=a[n*4+k]*b[c*4+n];return r;}
function ident(){return Float32Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
function rotY(x){let a=ident();a[0]=Math.cos(x);a[2]=-Math.sin(x);a[8]=Math.sin(x);a[10]=Math.cos(x);return a;}
function rotX(x){let a=ident();a[5]=Math.cos(x);a[6]=Math.sin(x);a[9]=-Math.sin(x);a[10]=Math.cos(x);return a;}
function trs(x,y,z,s){let a=ident();a[0]=a[5]=a[10]=s;a[12]=x;a[13]=y;a[14]=z;return a;}
function project(fovy,aspect,near,far){const f=1/Math.tan(fovy*.5),out=new Float32Array(16);out[0]=f/aspect;out[5]=f;out[10]=(near+far)/(near-far);out[11]=-1;out[14]=2*near*far/(near-far);return out;}
function shader(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Shader failed');return s;}
function sphereMesh(){const lat=80,lon=128,verts=[],indices=[];for(let i=0;i<=lat;i++){const v=i/lat,theta=v*Math.PI;for(let j=0;j<=lon;j++){const u=j/lon,phi=u*Math.PI*2;let nx=Math.sin(theta)*Math.cos(phi),ny=Math.cos(theta),nz=Math.sin(theta)*Math.sin(phi);verts.push(nx,ny,nz,nx,ny,nz,u,v);}}
for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){let a=i*(lon+1)+j,b=a+lon+1;indices.push(a,b,a+1,b,b+1,a+1);}const positions=new Float32Array(indices.length*8);indices.forEach((idx,k)=>{for(let p=0;p<8;p++)positions[k*8+p]=verts[idx*8+p];});return positions;}
function init(){try{gl=canvas.getContext('webgl2',{antialias:true,alpha:true,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL2 not available');const programV=shader(gl.VERTEX_SHADER,vert),programF=shader(gl.FRAGMENT_SHADER,frag);program=gl.createProgram();gl.attachShader(program,programV);gl.attachShader(program,programF);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.deleteShader(programV);gl.deleteShader(programF);const mesh=sphereMesh();vertexCount=mesh.length/8;const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);const stride=32;for(const [k,size,off] of [['aPosition',3,0],['aNormal',3,12],['aUv',2,24]]){const loc=gl.getAttribLocation(program,k);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,off);}gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.useProgram(program);ready=true;status.textContent='WebGL2 · true 3D geometry · live PBR';fallback.hidden=true;requestAnimationFrame(draw);}catch(e){fallback.hidden=false;fallback.textContent='3D 材質引擎無法啟動：'+e.message;status.textContent='WebGL2 not available';}}
const uniforms={};function set(name,type,v){if(!uniforms[name])uniforms[name]=gl.getUniformLocation(program,name);if(type==='i')gl.uniform1i(uniforms[name],v);else if(type==='m')gl.uniformMatrix4fv(uniforms[name],false,v);else gl.uniform1f(uniforms[name],v);}
let t0=0,frames=0;function draw(t){if(!ready)return;const width=canvas.clientWidth||900,height=canvas.clientHeight||590,dpr=Math.min(window.devicePixelRatio||1,1.5),W=Math.round(width*dpr),H=Math.round(height*dpr);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);let proj=project(Math.PI/3,W/H,.1,60);set('uProjection','m',proj);let globalRotation=mat4mul(rotY(yaw),rotX(pitch));let ids=['skin','hair','fabric'];const aspect=W/H,narrow=aspect<1.22;const offsets=narrow?[-.98,0,.98]:[-2.05,0,2.05],size=narrow?[.53,.75,.53]:[.84,1.12,.84];for(let i=0;i<3;i++){const mat=defs[ids[i]],m=mat4mul(trs(offsets[i],i===1?.20:-.07,-5.2*zoom,size[i]),globalRotation);set('uModelView','m',m);set('uMaterial','i',i);set('uRoughness','f',mat.roughness);set('uMicro','f',mat.micro);set('uSSS','f',mat.sss);set('uSelected','f',ids[i]===active?1:0);set('uExposure','f',global.exposure);set('uWarmth','f',global.warmth);gl.drawArrays(gl.TRIANGLES,0,vertexCount);}frames++;if(t-t0>1400){document.getElementById('fps').textContent=Math.round(frames/(t-t0)*1000)+' FPS · WEBGL2';t0=t;frames=0;}requestAnimationFrame(draw);}
function activate(key){if(!defs[key])return;active=key;document.querySelectorAll('[data-material]').forEach(b=>{const on=b.dataset.material===key;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});const obj=defs[key];nameNode.textContent=obj.name;subNode.textContent=obj.sub;titleNode.textContent=obj.title;descNode.textContent=obj.desc;for(const k of ['roughness','micro','sss']){document.getElementById(k).value=obj[k];document.getElementById(k+'-val').textContent=obj[k].toFixed(2);}}
document.querySelectorAll('[data-material]').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.material)));
for(const k of ['roughness','micro','sss','exposure','warmth']){document.getElementById(k).addEventListener('input',e=>{const v=Number(e.target.value);(k in global?global:defs[active])[k]=v;document.getElementById(k+'-val').textContent=v.toFixed(2);});}
document.getElementById('reset').addEventListener('click',()=>{for(const key of Object.keys(defs)){const vals=key==='skin'?[.62,.38,.42]:key==='hair'?[.37,.28,.04]:[.78,.48,0];['roughness','micro','sss'].forEach((k,i)=>defs[key][k]=vals[i]);}global.exposure=1.05;global.warmth=.58;for(const k of ['exposure','warmth']){document.getElementById(k).value=global[k];document.getElementById(k+'-val').textContent=global[k].toFixed(2);}yaw=-.24;pitch=.12;zoom=1;activate(active);});
document.getElementById('capture').addEventListener('click',()=>{if(!ready)return;const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='AIG_PBR_MATERIAL_LAB_NOT_CHARACTER_AUTHORITY.png';a.click();});
let drag=false,px=0,py=0;canvas.addEventListener('pointerdown',e=>{drag=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',()=>drag=false);canvas.addEventListener('pointercancel',()=>drag=false);canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-px,dy=e.clientY-py;px=e.clientX;py=e.clientY;yaw+=dx*.007;pitch=Math.min(.7,Math.max(-.7,pitch+dy*.005));});canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.min(1.9,Math.max(.8,zoom+e.deltaY*.0006));},{passive:false});
let localReference=null;document.getElementById('authority-image').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(!/^image\/(png|jpeg|webp)$/.test(f.type)||f.size>12*1024*1024){alert('僅支援 12MB 以下的 PNG、JPEG 或 WebP');return;}if(localReference)URL.revokeObjectURL(localReference);localReference=URL.createObjectURL(f);document.getElementById('reference-img').src=localReference;document.getElementById('reference-preview').hidden=false;document.getElementById('reference-title').textContent=f.name;});document.getElementById('clear-reference').addEventListener('click',()=>{if(localReference)URL.revokeObjectURL(localReference);localReference=null;document.getElementById('reference-preview').hidden=true;document.getElementById('reference-title').textContent='載入核准的角色原圖';document.getElementById('authority-image').value='';});window.addEventListener('pagehide',()=>{if(localReference)URL.revokeObjectURL(localReference);});
activate(active);init();
})();