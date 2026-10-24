/**
 * Real3D V90 — one BVH across all ORIGINAL source mesh chunks.
 * Pure CPU acceleration for visibility queries; not a second 3D source.
 * FULL_SURFACE draws all real source chunks. HALF_VISIBLE selects only chunks
 * with at least one front facing, unobscured source-triangle sample (coarse,
 * not watertight view-dependent remeshing). This is NOT a guaranteed GPU gain.
 */
export const AIG_REAL3D_V90_BVH_SCHEMA='AIG_REAL3D_V90_MULTICHUNK_SOURCE_BVH_V1';
export const AIG_REAL3D_V90_SURFACE_MODES=['FULL_SURFACE','HALF_VISIBLE'];
const fail=s=>{throw Error('REAL3D_V90_BVH_'+s);};
const finite=Number.isFinite;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const mag=a=>Math.hypot(...a);
const centroid=(a,b,c)=>a.map((v,i)=>(v+b[i]+c[i])/3);
const bounds=(faces,ids)=>{
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const id of ids)for(const p of faces[id].points)
  for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}
 return {lo,hi};
};
function boxesOverlapRay(b,o,d,maxT){
 let mn=0,mx=maxT;
 for(let axis=0;axis<3;axis++){
  if(Math.abs(d[axis])<1e-12){
   if(o[axis]<b.lo[axis]||o[axis]>b.hi[axis])return false;
   continue;
  }
  let a=(b.lo[axis]-o[axis])/d[axis],c=(b.hi[axis]-o[axis])/d[axis];
  if(a>c)[a,c]=[c,a];
  mn=Math.max(mn,a);mx=Math.min(mx,c);
  if(mx<mn)return false;
 }
 return true;
}
function hitTriangle(face,o,d,maxT){
 const [a,b,c]=face.points,ab=sub(b,a),ac=sub(c,a),
  h=cross(d,ac),det=dot(ab,h);
 if(Math.abs(det)<1e-12)return null;
 const inv=1/det,s=sub(o,a),u=dot(s,h)*inv;
 if(u< -1e-9||u>1+1e-9)return null;
 const q=cross(s,ab),v=dot(d,q)*inv;
 if(v< -1e-9||u+v>1+1e-9)return null;
 const t=dot(ac,q)*inv;
 return t>1e-7&&t<maxT-1e-6?t:null;
}
export function buildAIGReal3DMultiChunkBVH({scene,leafSize=8,maxFaces=150000}={}){
 if(scene?.schema!=='AIG_REAL3D_SCENE_V1'||
  !Array.isArray(scene.nodes)||scene.nodes.length<1||
  scene.nodes.length>40||
  !Number.isInteger(leafSize)||leafSize<2||leafSize>32||
  !Number.isInteger(maxFaces)||maxFaces<4||maxFaces>200000)
  fail('SOURCE_SCENE_OR_BUDGET_INVALID');
 const faces=[],counts={};
 for(const node of scene.nodes){
  const m=node.mesh;
  if(typeof node.id!=='string'||counts[node.id]!==undefined||
   !m?.actualXYZTriangles||!Array.isArray(m.positions)||
   !Array.isArray(m.indices)||m.indices.length!==m.triangleCount*3||
   !m.positions.every(finite)||m.indices.some(i=>!Number.isInteger(i)||i<0||i>=m.vertexCount))
   fail('SOURCE_NODE_OR_MESH_INVALID');
  // BVH uses raw source-space coordinates. Any external transforms need
  // to be baked by a verified transform stage before this module.
  const tr=node.transform;
  if(tr&&(
   (tr.position??[]).some(x=>x!==0)||
   (tr.rotationDeg??[]).some(x=>x!==0)||
   (tr.scale??[]).some(x=>x!==1)
  ))fail('NONIDENTITY_SOURCE_TRANSFORM_NOT_BAKED');
  counts[node.id]=0;
  for(let k=0;k<m.indices.length;k+=3){
   const pts=m.indices.slice(k,k+3).map(id=>m.positions.slice(id*3,id*3+3));
   const n=cross(sub(pts[1],pts[0]),sub(pts[2],pts[0])),size=mag(n);
   if(size<1e-12)fail('DEGENERATE_SOURCE_FACE');
   const id=faces.length;
   faces.push({id,nodeId:node.id,points:pts,normal:n.map(v=>v/size),
    middle:centroid(...pts)});
   counts[node.id]++;
   if(faces.length>maxFaces)fail('FACE_MEMORY_BUDGET');
  }
 }
 const create=ids=>{
  const b=bounds(faces,ids);
  if(ids.length<=leafSize)return {bounds:b,ids};
  const axis=[0,1,2].sort((a,c)=>
   (b.hi[c]-b.lo[c])-(b.hi[a]-b.lo[a]))[0];
  const sorted=[...ids].sort((a,c)=>faces[a].middle[axis]-faces[c].middle[axis]);
  const half=Math.floor(sorted.length/2);
  return {bounds:b,left:create(sorted.slice(0,half)),
   right:create(sorted.slice(half))};
 };
 const root=create(faces.map(f=>f.id));
 const raycast=({origin,target,ignoreFaceId=-1}={})=>{
  if(!Array.isArray(origin)||!Array.isArray(target)||
   origin.length!==3||target.length!==3||
   ![...origin,...target].every(finite))
   fail('INVALID_RAY_INPUT');
  const delta=sub(target,origin),dist=mag(delta);
  if(dist<1e-7)fail('ZERO_LENGTH_RAY');
  const direction=delta.map(x=>x/dist);
  let best=null,bestT=dist-1e-6,boxesVisited=0,trianglesTested=0;
  const walk=node=>{
   boxesVisited++;
   if(!boxesOverlapRay(node.bounds,origin,direction,bestT))return;
   if(node.ids){
    for(const i of node.ids){
     if(i===ignoreFaceId)continue;
     trianglesTested++;
     const t=hitTriangle(faces[i],origin,direction,bestT);
     if(t!==null&&t<bestT){bestT=t;best=faces[i];}
    }
   }else{walk(node.left);walk(node.right);}
  };
  walk(root);
  return {occluded:best!==null,faceId:best?.id??null,
   blockingNodeId:best?.nodeId??null,distance:bestT,
   boxesVisited,trianglesTested,sourceFaceCount:faces.length};
 };
 return {schema:AIG_REAL3D_V90_BVH_SCHEMA,
  originalNodes:scene.nodes.map(n=>n.id),
  originalFaces:faces.length,sourceFaces:faces,
  sourceScene:scene,raycast,
  immutableOriginalSource:true,zeroNewGeometryTriangles:true,
  notBVHOnGPU:true,photoAccuracyCertified:false,releasePASS:false};
}
export function selectAIGReal3DSurfaceCoverage({
 bvh,cameraPosition,mode='FULL_SURFACE',maxSamplesPerNode=12000
}={}){
 if(bvh?.schema!==AIG_REAL3D_V90_BVH_SCHEMA||
  !AIG_REAL3D_V90_SURFACE_MODES.includes(mode)||
  !Array.isArray(cameraPosition)||cameraPosition.length!==3||
  !cameraPosition.every(finite)||!Number.isInteger(maxSamplesPerNode)||
  maxSamplesPerNode<1||maxSamplesPerNode>20000)
  fail('SURFACE_CAMERA_MODE_INVALID');
 const visible=[],culled=[],metrics=[];
 for(const id of bvh.originalNodes){
  const f=bvh.sourceFaces.filter(x=>x.nodeId===id);
  if(!f.length)fail('EMPTY_SOURCE_CHUNK');
  let front=0,rays=0,blocked=0,shown=false,tests=0;
  if(mode==='FULL_SURFACE')shown=true;
  else{
   const step=Math.max(1,Math.floor(f.length/maxSamplesPerNode));
   for(let i=0;i<f.length;i+=step){
    const face=f[i],v=sub(cameraPosition,face.middle),
     facing=dot(face.normal,v);
    tests++;
    if(facing<=1e-8)continue;
    front++;
    const hit=bvh.raycast({origin:cameraPosition,
     target:face.middle,ignoreFaceId:face.id});
    rays++;if(hit.occluded){blocked++;continue;}
    shown=true;break;
   }
  }
  (shown?visible:culled).push(id);
  metrics.push({nodeId:id,sourceFaces:f.length,
   sampledFaces:tests,frontFacingSamples:front,
   depthRays:rays,occludedSamples:blocked,rendered:shown});
 }
 return {
  schema:'AIG_REAL3D_V90_SURFACE_COVERAGE_POLICY_V1',mode,
  includedSourceNodeIds:visible,skippedSourceNodeIds:culled,
  includedSourceNodes:visible.length,totalSourceNodes:bvh.originalNodes.length,
  originalTrianglesRemainImmutable:true,zeroFakeReconstruction:true,
  gpuDrawCallReductionPossible:culled.length>0,
  fasterThanFullRenderingMeasured:false,
  fullMovieCameraMotionSupportedByReevaluation:true,
  perFrameSelfOcclusionGuaranteed:false,
  metrics};
}
