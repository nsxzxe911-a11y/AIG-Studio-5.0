/**
 * V86 — fur is a MATERIAL on the existing original 3D surface; a garment is
 * a SEPARATE original source OBJ node. Neither is a substitute for real hair
 * fiber geometry, naturally moving skin, a fitted garment or animal scans.
 */
import {createAIG3DMesh,addAIG3DNode} from './aig-real3d-core.mjs';
export const AIG_REAL3D_V86_LAYER_SCHEMA='AIG_REAL3D_V86_SEPARATE_FUR_AND_GARMENT_MATERIAL_V1';
export const AIG_REAL3D_V86_FUR_SCHEMA='AIG_REAL3D_V86_FUR_SURFACE_MATERIAL_V1';
const die=x=>{throw Error('REAL3D_MATERIAL_LAYER_'+x);};
const validSHA=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s);
const validRGB=a=>Array.isArray(a)&&a.length===3&&
 a.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1);
const options=Object.freeze({
 SKIN:{roughness:.72,strength:0,frequency:16},
 SHORT_COAT:{roughness:.84,strength:.7,frequency:120},
 DOUBLE_COAT:{roughness:.93,strength:.85,frequency:90},
 LONG_COAT:{roughness:.93,strength:.88,frequency:56}
});
/** Material does NOT create exterior hair strands. */
export function createAIGReal3DCoatMaterial({
 kind='DOUBLE_COAT',skinRGB=[.42,.31,.23],undercoatRGB=[.6,.47,.35],
 guardRGB=[.27,.18,.12],strength=null,frequency=null
}={}){
 if(!Object.hasOwn(options,kind)||!validRGB(skinRGB)||
  !validRGB(undercoatRGB)||!validRGB(guardRGB))die('COAT_PARAMETERS_INVALID');
 const p=options[kind],a=strength??p.strength,b=frequency??p.frequency;
 if(!Number.isFinite(a)||a<0||a>1||!Number.isFinite(b)||b<1||b>512)
  die('COAT_STRENGTH_FREQUENCY_INVALID');
 return {
  schema:AIG_REAL3D_V86_FUR_SCHEMA,
  kind,skinRGB:[...skinRGB],undercoatRGB:[...undercoatRGB],
  guardRGB:[...guardRGB],strength:a,frequency:b,
  roughness:p.roughness,
  materialLayerRoles:kind==='SKIN'?['SKIN']:['SKIN','UNDERCOAT','GUARD_HAIR_PIGMENT'],
  trueIndividualHairFibersGenerated:0,
  furLengthInMillimetersVerified:null,
  volumetricFurAndHairMotionVerified:false,
  originalSurfaceMeshUntouched:true
 };
}
/** A second optional clothing object must be supplied by the user as a real
 * original triangle mesh in the SAME registered world-METERS coordinates.
 * The garment is never inferred by copying/deforming the body. 
 */
export function buildAIGReal3DIndependentGarmentOBJ({
 objText,garmentSourceSha256,bodySourceSha256
}={}){
 if(!validSHA(garmentSourceSha256)||!validSHA(bodySourceSha256)||
  garmentSourceSha256===bodySourceSha256||
  typeof objText!=='string'||objText.length<35||
  objText.length>12_000_000)
  die('INDEPENDENT_GARMENT_SOURCE_REQUIRED');
 const pos=[],tri=[],normal=[],faceSourceLines=[];
 const lines=objText.split(/\r?\n/);
 for(let i=0;i<lines.length;i++){
  const s=lines[i].trim();
  if(!s||s.startsWith('#'))continue;
  const t=s.split(/\s+/);
  if(t[0]==='v'){
   if(t.length<4)die('GARMENT_VERTEX_COORDINATES');
   const xyz=t.slice(1,4).map(Number);
   if(xyz.some(x=>!Number.isFinite(x)||Math.abs(x)>10000))
    die('GARMENT_POSITION_NOT_FINITE_METERS');
   pos.push(...xyz);
   if(pos.length>150000)die('GARMENT_VERTEX_BUDGET');
  }else if(t[0]==='f'){
   if(t.length!==4)die('GARMENT_TRIANGLE_ONLY_SOURCE_REQUIRED');
   const ids=t.slice(1).map(x=>{
    const m=/^(\d+)(?:\/\d*)?(?:\/\d+)?$/.exec(x);
    if(!m)die('GARMENT_FACE_INDEX_SYNTAX');
    const n=Number(m[1])-1;
    if(!Number.isSafeInteger(n)||n<0||n>=pos.length/3)
     die('GARMENT_ORIGINAL_INDEX_OUT_OF_BOUNDS');
    return n;
   });
   if(new Set(ids).size!==3)die('GARMENT_DEGENERATE_INDEXED_FACE');
   tri.push(...ids);faceSourceLines.push(i+1);
   if(tri.length>150000)die('GARMENT_TRIANGLE_MEMORY_BUDGET');
  }else if(!['o','g','s','mtllib','usemtl','vn','vt'].includes(t[0]))
   die('GARMENT_UNSUPPORTED_OBJ_DIRECTIVE');
 }
 if(pos.length<9||tri.length<3)die('GARMENT_GEOMETRY_MISSING');
 // Normals are derived from original source triangles, never new geometry.
 const weight=Array(pos.length).fill(0);
 let area=0;
 for(let k=0;k<tri.length;k+=3){
  const [a,b,c]=tri.slice(k,k+3).map(x=>x*3);
  const ab=[0,1,2].map(d=>pos[b+d]-pos[a+d]),
   ac=[0,1,2].map(d=>pos[c+d]-pos[a+d]);
  const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],
   ab[0]*ac[1]-ab[1]*ac[0]];
  const len=Math.hypot(...n);
  if(len<1e-12)die('GARMENT_ZERO_AREA_TRIANGLE');
  area+=len/2;
  for(const v of [a,b,c])for(let d=0;d<3;d++)weight[v+d]+=n[d];
 }
 for(let v=0;v<weight.length;v+=3){
  const len=Math.hypot(weight[v],weight[v+1],weight[v+2]);
  const n=len>1e-12?weight.slice(v,v+3).map(x=>x/len):[0,1,0];
  normal.push(...n);
 }
 const mesh=createAIG3DMesh({
  positions:pos,normals:normal,indices:tri,
  provenance:'INDEPENDENT_GARMENT_OBJ_SHA_'+garmentSourceSha256
 });
 return {mesh,originalGarmentSha256:garmentSourceSha256,
  independentFromBodySha:true,
  triangleSourceLineNumbers:faceSourceLines,
  originalGarmentTriangleCount:mesh.triangleCount,
  originalGarmentVertexCount:mesh.vertexCount,
  originalGarmentSurfaceAreaSquareMeters:Math.round(area*1e6)/1e6,
  coordinatesClaimedSameWorldMetersFrame:true,
  garmentFitOrCollisionVerified:false,
  clothingFoldingAndClothSimulationVerified:false,
  generatedGarmentGeometryFromBody:0};
}
/** Returns a lightweight working scene: original meshes are shared by ref,
 * only MATERIAL on body nodes changes; garment remains a distinct source mesh.
 */
export function composeAIGReal3DFurClothScene({
 sourceScene,bodySourceSha256,coatMaterial,
 garments=[],garmentRGB=[.12,.27,.56]
}={}){
 if(sourceScene?.schema!=='AIG_REAL3D_SCENE_V1'||!validSHA(bodySourceSha256)||
  coatMaterial?.schema!==AIG_REAL3D_V86_FUR_SCHEMA||
  !validRGB(garmentRGB)||!Array.isArray(garments)||garments.length>4||
  sourceScene.nodes.length<1)die('SCENE_SOURCE_OR_LAYER_CONFIGURATION_INVALID');
 const originNodes=sourceScene.nodes.map(n=>({id:n.id,mesh:n.mesh,material:n.material}));
 const scene={...sourceScene,revision:sourceScene.revision+1,
  nodes:sourceScene.nodes.map(n=>({...n,material:{
   ...n.material,
   baseColor:[...coatMaterial.skinRGB,1],
   roughness:coatMaterial.roughness,
   aigFurMaterial:{
    schema:AIG_REAL3D_V86_FUR_SCHEMA,
    undercoatRGB:[...coatMaterial.undercoatRGB],
    guardRGB:[...coatMaterial.guardRGB],
    strength:coatMaterial.strength,frequency:coatMaterial.frequency
   }
  }})),
  overlays:sourceScene.overlays.slice()};
 const garmentsEvidence=[];
 for(const [i,g] of garments.entries()){
  if(!g||!g.mesh?.actualXYZTriangles||!g.independentFromBodySha||
   !validSHA(g.originalGarmentSha256)||
   g.originalGarmentSha256===bodySourceSha256)
   die('GARMENT_MUST_HAVE_INDEPENDENT_VERIFIED_SOURCE');
  const nodeId='garment_layer_'+i;
  addAIG3DNode(scene,{id:nodeId,mesh:g.mesh,kind:'character',
   source:'INDEPENDENT_ORIGINAL_GARMENT_'+g.originalGarmentSha256,
   material:{baseColor:[...garmentRGB,1],roughness:.89,
    doubleSided:true,metallic:0}});
  garmentsEvidence.push({
   nodeId,garmentSourceSha256:g.originalGarmentSha256,
   originalSourceTriangleCount:g.mesh.triangleCount,
   separateRenderableSourceMesh:true,
   garmentFitOrCollisionVerified:false
  });
 }
 if(originNodes.some((a,i)=>
  sourceScene.nodes[i].mesh!==a.mesh||
  sourceScene.nodes[i].material!==a.material)||
  scene.nodes.slice(0,originNodes.length).some((n,i)=>
   n.mesh!==originNodes[i].mesh||
   n.mesh.indices!==originNodes[i].mesh.indices||
   n.mesh.positions!==originNodes[i].mesh.positions))
  die('ORIGINAL_BODY_MESH_REFERENCES_MODIFIED');
 return {
  schema:AIG_REAL3D_V86_LAYER_SCHEMA,
  scene,bodySourceSha256,
  originalBodyMeshNodes:originNodes.length,
  originalBodyGeometryReallocations:0,
  originalBodyTriangles:originNodes.reduce((n,v)=>n+v.mesh.triangleCount,0),
  coatMaterial:{...coatMaterial},
  garmentLayers:garmentsEvidence,
  independentGarmentSourceCount:garmentsEvidence.length,
  skinUndercoatGuardAreIndependentMaterialProperties:true,
  garmentMustHaveDifferentOriginalSource:true,
  garmentOverlaysOriginalIndexedGeometry:true,
  bodyOriginalGeometryUnmodified:true,
  originalBodyVisualMaterialRenderingPossible:true,
  actualVolumetricStrandFurPASS:false,
  physicallySimulatedGarmentFitPASS:false,
  realDogAnatomyAndHairMotionPASS:false,
  finalReleasePASS:false
 };
}
