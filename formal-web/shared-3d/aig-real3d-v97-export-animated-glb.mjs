/**
 * V97 original Indexed XYZ model + genuine sampled deformation as glTF 2.0 GLB.
 * Source V92 six-joint motion is BAKED TO GLTF MORPH TARGET WEIGHTS, NOT glTF
 * skeleton bones; explicit distinction prevents false rig interoperability.
 * Original identity and natural-photo fidelity are NOT certified.
 */
export const AIG_REAL3D_V97_GLB_SCHEMA='AIG_REAL3D_V97_NATIVE_ANIMATED_GLB_MORPH_V1';
const fail=s=>{throw Error('REAL3D_V97_GLB_'+s);};
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s);
const encoder=new TextEncoder();
export function exportAIGReal3DV97AnimatedGLB({
 candidate,sourceImageSha256,sampleTimes=[0,.5,1,1.5]
}={}){
 const sourceMesh=candidate?.mesh,rig=candidate?.rig;
 if(!sha(sourceImageSha256)||candidate?.originalSourceImageSha256!==sourceImageSha256||
  !sourceMesh?.actualXYZTriangles||
  typeof rig?.pose!=='function'||!Array.isArray(sampleTimes)||
  sampleTimes.length<3||sampleTimes.length>12||
  sampleTimes[0]!==0||
  sampleTimes.some((x,i)=>!Number.isFinite(x)||x<0||x>1.5||
   (i>0&&x<=sampleTimes[i-1])))
  fail('SOURCE_RIG_TIME_OR_IDENTITY_INVALID');
 const nodeId='bodyCandidate',initial=rig.pose(0).meshes?.[nodeId];
 if(!initial||!Array.isArray(initial.positions)||!Array.isArray(initial.normals)||
  initial.positions.length!==sourceMesh.vertexCount*3)
  fail('ACTUAL_INITIAL_SKINNED_XYZ_REQUIRED');
 const count=sourceMesh.vertexCount,index=sourceMesh.indices;
 const clips=sampleTimes.slice(1).map(time=>{
  const pose=rig.pose(time).meshes?.[nodeId];
  if(!pose||pose.positions.length!==initial.positions.length||
   pose.indices.length!==index.length||
   pose.indices.some((x,i)=>x!==index[i]))
   fail('ORIGINAL_TRIANGLE_IDS_MUST_REMAIN');
  return Float32Array.from(pose.positions,(x,i)=>x-initial.positions[i]);
 });
 const end=sampleTimes.length-1,weights=[];
 for(let t=0;t<sampleTimes.length;t++){
  const w=new Array(end).fill(0);
  if(t>0)w[t-1]=1;
  weights.push(...w);
 }
 const layouts=[],views=[],accessors=[],chunks=[];let binarySize=0;
 function add(bytes,target=null){
  while(binarySize%4){chunks.push(new Uint8Array([0]));binarySize++;}
  const offset=binarySize,arr=new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  chunks.push(arr);binarySize+=arr.length;
  const index=views.length,view={buffer:0,byteOffset:offset,byteLength:arr.byteLength};
  if(target!==null)view.target=target;
  views.push(view);return index;
 }
 function accessor({data,componentType,type,count,min,max,target}){
  const view=add(data,target);
  const a={bufferView:view,byteOffset:0,componentType,type,count};
  if(min)a.min=min;if(max)a.max=max;
  const id=accessors.length;accessors.push(a);return id;
 }
 const positions=Float32Array.from(initial.positions),
  normals=Float32Array.from(initial.normals),
  useUint32=count>65535,indexTyped=useUint32?
   Uint32Array.from(index):Uint16Array.from(index);
 const baseMin=[Infinity,Infinity,Infinity],baseMax=[-Infinity,-Infinity,-Infinity];
 for(let v=0;v<count;v++)for(let k=0;k<3;k++){
  const a=positions[v*3+k];baseMin[k]=Math.min(baseMin[k],a);
  baseMax[k]=Math.max(baseMax[k],a);
 }
 if(![...positions,...normals].every(Number.isFinite))
  fail('NONFINITE_SOURCE_GEOMETRY');
 const idxAccess=accessor({data:indexTyped,componentType:useUint32?5125:5123,
  type:'SCALAR',count:index.length,target:34963}),
  posAccess=accessor({data:positions,componentType:5126,
   type:'VEC3',count,min:baseMin,max:baseMax,target:34962}),
  normalAccess=accessor({data:normals,componentType:5126,
   type:'VEC3',count,target:34962}),
  targets=clips.map(data=>({POSITION:accessor({data,componentType:5126,
   type:'VEC3',count,target:34962})}));
 const timeAccess=accessor({data:Float32Array.from(sampleTimes),componentType:5126,
  type:'SCALAR',count:sampleTimes.length,min:[0],max:[sampleTimes.at(-1)]}),
  weightAccess=accessor({data:Float32Array.from(weights),componentType:5126,
   type:'SCALAR',count:weights.length});
 const gltf={asset:{version:'2.0',generator:'AIG Real3D V97 Actual Indexed XYZ Morph Exporter'},
  scene:0,scenes:[{nodes:[0]}],nodes:[{name:'V97_UNVERIFIED_ORIGINAL_HEROINE_CANDIDATE',
   mesh:0}],buffers:[{byteLength:0}],bufferViews:views,accessors,
  materials:[{name:'PROVISIONAL_SURFACE_NOT_PHYSICALLY_VERIFIED',
   pbrMetallicRoughness:{baseColorFactor:[.43,.58,.8,1],
    metallicFactor:.16,roughnessFactor:.62},doubleSided:true}],
  meshes:[{name:'SOURCE_IMAGE_INFERRED_3D_TRIANGLES',
   weights:new Array(end).fill(0),
   primitives:[{attributes:{POSITION:posAccess,NORMAL:normalAccess},
    indices:idxAccess,material:0,mode:4,targets}]}],
  animations:[{name:'ACTUAL_3D_SKIN_MOTION_BAKED_AS_MORPH',
   samplers:[{input:timeAccess,output:weightAccess,interpolation:'LINEAR'}],
   channels:[{sampler:0,target:{node:0,path:'weights'}}]}],
  extras:{aigSchema:AIG_REAL3D_V97_GLB_SCHEMA,originalPhotoSHA256:sourceImageSha256,
   headSourceContourDerived:true,bodyBackAndHairAreNotScanned:true,
   sourceIdentityFaceStillBlocked:true,motionSource:'V92_6_JOINT_SAMPLED_TO_GLTF_MORPH',
   nativeGlTFBones:false,glTFMaterialPhysicalValidation:false,
   real4KFilmEncoded:false,releasePASS:false}};
 const bufferBytes=new Uint8Array(binarySize);let at=0;
 for(const c of chunks){bufferBytes.set(c,at);at+=c.length;}
 gltf.buffers[0].byteLength=bufferBytes.length;
 const json=encoder.encode(JSON.stringify(gltf)),jsonPad=(4-json.length%4)%4;
 const binPad=(4-bufferBytes.length%4)%4;
 const chunkJSONLen=json.length+jsonPad,chunkBINLen=bufferBytes.length+binPad;
 const total=12+8+chunkJSONLen+8+chunkBINLen,
  glb=new Uint8Array(total),dv=new DataView(glb.buffer);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);
 dv.setUint32(8,total,true);
 dv.setUint32(12,chunkJSONLen,true);dv.setUint32(16,0x4e4f534a,true);
 glb.set(json,20);glb.fill(0x20,20+json.length,20+chunkJSONLen);
 const startBIN=20+chunkJSONLen;
 dv.setUint32(startBIN,chunkBINLen,true);dv.setUint32(startBIN+4,0x004e4942,true);
 glb.set(bufferBytes,startBIN+8);
 if(glb.length!==total||!Number.isSafeInteger(total)||total>90_000_000)
  fail('SOURCE_BINARY_BUDGET_OR_GLB_LAYOUT_INVALID');
 return {schema:AIG_REAL3D_V97_GLB_SCHEMA,bytes:glb,
  fileType:'model/gltf-binary',vertexCount:count,
  indexedTriangles:index.length/3,
  actualMoving3DMorphTargets:targets.length,actualAnimatedFramesSampled:sampleTimes.length,
  sourceImageSha256,sourceMeshNeverModified:true,
  glTFOriginalBoneRigIncluded:false,
  glTFMorphAnimationActuallyIncluded:true,
  importedAnimationVerifiedInThirdPartyViewer:false,
  sourceHeroineIdentityVerified:false,
  trueHumanPhotoReconstructionCertified:false,
  certifiedMovieReady:false,releasePASS:false};
}
