/** AIG FastModel 4.7 — actually shared-index head/neck technical mesh.
 * Geometry generated from 4.6 SHA-registered MANUAL 2D proportions, NOT a
 * photogrammetric reconstruction, approved heroine or skinned mesh.
 */
import {AIG46_SCHEMA,buildHeadNeckPonytail,meshTopology} from './aig-head-neck-4-6.mjs';
export const AIG47_SCHEMA='AIG_FASTMODEL_4_7_SHARED_HEAD_NECK_GLTF_DRAFT';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function solidHeadNeck(base){
 const old=base.parts.find(p=>p.name==='head');
 const neck=base.parts.find(p=>p.name==='neck');
 if(!old||!neck)throw Error('AIG47_SOURCE_PARTS_MISSING');
 let maxX=0,maxZ=0,top=-Infinity,bottom=Infinity;
 for(let i=0;i<old.positions.length;i+=3){
  maxX=Math.max(maxX,Math.abs(old.positions[i]));
  maxZ=Math.max(maxZ,Math.abs(old.positions[i+2]));
  top=Math.max(top,old.positions[i+1]);bottom=Math.min(bottom,old.positions[i+1]);
 }
 const centerY=(top+bottom)/2,ry=(top-bottom)/2;
 if(!finite(ry)||ry<.01||!finite(maxX)||maxX<.01)throw Error('AIG47_HEAD_DIMENSIONS_INVALID');
 const neckBottom=Math.min(...Array.from({length:neck.positions.length/3},(_,i)=>neck.positions[3*i+1]));
 const seamY=centerY-.72*ry;
 if(neckBottom>=seamY-.01)throw Error('AIG47_NO_NECK_JOIN_SPAN');
 const cutCos=(seamY-centerY)/ry,cutPhi=Math.acos(cutCos);
 const rings=[],sides=24,vertex=[],index=[];
 const addRing=(y,rx,rz,zOffset=0)=>{
  if(![y,rx,rz,zOffset].every(finite)||rx<=0||rz<=0)throw Error('AIG47_RING_INVALID');
  const row=[];for(let j=0;j<sides;j++){
   const angle=2*Math.PI*j/sides;
   row.push(vertex.length/3);
   vertex.push(rx*Math.cos(angle),y,zOffset+rz*Math.sin(angle));
  }rings.push(row);
 };
 // One continuous exterior from lower neck to upper head. Join ring vertices
 // are shared by the neck and upper head — NO duplicate overlapping caps.
 addRing(neckBottom,.030,.030,.003);
 addRing(seamY-.047,.027,.027,.003);
 addRing(seamY-.018,.031,.031,.002);
 const ringRadius=Math.sin(cutPhi);
 addRing(seamY,maxX*ringRadius,maxZ*ringRadius,0);
 for(let n=1;n<11;n++){
  const phi=cutPhi*(1-n/11),r=Math.sin(phi);
  addRing(centerY+ry*Math.cos(phi),maxX*r,maxZ*r);
 }
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++){
  const a=rings[i][j],b=rings[i][(j+1)%sides];
  const c=rings[i+1][j],d=rings[i+1][(j+1)%sides];
  // Ring theta winds +X→+Z, so these winding orders face outwards.
  index.push(a,c,b,b,c,d);
 }
 const low=vertex.length/3;vertex.push(0,neckBottom,.003);
 const high=vertex.length/3;vertex.push(0,centerY+ry,0);
 for(let j=0;j<sides;j++){
  index.push(low,rings[0][j],rings[0][(j+1)%sides]);
  const end=rings.at(-1);
  index.push(high,end[(j+1)%sides],end[j]);
 }
 return {name:'headNeck',positions:new Float32Array(vertex),
  indices:new Uint16Array(index),sourceEvidence:'INFERRED_SHARED_INDEX_NECK_HEAD_TECHNICAL',
  partIsIndependentlyEditable:true,skinned:false,uvMapped:false,approvedVisualIdentity:false,
  actualSharedJoinRingVertices:rings[3].length,joinY:seamY,neckBottom};
}
function hairNeckVertexClearance(hair,headNeck){
 // Real vertices of ponytail vs simple normalized tube envelope; screen proxy
 // only. Does NOT test full triangle-triangle intersections or animated strands.
 const y0=headNeck.neckBottom,y1=headNeck.joinY;
 const p=hair.positions;let smallest=Infinity,n=0,inside=0;
 for(let i=0;i<p.length;i+=3){
  const x=p[i],y=p[i+1],z=p[i+2];
  if(y<y0||y>y1)continue;
  const f=Math.max(0,Math.min(1,(y-y0)/(y1-y0)));
  const radius=.030+(Math.max(.033,.040)-.030)*f;
  const delta=Math.hypot(x,z-.003)-radius;
  smallest=Math.min(smallest,delta);n++;
  if(delta<0)inside++;
 }
 return {sampledPonytailVertices:n,minSignedVertexToNeckEnvelope:finite(smallest)?smallest:null,
  verticesInsideEnvelope:inside,exactTriangleIntersectionVerified:false};
}
export function buildAIG47Draft(profile,{ponytailSwing=0,ponytailBack=.09}={}){
 if(profile?.schema!==AIG46_SCHEMA||!Array.isArray(profile.sourceSHA256)||!profile.sourceSHA256.length)
  throw Error('AIG47_SHA_BOUND_PROFILE_REQUIRED');
 const parent=buildHeadNeckPonytail(profile,{ponytailSwing,ponytailBack});
 if(!parent.topologyQA)throw Error('AIG47_SOURCE_TOPOLOGY_BLOCKED');
 const headNeck=solidHeadNeck(parent);
 const tail=parent.parts.find(x=>x.name==='ponytail');
 const parts=[headNeck,tail],topology=parts.map(meshTopology);
 if(!topology.every(q=>q.closed&&q.normalOrientationVerified))throw Error('AIG47_WATERTIGHT_ORIENTATION_BLOCKED');
 const clearance=hairNeckVertexClearance(tail,headNeck);
 return {schema:AIG47_SCHEMA,sourceSHA256:[...profile.sourceSHA256],parts,topology,
  topologyQA:true,headNeckSharedVertexJoin:true,headNeckJoinRingVertices:headNeck.actualSharedJoinRingVertices,
  headNeckIsSingleConnectedIndexedSurface:true,headNeckExternalSkinWelded:false,
  hairClearance:clearance,ponytailNeckProxyIntersectionRisk:clearance.verticesInsideEnvelope>0,
  ponytailSwing,ponytailBack,realPhotoFaceMatchVerified:false,realHairCollisionVerified:false,
  skinnedOrRigged:false,texturedOrUV:false,completeHumanModel:false,
  fullBackSideSourceVerified:false,releaseAllowed:false,noCreditsSpent:true};
}
const align4=n=>(n+3)&~3;
function packBuffers(parts){
 const chunks=[],views=[],accessors=[],meshes=[],nodes=[],materials=[
  {name:'AIG_TECHNICAL_HEAD_NECK_NOT_HUMAN_SKIN',pbrMetallicRoughness:{baseColorFactor:[.72,.51,.48,1],metallicFactor:0,roughnessFactor:.92},doubleSided:false},
  {name:'AIG_TECHNICAL_PONYTAIL_NOT_REAL_HAIR',pbrMetallicRoughness:{baseColorFactor:[.29,.19,.17,1],metallicFactor:0,roughnessFactor:.96},doubleSided:false}
 ];
 let cursor=0;
 function addData(data,target){
  if(cursor%4){const pad=new Uint8Array(4-cursor%4);chunks.push(pad);cursor+=pad.byteLength;}
  const at=cursor;chunks.push(data);cursor+=data.byteLength;
  views.push({buffer:0,byteOffset:at,byteLength:data.byteLength,target});
  return views.length-1;
 }
 for(let k=0;k<parts.length;k++){
  const part=parts[k],pos=part.positions,ix=part.indices;
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<pos.length;i+=3)for(let a=0;a<3;a++){
   min[a]=Math.min(min[a],pos[i+a]);max[a]=Math.max(max[a],pos[i+a]);
  }
  const pv=addData(new Uint8Array(pos.buffer,pos.byteOffset,pos.byteLength),34962);
  accessors.push({bufferView:pv,componentType:5126,count:pos.length/3,type:'VEC3',min,max});
  const pa=accessors.length-1;
  const iv=addData(new Uint8Array(ix.buffer,ix.byteOffset,ix.byteLength),34963);
  accessors.push({bufferView:iv,componentType:5123,count:ix.length,type:'SCALAR'});
  const ia=accessors.length-1;
  meshes.push({name:'AIG47_'+part.name,primitives:[{attributes:{POSITION:pa},indices:ia,material:k,mode:4}]});
  nodes.push({name:'AIG47_'+part.name,mesh:k});
 }
 const result=new Uint8Array(align4(cursor));let ptr=0;
 for(const chunk of chunks){result.set(chunk,ptr);ptr+=chunk.byteLength;}
 return {bin:result,views,accessors,meshes,nodes,materials};
}
export function exportAIG47GLB(draft){
 if(draft?.schema!==AIG47_SCHEMA||!draft.topologyQA||!draft.headNeckSharedVertexJoin||
    draft.parts?.length!==2||draft.parts.some(p=>!meshTopology(p).closed))
  throw Error('AIG47_UNVERIFIED_DRAFT');
 const data=packBuffers(draft.parts);
 const gltf={asset:{version:'2.0',generator:'AIG-4.7-original-local-technical-geometry'},
  scene:0,scenes:[{nodes:[0,1]}],nodes:data.nodes,meshes:data.meshes,
  materials:data.materials,buffers:[{byteLength:data.bin.length}],
  bufferViews:data.views,accessors:data.accessors,
  extras:{schema:AIG47_SCHEMA,originalSourceSHA256:draft.sourceSHA256,
   headNeckOneSharedIndexSurface:true,rigged:false,uvMapped:false,
   originalFaceFromPhotoVerified:false,realPonytailCollisionProven:false,
   validForFormalCharacterRelease:false}};
 const raw=new TextEncoder().encode(JSON.stringify(gltf));
 const jlen=align4(raw.length),blen=data.bin.byteLength,size=12+8+jlen+8+blen;
 if(size>8*1024*1024)throw Error('AIG47_GLTF_SIZE_BUDGET');
 const glb=new ArrayBuffer(size),dv=new DataView(glb),bytes=new Uint8Array(glb);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,size,true);
 dv.setUint32(12,jlen,true);dv.setUint32(16,0x4e4f534a,true);
 bytes.set(raw,20);bytes.fill(0x20,20+raw.length,20+jlen);
 const bhead=20+jlen;dv.setUint32(bhead,blen,true);dv.setUint32(bhead+4,0x004e4942,true);
 bytes.set(data.bin,bhead+8);
 return {bytes:new Uint8Array(glb),json:gltf,container:'glb',
  originalSourceUnchanged:true,animationClips:0,skinnedMeshCount:0,
  fullHumanIdentityApproved:false,releaseAllowed:false};
}
