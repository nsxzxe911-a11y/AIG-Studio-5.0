/**
 * Real3D 3.7 — separate neutral BODY PROXY from replaceable 3D clothes.
 * Clothing source photographs are kept intact; the inferred shape beneath
 * clothes is NOT measured by the photo. No anatomical detail is fabricated.
 * These geometry pieces are technical fittings, not finished tailored clothes.
 */
export const AIG37_OUTFIT_SCHEMA='AIG_REAL3D_3_7_SOURCE_SAFE_MODULAR_CLOTHING';
export const AIG37_OUTFIT_PRESETS=Object.freeze([
 Object.freeze({id:'uniform',label:'校園制服（外套＋百褶裙）'}),
 Object.freeze({id:'casual',label:'日常服裝（上衣＋長褲）'}),
 Object.freeze({id:'sport',label:'運動服（運動上衣＋長褲）'}),
 Object.freeze({id:'body-proxy',label:'人體比例檢查（中性素模）'})
]);
const fail=s=>{throw Error('AIG37_'+s)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function validate(shell,bodyHeightUnits,outfitId){
 if(!(shell?.positions instanceof Float32Array)||
  !(shell?.normals instanceof Float32Array)||
  shell.normals.length!==shell.positions.length||
  !shell.indices?.length||
  shell.positions.length%3!==0||
  !Number.isFinite(bodyHeightUnits)||bodyHeightUnits<=0||
  !AIG37_OUTFIT_PRESETS.some(s=>s.id===outfitId))
  fail('VALID_MANIFOLD_SOURCE_AND_OUTFIT_REQUIRED');
}
/** Overlay excludes garment dye from the reusable base. 14 is a verified
 * clothing class; legs 10/11 have ambiguous trousers versus skin so use a
 * neutral mannequin colour without pretending it is original skin colour.
 * Hair/face/neck/arms retain observed source material when available.
 */
export function separateAIG37BodyColours(colours,shell){
 if(!(colours instanceof Float32Array)||
  !(shell?.vertexSourceLabelIds instanceof Uint8Array)||
  colours.length!==shell.vertexSourceLabelIds.length*3)
  fail('SOURCE_COLOURS_AND_CLASS_IDS_REQUIRED');
 const result=new Float32Array(colours),ids=shell.vertexSourceLabelIds;
 let neutralized=0;
 for(let i=0;i<ids.length;i++){
  if([1,5,10,11,12,13,14,15].includes(ids[i])){
   result.set([.32,.34,.37],i*3);
   neutralized++;
  }
 }
 return {colours:result,neutralizedVertices:neutralized,
  sourceRGBPreservedSeparately:true,estimatedUnderClothesBody:true,
  photographedSkinUnderClothesNeverClaimed:true};
}
function boundsOf(shell){
 const p=shell.positions;
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<p.length;i+=3){
  for(let k=0;k<3;k++){
   if(p[i+k]<min[k])min[k]=p[i+k];
   if(p[i+k]>max[k])max[k]=p[i+k];
  }
 }
 const size=max.map((v,k)=>v-min[k]);
 if(!size.every(Number.isFinite)||size.some(v=>v<.00001))
  fail('EMPTY_BODY_BOUNDS');
 return {min,max,size,height:size[1],center:[
  (min[0]+max[0])/2,(min[1]+max[1])/2,(min[2]+max[2])/2
 ]};
}
function sampleActualShell(shell,bounds,role,offsetScale){
 const p=shell.positions,n=shell.normals,idx=shell.indices;
 const vertices=[],normals=[],indices=[],attachmentIndices=[];
 const t=(i)=>((p[i*3+1]-bounds.min[1])/bounds.height);
 const clothing=(i)=>[5,14,10,11].includes(shell.vertexSourceLabelIds?.[i]);
 let used=0;
 for(let j=0;j<idx.length;j+=3){
  const a=idx[j],b=idx[j+1],c=idx[j+2];
  const y=(t(a)+t(b)+t(c))/3;
  // Garment is a distinct triangulated surface, never repaints the body mesh.
  const inBand=role==='top'?y>=.52&&y<=.81:y>=.07&&y<.55;
  const classEvidence=[a,b,c].filter(clothing).length>=2;
  if(!inBand||!classEvidence)continue;
  for(const i of [a,b,c]){
   attachmentIndices.push(i);
   const k=i*3,at=vertices.length/3;
   for(let d=0;d<3;d++){
    vertices.push(p[k+d]+n[k+d]*bounds.height*offsetScale);
    normals.push(n[k+d]);
   }
   indices.push(at);
  }
  used++;
 }
 if(used<8)fail('NOT_ENOUGH_SOURCE_BOUND_CLOTH_FACES');
 return {positions:new Float32Array(vertices),
  normals:new Float32Array(normals),indices:new Uint32Array(indices),
  triangleCount:used,sourceVertexIndices:new Uint32Array(attachmentIndices),
  sourceMeshSurfaceDerived:true,
  garmentIsIndependent3DGeometry:true,
  sealedFabricPatternCertified:false};
}
function loftPleatedSkirt(shell,bounds){
 const p=shell.positions,ids=shell.vertexSourceLabelIds;
 const at=[];
 for(let i=0;i<ids.length;i++){
  const y=(p[i*3+1]-bounds.min[1])/bounds.height;
  if(y>=.47&&y<=.58&&[5,14].includes(ids[i]))at.push(i);
 }
 if(at.length<12)fail('WAIST_SOURCE_GEOMETRY_UNKNOWN');
 let xc=0,zc=0;
 for(const i of at){xc+=p[i*3];zc+=p[i*3+2]}
 xc/=at.length;zc/=at.length;
 let rx=0,rz=0;
 for(const i of at){
  rx=Math.max(rx,Math.abs(p[i*3]-xc));
  rz=Math.max(rz,Math.abs(p[i*3+2]-zc));
 }
 rx=clamp(rx*1.09,bounds.height*.07,bounds.height*.3);
 rz=clamp(rz*1.14,bounds.height*.05,bounds.height*.24);
 const N=64,rows=5,pos=[],indices=[],sourceVertexIndices=[];
 // The procedural skirt follows observed waist anchors only. This does NOT
 // simulate realistic cloth contact, gravity or hem motion.
 const anchors=Array.from({length:N},(_,k)=>{
  const theta=k*2*Math.PI/N;
  const targetX=xc+Math.cos(theta)*rx,targetZ=zc+Math.sin(theta)*rz;
  let best=at[0],distance=Infinity;
  for(const i of at){
   const dx=p[i*3]-targetX,dz=p[i*3+2]-targetZ;
   const d=dx*dx+dz*dz;
   if(d<distance){distance=d;best=i}
  }
  return best;
 });
 const waist=bounds.min[1]+bounds.height*.55;
 for(let r=0;r<rows;r++){
  const v=r/(rows-1),flare=1+.25*v;
  for(let k=0;k<N;k++){
   const ang=k*2*Math.PI/N,pleat=Math.sin(ang*16)*.025*v;
   const ratio=flare+pleat;
   pos.push(xc+Math.cos(ang)*rx*ratio,
    waist-v*bounds.height*.19,
    zc+Math.sin(ang)*rz*ratio);
   sourceVertexIndices.push(anchors[k]);
  }
 }
 for(let r=0;r<rows-1;r++)for(let k=0;k<N;k++){
  const a=r*N+k,b=r*N+(k+1)%N,
    c=(r+1)*N+k,d=(r+1)*N+(k+1)%N;
  indices.push(a,b,c,b,d,c);
 }
 const normals=new Float32Array(pos.length);
 for(let j=0;j<indices.length;j+=3){
  const ia=indices[j]*3,ib=indices[j+1]*3,ic=indices[j+2]*3;
  const ax=pos[ib]-pos[ia],ay=pos[ib+1]-pos[ia+1],
   az=pos[ib+2]-pos[ia+2],
   bx=pos[ic]-pos[ia],by=pos[ic+1]-pos[ia+1],
   bz=pos[ic+2]-pos[ia+2];
  const v=[ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx];
  for(const i of [ia,ib,ic])for(let d=0;d<3;d++)normals[i+d]+=v[d];
 }
 for(let i=0;i<normals.length;i+=3){
  const mag=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;
  for(let d=0;d<3;d++)normals[i+d]/=mag;
 }
 return {positions:new Float32Array(pos),normals,
  indices:new Uint32Array(indices),triangleCount:indices.length/3,
  sourceVertexIndices:new Uint32Array(sourceVertexIndices),
  sourceMeshSurfaceDerived:false,garmentIsIndependent3DGeometry:true,
  proceduralWaistEstimate:true,clothSimulationVerified:false};
}
export function buildAIG37Outfit(shell,{
 outfitId='uniform',bodyHeightUnits
}={}){
 validate(shell,bodyHeightUnits,outfitId);
 const sourcePositionCopy=shell.positions; // never rewrite it
 const pieces=[];
 if(outfitId!=='body-proxy'){
  const b=boundsOf(shell);
  const sport=outfitId==='sport',casual=outfitId==='casual';
  pieces.push({role:'upper',
   name:sport?'SPORT_TOP':casual?'CASUAL_TOP':'UNIFORM_JACKET',
   geometry:sampleActualShell(shell,b,'top',.012),
   color:sport?0x1676a1:casual?0xe7bb7e:0x313a50,
   roughness:sport?.83:.72});
  if(outfitId==='uniform')pieces.push({
   role:'lower',name:'PLEATED_UNIFORM_SKIRT',
   geometry:loftPleatedSkirt(shell,b),color:0x454f65,roughness:.85
  });else pieces.push({
   role:'lower',name:sport?'SPORT_TROUSERS':'CASUAL_TROUSERS',
   geometry:sampleActualShell(shell,b,'lower',.015),
   color:sport?0x26394e:0x4b647d,roughness:.82
  });
 }
 return {
  schema:AIG37_OUTFIT_SCHEMA,outfitId,
  bodyGeometryIdentityPreserved:shell.positions===sourcePositionCopy,
  baseMannequinIsInferredNotMeasured:true,
  clothingSeparateFromHumanSource:true,
  dailyWardrobeSwitchWithoutRescan:true,
  realisticClothDrapingOrSkinCollisionValidated:false,
  fittedToApprovedHeroine:false,
  pieces,garmentMeshCount:pieces.length,
  garmentTriangleCount:pieces.reduce((s,p)=>s+p.geometry.triangleCount,0)
 };
}
