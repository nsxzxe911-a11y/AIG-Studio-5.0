/**
 * Real3D continuous-body candidate lab V1.
 *
 * ACTUAL algorithms:
 *   SDF: smooth-min union of analytic ellipsoids/tapered capsules
 *   Metaball: Gaussian scalar densities and isosurface
 * Both use the measured adult Stage1 source height/joints; no photos, no
 * segmented source mesh, no fake art. One continuous indexed surface is
 * extracted with marching tetrahedra (shared edge-vertex cache).
 *
 * Caveats: resolution is limited and the field is still a stylized
 * procedural human. A watertight-looking mesh is NOT anatomically verified.
 */
import {createAIG3DScene,createAIG3DMesh,addAIG3DNode}
 from './aig-real3d-core.mjs';
import {AIG_STAGE1_SCHEMA}
 from './aig-real3d-human-anatomy.mjs';

export const AIG_IMPLICIT_SURFACE_SCHEMA='AIG_REAL3D_SDF_METABALL_TRUE_ISOSURFACE_V1';
export const AIG_IMPLICIT_METHODS=Object.freeze(['sdf','metaball']);
const fail=s=>{throw Error('AIG_REAL3D_IMPLICIT_'+s)};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const norm=(v)=>Math.hypot(v[0],v[1],v[2]);
const distSq=(a,b)=>{const dx=a[0]-b[0],dy=a[1]-b[1],dz=a[2]-b[2];
 return dx*dx+dy*dy+dz*dz;};
function capsulePoint(p,a,b){
 const vx=b[0]-a[0],vy=b[1]-a[1],vz=b[2]-a[2];
 const d=vx*vx+vy*vy+vz*vz||1;
 const t=clamp(((p[0]-a[0])*vx+(p[1]-a[1])*vy+
  (p[2]-a[2])*vz)/d,0,1);
 return {x:a[0]+vx*t,y:a[1]+vy*t,z:a[2]+vz*t,t};
}
function primitivesFromRealAnatomy(model){
 if(model?.schema!==AIG_STAGE1_SCHEMA||
  !['male','female'].includes(model.gender)||
  !(model.heightMeters>1&&model.heightMeters<2.3)||
  !model.joints?.leftShoulder||!model.joints?.rightHip)
  fail('ACTUAL_STAGE1_HUMAN_JOINT_SOURCE_REQUIRED');
 const h=model.heightMeters, p=model.profile;
 const e=(id,c,r)=>({id,type:'ellipsoid',
  c:c.map(q=>q*h),r:r.map(q=>q*h)});
 const c=(id,a,b,ra,rb=ra)=>({id,type:'capsule',
  a:a.map(q=>q*h),b:b.map(q=>q*h),ra:ra*h,rb:rb*h});
 const real=(id)=>model.joints[id]?.position;
 const p0=[e('pelvis',[0,.552,0],[p.hip*1.04,.086,.089]),
  e('waist',[0,.664,-.004],[p.waist*1.05,.135,.086]),
  e('thorax',[0,.783,-.006],[p.chest*1.02,.104,.092]),
  c('neck',[0,.849,0],[0,.897,-.006],.027,.031),
  e('head',[0,.933,-.009],[p.headX*1.03,.067,.052])];
 for(const side of ['left','right']){
  const sh=real(side+'Shoulder'),el=real(side+'Elbow'),
   wr=real(side+'Wrist'),hip=real(side+'Hip'),
   knee=real(side+'Knee'),ankle=real(side+'Ankle');
  if([sh,el,wr,hip,knee,ankle].some(x=>!x))
   fail('RIG_JOINTS_MISSING');
  const m=(a,b)=>a.map((v,i)=>(v+b[i])*.5);
  // Real rig anchors provide their asymmetric human-scale positions.
  const shoulder=[sh[0]/h,.811,.000];
  const elbow=el.map(x=>x/h),wrist=wr.map(x=>x/h);
  const centerHip=hip.map(x=>x/h),centerKnee=knee.map(x=>x/h);
  const centerAnkle=ankle.map(x=>x/h);
  const sign=side==='left'?-1:1;
  p0.push(
   c(side+'UpperArm',shoulder,elbow,.032,.025),
   c(side+'Forearm',elbow,wrist,.025,.016),
   e(side+'Hand',[wrist[0]+sign*.002,.452,-.011],[.018,.037,.016]),
   c(side+'Thigh',centerHip,centerKnee,
    model.gender==='male'?.056:.059,.034),
   c(side+'Calf',centerKnee,centerAnkle,.033,.020),
   e(side+'Foot',[centerAnkle[0],.038,-.043],[.032,.036,.068])
  );
 }
 return p0;
}
function shapeDistance(point,s){
 if(s.type==='ellipsoid'){
  const x=(point[0]-s.c[0])/s.r[0],y=(point[1]-s.c[1])/s.r[1],
   z=(point[2]-s.c[2])/s.r[2];
  return (Math.hypot(x,y,z)-1)*Math.min(...s.r);
 }
 const x=capsulePoint(point,s.a,s.b);
 return Math.hypot(point[0]-x.x,point[1]-x.y,point[2]-x.z)-
  (s.ra+(s.rb-s.ra)*x.t);
}
function metaballDensity(point,s){
 let q2;
 if(s.type==='ellipsoid'){
  const x=(point[0]-s.c[0])/s.r[0],y=(point[1]-s.c[1])/s.r[1],
   z=(point[2]-s.c[2])/s.r[2];
  q2=x*x+y*y+z*z;
 }else{
  const x=capsulePoint(point,s.a,s.b);
  const r=s.ra+(s.rb-s.ra)*x.t;
  q2=distSq(point,[x.x,x.y,x.z])/(r*r);
 }
 return Math.exp(-1.58*q2);
}
export function createAIGHumanImplicitField(model,{method='sdf'}={}){
 if(!AIG_IMPLICIT_METHODS.includes(method))
  fail('ALGORITHM_NOT_IMPLEMENTED');
 const shapes=primitivesFromRealAnatomy(model);
 const H=model.heightMeters,k=H*.021,iso=.30;
 // Both are actual scalar fields evaluated at every grid vertex.
 const sample=point=>{
  if(method==='metaball'){
   let sum=0;
   for(const s of shapes)sum+=metaballDensity(point,s);
   return iso-sum;
  }
  let d=Infinity;
  for(const s of shapes){
   const q=shapeDistance(point,s);
   if(d===Infinity){d=q;continue}
   const h=Math.max(k-Math.abs(d-q),0)/k;
   d=Math.min(d,q)-h*h*k*.25;
  }
  return d;
 };
 return {schema:AIG_IMPLICIT_SURFACE_SCHEMA,method,sourceGender:model.gender,
  sourceHeightMm:Math.round(H*1000),
  actualSourceJointCount:Object.keys(model.joints).length,
  actualAnalyticPrimitives:shapes.length,
  sourcePrimitives:shapes.map(s=>({id:s.id,type:s.type})),
  sample};
}
const TETRA=[[0,1,3,7],[0,3,2,7],[0,2,6,7],
 [0,6,4,7],[0,4,5,7],[0,5,1,7]];
const EDGES=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
export function extractAIGReal3DIsosurface(field,{
 resolution='standard',signal=null
}={}){
 if(field?.schema!==AIG_IMPLICIT_SURFACE_SCHEMA||
  !['draft','standard','fine'].includes(resolution))
  fail('SCALAR_FIELD_AND_RESOLUTION_REQUIRED');
 const H=field.sourceHeightMm/1000;
 const spacing=H*({draft:.025,standard:.018,fine:.014}[resolution]);
 const lo=[-.31*H,-.040*H,-.225*H],
  hi=[.31*H,1.042*H,.225*H];
 const nx=Math.ceil((hi[0]-lo[0])/spacing),
  ny=Math.ceil((hi[1]-lo[1])/spacing),
  nz=Math.ceil((hi[2]-lo[2])/spacing);
 const sx=(hi[0]-lo[0])/nx,sy=(hi[1]-lo[1])/ny,
  sz=(hi[2]-lo[2])/nz;
 const all=(nx+1)*(ny+1)*(nz+1);
 if(all>210000)fail('GPU_MESH_SOURCE_CELL_BUDGET_BLOCKED');
 const strideX=1,strideY=nx+1,strideZ=(nx+1)*(ny+1);
 const vid=(x,y,z)=>x+strideY*y+strideZ*z;
 const values=new Float32Array(all);
 let minField=Infinity,maxField=-Infinity;
 const coords=id=>[lo[0]+(id%strideY)*sx,
  lo[1]+(Math.floor(id/strideY)%(ny+1))*sy,
  lo[2]+Math.floor(id/strideZ)*sz];
 for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)
  for(let x=0;x<=nx;x++){
   const k=vid(x,y,z);
   const v=field.sample([lo[0]+x*sx,lo[1]+y*sy,lo[2]+z*sz]);
   if(!Number.isFinite(v))fail('FIELD_NONFINITE');
   values[k]=v;
   minField=Math.min(v,minField);maxField=Math.max(v,maxField);
  }
 if(minField>=0||maxField<=0)fail('NO_ISOSURFACE_CROSSINGS');
 const edgeVertices=new Map(),out=[],indices=[];
 let cellsTraversed=0;
 const interpolate=(a,b)=>{
  const key=a<b?a+':'+b:b+':'+a;
  let index=edgeVertices.get(key);
  if(index!==undefined)return index;
  const va=values[a],vb=values[b],t=clamp(va/(va-vb),.00001,.99999);
  const pa=coords(a),pb=coords(b);
  index=out.length/3;
  out.push(pa[0]+(pb[0]-pa[0])*t,
   pa[1]+(pb[1]-pa[1])*t,pa[2]+(pb[2]-pa[2])*t);
  edgeVertices.set(key,index);
  return index;
 };
 const triangle=(a,b,c,insideCentroid,outsideCentroid)=>{
  const ia=a*3,ib=b*3,ic=c*3;
  const u=[out[ib]-out[ia],out[ib+1]-out[ia+1],out[ib+2]-out[ia+2]];
  const v=[out[ic]-out[ia],out[ic+1]-out[ia+1],out[ic+2]-out[ia+2]];
  const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],
   u[0]*v[1]-u[1]*v[0]];
  if(Math.hypot(...normal)<1e-14)return;
  const towards=outsideCentroid.map((q,i)=>q-insideCentroid[i]);
  if(normal.reduce((s,n,i)=>s+n*towards[i],0)<0)indices.push(a,c,b);
  else indices.push(a,b,c);
 };
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)
  for(let x=0;x<nx;x++){
   if(signal?.aborted)fail('CANCELLED_DURING_ISOSURFACE');
   cellsTraversed++;
   const ids=[vid(x,y,z),vid(x+1,y,z),vid(x,y+1,z),
    vid(x+1,y+1,z),vid(x,y,z+1),vid(x+1,y,z+1),
    vid(x,y+1,z+1),vid(x+1,y+1,z+1)];
   const v=ids.map(i=>values[i]);
   if(v.every(a=>a>=0)||v.every(a=>a<0))continue;
   for(const tet of TETRA){
    const inn=tet.filter(t=>v[t]<0),outside=tet.filter(t=>v[t]>=0);
    if(!inn.length||inn.length===4)continue;
    const cent=t=>t.map(k=>coords(ids[k])).reduce((s,p)=>{
     s[0]+=p[0];s[1]+=p[1];s[2]+=p[2];return s;
    },[0,0,0]).map(q=>q/t.length);
    const ci=cent(inn),co=cent(outside);
    if(inn.length===1||outside.length===1){
     const pivot=inn.length===1?inn[0]:outside[0];
     const other=inn.length===1?outside:inn;
     const a=other.map(o=>interpolate(ids[pivot],ids[o]));
     triangle(a[0],a[1],a[2],ci,co);
    }else{
     const [a,b]=inn,[c,d]=outside;
     const p0=interpolate(ids[a],ids[c]),
      p1=interpolate(ids[a],ids[d]),
      p2=interpolate(ids[b],ids[c]),
      p3=interpolate(ids[b],ids[d]);
     triangle(p0,p1,p3,ci,co);
     triangle(p0,p3,p2,ci,co);
    }
   }
  }
 if(indices.length<900||indices.length>580000)
  fail('ISOSURFACE_TOO_SMALL_OR_GPU_BUDGET_EXCEEDED');
 const normals=new Float64Array(out.length);
 for(let i=0;i<indices.length;i+=3){
  const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3,
   ux=out[b]-out[a],uy=out[b+1]-out[a+1],uz=out[b+2]-out[a+2],
   vx=out[c]-out[a],vy=out[c+1]-out[a+1],vz=out[c+2]-out[a+2],
   n=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];
  for(const k of [a,b,c]){
   normals[k]+=n[0];normals[k+1]+=n[1];normals[k+2]+=n[2];
  }
 }
 const smooth=Array(normals.length);
 for(let i=0;i<normals.length;i+=3){
  const m=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;
  smooth[i]=normals[i]/m;smooth[i+1]=normals[i+1]/m;
  smooth[i+2]=normals[i+2]/m;
 }
 const boundary=new Map();
 for(let i=0;i<indices.length;i+=3)
  for(const [a,b] of [[indices[i],indices[i+1]],
   [indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]){
   const key=Math.min(a,b)+':'+Math.max(a,b);
   boundary.set(key,(boundary.get(key)||0)+1);
  }
 const nonManifoldEdges=[...boundary.values()].filter(v=>v!==2).length;
 const verts=out.length/3,triangles=indices.length/3;
 // Euler-style topology is stronger than "a lot of triangles".
 // Every surface vertex must belong to the ONE connected human shell.
 const parent=Uint32Array.from({length:verts},(_,i)=>i);
 const root=v=>{
  while(parent[v]!==v){parent[v]=parent[parent[v]];v=parent[v];}
  return v;
 };
 const join=(a,b)=>{
  const x=root(a),y=root(b);if(x!==y)parent[y]=x;
 };
 for(let k=0;k<indices.length;k+=3){
  join(indices[k],indices[k+1]);join(indices[k],indices[k+2]);
 }
 const groups=new Set();
 for(let v=0;v<verts;v++)groups.add(root(v));
 const surfaceConnectedComponents=groups.size;
 // SDF/metaball may each have a watertight torso but detached feet.
 // Such a candidate MUST be blocked rather than incorrectly accepted.
 if(surfaceConnectedComponents!==1||nonManifoldEdges!==0)
  fail('DISCONNECTED_OR_OPEN_HUMAN_SURFACE');
 if(verts>166666||triangles>195000)fail('SINGLE_WEBGL_FRAME_BUDGET');
 return {
  schema:AIG_IMPLICIT_SURFACE_SCHEMA,method:field.method,
  positions:out,normals:smooth,indices,
  evidence:{
   realSourceGender:field.sourceGender,
   sourceHeightMm:field.sourceHeightMm,
   sourceJointCount:field.actualSourceJointCount,
   analyticShapesMeasuredFromSource:field.actualAnalyticPrimitives,
   scalarGridPoints:all,cellsTraversed,extractedTriangleCount:triangles,
   uniqueSurfaceVertices:verts,
   nonManifoldEdges,surfaceConnectedComponents,
   actualContinuousSurfaceTopologicalPASS:
    nonManifoldEdges===0&&surfaceConnectedComponents===1,
   facialLikenessVerified:false,
   anatomicalVisualAppearancePASS:false,
   meshPrecisionIsNotVerifiedScan:true,
   stage1ReleasePASS:false
  }
 };
}
export async function buildAIGReal3DImplicitScene({
 source,method='sdf',resolution='standard',signal=null
}={}){
 const model=source?.model;
 if(!model)fail('SOURCE_ANATOMY_REQUIRED');
 const field=createAIGHumanImplicitField(model,{method});
 const result=extractAIGReal3DIsosurface(field,{resolution,signal});
 const scene=createAIG3DScene({id:'aig-implicit-'+method+'-'+model.gender,
  consumer:'FastModel',units:'METERS',
  source:'IMPLICIT_'+method.toUpperCase()+'_REAL_SOURCE_JOINTS_UNAPPROVED'});
 const mesh=createAIG3DMesh({positions:result.positions,
  normals:result.normals,indices:result.indices,
  provenance:'ACTUAL_'+method.toUpperCase()+'_SCALAR_ISOSURFACE_NOT_VISUALLY_APPROVED'});
 addAIG3DNode(scene,{id:'continuousHumanSurface',mesh,kind:'character',
  material:{baseColor:[.69,.5,.39,1],roughness:.82,metallic:0,doubleSided:true},
  source:'SOURCE_JOINT_CONSTRAINED_'+method.toUpperCase()+'_EXTRACTED_MESH'});
 return {scene,geometryEvidence:result.evidence,
  method,oneSurfaceMesh:true,
  previewOnly:true,releasePASS:false};
}
