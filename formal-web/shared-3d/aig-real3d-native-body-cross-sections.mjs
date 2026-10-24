/**
 * Real3D original indexed OBJ: intersect TRIANGLES with physical horizontal
 * planes, then measure geometric XZ section rings. This is not a pose model,
 * an SDF, an image silhouette, or inferred human anatomy.
 */
import {parseAIGScanNativeOBJ} from './aig-real3d-scan-native-mesh.mjs';
export const AIG_REAL3D_SECTION_SCHEMA='AIG_REAL3D_NATIVE_3D_TRIANGLE_CROSS_SECTIONS_V1';
const PRESETS=Object.freeze([
 {id:'LOWER_LEGS',heightFraction:.22},
 {id:'UPPER_LEGS',heightFraction:.37},
 {id:'TORSO',heightFraction:.67},
 {id:'HEAD',heightFraction:.94}
]);
const rounded=x=>Math.round(x*1000)/1000;
function matrixPoint(raw,axis,bounds,scale){
 const v=axis==='Z'?[raw[0],raw[2],-raw[1]]:raw;
 return [
  (v[0]-(bounds.min[0]+bounds.max[0])/2)*scale,
  (v[1]-bounds.min[1])*scale,
  (v[2]-(bounds.min[2]+bounds.max[2])/2)*scale
 ];
}
function xySection(points,indices,sliceY){
 const all=[],links=new Map(),edgeCount=new Map(),quant=1e-5;
 const key=p=>Math.round(p[0]/quant)+','+Math.round(p[1]/quant);
 const link=(a,b)=>{
  if(!links.has(a))links.set(a,new Set());
  if(!links.has(b))links.set(b,new Set());
  links.get(a).add(b);links.get(b).add(a);
 };
 let touchingPlane=0,zeroLength=0;
 for(let i=0;i<indices.length;i+=3){
  const tri=[points[indices[i]],points[indices[i+1]],points[indices[i+2]]];
  const hit=[];
  for(let j=0;j<3;j++){
   const a=tri[j],b=tri[(j+1)%3],da=a[1]-sliceY,db=b[1]-sliceY;
   // Touching the level exactly can produce topologically ambiguous partial
   // sections. Report that explicitly rather than forcing a closed loop.
   if(Math.abs(da)<1e-9||Math.abs(db)<1e-9){touchingPlane++;continue;}
   if((da<0&&db>0)||(da>0&&db<0)){
    const t=da/(da-db);
    hit.push([a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t]);
   }
  }
  if(hit.length!==2)continue;
  const ka=key(hit[0]),kb=key(hit[1]);
  if(ka===kb){zeroLength++;continue;}
  const edgeId=ka<kb?ka+'|'+kb:kb+'|'+ka;
  if(edgeCount.has(edgeId)){edgeCount.set(edgeId,edgeCount.get(edgeId)+1);continue;}
  edgeCount.set(edgeId,1);
  all.push({ka,kb,pa:hit[0],pb:hit[1]});
  link(ka,kb);
 }
 const visited=new Set(),components=[];
 for(const k of links.keys()){
  if(visited.has(k))continue;
  const stack=[k];visited.add(k);
  let count=0,minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,
   openVertices=0,branchVertices=0;
  while(stack.length){
   const n=stack.pop(),d=links.get(n),p=n.split(',').map(Number);
   // Discretized source slices use quantized coordinates for topology;
   // min/max envelope error is bounded by 0.005 mm per axis.
   const x=p[0]*quant,z=p[1]*quant;
   minX=Math.min(minX,x);maxX=Math.max(maxX,x);
   minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
   count++;
   if(d.size===1)openVertices++;
   if(d.size>2)branchVertices++;
   for(const neighbor of d){
    if(!visited.has(neighbor)){visited.add(neighbor);stack.push(neighbor);}
   }
  }
  const widthMm=(maxX-minX)*1000,depthMm=(maxZ-minZ)*1000;
  components.push({
   id:'SECTION_COMPONENT_'+(components.length+1),
   vertexCount:count,openChainEndpoints:openVertices,branchingIntersections:branchVertices,
   closedSimpleRing:openVertices===0&&branchVertices===0&&count>=3,
   widthMm:rounded(widthMm),depthMm:rounded(depthMm),
   centerXMeters:rounded((minX+maxX)/2),
   minXMeters:rounded(minX),maxXMeters:rounded(maxX),
   minZMeters:rounded(minZ),maxZMeters:rounded(maxZ),
   tooSmallForMajorBodyCrossSection:widthMm<15||depthMm<15
  });
 }
 const relevant=components.filter(c=>!c.tooSmallForMajorBodyCrossSection);
 return {
  planeYMeters:rounded(sliceY),
  actualNativeIntersectingSegments:all.length,
  sourceTrianglesOnExactPlane:touchingPlane,
  degenerateProjectedSegments:zeroLength,
  numberOfConnectedXZSections:components.length,
  significantSections:relevant.length,
  significantClosedLoops:relevant.filter(c=>c.closedSimpleRing).length,
  components,
  // Measure from original world-space source only; no mesh or lighting edits.
  sourceIndexMeshUnchanged:true,
  note:'XZ sections may include garments, overlapping geometry, multiple shells or posing; not a body-part segmentation'
 };
}
export function auditAIGReal3DBodySectionGeometry({
 objText,heightMm,upAxis='Y',sourceSha256,sourceName=''
}={}){
 if(!/^[a-f0-9]{64}$/i.test(sourceSha256??''))
  throw Error('BODY_SECTION_SOURCE_SHA_REQUIRED');
 if(!Number.isInteger(heightMm)||heightMm<900||heightMm>2200||
 !['Y','Z'].includes(upAxis))
  throw Error('BODY_SECTION_SCALE_AXIS_INVALID');
 if(typeof sourceName!=='string'||sourceName.length>180)
  throw Error('BODY_SECTION_SOURCE_NAME_INVALID');
 const {original,indices}=parseAIGScanNativeOBJ(objText);
 const rotated=original.map(p=>upAxis==='Z'?[p[0],p[2],-p[1]]:p);
 const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
 for(const p of rotated)for(let i=0;i<3;i++){
  bounds.min[i]=Math.min(bounds.min[i],p[i]);
  bounds.max[i]=Math.max(bounds.max[i],p[i]);
 }
 if(bounds.max[1]-bounds.min[1]<=1e-9)
  throw Error('BODY_SECTION_ZERO_HEIGHT');
 const scale=(heightMm/1000)/(bounds.max[1]-bounds.min[1]);
 const positions=original.map(p=>matrixPoint(p,upAxis,bounds,scale));
 const levels=PRESETS.map(({id,heightFraction})=>({
  id,heightFraction,...xySection(positions,indices,(heightMm/1000)*heightFraction)
 }));
 const lower=levels[0],lowerClosed=lower.significantClosedLoops,
  legWidths=lower.components.filter(c=>c.closedSimpleRing&&
   !c.tooSmallForMajorBodyCrossSection);
 const sideBySide=legWidths.length===2&&
  Math.min(legWidths[0].maxXMeters,legWidths[1].maxXMeters)-
  Math.max(legWidths[0].minXMeters,legWidths[1].minXMeters)<-.005;
 const flatOnePieceLowerBody=lower.significantSections===1&&
  lower.significantClosedLoops===1;
 const flags=[];
 if(flatOnePieceLowerBody)flags.push('ONE_LARGE_CLOSED_LOWER_BODY_SECTION_NOT_TWO_SEPARATE_LEGS');
 if(lower.significantSections===0)flags.push('NO_SIGNIFICANT_LOWER_BODY_SURFACE');
 if(lower.significantSections>=2&&!sideBySide)
  flags.push('MULTIPLE_LOWER_SECTIONS_WITHOUT_CLEAR_SIDE_BY_SIDE_X_SEPARATION');
 if(levels.some(x=>x.sourceTrianglesOnExactPlane>0))
  flags.push('EXACT_VERTEX_ON_SLICE_AMBIGUITY_REVIEW');
 return {
  schema:AIG_REAL3D_SECTION_SCHEMA,
  sourceSha256,sourceName,
  sourceVertexCount:original.length,sourceTriangleCount:indices.length/3,
  measuredHeightMm:heightMm,upAxis,
  sections:levels,
  oneClosedLowerMassFlag:flatOnePieceLowerBody,
  distinctSideBySideLowerLegSectionsObserved:sideBySide,
  genuineOriginalTriangleIntersections:true,
  warnings:flags,
  manufacturedSeparateLegs:false,
  geometricalFeatureObservationIsNotHumanScanAuthentication:true,
  silhouetteAndProportionNaturalnessApproved:false,
  automaticPhotoTo3D:false,
  releasePASS:false
 };
}
