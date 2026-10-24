/**
 * Real3D V119: one immutable, source-proven character with multiple *real*
 * independent garment GLB meshes. No clothing mesh is invented from color,
 * no body replacement, skin rig inference, or physically-simulated fabric.
 */
import {createAIG3DScene,addAIG3DNode,auditAIG3DScene}
 from './aig-real3d-core.mjs';
import {sha256AIGReal3DBytes}
 from './aig-real3d-v99-native-model-ingest.mjs';
export const AIG_REAL3D_V119_SCHEMA='AIG_REAL3D_V119_ORIGINAL_GLB_MULTI_WARDROBE_V1';
const fail=s=>{throw Error('REAL3D_V119_'+s);};
const hash=s=>typeof s==='string'&&/^[0-9a-f]{64}$/i.test(s);
const safeId=s=>typeof s==='string'&&/^[a-z][a-z0-9_-]{1,29}$/.test(s);
const slots=new Set(['top','bottom','outerwear','dress','shoes','headwear','accessory']);
function checkImported(model,label){
 if(!model||model.trueBinaryGLBParsed!==true||
  model.originalSourceMeshNeverChanged!==true||
  !hash(model.actualSourceModelSha256)||
  !hash(model.originalImageSha256)||
  model.scene?.consumer!=='FastModel'||model.scene?.units!=='METERS'||
  model.scene?.nodes?.length<1||model.scene.nodes.length>16||
  !(model.sourceTriangles>=12)||model.sourceTriangles>90000||
  model.scene.nodes.some(n=>!n.mesh?.actualXYZTriangles||
   n.mesh.triangleCount<1||n.parentId!==null||
   !Array.isArray(n.mesh.positions)||!Array.isArray(n.mesh.indices)))
  fail(label+'_GenuineNativeGLBSource_REQUIRED');
}
const allNodes=model=>model.scene.nodes;
const bounds=model=>{
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const n of allNodes(model)){
  const b=n.mesh.bounds;
  for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],b.min[i]);hi[i]=Math.max(hi[i],b.max[i]);}
 }
 return {min:lo,max:hi};
};
function clothingInActorCoordinateRegion(actor,cloth){
 const a=bounds(actor),b=bounds(cloth);
 // This is merely a placement sanity check on imported *world* coordinates,
 // not collision detection, skin fit, weight painting, or fabric drape.
 const overlap=(axis)=>{
  const left=Math.max(a.min[axis],b.min[axis]),
   right=Math.min(a.max[axis],b.max[axis]);
  return Math.max(0,right-left);
 };
 const widthA=Math.max(.001,a.max[0]-a.min[0]),
  heightA=Math.max(.001,a.max[1]-a.min[1]);
 return overlap(0)/widthA>=.03&&overlap(1)/heightA>=.03&&
  b.max[2]>=a.min[2]-.35&&b.min[2]<=a.max[2]+.35;
}
function checkSourceAliases(actor,outfits){
 const glbs=new Set([actor.actualSourceModelSha256]);
 for(const outfit of outfits)for(const layer of outfit.layers){
  const sha=layer.imported.actualSourceModelSha256;
  if(glbs.has(sha))fail('SEPARATE_OUTFIT_MESH_MUST_HAVE_UNIQUE_REAL_GLB_SHA');
  glbs.add(sha);
 }
}
function snapshot(model){
 return allNodes(model).map(n=>({
  positions:n.mesh.positions.slice(),normals:n.mesh.normals.slice(),
  indices:n.mesh.indices.slice(),triangles:n.mesh.triangleCount,
  material:JSON.stringify(n.material),
  transform:JSON.stringify(n.transform)
 }));
}
function intact(model,before){
 return allNodes(model).every((n,i)=>n.mesh.triangleCount===before[i].triangles&&
  n.mesh.positions.length===before[i].positions.length&&
  n.mesh.positions.every((x,j)=>x===before[i].positions[j])&&
  n.mesh.normals.every((x,j)=>x===before[i].normals[j])&&
  n.mesh.indices.every((x,j)=>x===before[i].indices[j])&&
  JSON.stringify(n.material)===before[i].material&&
  JSON.stringify(n.transform)===before[i].transform);
}
async function geometrySHA(model){
 const data=[];
 for(const n of allNodes(model)){
  data.push(n.mesh.positions,n.mesh.normals,n.mesh.indices);
 }
 const bytes=new TextEncoder().encode(JSON.stringify(data));
 return sha256AIGReal3DBytes(bytes);
}
const escapePrefix=s=>s.replace(/[^a-z0-9]/g,'_').slice(0,45);
function appendOriginalScene(scene,model,prefix,kind){
 for(let i=0;i<model.scene.nodes.length;i++){
  const n=model.scene.nodes[i];
  const mesh={...n.mesh,positions:n.mesh.positions.slice(),
   normals:n.mesh.normals.slice(),indices:n.mesh.indices.slice(),
   bounds:{min:n.mesh.bounds.min.slice(),max:n.mesh.bounds.max.slice()}};
  if(n.mesh.uvs)mesh.uvs=n.mesh.uvs.slice();
  if(n.mesh.tangents)mesh.tangents=n.mesh.tangents.slice();
  const added=addAIG3DNode(scene,{
   id:prefix+'_'+i,mesh,transform:structuredClone(n.transform),
   kind,source:'V119_GENUINE_IMPORTED_SOURCE_GLB_'+model.actualSourceModelSha256,
   material:n.material,visible:true
  });
  if(n.material.aigTextureNodes)
   added.material.aigTextureNodes=structuredClone(n.material.aigTextureNodes);
 }
}
const receipts=m=>({
 modelGLBSha256:m.actualSourceModelSha256,
 originalSourceImageSha256:m.originalImageSha256,
 triangles:m.sourceTriangles,sourceNodeCount:m.scene.nodes.length
});
/**
 * Registers independent garment sources; loading them is performed by V99.
 * Switching copies selected source meshes to a NEW GPU scene, keeps the actor
 * identical, and refuses same geometry represented as new garment cut.
 */
export async function createAIGReal3DV119MultiWardrobe({
 actor,characterId='source_actor',outfits
}={}){
 if(!safeId(characterId)||!Array.isArray(outfits)||
  outfits.length<2||outfits.length>12)
  fail('ACTOR_ID_AND_TWO_TO_TWELVE_OUTFITS_REQUIRED');
 checkImported(actor,'ACTOR');
 const ids=new Set(),sourceSnapshots=new Map([[actor,snapshot(actor)]]);
 let triangleBudget=actor.sourceTriangles;
 for(const outfit of outfits){
  if(!outfit||!safeId(outfit.id)||ids.has(outfit.id)||
   typeof outfit.label!=='string'||outfit.label.length<2||
   outfit.label.length>72||!Array.isArray(outfit.layers)||
   outfit.layers.length<1||outfit.layers.length>5)
   fail('OUTFIT_UNIQUE_ID_LABEL_AND_1_TO_5_GARMENT_LAYERS_REQUIRED');
  ids.add(outfit.id);
  const occupied=new Set();
  for(const layer of outfit.layers){
   if(!slots.has(layer?.slot)||occupied.has(layer.slot))
    fail('GARMENT_SLOT_DUPLICATED_OR_UNKNOWN');
   occupied.add(layer.slot);
   checkImported(layer.imported,'GARMENT');
   if(!clothingInActorCoordinateRegion(actor,layer.imported))
    fail('CLOTHING_SOURCE_OUTSIDE_ACTOR_COORDINATE_FRAME');
   triangleBudget=Math.max(triangleBudget,
    actor.sourceTriangles+outfit.layers.reduce((n,l)=>n+l.imported?.sourceTriangles||0,0));
   sourceSnapshots.set(layer.imported,snapshot(layer.imported));
  }
 }
 if(triangleBudget>200000)fail('REAL_GPU_TRIANGLE_BUDGET_EXCEEDED');
 checkSourceAliases(actor,outfits);
 const geomHashes=new Map();
 for(const outfit of outfits)
  for(const layer of outfit.layers)
   geomHashes.set(layer.imported,await geometrySHA(layer.imported));
 const registered=outfits.map(o=>({
  id:o.id,label:o.label,layers:o.layers.map(l=>({
   slot:l.slot,source:receipts(l.imported),
   geometrySHA256:geomHashes.get(l.imported),
   originalGarmentGeometryPresent:true}))
 }));
 const hasMultipleCuts=new Set(
  outfits.flatMap(o=>o.layers.map(l=>geomHashes.get(l.imported)))).size>1;
 if(!hasMultipleCuts)
  fail('ALL_WARDROBE_OPTIONS_ARE_IDENTICAL_GEOMETRY_ONLY_RECOLORS');
 async function activate(outfitId){
  const chosen=outfits.find(o=>o.id===outfitId);
  if(!chosen)fail('UNKNOWN_OUTFIT_ID');
  for(const [model,snap] of sourceSnapshots)
   if(!intact(model,snap))fail('ORIGINAL_ACTOR_OR_CLOTHING_GEOMETRY_CHANGED');
  const scene=createAIG3DScene({
   id:'wardrobe_'+escapePrefix(outfitId),consumer:'FastModel',
   units:'METERS',source:'REAL_V99_INDEPENDENT_GLB_ACTOR_AND_CLOTHING'
  });
  appendOriginalScene(scene,actor,'actor','character');
  for(let i=0;i<chosen.layers.length;i++)
   appendOriginalScene(scene,chosen.layers[i].imported,
    'cloth_'+escapePrefix(chosen.layers[i].slot)+'_'+i,'object');
  const audit=auditAIG3DScene(scene);
  const sources=[actor.actualSourceModelSha256,
   ...chosen.layers.map(l=>l.imported.actualSourceModelSha256)];
  const compositeManifestSha256=await sha256AIGReal3DBytes(
   new TextEncoder().encode(JSON.stringify({schema:AIG_REAL3D_V119_SCHEMA,
    characterId,outfitId,sourceGLBSha256:sources}))
  );
  const receipt={
   schema:AIG_REAL3D_V119_SCHEMA,characterId,activeOutfitId:outfitId,
   actualOutfitLabel:chosen.label,
   actorSourceGLBSha256:actor.actualSourceModelSha256,
   actorTrianglesUnchanged:actor.sourceTriangles,
   outfitLayers:chosen.layers.map(l=>({slot:l.slot,...receipts(l.imported)})),
   wardrobeOptions:registered.length,
   activeOnlyOneOutfit:true,
   selectedTotalTriangles:audit.triangleCount,
   sceneOriginalSourceMeshesPresent:audit.trueIndexedXYZMesh,
   compositeManifestSha256,
   sourceGLBFileNotRewritten:true,
   geometrySourceVerifiableFromNativeGLB:true,
   multipleDistinctGarmentCutsAvailable:hasMultipleCuts,
   bodyShapeOrOriginalRigModified:false,
   garmentGeometryActuallyAuthoredNotInvented:true,
   garmentFitVerifiedByMeasurements:false,
   clothCollisionAndDrapeSimulated:false,
   animationSkinningRetargeted:false,
   AIHumanSemanticClothingRecognitionPerformed:false,
   fullRealisticBodyAndClothes1to1:false,
   productionReleasePASS:false
  };
  return {scene,receipt};
 }
 return {
  schema:AIG_REAL3D_V119_SCHEMA,characterId,
  actorSource:receipts(actor),outfitCatalog:registered,
  maxOutfitCount:12,
  garmentGeometryAuthoredRequired:true,
  originalActorSourceRetained:true,
  activate
 };
}
