import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,addAIG3DNode,createAIG3DBox}
 from '../aig-real3d-core.mjs';
import {createAIGReal3DCoatMaterial,composeAIGReal3DFurClothScene,
 buildAIGReal3DIndependentGarmentOBJ,AIG_REAL3D_V86_LAYER_SCHEMA}
 from '../aig-real3d-separate-fur-cloth-material.mjs';
const bodySha='a'.repeat(64),garmentSha='b'.repeat(64),hatSha='c'.repeat(64);
const body=createAIG3DScene({
 id:'original_nonhuman_source',consumer:'FastModel',units:'METERS',
 source:'IMMUTABLE_NONHUMAN_ORIGINAL_QA'
});
addAIG3DNode(body,{
 id:'original_nonhuman_node',mesh:createAIG3DBox([1,2,.9],
 'NONHUMAN_ORIGINAL_MATERIAL_QA'),
 kind:'character',source:'ORIGINAL_NONHUMAN_SHA'
});
const coatOBJ=[
 '# Separately authored NONHUMAN QA clothing triangle, registered METERS',
 'v -0.4 0.5 0.47','v 0.4 0.5 0.47','v 0 0.8 0.47',
 'f 1 2 3'
].join('\n');
const secondOBJ=[
 '# Second independently authored layer',
 'v -0.2 0.83 0.5','v 0.2 0.83 0.5','v 0 0.98 0.5',
 'f 1 2 3'
].join('\n');
test('Dog fur is independent skin/undercoat/guard MATERIAL state, not changes to native Indexed XYZ',()=>{
 const coat=createAIGReal3DCoatMaterial({
  kind:'DOUBLE_COAT',skinRGB:[.4,.3,.2],
  undercoatRGB:[.8,.6,.4],guardRGB:[.21,.15,.09]
 });
 assert.equal(coat.materialLayerRoles.length,3);
 assert.equal(coat.trueIndividualHairFibersGenerated,0);
 const prior=JSON.stringify(body);
 const result=composeAIGReal3DFurClothScene({
  sourceScene:body,bodySourceSha256:bodySha,coatMaterial:coat
 });
 assert.equal(result.schema,AIG_REAL3D_V86_LAYER_SCHEMA);
 assert.equal(result.originalBodyGeometryReallocations,0);
 assert.equal(result.independentGarmentSourceCount,0);
 assert.equal(result.scene.nodes[0].mesh,body.nodes[0].mesh);
 assert.equal(result.scene.nodes[0].mesh.indices,body.nodes[0].mesh.indices);
 assert.notEqual(result.scene.nodes[0].material,body.nodes[0].material);
 assert.equal(result.scene.nodes[0].material.aigFurMaterial.strength,.85);
 assert.equal(result.realDogAnatomyAndHairMotionPASS,false);
 assert.equal(result.actualVolumetricStrandFurPASS,false);
 assert.deepEqual(JSON.stringify(body),prior);
});
test('Each independently provided CLOTHING source is a separate visible indexed garment mesh, not recolored original skin',()=>{
 const g=buildAIGReal3DIndependentGarmentOBJ({
  objText:coatOBJ,garmentSourceSha256:garmentSha,bodySourceSha256:bodySha
 });
 const h=buildAIGReal3DIndependentGarmentOBJ({
  objText:secondOBJ,garmentSourceSha256:hatSha,bodySourceSha256:bodySha
 });
 assert.equal(g.originalGarmentTriangleCount,1);
 assert.equal(g.independentFromBodySha,true);
 assert.equal(g.garmentFitOrCollisionVerified,false);
 const coat=createAIGReal3DCoatMaterial({kind:'SHORT_COAT'});
 const result=composeAIGReal3DFurClothScene({
  sourceScene:body,bodySourceSha256:bodySha,coatMaterial:coat,
  garments:[g,h]
 });
 assert.equal(result.independentGarmentSourceCount,2);
 assert.equal(result.scene.nodes.length,body.nodes.length+2);
 assert.equal(result.scene.nodes[0].mesh,body.nodes[0].mesh);
 assert.notEqual(result.scene.nodes[1].mesh,body.nodes[0].mesh);
 assert.notEqual(result.scene.nodes[2].mesh,result.scene.nodes[1].mesh);
 assert.deepEqual(result.garmentLayers.map(x=>x.garmentSourceSha256),
  [garmentSha,hatSha]);
 assert.equal(result.garmentMustHaveDifferentOriginalSource,true);
 assert.equal(result.physicallySimulatedGarmentFitPASS,false);
});
test('Source garment quad, invalid indices, body-shared SHA and fabric that has no original OBJ are BLOCK',()=>{
 assert.throws(()=>buildAIGReal3DIndependentGarmentOBJ({
  objText:coatOBJ,bodySourceSha256:bodySha,garmentSourceSha256:bodySha
 }),/REAL3D_MATERIAL_LAYER_INDEPENDENT_GARMENT_SOURCE_REQUIRED/);
 assert.throws(()=>buildAIGReal3DIndependentGarmentOBJ({
  objText:coatOBJ.replace('f 1 2 3','f 1 2 3 4'),
  bodySourceSha256:bodySha,garmentSourceSha256:garmentSha
 }),/REAL3D_MATERIAL_LAYER_GARMENT_TRIANGLE_ONLY_SOURCE_REQUIRED/);
 assert.throws(()=>buildAIGReal3DIndependentGarmentOBJ({
  objText:coatOBJ.replace('f 1 2 3','f 1 2 77'),
  bodySourceSha256:bodySha,garmentSourceSha256:garmentSha
 }),/REAL3D_MATERIAL_LAYER_GARMENT_ORIGINAL_INDEX_OUT_OF_BOUNDS/);
 assert.throws(()=>composeAIGReal3DFurClothScene({
  sourceScene:body,bodySourceSha256:bodySha,
  coatMaterial:createAIGReal3DCoatMaterial(),garments:[{mesh:body.nodes[0].mesh}]
 }),/REAL3D_MATERIAL_LAYER_GARMENT_MUST_HAVE_INDEPENDENT_VERIFIED_SOURCE/);
});
test('Invalid hair colors / material roughness cannot modify renderer without fail-closed parameters',()=>{
 assert.throws(()=>createAIGReal3DCoatMaterial({kind:'DOG_HAIR_3D_GENERATOR'}),
  /REAL3D_MATERIAL_LAYER_COAT_PARAMETERS_INVALID/);
 assert.throws(()=>createAIGReal3DCoatMaterial({
  kind:'LONG_COAT',undercoatRGB:[100,0,0]
 }),/REAL3D_MATERIAL_LAYER_COAT_PARAMETERS_INVALID/);
 assert.throws(()=>createAIGReal3DCoatMaterial({
  kind:'SHORT_COAT',strength:2
 }),/REAL3D_MATERIAL_LAYER_COAT_STRENGTH_FREQUENCY_INVALID/);
 const skin=createAIGReal3DCoatMaterial({kind:'SKIN'});
 assert.equal(skin.strength,0);
 assert.deepEqual(skin.materialLayerRoles,['SKIN']);
});
