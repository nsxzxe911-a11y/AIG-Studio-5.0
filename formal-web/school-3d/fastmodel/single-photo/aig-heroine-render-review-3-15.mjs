/**
 * AIG Real3D 3.15 — actual XYZ-first heroine appearance/render gate.
 * Nothing here reconstructs identity from a reference JPG/PNG by fiat.
 * Run on the real visible head/body/garment/hair source meshes BEFORE
 * considering shader quality or claiming likeness.
 */
export const AIG315_SCHEMA='AIG_REAL3D_3_15_GEOMETRY_FIRST_MULTI_VIEW_GATES';
export const AIG315_ORDER=Object.freeze([
 'VERIFY_SOURCE_SHA_AND_GEOMETRY',
 'FACE_HEAD_TOPOLOGY_AND_EXPRESSION_GEOMETRY',
 'SOURCE_CONSTRAINED_DETACHABLE_HAIR',
 'INDEPENDENT_TAILORED_OUTFIT_MESHES',
 'RIG_POSE_AND_DISCRETE_COLLISION_AUDIT',
 'FRONT_PROFILE_REAR_SILHOUETTE_REVIEW',
 'PBR_LIGHTING_ONLY_AFTER_GEOMETRIC_QA'
]);
const fail=s=>{throw Error('AIG315_'+s)};
function xyzBounds(p){
 if(!(p instanceof Float32Array)||p.length<9||p.length%3||
  !p.every(Number.isFinite))fail('REAL_XYZ_POSITIONS_REQUIRED');
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<p.length;i+=3)for(let k=0;k<3;k++){
  min[k]=Math.min(min[k],p[i+k]);
  max[k]=Math.max(max[k],p[i+k]);
 }
 return {min,max,size:max.map((v,k)=>v-min[k]),
  center:max.map((v,k)=>(v+min[k])/2)};
}
function slicedWidths(p,axis,relativeLevels){
 const bounds=xyzBounds(p),span=bounds.size[1]||1;
 return relativeLevels.map(frac=>{
  const y=bounds.min[1]+span*frac,radius=span*.045;
  let min=Infinity,max=-Infinity,samples=0;
  for(let i=0;i<p.length;i+=3){
   if(Math.abs(p[i+1]-y)>radius)continue;
   min=Math.min(min,p[i+axis]);max=Math.max(max,p[i+axis]);samples++;
  }
  return Object.freeze({heightFraction:frac,observedVertices:samples,
   actualWidthUnits:samples>=4?+(max-min).toFixed(5):null});
 });
}
const positionsOf=x=>x instanceof Float32Array?x:
 x?.geometry?.positions instanceof Float32Array?x.geometry.positions:
 x?.positions instanceof Float32Array?x.positions:null;
export function reviewAIG315HeroineGeometry({
 bodyPositions,sourceLabels,sourcePhotoSha256,
 hairMeshes=[],outfitMeshes=[],approvedReferenceSha256,
 explicitFaceMesh=null,realPlaidTexture=false,
 recordedMultiViewScreenshots=[]
}={}){
 const bounds=xyzBounds(bodyPositions);
 if(!(sourceLabels instanceof Uint8Array)||
  sourceLabels.length*3!==bodyPositions.length||
  typeof sourcePhotoSha256!=='string'||sourcePhotoSha256.length<16||
  approvedReferenceSha256!==
   '1deed212a2adcdc821e4291c6021fd1db490644da9a9c9b497f8243a7da296c1'||
  !Array.isArray(hairMeshes)||!Array.isArray(outfitMeshes)||
  !Array.isArray(recordedMultiViewScreenshots))
  fail('SOURCE_AND_APPROVED_REFERENCE_CONTRACT_REQUIRED');
 let headPoints=0,minHead=[Infinity,Infinity,Infinity],
  maxHead=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<sourceLabels.length;i++){
  if(sourceLabels[i]!==2&&sourceLabels[i]!==3)continue;
  headPoints++;
  for(let k=0;k<3;k++){
   minHead[k]=Math.min(minHead[k],bodyPositions[i*3+k]);
   maxHead[k]=Math.max(maxHead[k],bodyPositions[i*3+k]);
  }
 }
 const hair=hairMeshes.filter(x=>positionsOf(x));
 const wardrobe=outfitMeshes.filter(x=>positionsOf(x));
 const actualHairTriangles=hair.reduce((sum,x)=>
  sum+(x.geometry?.triangleCount??x.geometry?.indices?.length/3??
   x.indices?.length/3??0),0);
 let minHairZ=Infinity,maxHairZ=-Infinity;
 for(const h of hair){
  const positions=positionsOf(h);
  for(let i=2;i<positions.length;i+=3){
   minHairZ=Math.min(minHairZ,positions[i]);
   maxHairZ=Math.max(maxHairZ,positions[i]);
  }
 }
 const hairDepth=hair.length?maxHairZ-minHairZ:0;
 const actualFaceTriangles=explicitFaceMesh?.verifiedSourceFaceLandmarkTopology===true?
  explicitFaceMesh.actualSourceFitTriangles??0:0;
 const sameSourceIdentityCertified=false;
 const silhouette={
  front:Object.freeze({xWidthByBodyHeight:slicedWidths(bodyPositions,0,
   [.10,.25,.40,.55,.70,.85,.93])}),
  profile:Object.freeze({depthByBodyHeight:slicedWidths(bodyPositions,2,
   [.10,.25,.40,.55,.70,.85,.93])}),
  rear:Object.freeze({xWidthByBodyHeight:slicedWidths(bodyPositions,0,
   [.10,.25,.40,.55,.70,.85,.93])})
 };
 const blockReasons=[];
 if(headPoints<24||maxHead[0]-minHead[0]<.02)
  blockReasons.push('HEAD_SOURCE_GEOMETRY_INSUFFICIENT');
 if(actualFaceTriangles<=0)
  blockReasons.push('FACE_EYES_NOSE_MOUTH_SOURCE_FIT_NOT_BUILT');
 if(actualHairTriangles<=0||hairDepth<.015)
  blockReasons.push('NATURAL_HAIR_3D_VOLUME_NOT_BUILT');
 if(wardrobe.length<2)
  blockReasons.push('INDEPENDENT_CLOTH_MESHES_INCOMPLETE');
 if(!realPlaidTexture)blockReasons.push('ACTUAL_APPROVED_PLAID_UV_TEXTURE_MISSING');
 const views=new Set(recordedMultiViewScreenshots);
 for(const d of ['front','profile','rear'])
  if(!views.has(d))blockReasons.push('MISSING_'+d.toUpperCase()+'_REAL_WEBGL_EVIDENCE');
 blockReasons.push('REFERENCE_IDENTITY_LIKENESS_NOT_HUMAN_APPROVED');
 return Object.freeze({schema:AIG315_SCHEMA,
  geometryFirstPipeline:true,
  originalSourcePhotoSha256:sourcePhotoSha256,
  approvedReferenceSheetSha256:approvedReferenceSha256,
  sameSourceIdentityCertified,
  actualReal3DBodyVertices:bodyPositions.length/3,
  actualHeadSourceVertices:headPoints,
  observedHeadDimensions:headPoints?Object.freeze(
   maxHead.map((v,k)=>+(v-minHead[k]).toFixed(5))):null,
  visibleNonplanarIndependentHairMeshes:hair.length,
  actualIndependentHairTriangles:actualHairTriangles,
  actualIndependentOutfitMeshes:wardrobe.length,
  verifiedUserFacialLandmarkMeshTriangles:actualFaceTriangles,
  approvedPlaidUVPresent:realPlaidTexture,
  projectedBodySilhouettes:Object.freeze(silhouette),
  screenCapturesVerified:recordedMultiViewScreenshots,
  releaseBlockReasons:Object.freeze(blockReasons),
  technical3DGeometryExists:true,
  reference3DIdentityFitPASS:false,
  sourceImageProjectedAsFakeFace:false,
  highQualityPBRCannotRepairWrongGeometry:true,
  finalAppearanceReleasePASS:false});
}
/** Three reproducible camera directions around original real 3D source
 * bounds; never builds a new renderer, avatar or texture/photo billboard.
 */
export function planAIG315HeroineCamera({
 bodyPositions,view='front',fieldOfViewDegrees=40,aspect=1.1
}={}){
 if(!['front','profile','rear'].includes(view)||
  !Number.isFinite(fieldOfViewDegrees)||fieldOfViewDegrees<15||
  fieldOfViewDegrees>80||!Number.isFinite(aspect)||aspect<=0)
  fail('VIEW_OR_FOV_INVALID');
 const b=xyzBounds(bodyPositions),size=b.size,
  radius=Math.max(...size)*.65,
  verticalFov=fieldOfViewDegrees*Math.PI/180,
  horizFov=2*Math.atan(Math.tan(verticalFov/2)*aspect);
 const halfX=Math.max(.005,size[0]/2),halfY=Math.max(.005,size[1]/2),
  halfZ=Math.max(.005,size[2]/2);
 const dist=Math.max(radius*2.1,
  halfY/Math.tan(verticalFov/2)*1.28,
  (view==='profile'?halfZ:halfX)/Math.tan(horizFov/2)*1.28);
 const dir=view==='front'?[0,0,-1]:view==='profile'?[1,0,0]:[0,0,1];
 return Object.freeze({schema:AIG315_SCHEMA,view,
  target:Object.freeze([...b.center]),
  position:Object.freeze(b.center.map((v,k)=>v+dir[k]*dist)),
  near:Math.max(.001,dist-radius*2),
  far:dist+radius*4,
  actualSourceBodyBounds:Object.freeze(size),
  existingWebGLRendererReused:true,
  physicallyMeasuredCameraCalibration:false,
  originalBodyGeometryUnchanged:true});
}
