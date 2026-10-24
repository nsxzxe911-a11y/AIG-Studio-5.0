import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DBox,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {createAIGReal3DV119MultiWardrobe}
 from '../aig-real3d-v119-multi-wardrobe.mjs';
const hash=c=>c.repeat(64);
function imported(id,x,y,z){
 const scene=createAIG3DScene({id:'test_'+id,units:'METERS',
  consumer:'FastModel',source:'INDEPENDENT_FIXTURE_GLTF_MESH'});
 addAIG3DNode(scene,{id:'mesh_'+id,
  mesh:createAIG3DBox([x,y,z],'ACTUAL_TEST_TRIANGLES_NOT_HUMAN'),
  kind:'character',source:'UNIT_TEST_SOURCE'});
 return {scene,trueBinaryGLBParsed:true,originalSourceMeshNeverChanged:true,
  actualSourceModelSha256:hash(id),originalImageSha256:hash(id.toUpperCase()),
  sourceTriangles:12};
}
const fixture=()=>{
 const actor=imported('a',.5,1.5,.14),
  top=imported('b',.36,.44,.12),
  dress=imported('c',.48,.95,.11),
  outer=imported('d',.6,.5,.16);
 const outfits=[
  {id:'uniform',label:'制服套裝',layers:[{slot:'top',imported:top},
   {slot:'outerwear',imported:outer}]},
  {id:'casual',label:'便服洋裝',layers:[{slot:'dress',imported:dress}]}
 ];
 return {actor,outfits};
};
test('V119 two separate true XYZ outfit cuts switch while original actor untouched and manifest SHA changes',async()=>{
 const f=fixture(),original=JSON.stringify(f.actor.scene);
 const wardrobe=await createAIGReal3DV119MultiWardrobe(f);
 assert.equal(wardrobe.outfitCatalog.length,2);
 const uniform=await wardrobe.activate('uniform'),
  casual=await wardrobe.activate('casual'),
  again=await wardrobe.activate('uniform');
 assert.equal(uniform.receipt.actorSourceGLBSha256,hash('a'));
 assert.equal(casual.receipt.actorSourceGLBSha256,hash('a'));
 assert.equal(uniform.receipt.actorTrianglesUnchanged,12);
 assert.equal(uniform.receipt.outfitLayers.length,2);
 assert.equal(casual.receipt.outfitLayers.length,1);
 assert.equal(uniform.receipt.selectedTotalTriangles,36);
 assert.equal(casual.receipt.selectedTotalTriangles,24);
 assert.equal(uniform.scene.nodes.length,3);
 assert.equal(casual.scene.nodes.length,2);
 assert.equal(uniform.receipt.activeOnlyOneOutfit,true);
 assert.equal(uniform.receipt.multipleDistinctGarmentCutsAvailable,true);
 assert.notEqual(uniform.receipt.compositeManifestSha256,casual.receipt.compositeManifestSha256);
 assert.equal(uniform.receipt.compositeManifestSha256,again.receipt.compositeManifestSha256);
 assert.equal(uniform.receipt.bodyShapeOrOriginalRigModified,false);
 assert.equal(uniform.receipt.garmentGeometryActuallyAuthoredNotInvented,true);
 assert.equal(uniform.receipt.clothCollisionAndDrapeSimulated,false);
 assert.equal(uniform.receipt.productionReleasePASS,false);
 assert.equal(JSON.stringify(f.actor.scene),original);
});
test('V119 no ghost outfit layers survive switching, all source models immutably retained',async()=>{
 const f=fixture(),wardrobe=await createAIGReal3DV119MultiWardrobe(f);
 const first=await wardrobe.activate('uniform');
 first.scene.nodes[1].mesh.positions[0]+=999;
 const restored=await wardrobe.activate('uniform');
 assert.notEqual(restored.scene.nodes[1].mesh.positions[0],first.scene.nodes[1].mesh.positions[0]);
 const cas=await wardrobe.activate('casual');
 assert.ok(cas.scene.nodes.every(x=>!x.source.includes(hash('b'))));
});
test('V119 refuses swapping actor source as a clothing asset or duplicate garment GLB',async()=>{
 const f=fixture();
 f.outfits[0].layers[0].imported=f.actor;
 await assert.rejects(createAIGReal3DV119MultiWardrobe(f),
  /SEPARATE_OUTFIT_MESH_MUST_HAVE_UNIQUE_REAL_GLB_SHA/);
 const g=fixture();
 g.outfits[1].layers[0].imported=g.outfits[0].layers[0].imported;
 await assert.rejects(createAIGReal3DV119MultiWardrobe(g),
  /SEPARATE_OUTFIT_MESH_MUST_HAVE_UNIQUE_REAL_GLB_SHA/);
});
test('V119 incorrect outfit slot, ID, or fake claimed GLB is BLOCK',async()=>{
 const f=fixture();f.outfits[0].layers[1].slot='top';
 await assert.rejects(createAIGReal3DV119MultiWardrobe(f),/GARMENT_SLOT_DUPLICATED_OR_UNKNOWN/);
 const g=fixture();g.outfits[1].id=g.outfits[0].id;
 await assert.rejects(createAIGReal3DV119MultiWardrobe(g),/OUTFIT_UNIQUE_ID/);
 const h=fixture();h.outfits[1].layers[0].imported.trueBinaryGLBParsed=false;
 await assert.rejects(createAIGReal3DV119MultiWardrobe(h),/GenuineNativeGLBSource_REQUIRED/);
});
test('V119 refuses distinct colors but exactly the same 3D garment geometry',async()=>{
 const f=fixture();
 f.outfits[1].layers[0].imported=imported('c',.36,.44,.12);
 f.outfits[0].layers.pop();
 await assert.rejects(createAIGReal3DV119MultiWardrobe(f),
  /ALL_WARDROBE_OPTIONS_ARE_IDENTICAL_GEOMETRY_ONLY_RECOLORS/);
});
test('V119 out-of-coordinate accessory is rejected rather than positioned by guessed AI',async()=>{
 const f=fixture();
 const garment=imported('c',.0001,.0001,.0001);
 f.outfits[1].layers[0].imported=garment;
 await assert.rejects(createAIGReal3DV119MultiWardrobe(f),
  /CLOTHING_SOURCE_OUTSIDE_ACTOR_COORDINATE_FRAME/);
});
