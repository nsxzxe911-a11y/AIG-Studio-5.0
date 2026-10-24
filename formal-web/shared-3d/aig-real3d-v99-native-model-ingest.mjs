/**
 * V99: use REAL high-detail GLB meshes from a locally executed, approved AI
 * model or authorized scan as a geometry source. Do not create dummy humanoids.
 * Strictly parse source POSITION/NORMAL/index buffers and hash BOTH image
 * and generated GLB bytes. No inferred missing geometry is manufactured.
 * Compressed, sparse, external and skin-transformed assets BLOCK until supported.
 */
import {createAIG3DMesh,createAIG3DScene,addAIG3DNode}
 from './aig-real3d-core.mjs';
export const AIG_REAL3D_V99_IMPORT_SCHEMA='AIG_REAL3D_V99_REAL_NATIVE_GENERATED_GLB_SOURCE_V1';
const fail=x=>{throw Error('REAL3D_V99_IMPORT_'+x);};
const isSHA=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const bytes=x=>x instanceof Uint8Array?x:
 x instanceof ArrayBuffer?new Uint8Array(x):null;
const finite=Number.isFinite;
export async function sha256AIGReal3DBytes(raw){
 const buffer=bytes(raw);
 if(!buffer||buffer.byteLength<1||!globalThis.crypto?.subtle)
  fail('ACTUAL_BINARY_AND_SHA_ENGINE_REQUIRED');
 return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest(
  'SHA-256',buffer)),x=>x.toString(16).padStart(2,'0')).join('');
}
function parseGLB(data){
 const b=bytes(data);
 if(!b||b.length<128||b.length>35_000_000)fail('REAL_GLB_BYTE_LIMIT');
 const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||
  v.getUint32(8,true)!==b.length)fail('REAL_GLB2_HEADER_INVALID');
 let offset=12,gltf=null,bin=null;
 while(offset+8<=b.length){
  const size=v.getUint32(offset,true),type=v.getUint32(offset+4,true);
  if(size%4!==0||offset+8+size>b.length)fail('GLB_CHUNK_OUT_OF_BOUNDS');
  const chunk=b.subarray(offset+8,offset+8+size);
  if(type===0x4e4f534a){
   if(gltf)fail('DUPLICATE_GLTF_JSON');
   try{gltf=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(chunk).trim());}
   catch{fail('INVALID_GLTF_JSON');}
  }else if(type===0x004e4942){
   if(bin)fail('DUPLICATE_BIN_CHUNK');
   bin=chunk;
  }else fail('UNKNOWN_REQUIRED_GLB_CHUNK');
  offset+=size+8;
 }
 if(offset!==b.length||!gltf||!bin||gltf.asset?.version!=='2.0'||
  !Array.isArray(gltf.buffers)||gltf.buffers.length!==1||
  gltf.buffers[0].uri||gltf.buffers[0].byteLength>bin.length||
  !Array.isArray(gltf.bufferViews)||!Array.isArray(gltf.accessors)||
  !Array.isArray(gltf.meshes)||!gltf.meshes.length||
  gltf.meshes.length>12||gltf.extensionsRequired?.length||
  gltf.skins?.length)fail('GLTF_UNSUPPORTED_OR_EXTERNAL_BUFFER');
 if(gltf.nodes?.some(n=>n.skin!==undefined||
  n.matrix!==undefined||n.translation!==undefined||
  n.scale!==undefined||n.rotation!==undefined))
  fail('GLTF_NODE_TRANSFORMS_REQUIRE_EXPLICIT_IMPORT');
 function accessor(id,type,accepted){
  const a=gltf.accessors[id];
  if(!a||a.type!==type||!accepted.includes(a.componentType)||
   a.sparse||a.normalized||!Number.isInteger(a.byteOffset??0)||
   (a.byteOffset??0)% (a.componentType===5126||a.componentType===5125?4:2)!==0||
   !Number.isInteger(a.count)||a.count<1||
   a.count>120000||!Number.isInteger(a.bufferView))
   fail('UNSUPPORTED_NATIVE_ACCESSOR');
  const view=gltf.bufferViews[a.bufferView];
  if(!view||view.buffer!==0||view.byteStride||
   !Number.isInteger(view.byteOffset??0)||
   !Number.isInteger(view.byteLength)||view.byteLength<1)
   fail('STRIDED_OR_INVALID_BINARY_VIEW');
  const elems=({SCALAR:1,VEC2:2,VEC3:3,VEC4:4})[type],
   byteSize=a.componentType===5123?2:4,
   start=(view.byteOffset??0)+(a.byteOffset??0),
   end=start+a.count*elems*byteSize;
  if(start<0||end>(view.byteOffset??0)+view.byteLength||
   end>gltf.buffers[0].byteLength||
   start%byteSize!==0)fail('GLTF_ACCESSOR_RANGE_INVALID');
  const dv=new DataView(bin.buffer,bin.byteOffset+start,a.count*elems*byteSize);
  const output=[];
  for(let i=0;i<a.count*elems;i++){
   const k=i*byteSize;
   const n=a.componentType===5126?dv.getFloat32(k,true):
    a.componentType===5125?dv.getUint32(k,true):dv.getUint16(k,true);
   if(!finite(n))fail('GLTF_NONFINITE_SOURCE_COORDINATE');
   output.push(n);
  }
  return output;
 }
 return {gltf,accessor,bin};
}
function recomputeNormals(p,indices){
 const n=new Array(p.length).fill(0);
 for(let k=0;k<indices.length;k+=3){
  const [a,b,c]=indices.slice(k,k+3).map(x=>3*x);
  const ab=[0,1,2].map(i=>p[b+i]-p[a+i]),
   ac=[0,1,2].map(i=>p[c+i]-p[a+i]),
   face=[ab[1]*ac[2]-ab[2]*ac[1],
    ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
  if(Math.hypot(...face)<1e-12)fail('ORIGINAL_SOURCE_FACE_COLLAPSED');
  for(const offset of [a,b,c])for(let i=0;i<3;i++)n[offset+i]+=face[i];
 }
 for(let k=0;k<n.length;k+=3){
  let l=Math.hypot(n[k],n[k+1],n[k+2]);
  if(l<1e-12){n.splice(k,3,0,1,0);continue;}
  for(let j=0;j<3;j++)n[k+j]/=l;
 }
 return n;
}
function sourceTangents(positions,normals,uvs,indices){
 const count=positions.length/3,
  acc=Array.from({length:count*3},()=>0),
  tangents=new Array(count*4).fill(0);
 for(let f=0;f<indices.length;f+=3){
  const [a,b,c]=indices.slice(f,f+3);
  const du1=uvs[b*2]-uvs[a*2],dv1=uvs[b*2+1]-uvs[a*2+1],
   du2=uvs[c*2]-uvs[a*2],dv2=uvs[c*2+1]-uvs[a*2+1],
   det=du1*dv2-du2*dv1;
  if(Math.abs(det)<1e-12)continue;
  const ab=positions.slice(b*3,b*3+3).map((v,k)=>v-positions[a*3+k]),
   ac=positions.slice(c*3,c*3+3).map((v,k)=>v-positions[a*3+k]);
  for(let k=0;k<3;k++){
   const val=(ab[k]*dv2-ac[k]*dv1)/det;
   for(const idx of [a,b,c])acc[idx*3+k]+=val;
  }
 }
 for(let i=0;i<count;i++){
  const n=normals.slice(i*3,i*3+3),t=acc.slice(i*3,i*3+3);
  const proj=n.reduce((sum,v,k)=>sum+v*t[k],0),
   ortho=t.map((v,k)=>v-n[k]*proj),len=Math.hypot(...ortho);
  if(len<1e-10)return null;
  for(let j=0;j<3;j++)tangents[i*4+j]=ortho[j]/len;
  tangents[i*4+3]=1;
 }
 return tangents;
}
async function originalEmbeddedGLTFImage({gltf,bin,textureRef}){
 if(!textureRef)return null;
 if(!Number.isInteger(textureRef.index)||textureRef.texCoord!==undefined&&textureRef.texCoord!==0)
  fail('TEXTURE_REQUIRES_ORIGINAL_UV_0');
 const texture=gltf.textures?.[textureRef.index],
  image=gltf.images?.[texture?.source];
 if(!texture||!image||image.uri||!Number.isInteger(image.bufferView)||
  !['image/png','image/jpeg'].includes(image.mimeType))
  fail('EMBEDDED_GLTF_TEXTURE_SOURCE_REQUIRED');
 const view=gltf.bufferViews[image.bufferView],
  offset=view?.byteOffset??0,len=view?.byteLength;
 if(view?.buffer!==0||!Number.isInteger(offset)||offset<0||
  !Number.isInteger(len)||len<32||len>16_000_000||
  offset+len>bin.byteLength)fail('EMBEDDED_TEXTURE_VIEW_OUT_OF_RANGE');
 if(typeof createImageBitmap!=='function'||typeof document==='undefined')
  fail('EMBEDDED_TEXTURE_BROWSER_DECODE_REQUIRED');
 const bytes=bin.slice(offset,offset+len);
 const picture=await createImageBitmap(new Blob([bytes],{type:image.mimeType}));
 try{
  const width=picture.width,height=picture.height;
  if(width<2||height<2||width>2048||height>2048)
   fail('TEXTURE_DIMENSION_BUDGET_BLOCK');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)fail('EMBEDDED_TEXTURE_CANVAS_UNAVAILABLE');
  ctx.drawImage(picture,0,0,width,height);
  const raw=ctx.getImageData(0,0,width,height).data,
   pixels=new Array(raw.length);
  // Flip rows before byte upload because GLSL UVs are bottom-left.
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const dst=(y*width+x)*4,src=((height-1-y)*width+x)*4;
   for(let i=0;i<4;i++)pixels[dst+i]=raw[src+i];
  }
  const sampler=gltf.samplers?.[texture.sampler]??{};
  const wraps=[sampler.wrapS??10497,sampler.wrapT??10497];
  if(wraps.some(x=>![33071,10497,33648].includes(x)))
   fail('ORIGINAL_GLTF_TEXTURE_SAMPLER_UNSUPPORTED');
  // Portable on WebGL1: NPOT REPEAT requires an explicit BLOCK.
  if((width&(width-1)||height&(height-1))&&wraps.some(w=>w!==33071))
   fail('NPOT_TEXTURE_REPEAT_NEEDS_WEBGL2_OR_EXPLICIT_REPACK');
  return {width,height,pixels,wrapS:wraps[0],wrapT:wraps[1],
   originalEmbeddedImageMimeType:image.mimeType,
   originalSourceGLBEncodedBytesUnchanged:true};
 }finally{picture.close();}
}
function sourceMeshStats(mesh){
 const edges=new Map();
 let area=0,degenerate=0;
 const p=mesh.positions;
 for(let k=0;k<mesh.indices.length;k+=3){
  const ids=mesh.indices.slice(k,k+3);
  const a=ids.map(i=>p.slice(i*3,i*3+3));
  const u=a[1].map((v,i)=>v-a[0][i]),
   v=a[2].map((x,i)=>x-a[0][i]),
   cr=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],
    u[0]*v[1]-u[1]*v[0]],ar=Math.hypot(...cr)*.5;
  area+=ar;if(ar<1e-12)degenerate++;
  for(let j=0;j<3;j++){
   const from=ids[j],to=ids[(j+1)%3],
    key=Math.min(from,to)+':'+Math.max(from,to);
   edges.set(key,(edges.get(key)??0)+1);
  }
 }
 const open=[...edges.values()].filter(n=>n===1).length,
  nonmanifold=[...edges.values()].filter(n=>n>2).length;
 return {sourceOpenBoundaryEdges:open,nonManifoldEdges:nonmanifold,
  originalDegenerateFaces:degenerate,sourceSurfaceArea:area,
  sourceWatertight:open===0&&nonmanifold===0,
  sourceNaturalAnatomyCertified:false};
}
export async function ingestAIGReal3DNativeGeneratedGLB({
 glbBytes,referenceImageBytes,declaredImageSha256,
 declaredGLBSha256,domain='PERSON',assetId='Original3DAsset',
 outputOrigin='LOCAL_MODEL_OUTPUT',sourceUnits='METERS'
}={}){
 const input=bytes(referenceImageBytes),output=bytes(glbBytes);
 if(!input||input.length<32||input.length>12_000_000||
  !output||!isSHA(declaredImageSha256)||!isSHA(declaredGLBSha256)||
  !['PERSON','SHIP','ANIMAL','ENVIRONMENT','CNC_PART'].includes(domain)||
  !['LOCAL_MODEL_OUTPUT','AUTHORIZED_SOURCE_MESH','SCAN'].includes(outputOrigin)||
  !['METERS','MM'].includes(sourceUnits)||
  !/^[A-Za-z][A-Za-z0-9_-]{1,63}$/.test(assetId))
  fail('SOURCE_IMAGES_MESH_ID_AND_PROVENANCE_REQUIRED');
 const [actualImageSHA,actualGLBSHA]=await Promise.all([
  sha256AIGReal3DBytes(input),sha256AIGReal3DBytes(output)]);
 if(actualImageSHA!==declaredImageSha256||
  actualGLBSHA!==declaredGLBSha256)
  fail('IMAGE_AND_GENERATED_GLB_SHA_MUST_MATCH_BYTES');
 const {gltf,accessor,bin}=parseGLB(output);
 const scene=createAIG3DScene({id:'v99NativeOriginalSource',
  consumer:'FastModel',units:sourceUnits,
  source:'V99_VERIFIED_LOCAL_BINARY_3D_GLTF_NOT_VISUALLY_CERTIFIED'});
 const perMesh=[];
 for(const source of gltf.meshes){
  if(!Array.isArray(source.primitives)||!source.primitives.length||
   source.primitives.length>10)fail('UNSUPPORTED_MODEL_PRIMITIVE_GROUP');
  for(const primitive of source.primitives){
   if(primitive.mode!==undefined&&primitive.mode!==4||
    primitive.indices===undefined||primitive.attributes?.POSITION===undefined||
    primitive.extensions||primitive.targets?.length>12)
    fail('SOURCE_MESH_TRIANGLES_OR_EXTENSIONS_REQUIRED');
   const positions=accessor(primitive.attributes.POSITION,'VEC3',[5126]),
    indices=accessor(primitive.indices,'SCALAR',[5123,5125]);
   if(positions.length%3||indices.length%3||
    indices.some(i=>i<0||i>=positions.length/3))fail('INVALID_SOURCE_TRIANGLES');
   // Preserve exact actual source geometry; recomputed normals are shading,
   // NOT extra source vertices.
   const normals=primitive.attributes.NORMAL===undefined?
    recomputeNormals(positions,indices):
    accessor(primitive.attributes.NORMAL,'VEC3',[5126]);
   const original=createAIG3DMesh({positions,normals,indices,
    provenance:'V99_REAL_BINARY_GLB_'+actualGLBSHA});
   const hasUV=primitive.attributes.TEXCOORD_0!==undefined;
   if(hasUV){
    const uvs=accessor(primitive.attributes.TEXCOORD_0,'VEC2',[5126]);
    if(uvs.length!==original.vertexCount*2)
     fail('SOURCE_UV_VERTEX_COUNT_MISMATCH');
    const tangents=primitive.attributes.TANGENT!==undefined?
     accessor(primitive.attributes.TANGENT,'VEC4',[5126]):
     sourceTangents(positions,normals,uvs,indices);
    if(!tangents||tangents.length!==original.vertexCount*4)
     fail('UV_TANGENT_ORIENTATION_CANNOT_BE_VERIFIED');
    original.uvs=uvs;original.tangents=tangents;
   }
   // Preserve AI GLB authored material factors. Previously the loader
   // overwrote metallic/roughness and fabricated a blue default palette,
   // so even a valid source model could look different from its source.
   const material=gltf.materials?.[primitive.material]??{},
    pbr=material.pbrMetallicRoughness??{},
    baseColor=pbr.baseColorFactor??[1,1,1,1],
    sourceMetallic=pbr.metallicFactor??1,
    sourceRoughness=pbr.roughnessFactor??1,
    emissive=material.emissiveFactor??[0,0,0];
   if(!Array.isArray(baseColor)||baseColor.length!==4||
    !baseColor.every(x=>finite(x)&&x>=0&&x<=1)||
    !finite(sourceMetallic)||sourceMetallic<0||sourceMetallic>1||
    !finite(sourceRoughness)||sourceRoughness<0||sourceRoughness>1||
    !Array.isArray(emissive)||emissive.length!==3||
    !emissive.every(x=>finite(x)&&x>=0&&x<=1))
    fail('ORIGINAL_GLTF_MATERIAL_FACTORS_INVALID');
   // The current SDR diffuse/specular approximation has a lower bound
   // 0.04 on roughness, unlike glTF which allows zero. Keep the exact
   // original value in the source report; do not falsely call this PBR.
   const rendererRoughness=Math.max(.04,sourceRoughness);
   const albedoReference=pbr.baseColorTexture??null,
    normalReference=material.normalTexture??null;
   if((albedoReference||normalReference)&&!hasUV)
    fail('SOURCE_GLTF_TEXTURE_UV_REQUIRED');
   const [albedoImage,normalImage]=await Promise.all([
    originalEmbeddedGLTFImage({gltf,bin,textureRef:albedoReference}),
    originalEmbeddedGLTFImage({gltf,bin,textureRef:normalReference})]);
   const nodeId='sourceModel'+(perMesh.length+1);
   const node=addAIG3DNode(scene,{id:nodeId,mesh:original,
    kind:domain==='PERSON'||domain==='ANIMAL'?'character':
     domain==='ENVIRONMENT'?'environment':'object',
    source:'V99_FULL_REAL_SOURCE_TRIANGLES_NOT_PROCEDURAL_PROXY',
    material:{baseColor,metallic:sourceMetallic,roughness:rendererRoughness,
     emissive,doubleSided:material.doubleSided===true}});
   if(albedoImage||normalImage){
    node.material.aigTextureNodes={
     schema:'AIG_REAL3D_V88_UV_TANGENT_NORMAL_CLEARCOAT_V1',
     albedoImage,normalImage,normalStrength:normalReference?.scale??1,
     clearcoat:0};
   }
   perMesh.push({nodeId,originalVertexCount:original.vertexCount,
    originalTriangleCount:original.triangleCount,
    originalFaceIndicesRetained:true,
    materialSourceFactors:{baseColor:[...baseColor],
     metallic:sourceMetallic,roughness:sourceRoughness,emissive:[...emissive],
     doubleSided:material.doubleSided===true},
    rendererRoughnessClampedBelowPoint04:sourceRoughness<.04,
    sourceTextureOrVertexColorsPresent:Boolean(
     pbr.baseColorTexture||material.normalTexture||
     primitive.attributes.TEXCOORD_0!==undefined||
     primitive.attributes.COLOR_0!==undefined),
    originalUV0ActuallyImported:hasUV,
    sourceEmbeddedBaseColorDecoded:Boolean(albedoImage),
    sourceEmbeddedNormalDecoded:Boolean(normalImage),
    sourceSamplerWrapModesValidated:Boolean(albedoImage||normalImage),
    unsupportedMetallicRoughnessOrOcclusionTexturePresent:Boolean(
     pbr.metallicRoughnessTexture||material.occlusionTexture),
    textureAndVertexColorFidelityValidated:Boolean(albedoImage||normalImage)&&
     !pbr.metallicRoughnessTexture&&!material.occlusionTexture&&
     primitive.attributes.COLOR_0===undefined,
    materialMapValidation:false,
    ...sourceMeshStats(original)});
  }
 }
 const triangles=perMesh.reduce((s,m)=>s+m.originalTriangleCount,0);
 if(triangles<12||triangles>200000||
  scene.nodes.length>32)fail('GEOMETRY_OR_GPU_TRIANGLE_BUDGET_INVALID');
 return {schema:AIG_REAL3D_V99_IMPORT_SCHEMA,assetId,domain,scene,
  originalImageSha256:actualImageSHA,actualSourceModelSha256:actualGLBSHA,
  outputOrigin,sourceUnits,perMesh,
  nodeCount:scene.nodes.length,sourceTriangles:triangles,
  originalSourceMeshNeverChanged:true,
  trueBinaryGLBParsed:true,
  originallyInferredBackWasNotFabricated:true,
  actualLocalNeuralInferenceRunByThisMethod:false,
  modelAuthorshipIndependentlyVerified:false,
  ownerApprovedFaceIdentity:false,
  originalSourceVisualSimilarityMeasured:false,
  animationRigRetargeted:false,highQuality4KGeometryCertified:false,
  releasePASS:false};
}
