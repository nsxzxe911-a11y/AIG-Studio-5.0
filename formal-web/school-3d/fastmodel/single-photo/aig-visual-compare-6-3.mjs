/** AIG FastModel 6.3: same-page visual evidence from ACTUAL verified
 * 2D reference pixels and renderer-produced GLB animation pixels.
 *
 * Pure deterministic pixel analysis + glTF geometry contract; not a
 * pretrained facial recognition system and NEVER grants character approval.
 * Screenshots/crops come from explicit caller supplied real image data,
 * not a model's self-reported geometry, an invented face or a stock photo.
 */
export const AIG63_SCHEMA='AIG_FASTMODEL_6_3_REAL_2D_REFERENCE_VS_WEBGL_GLB_VISUAL_QA_DRAFT';
export const AIG63_SCHOOL_PARTS=Object.freeze([
 'AIG57_FACE_FEATURES','AIG57_SCHOOL_UNIFORM_JACKET','AIG57_WHITE_SHIRT',
 'AIG57_PLEATED_SKIRT','AIG57_PLAID_BOW','AIG57_BACKPACK',
 'GirlPonytail_AIG57_STRANDS'
]);
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/i.test(x);
const finite=Number.isFinite;
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
function validRaster(image){
 return image&&Number.isInteger(image.width)&&Number.isInteger(image.height)&&
  image.width>=24&&image.height>=24&&image.width*image.height<=16000000&&
  image.data?.length===image.width*image.height*4;
}
function normalizedBox(image,box){
 if(!box||[box.x,box.y,box.width,box.height].some(v=>!finite(v)))throw Error('AIG63_ROI_INVALID');
 const b={x:Math.round(box.x),y:Math.round(box.y),
  width:Math.round(box.width),height:Math.round(box.height)};
 if(b.x<0||b.y<0||b.width<24||b.height<24||
  b.x+b.width>image.width||b.y+b.height>image.height)throw Error('AIG63_ROI_OUT_OF_IMAGE');
 return b;
}
const normRGB=(r,g,b)=>[r/255,g/255,b/255];
function samplePixels(image,roi,resolution){
 const pixels=[];
 for(let row=0;row<resolution;row++){
  for(let col=0;col<resolution;col++){
   const x=Math.min(image.width-1,roi.x+Math.floor((col+.5)*roi.width/resolution));
   const y=Math.min(image.height-1,roi.y+Math.floor((row+.5)*roi.height/resolution));
   const off=(y*image.width+x)*4;
   if(image.data[off+3]<245)throw Error('AIG63_TRANSPARENT_OR_UNTRUSTED_PIXELS');
   pixels.push(normRGB(image.data[off],image.data[off+1],image.data[off+2]));
  }
 }
 return pixels;
}
function summarize(samples,resolution){
 let sum=[0,0,0],dark=0,light=0,navy=0,brown=0;
 const lum=p=>.2126*p[0]+.7152*p[1]+.0722*p[2];
 for(const p of samples){
  sum=sum.map((v,i)=>v+p[i]);
  const l=lum(p);
  if(l<.22)dark++;
  if(l>.75&&Math.max(...p)-Math.min(...p)<.25)light++;
  if(p[2]>p[0]*1.12&&l<.42)navy++;
  if(p[0]>p[2]*1.24&&p[1]<p[0]*.91&&l>.06&&l<.7)brown++;
 }
 let edge=0,edgeCount=0;
 for(let y=0;y<resolution-1;y++)for(let x=0;x<resolution-1;x++){
  const i=y*resolution+x,l=lum(samples[i]),
   dx=Math.abs(l-lum(samples[i+1])),
   dy=Math.abs(l-lum(samples[i+resolution]));
  edge+=dx+dy;edgeCount++;
 }
 return {meanRGB:sum.map(v=>+(v/samples.length).toFixed(4)),
  darkFraction:+(dark/samples.length).toFixed(4),
  lightNeutralFraction:+(light/samples.length).toFixed(4),
  navyLikeFraction:+(navy/samples.length).toFixed(4),
  brownLikeFraction:+(brown/samples.length).toFixed(4),
  luminanceEdgeDensity:+(edge/(edgeCount*2)).toFixed(4)};
}
export function compareAIG63ActualImages({
 referenceImage,renderedImage,referenceROI,renderedROI,
 referenceSHA256,modelGLBSHA256,capturedPngSHA256,
 viewKey='positive-z',poseFraction=0,resolution=40
}={}){
 if(!validRaster(referenceImage)||!validRaster(renderedImage)||
  !hex(referenceSHA256)||!hex(modelGLBSHA256)||!hex(capturedPngSHA256)||
  !Number.isInteger(resolution)||resolution<16||resolution>64||
  viewKey!=='positive-z'||poseFraction!==0)
  throw Error('AIG63_REAL_SOURCE_PIXELS_GLB_PNG_REQUIRED');
 const a=normalizedBox(referenceImage,referenceROI),
  b=normalizedBox(renderedImage,renderedROI);
 const first=samplePixels(referenceImage,a,resolution),
  second=samplePixels(renderedImage,b,resolution);
 let abs=0,lum=0;
 for(let i=0;i<first.length;i++){
  for(let j=0;j<3;j++)abs+=Math.abs(first[i][j]-second[i][j]);
  lum+=Math.abs((first[i][0]*.2126+first[i][1]*.7152+first[i][2]*.0722)-
  (second[i][0]*.2126+second[i][1]*.7152+second[i][2]*.0722));
 }
 const referenceFeatures=summarize(first,resolution),
  renderFeatures=summarize(second,resolution);
 return {schema:AIG63_SCHEMA,
  verifiedReferenceImageSHA256:referenceSHA256.toLowerCase(),
  verifiedModelGLBSHA256:modelGLBSHA256.toLowerCase(),
  capturedActualWebGLPngSHA256:capturedPngSHA256.toLowerCase(),
  originalReferenceROI:a,capturedGLBROI:b,
  renderViewKey:viewKey,renderPoseFraction:poseFraction,
  sampledResolution:[resolution,resolution],
  referencePixelFeatures:referenceFeatures,
  renderedGLBPixelFeatures:renderFeatures,
  directMeanAbsoluteRGBDifference:+(abs/(first.length*3)).toFixed(4),
  directMeanAbsoluteLuminanceDifference:+(lum/first.length).toFixed(4),
  edgeDensityDifference:+Math.abs(referenceFeatures.luminanceEdgeDensity-
   renderFeatures.luminanceEdgeDensity).toFixed(4),
  roiShapesAndLightingAreNotAligned:true,
  scoreIsNotIdentitySimilarity:true,
  faceLikenessVisuallyApproved:false,
  schoolUniformAppearanceHumanApproved:false,
  claimedPhotorealisticModel:false,
  onlyOneRenderedPoseAndViewMeasured:true,
  nativeAndroidWindows60FPSVerified:false,
  allAnimationClipsCollisionFreeVerified:false,
  releaseAllowed:false,outcome:'REAL_REFERENCE_VS_RENDER_PIXEL_DIFFERENCES_MEASURED_ONLY'};
}
export function auditAIG63SchoolModelActualGLTF(gltf,{modelGLBSHA256}={}){
 if(!hex(modelGLBSHA256)||!gltf?.scene?.traverse||!Array.isArray(gltf.animations))
  throw Error('AIG63_TRUE_RIGGED_GLB_REQUIRED');
 const meshes=[];
 gltf.scene.traverse(n=>{if(n.isSkinnedMesh)meshes.push(n)});
 const missing=AIG63_SCHOOL_PARTS.filter(name=>!meshes.some(m=>m.name===name));
 const parts=meshes.filter(m=>AIG63_SCHOOL_PARTS.includes(m.name)).map(m=>{
  const indexed=!!m.geometry?.index;
  const pos=m.geometry?.getAttribute('position'),
    weights=m.geometry?.getAttribute('skinWeight');
  const triangles=indexed?m.geometry.index.count/3:0;
  if(!indexed||!pos||!weights||pos.count!==weights.count||triangles<8||
   !m.skeleton?.bones?.length)
   throw Error('AIG63_FAKE_SCHOOL_ACCESSORY_MESH_'+m.name);
  return {name:m.name,vertices:pos.count,triangles,
   bones:m.skeleton.bones.length,actualSkinnedGeometry:true};
 });
 const realSchoolModel=missing.length===0&&meshes.length>=9&&
   gltf.animations.length>=5&&parts.length===AIG63_SCHOOL_PARTS.length;
 return {schema:AIG63_SCHEMA,modelGLBSHA256:modelGLBSHA256.toLowerCase(),
  actualSkinnedMeshes:meshes.length,actualAnimationClips:gltf.animations.length,
  visibleSchoolAccessories:parts,missingSchoolAccessories:missing,
  schoolOutfitMeshesPresent:realSchoolModel,
  screenshotPixelMatchUnverified:true,
  wardrobeOutsideThisGLBUnaffected:true,
  originalAnimationCostumesNeverDeleted:true,
  photoRealisticIdentityApproved:false,releaseAllowed:false,
  outcome:realSchoolModel?'REAL_SCHOOL_TECHNICAL_GLTF_PARTS_PRESENT_ONLY':
   'SCHOOL_APPEARANCE_PARTS_MISSING'};
}
export function bindAIG63Evidence({
 visual,geometry,verifiedReference
}={}){
 if(visual?.schema!==AIG63_SCHEMA||geometry?.schema!==AIG63_SCHEMA||
  visual.verifiedModelGLBSHA256!==geometry.modelGLBSHA256||
  verifiedReference?.sourceImageSHA256!==visual.verifiedReferenceImageSHA256||
  verifiedReference?.schema!=='AIG_FASTMODEL_6_2_SCHOOL_VISUAL_REFERENCE_NO_WARDROBE_RESTRICTIONS')
  throw Error('AIG63_SOURCE_GLB_REFERENCE_MISMATCH');
 return {schema:AIG63_SCHEMA,
  verifiedReferenceSHA256:visual.verifiedReferenceImageSHA256,
  realGLBSHA256:geometry.modelGLBSHA256,
  realFramePngSHA256:visual.capturedActualWebGLPngSHA256,
  measuredPixelDifferences:visual,
  validatedRealGLTFSchoolParts:geometry,
  selectedReferenceIsActual3DModel:false,
  imageAndGLBGeometricallyRegistered:false,
  appearanceHumanVisualApproval:false,
  allPriorCostumesPreserved:true,
  officialWebsiteDeployed:false,native60FPSVerified:false,
  releaseAllowed:false};
}
