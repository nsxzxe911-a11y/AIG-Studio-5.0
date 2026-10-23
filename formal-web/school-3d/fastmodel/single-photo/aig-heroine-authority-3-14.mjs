/**
 * Real3D 3.14 — actual user-approved multi-view SHEET is visual authority,
 * NOT a GLB, not a scanned depth sensor, and not an automatic facial-ID
 * recognizer. Work locally with RGBA only. Never upload the original file.
 */
export const AIG314_HEROINE_SCHEMA='AIG_REAL3D_3_14_HEROINE_APPROVED_REFERENCE_LEDGER';
export const AIG314_HEROINE_SHEET=Object.freeze({
 id:'USER_20261021_SCHOOL_GIRL_3D_TURNAROUND',
 sha256:'1deed212a2adcdc821e4291c6021fd1db490644da9a9c9b497f8243a7da296c1',
 width:1448,height:1086,
 look:'long-brown-wavy-hair-navy-blazer-white-shirt-burgundy-plaid-bow-pleated-skirt-black-knee-socks-loafers-backpack',
 // Bounding boxes of ACTUAL panels within the reference board; these are
 // visual guides, not 3D pose landmarks or triangulated anatomy.
 regions:Object.freeze({
  front:Object.freeze([636,55,171,534]),
  profile:Object.freeze([809,55,141,535]),
  rear:Object.freeze([943,55,159,534]),
  neutralTPose:Object.freeze([1109,55,300,534]),
  faceDetails:Object.freeze([18,625,415,326]),
  textileDetails:Object.freeze([591,627,444,326]),
  bagDetails:Object.freeze([1055,627,347,325])
 }),
 // Manual inspected anchor pixels from the EXACT reference file.
 // Their 5x5 averages must be recomputed FROM THE USER'S REAL PIXELS.
 // They guide PBR colour only, not person identity or exact garment pattern.
 sampleAnchors:Object.freeze({
  skin:Object.freeze([270,257]),
  hair:Object.freeze([270,77]),
  blazer:Object.freeze([486,288]),
  skirt:Object.freeze([511,411]),
  bow:Object.freeze([507,224]),
  socks:Object.freeze([717,493])
 }),
 sourcePrivateNeverUploaded:true,
 requiredViews:['front','profile','rear','neutralTPose']
});
const fail=s=>{throw Error('AIG314_HEROINE_'+s)};
/** Real 5x5 pixel medians verified against the local 1448x1086 user
 * authority sheet with SHA-256 above. Only AGGREGATED colours are encoded,
 * never the user image bytes. Colour ≠ facial shape, plaid UV or likeness.
 */
export const AIG314_OFFLINE_AUTHORITY_COLOURS=Object.freeze({
 skin:Object.freeze([243,192,174]),hair:Object.freeze([73,46,53]),
 blazer:Object.freeze([58,52,63]),skirt:Object.freeze([78,64,84]),
 bow:Object.freeze([60,51,71]),socks:Object.freeze([58,48,59])
});
export function getAIG314VerifiedAuthorityPalette(){
 const palette={};
 for(const [name,rgb] of Object.entries(AIG314_OFFLINE_AUTHORITY_COLOURS)){
  palette[name]=Object.freeze({
   srgb8:rgb,srgb01:Object.freeze(rgb.map(v=>+(v/255).toFixed(5))),
   directlyReadFromApprovedReference:true
  });
 }
 return Object.freeze({
  schema:AIG314_HEROINE_SCHEMA,
  verifiedApprovedSheetSHA256:AIG314_HEROINE_SHEET.sha256,
  palette:Object.freeze(palette),
  onlyExtractedAggregateColourReferenceStored:true,
  photoBytesEmbedded:false,
  photoSourceMatchedWhenNumbersExtracted:true,
  individualFaceGeometryOrIdentityReconstructed:false,
  sourceImageBytesEmittedByFunction:false
 });
}

export function analyseAIG314ApprovedHeroineSheet({
 rgba,width,height,sha256
}={}){
 if(!(rgba instanceof Uint8Array||rgba instanceof Uint8ClampedArray)||
  width!==AIG314_HEROINE_SHEET.width||
  height!==AIG314_HEROINE_SHEET.height||
  rgba.length!==width*height*4||
  sha256!==AIG314_HEROINE_SHEET.sha256)
  fail('EXACT_USER_AUTHORITY_RGBA_SHA_REQUIRED');
 const palette={};
 for(const [name,[cx,cy]] of Object.entries(
  AIG314_HEROINE_SHEET.sampleAnchors)){
  const samples=[[],[],[]];
  for(let y=cy-2;y<=cy+2;y++)for(let x=cx-2;x<=cx+2;x++){
   const i=(y*width+x)*4;
   if(rgba[i+3]<250)fail('NON_OPAQUE_AUTHORITY_SAMPLE');
   for(let k=0;k<3;k++)samples[k].push(rgba[i+k]);
  }
  const med=samples.map(a=>{
   a.sort((x,y)=>x-y);return a[12];
  });
  palette[name]=Object.freeze({
   srgb8:Object.freeze(med),
   srgb01:Object.freeze(med.map(v=>+(v/255).toFixed(5))),
   directlyReadFromApprovedReference:true
  });
 }
 return Object.freeze({
  schema:AIG314_HEROINE_SCHEMA,
  verifiedApprovedSheetSHA256:sha256,
  imageDimensions:Object.freeze([width,height]),
  realReferenceViews:AIG314_HEROINE_SHEET.requiredViews,
  palette:Object.freeze(palette),
  physicallyMeasuredHumanProportions:false,
  faceLandmarksDetectedOrMatched:false,
  modelGeometryReconstructedFromReference:false,
  productionFaceOrHairstyleAccepted:false,
  sourceImageBytesEmittedByFunction:false,
  originalRGBAUnmodified:true
 });
}
/**
 * Non-destructive colour refresh for actual already-generated semantically
 * class-labelled BODY vertices (skin 2, hair 3, garment 14). Does NOT
 * magically extract eye/hair topology or an approved person likeness.
 */
export function applyAIG314ObservedPaletteToBody({
 colours,sourceClassIds,authority
}={}){
 if(!(colours instanceof Float32Array)||
  !(sourceClassIds instanceof Uint8Array)||
  colours.length!==sourceClassIds.length*3||
  authority?.schema!==AIG314_HEROINE_SCHEMA||
  authority.verifiedApprovedSheetSHA256!==
   AIG314_HEROINE_SHEET.sha256)
  fail('SOURCE_CLASSIFIED_MODEL_AND_APPROVED_PALETTE_REQUIRED');
 const out=new Float32Array(colours);
 const map=new Map([
  [2,authority.palette.skin.srgb01],
  [3,authority.palette.hair.srgb01],
  [14,authority.palette.blazer.srgb01]
 ]);
 let changed=0;
 for(let i=0;i<sourceClassIds.length;i++){
  const rgb=map.get(sourceClassIds[i]);
  if(!rgb)continue;
  for(let k=0;k<3;k++)
   out[i*3+k]=rgb[k]<=.04045?rgb[k]/12.92:
    Math.pow((rgb[k]+.055)/1.055,2.4);
  changed++;
 }
 return Object.freeze({
  schema:AIG314_HEROINE_SCHEMA,colours:out,
  actualRecolouredVertices:changed,
  actualHumanFaceGeometryRemodelled:false,
  skinClothHairPaletteSampledFromRealUserReference:true,
  originalBodyColoursUnmodified:true,
  sameBodyGeometryAndRig:true,
  likenessAndClothingPatternStillNotApproved:true
 });
}
