/**
 * AIG Real3D Drawing Engine 1.0 — shared geometry / scene graph / coordinate
 * contract for FastModel, AIG-II and AIG Studio 5.0 (browser prototype).
 * This core creates genuine indexed XYZ triangles and transforms, not image
 * billboards. No fake material removal, fabricated CNC toolpaths, real-world
 * scale assertions or runtime/machine writes.
 *
 * Axes: X right, Y up, Z toward viewer; units are explicit on each scene.
 * Matrix math: column-major, local TRS => parent world * local.
 */
export const AIG_REAL3D_SCHEMA='AIG_REAL3D_SCENE_V1';
export const AIG_REAL3D_CONSUMERS=Object.freeze(['FastModel','AIG-II','AIG-Studio-5.0']);
const finite=Number.isFinite,within=(v,lo,hi)=>finite(v)&&v>=lo&&v<=hi;
const finite3=a=>Array.isArray(a)&&a.length===3&&a.every(x=>within(x,-1e7,1e7));
const ident=()=>[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
export function multiplyAIG3DMatrix(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==16||b.length!==16||
 !a.every(finite)||!b.every(finite))throw Error('AIG3D_MATRIX_INVALID');
 const out=Array(16).fill(0);
 for(let col=0;col<4;col++)for(let row=0;row<4;row++)
  for(let i=0;i<4;i++)out[col*4+row]+=a[i*4+row]*b[col*4+i];
 return out;
}
export function transformAIG3DPoint(m,v){
 if(!Array.isArray(m)||m.length!==16||!m.every(finite)||!finite3(v))
  throw Error('AIG3D_TRANSFORM_POINT_INVALID');
 const [x,y,z]=v,w=m[3]*x+m[7]*y+m[11]*z+m[15];
 if(Math.abs(w)<1e-12)throw Error('AIG3D_UNDEFINED_PERSPECTIVE_POINT');
 return [
  (m[0]*x+m[4]*y+m[8]*z+m[12])/w,
  (m[1]*x+m[5]*y+m[9]*z+m[13])/w,
  (m[2]*x+m[6]*y+m[10]*z+m[14])/w
 ];
}
function array3(v,positive=false){
 if(!finite3(v)||positive&&v.some(x=>x<=0))throw Error('AIG3D_VECTOR_INVALID');
 return [...v];
}
function transformSpec(t={}){
 return {position:array3(t.position??[0,0,0]),
  rotationDeg:array3(t.rotationDeg??[0,0,0]),
  scale:array3(t.scale??[1,1,1],true)};
}
export function composeAIG3DTRS(input={}){
 const t=transformSpec(input),[x,y,z]=t.rotationDeg.map(v=>v*Math.PI/180),
 [sx,cx]=[Math.sin(x),Math.cos(x)],[sy,cy]=[Math.sin(y),Math.cos(y)],
 [sz,cz]=[Math.sin(z),Math.cos(z)];
 const rx=[1,0,0,0, 0,cx,sx,0, 0,-sx,cx,0, 0,0,0,1],
  ry=[cy,0,-sy,0, 0,1,0,0, sy,0,cy,0, 0,0,0,1],
  rz=[cz,sz,0,0, -sz,cz,0,0, 0,0,1,0, 0,0,0,1],
  s=ident();s[0]=t.scale[0];s[5]=t.scale[1];s[10]=t.scale[2];
 const tr=ident();tr[12]=t.position[0];tr[13]=t.position[1];tr[14]=t.position[2];
 return multiplyAIG3DMatrix(tr,multiplyAIG3DMatrix(rz,multiplyAIG3DMatrix(ry,multiplyAIG3DMatrix(rx,s))));
}
function validId(v){return typeof v==='string'&&/^[a-zA-Z][a-zA-Z0-9:_-]{0,95}$/.test(v);}
function color4(c){
 if(!Array.isArray(c)||c.length!==4||!c.every(x=>within(x,0,1)))
  throw Error('AIG3D_MATERIAL_COLOR_INVALID');
 return [...c];
}
export function makeAIG3DMaterial({baseColor=[.34,.61,.78,1],metallic=.15,roughness=.6,
  emissive=[0,0,0],doubleSided=false}={}){
 if(!within(metallic,0,1)||!within(roughness,.04,1)||!finite3(emissive)||
 emissive.some(v=>v<0||v>1))throw Error('AIG3D_MATERIAL_INVALID');
 return {baseColor:color4(baseColor),metallic,roughness,emissive:[...emissive],
  doubleSided:doubleSided===true,lightingModel:'DIFFUSE_SPECULAR_NOT_FULL_PBR'};
}
export function createAIG3DMesh({positions,normals,indices,provenance='UNVERIFIED_USER_OR_DEMO'}={}){
 if(!Array.isArray(positions)||positions.length<9||positions.length%3!==0||
 positions.length>500000||!positions.every(x=>within(x,-1e7,1e7))||
 !Array.isArray(normals)||normals.length!==positions.length||
 !normals.every(x=>within(x,-1,1))||
 !Array.isArray(indices)||indices.length<3||indices.length%3!==0||
 indices.length>900000||!indices.every(x=>Number.isInteger(x)&&x>=0&&x<positions.length/3)||
 typeof provenance!=='string'||provenance.length<3||provenance.length>180)
  throw Error('AIG3D_MESH_TOPOLOGY_OR_SOURCE_INVALID');
 let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<positions.length;i+=3)for(let j=0;j<3;j++){
  min[j]=Math.min(min[j],positions[i+j]);max[j]=Math.max(max[j],positions[i+j]);
 }
 if(max.every((v,i)=>Math.abs(v-min[i])<1e-12))
  throw Error('AIG3D_DEGENERATE_GEOMETRY');
 return {positions:[...positions],normals:[...normals],indices:[...indices],
  provenance,bounds:{min,max},vertexCount:positions.length/3,
  triangleCount:indices.length/3,actualXYZTriangles:true};
}
export function createAIG3DBox(size=[1,1,1],provenance='PROCEDURAL_SHAPE_DEMO'){
 const [x,y,z]=array3(size,true).map(v=>v*.5),
 faces=[
  {n:[0,0,1],v:[[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]]},
  {n:[0,0,-1],v:[[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]]},
  {n:[1,0,0],v:[[x,-y,z],[x,-y,-z],[x,y,-z],[x,y,z]]},
  {n:[-1,0,0],v:[[-x,-y,-z],[-x,-y,z],[-x,y,z],[-x,y,-z]]},
  {n:[0,1,0],v:[[-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z]]},
  {n:[0,-1,0],v:[[-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z]]}
 ];
 const positions=[],normals=[],indices=[];
 faces.forEach((f,i)=>{for(const p of f.v){positions.push(...p);normals.push(...f.n);}
  let start=i*4;indices.push(start,start+1,start+2,start,start+2,start+3);
 });
 return createAIG3DMesh({positions,normals,indices,provenance});
}
export function createAIG3DCylinder({radius=.5,height=1,segments=24,
 provenance='PROCEDURAL_SHAPE_DEMO'}={}){
 if(!within(radius,.0001,1e5)||!within(height,.0001,1e5)||
 !Number.isInteger(segments)||segments<8||segments>128)
  throw Error('AIG3D_CYLINDER_PARAMS_INVALID');
 const positions=[],normals=[],indices=[];
 for(let j=0;j<segments;j++){
  const a=j*2*Math.PI/segments,b=(j+1)*2*Math.PI/segments,
   u=[Math.cos(a),Math.sin(a)],v=[Math.cos(b),Math.sin(b)],i=positions.length/3;
  const corners=[[u[0]*radius,-height/2,u[1]*radius],
   [v[0]*radius,-height/2,v[1]*radius],
   [v[0]*radius,height/2,v[1]*radius],
   [u[0]*radius,height/2,u[1]*radius]];
  const ns=[[u[0],0,u[1]],[v[0],0,v[1]],[v[0],0,v[1]],[u[0],0,u[1]]];
  for(let k=0;k<4;k++){positions.push(...corners[k]);normals.push(...ns[k]);}
  indices.push(i,i+2,i+1,i,i+3,i+2);
 }
 for(const direction of [1,-1]){
  const normal=[0,direction,0];
  for(let j=0;j<segments;j++){
   const a=j*2*Math.PI/segments,b=(j+1)*2*Math.PI/segments,
    center=[0,direction*height/2,0],
    rim1=[Math.cos(a)*radius,direction*height/2,Math.sin(a)*radius],
    rim2=[Math.cos(b)*radius,direction*height/2,Math.sin(b)*radius],i=positions.length/3;
   for(const p of (direction===1?[center,rim2,rim1]:[center,rim1,rim2])){
    positions.push(...p);normals.push(...normal);
   }
   indices.push(i,i+1,i+2);
  }
 }
 return createAIG3DMesh({positions,normals,indices,provenance});
}
export function createAIG3DScene({id='aig-scene',consumer='FastModel',units='MM',
 source='SOURCE_OR_DEMO_MUST_BE_EXPLICIT'}={}){
 if(!validId(id)||!AIG_REAL3D_CONSUMERS.includes(consumer)||
 !['MM','METERS','RELATIVE'].includes(units)||typeof source!=='string'||source.length<3)
  throw Error('AIG3D_SCENE_PROVENANCE_INVALID');
 return {schema:AIG_REAL3D_SCHEMA,id,consumer,units,source,
  nodes:[],overlays:[],revision:0,
  runtimeNCWriteEnabled:false,materialRemovalVerified:false};
}
export function addAIG3DNode(scene,{id,parentId=null,mesh,transform={},
 material={},visible=true,kind='object',source='NOT_PHYSICAL_VERIFIED'}={}){
 if(scene?.schema!==AIG_REAL3D_SCHEMA||!validId(id)||scene.nodes.some(n=>n.id===id)||
 parentId!==null&&!scene.nodes.some(n=>n.id===parentId)||
 !mesh||mesh.actualXYZTriangles!==true||
 !['object','tool','stock','fixture','machine','character','environment'].includes(kind)||
 typeof source!=='string'||source.length<3||scene.nodes.length>=256)
  throw Error('AIG3D_NODE_INVALID_OR_PARENT_MISSING');
 const node={id,parentId,mesh,transform:transformSpec(transform),
  material:makeAIG3DMaterial(material),visible:visible===true,kind,source,
  geometryVerifiedAgainstSource:false};
 scene.nodes.push(node);scene.revision++;return node;
}
export function updateAIG3DNodeTransform(scene,id,transform){
 const node=scene?.nodes?.find(n=>n.id===id);if(!node)throw Error('AIG3D_NODE_NOT_FOUND');
 node.transform=transformSpec(transform);scene.revision++;return node.transform;
}
export function getAIG3DWorldMatrix(scene,id){
 if(scene?.schema!==AIG_REAL3D_SCHEMA)throw Error('AIG3D_SCENE_INVALID');
 const node=scene.nodes.find(n=>n.id===id);
 if(!node)throw Error('AIG3D_NODE_NOT_FOUND');
 let out=composeAIG3DTRS(node.transform),p=node.parentId,guard=0;
 while(p!==null){
  const a=scene.nodes.find(n=>n.id===p);
  if(!a||++guard>256)throw Error('AIG3D_PARENT_CHAIN_INVALID');
  out=multiplyAIG3DMatrix(composeAIG3DTRS(a.transform),out);p=a.parentId;
 }
 return out;
}
export function addAIG3DToolpathOverlay(scene,{id,segments,source='DEMO_NOT_NC_PROVEN',
 units=scene?.units}={}){
 if(scene?.schema!==AIG_REAL3D_SCHEMA||!validId(id)||
 scene.overlays.some(o=>o.id===id)||
 !['MM','METERS','RELATIVE'].includes(units)||units!==scene.units||
 !Array.isArray(segments)||segments.length<1||segments.length>25000||
 typeof source!=='string'||source.length<3)throw Error('AIG3D_TOOLPATH_OVERLAY_INVALID');
 const parsed=segments.map((s,i)=>{
  if(!s||!finite3(s.from)||!finite3(s.to))
   throw Error('AIG3D_VECTOR_INVALID');
  if(!['G0','G1'].includes(s.motion))
   throw Error('AIG3D_ONLY_EXPLICIT_LINEAR_SEGMENTS_SUPPORTED');
  return {from:array3(s.from),to:array3(s.to),motion:s.motion,index:i};
 });
 const entry={id,segments:parsed,source,kind:'TOOLPATH_VISUAL_ONLY',
  actualCNCOutputNotAuthorized:true,materialRemovalNotCalculated:true};
 scene.overlays.push(entry);scene.revision++;return entry;
}
export function auditAIG3DScene(scene){
 if(scene?.schema!==AIG_REAL3D_SCHEMA)throw Error('AIG3D_SCENE_INVALID');
 let triangles=0;const ids=new Set(),parents=new Set();
 for(const n of scene.nodes){
  if(ids.has(n.id))throw Error('AIG3D_DUPLICATE_NODE_ID');
  ids.add(n.id);if(n.parentId)parents.add(n.parentId);
  getAIG3DWorldMatrix(scene,n.id);triangles+=n.mesh.triangleCount;
 }
 return {schema:scene.schema,consumer:scene.consumer,units:scene.units,
  nodeCount:scene.nodes.length,triangleCount:triangles,
  toolpathSegments:scene.overlays.reduce((s,o)=>s+o.segments.length,0),
  trueIndexedXYZMesh:triangles>0,
  verifiedNCFeedOrStockRemoval:false,verifiedAuthenticMachineModel:false,
  hasProductionCNCBridge:false,source:scene.source,revision:scene.revision};
}
