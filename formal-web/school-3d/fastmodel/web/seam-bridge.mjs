/**
 * FastModel 1.9: opt-in, non-destructive GLB head-to-neck visual bridge candidate.
 * Produces an isolated new primitive with two rings of skinned vertices. It does NOT
 * weld source vertices, repair normals, prove watertight anatomy, or guarantee animated contact.
 * Only safe, explicit single-loop / common-skin / identity-node conditions are accepted.
 */
import {decodeGLB,readAccessor} from './fastmodel-data.mjs';
const MAX_RING=256;
function candidates(file,role){
 const {g}=file,eligible=g.nodes.map((n,id)=>({n,id})).filter(v=>v.n.extras?.aigAnatomyPart===role);
 if(eligible.length!==1)throw Error('BRIDGE_'+role.toUpperCase()+'_NODE_MUST_BE_UNIQUE');
 const {n,id}=eligible[0];
 if(n.mesh===undefined||!Number.isInteger(n.skin))throw Error('BRIDGE_ROLE_REQUIRES_SKINNED_MESH');
 if(n.matrix||n.translation||n.rotation||n.scale)throw Error('BRIDGE_TRANSFORM_NOT_SUPPORTED');
 const mesh=g.meshes[n.mesh];
 if(!mesh||mesh.primitives?.length!==1)throw Error('BRIDGE_REQUIRES_SINGLE_PRIMITIVE_'+role.toUpperCase());
 const p=mesh.primitives[0];
 if((p.mode??4)!==4||p.indices===undefined||p.attributes?.POSITION===undefined||p.attributes?.JOINTS_0===undefined||p.attributes?.WEIGHTS_0===undefined)throw Error('BRIDGE_MISSING_TRIANGLES_OR_SKIN_ATTRIBUTES');
 if(p.targets?.length)throw Error('BRIDGE_MORPH_TARGETS_NOT_SUPPORTED');
 if(g.nodes.some((v,i)=>i!==id&&v.mesh===n.mesh))throw Error('BRIDGE_SHARED_SOURCE_MESH');
 return {n,id,p,role};
}
function ring(file,p){
 const positions=readAccessor(file,p.attributes.POSITION),indices=readAccessor(file,p.indices);
 const joints=readAccessor(file,p.attributes.JOINTS_0),weights=readAccessor(file,p.attributes.WEIGHTS_0);
 const tex=p.attributes.TEXCOORD_0===undefined?null:readAccessor(file,p.attributes.TEXCOORD_0);
 const col=p.attributes.COLOR_0===undefined?null:readAccessor(file,p.attributes.COLOR_0);
 const count=positions.length/3;
 if(!Number.isInteger(count)||count<3||count>100000||indices.length%3||joints.length!==4*count||weights.length!==4*count)throw Error('BRIDGE_ATTRIBUTES_INVALID');
 const edges=new Map();
 for(let t=0;t<indices.length;t+=3){
  const face=[indices[t],indices[t+1],indices[t+2]];
  if(face.some(x=>!Number.isInteger(x)||x<0||x>=count)||new Set(face).size!==3)throw Error('BRIDGE_INVALID_TRIANGLES');
  for(const [a,b] of [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]]){
   const key=Math.min(a,b)+':'+Math.max(a,b);
   const e=edges.get(key)||{a,b,count:0};e.count++;edges.set(key,e);
   if(e.count>2)throw Error('BRIDGE_NONMANIFOLD_EDGE');
  }
 }
 const open=[...edges.values()].filter(e=>e.count===1);
 if(open.length<3||open.length>MAX_RING)throw Error('BRIDGE_OPEN_RING_SIZE');
 const next=new Map();
 for(const e of open){
  for(const [a,b] of [[e.a,e.b],[e.b,e.a]]){if(!next.has(a))next.set(a,[]);next.get(a).push(b);}
 }
 if([...next.values()].some(list=>list.length!==2)||next.size!==open.length)throw Error('BRIDGE_RING_NOT_SIMPLE');
 const start=Math.min(...next.keys()),ordered=[start],seen=new Set([start]);let prev=-1,current=start;
 while(true){
  const links=next.get(current),following=links[0]===prev?links[1]:links[0];
  if(following===start)break;
  if(seen.has(following)||ordered.length>=MAX_RING)throw Error('BRIDGE_RING_NOT_SIMPLE');
  ordered.push(following);seen.add(following);prev=current;current=following;
 }
 if(ordered.length!==next.size)throw Error('BRIDGE_MULTIPLE_RINGS');
 const vertices=ordered.map(i=>{
  const p3=Array.from(positions.subarray(i*3,i*3+3));
  const j4=Array.from(joints.subarray(i*4,i*4+4));
  const w4=Array.from(weights.subarray(i*4,i*4+4));
  if([...p3,...j4,...w4].some(x=>!Number.isFinite(x))||w4.some(x=>x<0)||j4.some(x=>!Number.isInteger(x)||x<0))throw Error('BRIDGE_NONFINITE_OR_BAD_SKIN');
  const total=w4.reduce((a,b)=>a+b,0);
  if(Math.abs(total-1)>0.025)throw Error('BRIDGE_BAD_SKIN_WEIGHT_SUM');
  return {p:p3,j:j4,w:w4,uv:tex?Array.from(tex.subarray(i*2,i*2+2)):[0,0],
   color:col?Array.from(col.subarray(i*4,i*4+4)):[1,1,1,1]};
 });
 return vertices;
}
function sq(a,b){return (a.p[0]-b.p[0])**2+(a.p[1]-b.p[1])**2+(a.p[2]-b.p[2])**2;}
function alignRings(head,neck){
 if(head.length!==neck.length)throw Error('BRIDGE_RING_VERTEX_COUNT_MISMATCH');
 const n=head.length;let best={cost:Infinity,offset:0,reverse:false};
 for(const reverse of [false,true])for(let offset=0;offset<n;offset++){
  let cost=0;
  for(let i=0;i<n;i++){const k=reverse?((offset-i+n)%n):((offset+i)%n);cost+=sq(head[i],neck[k]);}
  if(cost<best.cost)best={cost,offset,reverse};
 }
 const aligned=head.map((_,i)=>neck[best.reverse?((best.offset-i+n)%n):((best.offset+i)%n)]);
 return {...best,aligned};
}
function pack(file,mesh,skin,report){
 const g=JSON.parse(JSON.stringify(file.g));
 if(g.buffers?.length!==1||!g.scenes?.length||!g.scenes[g.scene??0]?.nodes)throw Error('BRIDGE_SINGLE_EMBEDDED_BUFFER_AND_SCENE_REQUIRED');
 const old=new Uint8Array(file.bin.buffer,file.bin.byteOffset,file.bin.byteLength);
 const parts=[];
 function append(values,components,type){
  const typed=type===5125?new Uint32Array(values):new Float32Array(values),bytes=new Uint8Array(typed.buffer),len=bytes.byteLength;
  const pad=(-len)&3;parts.push({bytes,pad});
  const originalPadded=old.byteLength+((-old.byteLength)&3);
  const offset=originalPadded+parts.slice(0,-1).reduce((s,x)=>s+x.bytes.length+x.pad,0);
  const bv=g.bufferViews.length;g.bufferViews.push({buffer:0,byteOffset:offset,byteLength:len});
  const id=g.accessors.length;
  const n=values.length/components;
  const acc={bufferView:bv,componentType:type,count:n,type:{1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'}[components]};
  if(components===3&&type===5126){acc.min=[Infinity,Infinity,Infinity];acc.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<values.length;i+=3)for(let j=0;j<3;j++){acc.min[j]=Math.min(acc.min[j],values[i+j]);acc.max[j]=Math.max(acc.max[j],values[i+j]);}}
  g.accessors.push(acc);return id;
 }
 const {heads,necks}=mesh,n=heads.length;
 const vertices=[...heads,...necks],positions=[],joints=[],weights=[],uv=[],colors=[],indices=[];
 for(const v of vertices){positions.push(...v.p);joints.push(...v.j);weights.push(...v.w);uv.push(...v.uv);colors.push(...v.color);}
 // Quad strip; winding is taken from the chosen best matching ring direction.
 for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,j,n+i,j,n+j,n+i);}
 const attrs={POSITION:append(positions,3,5126),TEXCOORD_0:append(uv,2,5126),
   JOINTS_0:append(joints,4,5126),WEIGHTS_0:append(weights,4,5126),
   COLOR_0:append(colors,4,5126)};
 const index=append(indices,1,5125);
 const meshIndex=g.meshes.length;
 g.meshes.push({name:'AIG_HEAD_NECK_VISUAL_BRIDGE_WORKING_COPY_NOT_WELDED',primitives:[
  {attributes:attrs,indices:index,material:mesh.material,mode:4}
 ]});
 const nodeIndex=g.nodes.length;
 g.nodes.push({name:'AIG_VISUAL_BRIDGE_EXPERIMENTAL',mesh:meshIndex,skin,
  extras:{aigExperimentalRepair:'VISUAL_TRIANGLE_STRIP_NOT_WELDED',aigNotAuthority:true}});
 g.scenes[g.scene??0].nodes.push(nodeIndex);
 g.extras={...g.extras,aigRepairStatus:'CANDIDATE_ONLY_HEAD_NECK_BRIDGE_NOT_APPROVED'};
 const oldPad=(-old.length)&3;
 const binLength=old.length+oldPad+parts.reduce((a,x)=>a+x.bytes.length+x.pad,0);
 g.buffers[0].byteLength=binLength;
 const jsonBytes=new TextEncoder().encode(JSON.stringify(g));
 const jsonPad=(-jsonBytes.length)&3;
 const out=new ArrayBuffer(12+8+jsonBytes.length+jsonPad+8+binLength),d=new DataView(out),u=new Uint8Array(out);
 d.setUint32(0,0x46546c67,true);d.setUint32(4,2,true);d.setUint32(8,out.byteLength,true);
 d.setUint32(12,jsonBytes.length+jsonPad,true);d.setUint32(16,0x4e4f534a,true);
 u.set(jsonBytes,20);u.fill(32,20+jsonBytes.length,20+jsonBytes.length+jsonPad);
 let cursor=20+jsonBytes.length+jsonPad;
 d.setUint32(cursor,binLength,true);d.setUint32(cursor+4,0x004e4942,true);cursor+=8;
 u.set(old,cursor);cursor+=old.length+oldPad;
 for(const part of parts){u.set(part.bytes,cursor);cursor+=part.bytes.length+part.pad;}
 const check=decodeGLB(out);
 if(check.g.meshes.length!==file.g.meshes.length+1||check.g.accessors.length!==file.g.accessors.length+6)throw Error('BRIDGE_OUTPUT_VERIFICATION_FAILED');
 return {buffer:out,newTriangleCount:indices.length/3,outputMeshIndex:meshIndex,outputNodeIndex:nodeIndex,unapproved:true,
  report:{...report,structuralSourceUnmodified:true,visualBridgeCreated:true,headNeckTopologyWelded:false,
   UVNormalContinuityProved:false,animatedSkinGapProvedClosed:false}};
}
export function createHeadNeckBridgeCandidate(arrayBuffer,{maxGapFraction=0.08}={}){
 if(!(arrayBuffer instanceof ArrayBuffer)||!Number.isFinite(maxGapFraction)||maxGapFraction<=0||maxGapFraction>0.2)throw Error('BRIDGE_INVALID_INPUT');
 const file=decodeGLB(arrayBuffer),head=candidates(file,'head'),neck=candidates(file,'neck');
 if(head.n.skin!==neck.n.skin)throw Error('BRIDGE_SKINS_DIFFER');
 if(head.n.mesh===neck.n.mesh)throw Error('BRIDGE_SOURCE_MESH_SAME');
 const parent=g=>g.nodes.some(v=>(v.children||[]).includes(head.id)||(v.children||[]).includes(neck.id));
 if(parent(file.g))throw Error('BRIDGE_NODE_HAS_PARENT');
 const h=ring(file,head.p),n=ring(file,neck.p);
 const pairing=alignRings(h,n);
 const all=h.flatMap(v=>v.p).concat(n.flatMap(v=>v.p));
 const extent=Math.max(1e-9,
  Math.max(...all.filter((_,i)=>i%3===0))-Math.min(...all.filter((_,i)=>i%3===0)),
  Math.max(...all.filter((_,i)=>i%3===1))-Math.min(...all.filter((_,i)=>i%3===1)),
  Math.max(...all.filter((_,i)=>i%3===2))-Math.min(...all.filter((_,i)=>i%3===2)));
 const maximum=Math.sqrt(Math.max(...h.map((v,i)=>sq(v,pairing.aligned[i]))));
 if(maximum>extent*maxGapFraction)throw Error('BRIDGE_GAP_EXCEEDS_SAFETY_LIMIT');
 if(!file.g.skins?.[head.n.skin]||!file.g.materials?.[head.p.material??0])throw Error('BRIDGE_SKIN_OR_MATERIAL_MISSING');
 return pack(file,{heads:h,necks:pairing.aligned,material:head.p.material??0},head.n.skin,{
  source:'REAL_TAGGED_HEAD_NECK_GLB',ringVertices:h.length,maximumSourceGap:maximum,
  sourceExtent:extent,thresholdFraction:maxGapFraction,skinIndex:head.n.skin});
}
