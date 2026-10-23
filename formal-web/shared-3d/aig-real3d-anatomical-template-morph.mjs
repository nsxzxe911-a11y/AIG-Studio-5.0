/**
 * AIG REAL3D next candidate: continuous FRONT/BACK anatomical landmark
 * cage, NOT spheres, SDF, capsules, metaballs or old disconnected parts.
 *
 * A single closed three-dimensional template surface is built from:
 *   - manually authored left/right silhouette landmarks including thumb,
 *     palm, heel/toe, ankle, crotch, jaw/neck, shoulder, waist and hips;
 *   - an interior control-surface triangulation (ear clipping),
 *   - adaptive subdivision of the common polygon cage,
 *   - different front/back anatomical surface depths + face relief,
 *   - vertex-joined perimeter wall.
 *
 * Still an UNVERIFIED experimental base-body template: neither a licensed
 * scan nor a true full skeletal deformable skin, and definitely not photo 1:1.
 */
import {createAIG3DScene,createAIG3DMesh,addAIG3DNode}
 from './aig-real3d-core.mjs';
export const AIG_TEMPLATE_MORPH_SCHEMA='AIG_REAL3D_SINGLE_CAGE_ANATOMICAL_TEMPLATE_V1';
export const AIG_TEMPLATE_METHODS=Object.freeze(['template-morph','subdivision']);
const fail=m=>{throw Error('AIG_TEMPLATE_'+m)};
const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
const interpolate=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
const profileSpec=gender=>gender==='male'?{
 H:1.78,shoulder:1.01,hip:.97,waist:1,chest:1,head:1
}:{H:1.68,shoulder:.94,hip:1.08,waist:.92,chest:1,head:.99};
function landmarks(gender,options={}){
 if(!['male','female'].includes(gender))fail('GENDER');
 const spec=profileSpec(gender),heightMm=options.heightMm??Math.round(spec.H*1000),
  build=options.build??50;
 if(!Number.isInteger(heightMm)||heightMm<900||heightMm>2200||
  !Number.isFinite(build)||build<0||build>100)
  fail('MORPH_PARAMETER_RANGE');
 const mass=(build-50)/50;
 const c={
  head:s=>spec.head*s,
  shoulder:s=>spec.shoulder*s,
  upper:s=>spec.shoulder*s,
  chest:s=>spec.chest*s,
  waist:s=>spec.waist*s*(1+mass*.19),
  hip:s=>spec.hip*s*(1+mass*.135),
  leg:s=>s*(1+mass*.08),
  hand:s=>s
 };
 const contours=[
  // X is fraction of standing height. Y=0 ground; one right half traces
  // scalp → shoulder → outer arm/hand → inner arm → torso → outer leg /
  // real toe/heel → inner leg → crotch. Left is its exact mirror.
  [0,1.000,'head'],
  [.022,.998,'head'],[.038,.990,'head'],
  [.054,.976,'head'],[.059,.950,'head'],
  [.058,.925,'head'],[.051,.902,'head'],
  [.039,.881,'head'],[.033,.866,'head'],
  [.036,.853,'shoulder'],[.064,.847,'shoulder'],
  [.096,.845,'shoulder'],[.124,.839,'shoulder'],
  [.143,.818,'upper'],[.160,.793,'upper'],
  [.166,.754,'upper'],[.174,.693,'upper'],
  [.186,.622,'upper'],[.191,.554,'upper'],
  [.192,.501,'hand'],[.200,.491,'hand'],
  [.207,.478,'hand'],[.211,.450,'hand'],
  [.211,.427,'hand'],[.205,.418,'hand'],
  [.201,.427,'hand'],[.196,.417,'hand'],
  [.189,.423,'hand'],[.185,.442,'hand'],
  [.183,.457,'hand'],[.179,.490,'hand'],
  [.173,.523,'upper'],[.156,.606,'upper'],
  [.142,.693,'upper'],[.125,.756,'upper'],
  [.112,.779,'shoulder'],
  [.112,.754,'chest'],[.107,.716,'chest'],
  [.100,.665,'waist'],[.086,.615,'waist'],
  [.091,.580,'waist'],[.110,.551,'hip'],
  [.127,.518,'hip'],[.129,.489,'hip'],
  [.124,.451,'hip'],[.117,.403,'leg'],
  [.103,.358,'leg'],[.095,.323,'leg'],
  [.093,.301,'leg'],[.096,.267,'leg'],
  [.094,.219,'leg'],[.080,.150,'leg'],
  [.072,.099,'leg'],[.069,.063,'leg'],
  // Heel + toes have a flat TRUE plantar sole at Y0, not metaball spheres.
  [.071,.035,'leg'],[.083,.026,'leg'],
  [.097,.019,'leg'],[.104,.011,'leg'],
  [.101,.004,'leg'],[.092,.000,'leg'],
  [.073,.000,'leg'],[.059,.005,'leg'],
  [.054,.016,'leg'],[.055,.045,'leg'],
  [.053,.072,'leg'],[.058,.125,'leg'],
  [.063,.179,'leg'],[.065,.235,'leg'],
  [.061,.279,'leg'],[.060,.323,'leg'],
  [.069,.369,'leg'],[.069,.425,'leg'],
  [.064,.475,'leg'],[.044,.506,'hip'],
  [0,.507,'hip']
 ];
 const world=contours.map(([x,y,k])=>[x*c[k](1),y]);
 // Mirror creates one watertight OUTLINE with one central groin saddle,
 // not two separate legs joined by a metaball.
 const polygon=world.concat(world.slice(1,-1).reverse().map(([x,y])=>[-x,y]));
 return {gender,heightMm,build,points:polygon,
  headToBodyRatio:1/.14,sourceLandmarks:contours.length*2-2};
}
function area(poly){
 let a=0;for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length];a+=p[0]*q[1]-q[0]*p[1];
 }return a/2;
}
function signedArea(a,b,c){
 return (b[0]-a[0])*(c[1]-a[1])-
  (b[1]-a[1])*(c[0]-a[0]);
}
function insideTriangle(p,a,b,c){
 const d1=signedArea(a,b,p),d2=signedArea(b,c,p),
  d3=signedArea(c,a,p);
 return d1>=-1e-12&&d2>=-1e-12&&d3>=-1e-12;
}
function triangulate(poly){
 const order=Array.from({length:poly.length},(_,i)=>i);
 if(area(poly)<0)order.reverse();
 const triangles=[];
 let limit=poly.length*poly.length;
 while(order.length>3&&--limit>0){
  let earFound=false;
  for(let k=0;k<order.length;k++){
   const a=order[(k-1+order.length)%order.length],
    b=order[k],c=order[(k+1)%order.length];
   if(signedArea(poly[a],poly[b],poly[c])<=1e-11)continue;
   let contains=false;
   for(const id of order){
    if(id===a||id===b||id===c)continue;
    if(insideTriangle(poly[id],poly[a],poly[b],poly[c])){
     contains=true;break;
    }
   }
   if(contains)continue;
   triangles.push(a,b,c);order.splice(k,1);
   earFound=true;break;
  }
  if(!earFound)fail('LANDMARK_CAGE_NOT_SIMPLE_OR_DEGENERATE');
 }
 if(order.length!==3||limit<=0)fail('TRIANGULATION_EXHAUSTED');
 triangles.push(...order);
 return triangles;
}
function chaikin(source,rounds=1){
 let points=source.map(x=>[...x]);
 for(let r=0;r<rounds;r++){
  const next=[];
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length];
   next.push(interpolate(a,b,.25),interpolate(a,b,.75));
  }
  points=next;
 }
 return points;
}
function subdivide(positions,triangles,steps){
 let v=positions.map(p=>[...p]),tris=[...triangles];
 for(let i=0;i<steps;i++){
  const cache=new Map(),refine=[];
  const middle=(a,b)=>{
   const key=Math.min(a,b)+':'+Math.max(a,b);
   let val=cache.get(key);
   if(val!==undefined)return val;
   val=v.length;v.push(interpolate(v[a],v[b],.5));
   cache.set(key,val);return val;
  };
  for(let j=0;j<tris.length;j+=3){
   const [a,b,c]=tris.slice(j,j+3),
    ab=middle(a,b),bc=middle(b,c),ca=middle(c,a);
   refine.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
  }
  tris=refine;
 }
 return {points:v,triangles:tris};
}
function distToSegment(p,a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],v=dx*dx+dy*dy||1;
 const t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/v,0,1);
 return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);
}
function gauss(x,y,cx,cy,rx,ry){
 return Math.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2));
}
function depth(x,y,edgeDistance,gender,face){
 let thickness=y>.86?.044:y>.80?.058:
  y>.52?.078:y>.48?.075:.047;
 if(y>.38&&y<.82&&Math.abs(x)>.12)thickness=.029;
 if(y<.38&&Math.abs(x)>.034)thickness=.045;
 const level=clamp(edgeDistance/(y>.83?.050:y>.49?.052:.039),0,1);
 const round=Math.sqrt(level*(2-level));
 const side=face?-1:1,backFactor=face?1:.8;
 let relief=0;
 if(face&&y>.865){
  // Actual concave/convex front anatomy geometry (not a face texture).
  relief-=.011*gauss(x,y,0,.934,.013,.025); // bridge of nose
  relief+=.003*gauss(x,y,-.028,.948,.017,.010);
  relief+=.003*gauss(x,y,.028,.948,.017,.010);
  relief-=.0035*gauss(x,y,0,.899,.026,.012); // chin
 }
 if(face&&gender==='female'&&y>.74&&y<.83)
  relief-=.011*(gauss(x,y,-.070,.775,.043,.048)+
   gauss(x,y,.070,.775,.043,.048));
 return side*thickness*round*backFactor+relief;
}
function normalize3(x,y,z){
 const h=Math.hypot(x,y,z)||1;return[x/h,y/h,z/h];
}
export function buildAIGReal3DTemplateMorph({
 gender='female',heightMm=null,build=50,method='template-morph',
 signal=null
}={}){
 if(!AIG_TEMPLATE_METHODS.includes(method))fail('METHOD');
 const profile=profileSpec(gender);
 const model=landmarks(gender,{heightMm:heightMm??Math.round(profile.H*1000),build});
 const H=model.heightMm/1000;
 let outline=chaikin(model.points,method==='subdivision'?2:1);
 if(area(outline)<0)outline.reverse();
 const initial=triangulate(outline),steps=method==='subdivision'?3:2;
 const refined=subdivide(outline,initial,steps);
 if(signal?.aborted)fail('CANCELLED');
 const points=refined.points,tri=refined.triangles,n=points.length;
 const maxVertices=170000;
 if(n>maxVertices||tri.length/3>185000)
  fail('SOURCE_MESH_BUDGET');
 const positions=[],indices=[],normals=[];
 const boundary=outline.length;
 // The original polygon boundary remains indexed [0..boundary-1],
 // including after subdivision. Other vertices are interior.
 const edgeDistances=points.map(p=>{
  let d=Infinity;
  for(let i=0;i<outline.length;i++)
   d=Math.min(d,distToSegment(p,outline[i],outline[(i+1)%outline.length]));
  return d;
 });
 for(const face of [true,false]){
  for(let i=0;i<n;i++){
   const [x,y]=points[i],z=depth(x,y,edgeDistances[i],gender,face);
   positions.push(x*H,y*H,z*H);
  }
 }
 // Front and rear topology differ in winding. One connected closed shell.
 for(let i=0;i<tri.length;i+=3){
  const a=tri[i],b=tri[i+1],c=tri[i+2];
  indices.push(a,c,b,n+a,n+b,n+c);
 }
 for(let k=0;k<boundary;k++){
  const next=(k+1)%boundary,a=k,b=next,c=n+k,d=n+next;
  indices.push(a,b,d,a,d,c);
 }
 const normBuf=new Float64Array(positions.length);
 for(let i=0;i<indices.length;i+=3){
  const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
  const u=[positions[b]-positions[a],positions[b+1]-positions[a+1],
   positions[b+2]-positions[a+2]];
  const v=[positions[c]-positions[a],positions[c+1]-positions[a+1],
   positions[c+2]-positions[a+2]];
  const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],
   u[0]*v[1]-u[1]*v[0]];
  for(const j of [a,b,c]){
   normBuf[j]+=cross[0];normBuf[j+1]+=cross[1];normBuf[j+2]+=cross[2];
  }
 }
 for(let i=0;i<normBuf.length;i+=3){
  normals.push(...normalize3(normBuf[i],normBuf[i+1],normBuf[i+2]));
 }
 // Topology gate: triangles must share one vertex-connected manifold;
 // side wall must connect front and back at EVERY perimeter segment.
 const edges=new Map(),parent=Array.from({length:positions.length/3},(_,i)=>i);
 const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x]}return x;};
 const join=(a,b)=>{const x=find(a),y=find(b);if(x!==y)parent[y]=x;};
 for(let i=0;i<indices.length;i+=3){
  const [a,b,c]=indices.slice(i,i+3);join(a,b);join(a,c);
  for(const [u,v]of[[a,b],[b,c],[c,a]]){
   const key=Math.min(u,v)+':'+Math.max(u,v);
   edges.set(key,(edges.get(key)||0)+1);
  }
 }
 const nonManifoldEdges=[...edges.values()].filter(c=>c!==2).length;
 const uniqueComponents=new Set(parent.map((_,i)=>find(i))).size;
 const realTriangles=indices.length/3;
 const hardGate=nonManifoldEdges===0&&uniqueComponents===1;
 if(!hardGate)fail('CAGE_NOT_SINGLE_MANIFOLD_'+
  uniqueComponents+'_COMP_'+nonManifoldEdges+'_EDGES');
 return {positions,normals,indices,
  appearance:{
   schema:AIG_TEMPLATE_MORPH_SCHEMA,method,gender,
   sourceType:'LANDMARK_AUTHORED_SINGLE_MANIFOLD_SURFACE',
   heightMm:model.heightMm,build,
   bodySegmentsNotIndependent:true,
   explicitHumanLandmarks:model.sourceLandmarks,
   actualVertices:positions.length/3,
   actualTriangles:realTriangles,
   actualConnectedComponents:uniqueComponents,
   nonManifoldEdges,
   topologyContinuousPASS:hardGate,
   handsFeetScalpContoursFromLandmarks:true,
   fullBodyMorphFromCage:true,
   actualOrthogonal3DDepth:true,
   proceduralUnverifiedBase:true,
   naturalHumanAppearancePASS:false,
   actualBoneSkinningReady:false,
   photoIdentityReconstructed:false,
   stage1ReleasePASS:false
  }};
}
export async function buildAIGReal3DTemplateScene({
 source,method='template-morph',signal=null
}={}){
 const model=source?.model;
 if(!model||!['male','female'].includes(model.gender))
  fail('REAL_GENDER_SOURCE_REQUIRED');
 const r=buildAIGReal3DTemplateMorph({
  gender:model.gender,heightMm:source.heightMm,
  build:source.build??50,method,signal});
 const scene=createAIG3DScene({id:'aig-template-'+method+'-'+model.gender,
  consumer:'FastModel',units:'METERS',
  source:'REAL_ANATOMICAL_TEMPLATE_CONTROL_POINTS_NOT_REAL_SCAN'});
 const mesh=createAIG3DMesh({positions:r.positions,
  normals:r.normals,indices:r.indices,
  provenance:'ANATOMICAL_'+method.toUpperCase()+'_ONE_WATERTIGHT_CAGE'});
 addAIG3DNode(scene,{id:'singleAnatomicalTemplate',mesh,kind:'character',
  material:{baseColor:[.78,.57,.46,1],roughness:.82,
   metallic:0,doubleSided:true},
  source:'PROCEDURAL_BODY_CONTOUR_CONTROL_CAGE_UNAPPROVED'});
 return {scene,geometryEvidence:{
  ...r.appearance,
  surfaceConnectedComponents:r.appearance.actualConnectedComponents,
  actualContinuousSurfaceTopologicalPASS:r.appearance.topologyContinuousPASS
 },method,oneSurfaceMesh:true,releasePASS:false};
}
