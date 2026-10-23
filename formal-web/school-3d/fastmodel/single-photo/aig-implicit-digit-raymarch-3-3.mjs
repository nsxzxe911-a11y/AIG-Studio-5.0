/**
 * Real3D 3.3 genuine GPU signed-distance ray-marched skin.
 * The visible finger/toe surface is found by ray marching an analytical
 * smooth union of source-bounded capsule distances + palm/sole ellipsoid.
 * One invisible rasterization bounding box (12 triangles) per available
 * hand/foot creates FRAGMENTS ONLY; its faces are NEVER the visible skin.
 * No new WebGL context. Fallback remains 3.2 GPU mesh if GLSL3 unsupported.
 *
 * NOT real human measurements, no print-ready solid, no sampled source nails.
 */
import * as THREE from 'three';
import {AIG33_SCHEMA,AIG33_CAPSULES_PER_GROUP}
 from './aig-implicit-digit-field-3-3.mjs';
export const AIG33_SHADER_SCHEMA='AIG_REAL3D_3_3_GLSL3_ANALYTIC_SDF_DEPTH_SKIN_V1';
const vertexShader=`precision highp float;
out vec3 vWorld;
void main(){
 vec4 world=modelMatrix*vec4(position,1.0);
 vWorld=world.xyz;
 gl_Position=projectionMatrix*viewMatrix*world;
}`;
const fragmentShader=`precision highp float;
precision highp int;
in vec3 vWorld;
out vec4 outColor;
uniform vec3 uCapsA[14];
uniform vec3 uCapsB[14];
uniform float uCapsR[14];
uniform vec3 uPalmCenter;
uniform vec3 uPalmRadius;
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform vec3 uLinearRGB;
uniform float uBlend;
uniform float uEpsilon;
uniform int uSteps;
float capsule(vec3 p,vec3 a,vec3 b,float rad){
 vec3 ab=b-a;
 float t=clamp(dot(p-a,ab)/max(dot(ab,ab),1.0e-8),0.0,1.0);
 return length(p-a-ab*t)-rad;
}
float palmEllipsoid(vec3 p,vec3 center,vec3 radius){
 vec3 delta=p-center;
 float k0=length(delta/radius),k1=length(delta/(radius*radius));
 return k0*(k0-1.0)/max(k1,1.0e-5);
}
float smoothUnion(float a,float b,float blend){
 float h=max(blend-abs(a-b),0.0)/blend;
 return min(a,b)-h*h*blend*0.25;
}
float sceneDistance(vec3 p){
 float d=palmEllipsoid(p,uPalmCenter,uPalmRadius);
 for(int i=0;i<14;i++){
  float next=capsule(p,uCapsA[i],uCapsB[i],uCapsR[i]);
  d=smoothUnion(d,next,uBlend);
 }
 return d;
}
vec3 fieldNormal(vec3 p){
 float e=uEpsilon*1.5;
 vec3 dx=vec3(e,0.,0.),dy=vec3(0.,e,0.),dz=vec3(0.,0.,e);
 return normalize(vec3(sceneDistance(p+dx)-sceneDistance(p-dx),
  sceneDistance(p+dy)-sceneDistance(p-dy),
  sceneDistance(p+dz)-sceneDistance(p-dz)));
}
vec3 linearToSRGB(vec3 v){
 vec3 lo=v*12.92;
 vec3 hi=1.055*pow(max(v,vec3(0.)),vec3(1./2.4))-.055;
 return clamp(mix(lo,hi,greaterThan(v,vec3(.0031308))),0.,1.);
}
void main(){
 vec3 ro=cameraPosition,rd=normalize(vWorld-cameraPosition);
 // Slab intersection of the actual source-anchored group proxy.
 // Proxies only restrict fragments; they never form visible triangle skin.
 vec3 safeDir=sign(rd+vec3(1.0e-8))*max(abs(rd),vec3(1.e-6));
 vec3 inv=1.0/safeDir;
 vec3 lo=(uBoxMin-ro)*inv,hi=(uBoxMax-ro)*inv;
 vec3 tMin=min(lo,hi),tMax=max(lo,hi);
 float enter=max(max(tMin.x,tMin.y),tMin.z);
 float leave=min(min(tMax.x,tMax.y),tMax.z);
 float t=max(enter,0.0);
 if(leave<=t)discard;
 vec3 p=ro;
 bool hit=false;
 for(int i=0;i<64;i++){
  if(i>=uSteps||t>leave)break;
  p=ro+rd*t;
  float d=sceneDistance(p);
  if(d<uEpsilon){hit=true;break;}
  t+=max(d*0.68,uEpsilon*.46);
 }
 if(!hit)discard;
 vec3 n=fieldNormal(p);
 vec3 key=normalize(vec3(.35,.8,.7));
 vec3 fill=normalize(vec3(-.75,.22,.5));
 float diffuse=max(dot(n,key),0.);
 float softFill=max(dot(n,fill),0.);
 float rim=pow(1.-max(dot(n,-rd),0.),2.5);
 vec3 light=uLinearRGB*(.29+.56*diffuse+.18*softFill);
 light+=uLinearRGB*rim*.1;
 outColor=vec4(linearToSRGB(clamp(light,0.,1.)),1.);
 // SDF surface depth, not proxy cube depth: correct occlusion vs original body.
 vec4 eye=viewMatrix*vec4(p,1.);
 vec4 clip=projectionMatrix*eye;
 gl_FragDepth=clamp((clip.z/max(clip.w,1.e-8))*.5+.5,0.,1.);
}`;
export function makeAIG33RayMarchGroup(part,linearRGB){
 if(!part?.centerline||part.centerline.length!==AIG33_CAPSULES_PER_GROUP||
  !Array.isArray(linearRGB)||linearRGB.length!==3||
  linearRGB.some(x=>!Number.isFinite(x)||x<0||x>1)||
  !part.span?.every(v=>Number.isFinite(v)&&v>0))
  throw Error('AIG33_VERIFIED_GROUP_REQUIRED');
 const geometry=new THREE.BoxGeometry(...part.span);
 const center=part.min.map((v,i)=>(v+part.max[i])*.5);
 geometry.translate(...center);
 const material=new THREE.ShaderMaterial({
  glslVersion:THREE.GLSL3,
  vertexShader,fragmentShader,
  uniforms:{
   uCapsA:{value:part.centerline.map(x=>new THREE.Vector3(...x.a))},
   uCapsB:{value:part.centerline.map(x=>new THREE.Vector3(...x.b))},
   uCapsR:{value:part.centerline.map(x=>x.radius)},
   uPalmCenter:{value:new THREE.Vector3(...part.palmCenter)},
   uPalmRadius:{value:new THREE.Vector3(...part.palmRadius)},
   uBoxMin:{value:new THREE.Vector3(...part.min)},
   uBoxMax:{value:new THREE.Vector3(...part.max)},
   uLinearRGB:{value:new THREE.Vector3(...linearRGB)},
   uBlend:{value:part.blendingWidth},
   uEpsilon:{value:Math.max(.0005,part.estimatedSourceBodyUnits*.00043)},
   uSteps:{value:part.maxMarchSteps}
  },
  side:THREE.BackSide,depthTest:true,depthWrite:true,
  transparent:false
 });
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='AIG33_ANALYTIC_SDF_SKIN_'+part.group;
 mesh.frustumCulled=false;
 mesh.userData={
  actualSkinComputation:AIG33_SHADER_SCHEMA,
  sourceSha256:part.sourceSha256,
  directFragmentRayMarch:true,
  surfaceNotDerivedFromProxyTriangles:true,
  proxyTriangleCount:12,
  analyticalCapsules:14,
  sourceDigits:5,
  sourcePhalanges:14,
  actualMeasuredHumanDigits:false,
  noNewRenderer:true
 };
 return mesh;
}
export function makeAIG33ImplicitSkinLayer(field,paletteByGroup){
 if(field?.schema!==AIG33_SCHEMA||!Array.isArray(field.parts)||
  !paletteByGroup||typeof paletteByGroup!=='object')
  throw Error('AIG33_VALIDATED_SOURCE_IMPLICIT_FIELD_REQUIRED');
 const group=new THREE.Group();
 group.name='AIG33_DIRECT_SDF_FINGER_TOE_SKIN_ONE_WEBGL';
 for(const p of field.parts){
  const c=paletteByGroup[p.group];
  if(!c)throw Error('AIG33_SOURCE_LINEAR_COLOR_MISSING_'+p.group);
  group.add(makeAIG33RayMarchGroup(p,c));
 }
 group.userData={
  actualSkinComputation:AIG33_SHADER_SCHEMA,
  fromSourceSHA:field.sourceSha256,
  directSDFRayMarchGroupCount:group.children.length,
  visibleDigitSurfaceIsTriangulated:false,
  boundingProxyTrianglesAreNotSkin:true,
  correctFragmentDepthShaderWrites:true,
  derivedFromSourceMeasuredIndividualDigits:false,
  humanAppearanceApproved:false
 };
 return group;
}
