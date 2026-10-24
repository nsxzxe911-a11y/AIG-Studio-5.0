/**
 * V87 DATA-DRIVEN Real3D material recipe engine.
 *
 * User-provided catalog JSON compiles to FIXED GPU material uniforms.
 * A new recipe ID/type is DATA, never executable JS, GLSL, arbitrary shader
 * strings, or a new per-material code path. No mesh vertices/indices added.
 * Bounded four layers are used to support WebGL1/2 predictable limits.
 * Visual shader approximation != film-quality physical fabric/skin/fur.
 */
export const AIG_REAL3D_MATERIAL_LIBRARY_SCHEMA='AIG_REAL3D_V87_MATERIAL_LIBRARY_V1';
export const AIG_REAL3D_COMPILED_MATERIAL_SCHEMA='AIG_REAL3D_V87_COMPILED_FOUR_LAYER_MATERIAL_V1';
export const AIG_REAL3D_MATERIAL_MASK_IDS=Object.freeze({
 SOLID:0,NOISE:1,STRIPES:2,FACING:3
});
const fail=x=>{throw Error('REAL3D_MATERIAL_RECIPE_'+x);};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const fraction=x=>finite(x)&&x>=0&&x<=1;
const rgb=c=>Array.isArray(c)&&c.length===3&&c.every(fraction);
const identifier=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(x);
const allowed=new Set(['id','name','family','layers']);
const allowedLayer=new Set(['color','opacity','metallic','roughness','mask','scale']);
const manifestFields=new Set(['schema','recipes']);
const defaults={color:[1,1,1],opacity:1,metallic:0,roughness:.65,
 mask:'SOLID',scale:20};
function assertRecipe(r){
 if(!r||typeof r!=='object'||Array.isArray(r)||
  Object.keys(r).some(k=>!allowed.has(k))||
  !identifier(r.id)||typeof r.name!=='string'||r.name.length<1||
  r.name.length>100||typeof r.family!=='string'||
  r.family.length<1||r.family.length>40||
  !Array.isArray(r.layers)||r.layers.length<1||r.layers.length>4)
  fail('RECIPE_SCHEMA_INVALID');
 for(const layer of r.layers){
  if(!layer||typeof layer!=='object'||Array.isArray(layer)||
   Object.keys(layer).some(k=>!allowedLayer.has(k)))
   fail('LAYER_SCHEMA_INVALID');
  const full={...defaults,...layer};
  if(!rgb(full.color)||!fraction(full.opacity)||
   !fraction(full.metallic)||!finite(full.roughness)||
   full.roughness<.04||full.roughness>1||
   !Object.hasOwn(AIG_REAL3D_MATERIAL_MASK_IDS,full.mask)||
   !finite(full.scale)||full.scale<.1||full.scale>512)
   fail('LAYER_GPU_PARAMETER_OUT_OF_RANGE');
 }
}
export function loadAIGReal3DMaterialLibrary(json, {maxRecipes=64}={}){
 if(!Number.isInteger(maxRecipes)||maxRecipes<1||maxRecipes>256)
  fail('LIBRARY_BUDGET_INVALID');
 let data;
 if(typeof json==='string'){
  if(json.length>512000)fail('JSON_BYTES_BUDGET');
  try{data=JSON.parse(json);}catch{fail('MALFORMED_JSON');}
 }else data=json;
 if(!data||typeof data!=='object'||Array.isArray(data)||
  Object.keys(data).some(k=>!manifestFields.has(k))||
  data.schema!==AIG_REAL3D_MATERIAL_LIBRARY_SCHEMA||
  !Array.isArray(data.recipes)||data.recipes.length<1||
  data.recipes.length>maxRecipes)
  fail('LIBRARY_FORMAT_INVALID');
 const ids=new Set();
 for(const r of data.recipes){
  assertRecipe(r);
  if(ids.has(r.id))fail('DUPLICATE_MATERIAL_ID');
  ids.add(r.id);
 }
 return {schema:AIG_REAL3D_MATERIAL_LIBRARY_SCHEMA,
  recipes:data.recipes.map(r=>({
   ...r,layers:r.layers.map(l=>({...defaults,...l,color:[...(l.color??defaults.color)]}))
  })),
  arbitraryGLSLOrJSExecutionPermitted:false,
  perMaterialShaderCodeRequired:false,
  actualTextureMapsUploaded:0,
  physicalTransparencyRefractionOrSubsurfaceVerified:false};
}
export function compileAIGReal3DMaterialRecipe(recipe){
 assertRecipe(recipe);
 const entries=recipe.layers.map(l=>({...defaults,...l}));
 const colors=[],specs=[];
 for(let i=0;i<4;i++){
  const x=entries[i];
  if(x){
   colors.push(...x.color,x.opacity);
   specs.push(x.roughness,x.metallic,x.scale,AIG_REAL3D_MATERIAL_MASK_IDS[x.mask]);
  }else{
   colors.push(0,0,0,0);specs.push(.65,0,1,0);
  }
 }
 return {
  schema:AIG_REAL3D_COMPILED_MATERIAL_SCHEMA,
  materialId:recipe.id,
  materialFamily:recipe.family,
  layerCount:entries.length,
  packedLayerRGBA:colors,packedLayerSpec:specs,
  actualGPULayerCount:4,
  dynamicSourceCodeGenerated:false,
  originalMeshGeometryChanged:false,
  textureCoordinatesOrExternalMapsUsed:false,
  physicalSpectralRenderingVerified:false,
  actualVolumetricFurOrClothSimulationVerified:false
 };
}
/** Copy materials, not source positions/indices/normals.
 * Select any existing node IDs to apply the compiled 4-layer recipe.
 */
export function applyAIGReal3DMaterialRecipe({
 scene,compiled,selectedNodeIds=null
}={}){
 if(scene?.schema!=='AIG_REAL3D_SCENE_V1'||
  compiled?.schema!==AIG_REAL3D_COMPILED_MATERIAL_SCHEMA||
  compiled.packedLayerRGBA?.length!==16||
  compiled.packedLayerSpec?.length!==16||
  !compiled.packedLayerRGBA.every(fraction)||
  !compiled.packedLayerSpec.every(finite)||
  !Number.isInteger(compiled.layerCount)||compiled.layerCount<1||
  compiled.layerCount>4||
  (selectedNodeIds!==null&&(!Array.isArray(selectedNodeIds)||
   selectedNodeIds.length<1||
   selectedNodeIds.some(x=>typeof x!=='string'))))
  fail('SCENE_OR_UNIFORM_PAYLOAD_INVALID');
 const permitted=new Set(selectedNodeIds??scene.nodes.map(x=>x.id));
 if([...permitted].some(id=>!scene.nodes.some(x=>x.id===id)))
  fail('SOURCE_NODE_NOT_FOUND');
 let applied=0;
 const copy={...scene,revision:scene.revision+1,
  nodes:scene.nodes.map(node=>{
   if(!permitted.has(node.id))return {...node};
   applied++;
   return {...node,material:{...node.material,
    aigMaterialRecipe:{
     schema:AIG_REAL3D_COMPILED_MATERIAL_SCHEMA,
     materialId:compiled.materialId,layerCount:compiled.layerCount,
     packedLayerRGBA:[...compiled.packedLayerRGBA],
     packedLayerSpec:[...compiled.packedLayerSpec]
    }}};
  }),overlays:scene.overlays.slice()};
 if(applied<1)fail('NO_REAL_SOURCE_NODES_SELECTED');
 if(copy.nodes.some((node,i)=>node.mesh!==scene.nodes[i].mesh||
  node.mesh.positions!==scene.nodes[i].mesh.positions||
  node.mesh.indices!==scene.nodes[i].mesh.indices))
  fail('IMMUTABLE_SOURCE_GEOMETRY_REFERENCE_CHANGED');
 return {scene:copy,materialId:compiled.materialId,
  materialLayerCount:compiled.layerCount,
  changedMaterialNodeCount:applied,
  originalSourceMeshAndIndexReferencesIdentical:true,
  originalSourceGPUBufferReallocationRequired:false,
  newUserMaterialTypesNeedNoEnginePatch:true,
  filmPhotorealismOrComplexOpticsCertified:false,
  anatomyAndNaturalMotionCertified:false};
}
export const AIG_REAL3D_V87_SAMPLE_LIBRARY=loadAIGReal3DMaterialLibrary({
 schema:AIG_REAL3D_MATERIAL_LIBRARY_SCHEMA,
 recipes:[
  {id:'fur_brown',name:'咖啡色雙層毛（表面材質）',family:'animal_surface',
   layers:[
    {color:[.48,.33,.22],opacity:1,roughness:.91,metallic:0,mask:'SOLID',scale:20},
    {color:[.2,.12,.07],opacity:.62,roughness:.91,metallic:0,mask:'NOISE',scale:91}]},
  {id:'woven_blue',name:'藍色織布（紋理近似）',family:'fabric_approximation',
   layers:[
    {color:[.06,.16,.56],opacity:1,roughness:.96,metallic:0,mask:'SOLID',scale:20},
    {color:[.26,.34,.68],opacity:.55,roughness:.94,metallic:0,mask:'STRIPES',scale:78}]},
  {id:'brushed_metal',name:'霧面拉絲金屬（紋理近似）',family:'metal_approximation',
   layers:[
    {color:[.56,.61,.7],opacity:1,roughness:.32,metallic:.85,mask:'SOLID',scale:20},
    {color:[.87,.88,.9],opacity:.19,roughness:.4,metallic:.87,mask:'STRIPES',scale:120}]},
  {id:'painted_wood',name:'木紋塗層（紋理近似）',family:'wood_approximation',
   layers:[
    {color:[.44,.24,.12],opacity:1,roughness:.8,metallic:0,mask:'SOLID',scale:20},
    {color:[.20,.09,.04],opacity:.52,roughness:.76,metallic:0,mask:'STRIPES',scale:24}]},
  {id:'leather_surface',name:'皮革表面（紋理近似）',family:'leather_approximation',
   layers:[
    {color:[.18,.08,.055],opacity:1,roughness:.7,metallic:0,mask:'SOLID',scale:20},
    {color:[.4,.19,.12],opacity:.25,roughness:.63,metallic:0,mask:'NOISE',scale:160}]}
 ]
});
