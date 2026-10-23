/**
 * Real3D 3.14 — genuine triangle-level contacts, not a mannequin sphere.
 * Build a bounded spatial grid from THE ACTUAL posed body triangle vertices.
 * Push hair/skirt attachment vertices out from nearest appropriately labelled
 * body faces, with a strict per-vertex dislocation limit.
 *
 * This is discrete vertex-versus-body-triangle contact, NOT triangle-triangle
 * CCD, fabric self collision, full human likeness or release certification.
 */
export const AIG314_CONTACT_SCHEMA='AIG_REAL3D_3_14_SOURCE_BODY_TRIANGLE_CONTACT';
const groups={hair:new Set([5,14,6,7]),skirt:new Set([10,11,12,13])};
const fail=s=>{throw Error('AIG314_TRIANGLE_'+s)};
const len=v=>Math.hypot(v[0],v[1],v[2]);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
 a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const key=(x,y,z)=>x+','+y+','+z;
const point=(p,i)=>[p[3*i],p[3*i+1],p[3*i+2]];
function closestOnTriangle(p,a,b,c){
 // Closest actual point on finite triangle, including faces/edges/corners.
 const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a);
 const d1=dot(ab,ap),d2=dot(ac,ap);
 if(d1<=0&&d2<=0)return a;
 const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);
 if(d3>=0&&d4<=d3)return b;
 const vc=d1*d4-d3*d2;
 if(vc<=0&&d1>=0&&d3<=0){
  const v=d1/(d1-d3);return a.map((t,k)=>t+v*ab[k]);
 }
 const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);
 if(d6>=0&&d5<=d6)return c;
 const vb=d5*d2-d1*d6;
 if(vb<=0&&d2>=0&&d6<=0){
  const w=d2/(d2-d6);return a.map((t,k)=>t+w*ac[k]);
 }
 const va=d3*d6-d5*d4;
 if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){
  const v=(d4-d3)/((d4-d3)+(d5-d6));
  return b.map((t,k)=>t+v*(c[k]-t));
 }
 const inv=1/(va+vb+vc),v=vb*inv,w=vc*inv;
 return a.map((t,k)=>t+ab[k]*v+ac[k]*w);
}
function verify(body,ix,labels,mode){
 if(!(body instanceof Float32Array)||body.length<9||body.length%3||
  !(ix instanceof Uint32Array)||ix.length%3||ix.length<3||
  !(labels instanceof Uint8Array)||labels.length*3!==body.length||
  !Object.hasOwn(groups,mode)||!body.every(Number.isFinite)||
  ix.some(i=>i>=labels.length)||ix.length>1200000)
  fail('INDEXED_REAL_POSENORMAL_CLASS_DATA_REQUIRED');
}
export function buildAIG314BodyTriangleGrid({
 bodyPosed,bodyIndices,sourceLabels,mode,cellSizeRatio=.05,
 maxGridReferences=240000
}={}){
 verify(bodyPosed,bodyIndices,sourceLabels,mode);
 if(!Number.isFinite(cellSizeRatio)||cellSizeRatio<.008||cellSizeRatio>.2||
  !Number.isInteger(maxGridReferences)||maxGridReferences<100)
  fail('GRID_BUDGET_INVALID');
 let minY=Infinity,maxY=-Infinity;
 for(let i=1;i<bodyPosed.length;i+=3){
  minY=Math.min(minY,bodyPosed[i]);maxY=Math.max(maxY,bodyPosed[i]);
 }
 const height=maxY-minY;
 if(height<.05)fail('DEGENERATE_POSED_BODY');
 const cell=height*cellSizeRatio,candidates=[],grid=new Map();
 const relevant=groups[mode];let discarded=0;
 const centroid=[0,0,0],used=new Set();
 for(let j=0;j<bodyIndices.length;j++){
  const idx=bodyIndices[j];
  if(relevant.has(sourceLabels[idx]))used.add(idx);
 }
 for(const id of used)for(let k=0;k<3;k++)
  centroid[k]+=bodyPosed[id*3+k];
 if(used.size)for(let k=0;k<3;k++)centroid[k]/=used.size;
 let references=0;
 for(let j=0;j<bodyIndices.length;j+=3){
  const ia=bodyIndices[j],ib=bodyIndices[j+1],ic=bodyIndices[j+2];
  if([ia,ib,ic].filter(i=>relevant.has(sourceLabels[i])).length<2){
   discarded++;continue;
  }
  const a=point(bodyPosed,ia),b=point(bodyPosed,ib),
   c=point(bodyPosed,ic),ab=sub(b,a),ac=sub(c,a),n=cross(ab,ac);
  const norm=len(n);
  if(norm<1e-10){discarded++;continue}
  let normal=n.map(v=>v/norm);
  const center=a.map((v,k)=>(v+b[k]+c[k])/3);
  if(dot(normal,sub(center,centroid))<0)normal=normal.map(v=>-v);
  const mins=[0,1,2].map(k=>Math.floor(Math.min(a[k],b[k],c[k])/cell));
  const maxs=[0,1,2].map(k=>Math.floor(Math.max(a[k],b[k],c[k])/cell));
  const boxes=(maxs[0]-mins[0]+1)*(maxs[1]-mins[1]+1)*
   (maxs[2]-mins[2]+1);
  if(boxes>1000)fail('OVERSIZED_SOURCE_TRIANGLE_GRID');
  if(references+boxes>maxGridReferences)
   fail('SPATIAL_GRID_MEMORY_BUDGET_REACHED');
  const face=candidates.length;
  candidates.push({a,b,c,normal,face:j/3});
  for(let x=mins[0];x<=maxs[0];x++)
   for(let y=mins[1];y<=maxs[1];y++)
    for(let z=mins[2];z<=maxs[2];z++){
     const k=key(x,y,z),bucket=grid.get(k);
     if(bucket)bucket.push(face);else grid.set(k,[face]);
     references++;
    }
 }
 return {schema:AIG314_CONTACT_SCHEMA,cellSize:cell,height,
  grid,candidates,referenceCount:references,
  actualSourceBodyTriangles:candidates.length,
  ignoredSourceTriangles:discarded,mode,
  indexAndSourcePosedBodyUnmodified:true};
}
export function resolveAIG314TriangleContacts({
 posedAttachment,bodyPosed,bodyIndices,sourceLabels,mode,
 clearanceRatio=.0025,maxCorrectionRatio=.035,
 maxGridReferences=240000,grid=null
}={}){
 if(!(posedAttachment instanceof Float32Array)||
  posedAttachment.length<3||posedAttachment.length%3||
  !posedAttachment.every(Number.isFinite)||
  !Number.isFinite(clearanceRatio)||clearanceRatio<0||
  clearanceRatio>.025||!Number.isFinite(maxCorrectionRatio)||
  maxCorrectionRatio<.001||maxCorrectionRatio>.15)
  fail('VALID_ATTACHMENT_AND_CONTACT_LIMITS_REQUIRED');
 const space=grid??buildAIG314BodyTriangleGrid({
  bodyPosed,bodyIndices,sourceLabels,mode,maxGridReferences
 });
 if(space.mode!==mode)fail('SOURCE_CONTACT_MODE_MISMATCH');
 const out=new Float32Array(posedAttachment),
  clearance=space.height*clearanceRatio,
  cap=space.height*maxCorrectionRatio,cell=space.cellSize;
 let tested=0,touched=0,corrected=0,unresolved=0,maxShift=0;
 const find=(p)=>{
  const cx=Math.floor(p[0]/cell),cy=Math.floor(p[1]/cell),
   cz=Math.floor(p[2]/cell);
  let best=null,bestD=Infinity;const testedFaces=new Set();
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)
   for(let z=-1;z<=1;z++)
    for(const i of space.grid.get(key(cx+x,cy+y,cz+z))??[]){
     if(testedFaces.has(i))continue;testedFaces.add(i);
     const tri=space.candidates[i];
     const nearest=closestOnTriangle(p,tri.a,tri.b,tri.c);
     const diff=sub(p,nearest),dist=len(diff);
     if(dist<bestD){bestD=dist;best={
      distance:dist,normal:tri.normal,side:dot(diff,tri.normal),
      nearest,face:tri.face};}
    }
  tested+=testedFaces.size;
  return best;
 };
 for(let i=0;i<out.length;i+=3){
  const p=[out[i],out[i+1],out[i+2]],hit=find(p);
  if(!hit||hit.distance>space.height*.05)continue;
  // Near a genuine surface on the inward side or within cloth clearance.
  if(hit.side>=clearance)continue;
  touched++;
  const needed=clearance-hit.side,applied=Math.min(needed,cap);
  const proposed=p.map((v,k)=>v+hit.normal[k]*applied);
  if(!proposed.every(Number.isFinite))
   fail('NONFINITE_TRIANGLE_CORRECTION');
  for(let k=0;k<3;k++)out[i+k]=proposed[k];
  if(applied>1e-9){corrected++;maxShift=Math.max(maxShift,applied);}
  if(needed>cap+1e-8)unresolved++;
 }
 return Object.freeze({
  schema:AIG314_CONTACT_SCHEMA,mode,positions:out,
  actualPosedBodyTrianglesInGrid:space.actualSourceBodyTriangles,
  sourceTriangleChecks:tested,
  actualAttachmentVerticesChecked:out.length/3,
  actualTriangleContactCandidates:touched,
  actualProjectedAttachmentVertices:corrected,
  unresolvedBoundedDisplacements:unresolved,
  maximumAppliedCorrectionUnits:maxShift,
  perVertexCorrectionLimitUnits:cap,
  sourceGeometryUnmodified:true,attachmentSourceUnmodified:true,
  realTriangleSurfaceUsed:true,
  continuousTriangleTriangleCCDProven:false,
  zeroSkirtHairSelfIntersectionProven:false,
  fullCorrectBodyContainmentProven:false,
  approvedHeroineAppearanceMatched:false
 });
}
