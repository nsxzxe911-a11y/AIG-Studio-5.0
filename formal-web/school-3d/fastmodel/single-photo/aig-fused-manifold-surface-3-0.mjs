/**
 * Real3D 3.0: One genuinely CONNECTED indexed watertight SDF surface.
 *
 * Purpose: replace disconnected 2.9 ring pieces and visible shoulder gaps.
 * Geometry built by sampling a bounded smooth union of original source-
 * constrained variable elliptical cross sections, then extracting one
 * indexed isosurface with six consistent marching tetrahedra per cell.
 *
 * CRITICAL: z depths/occluded backside, human proportions and union thickness
 * are explicit priors, not measured 3D scan echoes, 1:1 anatomy or print-ready
 * validation. Geometry may NOT be used as CNC or physical print code until
 * actual scale, feature wall thickness and printability Gate pass.
 */
import {AIG29_SCHEMA,inspectAIG29FiveAxisSurface}
 from './aig-continuous-surface-scan-2-9.mjs';
export const AIG30_SCHEMA='AIG_REAL3D_3_0_ONE_INDEXED_WATERTIGHT_SDF_HUMANOID';
const fail=(s)=>{throw Error('AIG30_'+s)};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const TETS=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],
 [0,7,4,6],[0,4,5,6]];
const norm=(x,y,z)=>Math.hypot(x,y,z);
const sm=(a,b,k)=>{
 const h=Math.max(k-Math.abs(a-b),0)/k;
 return Math.min(a,b)-h*h*k*.25;
};
function ringProfiles(report){
 const all=[];
 for(const s of report.surfaces){
  if(!Number.isInteger(s.radialSegments)||s.radialSegments<16||
   s.vertexCount<s.radialSegments*5||
   s.positions?.length!==s.vertexCount*3||
   !s.positions.every(Number.isFinite))
   fail('SOURCE_RING_MESH_INVALID');
  const steps=s.radialSegments,rows=[];
  for(let j=0;j<s.ringCount;j++){
   const at=j*steps*3,xc=s.positions[at],
    opposite=(j*steps+steps/2)*3,zc=(j*steps+steps/4)*3;
   const cx=(xc+s.positions[opposite])*.5;
   const yy=s.positions[at+1];
   const rx=Math.abs(xc-s.positions[opposite])*.5;
   const rz=Math.abs(s.positions[zc+2]);
   if(![cx,yy,rx,rz].every(Number.isFinite)||rx<.0001||rz<.0001)
    fail('REAL_3D_SECTION_RADII_INVALID');
   rows.push({cx,yy,rx,rz});
  }
  rows.sort((a,b)=>a.yy-b.yy);
  all.push({id:s.sourceLabelId,rows,
   bottom:rows[0].yy,top:rows[rows.length-1].yy,
   representativeRGB:s.sourceVisibleRGB??[.5,.5,.5]});
 }
 return all;
}
const interpolate=(rows,y)=>{
 if(y<=rows[0].yy)return rows[0];
 if(y>=rows[rows.length-1].yy)return rows[rows.length-1];
 let lo=0,hi=rows.length-1;
 while(hi-lo>1){
  const mid=(hi+lo)>>1;
  if(rows[mid].yy<y)lo=mid;else hi=mid;
 }
 const a=rows[lo],b=rows[hi],k=(y-a.yy)/(b.yy-a.yy);
 return {
  cx:a.cx+(b.cx-a.cx)*k,
  rx:a.rx+(b.rx-a.rx)*k,
  rz:a.rz+(b.rz-a.rz)*k
 };
};
function sectionField(x,y,z,p){
 const s=interpolate(p.rows,y);
 const ex=(x-s.cx)/s.rx,ez=z/s.rz;
 // Conservative approximate signed distance to implicit ellipse.
 const radial=(Math.hypot(ex,ez)-1)*Math.min(s.rx,s.rz);
 const end=Math.max(p.bottom-y,y-p.top);
 return Math.max(radial,end);
}
function valueAt(x,y,z,profiles,blend){
 let distance=Infinity,best=Infinity,chosen=0;
 for(const p of profiles){
  const current=sectionField(x,y,z,p);
  if(current<best){best=current;chosen=p.id;}
  distance=distance===Infinity?current:sm(distance,current,blend);
 }
 return {distance,sourceClass:chosen};
}
function calcVertexNormal(positions,triangles){
 const normals=new Float32Array(positions.length);
 for(let i=0;i<triangles.length;i+=3){
  const ia=triangles[i]*3,ib=triangles[i+1]*3,ic=triangles[i+2]*3,
   ax=positions[ib]-positions[ia],
   ay=positions[ib+1]-positions[ia],
   az=positions[ib+2]-positions[ia],
   bx=positions[ic]-positions[ia],
   by=positions[ic+1]-positions[ia+1],
   bz=positions[ic+2]-positions[ia+2],
   nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
  const size=norm(nx,ny,nz);
  if(size<1e-13)continue;
  for(const index of [ia,ib,ic]){
   normals[index]+=nx;normals[index+1]+=ny;normals[index+2]+=nz;
  }
 }
 for(let i=0;i<normals.length;i+=3){
  const size=norm(normals[i],normals[i+1],normals[i+2])||1;
  normals[i]/=size;normals[i+1]/=size;normals[i+2]/=size;
 }
 return normals;
}
export function auditAIG30ClosedManifold(positions,indices){
 if(!(positions instanceof Float32Array)||
  !(indices instanceof Uint32Array)||indices.length%3||
  indices.length===0||positions.length%3)
  fail('INDEXED_TRIANGLE_MESH_REQUIRED');
 const edgeUse=new Map();
 let areaDefects=0,nonFiniteVertices=0;
 for(let i=0;i<positions.length;i++)
  if(!Number.isFinite(positions[i]))nonFiniteVertices++;
 for(let k=0;k<indices.length;k+=3){
  const a=indices[k],b=indices[k+1],c=indices[k+2];
  if(a===b||b===c||a===c||
   Math.max(a,b,c)>=positions.length/3){areaDefects++;continue}
  const ax=positions[b*3]-positions[a*3],
   ay=positions[b*3+1]-positions[a*3+1],
   az=positions[b*3+2]-positions[a*3+2],
   bx=positions[c*3]-positions[a*3],
   by=positions[c*3+1]-positions[a*3+1],
   bz=positions[c*3+2]-positions[a*3+2];
  if(norm(ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx)<1e-11)
   areaDefects++;
  for(const [v,w] of [[a,b],[b,c],[c,a]]){
   const key=v<w?v+':'+w:w+':'+v;
   edgeUse.set(key,(edgeUse.get(key)||0)+1);
  }
 }
 const notTwo=[...edgeUse.values()].filter(v=>v!==2).length;
 const faceAdj=new Map();
 for(let k=0;k<indices.length;k+=3){
  const a=indices[k],b=indices[k+1],c=indices[k+2];
  for(const v of [a,b,c]){
   if(!faceAdj.has(v))faceAdj.set(v,[]);
   faceAdj.get(v).push(k/3);
  }
 }
 const seen=new Uint8Array(indices.length/3),queue=[0];seen[0]=1;
 const edgeToFaces=new Map();
 for(let k=0;k<indices.length;k+=3){
  const vs=[indices[k],indices[k+1],indices[k+2]];
  for(let e=0;e<3;e++){
   const a=vs[e],b=vs[(e+1)%3],key=a<b?a+':'+b:b+':'+a;
   if(!edgeToFaces.has(key))edgeToFaces.set(key,[]);
   edgeToFaces.get(key).push(k/3);
  }
 }
 const adjacency=Array.from({length:indices.length/3},()=>[]);
 for(const faces of edgeToFaces.values())if(faces.length===2){
  adjacency[faces[0]].push(faces[1]);
  adjacency[faces[1]].push(faces[0]);
 }
 for(let step=0;step<queue.length;step++)
  for(const j of adjacency[queue[step]])if(!seen[j]){
   seen[j]=1;queue.push(j);
  }
 // Signed 3D volume >0 iff winding normals point outward.
 let signedVolume6=0;
 for(let k=0;k<indices.length;k+=3){
  const a=indices[k]*3,b=indices[k+1]*3,c=indices[k+2]*3;
  signedVolume6+=positions[a]*(positions[b+1]*positions[c+2]-positions[b+2]*positions[c+1])
   +positions[a+1]*(positions[b+2]*positions[c]-positions[b]*positions[c+2])
   +positions[a+2]*(positions[b]*positions[c+1]-positions[b+1]*positions[c]);
 }
 return {
  schema:AIG30_SCHEMA,
  vertexCount:positions.length/3,triangleCount:indices.length/3,
  boundaryOrNonManifoldEdgeCount:notTwo,
  degenerateTriangleCount:areaDefects,
  nonFiniteCoordinateCount:nonFiniteVertices,
  connectedTriangleCount:queue.length,
  singleConnectedComponent:queue.length===indices.length/3,
  signedEnclosedVolume:signedVolume6/6,
  positiveOutwardVolume:signedVolume6>1e-10,
  closedManifold:!notTwo&&!areaDefects&&!nonFiniteVertices&&
   queue.length===indices.length/3&&signedVolume6>1e-10,
  // Edge-pair manifold is not full solid-printability certification:
  noSelfIntersectionProved:false,wallThicknessMeasured:false,
  printablePhysicalScaleCertified:false,
  physicallyMeasuredOneToOne:false
 };
}
export function buildAIG30FusedSDF(source,{
 resolution=96,blend=.075,maxCells=500000
}={}){
 if(source?.schema!==AIG29_SCHEMA||!source.surfaces?.length||
  !Number.isInteger(resolution)||resolution<56||resolution>160||
  !Number.isFinite(blend)||blend<.02||blend>.16||
  !Number.isInteger(maxCells)||maxCells<100000||maxCells>700000)
  fail('TRUE_SOURCE_MESH_AND_BOUNDED_SDF_REQUIRED');
 const profiles=ringProfiles(source);
 let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const shell of source.surfaces){
  for(let k=0;k<shell.positions.length;k+=3)
   for(let j=0;j<3;j++){
    const v=shell.positions[k+j];
    min[j]=Math.min(min[j],v);max[j]=Math.max(max[j],v);
   }
 }
 const padding=blend+0.09;
 for(let j=0;j<3;j++){min[j]-=padding;max[j]+=padding}
 const range=max.map((v,j)=>v-min[j]),longest=Math.max(...range);
 const step=longest/(resolution-1);
 const dims=range.map(v=>Math.ceil(v/step)+1),
  cells=(dims[0]-1)*(dims[1]-1)*(dims[2]-1);
 if(cells>maxCells)fail('MOBILE_GRID_MEMORY_BUDGET_EXCEEDED');
 const [nx,ny,nz]=dims,N=nx*ny*nz,
  data=new Float32Array(N);
 const id=(x,y,z)=>(z*ny+y)*nx+x;
 let inside=0;
 for(let z=0;z<nz;z++){
  const wz=min[2]+z*step;
  for(let y=0;y<ny;y++){
   const wy=min[1]+y*step;
   for(let x=0;x<nx;x++){
    const val=valueAt(min[0]+x*step,wy,wz,profiles,blend).distance;
    if(!Number.isFinite(val))fail('SDF_NUMERIC_ERROR');
    data[id(x,y,z)]=val;
    if(val<0)inside++;
   }
  }
 }
 if(inside<64||inside>N*.8)
  fail('SOURCE_SDF_HAS_NO_BOUNDED_HUMANOID_VOLUME');
 const coords=new Float32Array(N*3);
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const k=id(x,y,z)*3;coords[k]=min[0]+x*step;
  coords[k+1]=min[1]+y*step;coords[k+2]=min[2]+z*step;
 }
 const positions=[],indices=[],edgeCache=new Map();
 const vertex=(u,v)=>{
  const key=u<v?u+':'+v:v+':'+u;
  if(edgeCache.has(key))return edgeCache.get(key);
  const a=data[u],b=data[v],f=clamp(a/(a-b),0,1),
   i=positions.length/3,j=u*3,k=v*3;
  positions.push(coords[j]+(coords[k]-coords[j])*f,
   coords[j+1]+(coords[k+1]-coords[j+1])*f,
   coords[j+2]+(coords[k+2]-coords[j+2])*f);
  edgeCache.set(key,i);return i;
 };
 let rejects=0;
 for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)
  for(let x=0;x<nx-1;x++){
   const ids=[id(x,y,z),id(x+1,y,z),id(x+1,y+1,z),
    id(x,y+1,z),id(x,y,z+1),id(x+1,y,z+1),
    id(x+1,y+1,z+1),id(x,y+1,z+1)];
   const samples=ids.map(q=>data[q]);
   if(samples.every(v=>v>=0)||samples.every(v=>v<0))continue;
   for(const tet of TETS){
    const insideNodes=tet.filter(v=>samples[v]<0);
    if(!insideNodes.length||insideNodes.length===4)continue;
    const outsideNodes=tet.filter(v=>samples[v]>=0);
    const center=(array)=>{
     const v=[0,0,0];
     for(const corner of array){
      const idx=ids[corner]*3;
      for(let j=0;j<3;j++)v[j]+=coords[idx+j]/array.length;
     }
     return v;
    };
    const ina=center(insideNodes),outa=center(outsideNodes);
    const axis=outa.map((v,j)=>v-ina[j]);
    const push=(a,b,c)=>{
     const i=a*3,j=b*3,k=c*3;
     const ab=[positions[j]-positions[i],positions[j+1]-positions[i+1],
      positions[j+2]-positions[i+2]];
     const ac=[positions[k]-positions[i],positions[k+1]-positions[i+1],
      positions[k+2]-positions[i+2]];
     const normal=[
      ab[1]*ac[2]-ab[2]*ac[1],
      ab[2]*ac[0]-ab[0]*ac[2],
      ab[0]*ac[1]-ab[1]*ac[0]
     ];
     if(norm(...normal)<1e-13){rejects++;return}
     if(normal.reduce((sum,v,j)=>sum+v*axis[j],0)<0)
      indices.push(a,c,b);
     else indices.push(a,b,c);
    };
    if(insideNodes.length===1||insideNodes.length===3){
     const singleton=insideNodes.length===1?insideNodes[0]:outsideNodes[0],
      triplet=insideNodes.length===1?outsideNodes:insideNodes;
     const verts=triplet.map(v=>vertex(ids[singleton],ids[v]));
     push(...verts);
    }else{
     const [a,b]=insideNodes,[c,d]=outsideNodes;
     const ac=vertex(ids[a],ids[c]),ad=vertex(ids[a],ids[d]),
      bc=vertex(ids[b],ids[c]),bd=vertex(ids[b],ids[d]);
     push(ac,ad,bd);push(ac,bd,bc);
    }
   }
  }
 if(positions.length<300||indices.length<600||rejects)
  fail('SDF_GENERATED_INCOMPLETE_OR_DEGENERATE_GEOMETRY');
 const pos=new Float32Array(positions),idx=new Uint32Array(indices),
  audit=auditAIG30ClosedManifold(pos,idx);
 if(!audit.closedManifold)
  fail('SDF_MESH_TOPOLOGY_BLOCKED_'+
   JSON.stringify({edges:audit.boundaryOrNonManifoldEdgeCount,
    degenerate:audit.degenerateTriangleCount,
    connected:audit.singleConnectedComponent,
    outward:audit.positiveOutwardVolume}));
 const normals=calcVertexNormal(pos,idx);
 const ids=new Uint8Array(pos.length/3);
 const palette=new Map(profiles.map(p=>[p.id,p.representativeRGB]));
 for(let i=0;i<ids.length;i++)
  ids[i]=valueAt(pos[i*3],pos[i*3+1],pos[i*3+2],profiles,blend).sourceClass;
 const unified={
  sourceLabelId:1,positions:pos,normals,indices:idx,
  vertexSourceLabelIds:ids,sourceClassColorRGB:Object.fromEntries(palette),
  vertexCount:pos.length/3,triangleCount:idx.length/3,
  degeneracyCount:audit.degenerateTriangleCount,
  closedManifoldVerified:audit.closedManifold,
  originalPhotoSilhouetteSources:profiles.map(p=>p.id),
  physicallyMeasuredFrontDepth:false,
  physicallyMeasuredBackDepth:false,
  trueOnePieceIndexedGeometry:true,
  trianglesShareGlobalVertexIds:true,
  indexedClosedEndCaps:true,
  importedOriginalGLBUnchanged:true
 };
 return {
  schema:AIG30_SCHEMA,sourceSha256:source.sourceSha256,
  sourceSize:source.sourceSize,source2DImagePixelsActuallyUsed:true,
  bodyHeightUnits:source.bodyHeightUnits,
  fusedOnePieceMesh:unified,
  surfaces:[unified], // compatible with existing 2.9 5AX mesh inspector
  continuousTriangleCount:unified.triangleCount,
  continuousVertexCount:unified.vertexCount,
  manifoldAudit:audit,
  gridDimensions:dims,gridCellCount:cells,gridResolution:resolution,
  signedDistanceFusionWidth:blend,
  reducedDisconnectedTubeAppearance:true,
  measured3DScale:false,measuredDepth:false,
  inferredFrontAndBackDepth:true,
  noSensorEchoCaptured:true,
  originalGLBPreserved:true,releaseAllowed:false
 };
}

/** A/B normal probe reused on the TRUE one-piece surface, not another fake scan. */
export function inspectAIG30FusedFiveAxisSurface(surface,opts={}){
 if(surface?.schema!==AIG30_SCHEMA||!surface.manifoldAudit?.closedManifold||
  surface.surfaces?.length!==1)
  fail('MANIFOLD_TRUE_ONE_PIECE_SURFACE_REQUIRED_FOR_PROBE');
 const base=inspectAIG29FiveAxisSurface({
  schema:AIG29_SCHEMA,sourceSha256:surface.sourceSha256,
  surfaces:surface.surfaces
 },opts);
 return {...base,
  schema:'AIG_REAL3D_3_0_ONE_PIECE_FUSED_SURFACE_VIRTUAL_FIVE_AXIS',
  actualOnePieceManifoldInspected:true,
  rawSensorEchoCount:0,physicalCNC5AxisCommandsEmitted:0,
  measuredHumanBodyScale:false};
}
