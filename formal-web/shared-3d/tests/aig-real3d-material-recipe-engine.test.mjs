import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,addAIG3DNode,createAIG3DBox}
 from '../aig-real3d-core.mjs';
import {
 loadAIGReal3DMaterialLibrary,compileAIGReal3DMaterialRecipe,
 applyAIGReal3DMaterialRecipe,AIG_REAL3D_V87_SAMPLE_LIBRARY,
 AIG_REAL3D_COMPILED_MATERIAL_SCHEMA
} from '../aig-real3d-material-recipe-engine.mjs';
const scene=createAIG3DScene({
 id:'nonhuman_original_material_recipe',consumer:'FastModel',
 units:'METERS',source:'NONHUMAN_INDEXED_SOURCE_QA'
});
addAIG3DNode(scene,{
 id:'immutable_nonhuman_body',kind:'character',
 mesh:createAIG3DBox([1,1,.8],'NONHUMAN_SOURCE_QA'),
 source:'ORIGINAL_NONHUMAN_QA_MESH'
});
const make=(n=10)=>({schema:'AIG_REAL3D_V87_MATERIAL_LIBRARY_V1',
 recipes:Array.from({length:n},(_,i)=>({
  id:'user_custom_recipe_'+i,name:'新材質配方 '+i,
  family:'user_catalog',layers:[
   {color:[(i%9)/10,.3,.5],opacity:1,metallic:(i%2)*.3,
    roughness:.6,mask:'SOLID',scale:22},
   {color:[.85,.75,.53],opacity:.35,metallic:0,
    roughness:.93,mask:'STRIPES',scale:60}
  ]
 }))});
test('One universal material shader compiles 64 arbitrary recipes in ONE catalog without per-family source code',()=>{
 const lib=loadAIGReal3DMaterialLibrary(make(64));
 assert.equal(lib.recipes.length,64);
 assert.equal(lib.perMaterialShaderCodeRequired,false);
 for(const recipe of lib.recipes){
  const compiled=compileAIGReal3DMaterialRecipe(recipe);
  assert.equal(compiled.schema,AIG_REAL3D_COMPILED_MATERIAL_SCHEMA);
  assert.equal(compiled.packedLayerRGBA.length,16);
  assert.equal(compiled.packedLayerSpec.length,16);
  assert.equal(compiled.dynamicSourceCodeGenerated,false);
  assert.equal(compiled.materialId,recipe.id);
 }
});
test('Applying more than one material to same original Indexed XYZ changes material copies only',()=>{
 const before=JSON.stringify(scene),
  mesh=scene.nodes[0].mesh;
 let previous=null;
 for(const recipe of AIG_REAL3D_V87_SAMPLE_LIBRARY.recipes){
  const compiled=compileAIGReal3DMaterialRecipe(recipe);
  const applied=applyAIGReal3DMaterialRecipe({scene,compiled});
  assert.equal(applied.changedMaterialNodeCount,1);
  assert.equal(applied.originalSourceMeshAndIndexReferencesIdentical,true);
  assert.equal(applied.scene.nodes[0].mesh,mesh);
  assert.equal(applied.scene.nodes[0].mesh.positions,mesh.positions);
  assert.equal(applied.scene.nodes[0].mesh.indices,mesh.indices);
  assert.notEqual(applied.scene.nodes[0].material,scene.nodes[0].material);
  assert.notEqual(applied.scene.nodes[0].material.aigMaterialRecipe.materialId,
   previous);
  previous=recipe.id;
 }
 assert.equal(JSON.stringify(scene),before);
});
test('Untrusted JSON invalid fields, duplicate ids, shader strings, excessive materials or fifth layer are BLOCK',()=>{
 assert.throws(()=>loadAIGReal3DMaterialLibrary(JSON.stringify(make(65))),
  /REAL3D_MATERIAL_RECIPE_LIBRARY_FORMAT_INVALID/);
 const dup=make(2);dup.recipes[1].id=dup.recipes[0].id;
 assert.throws(()=>loadAIGReal3DMaterialLibrary(dup),
  /REAL3D_MATERIAL_RECIPE_DUPLICATE_MATERIAL_ID/);
 const injection=make(1);
 injection.recipes[0].layers[0].glsl='gl_FragColor=vec4(1.0)';
 assert.throws(()=>loadAIGReal3DMaterialLibrary(injection),
  /REAL3D_MATERIAL_RECIPE_LAYER_SCHEMA_INVALID/);
 const layer5=make(1);layer5.recipes[0].layers.push(
 ...Array.from({length:4},()=>({color:[1,1,1]})));
 assert.throws(()=>loadAIGReal3DMaterialLibrary(layer5),
  /REAL3D_MATERIAL_RECIPE_RECIPE_SCHEMA_INVALID/);
 const wrong=make(1);wrong.recipes[0].layers[0].roughness=-.9;
 assert.throws(()=>loadAIGReal3DMaterialLibrary(wrong),
  /REAL3D_MATERIAL_RECIPE_LAYER_GPU_PARAMETER_OUT_OF_RANGE/);
});
test('No user-supplied arbitrary code execution; all UV maps, optical physics and hair motion flags remain false',()=>{
 assert.ok(AIG_REAL3D_V87_SAMPLE_LIBRARY.recipes.length>=5);
 for(const r of AIG_REAL3D_V87_SAMPLE_LIBRARY.recipes){
  const result=compileAIGReal3DMaterialRecipe(r);
  assert.equal(result.actualVolumetricFurOrClothSimulationVerified,false);
  assert.equal(result.textureCoordinatesOrExternalMapsUsed,false);
  assert.equal(result.physicalSpectralRenderingVerified,false);
 }
 assert.throws(()=>applyAIGReal3DMaterialRecipe({
  scene,compiled:compileAIGReal3DMaterialRecipe(
   AIG_REAL3D_V87_SAMPLE_LIBRARY.recipes[0]),selectedNodeIds:['FAKE_NODE']
 }),/REAL3D_MATERIAL_RECIPE_SOURCE_NODE_NOT_FOUND/);
});
