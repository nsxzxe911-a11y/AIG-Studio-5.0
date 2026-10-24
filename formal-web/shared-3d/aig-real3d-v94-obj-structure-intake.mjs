/**
 * V94 native OBJ file structure intake. No procedural geometry, SDF,
 * subdivision, template morph, inferred back or invented UV. Each original
 * 'g' face group is a source component label, NOT an inferred solid part.
 * Triangles remain the source fan triangulation of original f polygons.
 */
import {createAIG3DMesh,createAIG3DScene,addAIG3DNode}
 from './aig-real3d-core.mjs';
export const AIG_REAL3D_V94_OBJ_INTAKE_SCHEMA='AIG_REAL3D_V94_ORIGINAL_OBJ_GROUP_STRUCTURE_V1';
const fail=x=>{throw Error('REAL3D_V94_OBJ_'+x);};
const sha=s=>typeof s==='string'&&/^[0-9a-f]{64}$/i.test(s);
const vi=(raw,count)=>{
 if(!/^-?[0-9]+$/.test(raw))fail('INVALID_FACE_VERTEX_TOKEN');
 const num=Number(raw),id=num<0?count+num: num-1;
 if(!Number.isSafeInteger(id)||num===0||id<0||id>=count)
  fail('SOURCE_VERTEX_REFERENCE_OUT_OF_RANGE');
 return id;
};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function loadAIGReal3DOriginalOBJStructure({
 objText,sourceSha256,verifiedFileSha256,sourceUnits='METERS'
}={}){
 if(typeof objText!=='string'||objText.length<32||objText.length>15_000_000||
  !sha(sourceSha256)||verifiedFileSha256!==sourceSha256||
  !['MM','METERS'].includes(sourceUnits))
  fail('RAW_FILE_BYTES_SHA_UNITS_REQUIRED');
 const lines=objText.split(/\r?\n/);
 if(lines.length>350000)fail('SOURCE_LINE_BUDGET');
 const vertices=[],groups=[],byName=new Map();
 let current=null,totalFaces=0,hasUV=false,hasNormal=false,unknownMTL=0;
 function group(name){
  if(!byName.has(name)){
   if(groups.length>=32)fail('SOURCE_COMPONENT_GROUP_COUNT_BUDGET');
   const entry={name,faces:[]};
   byName.set(name,entry);groups.push(entry);
  }
  current=byName.get(name);
 }
 group('unnamed');
 for(const line of lines){
  const s=line.trim();if(!s||s[0]==='#')continue;
  const t=s.split(/\s+/),key=t[0];
  if(key==='v'){
   if(t.length<4||t.length>5)fail('INVALID_ORIGINAL_OBJ_XYZ');
   const p=t.slice(1,4).map(Number);
   if(p.some(x=>!Number.isFinite(x)||Math.abs(x)>1e7))
    fail('SOURCE_VERTEX_NONFINITE_OR_OUT_OF_RANGE');
   vertices.push(p);if(vertices.length>120000)fail('VERTEX_MEMORY_BUDGET');
  }else if(key==='g'||key==='o'){
   const name=t.slice(1).join('_').slice(0,60)||'unnamed';
   group(name);
  }else if(key==='f'){
   if(t.length<4||t.length>65)fail('INVALID_SOURCE_FACE');
   const ids=t.slice(1).map(x=>{
    const tokens=x.split('/');
    if(tokens.length>3)fail('FACE_TOKEN_INVALID');
    if(tokens.length>1&&tokens[1])hasUV=true;
    if(tokens.length>2&&tokens[2])hasNormal=true;
    return vi(tokens[0],vertices.length);
   });
   if(new Set(ids).size!==ids.length)fail('DUPLICATED_SOURCE_FACE_VERTEX');
   for(let j=1;j+1<ids.length;j++){
    current.faces.push(ids[0],ids[j],ids[j+1]);totalFaces++;
    if(totalFaces>80000)fail('SOURCE_TRIANGLE_MEMORY_BUDGET');
   }
  }else if(key==='usemtl'||key==='mtllib'){
   unknownMTL++;
  }
 }
 if(vertices.length<4||totalFaces<2)fail('SOURCE_3D_FACES_REQUIRED');
 const scene=createAIG3DScene({id:'v94NativeOriginalOBJ',
  consumer:'FastModel',units:sourceUnits,
  source:'ORIGINAL_LOCAL_FILE_HASH_VERIFIED_BYTES_NONAUTHENTICATED_GEOMETRY'});
 const parts=[],sourceGroups=[];
 for(const grp of groups.filter(g=>g.faces.length)){
  const used=new Map(),positions=[],normals=[],indices=[],globalSourceIds=[];
  for(const orig of grp.faces){
   let local=used.get(orig);
   if(local===undefined){
    local=positions.length/3;used.set(orig,local);
    positions.push(...vertices[orig]);normals.push(0,0,0);
    globalSourceIds.push(orig);
   }
   indices.push(local);
  }
  if(positions.length/3>65000)fail('SOURCE_GROUP_GPU_VERTEX_BUDGET');
  for(let k=0;k<indices.length;k+=3){
   const a=indices[k]*3,b=indices[k+1]*3,c=indices[k+2]*3,
    ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],
    uz=positions[b+2]-positions[a+2],
    vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],
    vz=positions[c+2]-positions[a+2],
    [nx,ny,nz]=cross([ux,uy,uz],[vx,vy,vz]);
   if(Math.hypot(nx,ny,nz)<1e-12)
    fail('SOURCE_DEGENERATE_GEOMETRY_CANNOT_BE_HIDDEN');
   for(const id of indices.slice(k,k+3))for(let j=0;j<3;j++)
    normals[id*3+j]+=[nx,ny,nz][j];
  }
  for(let k=0;k<normals.length;k+=3){
   const l=Math.hypot(normals[k],normals[k+1],normals[k+2]);
   if(l<1e-10)fail('INVALID_AVERAGED_SOURCE_NORMAL');
   normals[k]/=l;normals[k+1]/=l;normals[k+2]/=l;
  }
  const mesh=createAIG3DMesh({
   positions,normals,indices,provenance:'V94_UNAUTHENTICATED_LOCAL_ORIGINAL_OBJ_SHA_'+sourceSha256
  });
  const id='originalGroup'+(parts.length+1);
  const node=addAIG3DNode(scene,{id,mesh,kind:'object',
   source:'ORIGINAL_OBJ_GROUP_FACE_TRIANGULATION_NO_AUTO_STRUCTURE',
   material:{baseColor:[.67,.75,.84,1],metallic:0,roughness:.8,doubleSided:true}});
  node.sourceGlobalVertexIds=globalSourceIds;
  parts.push({id:'component'+parts.length,nodeId:id,
   parentPartId:null,role:'OTHER',closedSurfaceRequired:false});
  sourceGroups.push({groupLabel:grp.name,sourceNodeId:id,
   originalFaces:grp.faces.length/3,globalSourceVertexIndices:globalSourceIds.length});
 }
 if(!parts.length)fail('ALL_OBJ_GROUPS_EMPTY');
 return {schema:AIG_REAL3D_V94_OBJ_INTAKE_SCHEMA,
  sourceSha256,scene,parts,groups:sourceGroups,
  originalTriangleCount:totalFaces,
  displayedTriangleCount:scene.nodes.reduce((n,node)=>n+node.mesh.triangleCount,0),
  sourceFileVertices:vertices.length,
  originalTriangleCountPreserved:true,
  sourceFileHasUVTokens:hasUV,sourceUVCoordinatesLoaded:false,
  sourceFileHasNormalTokens:hasNormal,
  normalsComputedFromOriginalSourceFaceWinding:true,
  materialLibraryEntriesIgnoredUntilExplicitVerification:unknownMTL,
  sourceFileBytesSHAValidatedByCaller:true,
  independentlyValidatedGeometryOrAuthorship:false,
  missingSourceBackNeverInvented:true,releasePASS:false};
}
