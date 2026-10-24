/** Shared AIG Real3D 1.0 WebGL indexed triangles + lighting + visual path.
 * No CDN. No ray tracing; no material removal or production CNC writes.
 */
import {getAIG3DWorldMatrix,auditAIG3DScene} from './aig-real3d-core.mjs';
import {getAIG3DQuality,resolveAIG3DFrameBudget} from './aig-real3d-quality.mjs';
const finite=Number.isFinite;
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function multiply(a,b){
 const o=new Float32Array(16);
 for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let i=0;i<4;i++)o[c*4+r]+=a[i*4+r]*b[c*4+i];
 return o;
}
function perspective(fovy,aspect,near,far){
 const f=1/Math.tan(fovy/2),d=1/(near-far);
 return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*d,-1,0,0,2*far*near*d,0]);
}
function orthographic(span,aspect,near,far){
 return new Float32Array([2/(span*aspect),0,0,0,0,2/span,0,0,0,0,-2/(far-near),0,0,0,-(far+near)/(far-near),1]);
}
function lookAt(eye,target,up){
 const z=norm(eye.map((x,i)=>x-target[i])),x=norm(cross(up,z)),y=cross(z,x);
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,
  -dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
function normalMatrix(m){
 const a=m[0],b=m[4],c=m[8],d=m[1],e=m[5],f=m[9],g=m[2],h=m[6],i=m[10];
 const A=e*i-f*h,B=f*g-d*i,C=d*h-e*g,D=c*h-b*i,E=a*i-c*g,F=b*g-a*h,
  G=b*f-c*e,H=c*d-a*f,I=a*e-b*d,det=a*A+b*B+c*C;
 if(Math.abs(det)<1e-10)throw Error('AIG3D_NORMAL_MATRIX_SINGULAR');
 return new Float32Array([A,D,G,B,E,H,C,F,I].map(v=>v/det));
}
function shader(gl,t,src){
 const sh=gl.createShader(t);gl.shaderSource(sh,src);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){
  const error=gl.getShaderInfoLog(sh)||'SHADER_FAIL';gl.deleteShader(sh);throw Error(error);
 }
 return sh;
}
function program(gl,vs,fs){
 const a=shader(gl,gl.VERTEX_SHADER,vs),b=shader(gl,gl.FRAGMENT_SHADER,fs),p=gl.createProgram();
 gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);gl.deleteShader(a);gl.deleteShader(b);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS)){
  const e=gl.getProgramInfoLog(p)||'LINK_FAIL';gl.deleteProgram(p);throw Error(e);
 }return p;
}
const vs=[
 'attribute vec3 aPosition,aNormal;',
 'uniform mat4 uModel,uVP;',
 'uniform mat3 uNormal;',
 'varying vec3 vNormal,vWorld;',
 'void main(){vec4 world=uModel*vec4(aPosition,1.0);vWorld=world.xyz;',
 'vNormal=normalize(uNormal*aNormal);gl_Position=uVP*world;}'
].join('\n');
const fs=[
 'precision mediump float;',
 'varying vec3 vNormal,vWorld;',
 'uniform vec4 uColor;',
 'uniform vec3 uEye,uEmission;',
 'uniform float uMetallic,uRoughness,uInspectMode;',
 'void main(){vec3 n=normalize(vNormal),l=normalize(vec3(0.42,0.79,0.55));',
 'vec3 view=normalize(uEye-vWorld);float diffuse=max(dot(n,l),0.0);',
 'vec3 halfV=normalize(l+view);',
 'float shine=mix(105.0,7.0,uRoughness);',
 'float spec=pow(max(dot(n,halfV),0.0),shine)*(0.06+uMetallic*0.44);',
 'vec3 shaded=uColor.rgb*(0.24+0.76*diffuse)+vec3(spec)+uEmission;',
 'if(uInspectMode>6.5){',
  'float soft=max(dot(n,l),0.0);',
  'shaded=vec3(0.58039,0.41961,0.29804)*(0.47+0.50*soft)', 
  '+vec3(0.75,0.57,0.43)*min(0.065,pow(max(dot(n,halfV),0.0),28.0)*0.075);',
  '}', 
  'else if(uInspectMode>5.5){',
  'float soft=max(dot(n,l),0.0);',
  'shaded=vec3(0.58039,0.41961,0.29804)*(0.47+0.50*soft);',
  '}',
  'else if(uInspectMode>4.5){shaded=vec3(0.58039,0.41961,0.29804);}',
  'else if(uInspectMode>3.5){shaded=vec3(0.58039,0.41961,0.29804);}',
  'else if(uInspectMode>2.5){shaded=uColor.rgb;}',
 'else if(uInspectMode>1.5){shaded=normalize(vNormal)*0.5+0.5;}',
 'else if(uInspectMode>0.5){shaded=vec3(0.94,0.96,0.98);}',
 'gl_FragColor=vec4(shaded,uInspectMode>0.5?1.0:uColor.a);}'
].join('\n');
// Mask-based screen-space edge pass: outline is outside original geometry, never triangle wireframe.
const outlineVs=[
 'attribute vec2 aCorner;varying vec2 vUv;',
 'void main(){vUv=aCorner*0.5+0.5;gl_Position=vec4(aCorner,0.0,1.0);}'
].join('\n');
const outlineFs=[
 'precision mediump float;',
 'varying vec2 vUv;',
 'uniform sampler2D uMask;uniform vec2 uPixel;',
 'void main(){',
 'float center=step(0.5,texture2D(uMask,vUv).r);',
 'vec2 x=vec2(uPixel.x,0.0),y=vec2(0.0,uPixel.y);',
 'float nearMask=max(max(step(0.5,texture2D(uMask,vUv+x).r),',
 'step(0.5,texture2D(uMask,vUv-x).r)),',
 'max(step(0.5,texture2D(uMask,vUv+y).r),',
 'step(0.5,texture2D(uMask,vUv-y).r)));',
 'nearMask=max(nearMask,max(max(',
 'step(0.5,texture2D(uMask,vUv+x+y).r),',
 'step(0.5,texture2D(uMask,vUv-x-y).r)),',
 'max(step(0.5,texture2D(uMask,vUv-x+y).r),',
 'step(0.5,texture2D(uMask,vUv+x-y).r))));',
 'gl_FragColor=vec4(0.090,0.067,0.055,(1.0-center)*nearMask);',
 '}'
].join('\n');
const lineVs=[
 'attribute vec3 aPosition;uniform mat4 uModel,uVP;',
 'void main(){gl_Position=uVP*uModel*vec4(aPosition,1.0);}'
].join('\n');
const lineFs=['precision mediump float;uniform vec4 uColor;',
 'void main(){gl_FragColor=uColor;}'].join('\n');
export function createAIG3DRenderer(canvas,{quality='balanced',pixelRatio=1.25,maxFramePixels=3100000,maxTriangles=200000,preserveDrawingBuffer=false,background=[.004,.012,.024,1]}={}){
 if(!canvas||typeof canvas.getContext!=='function'||!finite(pixelRatio)||pixelRatio<.5||
 !Number.isInteger(maxFramePixels)||maxFramePixels<200000||maxFramePixels>3200000||
 !Number.isInteger(maxTriangles)||maxTriangles<200000||maxTriangles>700000||
 pixelRatio>3||!Array.isArray(background)||background.length!==4||
 !background.every(v=>finite(v)&&v>=0&&v<=1))throw Error('AIG3D_RENDER_TARGET_INVALID');
 getAIG3DQuality(quality);
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,preserveDrawingBuffer})||
  canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,preserveDrawingBuffer});
 if(!gl)return {status:'WEBGL_UNAVAILABLE',
  render(){return{status:'WEBGL_UNAVAILABLE'};},destroy(){},releaseMesh(){return false;},updateMeshVertices(){throw Error('WEBGL_UNAVAILABLE');},getCamera(){return null;},
  setCamera(){throw Error('WEBGL_UNAVAILABLE');},
  setInspectionMode(){throw Error('WEBGL_UNAVAILABLE');},
  getInspectionMode(){return 'UNAVAILABLE';}};
 const webgl2=typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext,
 uintExt=webgl2||gl.getExtension('OES_element_index_uint'),
 meshProg=program(gl,vs,fs),lineProg=program(gl,lineVs,lineFs);
 const u={pos:gl.getAttribLocation(meshProg,'aPosition'),
  normal:gl.getAttribLocation(meshProg,'aNormal'),
  model:gl.getUniformLocation(meshProg,'uModel'),vp:gl.getUniformLocation(meshProg,'uVP'),
  normalMatrix:gl.getUniformLocation(meshProg,'uNormal'),
  color:gl.getUniformLocation(meshProg,'uColor'),
  eye:gl.getUniformLocation(meshProg,'uEye'),
  emissive:gl.getUniformLocation(meshProg,'uEmission'),
  metal:gl.getUniformLocation(meshProg,'uMetallic'),
  rough:gl.getUniformLocation(meshProg,'uRoughness'),
  inspect:gl.getUniformLocation(meshProg,'uInspectMode')};
 const lu={pos:gl.getAttribLocation(lineProg,'aPosition'),
  model:gl.getUniformLocation(lineProg,'uModel'),
  vp:gl.getUniformLocation(lineProg,'uVP'),
  color:gl.getUniformLocation(lineProg,'uColor')};
 const camera={projection:'perspective',yaw:.7,pitch:.36,distance:14,
  focus:[0,0,0],fovDeg:48,orthoSpan:9,near:.01,far:20000};
 let dead=false,lost=false,cache=new WeakMap(),buffers=[],last=null;
 const INSPECTION_MODES=['LIT','SILHOUETTE','NORMALS','ALBEDO',
  'BLACK_CONTOUR','BROWN_FLAT','BROWN_VOLUME','BROWN_FINISH'];
 let inspectionMode='LIT';
 let currentQuality=quality,lastFrameBudget=null;
 let edgeProg=null,edgeUniforms=null,edgeQuad=null;
 let maskFbo=null,maskTexture=null,maskDepth=null,maskSize=[0,0];
 const isBrownMode=()=>INSPECTION_MODES.indexOf(inspectionMode)>=4;
 function outlineResources(width,height){
  if(!edgeProg){
   edgeProg=program(gl,outlineVs,outlineFs);
   edgeUniforms={
    corner:gl.getAttribLocation(edgeProg,'aCorner'),
    mask:gl.getUniformLocation(edgeProg,'uMask'),
    pixel:gl.getUniformLocation(edgeProg,'uPixel')
   };
   edgeQuad=createBuffer(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]));
  }
  if(maskSize[0]===width&&maskSize[1]===height)return;
  if(maskFbo){gl.deleteFramebuffer(maskFbo);gl.deleteTexture(maskTexture);
   gl.deleteRenderbuffer(maskDepth);}
  maskFbo=gl.createFramebuffer();
  maskTexture=gl.createTexture();maskDepth=gl.createRenderbuffer();
  gl.bindTexture(gl.TEXTURE_2D,maskTexture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,
   gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.bindRenderbuffer(gl.RENDERBUFFER,maskDepth);
  gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,width,height);
  gl.bindFramebuffer(gl.FRAMEBUFFER,maskFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,
   gl.TEXTURE_2D,maskTexture,0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,
   gl.RENDERBUFFER,maskDepth);
  const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.bindTexture(gl.TEXTURE_2D,null);
  gl.bindRenderbuffer(gl.RENDERBUFFER,null);
  if(ok!==gl.FRAMEBUFFER_COMPLETE)throw Error('AIG3D_BROWN_MASK_FRAMEBUFFER_BLOCK');
  maskSize=[width,height];
 }
 function compositeBlackOuterOutline(width,height){
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(edgeProg);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,maskTexture);
  gl.uniform1i(edgeUniforms.mask,0);
  // Preserve comparable apparent outer contour thickness at native 2K/4K.
  // Scale by output pixels, not 3D vertex modifications.
  const thickness=Math.max(1,Math.min(6,width/540));
  gl.uniform2f(edgeUniforms.pixel,thickness/width,thickness/height);
  gl.bindBuffer(gl.ARRAY_BUFFER,edgeQuad);
  gl.enableVertexAttribArray(edgeUniforms.corner);
  gl.vertexAttribPointer(edgeUniforms.corner,2,gl.FLOAT,false,0,0);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.disable(gl.BLEND);gl.bindTexture(gl.TEXTURE_2D,null);
  gl.enable(gl.DEPTH_TEST);
 }
 const requestedHardwareAA=gl.getContextAttributes()?.antialias===true;
 const activeMSAASamples=()=>{
  try{return requestedHardwareAA?Math.max(0,Number(gl.getParameter(gl.SAMPLES))||0):0;}
  catch{return 0;}
 };
 function createBuffer(target,arr){
  const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,arr,gl.STATIC_DRAW);
  buffers.push(b);return b;
 }
 function bufferMesh(mesh){
  let m=cache.get(mesh);if(m)return m;
  const n=mesh.positions.length/3;
  if(n>65535&&!uintExt)throw Error('AIG3D_UINT_INDEX_EXTENSION_REQUIRED');
  const idx=n>65535?new Uint32Array(mesh.indices):new Uint16Array(mesh.indices);
  m={pos:createBuffer(gl.ARRAY_BUFFER,new Float32Array(mesh.positions)),
   norm:createBuffer(gl.ARRAY_BUFFER,new Float32Array(mesh.normals)),
   indices:createBuffer(gl.ELEMENT_ARRAY_BUFFER,idx),
   count:idx.length,type:n>65535?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT};
  cache.set(mesh,m);return m;
 }
 function setCamera(patch={}){
  if(dead)throw Error('AIG3D_RENDERER_DESTROYED');
  const c={...camera,...patch};
  if(!['perspective','orthographic'].includes(c.projection)||
   ![c.yaw,c.pitch,c.distance,c.fovDeg,c.orthoSpan,c.near,c.far].every(finite)||
   Math.abs(c.pitch)>1.45||c.distance<=0||c.distance>1e6||
   c.fovDeg<15||c.fovDeg>110||c.orthoSpan<=0||
   c.near<=0||c.far<=c.near||
   !Array.isArray(c.focus)||c.focus.length!==3||!c.focus.every(finite))
   throw Error('AIG3D_CAMERA_BOUNDS_INVALID');
  Object.assign(camera,c);camera.focus=[...c.focus];
  return getCamera();
 }
 function getCamera(){return {...camera,focus:[...camera.focus]};}
 function setInspectionMode(mode){
  if(dead)throw Error('AIG3D_RENDERER_DESTROYED');
  if(!INSPECTION_MODES.includes(mode))throw Error('AIG3D_INSPECTION_MODE_INVALID');
  inspectionMode=mode;return getInspectionMode();
 }
 function getInspectionMode(){return inspectionMode;}
 function setQuality(next){
  if(dead)throw Error('AIG3D_RENDERER_DESTROYED');
  getAIG3DQuality(next);
  currentQuality=next;
  return getQuality();
 }
 function getQuality(){return {preset:currentQuality,
  ...getAIG3DQuality(currentQuality),lastFrameBudget:lastFrameBudget?
  {...lastFrameBudget}:null,hardwareMSAAContextEnabled:requestedHardwareAA,
  reportedMSAASamples:activeMSAASamples(),hardwareMSAASampleCountNotPromised:true};}
 function resize(){
  const maxTexture=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)||4096,
   gl.getParameter(gl.MAX_TEXTURE_SIZE)||4096,8192);
  const budget=resolveAIG3DFrameBudget({
   cssWidth:canvas.clientWidth||canvas.width||640,
   cssHeight:canvas.clientHeight||canvas.height||420,
   preset:currentQuality,deviceLimit:maxTexture,
   maxFramePixels
  });
  if(canvas.width!==budget.width)canvas.width=budget.width;
  if(canvas.height!==budget.height)canvas.height=budget.height;
  gl.viewport(0,0,budget.width,budget.height);
  lastFrameBudget=budget;
 }

 function eyeAndVP(){
  const {focus:f,yaw:y,pitch:p,distance:d}=camera;
  const eye=[f[0]+d*Math.sin(y)*Math.cos(p),f[1]+d*Math.sin(p),
   f[2]+d*Math.cos(y)*Math.cos(p)];
  const projection=camera.projection==='perspective'?
   perspective(camera.fovDeg*Math.PI/180,canvas.width/Math.max(1,canvas.height),camera.near,camera.far):
   orthographic(camera.orthoSpan,canvas.width/Math.max(1,canvas.height),camera.near,camera.far);
  return {eye,vp:multiply(projection,lookAt(eye,f,[0,1,0]))};
 }
 function meshDraw(node,model,vp,eye,forcedInspection=null){
  const mesh=bufferMesh(node.mesh),mat=node.material;
  gl.useProgram(meshProg);
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pos);
  gl.enableVertexAttribArray(u.pos);gl.vertexAttribPointer(u.pos,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.norm);
  gl.enableVertexAttribArray(u.normal);gl.vertexAttribPointer(u.normal,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.indices);
  gl.uniformMatrix4fv(u.model,false,new Float32Array(model));
  gl.uniformMatrix4fv(u.vp,false,vp);
  gl.uniformMatrix3fv(u.normalMatrix,false,normalMatrix(model));
  gl.uniform4fv(u.color,new Float32Array(mat.baseColor));
  gl.uniform3fv(u.eye,new Float32Array(eye));
  gl.uniform3fv(u.emissive,new Float32Array(mat.emissive));
  gl.uniform1f(u.metal,mat.metallic);gl.uniform1f(u.rough,mat.roughness);
  gl.uniform1f(u.inspect,forcedInspection===null?INSPECTION_MODES.indexOf(inspectionMode):forcedInspection);
  if(mat.doubleSided)gl.disable(gl.CULL_FACE);else gl.enable(gl.CULL_FACE);
  gl.drawElements(gl.TRIANGLES,mesh.count,mesh.type,0);
  return mesh.count/3;
 }
 function renderPaths(segments,vp){
  const rapid=[],feed=[];
  for(const s of segments)(s.motion==='G0'?rapid:feed).push(...s.from,...s.to);
  gl.useProgram(lineProg);gl.uniformMatrix4fv(lu.model,false,identity());
  gl.uniformMatrix4fv(lu.vp,false,vp);gl.disable(gl.CULL_FACE);
  for(const [points,col] of [[rapid,[.57,.65,.71,1]],[feed,[.09,.75,1,1]]]){
   if(!points.length)continue;
   const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STREAM_DRAW);
   gl.enableVertexAttribArray(lu.pos);gl.vertexAttribPointer(lu.pos,3,gl.FLOAT,false,0,0);
   gl.uniform4fv(lu.color,new Float32Array(col));gl.drawArrays(gl.LINES,0,points.length/3);
   gl.deleteBuffer(b);
  }
  return {rapid:rapid.length/6,feed:feed.length/6};
 }
 function render(scene,exactOutput=null){
  if(dead)throw Error('AIG3D_RENDERER_DESTROYED');
  if(lost)return {status:'WEBGL_CONTEXT_LOST'};
  if(scene?.schema!=='AIG_REAL3D_SCENE_V1')throw Error('AIG3D_SCENE_SCHEMA_INVALID');
  if(exactOutput){
   const {width,height}=exactOutput;
   const glLimit=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),
    gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
   if(!Number.isInteger(width)||!Number.isInteger(height)||
    width<320||height<320||width*height>9000000||
    Math.max(width,height)>glLimit)
    throw Error('AIG3D_NATIVE_GPU_IMAGE_DIMENSIONS_BLOCKED');
   if(canvas.width!==width)canvas.width=width;
   if(canvas.height!==height)canvas.height=height;
   gl.viewport(0,0,width,height);
   lastFrameBudget={maxFramePixels:9000000,effectiveScale:1,
    targetScale:1,cappedBySafety:false};
  }else resize();
  const {eye,vp}=eyeAndVP();
  const brown=isBrownMode();
  if(brown){
   outlineResources(canvas.width,canvas.height);
   gl.bindFramebuffer(gl.FRAMEBUFFER,maskFbo);
   gl.viewport(0,0,canvas.width,canvas.height);
   gl.clearColor(0,0,0,1);gl.clearDepth(1);
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   for(const node of scene.nodes)if(node.visible){
    // White mask uses original indexed XYZ triangles in the very same GPU.
    meshDraw(node,getAIG3DWorldMatrix(scene,node.id),vp,eye,1);
   }
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);
   gl.viewport(0,0,canvas.width,canvas.height);
  }
  gl.clearColor(...background);gl.clearDepth(1);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  let triangles=0,nodes=0,rapid=0,feed=0;
  for(const node of scene.nodes)if(node.visible){
   if(triangles+node.mesh.triangleCount>maxTriangles)
    throw Error('AIG3D_GPU_TRIANGLE_BUDGET_BLOCKED');
   if(inspectionMode!=='BLACK_CONTOUR')
    meshDraw(node,getAIG3DWorldMatrix(scene,node.id),vp,eye);
   triangles+=node.mesh.triangleCount;nodes++;
  }
  if(brown)compositeBlackOuterOutline(canvas.width,canvas.height);
  else for(const overlay of scene.overlays){
   const x=renderPaths(overlay.segments,vp);rapid+=x.rapid;feed+=x.feed;
  }
  last={status:'WEBGL_XYZ_TRIANGLES_RENDERED',webglVersion:webgl2?2:1,
   triangles,nodes,rapid,feed,cameraProjection:camera.projection,
   inspectionMode,postProcessBloomApplied:false,
   exactCoffeeBrownOverride:brown&&inspectionMode!=='BLACK_CONTOUR',
   blackContourFromRealGPUObjectMask:brown,
   blackOutlineNotTriangleWireframe:brown,
   meshVertexPositionsModifiedByRenderer:false,
   allocatedFramePixels:canvas.width*canvas.height,maxFramePixels:lastFrameBudget.maxFramePixels,
   antialiasProfile:currentQuality,effectiveSuperSampleScale:lastFrameBudget.effectiveScale,
   requestedSuperSampleScale:lastFrameBudget.targetScale,
   safetyClamped:lastFrameBudget.cappedBySafety,
   hardwareMSAAContextEnabled:requestedHardwareAA,
   reportedMSAASamples:activeMSAASamples(),
   framebufferRGBBits:[gl.RED_BITS,gl.GREEN_BITS,gl.BLUE_BITS].map(v=>gl.getParameter(v)),
   finalDisplayPixelOneBlendedRGBColor:true,realMirrorReflection:false,
   actualStockRemovedMm3:null,removalNotImplemented:true,
   source:auditAIG3DScene(scene).source};
  return {...last};
 }
 /**
  * Capture ACTUAL current shared-WebGL 3D scene at genuine target pixel size.
  * The same GPU renderer is reused; canvas dimensions are restored before
  * yielding asynchronously to the PNG encoder. Never resize a smaller bitmap.
  */
 async function captureNativePNG(scene,{width=1080,height=1920}={}){
  if(dead||lost)throw Error('AIG3D_CAPTURE_CONTEXT_UNAVAILABLE');
  if(!globalThis.crypto?.subtle)throw Error('AIG3D_SHA256_UNAVAILABLE');
  let raw,frame;
  try{
   frame=render(scene,{width,height});
   if(frame.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||frame.triangles<2000)
    throw Error('AIG3D_NO_REAL_HUMAN_INDEXED_TRIANGLES');
   raw=new Uint8Array(width*height*4);
   gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,raw);
   if(gl.getError()!==gl.NO_ERROR||lost)
    throw Error('AIG3D_WEBGL_PIXEL_READBACK_FAILED');
  }finally{
   // Restore user-viewer native canvas/viewport even on capture errors.
   try{render(scene);}catch{}
  }
  const unique=new Set();
  for(let y=0;y<height;y+=Math.max(1,Math.floor(height/23)))
   for(let x=0;x<width;x+=Math.max(1,Math.floor(width/15))){
    const i=(y*width+x)*4;
    unique.add(raw[i]+','+raw[i+1]+','+raw[i+2]);
   }
  // A genuine flat silhouette/albedo can have only two colors.
  // Diagnose its nonblank foreground pixels instead of incorrectly
  // demanding 8 palette colors. Keep original LIT proof unchanged.
  let diagnosticForegroundPixels=0;
  if(inspectionMode!=='LIT'){
   const bg=background.slice(0,3).map(x=>x*255);
   for(let i=0;i<raw.length;i+=28){
    const distance=Math.abs(raw[i]-bg[0])+
      Math.abs(raw[i+1]-bg[1])+Math.abs(raw[i+2]-bg[2]);
    if(distance>75)diagnosticForegroundPixels++;
   }
   if(diagnosticForegroundPixels<70)
    throw Error('AIG3D_GPU_INSPECTION_NO_VISIBLE_GEOMETRY');
  }else if(unique.size<8)throw Error('AIG3D_GPU_SNAPSHOT_BLANK');
  const temp=document.createElement('canvas');
  temp.width=width;temp.height=height;
  const ctx=temp.getContext('2d');
  if(!ctx)throw Error('AIG3D_PNG_CANVAS_UNAVAILABLE');
  const pixels=new Uint8ClampedArray(raw.length);
  for(let y=0;y<height;y++){
   const start=(height-1-y)*width*4;
   pixels.set(raw.subarray(start,start+width*4),y*width*4);
  }
  ctx.putImageData(new ImageData(pixels,width,height),0,0);
  const blob=await new Promise((resolve,reject)=>
   temp.toBlob(v=>v?resolve(v):reject(Error('AIG3D_PNG_ENCODE_FAILED')),
    'image/png'));
  const bytes=await blob.arrayBuffer();
  if(bytes.byteLength<(inspectionMode==='LIT'?12000:1400))
   throw Error('AIG3D_PNG_TOO_SMALL');
  const png=new DataView(bytes);
  if(png.getUint32(0,false)!==0x89504e47||
   png.getUint32(12,false)!==0x49484452||
   png.getUint32(16,false)!==width||
   png.getUint32(20,false)!==height)
   throw Error('AIG3D_NATIVE_PNG_IHDR_MISMATCH');
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const sha256=Array.from(new Uint8Array(digest),
   a=>a.toString(16).padStart(2,'0')).join('');
  return {blob,width,height,sha256,genuineGpuReadback:true,
   nativeOutputPixels:width*height,resampledFromSmallerImage:false,
   sourceView:'front',rendererKind:'existing shared AIG3D WebGL',
   originalGeometryUnchanged:true,visualHumanAcceptancePASS:false,
   actualColorSamples:unique.size};
 }
 const contextLost=e=>{e.preventDefault();lost=true;};
 canvas.addEventListener('webglcontextlost',contextLost);
 /**
  * In-place GPU sub-buffer pose update. Index/topology buffer is NEVER touched.
  * Caller must supply the complete next CPU arrays plus sorted LOCAL changed ids.
  * Coalesce adjacent indices to avoid one GPU command per vertex.
  */
 function updateMeshVertices(mesh,{
  positions,normals,changedVertexIndices
 }={}){
  if(dead||lost)throw Error('AIG3D_GPU_DELTA_RENDERER_NOT_READY');
  if(!mesh||!Array.isArray(mesh.positions)||!Array.isArray(mesh.normals)||
   !Array.isArray(mesh.indices)||!Array.isArray(positions)||
   !Array.isArray(normals)||positions.length!==mesh.positions.length||
   normals.length!==mesh.normals.length||positions.length!==normals.length||
   !Array.isArray(changedVertexIndices))
   throw Error('AIG3D_GPU_DELTA_SOURCE_INVALID');
  let prior=-1;
  for(const id of changedVertexIndices){
   if(!Number.isInteger(id)||id<=prior||id<0||id>=mesh.vertexCount)
    throw Error('AIG3D_GPU_DELTA_ORIGINAL_VERTEX_INDICES_INVALID');
   prior=id;
   for(let axis=0;axis<3;axis++)if(!finite(positions[id*3+axis])||
    !finite(normals[id*3+axis])||Math.abs(normals[id*3+axis])>1.0001)
    throw Error('AIG3D_GPU_DELTA_VERTEX_DATA_INVALID');
  }
  if(!changedVertexIndices.length)return {
   changedVertexCount:0,positionSubDataCalls:0,normalSubDataCalls:0,
   originalIndexBufferReused:true,fullGPUBufferReallocation:false
  };
  const cached=bufferMesh(mesh);
  // Validate first, then commit mutations to both live CPU mesh and GPU buffers.
  for(const id of changedVertexIndices)for(let j=0;j<3;j++){
   mesh.positions[id*3+j]=positions[id*3+j];
   mesh.normals[id*3+j]=normals[id*3+j];
  }
  const groups=[];let start=changedVertexIndices[0],end=start;
  for(let i=1;i<changedVertexIndices.length;i++){
   const id=changedVertexIndices[i];
   if(id===end+1){end=id;continue;}
   groups.push([start,end]);start=end=id;
  }
  groups.push([start,end]);
  for(const [a,b] of groups){
   const from=a*3,to=(b+1)*3;
   gl.bindBuffer(gl.ARRAY_BUFFER,cached.pos);
   gl.bufferSubData(gl.ARRAY_BUFFER,from*4,new Float32Array(positions.slice(from,to)));
   gl.bindBuffer(gl.ARRAY_BUFFER,cached.norm);
   gl.bufferSubData(gl.ARRAY_BUFFER,from*4,new Float32Array(normals.slice(from,to)));
  }
  return {changedVertexCount:changedVertexIndices.length,
   positionSubDataCalls:groups.length,normalSubDataCalls:groups.length,
   originalIndexBufferReused:true,fullGPUBufferReallocation:false,
   entireOriginalGeometryWasNotReuploaded:true};
 }
 /**
  * Real completed-frame diagnostic. gl.finish() waits for submitted GPU draw
  * commands: this intentionally stalls the pipeline and is NOT animation FPS.
  * Only use for bounded QA, not during interactive runtime playback.
  */
 function measureCompletedFrame(scene){
  if(dead||lost)throw Error('AIG3D_GPU_FRAME_PROBE_CONTEXT_UNAVAILABLE');
  const before=performance.now();
  const frame=render(scene);
  if(frame.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')
   throw Error('AIG3D_GPU_FRAME_PROBE_RENDER_BLOCKED');
  gl.finish();
  if(gl.getError()!==gl.NO_ERROR||lost)
   throw Error('AIG3D_GPU_FRAME_PROBE_FINISH_BLOCKED');
  return {
   schema:'AIG_REAL3D_COMPLETED_GPU_RENDER_WALL_PROBE_V1',
   completedGPUDrawAndSubmissionWallMs:Math.round((performance.now()-before)*1000)/1000,
   trueGLFinishSynchronization:true,
   originalIndexedTrianglesRendered:frame.triangles,
   gpuIndexAndSourcePreserved:true,
   interactive60FPSProven:false,
   devicePowerThermalStressPASS:false
  };
 }
 function releaseMesh(mesh){
  if(dead||!mesh)return false;
  const old=cache.get(mesh);
  if(!old)return false;
  const toDelete=[old.pos,old.norm,old.indices];
  for(const buffer of toDelete){
   gl.deleteBuffer(buffer);
   const at=buffers.indexOf(buffer);
   if(at>=0)buffers.splice(at,1);
  }
  cache.delete(mesh);
  return true;
 }
 function destroy(){
  if(dead)return;dead=true;
  canvas.removeEventListener('webglcontextlost',contextLost);
  for(const b of buffers)gl.deleteBuffer(b);
  gl.deleteProgram(meshProg);gl.deleteProgram(lineProg);
  if(edgeProg)gl.deleteProgram(edgeProg);
  if(maskFbo){gl.deleteFramebuffer(maskFbo);gl.deleteTexture(maskTexture);
   gl.deleteRenderbuffer(maskDepth);}
  buffers=[];cache=new WeakMap();
 }
 return {status:'READY',contextVersion:webgl2?2:1,render,destroy,
  setCamera,getCamera,setInspectionMode,getInspectionMode,
  setQuality,getQuality,releaseMesh,updateMeshVertices,measureCompletedFrame,captureNativePNG,
  getGpuLimit:()=>lost||dead?0:Math.min(
   gl.getParameter(gl.MAX_TEXTURE_SIZE),gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)),
  getLastStats:()=>last?{...last}:null};
}
