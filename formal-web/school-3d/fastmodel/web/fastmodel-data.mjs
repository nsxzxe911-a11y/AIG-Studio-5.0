// AIG original browser-side mirror of native incremental position contract.
// No external libraries; fast typed-array deltas. This is NOT native DX12/Vulkan.
export class PatchBuffer {
  constructor(source) {if (!(source instanceof Float32Array) || source.length%3 || !source.length) throw Error('Invalid vec3 vertices');this.positions=new Float32Array(source);this.revision=0;this.dirty=[[0,source.length/3]];}
  patch(indices,values){
    if(indices.length*3!==values.length)throw Error('Patch lengths mismatch');
    for(let i=0;i<indices.length;i++){
      const index=indices[i];if(!Number.isInteger(index)||index<0||index>=this.positions.length/3)throw Error('Patch vertex out of range');
      for(let j=0;j<3;j++)if(!Number.isFinite(values[i*3+j]))throw Error('Patch nonfinite');
    }
    if(!indices.length)return;
    for(let i=0;i<indices.length;i++){let p=indices[i]*3;this.positions.set(values.subarray(i*3,i*3+3),p);this.dirty.push([indices[i],indices[i]+1]);}
    this.revision++;
  }
  consumeDirty(){const a=this.dirty.splice(0).sort((a,b)=>a[0]-b[0]);const merged=[];for(const p of a){let prev=merged.at(-1);if(prev&&p[0]<=prev[1])prev[1]=Math.max(prev[1],p[1]);else merged.push([...p]);}return merged;}
}
export function decodeGLB(arrayBuffer){
 const view=new DataView(arrayBuffer);if(view.byteLength<28||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==view.byteLength)throw Error('Not valid GLB 2.0');
 let pos=12,g=null,bin=null;
 while(pos+8<=view.byteLength){const len=view.getUint32(pos,true),type=view.getUint32(pos+4,true);pos+=8;if(pos+len>view.byteLength)throw Error('Truncated GLB');if(type===0x4e4f534a)g=JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer,pos,len)));if(type===0x004e4942)bin=new DataView(arrayBuffer,pos,len);pos+=len;}
 if(!g||!bin||pos!==view.byteLength)throw Error('Missing JSON/BIN chunk');
 if(!Array.isArray(g.meshes)||!Array.isArray(g.nodes)||!Array.isArray(g.accessors))throw Error('GLB missing required mesh structures');
 return {g,bin,arrayBuffer};
}
const COMPONENT={5120:[1,'getInt8'],5121:[1,'getUint8'],5122:[2,'getInt16'],5123:[2,'getUint16'],5125:[4,'getUint32'],5126:[4,'getFloat32']};
const N={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
export function readAccessor(file,id){
 const {g,bin}=file,a=g.accessors[id],bv=g.bufferViews[a?.bufferView];if(!a||!bv||!(a.type in N)||!(a.componentType in COMPONENT)||a.sparse)throw Error('Unsupported GLB accessor '+id);
 const [bytes,fn]=COMPONENT[a.componentType],n=N[a.type],stride=bv.byteStride||bytes*n,off=(bv.byteOffset||0)+(a.byteOffset||0);if(stride<bytes*n||stride%bytes||off+stride*(a.count-1)+n*bytes>bin.byteLength)throw Error('GLB buffer bounds');
 const arr=a.componentType===5126?new Float32Array(a.count*n):new Uint32Array(a.count*n);
 for(let i=0;i<a.count;i++)for(let j=0;j<n;j++)arr[i*n+j]=bin[fn](off+i*stride+j*bytes, true);
 return arr;
}
/** FastModel 1.5: read only sparse sample points; do not allocate/decode whole POSITION accessor.
 * Supports existing GLB2 numeric types and interleaved bufferViews, matching readAccessor.
 */
export function sampleVec3Accessor(file,id,sampleStride=1){
 const {g,bin}=file,a=g?.accessors?.[id],bv=g?.bufferViews?.[a?.bufferView];
 if(!a||!bv||a.type!=='VEC3'||!(a.componentType in COMPONENT)||a.sparse)throw Error('Unsupported POSITION accessor '+id);
 if(!Number.isInteger(sampleStride)||sampleStride<1||!Number.isSafeInteger(a.count)||a.count<1)throw RangeError('Invalid scan sample stride/count');
 const [bytes,fn]=COMPONENT[a.componentType];
 const byteStride=bv.byteStride||bytes*3,off=(bv.byteOffset||0)+(a.byteOffset||0);
 if(byteStride<bytes*3||byteStride%bytes||off<0||off+byteStride*(a.count-1)+3*bytes>bin.byteLength)throw Error('GLB sampled buffer bounds');
 const n=Math.ceil(a.count/sampleStride);
 if(n>100000)throw Error('Scan accessor budget exceeded');
 const out=new Float32Array(n*3);let sampled=0;
 for(let i=0;i<a.count;i+=sampleStride){
   const base=off+i*byteStride;
   for(let j=0;j<3;j++)out[sampled*3+j]=bin[fn](base+j*bytes,true);
   sampled++;
 }
 return out;
}
export function previewOptionalMaterials(g){
 const protectedMat=new Set();
 for(const node of g.nodes||[]){
  if(!['head','neck','face','scalp'].includes(node.extras?.aigAnatomyPart)||node.mesh===undefined)continue;
  for(const p of g.meshes[node.mesh]?.primitives||[])protectedMat.add(p.material??0);
 }
 return protectedMat;
}
export function maySkipPreviewPrimitive(g,node,p,protectedMat=previewOptionalMaterials(g)){
 const mat=p.material??0,extras=g.materials?.[mat]?.extras;
 if(['head','neck','face','scalp'].includes(node.extras?.aigAnatomyPart))return false;
 return extras?.aigOptionalRenderDetail===true &&
   ['fine-hair','foliage','water-foam'].includes(extras?.aigOptionalGroup) &&
   !protectedMat.has(mat);
}
export function buildBatches(file,detail='full'){
 const g=file.g, groups=new Map(),bound={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};let primitives=0,skipped=0;
 const protectedMat=previewOptionalMaterials(g);
 for(const node of g.nodes){if(node.mesh===undefined)continue;const skin=node.skin??0,mesh=g.meshes[node.mesh];
 for(const p of mesh.primitives){const mat=p.material??0;if(detail==='preview'&&maySkipPreviewPrimitive(g,node,p,protectedMat)){skipped++;continue;}
  const attr=p.attributes;let vertex=readAccessor(file,attr.POSITION),uv=attr.TEXCOORD_0===undefined?null:readAccessor(file,attr.TEXCOORD_0), joints=readAccessor(file,attr.JOINTS_0),weights=readAccessor(file,attr.WEIGHTS_0),col=attr.COLOR_0===undefined?null:readAccessor(file,attr.COLOR_0),idx=readAccessor(file,p.indices);
  const vCount=vertex.length/3;if(idx.length%3)throw Error('Nontriangle GLB primitive');const key=skin+'/'+mat;
  if(!groups.has(key))groups.set(key,{skin,mat,vertices:[],indices:[],vertexCount:0,primitives:0});const b=groups.get(key),offset=b.vertexCount;
  for(let i=0;i<vCount;i++){
   let base=i*3;for(let c=0;c<3;c++){b.vertices.push(vertex[base+c]);bound.min[c]=Math.min(bound.min[c],vertex[base+c]);bound.max[c]=Math.max(bound.max[c],vertex[base+c]);}
   b.vertices.push(uv?.[i*2]??0,uv?.[i*2+1]??0);
   for(let k=0;k<4;k++)b.vertices.push(joints[i*4+k]);for(let k=0;k<4;k++)b.vertices.push(weights[i*4+k]);
   for(let k=0;k<4;k++)b.vertices.push(col?.[i*4+k]??1);
  }
  for(let i=0;i<idx.length;i++){if(idx[i]>=vCount)throw Error('GLB primitive invalid index');b.indices.push(idx[i]+offset);}
  b.vertexCount+=vCount;b.primitives++;primitives++;
 }}
 const batches=[...groups.values()].map(b=>({...b,vertices:new Float32Array(b.vertices),indices:new Uint32Array(b.indices)}));
 return {batches,primitives,skipped,drawCalls:batches.length,vertices:batches.reduce((s,b)=>s+b.vertexCount,0),indices:batches.reduce((s,b)=>s+b.indices.length,0),bound};
}