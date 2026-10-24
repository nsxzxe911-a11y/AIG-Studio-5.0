/**
 * V88: generic film-material texture channels. A user-verified per-VERTEX
 * UV sidecar is mandatory; never infer absent UV from a front photograph.
 * Uses standard tangent-space RGB normal maps with per-vertex tangents and
 * handedness computed from actual supplied Indexed XYZ + UVs. No new triangles.
 *
 * NO claim of true transparent refraction, cloth physics, hair strands,
 * subsurface scattering or physically-calibrated multilayer BSDF.
 */
export const AIG_REAL3D_V88_TEXTURE_SCHEMA=
 'AIG_REAL3D_V88_UV_TANGENT_NORMAL_CLEARCOAT_V1';
const fail=x=>{throw Error('REAL3D_V88_TEXTURE_'+x);};
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function checkedImage(image,label){
 if(!image||!Number.isInteger(image.width)||!Number.isInteger(image.height)||
  image.width<2||image.width>512||image.height<2||image.height>512||
  !Array.isArray(image.pixels)||image.pixels.length!==image.width*image.height*4||
  image.pixels.some(x=>!Number.isInteger(x)||x<0||x>255))
  fail('INVALID_'+label+'_RGBA_IMAGE');
 return {width:image.width,height:image.height,pixels:[...image.pixels]};
}
export function compileAIGReal3DTextureNodes({
 mesh,uvCoordinates,sourceSha256,uvSourceSha256,
 albedoImage,normalImage=null,normalStrength=1,clearcoat=0,
 uvManifestSourceSha256
}={}){
 if(!sha(sourceSha256)||!sha(uvSourceSha256)||
  uvManifestSourceSha256!==sourceSha256||
  !mesh?.actualXYZTriangles||
  !Array.isArray(mesh.positions)||!Array.isArray(mesh.normals)||
  !Array.isArray(mesh.indices)||!Array.isArray(uvCoordinates)||
  uvCoordinates.length!==mesh.vertexCount*2||
  uvCoordinates.some(x=>!finite(x)||x< -16||x>16)||
  !finite(normalStrength)||normalStrength<0||normalStrength>2||
  !finite(clearcoat)||clearcoat<0||clearcoat>1)
  fail('SOURCE_SHA_UV_OR_MATERIAL_INVALID');
 const albedo=checkedImage(albedoImage,'ALBEDO'),
  normal=normalImage?checkedImage(normalImage,'NORMAL'):null;
 if(normalStrength>0&&!normal)fail('NORMAL_MAP_REQUIRED_FOR_STRENGTH');
 const tangents=new Float64Array(mesh.vertexCount*3),
  bitangents=new Float64Array(mesh.vertexCount*3);
 let triangles=0;
 for(let i=0;i<mesh.indices.length;i+=3){
  const ids=mesh.indices.slice(i,i+3),
   [a,b,c]=ids,xyz=mesh.positions,uv=uvCoordinates;
  const p=ids.map(id=>xyz.slice(id*3,id*3+3)),
   st=ids.map(id=>uv.slice(id*2,id*2+2));
  const e1=p[1].map((x,k)=>x-p[0][k]),
   e2=p[2].map((x,k)=>x-p[0][k]),
   du1=st[1][0]-st[0][0],dv1=st[1][1]-st[0][1],
   du2=st[2][0]-st[0][0],dv2=st[2][1]-st[0][1],
   areaUV=du1*dv2-du2*dv1;
  if(Math.abs(areaUV)<1e-11)
   fail('SOURCE_UV_DEGENERATE_TRIANGLE_'+(i/3));
  const inv=1/areaUV,
   tangent=e1.map((x,k)=>(x*dv2-e2[k]*dv1)*inv),
   bitangent=e1.map((x,k)=>(e2[k]*du1-x*du2)*inv);
  for(const id of ids)for(let k=0;k<3;k++){
   tangents[id*3+k]+=tangent[k];
   bitangents[id*3+k]+=bitangent[k];
  }
  triangles++;
 }
 const four=[];
 for(let id=0;id<mesh.vertexCount;id++){
  const a=id*3,n=mesh.normals.slice(a,a+3),
   t=Array.from(tangents.slice(a,a+3)),
   projection=n.reduce((sum,x,k)=>sum+x*t[k],0),
   ortho=t.map((x,k)=>x-n[k]*projection);
  let length=Math.hypot(...ortho);
  if(length<1e-11)fail('TANGENT_NOT_DERIVABLE_'+id);
  const unit=ortho.map(x=>x/length),
   cross=[n[1]*unit[2]-n[2]*unit[1],
    n[2]*unit[0]-n[0]*unit[2],
    n[0]*unit[1]-n[1]*unit[0]],
   b=Array.from(bitangents.slice(a,a+3)),
   handedness=cross.reduce((sum,x,k)=>sum+x*b[k],0)<0?-1:1;
  four.push(...unit,handedness);
 }
 const mappedMesh={...mesh,
  originalSourceGeometryMesh:mesh,
  // Original positions/normals/indices are reused by REFERENCE.
  uvs:[...uvCoordinates],tangents:four,
  materialSourceUVSha256:uvSourceSha256};
 const material={
  schema:AIG_REAL3D_V88_TEXTURE_SCHEMA,
  sourceSha256,uvSourceSha256,
  albedoImage:albedo,normalImage:normal,
  normalStrength,clearcoat,
  trueTangentSpaceNormalBasis:true,
  originalIndexedTrianglesCount:triangles,
  actualUVMapAuthoredBySourceSidecar:true,
  sourceGeometryWasNotRebuilt:true,
  transparentRefractionVerified:false,
  hairOrClothPhysicalSimulationVerified:false
 };
 return {schema:AIG_REAL3D_V88_TEXTURE_SCHEMA,
  mappedMesh,material,
  originalIndexedTriangleCount:triangles,
  originalXYZPositionsAndFacesReferencedNotModified:
   mappedMesh.positions===mesh.positions&&mappedMesh.indices===mesh.indices,
  originalVertexAndTriangleCountPreserved:
   mappedMesh.vertexCount===mesh.vertexCount&&
   mappedMesh.triangleCount===mesh.triangleCount,
  sourceUvSha256:uvSourceSha256,
  independentlyAuthenticatedOriginalUVGeometry:false,
  fullFilmicPBRPhysicallyCertified:false};
}
export function applyAIGReal3DTextureNodes({
 scene,nodeId,mapped
}={}){
 if(scene?.schema!=='AIG_REAL3D_SCENE_V1'||
  typeof nodeId!=='string'||mapped?.schema!==AIG_REAL3D_V88_TEXTURE_SCHEMA||
  !scene.nodes.some(n=>n.id===nodeId))
  fail('WORKING_SCENE_SOURCE_NODE_INVALID');
 const base=scene.nodes.find(n=>n.id===nodeId);
 if(mapped.mappedMesh.positions!==base.mesh.positions||
  mapped.mappedMesh.indices!==base.mesh.indices)
  fail('SOURCE_MESH_REFERENCE_MISMATCH');
 return {...scene,revision:scene.revision+1,
  overlays:scene.overlays.slice(),
  nodes:scene.nodes.map(n=>n.id===nodeId?
   {...n,mesh:mapped.mappedMesh,material:{...n.material,
    aigTextureNodes:mapped.material}}:{...n})};
}
