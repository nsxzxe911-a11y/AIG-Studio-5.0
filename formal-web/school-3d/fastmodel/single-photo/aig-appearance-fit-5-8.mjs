/** AIG 5.8: deterministic face/garment/hair mesh fit + pose-sampled real
 * triangle contact evidence. Preserves the existing 5.6 rig, 5.7 five clips,
 * real 3D vertices and full source SHA. No original-photo landmark inference.
 */
import {AnimationMixer,Vector3} from 'three';
import {generateAIG57SchoolHeroineTechnical,AIG57_PARTS} from './aig-native-appearance-5-7.mjs';
import {intersectMeshTriangles} from './aig-seam-contact-5-1.mjs';

export const AIG58_SCHEMA='AIG_FASTMODEL_5_8_POSED_GARMENT_HAIR_CONTACT_TECHNICAL';
const finite=Number.isFinite;
const align4=n=>(n+3)&~3;
function unpack(input){
 const b=input instanceof Uint8Array?input:new Uint8Array(input);
 if(b.length<40||b.length>8*1024*1024)throw Error('AIG58_BINARY_BUDGET');
 const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||
    v.getUint32(8,true)!==b.length||v.getUint32(16,true)!==0x4e4f534a)
  throw Error('AIG58_GLB_HEADER');
 const jsonLen=v.getUint32(12,true),binaryHeader=20+jsonLen;
 if(jsonLen>2*1024*1024||binaryHeader+8>b.length||
    v.getUint32(binaryHeader+4,true)!==0x004e4942)throw Error('AIG58_GLB_CHUNKS');
 const json=JSON.parse(new TextDecoder().decode(b.subarray(20,20+jsonLen)));
 const binLength=v.getUint32(binaryHeader,true);
 if(binaryHeader+8+binLength!==b.length)throw Error('AIG58_GLB_BIN_SIZE');
 return {json,bin:b.slice(binaryHeader+8)};
}
function repack(json,bin){
 json.buffers=[{byteLength:bin.length}];
 const source=new TextEncoder().encode(JSON.stringify(json)),size=align4(source.length);
 const output=new Uint8Array(12+8+size+8+bin.length);
 const view=new DataView(output.buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);
 view.setUint32(8,output.length,true);view.setUint32(12,size,true);
 view.setUint32(16,0x4e4f534a,true);
 output.set(source,20);output.fill(32,20+source.length,20+size);
 const pos=20+size;
 view.setUint32(pos,bin.length,true);view.setUint32(pos+4,0x004e4942,true);
 output.set(bin,pos+8);
 return output;
}
function geometryAccessor(json,bin,meshName){
 const mesh=json.meshes.find(m=>m.name===meshName);
 if(!mesh||mesh.primitives?.length!==1)throw Error('AIG58_MESH_NOT_FOUND_'+meshName);
 const primitive=mesh.primitives[0],position=json.accessors[primitive.attributes.POSITION],
  normal=json.accessors[primitive.attributes.NORMAL],
  idx=json.accessors[primitive.indices];
 if(position.type!=='VEC3'||normal.type!=='VEC3'||
  position.componentType!==5126||normal.componentType!==5126||
  idx.componentType!==5125||idx.type!=='SCALAR')throw Error('AIG58_ACCESSOR_TYPE');
 function info(acc){
  const v=json.bufferViews[acc.bufferView],offset=v.byteOffset||0;
  if(v.byteStride||acc.byteOffset||offset%4||
     offset+v.byteLength>bin.byteLength)throw Error('AIG58_INTERLEAVED_OR_UNALIGNED');
  return {offset,count:acc.count,accessor:acc};
 }
 const p=info(position),n=info(normal),t=info(idx);
 if(p.count!==n.count||p.count>12000||t.count>24000*3)throw Error('AIG58_VERTEX_TRIANGLE_BUDGET');
 const data=new DataView(bin.buffer,bin.byteOffset,bin.byteLength);
 const values=Array.from({length:p.count},(_,i)=>[0,1,2].map(k=>
  data.getFloat32(p.offset+(i*3+k)*4,true)));
 const triangles=Array.from({length:t.count},(_,i)=>data.getUint32(t.offset+i*4,true));
 if(values.some(v=>v.some(x=>!finite(x)))||triangles.some(i=>i>=p.count))
  throw Error('AIG58_INDEX_OR_VERTEX_INVALID');
 return {values,triangles,write(){
  let lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  const normals=Array.from({length:p.count},()=>[0,0,0]);
  for(let i=0;i<triangles.length;i+=3){
   const [a,b,c]=triangles.slice(i,i+3),v=values[a],w=values[b],z=values[c];
   const x=w.map((t,k)=>t-v[k]),y=z.map((t,k)=>t-v[k]);
   const face=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
   if(Math.hypot(...face)<1e-10)throw Error('AIG58_COLLAPSED_TRIANGLE_AFTER_FIT');
   for(const node of [a,b,c])for(let k=0;k<3;k++)normals[node][k]+=face[k];
  }
  for(let i=0;i<values.length;i++){
   const v=values[i],normal=normals[i],l=Math.hypot(...normal);
   if(!l||v.some(x=>!finite(x)))throw Error('AIG58_NONFINITE_OR_ZERO_NORMAL');
   for(let k=0;k<3;k++){
    data.setFloat32(p.offset+(i*3+k)*4,v[k],true);
    data.setFloat32(n.offset+(i*3+k)*4,normal[k]/l,true);
    lo[k]=Math.min(lo[k],v[k]);hi[k]=Math.max(hi[k],v[k]);
   }
  }
  position.min=lo;position.max=hi;
 }};
}
/** Proven geometric changes: wider skirt except near waistband, back-swept
 * ponytail lower strands and slight eye symmetry corrections. Proportions
 * are programmatic preferences, NOT measurements from the user's face photo.
 */
export function generateAIG58FittedTechnical(scaffold,{skirtExpansion=1.16,
 hairBackClearance=.046}={}){
 if(!finite(skirtExpansion)||skirtExpansion<1.04||skirtExpansion>1.35||
  !finite(hairBackClearance)||hairBackClearance<.015||hairBackClearance>.12)
  throw Error('AIG58_FIT_POLICY_BOUNDS');
 const original=generateAIG57SchoolHeroineTechnical(scaffold);
 const {json,bin}=unpack(original.bytes);
 if(json.asset?.generator!=='AIG FastModel 5.7 self-authored 3D school uniform and face technical prototype'||
  json.animations?.length!==5||json.meshes?.length!==9)
  throw Error('AIG58_NATIVE57_SKIN_AND_ANIMATION_REQUIRED');
 const garment=geometryAccessor(json,bin,AIG57_PARTS[3]);
 let adjustedSkirtVertices=0;
 for(const v of garment.values){
  // Keep waistband anchored to the hips. Expand the fabric progressively
  // below it so the legs can move without immediate skirt intersection.
  const w=Math.max(0,Math.min(1,(1.12-v[1])/.32));
  const factor=1+(skirtExpansion-1)*w;
  v[0]*=factor;v[2]*=factor;
  if(w>.01)adjustedSkirtVertices++;
 }
 garment.write();
 const hair=geometryAccessor(json,bin,AIG57_PARTS[6]);
 let adjustedHairVertices=0;
 for(const v of hair.values){
  const follow=Math.max(0,Math.min(1,(1.95-v[1])/.35));
  if(follow>0){
   v[2]+=hairBackClearance*follow;
   adjustedHairVertices++;
  }
 }
 hair.write();
 json.asset.generator='AIG FastModel 5.8 native procedural skirt clearance + keyframe ponytail fit';
 json.extras={...json.extras,schema:AIG58_SCHEMA,
  previous57SourceSHA256:original.sourceImageSHA256,
  original56FullbodyIndexedTopologyPreserved:true,
  original57FiveClipsPreserved:true,skirtExpansion,hairBackClearance,
  sourceFaceLandmarksPreciselyMatched:false,
  independentAnimatedClothPhysics:false,
  independentPonytailPhysics:false,
  geometricIntersectionsHaveNotBeenCertified:false,
  visualAuthorityAccepted:false,nativeDevice60FPSVerified:false,releaseAllowed:false};
 return {schema:AIG58_SCHEMA,bytes:repack(json,bin),
  sourceImageSHA256:original.sourceImageSHA256,
  skirtExpansion,hairBackClearance,adjustedSkirtVertices,adjustedHairVertices,
  skinnedMeshCount:9,animationClipCount:5,
  actualSourceFaceLandmarksMatched:false,
  originalFacialIdentityReconstructed:false,
  independentHairAndFabricPhysics:false,
  zeroCollisionGuaranteed:false,releaseAllowed:false};
}
const bounds=points=>({
 min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),
 max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))
});
function posedFaces(mesh,{maxVertices=14000,maxTriangles=26000}={}){
 if(!mesh?.isSkinnedMesh||!mesh.geometry?.index)
  throw Error('AIG58_SKINNED_TRIANGLE_MESH_REQUIRED');
 const n=mesh.geometry.getAttribute('position').count,ix=mesh.geometry.index;
 if(n<3||n>maxVertices||ix.count%3||ix.count/3>maxTriangles)
  throw Error('AIG58_GEOMETRY_BUDGET');
 const vec=new Vector3(),vertices=[];
 for(let i=0;i<n;i++){
  mesh.getVertexPosition(i,vec);vec.applyMatrix4(mesh.matrixWorld);
  const p=[vec.x,vec.y,vec.z];
  if(!p.every(finite))throw Error('AIG58_POSE_NONFINITE');
  vertices.push(p);
 }
 const faces=[];
 for(let i=0;i<ix.count;i+=3){
  const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];
  if(new Set(ids).size!==3||ids.some(x=>x>=n||x<0))
   throw Error('AIG58_TRIANGLE_INDEX');
  const t=ids.map(j=>vertices[j]);
  const ab=t[1].map((v,k)=>v-t[0][k]),ac=t[2].map((v,k)=>v-t[0][k]);
  const area=Math.hypot(
   ab[1]*ac[2]-ab[2]*ac[1],
   ab[2]*ac[0]-ab[0]*ac[2],
   ab[0]*ac[1]-ab[1]*ac[0])/2;
  if(area<1e-10)throw Error('AIG58_COLLAPSED_POSE_TRIANGLE');
  faces.push({vertices:t,box:bounds(t),face:i/3});
 }
 return faces;
}
export async function auditAIG58RealPoseContacts(gltf,{
 sourceSHA256,maxClips=5,sampleFractions=[0,.25,.5,.75,1]
}={}){
 if(!/^[0-9a-f]{64}$/i.test(sourceSHA256||'')||
  !gltf?.scene?.traverse||!Array.isArray(gltf.animations)||
  gltf.animations.length!==5||!Number.isInteger(maxClips)||
  maxClips<1||maxClips>5||sampleFractions.length!==5||
  sampleFractions.some((x,i)=>!finite(x)||x<0||x>1||(i&&x<=sampleFractions[i-1])))
  throw Error('AIG58_GLTF_SOURCE_OR_SAMPLES_INVALID');
 const meshes={};
 gltf.scene.traverse(n=>{if(n.isSkinnedMesh)meshes[n.name]=n;});
 const body=Object.values(meshes).find(n=>/AIG56_NATIVE_FULLBODY/.test(n.name));
 const skirt=meshes[AIG57_PARTS[3]],strands=meshes[AIG57_PARTS[6]];
 if(!body||!skirt||!strands)throw Error('AIG58_REQUIRED_REAL_MESHES_MISSING');
 const mixer=new AnimationMixer(gltf.scene),clips=[];
 let skirtContacts=0,hairContacts=0,totalPairTests=0;
 try{
  for(const clip of gltf.animations.slice(0,maxClips)){
   mixer.stopAllAction();const action=mixer.clipAction(clip);action.reset().play();
   const samples=[];
   for(const f of sampleFractions){
    mixer.setTime(clip.duration*f);gltf.scene.updateMatrixWorld(true);
    for(const m of [body,skirt,strands])m.skeleton.update();
    const bodyTriangles=posedFaces(body),skirtTriangles=posedFaces(skirt),
     hairTriangles=posedFaces(strands);
    const skirtResult=intersectMeshTriangles(bodyTriangles,skirtTriangles),
      hairResult=intersectMeshTriangles(bodyTriangles,hairTriangles);
    skirtContacts+=skirtResult.confirmedSurfaceContactPairs;
    hairContacts+=hairResult.confirmedSurfaceContactPairs;
    totalPairTests+=skirtResult.exactTrianglePairs+hairResult.exactTrianglePairs;
    samples.push({fraction:f,timeSeconds:clip.duration*f,
     skirtBodyTriangleContacts:skirtResult.confirmedSurfaceContactPairs,
     hairBodyTriangleContacts:hairResult.confirmedSurfaceContactPairs,
     skirtCandidatePairs:skirtResult.broadPhaseCandidates,
     hairCandidatePairs:hairResult.broadPhaseCandidates,
     examples:{skirt:skirtResult.examples,hair:hairResult.examples}});
   }
   action.stop();clips.push({name:clip.name,samples});
  }
 }finally{mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);}
 return {schema:AIG58_SCHEMA,sourceSHA256,clips,posesChecked:clips.length*5,
  skirtBodyConfirmedTriangleContacts:skirtContacts,
  hairBodyConfirmedTriangleContacts:hairContacts,
  exactTrianglePairsTested:totalPairTests,
  sampledBodyGarmentAndHairContactFree:skirtContacts===0&&hairContacts===0,
  outcome:skirtContacts===0&&hairContacts===0?
   'DISCRETE_TRIANGLE_SURFACE_QA_PASS_ONLY':'CONTACT_RISK_BLOCKED',
  continuousTimeContactFreeProven:false,faceIdentityPhotoMatched:false,
  skirtSelfIntersectionsExcluded:false,individualStrandSelfCollisionVerified:false,
  actualFabricAndHairDynamicsVerified:false,androidWindows60FPSVerified:false,
  visualAuthorityApproved:false,releaseAllowed:false};
}
