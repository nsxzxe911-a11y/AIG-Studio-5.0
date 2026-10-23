/**
 * Real3D Native GLB 2.0 mesh bridge. Browser-local file, NO CDN, no libraries.
 * Static base-pose rendering only. Mesh geometry is preserved (not a
 * procedural "human"). Textures, morph targets and skinning are NOT applied.
 * Source authenticity, appearance likeness and release remain BLOCK.
 */
import {createAIG3DMesh,createAIG3DScene,addAIG3DNode,
 multiplyAIG3DMatrix} from './aig-real3d-core.mjs';
export const AIG_REAL3D_GLB_SCHEMA='AIG_REAL3D_NATIVE_GLB_STATIC_MESH_V1';
const bad=s=>{throw Error('REAL3D_GLB_'+s);};
const I=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const number=n=>typeof n==='number'&&Number.isFinite(n);
const arr=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(number);
function localTransform(n){
 if(n.matrix!==undefined){
  if(!arr(n.matrix,16))bad('NODE_MATRIX');
  return n.matrix;
 }
 const p=n.translation??[0,0,0],s=n.scale??[1,1,1],
  q=n.rotation??[0,0,0,1];
 if(!arr(p,3)||!arr(s,3)||!arr(q,4)||s.some(x=>Math.abs(x)<1e-10))
  bad('NODE_TRS');
 const [x,y,z,w]=q,h=Math.hypot(x,y,z,w);
 if(h<1e-10)bad('NODE_QUATERNION');
 const a=x/h,b=y/h,c=z/h,d=w/h;
 return [(1-2*(b*b+c*c))*s[0],2*(a*b+c*d)*s[0],
   2*(a*c-b*d)*s[0],0,
   2*(a*b-c*d)*s[1],(1-2*(a*a+c*c))*s[1],
   2*(b*c+a*d)*s[1],0,
   2*(a*c+b*d)*s[2],2*(b*c-a*d)*s[2],
   (1-2*(a*a+b*b))*s[2],0,
   ...p,1];
}
function apply(m,p){
 return [
  m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
  m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],
  m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]
 ];
}
function parseChunks(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<32||
  buffer.byteLength>50000000)bad('FILE_SIZE');
 const v=new DataView(buffer);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||
  v.getUint32(8,true)!==buffer.byteLength)bad('HEADER');
 let offset=12,json=null,bin=null;
 while(offset+8<=buffer.byteLength){
  const size=v.getUint32(offset,true),type=v.getUint32(offset+4,true);
  offset+=8;
  if(size%4||offset+size>buffer.byteLength)bad('CHUNK_BOUNDS');
  if(type===0x4e4f534a){
   if(json!==null)bad('MULTIPLE_JSON_CHUNKS');
   const txt=new TextDecoder('utf-8',{fatal:true})
    .decode(new Uint8Array(buffer,offset,size)).replace(/\u0000+$/,'');
   try{json=JSON.parse(txt);}catch{bad('JSON');}
  }else if(type===0x004e4942){
   if(bin!==null)bad('MULTIPLE_BINARY_CHUNKS');
   bin={offset,length:size};
  }
  offset+=size;
 }
 if(offset!==buffer.byteLength||!json||!bin)bad('MISSING_CHUNK');
 if(json.asset?.version!=='2.0'||!Array.isArray(json.meshes)||
  !json.meshes.length)bad('GLTF_SCHEMA');
 if(!Array.isArray(json.buffers)||json.buffers.length!==1||
  json.buffers[0].uri!==undefined||json.buffers[0].byteLength>bin.length)
  bad('EXTERNAL_OR_MULTIPLE_BUFFERS');
 return {json,v,bin};
}
function accessorRead(state,id){
 const {json,v,bin}=state;
 if(!Number.isInteger(id)||!json.accessors?.[id])bad('ACCESSOR_MISSING');
 const a=json.accessors[id];
 if(a.sparse||a.bufferView===undefined||a.normalized)bad('SPARSE_OR_NORMALIZED_UNSUPPORTED');
 const view=json.bufferViews?.[a.bufferView];
 if(!view||view.buffer!==0||view.byteOffset<0||view.byteLength<0)
  bad('BUFFER_VIEW');
 const ncomp={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
 const bytes={5121:1,5123:2,5125:4,5126:4}[a.componentType];
 if(!ncomp||!bytes||!Number.isInteger(a.count)||a.count<1||
  a.count>250000)bad('ACCESSOR_FORMAT');
 const offset=(view.byteOffset??0)+(a.byteOffset??0);
 const packed=ncomp*bytes,stride=view.byteStride??packed;
 if(!Number.isInteger(offset)||!Number.isInteger(stride)||
    stride<packed||stride>255||offset%bytes)bad('STRIDE_OR_ALIGNMENT');
 const end=offset+(a.count-1)*stride+packed;
 if(end>view.byteLength+(view.byteOffset??0)||
    end>json.buffers[0].byteLength||end>bin.length)
  bad('ACCESSOR_BOUNDS');
 const result=[];
 for(let i=0;i<a.count;i++){
  const list=[];
  for(let k=0;k<ncomp;k++){
   const pos=bin.offset+offset+i*stride+k*bytes;
   const numberValue=a.componentType===5126?v.getFloat32(pos,true):
    a.componentType===5125?v.getUint32(pos,true):
    a.componentType===5123?v.getUint16(pos,true):
    v.getUint8(pos);
   if(!Number.isFinite(numberValue))bad('NONFINITE_DATA');
   list.push(numberValue);
  }
  result.push(ncomp===1?list[0]:list);
 }
 return {items:result,type:a.type,componentType:a.componentType};
}
function normals(positions,indices){
 const values=new Float64Array(positions.length);
 for(let i=0;i<indices.length;i+=3){
  const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
  const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],
   uz=positions[b+2]-positions[a+2],
   vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],
   vz=positions[c+2]-positions[a+2];
  const [x,y,z]=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];
  for(const t of [a,b,c]){
   values[t]+=x;values[t+1]+=y;values[t+2]+=z;
  }
 }
 const result=[];
 for(let i=0;i<values.length;i+=3){
  const h=Math.hypot(values[i],values[i+1],values[i+2])||1;
  result.push(values[i]/h,values[i+1]/h,values[i+2]/h);
 }
 return result;
}
function auditedGeometry(positionPoints,indices){
 const n=positionPoints.length;
 if(n<4||n>110000||indices.length<6000||indices.length>400000||
    indices.some(x=>!Number.isInteger(x)||x<0||x>=n))
  bad('GEOMETRY_BUDGET');
 if(positionPoints.some(v=>!arr(v,3)||v.some(x=>Math.abs(x)>100000)))
  bad('BAD_VERTEX');
 let degenerate=0;
 for(let i=0;i<indices.length;i+=3){
  const a=positionPoints[indices[i]],b=positionPoints[indices[i+1]],
   c=positionPoints[indices[i+2]];
  const u=b.map((x,k)=>x-a[k]),v=c.map((x,k)=>x-a[k]);
  const x=u[1]*v[2]-u[2]*v[1],y=u[2]*v[0]-u[0]*v[2],
   z=u[0]*v[1]-u[1]*v[0];
  if(Math.hypot(x,y,z)<1e-13)degenerate++;
 }
 return {degenerateTriangles:degenerate};
}
export function buildAIGReal3DGLBStatic({
 bytes,heightMm,sourceName='local-person.glb',sourceSha256='UNVERIFIED'
}={}){
 if(!Number.isInteger(heightMm)||heightMm<900||heightMm>2200)
  bad('MEASURED_HEIGHT_REQUIRED');
 if(typeof sourceName!=='string'||!sourceName.toLowerCase().endsWith('.glb')||
  sourceName.length>180)bad('SOURCE_NAME');
 const state=parseChunks(bytes),{json}=state;
 const nodes=json.nodes??[],scenes=json.scenes??[];
 const positions=[],indices=[],parts=[];
 let primitiveCount=0,skinnedNodes=0,unhandledPrimitiveCount=0;
 function appendMesh(meshIndex,transform){
  const mesh=json.meshes[meshIndex];
  if(!mesh?.primitives?.length)bad('MESH_PRIMITIVES');
  for(const p of mesh.primitives){
   if((p.mode??4)!==4||!Number.isInteger(p.attributes?.POSITION)||
     p.indices===undefined){unhandledPrimitiveCount++;continue;}
   const pos=accessorRead(state,p.attributes.POSITION);
   const ind=accessorRead(state,p.indices);
   if(pos.type!=='VEC3'||pos.componentType!==5126||ind.type!=='SCALAR'||
      ![5121,5123,5125].includes(ind.componentType)||
      ind.items.length%3!==0)bad('MESH_FORMAT');
   const start=positions.length;
   for(const xyz of pos.items)positions.push(apply(transform,xyz));
   parts.push({start,count:pos.items.length,indices:ind.items,
    materialIndex:p.material??null});
   for(const k of ind.items){
    if(k>=pos.items.length)bad('INDEX_OUTSIDE_PRIMITIVE');
    indices.push(start+k);
   }
   primitiveCount++;
  }
 }
 const visited=new Set();
 function walk(id,parent,depth){
  if(depth>80||!Number.isInteger(id)||!nodes[id]||visited.has(id))
   bad('NODE_CYCLE_OR_DUPLICATE');
  visited.add(id);
  const node=nodes[id],transform=multiplyAIG3DMatrix(parent,localTransform(node));
  if(node.skin!==undefined)skinnedNodes++;
  if(node.mesh!==undefined)appendMesh(node.mesh,transform);
  for(const child of node.children??[])walk(child,transform,depth+1);
 }
 const root=scenes[json.scene??0]?.nodes;
 if(Array.isArray(root)&&root.length){
  for(const id of root)walk(id,I(),0);
 }else if(nodes.length){
  const children=new Set(nodes.flatMap(n=>n.children??[]));
  for(let i=0;i<nodes.length;i++)if(!children.has(i))walk(i,I(),0);
 }else{
  for(let i=0;i<json.meshes.length;i++)appendMesh(i,I());
 }
 if(!positions.length)bad('NO_RENDERABLE_MESH');
 const audit=auditedGeometry(positions,indices);
 const rawMin=[Infinity,Infinity,Infinity],rawMax=[-Infinity,-Infinity,-Infinity];
 for(const xyz of positions)for(let k=0;k<3;k++){
  rawMin[k]=Math.min(rawMin[k],xyz[k]);
  rawMax[k]=Math.max(rawMax[k],xyz[k]);
 }
 const span=rawMax.map((v,k)=>v-rawMin[k]),height=heightMm/1000;
 if(span[1]<1e-8)bad('ZERO_HEIGHT');
 const scale=height/span[1],flat=[];
 for(const [x,y,z]of positions)
  flat.push((x-(rawMin[0]+rawMax[0])/2)*scale,
   (y-rawMin[1])*scale,
   (z-(rawMin[2]+rawMax[2])/2)*scale);
 const ratios={widthToHeight:span[0]/span[1],
  depthToHeight:span[2]/span[1]};
 // A proper full figure is only a *plausible envelope* here.
 // Never infer face, five fingers or scan provenance from these dimensions.
 const renderGeometryPASS=audit.degenerateTriangles===0&&
  ratios.widthToHeight>=.18&&ratios.widthToHeight<=.9&&
  ratios.depthToHeight>=.06&&ratios.depthToHeight<=.65;
 const scene=createAIG3DScene({id:'scanNativeGLBCandidate',
  consumer:'FastModel',units:'METERS',
  source:'LOCAL_RAW_GLB_STATIC_BIND_OR_BASE_POSE_NOT_HUMAN_AUTHENTICATED'});
 if(parts.length>240)bad('TOO_MANY_PRIMITIVES');
 for(let j=0;j<parts.length;j++){
  const part=parts[j],localPositions=flat.slice(part.start*3,
   (part.start+part.count)*3),localIndices=[...part.indices];
  const mesh=createAIG3DMesh({positions:localPositions,
   normals:normals(localPositions,localIndices),indices:localIndices,
   provenance:'LOCAL_GLB_SOURCE_SHA_'+String(sourceSha256).slice(0,64)});
  const src=part.materialIndex===null?null:json.materials?.[part.materialIndex];
  const rgba=src?.pbrMetallicRoughness?.baseColorFactor;
  const color=arr(rgba,4)&&rgba.every(x=>x>=0&&x<=1)?
   rgba:[.76,.61,.52,1];
  addAIG3DNode(scene,{id:'glbPrimitive'+j,mesh,
   kind:'character',material:{baseColor:color,
    roughness:Math.max(.04,Math.min(1,src?.pbrMetallicRoughness?.roughnessFactor??.85)),
    metallic:Math.max(0,Math.min(1,src?.pbrMetallicRoughness?.metallicFactor??0)),
    doubleSided:true},
   source:'ORIGINAL_GLTF_MESH_PRIMITIVE_STATIC_ONLY'});
 }
 return {scene,evidence:{
  schema:AIG_REAL3D_GLB_SCHEMA,sourceName,sourceSha256,
  sourceFormat:'GLB_2_BINARY_LOCAL',
  measuredHeightMm:heightMm,actualVertices:positions.length,
  actualTriangles:indices.length/3,primitiveCount,
  separateSourcePrimitivesPreserved:scene.nodes.length,
  scannedSkinMeshActuallyVerified:false,
  originalGLBTexturesApplied:false,originalGLBSkinningAnimated:false,
  skinnedNodesPresentButNotDeformed:skinnedNodes,
  unsupportedPrimitiveCount:unhandledPrimitiveCount,
  ...audit,renderGeometryPASS,...ratios,
  humanShapeAndFaceVisuallyApproved:false,
  userPhotoLikenessVerified:false,
  trueHumanSourceAuthenticityVerified:false,
  stage1ReleasePASS:false},releasePASS:false};
}
